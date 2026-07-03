//! Valor sensible: puede estar inline (valor literal) o ser una referencia a una
//! variable de entorno. Distinción necesaria porque Codex referencia secretos por
//! nombre de env var (`env_key`), mientras Claude/OpenCode admiten el valor inline.
//! Ver `docs/adr/0007-canonical-mcp-translation-rules.md`.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SecretValue {
    /// Valor literal presente en el archivo de config (Claude, OpenCode).
    Inline(String),
    /// Referencia al nombre de una variable de entorno (Codex `env_key`).
    EnvRef(String),
}

impl SecretValue {
    /// Enmascara el contenido para mostrarlo en UI/logs sin filtrar el valor.
    /// Una referencia a env var no es secreta en sí (es solo un nombre), así que
    /// se muestra tal cual.
    pub fn masked(&self) -> String {
        match self {
            SecretValue::EnvRef(name) => format!("${{{name}}}"),
            SecretValue::Inline(v) => mask_inline(v),
        }
    }
}

fn mask_inline(v: &str) -> String {
    let n = v.chars().count();
    if n <= 4 {
        "•".repeat(n)
    } else {
        let last4: String = v.chars().skip(n - 4).collect();
        format!("{}{}", "•".repeat(n - 4), last4)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_inline_keeping_last_four() {
        let s = SecretValue::Inline("fc-exampleKEYvalue00000000000000401a".into());
        let masked = s.masked();
        assert!(masked.ends_with("401a"));
        assert!(!masked.contains("example"));
    }

    #[test]
    fn short_inline_fully_masked() {
        assert_eq!(SecretValue::Inline("abc".into()).masked(), "•••");
    }

    #[test]
    fn env_ref_is_shown_as_reference_not_masked() {
        let s = SecretValue::EnvRef("OPENAI_API_KEY".into());
        assert_eq!(s.masked(), "${OPENAI_API_KEY}");
    }
}
