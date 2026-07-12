//! `nodify-io` — descubrimiento de agentes y sus archivos de config a nivel global.
//! Fase 1: resolución de rutas (respetando overrides de entorno). La lectura/parseo
//! real se compone con `nodify-adapters`.

pub mod detect;
pub mod skills;
pub mod write;

pub use detect::{config_path, model_source_path, rules_path, skills_dir, AgentId, Env};
pub use skills::{copy_skill, create_skill, remove_skill, scan_skills};
pub use write::{backup_path, safe_write};
