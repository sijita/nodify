# Nodify es una app de escritorio (Tauri), no web ni CLI

El caso de uso es inherentemente local: gestionar archivos de configuración de
agentes de IA que viven en la máquina del desarrollador (`~/.claude/`, `~/.codex/`,
config de OpenCode). Elegimos una app de escritorio para tener acceso nativo al
filesystem sin exigir infraestructura de nube ni un demonio local aparte, con UI web
moderna y binario ligero cross-platform (recomendación: Tauri).

Alternativas descartadas: CLI/TUI (menor pulido de UX para un producto público),
web pura con backend en la nube (no puede tocar el filesystem local y obligaría a
sincronizar la config a un servidor).
