//! `nodify-core` — modelo canónico neutral y contrato de adaptadores.
//!
//! Este crate es lógica pura: sin acceso a filesystem ni a Tauri. Define cómo
//! representa Nodify un MCP, un Skill y la config, con independencia del agente,
//! más el trait `Adapter` que cada agente implementa.

pub mod adapter;
pub mod mcp;
pub mod provider;
pub mod secret;
pub mod skill;
pub mod sync;

pub use adapter::{Adapter, AdapterError};
pub use mcp::{CanonicalMcp, Transport};
pub use provider::ProviderInfo;
pub use secret::SecretValue;
pub use skill::{parse_frontmatter, CanonicalSkill};
pub use sync::{diff_bundles, strip_secrets, AgentBundle, DiffEntry, SyncBundle};
