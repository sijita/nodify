//! Escaneo de agentes (solo lectura) y DTOs serializables para el frontend.

use nodify_adapters::{ClaudeAdapter, CodexAdapter, KiloCodeAdapter, OpenCodeAdapter, PiAdapter};
use nodify_core::{Adapter, CanonicalMcp, CanonicalSkill, Transport};
use nodify_io::detect::{
    agent_root, config_path, model_source_path, rules_path, skills_dir, AgentId, Env,
};
use nodify_io::scan_skills;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentScan {
    pub id: String,
    pub config_path: String,
    pub detected: bool,
    pub error: Option<String>,
    pub mcps: Vec<McpView>,
    pub skills: Vec<SkillView>,
    pub config: AgentConfig,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    /// Modelo por defecto (o `None` si no está definido).
    pub model: Option<String>,
    /// Ruta del archivo de reglas (`CLAUDE.md`/`AGENTS.md`) y si existe.
    pub rules_path: String,
    pub rules_present: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillView {
    pub name: String,
    pub description: String,
    pub enabled: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpView {
    pub name: String,
    pub transport: String,
    /// `command args` (stdio) o `url` (http), para mostrar en la matriz.
    pub target: String,
    pub enabled: Option<bool>,
    pub secrets: Vec<SecretView>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretView {
    pub key: String,
    /// Ya enmascarado; el valor crudo nunca sale del core.
    pub masked: String,
    pub is_ref: bool,
}

pub(crate) fn current_env() -> Env {
    Env {
        home: std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_default(),
        claude_config_dir: std::env::var("CLAUDE_CONFIG_DIR").ok(),
        codex_home: std::env::var("CODEX_HOME").ok(),
        xdg_config_home: std::env::var("XDG_CONFIG_HOME").ok(),
        opencode_config: std::env::var("OPENCODE_CONFIG").ok(),
    }
}

pub fn scan_agents_from_env() -> Vec<AgentScan> {
    let env = current_env();
    let agents: Vec<(AgentId, Box<dyn Adapter>)> = vec![
        (AgentId::ClaudeCode, Box::new(ClaudeAdapter)),
        (AgentId::Codex, Box::new(CodexAdapter)),
        (AgentId::OpenCode, Box::new(OpenCodeAdapter)),
        (AgentId::KiloCode, Box::new(KiloCodeAdapter)),
        (AgentId::PiAgent, Box::new(PiAdapter)),
    ];

    agents
        .into_iter()
        .map(|(id, adapter)| scan_one(id, adapter.as_ref(), &env))
        .collect()
}

fn scan_one(id: AgentId, adapter: &dyn Adapter, env: &Env) -> AgentScan {
    let path = config_path(id, env);
    let path_str = path.display().to_string();
    // Los skills son independientes del archivo de config MCP.
    let skills: Vec<SkillView> = scan_skills(&skills_dir(id, env))
        .into_iter()
        .map(to_skill_view)
        .collect();
    let config = read_config(id, adapter, env);

    let raw = match std::fs::read_to_string(&path) {
        Ok(s) => s,
        Err(_) => {
            // El archivo de MCPs puede no existir aún aunque el agente esté instalado
            // (p.ej. Pi no crea `mcp.json` hasta que se configura el primer servidor).
            // Se considera "detectado" si al menos existe el directorio de instalación.
            let detected = agent_root(id, env).exists();
            return AgentScan {
                id: adapter.id().to_string(),
                config_path: path_str,
                detected,
                error: None,
                mcps: Vec::new(),
                skills,
                config,
            }
        }
    };

    match adapter.parse_mcps(&raw) {
        Ok(mcps) => AgentScan {
            id: adapter.id().to_string(),
            config_path: path_str,
            detected: true,
            error: None,
            mcps: mcps.into_iter().map(to_view).collect(),
            skills,
            config,
        },
        Err(e) => AgentScan {
            id: adapter.id().to_string(),
            config_path: path_str,
            detected: true,
            error: Some(e.to_string()),
            mcps: Vec::new(),
            skills,
            config,
        },
    }
}

fn read_config(id: AgentId, adapter: &dyn Adapter, env: &Env) -> AgentConfig {
    let model = std::fs::read_to_string(model_source_path(id, env))
        .ok()
        .and_then(|raw| adapter.parse_model(&raw));
    let rules = rules_path(id, env);
    AgentConfig {
        model,
        rules_present: rules.exists(),
        rules_path: rules.display().to_string(),
    }
}

fn to_skill_view(s: CanonicalSkill) -> SkillView {
    SkillView {
        name: s.name,
        description: s.description,
        enabled: s.enabled,
    }
}

fn to_view(m: CanonicalMcp) -> McpView {
    let target = match m.transport {
        Transport::Stdio => format!(
            "{} {}",
            m.command.clone().unwrap_or_default(),
            m.args.join(" ")
        )
        .trim()
        .to_string(),
        Transport::Http => m.url.clone().unwrap_or_default(),
    };

    let transport = match m.transport {
        Transport::Stdio => "stdio",
        Transport::Http => "http",
    }
    .to_string();

    let secrets = m
        .env
        .iter()
        .chain(m.headers.iter())
        .map(|(k, v)| SecretView {
            key: k.clone(),
            masked: v.masked(),
            is_ref: matches!(v, nodify_core::SecretValue::EnvRef(_)),
        })
        .collect();

    McpView {
        name: m.name,
        transport,
        target,
        enabled: m.enabled,
        secrets,
    }
}
