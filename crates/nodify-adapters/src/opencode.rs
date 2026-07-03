//! Adaptador de OpenCode. Lee el bloque `mcp` de `opencode.json(c)` (JSONC: admite
//! comentarios y comas colgantes incluso en `.json`).
//!
//! Normalizaciones (ver `docs/adapters/opencode.md` y ADR-0007):
//! - `command` puede venir como array (schema oficial) o como string + `args`
//!   (forma estilo Claude que aparece en configs reales generadas por otras
//!   herramientas). En ambos casos se separa en `command` + `args` canónicos.
//! - El mapa de entorno se llama `environment` (oficial) pero también se acepta `env`.
//! - `type`: `local` → stdio, `remote` → http.

use jsonc_parser::ast::Value as JValue;
use jsonc_parser::common::Ranged;
use jsonc_parser::{CollectOptions, CommentCollectionStrategy, ParseOptions};
use nodify_core::mcp::Transport;
use nodify_core::{Adapter, AdapterError, CanonicalMcp};
use serde_json::{Map, Value};

use crate::util::{json_array_to_strings, json_obj_to_inline_map, secret_map_to_json};

pub struct OpenCodeAdapter;

const ID: &str = "opencode";

impl Adapter for OpenCodeAdapter {
    fn id(&self) -> &'static str {
        ID
    }

    fn parse_mcps(&self, raw: &str) -> Result<Vec<CanonicalMcp>, AdapterError> {
        let root: Value = jsonc_parser::parse_to_serde_value(raw, &Default::default())
            .map_err(|e| AdapterError::Parse {
                agent: ID,
                source: Box::new(e),
            })?
            .unwrap_or(Value::Null);

        let servers = match root.get("mcp") {
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
        let mut mcp_obj = current_mcp_object(raw)?;
        mcp_obj.insert(mcp.name.clone(), to_native(mcp));
        write_mcp_object(raw, mcp_obj)
    }

    fn remove_mcp(&self, raw: &str, name: &str) -> Result<String, AdapterError> {
        let mut mcp_obj = current_mcp_object(raw)?;
        if mcp_obj.remove(name).is_none() {
            return Ok(raw.to_string()); // idempotente
        }
        write_mcp_object(raw, mcp_obj)
    }

    /// `model` (formato `"provider/model-id"`) en `opencode.json`.
    fn parse_model(&self, raw: &str) -> Option<String> {
        jsonc_parser::parse_to_serde_value(raw, &Default::default())
            .ok()??
            .get("model")?
            .as_str()
            .map(str::to_string)
    }

    fn set_model(&self, raw: &str, model: &str) -> Result<String, AdapterError> {
        let rendered =
            serde_json::to_string(&Value::String(model.to_string())).map_err(|e| {
                AdapterError::Parse {
                    agent: ID,
                    source: Box::new(e),
                }
            })?;
        match value_range(raw, "model")? {
            Some((s, e)) => Ok(format!("{}{}{}", &raw[..s], rendered, &raw[e..])),
            None => {
                let mut root = parse_root(raw)?;
                let map = root
                    .as_object_mut()
                    .ok_or_else(|| AdapterError::InvalidMcp {
                        agent: ID,
                        name: "model".into(),
                        reason: "la raíz no es un objeto".into(),
                    })?;
                map.insert("model".into(), Value::String(model.to_string()));
                serialize_root(&root)
            }
        }
    }
}

fn parse_root(raw: &str) -> Result<Value, AdapterError> {
    if raw.trim().is_empty() {
        return Ok(Value::Object(Map::new()));
    }
    jsonc_parser::parse_to_serde_value(raw, &Default::default())
        .map_err(|e| AdapterError::Parse {
            agent: ID,
            source: Box::new(e),
        })
        .map(|v| v.unwrap_or(Value::Object(Map::new())))
}

/// Objeto `mcp` actual (o vacío) como `Map`.
fn current_mcp_object(raw: &str) -> Result<Map<String, Value>, AdapterError> {
    let root = parse_root(raw)?;
    Ok(root
        .get("mcp")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default())
}

/// Localiza el rango de texto `[start,end)` del **valor** de una clave de nivel
/// superior, para reemplazarlo preservando el resto (comentarios incluidos).
fn value_range(raw: &str, key: &str) -> Result<Option<(usize, usize)>, AdapterError> {
    let parsed = jsonc_parser::parse_to_ast(
        raw,
        &CollectOptions {
            comments: CommentCollectionStrategy::Off,
            tokens: false,
        },
        &ParseOptions::default(),
    )
    .map_err(|e| AdapterError::Parse {
        agent: ID,
        source: Box::new(e),
    })?;

    let Some(JValue::Object(obj)) = parsed.value else {
        return Ok(None);
    };
    for prop in obj.properties {
        if prop.name.as_str() == key {
            let r = prop.value.range();
            return Ok(Some((r.start, r.end)));
        }
    }
    Ok(None)
}

fn serialize_root(root: &Value) -> Result<String, AdapterError> {
    let mut s = serde_json::to_string_pretty(root).map_err(|e| AdapterError::Parse {
        agent: ID,
        source: Box::new(e),
    })?;
    s.push('\n');
    Ok(s)
}

/// Escribe el objeto `mcp` en el documento. Si la clave existe, hace splice de texto
/// preservando todo lo demás; si no existe, re-serializa el documento completo.
fn write_mcp_object(raw: &str, mcp_obj: Map<String, Value>) -> Result<String, AdapterError> {
    let rendered = serde_json::to_string_pretty(&Value::Object(mcp_obj.clone())).map_err(|e| {
        AdapterError::Parse {
            agent: ID,
            source: Box::new(e),
        }
    })?;

    match value_range(raw, "mcp")? {
        Some((start, end)) => Ok(format!("{}{}{}", &raw[..start], rendered, &raw[end..])),
        None => {
            // No había bloque `mcp`: re-serializa el documento entero (los comentarios
            // libres se pierden solo en este caso límite; con bloque `mcp` se preservan).
            let mut root = parse_root(raw)?;
            let map = root
                .as_object_mut()
                .ok_or_else(|| AdapterError::InvalidMcp {
                    agent: ID,
                    name: "mcp".into(),
                    reason: "la raíz no es un objeto".into(),
                })?;
            map.insert("mcp".into(), Value::Object(mcp_obj));
            serialize_root(&root)
        }
    }
}

/// Forma nativa OpenCode de un MCP canónico (`command` como array, `environment`).
fn to_native(m: &CanonicalMcp) -> Value {
    let mut o = Map::new();
    match m.transport {
        Transport::Stdio => {
            o.insert("type".into(), Value::String("local".into()));
            let mut cmd = vec![Value::String(m.command.clone().unwrap_or_default())];
            cmd.extend(m.args.iter().cloned().map(Value::String));
            o.insert("command".into(), Value::Array(cmd));
            if !m.env.is_empty() {
                o.insert("environment".into(), secret_map_to_json(&m.env));
            }
        }
        Transport::Http => {
            o.insert("type".into(), Value::String("remote".into()));
            o.insert(
                "url".into(),
                Value::String(m.url.clone().unwrap_or_default()),
            );
            if !m.headers.is_empty() {
                o.insert("headers".into(), secret_map_to_json(&m.headers));
            }
        }
    }
    if let Some(en) = m.enabled {
        o.insert("enabled".into(), Value::Bool(en));
    }
    Value::Object(o)
}

fn parse_one(name: &str, cfg: &Value) -> Result<CanonicalMcp, AdapterError> {
    // Algunos configs reales omiten `type`; se infiere por presencia de `url`.
    let ty = cfg.get("type").and_then(Value::as_str).unwrap_or_else(|| {
        if cfg.get("url").is_some() {
            "remote"
        } else {
            "local"
        }
    });

    let enabled = cfg.get("enabled").and_then(Value::as_bool);
    let timeout_ms = cfg.get("timeout").and_then(Value::as_u64);

    let mut mcp = match ty {
        "local" => {
            let (command, args) = split_command(cfg)?;
            let mut m = CanonicalMcp::stdio(name, command);
            m.args = args;
            // Oficial: `environment`. Fallback: `env` (forma no estándar real).
            m.env = json_obj_to_inline_map(cfg.get("environment").or_else(|| cfg.get("env")));
            m
        }
        "remote" => {
            let url =
                cfg.get("url")
                    .and_then(Value::as_str)
                    .ok_or_else(|| AdapterError::InvalidMcp {
                        agent: ID,
                        name: name.to_string(),
                        reason: "transporte remote sin 'url'".into(),
                    })?;
            let mut m = CanonicalMcp::http(name, url);
            m.headers = json_obj_to_inline_map(cfg.get("headers"));
            m
        }
        other => {
            return Err(AdapterError::InvalidMcp {
                agent: ID,
                name: name.to_string(),
                reason: format!("type desconocido: {other}"),
            })
        }
    };

    mcp.enabled = enabled;
    mcp.timeout_ms = timeout_ms;
    Ok(mcp)
}

/// Extrae `command` + `args` aceptando las dos formas: array único
/// (`["npx","-y","x"]`) o string + `args` separado (`"npx"` + `["-y","x"]`).
fn split_command(cfg: &Value) -> Result<(String, Vec<String>), AdapterError> {
    match cfg.get("command") {
        Some(Value::Array(arr)) => {
            let mut parts = arr.iter().filter_map(|x| x.as_str().map(str::to_string));
            let command = parts.next().ok_or_else(|| AdapterError::InvalidMcp {
                agent: ID,
                name: "<mcp>".into(),
                reason: "command[] vacío".into(),
            })?;
            let mut args: Vec<String> = parts.collect();
            // Si además hay `args` (forma híbrida), se anexan.
            args.extend(json_array_to_strings(cfg.get("args")));
            Ok((command, args))
        }
        Some(Value::String(s)) => {
            let args = json_array_to_strings(cfg.get("args"));
            Ok((s.clone(), args))
        }
        _ => Err(AdapterError::InvalidMcp {
            agent: ID,
            name: "<mcp>".into(),
            reason: "transporte local sin 'command'".into(),
        }),
    }
}
