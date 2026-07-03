//! Representación canónica de un servidor MCP, neutral respecto al agente.
//! Ver `docs/canonical-model.md`.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::secret::SecretValue;

/// Transporte del MCP. Claude distingue `http`/`sse`; Codex y OpenCode no.
/// Normalizamos `sse` como variante de `http` y guardamos el tipo nativo original
/// en `extras` para round-trip fiel.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Transport {
    /// Proceso local (`command` + `args`).
    Stdio,
    /// Servidor remoto por URL (incluye http y sse nativos).
    Http,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CanonicalMcp {
    pub name: String,
    pub transport: Transport,

    // --- stdio ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub args: Vec<String>,

    // --- http ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub headers: BTreeMap<String, SecretValue>,

    // --- comunes ---
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub env: BTreeMap<String, SecretValue>,
    /// `None` = no especificado por el agente (Claude no tiene flag nativo).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<u64>,

    /// Campos nativos no modelados, preservados verbatim (ADR-0005).
    #[serde(default, skip_serializing_if = "serde_json::Value::is_null")]
    pub extras: serde_json::Value,
}

impl CanonicalMcp {
    /// Constructor mínimo para un MCP stdio.
    pub fn stdio(name: impl Into<String>, command: impl Into<String>) -> Self {
        CanonicalMcp {
            name: name.into(),
            transport: Transport::Stdio,
            command: Some(command.into()),
            args: Vec::new(),
            url: None,
            headers: BTreeMap::new(),
            env: BTreeMap::new(),
            enabled: None,
            timeout_ms: None,
            extras: serde_json::Value::Null,
        }
    }

    /// Constructor mínimo para un MCP http/remoto.
    pub fn http(name: impl Into<String>, url: impl Into<String>) -> Self {
        CanonicalMcp {
            name: name.into(),
            transport: Transport::Http,
            command: None,
            args: Vec::new(),
            url: Some(url.into()),
            headers: BTreeMap::new(),
            env: BTreeMap::new(),
            enabled: None,
            timeout_ms: None,
            extras: serde_json::Value::Null,
        }
    }
}
