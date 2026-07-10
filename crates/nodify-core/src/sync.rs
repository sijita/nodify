//! Bundle canónico de sincronización (Fase 5, ADR-0006). Representación portable de la
//! config gestionada, **sin valores de secretos ni estado de máquina**. Los secretos se
//! despojan convirtiéndolos en referencias a env var (`Inline(v)` bajo clave `K` → `EnvRef(K)`),
//! de modo que el bundle nunca lleva credenciales pero conserva qué variables se necesitan.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::mcp::CanonicalMcp;
use crate::secret::SecretValue;

pub const BUNDLE_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SyncBundle {
    pub version: u32,
    /// Por id de agente (ordenado para diffs y commits estables).
    pub agents: BTreeMap<String, AgentBundle>,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct AgentBundle {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub mcps: Vec<CanonicalMcp>,
}

/// Despoja los valores de secretos de un MCP: cada `Inline` pasa a `EnvRef` con el
/// nombre de su clave. Las referencias existentes se conservan.
pub fn strip_secrets(mcp: &mut CanonicalMcp) {
    for (key, val) in mcp.env.iter_mut() {
        if matches!(val, SecretValue::Inline(_)) {
            *val = SecretValue::EnvRef(key.clone());
        }
    }
    for (key, val) in mcp.headers.iter_mut() {
        if matches!(val, SecretValue::Inline(_)) {
            *val = SecretValue::EnvRef(key.clone());
        }
    }
}

impl SyncBundle {
    /// Construye un bundle a partir de `(agent_id, model, mcps)`, despojando secretos.
    pub fn build(entries: Vec<(String, Option<String>, Vec<CanonicalMcp>)>) -> Self {
        let mut agents = BTreeMap::new();
        for (id, model, mut mcps) in entries {
            for m in mcps.iter_mut() {
                strip_secrets(m);
            }
            mcps.sort_by(|a, b| a.name.cmp(&b.name));
            agents.insert(id, AgentBundle { model, mcps });
        }
        SyncBundle {
            version: BUNDLE_VERSION,
            agents,
        }
    }
}

/// Una diferencia entre el estado actual y un bundle entrante, para revisar antes de aplicar.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DiffEntry {
    pub agent: String,
    /// `+ mcp x` (añade), `- mcp x` (quita), `~ mcp x` (cambia), `model → y`.
    pub change: String,
}

/// Diff de `incoming` respecto a `current` (qué pasaría al aplicar `incoming`).
pub fn diff_bundles(current: &SyncBundle, incoming: &SyncBundle) -> Vec<DiffEntry> {
    let mut out = Vec::new();
    let mut agent_ids: Vec<&String> = current
        .agents
        .keys()
        .chain(incoming.agents.keys())
        .collect();
    agent_ids.sort();
    agent_ids.dedup();

    for id in agent_ids {
        let cur = current.agents.get(id);
        let inc = incoming.agents.get(id);
        let empty = AgentBundle::default();
        let cur = cur.unwrap_or(&empty);
        let inc = inc.unwrap_or(&empty);

        if cur.model != inc.model {
            if let Some(m) = &inc.model {
                out.push(entry(id, format!("model → {m}")));
            }
        }

        for m in &inc.mcps {
            match cur.mcps.iter().find(|c| c.name == m.name) {
                None => out.push(entry(id, format!("+ mcp {}", m.name))),
                Some(c) if c != m => out.push(entry(id, format!("~ mcp {}", m.name))),
                _ => {}
            }
        }
        for c in &cur.mcps {
            if !inc.mcps.iter().any(|m| m.name == c.name) {
                out.push(entry(id, format!("- mcp {}", c.name)));
            }
        }
    }
    out
}

fn entry(agent: &str, change: String) -> DiffEntry {
    DiffEntry {
        agent: agent.to_string(),
        change,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mcp_with_secret() -> CanonicalMcp {
        let mut m = CanonicalMcp::stdio("fire", "npx");
        m.env.insert(
            "FIRECRAWL_API_KEY".into(),
            SecretValue::Inline("fc-secret".into()),
        );
        m
    }

    #[test]
    fn build_strips_secret_values_to_refs() {
        let b = SyncBundle::build(vec![(
            "opencode".into(),
            Some("anthropic/x".into()),
            vec![mcp_with_secret()],
        )]);
        let mcp = &b.agents["opencode"].mcps[0];
        // el valor "fc-secret" NO está; queda como referencia a la env var
        assert_eq!(
            mcp.env.get("FIRECRAWL_API_KEY"),
            Some(&SecretValue::EnvRef("FIRECRAWL_API_KEY".into()))
        );
        // serializado tampoco filtra el valor
        let json = serde_json::to_string(&b).unwrap();
        assert!(!json.contains("fc-secret"));
    }

    #[test]
    fn diff_reports_add_remove_change_and_model() {
        let current = SyncBundle::build(vec![(
            "codex".into(),
            Some("old".into()),
            vec![
                CanonicalMcp::stdio("keep", "a"),
                CanonicalMcp::stdio("gone", "b"),
            ],
        )]);
        let incoming = SyncBundle::build(vec![(
            "codex".into(),
            Some("new".into()),
            vec![
                CanonicalMcp::stdio("keep", "CHANGED"),
                CanonicalMcp::stdio("added", "c"),
            ],
        )]);

        let changes: Vec<String> = diff_bundles(&current, &incoming)
            .into_iter()
            .map(|d| d.change)
            .collect();
        assert!(changes.contains(&"model → new".to_string()));
        assert!(changes.contains(&"+ mcp added".to_string()));
        assert!(changes.contains(&"- mcp gone".to_string()));
        assert!(changes.contains(&"~ mcp keep".to_string()));
    }

    #[test]
    fn identical_bundles_have_no_diff() {
        let b = SyncBundle::build(vec![(
            "codex".into(),
            None,
            vec![CanonicalMcp::stdio("x", "y")],
        )]);
        assert!(diff_bundles(&b, &b).is_empty());
    }
}
