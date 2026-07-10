//! Resolución de la ruta de config **global/usuario** de cada agente, respetando los
//! overrides de entorno. Función pura sobre un snapshot de entorno (`Env`) para poder
//! testear sin tocar el sistema real. Ver `docs/adapters/*` (secciones de ubicaciones).

use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgentId {
    ClaudeCode,
    Codex,
    OpenCode,
    KiloCode,
    PiAgent,
}

/// Snapshot de las variables de entorno relevantes. `None` = no definida.
#[derive(Debug, Default, Clone)]
pub struct Env {
    pub home: String,
    pub claude_config_dir: Option<String>,
    pub codex_home: Option<String>,
    pub xdg_config_home: Option<String>,
    pub opencode_config: Option<String>,
}

/// Devuelve la ruta del archivo de config global/usuario del agente para el entorno
/// dado. Aplica los overrides documentados por cada agente.
pub fn config_path(agent: AgentId, env: &Env) -> PathBuf {
    match agent {
        AgentId::ClaudeCode => {
            // Los MCP de usuario viven en `~/.claude.json` (no en el dir de config).
            // `CLAUDE_CONFIG_DIR` reubica el directorio `.claude`, pero el archivo de
            // MCP de usuario es `<home>/.claude.json`.
            PathBuf::from(&env.home).join(".claude.json")
        }
        AgentId::Codex => {
            let base = env
                .codex_home
                .clone()
                .unwrap_or_else(|| format!("{}/.codex", env.home));
            PathBuf::from(base).join("config.toml")
        }
        AgentId::OpenCode => {
            if let Some(cfg) = &env.opencode_config {
                return PathBuf::from(cfg);
            }
            let base = env
                .xdg_config_home
                .clone()
                .unwrap_or_else(|| format!("{}/.config", env.home));
            PathBuf::from(base).join("opencode").join("opencode.json")
        }
        // Kilo Code CLI: `~/.config/kilo/kilo.jsonc` (JSONC, clave `mcp`). Respeta XDG.
        AgentId::KiloCode => kilo_dir(env).join("kilo.jsonc"),
        // Pi (pi.dev): los MCP viven en `~/.pi/agent/mcp.json` (clave `mcpServers`).
        AgentId::PiAgent => pi_agent_dir(env).join("mcp.json"),
    }
}

fn claude_dir(env: &Env) -> PathBuf {
    let base = env
        .claude_config_dir
        .clone()
        .unwrap_or_else(|| format!("{}/.claude", env.home));
    PathBuf::from(base)
}

fn codex_dir(env: &Env) -> PathBuf {
    let base = env
        .codex_home
        .clone()
        .unwrap_or_else(|| format!("{}/.codex", env.home));
    PathBuf::from(base)
}

fn opencode_dir(env: &Env) -> PathBuf {
    let base = env
        .xdg_config_home
        .clone()
        .unwrap_or_else(|| format!("{}/.config", env.home));
    PathBuf::from(base).join("opencode")
}

fn kilo_dir(env: &Env) -> PathBuf {
    let base = env
        .xdg_config_home
        .clone()
        .unwrap_or_else(|| format!("{}/.config", env.home));
    PathBuf::from(base).join("kilo")
}

/// Directorio de config a nivel usuario de Pi (pi.dev): `~/.pi/agent`.
fn pi_agent_dir(env: &Env) -> PathBuf {
    PathBuf::from(&env.home).join(".pi").join("agent")
}

/// Archivo que contiene el **modelo por defecto** del agente. Ojo: en Claude es
/// `settings.json` (distinto del archivo de MCPs); en Codex/OpenCode es el mismo config.
pub fn model_source_path(agent: AgentId, env: &Env) -> PathBuf {
    match agent {
        AgentId::ClaudeCode => claude_dir(env).join("settings.json"),
        // Pi guarda `defaultModel` en un archivo aparte del de MCPs.
        AgentId::PiAgent => pi_agent_dir(env).join("settings.json"),
        // Codex/OpenCode/Kilo tienen el modelo en el mismo archivo de config.
        AgentId::Codex | AgentId::OpenCode | AgentId::KiloCode => config_path(agent, env),
    }
}

/// Archivo de **reglas / system prompt** a nivel usuario.
pub fn rules_path(agent: AgentId, env: &Env) -> PathBuf {
    match agent {
        AgentId::ClaudeCode => claude_dir(env).join("CLAUDE.md"),
        AgentId::Codex => codex_dir(env).join("AGENTS.md"),
        AgentId::OpenCode => opencode_dir(env).join("AGENTS.md"),
        AgentId::KiloCode => kilo_dir(env).join("AGENTS.md"),
        AgentId::PiAgent => pi_agent_dir(env).join("AGENTS.md"),
    }
}

/// Directorio de **skills** (nivel usuario) de cada agente. Todos usan `SKILL.md`,
/// pero en ubicaciones distintas (ver `docs/canonical-model.md`).
pub fn skills_dir(agent: AgentId, env: &Env) -> PathBuf {
    match agent {
        AgentId::ClaudeCode => {
            let base = env
                .claude_config_dir
                .clone()
                .unwrap_or_else(|| format!("{}/.claude", env.home));
            PathBuf::from(base).join("skills")
        }
        // Oficial: `~/.agents/skills` (no bajo CODEX_HOME).
        AgentId::Codex => PathBuf::from(&env.home).join(".agents").join("skills"),
        AgentId::OpenCode => {
            let base = env
                .xdg_config_home
                .clone()
                .unwrap_or_else(|| format!("{}/.config", env.home));
            PathBuf::from(base).join("opencode").join("skills")
        }
        AgentId::KiloCode => kilo_dir(env).join("skills"),
        AgentId::PiAgent => pi_agent_dir(env).join("skills"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_env() -> Env {
        Env {
            home: "/home/u".into(),
            ..Default::default()
        }
    }

    #[test]
    fn claude_default_path() {
        assert_eq!(
            config_path(AgentId::ClaudeCode, &base_env()),
            PathBuf::from("/home/u/.claude.json")
        );
    }

    #[test]
    fn codex_respects_codex_home() {
        let mut env = base_env();
        env.codex_home = Some("/opt/codex".into());
        assert_eq!(
            config_path(AgentId::Codex, &env),
            PathBuf::from("/opt/codex/config.toml")
        );
    }

    #[test]
    fn opencode_default_uses_xdg_fallback() {
        assert_eq!(
            config_path(AgentId::OpenCode, &base_env()),
            PathBuf::from("/home/u/.config/opencode/opencode.json")
        );
    }

    #[test]
    fn opencode_respects_xdg_config_home() {
        let mut env = base_env();
        env.xdg_config_home = Some("/xdg".into());
        assert_eq!(
            config_path(AgentId::OpenCode, &env),
            PathBuf::from("/xdg/opencode/opencode.json")
        );
    }

    #[test]
    fn opencode_config_override_wins() {
        let mut env = base_env();
        env.opencode_config = Some("/custom/oc.jsonc".into());
        assert_eq!(
            config_path(AgentId::OpenCode, &env),
            PathBuf::from("/custom/oc.jsonc")
        );
    }

    #[test]
    fn model_and_rules_paths_per_agent() {
        let env = base_env();
        assert_eq!(
            model_source_path(AgentId::ClaudeCode, &env),
            PathBuf::from("/home/u/.claude/settings.json")
        );
        assert_eq!(
            model_source_path(AgentId::Codex, &env),
            PathBuf::from("/home/u/.codex/config.toml")
        );
        assert_eq!(
            rules_path(AgentId::ClaudeCode, &env),
            PathBuf::from("/home/u/.claude/CLAUDE.md")
        );
        assert_eq!(
            rules_path(AgentId::OpenCode, &env),
            PathBuf::from("/home/u/.config/opencode/AGENTS.md")
        );
    }

    #[test]
    fn skills_dirs_per_agent() {
        let env = base_env();
        assert_eq!(
            skills_dir(AgentId::ClaudeCode, &env),
            PathBuf::from("/home/u/.claude/skills")
        );
        assert_eq!(
            skills_dir(AgentId::Codex, &env),
            PathBuf::from("/home/u/.agents/skills")
        );
        assert_eq!(
            skills_dir(AgentId::OpenCode, &env),
            PathBuf::from("/home/u/.config/opencode/skills")
        );
    }

    #[test]
    fn kilo_paths_use_xdg_config() {
        let env = base_env();
        assert_eq!(
            config_path(AgentId::KiloCode, &env),
            PathBuf::from("/home/u/.config/kilo/kilo.jsonc")
        );
        // El modelo de Kilo vive en el mismo archivo de config.
        assert_eq!(
            model_source_path(AgentId::KiloCode, &env),
            PathBuf::from("/home/u/.config/kilo/kilo.jsonc")
        );
        assert_eq!(
            rules_path(AgentId::KiloCode, &env),
            PathBuf::from("/home/u/.config/kilo/AGENTS.md")
        );
        assert_eq!(
            skills_dir(AgentId::KiloCode, &env),
            PathBuf::from("/home/u/.config/kilo/skills")
        );
    }

    #[test]
    fn kilo_respects_xdg_config_home() {
        let mut env = base_env();
        env.xdg_config_home = Some("/xdg".into());
        assert_eq!(
            config_path(AgentId::KiloCode, &env),
            PathBuf::from("/xdg/kilo/kilo.jsonc")
        );
    }

    #[test]
    fn pi_paths_split_mcp_and_model() {
        let env = base_env();
        // Los MCP y el modelo viven en archivos distintos bajo ~/.pi/agent.
        assert_eq!(
            config_path(AgentId::PiAgent, &env),
            PathBuf::from("/home/u/.pi/agent/mcp.json")
        );
        assert_eq!(
            model_source_path(AgentId::PiAgent, &env),
            PathBuf::from("/home/u/.pi/agent/settings.json")
        );
        assert_eq!(
            rules_path(AgentId::PiAgent, &env),
            PathBuf::from("/home/u/.pi/agent/AGENTS.md")
        );
        assert_eq!(
            skills_dir(AgentId::PiAgent, &env),
            PathBuf::from("/home/u/.pi/agent/skills")
        );
    }
}
