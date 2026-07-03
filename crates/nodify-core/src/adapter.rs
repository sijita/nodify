//! Contrato que implementa cada agente. `parse_mcps` es lectura (nativo → canónico);
//! `upsert_mcp`/`remove_mcp` son escritura (canónico → nativo) sobre el texto crudo,
//! **preservando todo lo que no se gestiona** (ADR-0005). Son funciones puras: reciben
//! y devuelven texto; el backup/atómico lo pone la capa de IO.

use crate::mcp::CanonicalMcp;

#[derive(Debug, thiserror::Error)]
pub enum AdapterError {
    #[error("no se pudo parsear la config de {agent}: {source}")]
    Parse {
        agent: &'static str,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("entrada MCP inválida '{name}' en {agent}: {reason}")]
    InvalidMcp {
        agent: &'static str,
        name: String,
        reason: String,
    },
}

pub trait Adapter {
    /// Identificador estable del agente (p.ej. `"claude-code"`).
    fn id(&self) -> &'static str;

    /// Parsea el contenido crudo del archivo de config del agente y devuelve sus
    /// MCPs en forma canónica. No toca el filesystem — recibe el texto ya leído.
    fn parse_mcps(&self, raw: &str) -> Result<Vec<CanonicalMcp>, AdapterError>;

    /// Inserta o actualiza (por nombre) un MCP en el texto crudo y devuelve el texto
    /// resultante, preservando el resto del archivo. Idempotente. Si `raw` está vacío,
    /// crea la estructura mínima.
    fn upsert_mcp(&self, raw: &str, mcp: &CanonicalMcp) -> Result<String, AdapterError>;

    /// Elimina el MCP `name` del texto crudo y devuelve el texto resultante,
    /// preservando el resto. Idempotente (si no existe, devuelve el texto sin cambios).
    fn remove_mcp(&self, raw: &str, name: &str) -> Result<String, AdapterError>;

    /// Extrae el modelo por defecto del archivo de settings del agente (el que lo
    /// contiene; puede diferir del archivo de MCPs). `None` si no está definido.
    fn parse_model(&self, raw: &str) -> Option<String>;

    /// Fija el modelo por defecto en el texto crudo del archivo de settings,
    /// preservando el resto. Si `raw` está vacío, crea la estructura mínima.
    fn set_model(&self, raw: &str, model: &str) -> Result<String, AdapterError>;
}
