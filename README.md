<div align="center">

<img src="public/app-icon.png" alt="Nodify" width="112" height="112" />

# Nodify

**Un solo panel para gobernar la configuración de todos tus agentes de IA de código.**

[![Última release](https://img.shields.io/github/v/release/sijita/nodify?label=descargar&sort=semver)](https://github.com/sijita/nodify/releases/latest)
&nbsp;·&nbsp;
🌐 Read this in [English](README.en.md)

</div>

<p align="center">
  <img src="docs/screenshot.png" alt="Nodify — la matriz de configuración × agente" width="820" />
</p>

---

Nodify es una app de escritorio que detecta, lee y edita —de forma segura— la
configuración de **Claude Code**, **Codex**, **OpenCode**, **Kilo Code** y **Pi** desde un
único lugar: sus MCPs, sus Skills, su modelo por defecto, sus reglas, sus proveedores y sus
API keys. Y las **sincroniza entre tus dispositivos** vía un repositorio Git.

Construida con **Tauri v2** (ventana nativa), un **core en Rust** sin GUI (testeable
headless) y un **frontend React + TypeScript** con un sistema de diseño monocromo
retro/hacker, bilingüe (ES/EN) y con tema claro/oscuro.

---

## Tabla de contenidos

- [Descargar](#descargar)
- [El problema](#el-problema)
- [Características clave](#características-clave)
- [Interfaz](#interfaz)
- [Agentes soportados y compatibilidad](#agentes-soportados-y-compatibilidad)
- [Garantías de seguridad](#garantías-de-seguridad)
- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Desarrollo](#desarrollo)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Sincronización multi-dispositivo](#sincronización-multi-dispositivo)
- [Preguntas frecuentes](#preguntas-frecuentes)
- [Roadmap](#roadmap)
- [Convenciones y contribución](#convenciones-y-contribución)
- [Licencia](#licencia)

---

## Descargar

Descarga el instalador de tu sistema desde la **[última release](https://github.com/sijita/nodify/releases/latest)**:

| Sistema | Archivo |
| --- | --- |
| **macOS** (Apple Silicon) | `Nodify_*_aarch64.dmg` |
| **macOS** (Intel) | `Nodify_*_x64.dmg` |
| **Windows** | `Nodify_*_x64-setup.exe` o `Nodify_*_x64_en-US.msi` |
| **Linux** | `Nodify_*_amd64.AppImage`, `*_amd64.deb` o `*.x86_64.rpm` |

> **Primera apertura (app sin firmar):** los instaladores aún no van firmados/notarizados.
> - **macOS:** si aparece *«Nodify está dañado»*, quita la cuarentena con
>   `xattr -dr com.apple.quarantine /Applications/Nodify.app` y ábrelo. (En Apple Silicon,
>   *clic derecho → Abrir* no basta para ese mensaje concreto.)
> - **Windows:** SmartScreen → *Más información → Ejecutar de todas formas*.

¿Prefieres compilarlo tú mismo? Ver [Instalación](#instalación).

---

## El problema

Cada agente de IA de código guarda su configuración en un formato distinto, en una
ruta distinta:

| Agente      | Ubicación                        | Formato       |
| ----------- | -------------------------------- | ------------- |
| Claude Code | `~/.claude.json`, `~/.claude/`   | JSON          |
| Codex       | `~/.codex/config.toml`           | TOML          |
| OpenCode    | `~/.config/opencode/opencode.json(c)` | JSON / JSONC |
| Kilo Code   | `~/.config/kilo/kilo.jsonc`      | JSONC         |
| Pi          | `~/.pi/agent/mcp.json`, `~/.pi/agent/settings.json` | JSON |

Si usas más de uno, mantener el mismo MCP, la misma Skill o el mismo modelo en todos
es un trabajo manual, propenso a errores y difícil de replicar entre máquinas. Nodify
resuelve exactamente eso: **lee cada formato nativo, lo traduce a un modelo común, y
escribe de vuelta preservando lo que no entiende.**

---

## Características clave

### 🔌 MCPs (Model Context Protocol servers)
- **Matriz de estado**: filas = MCP, columnas = agentes, celda = instalado / ausente / divergente.
- **Modal de detalle**: clic en cualquier celda abre un panel con la config completa del MCP (transporte,
  endpoint/comando, estado, env vars referenciadas, agentes en los que está presente).
- **Instalar** un MCP en un agente (modal: stdio o HTTP, args, env vars, headers con editor de pares clave/valor).
- **Eliminar** un MCP (con confirmación).
- **Compartir**: copiar un MCP de un agente a otro **traduciendo el formato** automáticamente
  (p. ej. `command` string ↔ array, `env` ↔ `environment`, `Authorization` header ↔ `bearer_token_env_var`).

### 🧩 Skills
- Descubrimiento de Skills (`SKILL.md` con frontmatter) en los directorios de cada agente.
- **Modal de detalle**: clic en la celda muestra la descripción extraída del frontmatter y el contenido
  completo del `SKILL.md`.
- **Compartir** una Skill (copia recursiva de la carpeta) y **eliminar**.
- **Visibilidad de agentes**: oculta o muestra columnas (agentes) con un toggle en la barra superior.
  Solo afecta la vista — Nodify sigue leyendo y escribiendo la config del agente oculto con normalidad.

### ⚙️ Config por agente
- **Modelo por defecto**: leer y editar, con detección de divergencia entre agentes.
- **Reglas** (`CLAUDE.md` / `AGENTS.md`): editor integrado en el panel de detalle.
- **Proveedores**: leer id / nombre / `base_url` y el **nombre de la env var** de la key
  (nunca el valor).

### 🔑 API keys / Secretos
- Vista **SECRETS** que agrega todos los nombres de env var referenciados (por MCPs y proveedores)
  y muestra qué agentes usan cada uno.
- **Set-y-propagar**: escribe el valor donde el agente lo soporta (Claude, en `settings.json → env`).
  Codex/OpenCode leen del shell o `auth.json`, que Nodify **nunca toca**.
- Nodify **no almacena** valores de secretos (ver [ADR-0004](docs/adr/0004-secrets-passthrough-masked.md)).

### ⚖️ Alineación (ALIGN)
- Elige un agente como **fuente de verdad** y **propaga** sus MCPs, skills y modelo al resto
  con un clic (por agente o "alinear todos").
- Muestra un **plan de cambios** por destino (`+`/`~` mcps, `+` skills, `~` modelo) antes de aplicar,
  con una barra de estado global de sincronía.
- Es **aditivo**: nunca elimina lo que un destino ya tenga de más. Resuelve, en bloque, las
  divergencias que la matriz solo expone.

### 🔄 Sincronización multi-dispositivo
- Exporta un **bundle canónico** (con los secretos convertidos a referencias de env var, nunca valores).
- `push` / `pull` sobre un repositorio Git para replicar tu configuración entre máquinas.
- Vista de **diff** previo (`+` añadido, `-` eliminado, `~` cambiado) antes de aplicar.

---

## Interfaz

Sistema de diseño monocromo "tinta sobre papel", retro/hacker pero moderno:

- **Tema claro / oscuro** con toggle (☾/☀), persistido.
- **Bilingüe ES/EN** con toggle en la barra superior: i18n propio y ligero (Zustand + diccionarios
  tipados), detecta el idioma del navegador y guarda tu preferencia.
- **Logos oficiales de los agentes** (vía [simple-icons](https://simpleicons.org),
  [svgl.app](https://svgl.app) y [LobeHub](https://lobehub.com/icons), monocromos con
  `currentColor`) para Claude Code, Codex, OpenCode, Kilo Code y Pi.
- **Columnas reordenables y ocultables**: elige qué agentes ver y en qué orden (flechas ▲▼ en
  el menú de agentes). Con muchos agentes la matriz hace **scroll horizontal** manteniendo fija
  la primera columna. Es solo preferencia de vista: Nodify sigue leyendo/escribiendo igual.
- **Animaciones** sutiles y snappy con [`motion`](https://motion.dev) (Framer Motion): dock deslizante,
  transiciones de sección, celdas de la matriz que "hacen pop" al mutar, cascada del panel ALIGN,
  botón SCAN. Respeta `prefers-reduced-motion`.
- **Diálogos propios estilo shadcn** (confirm/prompt) en vez de los nativos del navegador.
- **Preview en navegador**: fuera de la app nativa hay un mock mutable, así que toda la UI y sus
  acciones son navegables sin backend (`npm run dev`).

---

## Agentes soportados y compatibilidad

No todos los agentes soportan los mismos campos. Nodify traduce lo que se puede y
preserva lo que no entiende. Resumen (detalle en [docs/canonical-model.md](docs/canonical-model.md)):

| Capacidad                 | Claude Code | Codex | OpenCode | Kilo Code | Pi |
| ------------------------- | :---------: | :---: | :------: | :-------: | :-: |
| MCPs stdio                | ✓           | ✓     | ✓        | ✓         | ✓  |
| MCPs HTTP/SSE             | ✓           | ✓\*   | ✓        | ✓         | ✓  |
| Modelo por defecto        | ✓           | ✓     | ✓        | ✓         | ✓  |
| Reglas (memoria)          | ✓ `CLAUDE.md` | ✓ `AGENTS.md` | ✓ `AGENTS.md` | ✓ `AGENTS.md` | ✓ `AGENTS.md` |
| Proveedores (lectura)     | —           | ✓     | ✓        | —         | —  |
| Escribir valor de API key | ✓ `settings.env` | shell/`auth.json` | shell/`auth.json` | shell | shell |
| Skills                    | ✓           | ✓     | ✓        | ✓         | ✓  |

\* Sujeto a la versión/soporte del agente; ver [docs/adapters/](docs/adapters/).

---

## Garantías de seguridad

Nodify escribe en archivos que tú no creaste. Estas son las reglas que lo hacen seguro,
codificadas como ADRs:

- **Editor in-place, sin fuente de verdad propia** ([ADR-0002](docs/adr/0002-editor-in-place-no-source-of-truth.md)):
  los archivos nativos de cada agente son la única fuente de verdad. Nodify no tiene una
  base de datos paralela que pueda desincronizarse.
- **Escrituras quirúrgicas** ([ADR-0005](docs/adr/0005-surgical-writes-preserve-unknown.md)):
  toda escritura **preserva campos desconocidos, orden y comentarios**, hace **backup** y
  usa **reemplazo atómico** (escribe a temporal + `rename`). Claude usa `serde_json` con
  `preserve_order`; Codex usa `toml_edit` (conserva comentarios); OpenCode hace *splice*
  de texto sobre el bloque `mcp` para no perder los comentarios JSONC.
- **Secretos en passthrough, enmascarados** ([ADR-0004](docs/adr/0004-secrets-passthrough-masked.md)):
  los valores se envían al webview **ya enmascarados**; Nodify no los guarda; el bundle de
  sync los reduce a referencias de env var. `auth.json` nunca se lee ni se escribe.
- **Core sin GUI** para poder testear la lógica de dominio de forma exhaustiva y headless.

---

## Arquitectura

### Modelo canónico + adaptadores

El corazón de Nodify ([ADR-0003](docs/adr/0003-canonical-model-with-adapters.md)) es un
**modelo canónico** neutral (`CanonicalMcp`, `CanonicalSkill`, `SecretValue`, `Transport`…)
y un trait `Adapter` que cada agente implementa para traducir **nativo ↔ canónico**:

```
                     ┌──────────────────────────────┐
   archivo nativo    │        trait Adapter         │    modelo canónico
  (JSON/TOML/JSONC)  │  parse_mcps / upsert_mcp     │   (neutral, común)
        ───────────▶ │  parse_model / set_model     │ ───────────▶  UI / Sync
        ◀─────────── │  parse_providers / set_env   │  ◀───────────
   (escritura        │  remove_mcp                  │
    quirúrgica)      └──────────────────────────────┘
             claude.rs · codex.rs · opencode.rs · kilocode.rs · piagent.rs
```

Añadir un agente nuevo = escribir **un** adaptador; nada más cambia.

### Crates de Rust (workspace, sin GUI)

```
crates/
  nodify-core/      # dominio puro: modelo canónico + trait Adapter + sync bundle
  nodify-adapters/  # una implementación de Adapter por agente + ops (share/find)
  nodify-io/        # detección de rutas, escritura segura (backup+atómico), scan de skills
```

> `src-tauri/` se **excluye a propósito** del workspace Cargo. Depende de webkit/GUI, y
> excluirlo permite que `cargo test --workspace` corra el core completo en CI/headless sin
> arrastrar dependencias gráficas. La shell consume los crates por *path*.

### Flujo completo

```
  React (features/)  ──invoke──▶  Comandos Tauri (src-tauri/src/mutate.rs)
        ▲                              │
        │ SWR                          ▼
        │                        nodify-adapters ──▶ nodify-core (canónico)
        └──── AgentScan JSON ◀──  nodify-io (detecta rutas, safe_write)
```

- **Frontend**: React 19 + Vite 6 + Tailwind v4 + componentes shadcn-style (CVA) + SWR
  (fetching/caché) + Zustand (navegación e idioma) + `motion` (animaciones) + `simple-icons`
  (logos) + Biome (lint/format).
- **Fuera de Tauri** (preview en navegador) hay un **mock mutable**: todas las acciones
  (instalar, eliminar, compartir, modelo, skills, reglas, alinear, export) funcionan sobre
  datos demo, para poder ver la UI sin backend.

### Decisiones de arquitectura (ADRs)

| ADR | Decisión |
| --- | --- |
| [0001](docs/adr/0001-desktop-app-tauri.md) | App de escritorio con Tauri |
| [0002](docs/adr/0002-editor-in-place-no-source-of-truth.md) | Editor in-place, sin fuente de verdad propia |
| [0003](docs/adr/0003-canonical-model-with-adapters.md) | Modelo canónico + adaptadores |
| [0004](docs/adr/0004-secrets-passthrough-masked.md) | Secretos passthrough enmascarados |
| [0005](docs/adr/0005-surgical-writes-preserve-unknown.md) | Escrituras quirúrgicas (preservar lo desconocido) |
| [0006](docs/adr/0006-github-sync-canonical-bundle.md) | Sync por bundle canónico en GitHub |
| [0007](docs/adr/0007-canonical-mcp-translation-rules.md) | Reglas de traducción de MCP entre agentes |

---

## Instalación

### Requisitos

- **Rust** (stable) — [rustup.rs](https://rustup.rs)
- **Node 20+** y npm
- **Prerequisitos de Tauri** del SO — ver [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/).
  En Linux se necesita **`webkit2gtk-4.1`** (Tauri v2). ⚠️ **Ubuntu 20.04 solo trae `webkit2gtk-4.0`**,
  por lo que la ventana nativa no compila ahí; usa Ubuntu 22.04+, macOS o Windows para la app nativa.
  (El core Rust y el preview del frontend sí corren en cualquier sitio.)

### Compilar la app nativa

```bash
git clone https://github.com/sijita/nodify.git
cd nodify
npm install

# Genera los iconos una única vez (requerido por Tauri):
npx tauri icon nodify_logo.png      # crea src-tauri/icons/

npm run tauri dev     # desarrollo (hot-reload)
npm run tauri build   # binario/instalador de producción
```

> La primera vez que corras la app nativa contra tus archivos reales, sigue la checklist de
> [SMOKE-TEST.md](SMOKE-TEST.md): hace backup previo y verifica cada escritura por terminal.

---

## Desarrollo

```bash
# ── Core Rust (no requiere GUI) ──
cargo test --workspace                              # ~44 tests de dominio
cargo clippy --workspace --all-targets -- -D warnings
cargo run -p nodify-adapters --example scan         # escanea TUS agentes reales (solo lectura)

# ── Frontend ──
npm install
npm run dev        # Vite en http://localhost:1420 (preview con datos DEMO mutables)
npm run build      # tsc + vite build
npm run lint       # biome check
npm run format     # biome format --write

# ── App completa (Tauri) ──
npm run tauri dev
```

> **Tip:** `cargo run -p nodify-adapters --example scan` es la forma más rápida de comprobar,
> sin riesgo, que Nodify detecta y parsea correctamente la config real de tus agentes (solo lee).

---

## Estructura del proyecto

```
nodify/
├── crates/                     # core Rust (workspace headless, testeable)
│   ├── nodify-core/            #   modelo canónico, trait Adapter, sync bundle
│   ├── nodify-adapters/        #   claude.rs · codex.rs · opencode.rs · kilocode.rs · piagent.rs · ops.rs
│   └── nodify-io/              #   detect.rs (rutas) · write.rs (safe_write) · skills.rs
├── src-tauri/                  # shell Tauri: comandos que exponen el core (mutate.rs, scan.rs)
├── src/                        # frontend React (screaming architecture por feature)
│   ├── app/                    #   layout, dock-nav, grid-background, top-bar, logo, theme
│   ├── assets/                 #   logos de la marca (claro/oscuro)
│   ├── components/             #   ui/ (button, card, input, badge, dialog…) · agent-glyph
│   ├── features/               #   mcps/ · agents/ (ALIGN + drawer) · secrets/ · sync/
│   ├── i18n/                   #   store de idioma + diccionarios en.ts / es.ts
│   └── lib/                    #   tauri.ts (wrappers) · mock.ts · types.ts · agents.ts
├── public/                     # favicon / icono de la app
├── docs/                       # canonical-model, adapters/, adr/, design-system
├── CONTEXT.md · PRD.md · PLAN.md · CONVENTIONS.md · SMOKE-TEST.md
└── Cargo.toml · package.json · vite.config.ts · biome.json
```

---

## Sincronización multi-dispositivo

Nodify puede replicar tu configuración entre máquinas a través de un repo Git
([ADR-0006](docs/adr/0006-github-sync-canonical-bundle.md)):

1. **Export**: genera un *bundle canónico* con MCPs, modelos y skills de todos los agentes.
   Los secretos se reducen a **referencias de env var** — nunca se escriben valores en el bundle.
2. **Push**: escribe el bundle al repo y hace `git add/commit/push`.
3. **Pull**: `git pull --ff-only` y **aplica** el bundle a los agentes locales (escritura quirúrgica).
4. **Diff**: antes de aplicar, ves qué cambia (`+` / `-` / `~`).

Puedes indicar el repo como una **URL** (`https://github.com/tu/repo.git`, `git@…`) —Nodify lo
clona al vuelo en una caché local (`~/.nodify/sync/`) y la mantiene al día— o como una **ruta
local** ya clonada. La autenticación (push / repos privados) la aporta el `git` de tu sistema;
Nodify no pide ni guarda tokens.

En el preview de navegador el bundle se puede exportar (demo); `push`/`pull` requieren la app
nativa + `git` instalado.

---

## Preguntas frecuentes

**¿Nodify puede corromper mis configs?**
Toda escritura hace backup previo, es atómica (temporal + `rename`) y preserva campos y
comentarios que no reconoce. La lógica está cubierta por tests que incluyen round-trips.

**¿Guarda mis API keys?**
No. Los valores viajan enmascarados a la UI y solo se escriben en el archivo del agente que
los soporta (Claude `settings.env`). No hay almacén ni bóveda; `auth.json` nunca se toca.

**¿Por qué no corre la ventana nativa en mi Ubuntu 20.04?**
Tauri v2 requiere `webkit2gtk-4.1` y Ubuntu 20.04 solo provee `4.0`. Usa 22.04+, macOS o
Windows. El core y el preview del frontend funcionan igual en cualquier SO.

**¿Cómo agrego soporte para otro agente (Cursor, Gemini CLI…)?**
Implementa el trait `Adapter` en un archivo nuevo dentro de `nodify-adapters` y regístralo en
`all()`. El resto del sistema (UI, sync, escritura segura) lo consume sin cambios.

**¿Necesito todos los agentes instalados?**
No. Nodify detecta los que tengas presentes y muestra el resto como ausentes. Puedes ocultar
los que no uses desde el menú de agentes.

---

## Roadmap

Completado (MVP, fases 0–5): lectura + escritura de MCPs, Skills, modelo, reglas, proveedores,
API keys, alineación entre agentes y sync por Git; más i18n (ES/EN), tema claro/oscuro y branding.
Ver [PLAN.md](PLAN.md).

Post-MVP (backlog):

- Catálogo/registry curado de MCPs.
- Enable/disable de Skills por el mecanismo nativo de cada agente.
- Bóveda cifrada de secretos (keychain del SO).
- Estado declarativo + detección de *drift* + historial/rollback.
- Scope de proyecto (`.claude/` local, reglas por proyecto).
- Más agentes: Cursor, Gemini CLI, Cline…

---

## Convenciones y contribución

- **Arquitectura Screaming** (carpetas por feature), **TDD** en el core, **Conventional Commits**.
- Antes de un PR: `cargo test --workspace`, `cargo clippy … -D warnings`, `npm run lint`, `npm run build`.
- Detalles completos en [CONVENTIONS.md](CONVENTIONS.md).

---

## Licencia

MIT.
