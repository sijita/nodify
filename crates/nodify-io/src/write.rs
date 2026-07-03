//! Escritura segura de archivos de config (ADR-0005): backup del original, escritura
//! a un temporal en el mismo directorio y **reemplazo atómico** vía `rename`.
//!
//! La *validación* del contenido (que parsee) es responsabilidad del llamante, que
//! ya generó el texto con un adaptador. Aquí solo garantizamos que nunca se deja el
//! archivo a medio escribir ni se pierde el original.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Ruta del backup que se genera junto al archivo (`<nombre>.nodify.bak`).
pub fn backup_path(path: &Path) -> PathBuf {
    let name = path
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    path.with_file_name(format!("{name}.nodify.bak"))
}

/// Escribe `contents` en `path` de forma segura:
/// 1. si el archivo existe, copia a `<nombre>.nodify.bak`;
/// 2. escribe a `<nombre>.nodify.tmp`;
/// 3. `rename` atómico del temporal sobre el destino.
pub fn safe_write(path: &Path, contents: &str) -> io::Result<()> {
    let name = path
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();

    if path.exists() {
        fs::copy(path, backup_path(path))?;
    }

    let tmp = path.with_file_name(format!("{name}.nodify.tmp"));
    fs::write(&tmp, contents)?;
    fs::rename(&tmp, path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static N: AtomicUsize = AtomicUsize::new(0);

    fn tmp_dir() -> PathBuf {
        let n = N.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!("nodify-test-{}-{n}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn replaces_content_and_backs_up_original() {
        let dir = tmp_dir();
        let file = dir.join("config.json");
        fs::write(&file, "OLD").unwrap();

        safe_write(&file, "NEW").unwrap();

        assert_eq!(fs::read_to_string(&file).unwrap(), "NEW");
        assert_eq!(fs::read_to_string(backup_path(&file)).unwrap(), "OLD");
        // no deja temporales
        assert!(!dir.join("config.json.nodify.tmp").exists());
    }

    #[test]
    fn creates_file_without_backup_when_absent() {
        let dir = tmp_dir();
        let file = dir.join("new.toml");

        safe_write(&file, "model = \"x\"").unwrap();

        assert_eq!(fs::read_to_string(&file).unwrap(), "model = \"x\"");
        assert!(!backup_path(&file).exists()); // no había original que respaldar
    }
}
