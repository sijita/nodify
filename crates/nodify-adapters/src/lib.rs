//! Adaptadores por agente: traducen la config nativa al modelo canónico.
//! Fase 1: solo `parse_mcps` (nativo → canónico).

mod util;

pub mod claude;
pub mod codex;
pub mod kilocode;
pub mod opencode;
pub mod ops;
pub mod piagent;

pub use claude::ClaudeAdapter;
pub use codex::CodexAdapter;
pub use kilocode::KiloCodeAdapter;
pub use opencode::OpenCodeAdapter;
pub use ops::{find_mcp, share_mcp};
pub use piagent::PiAdapter;

use nodify_core::Adapter;

/// Devuelve todos los adaptadores soportados.
pub fn all() -> Vec<Box<dyn Adapter>> {
    vec![
        Box::new(ClaudeAdapter),
        Box::new(CodexAdapter),
        Box::new(OpenCodeAdapter),
        Box::new(KiloCodeAdapter),
        Box::new(PiAdapter),
    ]
}
