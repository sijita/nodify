# Convenciones de código — Nodify

Stack: Tauri · Rust (core) · React + TypeScript (UI) · Tailwind + shadcn/ui.

## Estructura del repositorio

**Cargo workspace multi-crate** — separa dominio (testeable sin Tauri) de IO y shell:

```
nodify/
├── crates/
│   ├── nodify-core/        # modelo canónico + tipos de dominio (sin Tauri, sin IO)
│   ├── nodify-adapters/    # trait Adapter + claude/, codex/, opencode/ (fundados en docs)
│   └── nodify-io/          # detección, parseo round-trip, motor de escritura (backup/atómico)
├── src-tauri/              # shell fino: expone comandos Tauri hacia el frontend
├── src/                    # React + TypeScript (frontend)
├── docs/
│   ├── adr/
│   └── adapters/           # spec por agente (Fase 0)
└── ...
```

Principio: **añadir un agente = añadir un módulo en `nodify-adapters`** implementando el
trait `Adapter`. El core no cambia.

## Frontend — Screaming Architecture

La estructura de nivel superior **grita el dominio, no el framework**: se separa por
**feature/página**, no por capa técnica.

```
src/
├── features/
│   ├── mcps/        # matriz MCPs, detalle, compartir, env
│   ├── skills/      # matriz skills, habilitar/deshabilitar
│   ├── config/      # modelos, proveedores, API keys, reglas globales
│   └── sync/        # push/pull GitHub, diff, aplicar
│       └── (cada feature: componentes + hooks + tipos colocados)
├── components/ui/   # primitivas shadcn (copiadas)
├── lib/             # utilidades, cliente de comandos Tauri
└── app/             # shell, routing, layout, tema
```

- **Data fetching:** **SWR** para el estado derivado del core (listar MCPs, detección…):
  caching + revalidación + `mutate()` para invalidar tras una escritura.
- **Estado local:** **Zustand** solo para UI puramente local (tema, paneles, selección).
- Sin Redux.

## Naming

- **Rust (idiomático, lo impone `rustfmt`/`clippy`):** `snake_case` archivos/módulos/funciones,
  `PascalCase` tipos/traits, `SCREAMING_SNAKE_CASE` constantes.
- **TypeScript/React:** **archivos en kebab-case** (`mcp-matrix.tsx`, `use-agents.ts`) para
  evitar bugs de case-sensitivity entre SOs (Nodify es cross-platform). Dentro: componentes
  `PascalCase`, funciones/vars `camelCase`, hooks con prefijo `use`, tipos/interfaces `PascalCase`.

## Metodología y tests

- **TDD en el core (Rust)**, pragmático en el frontend.
- **Golden/snapshot tests con configs nativas reales:** `nativo → canónico → nativo` debe
  **preservar byte a byte los campos desconocidos** (valida ADR-0005).
- **Property tests** en el motor de escritura: nunca perder una clave no modelada.
- Frontend: tests de componentes con lógica (matriz, diffs); sin TDD dogmático en UI visual.

## Tooling y prácticas

- **Errores Rust:** `thiserror` en crates de librería (errores tipados); `anyhow` solo en
  el borde `src-tauri`. Sin `unwrap()` en producción.
- **Lint/format Rust:** `rustfmt` + `clippy` con warnings-as-errors en CI.
- **Lint/format frontend:** **Biome** (un binario: lint + format). Sin ESLint/Prettier.
- **Commits:** **Conventional Commits** (`feat:`, `fix:`, `refactor:`…) → changelog automático.
- **Pre-commit hooks:** fmt + lint + tests rápidos antes de commit.
- **CI:** GitHub Actions — matriz Linux/macOS/Windows + build Tauri + tests + lint.
