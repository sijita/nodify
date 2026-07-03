//! Información de proveedor leída de la config de un agente. **Nunca contiene el valor
//! de la API key** — solo el nombre de la variable de entorno que la aporta (ADR-0004).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderInfo {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    /// Nombre de la env var que contiene la key (p.ej. `OPENROUTER_API_KEY`). Sin valor.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_env: Option<String>,
}
