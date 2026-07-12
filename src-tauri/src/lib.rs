//! Shell Tauri: capa fina que expone el core de Nodify al frontend. NO contiene
//! lógica de dominio (vive en `nodify-core`/`nodify-adapters`/`nodify-io`).
//!
//! Fase 1 = solo lectura: el único comando es `scan_agents`. Los secretos se envían
//! **ya enmascarados** al webview (ADR-0004: no empeorar la exposición).

mod mutate;
mod scan;

use scan::AgentScan;

#[tauri::command]
fn scan_agents() -> Vec<AgentScan> {
    scan::scan_agents_from_env()
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_agents,
            mutate::install_mcp,
            mutate::remove_mcp,
            mutate::share_mcp,
            mutate::set_model,
            mutate::share_skill,
            mutate::remove_skill,
            mutate::create_skill,
            mutate::read_skill,
            mutate::read_rules,
            mutate::write_rules,
            mutate::list_providers,
            mutate::set_env,
            mutate::export_bundle,
            mutate::sync_status,
            mutate::sync_push,
            mutate::sync_pull,
        ])
        .run(tauri::generate_context!())
        .expect("error al arrancar Nodify");
}
