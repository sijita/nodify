//! Comandos de escritura (Fase 2): instalar / eliminar / compartir MCPs. Capa fina
//! sobre el core ya testeado (`nodify-adapters` + `nodify-io::safe_write`). Toda la
//! lógica delicada (round-trip, preservación) vive en el core; aquí solo orquestamos
//! leer archivo → operar → escritura segura.

use std::collections::BTreeMap;
use std::path::Path;
use std::process::Command;

use nodify_adapters::{share_mcp as share_op, ClaudeAdapter, CodexAdapter, OpenCodeAdapter};
use nodify_core::mcp::Transport;
use nodify_core::{diff_bundles, Adapter, CanonicalMcp, DiffEntry, SecretValue, SyncBundle};
use nodify_io::detect::AgentId;
use nodify_io::{
    config_path, copy_skill, model_source_path, remove_skill as remove_skill_fs, rules_path,
    safe_write, skills_dir,
};
use serde::Deserialize;

use crate::scan::current_env;

const BUNDLE_FILE: &str = "nodify-bundle.json";

/// Entrada de MCP desde el frontend (secretos siempre inline al instalar manualmente).
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpInput {
    name: String,
    transport: String,
    command: Option<String>,
    args: Option<Vec<String>>,
    url: Option<String>,
    env: Option<BTreeMap<String, String>>,
    headers: Option<BTreeMap<String, String>>,
    enabled: Option<bool>,
}

impl McpInput {
    fn into_canonical(self) -> CanonicalMcp {
        let inline = |m: BTreeMap<String, String>| {
            m.into_iter()
                .map(|(k, v)| (k, SecretValue::Inline(v)))
                .collect()
        };
        let mut c = if self.transport == "http" {
            CanonicalMcp::http(&self.name, self.url.unwrap_or_default())
        } else {
            CanonicalMcp::stdio(&self.name, self.command.unwrap_or_default())
        };
        c.args = self.args.unwrap_or_default();
        c.env = self.env.map(inline).unwrap_or_default();
        c.headers = self.headers.map(inline).unwrap_or_default();
        c.enabled = self.enabled;
        // fija el transporte por si el input lo indicó explícito
        if self.transport == "http" {
            c.transport = Transport::Http;
        }
        c
    }
}

fn adapter_for(id: &str) -> Result<(AgentId, Box<dyn Adapter>), String> {
    match id {
        "claude-code" => Ok((AgentId::ClaudeCode, Box::new(ClaudeAdapter))),
        "codex" => Ok((AgentId::Codex, Box::new(CodexAdapter))),
        "opencode" => Ok((AgentId::OpenCode, Box::new(OpenCodeAdapter))),
        other => Err(format!("agente desconocido: {other}")),
    }
}

fn read_raw(id: AgentId) -> String {
    let path = config_path(id, &current_env());
    std::fs::read_to_string(path).unwrap_or_default()
}

fn write_file(path: &Path, contents: &str) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    safe_write(path, contents).map_err(|e| e.to_string())
}

fn write_raw(id: AgentId, contents: &str) -> Result<(), String> {
    write_file(&config_path(id, &current_env()), contents)
}

#[tauri::command]
pub fn install_mcp(agent_id: String, mcp: McpInput) -> Result<(), String> {
    let (id, adapter) = adapter_for(&agent_id)?;
    let raw = read_raw(id);
    let out = adapter
        .upsert_mcp(&raw, &mcp.into_canonical())
        .map_err(|e| e.to_string())?;
    write_raw(id, &out)
}

#[tauri::command]
pub fn remove_mcp(agent_id: String, name: String) -> Result<(), String> {
    let (id, adapter) = adapter_for(&agent_id)?;
    let raw = read_raw(id);
    let out = adapter.remove_mcp(&raw, &name).map_err(|e| e.to_string())?;
    write_raw(id, &out)
}

#[tauri::command]
pub fn share_mcp(from_id: String, to_id: String, name: String) -> Result<(), String> {
    let (from, from_ad) = adapter_for(&from_id)?;
    let (to, to_ad) = adapter_for(&to_id)?;
    let from_raw = read_raw(from);
    let to_raw = read_raw(to);
    let out = share_op(from_ad.as_ref(), &from_raw, to_ad.as_ref(), &to_raw, &name)
        .map_err(|e| e.to_string())?;
    write_raw(to, &out)
}

// ---------- Config ----------

#[tauri::command]
pub fn set_model(agent_id: String, model: String) -> Result<(), String> {
    let (id, adapter) = adapter_for(&agent_id)?;
    let env = current_env();
    let path = model_source_path(id, &env);
    let raw = std::fs::read_to_string(&path).unwrap_or_default();
    let out = adapter.set_model(&raw, &model).map_err(|e| e.to_string())?;
    write_file(&path, &out)
}

// ---------- Skills ----------

#[tauri::command]
pub fn share_skill(from_id: String, to_id: String, name: String) -> Result<(), String> {
    let (from, _) = adapter_for(&from_id)?;
    let (to, _) = adapter_for(&to_id)?;
    let env = current_env();
    copy_skill(&skills_dir(from, &env), &skills_dir(to, &env), &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_skill(agent_id: String, name: String) -> Result<(), String> {
    let (id, _) = adapter_for(&agent_id)?;
    remove_skill_fs(&skills_dir(id, &current_env()), &name).map_err(|e| e.to_string())
}

// ---------- Proveedores (solo lectura; sin valores de secretos) ----------

#[tauri::command]
pub fn list_providers(agent_id: String) -> Result<Vec<nodify_core::ProviderInfo>, String> {
    let (id, adapter) = adapter_for(&agent_id)?;
    let raw = std::fs::read_to_string(config_path(id, &current_env())).unwrap_or_default();
    Ok(adapter.parse_providers(&raw))
}

// ---------- Reglas (CLAUDE.md / AGENTS.md) ----------

#[tauri::command]
pub fn read_rules(agent_id: String) -> Result<String, String> {
    let (id, _) = adapter_for(&agent_id)?;
    Ok(std::fs::read_to_string(rules_path(id, &current_env())).unwrap_or_default())
}

#[tauri::command]
pub fn write_rules(agent_id: String, content: String) -> Result<(), String> {
    let (id, _) = adapter_for(&agent_id)?;
    write_file(&rules_path(id, &current_env()), &content)
}

// ---------- Sync (Fase 5, ADR-0006) ----------

/// Construye el bundle canónico (sin secretos) leyendo la config actual de los agentes.
fn build_bundle() -> SyncBundle {
    let env = current_env();
    let agents = [
        (AgentId::ClaudeCode, "claude-code"),
        (AgentId::Codex, "codex"),
        (AgentId::OpenCode, "opencode"),
    ];
    let mut entries = Vec::new();
    for (id, id_str) in agents {
        let (_, adapter) = adapter_for(id_str).unwrap();
        let mcp_raw = std::fs::read_to_string(config_path(id, &env)).unwrap_or_default();
        let mcps = adapter.parse_mcps(&mcp_raw).unwrap_or_default();
        let model = std::fs::read_to_string(model_source_path(id, &env))
            .ok()
            .and_then(|raw| adapter.parse_model(&raw));
        entries.push((id_str.to_string(), model, mcps));
    }
    SyncBundle::build(entries)
}

/// Aplica un bundle al dispositivo actual: upsert de MCPs + set del modelo por agente.
fn apply_bundle(bundle: &SyncBundle) -> Result<(), String> {
    let env = current_env();
    for (id_str, ab) in &bundle.agents {
        let (id, adapter) = adapter_for(id_str)?;
        let path = config_path(id, &env);
        let mut raw = std::fs::read_to_string(&path).unwrap_or_default();
        for mcp in &ab.mcps {
            raw = adapter.upsert_mcp(&raw, mcp).map_err(|e| e.to_string())?;
        }
        write_file(&path, &raw)?;
        if let Some(model) = &ab.model {
            let mp = model_source_path(id, &env);
            let mraw = std::fs::read_to_string(&mp).unwrap_or_default();
            let out = adapter.set_model(&mraw, model).map_err(|e| e.to_string())?;
            write_file(&mp, &out)?;
        }
    }
    Ok(())
}

fn read_repo_bundle(repo_dir: &str) -> Result<SyncBundle, String> {
    let path = Path::new(repo_dir).join(BUNDLE_FILE);
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("no se pudo leer {}: {e}", path.display()))?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn git(repo_dir: &str, args: &[&str]) -> Result<(), String> {
    let out = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .args(args)
        .output()
        .map_err(|e| format!("git no disponible: {e}"))?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    Ok(())
}

/// Bundle canónico actual como JSON (para ver/exportar).
#[tauri::command]
pub fn export_bundle() -> Result<String, String> {
    serde_json::to_string_pretty(&build_bundle()).map_err(|e| e.to_string())
}

/// Diff del bundle del repo frente al estado local (qué cambiaría un Pull).
#[tauri::command]
pub fn sync_status(repo_dir: String) -> Result<Vec<DiffEntry>, String> {
    let incoming = read_repo_bundle(&repo_dir)?;
    Ok(diff_bundles(&build_bundle(), &incoming))
}

/// Push: escribe el bundle local en el repo y hace commit + push (git real).
#[tauri::command]
pub fn sync_push(repo_dir: String) -> Result<(), String> {
    let bundle = serde_json::to_string_pretty(&build_bundle()).map_err(|e| e.to_string())?;
    let path = Path::new(&repo_dir).join(BUNDLE_FILE);
    std::fs::write(&path, bundle).map_err(|e| e.to_string())?;
    git(&repo_dir, &["add", BUNDLE_FILE])?;
    // commit puede fallar si no hay cambios; se ignora ese caso concreto
    let _ = git(&repo_dir, &["commit", "-m", "nodify: sync bundle"]);
    git(&repo_dir, &["push"])
}

/// Pull: trae el repo y aplica el bundle al dispositivo actual.
#[tauri::command]
pub fn sync_pull(repo_dir: String) -> Result<(), String> {
    git(&repo_dir, &["pull", "--ff-only"])?;
    let incoming = read_repo_bundle(&repo_dir)?;
    apply_bundle(&incoming)
}
