# PRD — Nodify

## 1. Visión

Nodify es una **app de escritorio** que unifica la gestión de la configuración de
múltiples agentes de IA de código (Claude Code, Codex, OpenCode, ...) en la máquina del
desarrollador. En vez de editar a mano JSON/TOML dispersos por `~/.claude.json`,
`~/.codex/`, `~/.config/opencode/`, el usuario ve y gestiona desde un solo lugar sus
**MCPs**, **Skills** y **configuración** (modelos, proveedores, API keys, reglas), y
puede **compartir** artefactos entre agentes con un clic.

## 2. Problema

Cada agente guarda su config en formatos y ubicaciones distintas. Quien usa varios
agentes:
- No tiene una vista única de "qué MCP/skill tengo y en qué agente".
- Replica MCPs a mano copiando/pegando entre archivos con formatos incompatibles.
- Repite API keys en múltiples sitios, en texto plano, con riesgo de error.
- Edita config viva sin red de seguridad (un JSON roto deja al agente sin arrancar).

## 3. Usuario y ambición

- **Producto público** (open-source / vendible), pero con un **conjunto acotado de
  agentes** al inicio: Claude Code (prioridad 1), Codex, OpenCode.
- Usuario: desarrollador que usa a diario uno o varios agentes de IA de código.

## 4. Principios de diseño (decisiones fundacionales)

| # | Decisión | ADR |
|---|----------|-----|
| 1 | App de escritorio (Tauri); no web ni CLI | [0001](docs/adr/0001-desktop-app-tauri.md) |
| 2 | Los archivos nativos son la única fuente de verdad; Nodify es editor in-place | [0002](docs/adr/0002-editor-in-place-no-source-of-truth.md) |
| 3 | Modelo canónico interno + adaptadores por agente (fundados en docs oficiales) | [0003](docs/adr/0003-canonical-model-with-adapters.md) |
| 4 | Secretos: passthrough enmascarado, sin bóveda propia; vista de propagación | [0004](docs/adr/0004-secrets-passthrough-masked.md) |
| 5 | Escrituras quirúrgicas: preservar campos desconocidos, backup, atómico | [0005](docs/adr/0005-surgical-writes-preserve-unknown.md) |

Restricción transversal: **no romper la config del agente** y **no empeorar la
exposición de secretos** (sin logs/telemetría de valores, enmascarado por defecto).

## 5. Alcance del MVP

**Scope:** solo config **global / de usuario** de cada agente.

### MCPs
- Ver (matriz artefacto×agente).
- Instalar: **A) entrada manual** (comando/URL + env) y **C) import/compartir desde
  otro agente**.
- Eliminar.
- Compartir entre agentes (leer nativo → canónico → escribir nativo).
- Configurar env / secretos (enmascarados, con propagación).

### Skills
- Ver, habilitar/deshabilitar, compartir. **Corrección tras Fase 0:** los **tres** agentes
  soportan `SKILL.md` (Claude `~/.claude/skills/`, Codex `~/.agents/skills/` desde dic-2025,
  OpenCode `~/.config/opencode/skills/` + lee `.claude/skills/`). El frontmatter mínimo
  (`name`+`description`) es común → skills **altamente portables**. El mecanismo de
  habilitar/deshabilitar difiere por agente (ver [modelo canónico](docs/canonical-model.md)).

### Config (por-agente, vista dedicada)
- Modelo por defecto.
- Proveedores + API keys.
- Reglas / prompts de sistema **a nivel global** (`~/.claude/CLAUDE.md`, `AGENTS.md` global).

### UX
- **Matriz artefacto×agente** para MCPs/skills; **vista por-agente** para config (híbrido).
- Detección automática de agentes (rutas por SO + binario) con **override manual**.

### Sync multi-dispositivo (GitHub)
- Sincroniza un **bundle canónico portable** (no los archivos nativos crudos) contra un
  repo de GitHub, vía **git real** (historial/rollback gratis).
- **Push/Pull manual** con **diff previo y confirmación**; sin auto-sync en el MVP.
- **Secretos excluidos** del bundle (solo estructura); sync cifrado en fase 2.
- Depende del modelo canónico + motor de "aplicar", así que se secuencia tras el core.
- Ver [ADR-0006](docs/adr/0006-github-sync-canonical-bundle.md).

## 6. Fuera del alcance (explícito)

- **Versionar skills** (el ecosistema no lo soporta; rompería el modelo A).
- **Actualizar MCPs** / detección de versiones nuevas.
- **Catálogo/registry curado** de MCPs (fase 2 — se puede consumir el registry oficial).
- **Bóveda cifrada** de secretos (fase 2).
- **Modelo declarativo** con historial/drift/rollback (fase 2).
- **Scope de proyecto** (`.claude/` local, reglas de proyecto) (fase 2).
- Sincronización entre **personas/equipo** (fase futura, probablemente sobre git).

## 7. Requisitos no funcionales

- **Cross-platform** (Linux/macOS/Windows), binario ligero (Tauri).
- **Seguridad de escritura:** backup + validación + reemplazo atómico + preservación
  round-trip de campos/comentarios desconocidos.
- **Privacidad:** sin telemetría de valores de config/secretos.
- **Extensibilidad:** añadir un agente nuevo = un adaptador nuevo (sin tocar el core).

## 8. Métricas de éxito (MVP)

- Detecta correctamente los 3 agentes y muestra sus MCPs reales sin corromper ningún
  archivo (0 incidentes de config rota en pruebas).
- Compartir un MCP entre dos agentes con formatos distintos produce config válida en
  el destino.
- Tiempo para replicar un MCP entre agentes: de "editar 2 archivos a mano" a "1 clic".

## 9. Riesgos y mitigaciones

- **Formatos que divergen más de lo modelado** → adaptadores fundados en docs oficiales
  + fase de solo-lectura antes de escribir.
- **Pérdida de datos al escribir** → ADR-0005 (backup/atómico/round-trip); prioridad #1.
- **Skills no universales** → limitar a agentes donde existe; ser explícito en UI.
- **Fuga de secretos** → passthrough enmascarado, sin logs/telemetría.

## 10. Preguntas abiertas

- Modelo de distribución/monetización concreto (open-source + ¿pro de pago?).
- Framework de UI para la matriz (React + TS confirmado; falta librería de tabla).
- Codex: confirmar formato exacto de config TOML y si soporta MCPs (documentar adaptador).
