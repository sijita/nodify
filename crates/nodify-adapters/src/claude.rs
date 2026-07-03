//! Adaptador de Claude Code. Lee el `mcpServers` de `~/.claude.json` (JSON estricto).
//! Transportes: `stdio`, `http`, `sse`. `sse` se normaliza a `Transport::Http` y se
//! preserva el tipo nativo en `extras.claudeType`. Ver `docs/adapters/claude-code.md`.

use nodify_core::mcp::Transport;
use nodify_core::{Adapter, AdapterError, CanonicalMcp};
use serde_json::{Map, Value};

use crate::util::{json_array_to_strings, json_obj_to_inline_map, secret_map_to_json};

pub struct ClaudeAdapter;

const ID: &str = "claude-code";

impl Adapter for ClaudeAdapter {
    fn id(&self) -> &'static str {
        ID
    }

    fn parse_mcps(&self, raw: &str) -> Result<Vec<CanonicalMcp>, AdapterError> {
        let root: Value = serde_json::from_str(raw).map_err(|e| AdapterError::Parse {
            agent: ID,
            source: Box::new(e),
        })?;

        let servers = match root.get("mcpServers") {
            Some(Value::Object(map)) => map,
            _ => return Ok(Vec::new()), // sin MCPs de usuario
        };

        let mut out = Vec::with_capacity(servers.len());
        for (name, cfg) in servers {
            out.push(parse_one(name, cfg)?);
        }
        out.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(out)
    }

    fn upsert_mcp(&self, raw: &str, mcp: &CanonicalMcp) -> Result<String, AdapterError> {
        let mut root = parse_root(raw)?;
        let obj = root
            .as_object_mut()
            .ok_or_else(|| invalid(&mcp.name, "la raíz no es un objeto JSON"))?;
        let servers = obj
            .entry("mcpServers")
            .or_insert_with(|| Value::Object(Map::new()));
        let smap = servers
            .as_object_mut()
            .ok_or_else(|| invalid(&mcp.name, "'mcpServers' no es un objeto"))?;
        smap.insert(mcp.name.clone(), to_native(mcp));
        serialize(&root)
    }

    fn remove_mcp(&self, raw: &str, name: &str) -> Result<String, AdapterError> {
        let mut root = parse_root(raw)?;
        if let Some(servers) = root.get_mut("mcpServers").and_then(Value::as_object_mut) {
            servers.remove(name);
        }
        serialize(&root)
    }

    /// `model` en `~/.claude/settings.json`.
    fn parse_model(&self, raw: &str) -> Option<String> {
        serde_json::from_str::<Value>(raw)
            .ok()?
            .get("model")?
            .as_str()
            .map(str::to_string)
    }

    fn set_model(&self, raw: &str, model: &str) -> Result<String, AdapterError> {
        let mut root = parse_root(raw)?;
        let obj = root
            .as_object_mut()
            .ok_or_else(|| invalid("model", "settings.json no es un objeto"))?;
        obj.insert("model".into(), Value::String(model.to_string()));
        serialize(&root)
    }

    /// Claude no declara proveedores en archivo (usa `ANTHROPIC_API_KEY`/`ANTHROPIC_BASE_URL`
    /// por entorno). Se expone informativamente desde la capa superior, no aquí.
    fn parse_providers(&self, _raw: &str) -> Vec<nodify_core::ProviderInfo> {
        Vec::new()
    }
}

fn parse_root(raw: &str) -> Result<Value, AdapterError> {
    if raw.trim().is_empty() {
        return Ok(Value::Object(Map::new()));
    }
    serde_json::from_str(raw).map_err(|e| AdapterError::Parse {
        agent: ID,
        source: Box::new(e),
    })
}

fn serialize(root: &Value) -> Result<String, AdapterError> {
    let mut s = serde_json::to_string_pretty(root).map_err(|e| AdapterError::Parse {
        agent: ID,
        source: Box::new(e),
    })?;
    s.push('\n');
    Ok(s)
}

fn invalid(name: &str, reason: &str) -> AdapterError {
    AdapterError::InvalidMcp {
        agent: ID,
        name: name.to_string(),
        reason: reason.to_string(),
    }
}

/// Construye la forma nativa Claude de un MCP canónico.
fn to_native(m: &CanonicalMcp) -> Value {
    let mut o = Map::new();
    match m.transport {
        Transport::Stdio => {
            o.insert("type".into(), Value::String("stdio".into()));
            o.insert(
                "command".into(),
                Value::String(m.command.clone().unwrap_or_default()),
            );
            if !m.args.is_empty() {
                o.insert(
                    "args".into(),
                    Value::Array(m.args.iter().cloned().map(Value::String).collect()),
                );
            }
            if !m.env.is_empty() {
                o.insert("env".into(), secret_map_to_json(&m.env));
            }
        }
        Transport::Http => {
            // preserva sse si venía de Claude nativo (extras.claudeType)
            let ty = m
                .extras
                .get("claudeType")
                .and_then(Value::as_str)
                .unwrap_or("http");
            o.insert("type".into(), Value::String(ty.into()));
            o.insert(
                "url".into(),
                Value::String(m.url.clone().unwrap_or_default()),
            );
            if !m.headers.is_empty() {
                o.insert("headers".into(), secret_map_to_json(&m.headers));
            }
        }
    }
    Value::Object(o)
}

fn parse_one(name: &str, cfg: &Value) -> Result<CanonicalMcp, AdapterError> {
    let ty = cfg.get("type").and_then(Value::as_str).unwrap_or("stdio");

    let mut mcp = match ty {
        "stdio" => {
            let command = cfg.get("command").and_then(Value::as_str).ok_or_else(|| {
                AdapterError::InvalidMcp {
                    agent: ID,
                    name: name.to_string(),
                    reason: "transporte stdio sin 'command'".into(),
                }
            })?;
            let mut m = CanonicalMcp::stdio(name, command);
            m.args = json_array_to_strings(cfg.get("args"));
            m.env = json_obj_to_inline_map(cfg.get("env"));
            m
        }
        "http" | "sse" => {
            let url =
                cfg.get("url")
                    .and_then(Value::as_str)
                    .ok_or_else(|| AdapterError::InvalidMcp {
                        agent: ID,
                        name: name.to_string(),
                        reason: format!("transporte {ty} sin 'url'"),
                    })?;
            let mut m = CanonicalMcp::http(name, url);
            m.headers = json_obj_to_inline_map(cfg.get("headers"));
            if ty == "sse" {
                m.extras = serde_json::json!({ "claudeType": "sse" });
            }
            m
        }
        other => {
            return Err(AdapterError::InvalidMcp {
                agent: ID,
                name: name.to_string(),
                reason: format!("tipo de transporte desconocido: {other}"),
            })
        }
    };

    // Claude no tiene flag `enabled` nativo.
    mcp.enabled = None;
    Ok(mcp)
}
