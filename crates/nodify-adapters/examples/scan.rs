//! Escanea los agentes reales de la máquina y lista sus MCPs en forma canónica,
//! con secretos enmascarados. Prueba de integración manual (no toca nada, solo lee).
//!
//!     cargo run -p nodify-adapters --example scan

use nodify_adapters::{ClaudeAdapter, CodexAdapter, KiloCodeAdapter, OpenCodeAdapter, PiAdapter};
use nodify_core::{Adapter, Transport};
use nodify_io::detect::{config_path, AgentId, Env};

fn main() {
    let env = Env {
        home: std::env::var("HOME").unwrap_or_default(),
        codex_home: std::env::var("CODEX_HOME").ok(),
        xdg_config_home: std::env::var("XDG_CONFIG_HOME").ok(),
        opencode_config: std::env::var("OPENCODE_CONFIG").ok(),
        claude_config_dir: std::env::var("CLAUDE_CONFIG_DIR").ok(),
    };

    let agents: &[(AgentId, &dyn Adapter)] = &[
        (AgentId::ClaudeCode, &ClaudeAdapter),
        (AgentId::Codex, &CodexAdapter),
        (AgentId::OpenCode, &OpenCodeAdapter),
        (AgentId::KiloCode, &KiloCodeAdapter),
        (AgentId::PiAgent, &PiAdapter),
    ];

    for (id, adapter) in agents {
        let path = config_path(*id, &env);
        println!("\n=== {} ({}) ===", adapter.id(), path.display());
        let raw = match std::fs::read_to_string(&path) {
            Ok(s) => s,
            Err(e) => {
                println!("  (no detectado: {e})");
                continue;
            }
        };
        match adapter.parse_mcps(&raw) {
            Ok(mcps) if mcps.is_empty() => println!("  (sin MCPs)"),
            Ok(mcps) => {
                for m in mcps {
                    let target = match m.transport {
                        Transport::Stdio => {
                            format!("{} {}", m.command.unwrap_or_default(), m.args.join(" "))
                        }
                        Transport::Http => m.url.unwrap_or_default(),
                    };
                    let flags = m
                        .enabled
                        .map(|e| if e { " [ENABLED]" } else { " [DISABLED]" })
                        .unwrap_or("");
                    println!("  - {:<16} {}{}", m.name, target.trim(), flags);
                    for (k, v) in m.env.iter().chain(m.headers.iter()) {
                        println!("      {k} = {}", v.masked());
                    }
                }
            }
            Err(e) => println!("  ERROR: {e}"),
        }
    }
}
