//! Adaptador de Pi (pi.dev). Lee el `mcpServers` de `~/.pi/agent/mcp.json` (JSON).
//! El formato es estilo Claude: stdio con `command`/`args`/`env`, HTTP con `url`/`headers`
//! (`type: "http"|"sse"`; si falta, se infiere por presencia de `url`). El archivo puede
//! tener otras claves de nivel superior (`settings`, `$schema`, `disabledServers`) que se
//! **preservan** al escribir. El modelo por defecto vive aparte, en `~/.pi/agent/settings.json`
//! bajo la clave `defaultModel`.

use nodify_core::mcp::Transport;
use nodify_core::{Adapter, AdapterError, CanonicalMcp};
use serde_json::{Map, Value};

use crate::util::{json_array_to_strings, json_obj_to_inline_map, secret_map_to_json};

pub struct PiAdapter;

const ID: &str = "pi";

impl Adapter for PiAdapter {
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
            _ => return Ok(Vec::new()),
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

    /// `defaultModel` en `~/.pi/agent/settings.json` (el `defaultProvider` se preserva aparte).
    fn parse_model(&self, raw: &str) -> Option<String> {
        serde_json::from_str::<Value>(raw)
            .ok()?
            .get("defaultModel")?
            .as_str()
            .map(str::to_string)
    }

    fn set_model(&self, raw: &str, model: &str) -> Result<String, AdapterError> {
        let mut root = parse_root(raw)?;
        let obj = root
            .as_object_mut()
            .ok_or_else(|| invalid("defaultModel", "settings.json no es un objeto"))?;
        obj.insert("defaultModel".into(), Value::String(model.to_string()));
        serialize(&root)
    }

    /// Pi no declara proveedores en `mcp.json` (los custom van en `models.json`).
    fn parse_providers(&self, _raw: &str) -> Vec<nodify_core::ProviderInfo> {
        Vec::new()
    }

    /// Pi lee las API keys desde variables de entorno del shell (`OPENAI_API_KEY`, etc.),
    /// no desde un bloque en archivo.
    fn set_env(&self, _raw: &str, key: &str, _value: &str) -> Result<String, AdapterError> {
        Err(invalid(
            key,
            "Pi lee las env vars del shell (p.ej. OPENAI_API_KEY); defínela ahí",
        ))
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

/// Forma nativa Pi de un MCP canónico. Para stdio se omite `type` (Pi lo infiere por
/// `command`); para HTTP se escribe `type: "http"`.
fn to_native(m: &CanonicalMcp) -> Value {
    let mut o = Map::new();
    match m.transport {
        Transport::Stdio => {
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
            // preserva sse si venía nativo (extras.piType)
            let ty = m
                .extras
                .get("piType")
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
    // Pi no exige `type` para stdio: se infiere por presencia de `url`.
    let ty = cfg.get("type").and_then(Value::as_str).unwrap_or_else(|| {
        if cfg.get("url").is_some() {
            "http"
        } else {
            "stdio"
        }
    });

    let mut mcp = match ty {
        "stdio" => {
            let command = cfg
                .get("command")
                .and_then(Value::as_str)
                .ok_or_else(|| invalid(name, "transporte stdio sin 'command'"))?;
            let mut m = CanonicalMcp::stdio(name, command);
            m.args = json_array_to_strings(cfg.get("args"));
            m.env = json_obj_to_inline_map(cfg.get("env"));
            m
        }
        "http" | "sse" => {
            let url = cfg
                .get("url")
                .and_then(Value::as_str)
                .ok_or_else(|| invalid(name, &format!("transporte {ty} sin 'url'")))?;
            let mut m = CanonicalMcp::http(name, url);
            m.headers = json_obj_to_inline_map(cfg.get("headers"));
            if ty == "sse" {
                m.extras = serde_json::json!({ "piType": "sse" });
            }
            m
        }
        other => {
            return Err(invalid(
                name,
                &format!("tipo de transporte desconocido: {other}"),
            ))
        }
    };

    // Pi gestiona el on/off por el array `disabledServers`, no por flag por servidor.
    mcp.enabled = None;
    Ok(mcp)
}
