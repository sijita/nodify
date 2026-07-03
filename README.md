# Nodify

Gestor de configuración entre agentes de IA de código (Claude Code, Codex, OpenCode):
ver, instalar, eliminar, compartir y sincronizar MCPs, Skills y config desde un solo lugar.

App de escritorio (Tauri + Rust core + React/TS). Ver [PRD.md](PRD.md), [PLAN.md](PLAN.md),
[CONVENTIONS.md](CONVENTIONS.md) y [docs/](docs/).

## Estructura

```
crates/            # core Rust (workspace, sin GUI, testeable headless)
  nodify-core/     # modelo canónico + trait Adapter
  nodify-adapters/ # parse nativo→canónico (claude/codex/opencode)
  nodify-io/        # detección de rutas de config
src-tauri/         # shell Tauri (comandos que exponen el core)
src/               # frontend React (screaming architecture por feature)
docs/              # adapters, canonical-model, ADRs, design-system
```

## Desarrollo

Requisitos: Rust (stable), Node 20+, y los [prerequisitos de Tauri](https://tauri.app/start/prerequisites/)
del SO (en Linux: `webkit2gtk-4.1`, etc.).

```bash
# Core Rust (no necesita GUI):
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo run -p nodify-adapters --example scan   # escanea tus agentes reales (solo lectura)

# Frontend:
npm install
npm run dev        # Vite en :1420
npm run build      # tsc + vite build
npm run lint       # biome

# App completa (Tauri):
npx tauri icon path/al/logo.png   # ⚠️ genera src-tauri/icons/ (requerido una vez)
npm run tauri dev
```

## Estado

- ✅ **Fase 0** — specs de adaptadores + modelo canónico ([docs/canonical-model.md](docs/canonical-model.md)).
- 🔵 **Fase 1 (solo lectura)** — core Rust hecho y testeado (13 tests, clippy limpio, validado
  contra configs reales); shell Tauri + matriz React scaffolded (pendiente de compilar en una
  máquina con GUI). Ver [PLAN.md](PLAN.md).

> Nota: `src-tauri` se excluye a propósito del workspace Cargo del core para que
> `cargo test --workspace` no arrastre dependencias de GUI.
