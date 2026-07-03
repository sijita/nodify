//! Operaciones que componen varios adaptadores. **Compartir** un MCP entre agentes es
//! solo: leer nativo(X) → canónico → escribir nativo(Y). Funciones puras (texto→texto),
//! sin IO, para poder testear la traducción de formato en aislamiento.

use nodify_core::{Adapter, AdapterError, CanonicalMcp};

/// Busca un MCP por nombre en el texto crudo de un agente.
pub fn find_mcp(
    adapter: &dyn Adapter,
    raw: &str,
    name: &str,
) -> Result<Option<CanonicalMcp>, AdapterError> {
    Ok(adapter
        .parse_mcps(raw)?
        .into_iter()
        .find(|m| m.name == name))
}

/// Comparte el MCP `name` del agente `from` al agente `to`, devolviendo el nuevo texto
/// de config de `to`. La traducción de formato la hacen los adaptadores (canónico↔nativo).
pub fn share_mcp(
    from: &dyn Adapter,
    from_raw: &str,
    to: &dyn Adapter,
    to_raw: &str,
    name: &str,
) -> Result<String, AdapterError> {
    let mcp = find_mcp(from, from_raw, name)?.ok_or_else(|| AdapterError::InvalidMcp {
        agent: from.id(),
        name: name.to_string(),
        reason: "no existe en el agente origen".into(),
    })?;
    to.upsert_mcp(to_raw, &mcp)
}
