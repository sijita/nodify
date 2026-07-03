//! Escaneo de skills: cada skill es una carpeta con un `SKILL.md`. Común a los tres
//! agentes (Claude, Codex, OpenCode). Ver `docs/canonical-model.md`.

use std::fs;
use std::path::Path;

use nodify_core::{parse_frontmatter, CanonicalSkill};

/// Lista los skills bajo `dir` (subcarpetas con `SKILL.md`). Si `dir` no existe,
/// devuelve vacío. El `enabled` se asume `true` (los mecanismos de deshabilitado por
/// agente se modelan en una fase posterior).
pub fn scan_skills(dir: &Path) -> Vec<CanonicalSkill> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };

    let mut skills = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let skill_md = path.join("SKILL.md");
        let Ok(content) = fs::read_to_string(&skill_md) else {
            continue; // carpeta sin SKILL.md → no es un skill
        };
        let dir_name = path
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default();
        let (name, description) = parse_frontmatter(&content);
        skills.push(CanonicalSkill {
            name: name.unwrap_or(dir_name),
            description: description.unwrap_or_default(),
            body_path: skill_md.to_string_lossy().into_owned(),
            files: Vec::new(),
            enabled: true,
            frontmatter_extras: serde_json::Value::Null,
        });
    }
    skills.sort_by(|a, b| a.name.cmp(&b.name));
    skills
}

/// Copia recursivamente la carpeta del skill `name` de `from_dir/name` a `to_dir/name`
/// (compartir un skill entre agentes). Sobrescribe el destino si existe.
pub fn copy_skill(from_dir: &Path, to_dir: &Path, name: &str) -> std::io::Result<()> {
    let src = from_dir.join(name);
    let dst = to_dir.join(name);
    if dst.exists() {
        fs::remove_dir_all(&dst)?;
    }
    copy_dir_recursive(&src, &dst)
}

/// Elimina la carpeta del skill `name` bajo `dir`. Idempotente.
pub fn remove_skill(dir: &Path, name: &str) -> std::io::Result<()> {
    let target = dir.join(name);
    if target.exists() {
        fs::remove_dir_all(&target)?;
    }
    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if from.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else {
            fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static N: AtomicUsize = AtomicUsize::new(0);

    fn make_skill(root: &Path, dir: &str, skill_md: Option<&str>) {
        let d = root.join(dir);
        fs::create_dir_all(&d).unwrap();
        if let Some(c) = skill_md {
            fs::write(d.join("SKILL.md"), c).unwrap();
        }
    }

    fn tmp() -> std::path::PathBuf {
        let n = N.fetch_add(1, Ordering::Relaxed);
        let d = std::env::temp_dir().join(format!("nodify-skills-{}-{n}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn scans_skills_with_frontmatter_and_dir_fallback() {
        let root = tmp();
        make_skill(&root, "code-review", Some("---\nname: code-review\ndescription: \"Revisa\"\n---\nbody"));
        make_skill(&root, "no-frontmatter", Some("# solo body"));
        make_skill(&root, "not-a-skill", None); // sin SKILL.md → ignorado

        let skills = scan_skills(&root);
        assert_eq!(skills.len(), 2);
        // orden alfabético
        assert_eq!(skills[0].name, "code-review");
        assert_eq!(skills[0].description, "Revisa");
        // sin frontmatter → nombre = carpeta, description vacía
        assert_eq!(skills[1].name, "no-frontmatter");
        assert_eq!(skills[1].description, "");
    }

    #[test]
    fn missing_dir_is_empty() {
        assert!(scan_skills(Path::new("/no/existe/nodify")).is_empty());
    }

    #[test]
    fn copy_and_remove_skill_folder() {
        let from = tmp();
        let to = tmp();
        make_skill(&from, "code-review", Some("---\nname: code-review\n---\nbody"));
        // recurso extra dentro del skill
        fs::write(from.join("code-review").join("ref.md"), "x").unwrap();

        copy_skill(&from, &to, "code-review").unwrap();
        assert!(to.join("code-review").join("SKILL.md").exists());
        assert!(to.join("code-review").join("ref.md").exists());
        assert_eq!(scan_skills(&to).len(), 1);

        remove_skill(&to, "code-review").unwrap();
        assert!(!to.join("code-review").exists());
        remove_skill(&to, "code-review").unwrap(); // idempotente
    }
}
