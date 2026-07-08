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
    let lines: Vec<&str> = rest[..end].lines().collect();

    let mut name = None;
    let mut description = None;
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        // Solo claves de primer nivel (sin sangría ni líneas vacías).
        if line.trim().is_empty() || line.starts_with(char::is_whitespace) {
            i += 1;
            continue;
        }
        let Some((key, val)) = line.split_once(':') else {
            i += 1;
            continue;
        };
        let key = key.trim();
        let raw = val.trim();
        let (value, next) = if is_block_scalar(raw) {
            // `description: >` / `|` → el texto son las líneas sangradas siguientes.
            read_block_scalar(&lines, i + 1, raw.starts_with('>'))
        } else {
            (unquote(raw), i + 1)
        };
        match key {
            "name" if !value.is_empty() => name = Some(value),
            "description" if !value.is_empty() => description = Some(value),
            _ => {}
        }
        i = next;
    }
    (name, description)
}

/// ¿El valor es un indicador de bloque escalar YAML (`>`, `|`, con recorte `-`/`+`)?
fn is_block_scalar(s: &str) -> bool {
    let mut chars = s.chars();
    matches!(chars.next(), Some('>') | Some('|'))
        && chars.all(|c| c == '-' || c == '+' || c.is_ascii_digit())
}

/// Lee las líneas sangradas de un bloque escalar. `folded` (`>`) une con espacios;
/// literal (`|`) une con saltos de línea. Devuelve `(texto, índice de la línea siguiente)`.
fn read_block_scalar(lines: &[&str], start: usize, folded: bool) -> (String, usize) {
    let mut collected: Vec<String> = Vec::new();
    let mut i = start;
    while i < lines.len() {
        let line = lines[i];
        if line.trim().is_empty() {
            collected.push(String::new());
        } else if line.starts_with(char::is_whitespace) {
            collected.push(line.trim().to_string());
        } else {
            break; // siguiente clave de primer nivel
        }
        i += 1;
    }
    while collected.last().is_some_and(|s| s.is_empty()) {
        collected.pop();
    }
    let joined = if folded {
        collected.join(" ")
    } else {
        collected.join("\n")
    };
    (joined.trim().to_string(), i)
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
    fn parses_folded_and_literal_block_scalars() {
        let folded = "---\nname: pdf\ndescription: >\n  Extrae texto de PDFs\n  y los resume.\nother: 1\n---\n# body";
        let (n, d) = parse_frontmatter(folded);
        assert_eq!(n.as_deref(), Some("pdf"));
        assert_eq!(d.as_deref(), Some("Extrae texto de PDFs y los resume."));

        let literal = "---\ndescription: |\n  línea uno\n  línea dos\n---\n";
        let (_, d) = parse_frontmatter(literal);
        assert_eq!(d.as_deref(), Some("línea uno\nlínea dos"));
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
