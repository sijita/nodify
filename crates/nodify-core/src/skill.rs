//! Representación canónica de un Skill. Los tres agentes usan el estándar `SKILL.md`
//! (Claude, Codex desde dic-2025, OpenCode), con frontmatter mínimo `name`+`description`.
//! Ver `docs/canonical-model.md`.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CanonicalSkill {
    /// Nombre = carpeta; regex `^[a-z0-9]+(-[a-z0-9]+)*$`.
    pub name: String,
    pub description: String,
    /// Ruta al `SKILL.md` en disco.
    pub body_path: String,
    /// Archivos de recursos adjuntos (relativos a la carpeta del skill).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub files: Vec<String>,
    pub enabled: bool,
    /// Campos extra del frontmatter, preservados.
    #[serde(default, skip_serializing_if = "serde_json::Value::is_null")]
    pub frontmatter_extras: serde_json::Value,
}

/// Extrae `name` y `description` del frontmatter YAML de un `SKILL.md`.
///
/// Frontmatter mínimo común a los tres agentes:
/// ```text
/// ---
/// name: my-skill
/// description: "cuándo usar esto"
/// ---
/// ```
/// Parser deliberadamente ligero (sin dependencia YAML): lee el bloque entre las
/// primeras vallas `---` y toma los pares `clave: valor` de primer nivel `name`/`description`.
pub fn parse_frontmatter(content: &str) -> (Option<String>, Option<String>) {
    let trimmed = content.trim_start();
    let Some(rest) = trimmed.strip_prefix("---") else {
        return (None, None);
    };
    // el bloque va hasta la siguiente línea con solo `---`
    let end = rest.find("\n---").map(|i| i + 1).unwrap_or(rest.len());
    let block = &rest[..end];

    let mut name = None;
    let mut description = None;
    for line in block.lines() {
        if let Some((key, val)) = line.split_once(':') {
            let key = key.trim();
            let val = unquote(val.trim());
            match key {
                "name" if !val.is_empty() => name = Some(val),
                "description" if !val.is_empty() => description = Some(val),
                _ => {}
            }
        }
    }
    (name, description)
}

fn unquote(s: &str) -> String {
    let bytes = s.as_bytes();
    if s.len() >= 2
        && ((bytes[0] == b'"' && bytes[s.len() - 1] == b'"')
            || (bytes[0] == b'\'' && bytes[s.len() - 1] == b'\''))
    {
        s[1..s.len() - 1].to_string()
    } else {
        s.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_name_and_quoted_description() {
        let md = "---\nname: code-review\ndescription: \"Revisa el diff\"\n---\n# body\n";
        let (n, d) = parse_frontmatter(md);
        assert_eq!(n.as_deref(), Some("code-review"));
        assert_eq!(d.as_deref(), Some("Revisa el diff"));
    }

    #[test]
    fn no_frontmatter_returns_none() {
        assert_eq!(parse_frontmatter("# solo body\n"), (None, None));
    }

    #[test]
    fn ignores_body_colons() {
        let md = "---\nname: x\n---\nhttp://foo: bar\n";
        let (n, d) = parse_frontmatter(md);
        assert_eq!(n.as_deref(), Some("x"));
        assert_eq!(d, None);
    }
}
