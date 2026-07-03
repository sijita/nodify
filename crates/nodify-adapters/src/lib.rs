//! Adaptadores por agente: traducen la config nativa al modelo canónico.
//! Fase 1: solo `parse_mcps` (nativo → canónico).

mod util;

pub mod claude;
pub mod codex;
pub mod opencode;
pub mod ops;

pub use claude::ClaudeAdapter;
pub use codex::CodexAdapter;
pub use opencode::OpenCodeAdapter;
pub use ops::{find_mcp, share_mcp};

use nodify_core::Adapter;

/// Devuelve los adaptadores soportados en el MVP.
pub fn all() -> Vec<Box<dyn Adapter>> {
    vec![
        Box::new(ClaudeAdapter),
        Box::new(CodexAdapter),
        Box::new(OpenCodeAdapter),
    ]
}
