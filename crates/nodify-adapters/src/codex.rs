//! Adaptador de Codex. Lee las tablas `[mcp_servers.<name>]` de `~/.codex/config.toml`
//! (TOML, parseado con `toml_edit` para poder preservar comentarios/formato en fases
//! de escritura). Transporte stdio (`command`) o streamable HTTP (`url`).
//! `startup_timeout_sec` (segundos) → `timeout_ms`. Ver `docs/adapters/codex.md`.

use std::collections::BTreeMap;

use nodify_core::mcp::Transport;
use nodify_core::{Adapter, AdapterError, CanonicalMcp, SecretValue};
use toml_edit::{value, Array, DocumentMut, InlineTable, Item, Table, TableLike};

use crate::util::secret_to_string;

pub struct CodexAdapter;

const ID: &str = "codex";

impl Adapter for CodexAdapter {
    fn id(&self) -> &'static str {
        ID
    }

    fn parse_mcps(&self, raw: &str) -> Result<Vec<CanonicalMcp>, AdapterError> {
        let doc: DocumentMut =
            raw.parse()
                .map_err(|e: toml_edit::TomlError| AdapterError::Parse {
                    agent: ID,
                    source: Box::new(e),
                })?;

        let servers = match doc.get("mcp_servers").and_then(Item::as_table_like) {
            Some(t) => t,
            None => return Ok(Vec::new()),
        };

        let mut out = Vec::new();
        for (name, item) in servers.iter() {
            let cfg = item
                .as_table_like()
                .ok_or_else(|| AdapterError::InvalidMcp {
                    agent: ID,
                    name: name.to_string(),
                    reason: "la entrada MCP no es una tabla".into(),
                })?;
            out.push(parse_one(name, cfg)?);
        }
        out.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(out)
    }

    fn upsert_mcp(&self, raw: &str, mcp: &CanonicalMcp) -> Result<String, AdapterError> {
        let mut doc = parse_doc(raw)?;
        let root = doc.as_table_mut();
        if !root.contains_key("mcp_servers") {
            let mut parent = Table::new();
            parent.set_implicit(true); // no emite `[mcp_servers]`, solo `[mcp_servers.<name>]`
            root.insert("mcp_servers", Item::Table(parent));
        }
        let servers =
            root["mcp_servers"]
                .as_table_mut()
                .ok_or_else(|| AdapterError::InvalidMcp {
                    agent: ID,
                    name: mcp.name.clone(),
                    reason: "'mcp_servers' no es una tabla".into(),
                })?;
        servers.set_implicit(true);
        servers.insert(&mcp.name, Item::Table(to_native(mcp)));
        Ok(doc.to_string())
    }

    fn remove_mcp(&self, raw: &str, name: &str) -> Result<String, AdapterError> {
        let mut doc = parse_doc(raw)?;
        if let Some(t) = doc.get_mut("mcp_servers").and_then(Item::as_table_mut) {
            t.remove(name);
        }
        Ok(doc.to_string())
    }

    /// `model` en `~/.codex/config.toml`.
    fn parse_model(&self, raw: &str) -> Option<String> {
        raw.parse::<DocumentMut>()
            .ok()?
            .get("model")?
            .as_str()
            .map(str::to_string)
    }

    fn set_model(&self, raw: &str, model: &str) -> Result<String, AdapterError> {
        let mut doc = parse_doc(raw)?;
        doc["model"] = value(model);
        Ok(doc.to_string())
    }

    /// Tablas `[model_providers.<id>]` con `name`, `base_url`, `env_key`.
    fn parse_providers(&self, raw: &str) -> Vec<nodify_core::ProviderInfo> {
        let Ok(doc) = raw.parse::<DocumentMut>() else {
            return Vec::new();
        };
        let Some(t) = doc.get("model_providers").and_then(Item::as_table_like) else {
            return Vec::new();
        };
        let mut out = Vec::new();
        for (id, item) in t.iter() {
            let Some(p) = item.as_table_like() else {
                continue;
            };
            let s = |k: &str| p.get(k).and_then(Item::as_str).map(str::to_string);
            out.push(nodify_core::ProviderInfo {
                id: id.to_string(),
                name: s("name"),
                base_url: s("base_url"),
                key_env: s("env_key"),
            });
        }
        out.sort_by(|a, b| a.id.cmp(&b.id));
        out
    }

    /// Codex toma las env vars del shell / `auth.json`, no de `config.toml`.
    fn set_env(&self, _raw: &str, key: &str, _value: &str) -> Result<String, AdapterError> {
        Err(AdapterError::InvalidMcp {
            agent: ID,
            name: key.to_string(),
            reason: "Codex lee las env vars del shell o auth.json; defínela ahí".into(),
        })
    }
}

fn parse_doc(raw: &str) -> Result<DocumentMut, AdapterError> {
    if raw.trim().is_empty() {
        return Ok(DocumentMut::new());
    }
    raw.parse()
        .map_err(|e: toml_edit::TomlError| AdapterError::Parse {
            agent: ID,
            source: Box::new(e),
        })
}

/// Construye la tabla TOML nativa de Codex para un MCP canónico.
fn to_native(m: &CanonicalMcp) -> Table {
    let mut t = Table::new();
    match m.transport {
        Transport::Stdio => {
            t["command"] = value(m.command.clone().unwrap_or_default());
            if !m.args.is_empty() {
                let mut arr = Array::new();
                for a in &m.args {
                    arr.push(a.clone());
                }
                t["args"] = value(arr);
            }
            if !m.env.is_empty() {
                let mut it = InlineTable::new();
                for (k, v) in &m.env {
                    it.insert(k, secret_to_string(v).into());
                }
                t["env"] = value(it);
            }
        }
        Transport::Http => {
            t["url"] = value(m.url.clone().unwrap_or_default());
            let mut headers = InlineTable::new();
            for (k, v) in &m.headers {
                // Authorization por referencia → bearer_token_env_var (idiomático en Codex)
                if k.eq_ignore_ascii_case("authorization") {
                    if let SecretValue::EnvRef(name) = v {
                        t["bearer_token_env_var"] = value(name.as_str());
                        continue;
                    }
                }
                headers.insert(k, secret_to_string(v).into());
            }
            if !headers.is_empty() {
                t["http_headers"] = value(headers);
            }
        }
    }
    if let Some(en) = m.enabled {
        t["enabled"] = value(en);
    }
    if let Some(ms) = m.timeout_ms {
        t["startup_timeout_sec"] = value((ms / 1000) as i64);
    }
    t
}

fn parse_one(name: &str, cfg: &dyn TableLike) -> Result<CanonicalMcp, AdapterError> {
    let enabled = cfg.get("enabled").and_then(Item::as_bool);
    let timeout_ms = cfg
        .get("startup_timeout_sec")
        .and_then(Item::as_integer)
        .map(|s| (s.max(0) as u64) * 1000);

    let mut mcp = if let Some(command) = cfg.get("command").and_then(Item::as_str) {
        let mut m = CanonicalMcp::stdio(name, command);
        m.args = str_array(cfg.get("args"));
        m.env = inline_map(cfg.get("env"));
        m
    } else if let Some(url) = cfg.get("url").and_then(Item::as_str) {
        let mut m = CanonicalMcp::http(name, url);
        m.headers = inline_map(cfg.get("http_headers"));
        // bearer_token_env_var: secreto por referencia a env var.
        if let Some(env_var) = cfg.get("bearer_token_env_var").and_then(Item::as_str) {
            m.headers
                .insert("Authorization".into(), SecretValue::EnvRef(env_var.into()));
        }
        m
    } else {
        return Err(AdapterError::InvalidMcp {
            agent: ID,
            name: name.to_string(),
            reason: "sin 'command' ni 'url'".into(),
        });
    };

    mcp.enabled = enabled;
    mcp.timeout_ms = timeout_ms;
    Ok(mcp)
}

fn str_array(item: Option<&Item>) -> Vec<String> {
    match item.and_then(Item::as_array) {
        Some(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().map(str::to_string))
            .collect(),
        None => Vec::new(),
    }
}

/// Convierte una tabla inline TOML `{ K = "V" }` en un mapa de secretos inline.
fn inline_map(item: Option<&Item>) -> BTreeMap<String, SecretValue> {
    let mut out = BTreeMap::new();
    if let Some(t) = item.and_then(Item::as_table_like) {
        for (k, v) in t.iter() {
            if let Some(s) = v.as_str() {
                out.insert(k.to_string(), SecretValue::Inline(s.to_string()));
            }
        }
    }
    out
}
