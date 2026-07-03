# Plan de implementación — Nodify

Stack: **Tauri** (shell) · **Rust** (core: detección, parseo/escritura, adaptadores) ·
**React + TypeScript** (UI). Principio rector: **no escribir nada hasta que leer sea
100% confiable.**

---

## Fase 0 — Investigación de documentación (adapter specs)

Antes de escribir código de adaptadores, destilar de la **documentación oficial** de
cada agente su esquema de config. Producir un doc `docs/adapters/<agente>.md` por agente:

- **Claude Code:** ubicaciones (`~/.claude.json`, `~/.claude/`), esquema de `mcpServers`
  (transportes stdio/http/sse), skills (`skills/*/SKILL.md`), settings (modelo), memoria
  (`CLAUDE.md`).
- **Codex:** ubicación (`~/.codex/`), formato TOML, soporte de MCP (confirmar), modelo,
  proveedores.
- **OpenCode:** `opencode.json(c)`, bloque `mcp` (`local`/`remote`, `command` array,
  `env`, `headers`, `enabled`), plugins/skills, `model`, `AGENTS.md`.

Salida: **modelo canónico v1** (campos de MCP, Skill, Config) + tabla de compatibilidad
"qué campo soporta cada agente".

## Fase 1 — Solo lectura (riesgo cero)

**Core (✅ hecho y testeado):**
- ✅ Workspace Rust (`nodify-core`/`nodify-adapters`/`nodify-io`).
- ✅ Modelo canónico (`CanonicalMcp`, `SecretValue` inline/env-ref, `Transport`, `CanonicalSkill`).
- ✅ Adaptadores `parse_mcps` nativo→canónico para los 3 agentes, incl. normalizaciones de ADR-0007.
- ✅ Detección de rutas de config global (respeta `CODEX_HOME`/`XDG_CONFIG_HOME`/`OPENCODE_CONFIG`).
- ✅ Enmascarado de secretos. 13 tests verdes + clippy `-D warnings` + validado contra configs reales (`examples/scan.rs`).
- ✅ CI del core (`.github/workflows/core-ci.yml`).

**Pendiente (requiere tu máquina: webkit/display):**
- Shell Tauri exponiendo comandos (`scan`, `list_mcps`) al frontend.
- UI React: **matriz MCPs** (filas=MCP, columnas=agentes, celda=estado) + detalle con secretos enmascarados.
- Vista por-agente de config (solo lectura).
- Detección por presencia de binario + override manual de rutas en UI.
- **Hito M1:** "veo todos mis MCPs/config de los 3 agentes sin tocar nada".

## Fase 2 — Escritura segura de MCPs

**Core (✅ hecho y testeado, 25 tests verdes):**
- ✅ Adaptadores `canónico→nativo`: `upsert_mcp`/`remove_mcp` para los 3 agentes,
  preservando campos desconocidos (Claude: `preserve_order`; Codex: `toml_edit` con
  comentarios; OpenCode: splice de texto del bloque `mcp` preservando comentarios).
- ✅ IO segura ADR-0005: `safe_write` (backup + temporal + reemplazo atómico) en `nodify-io`.
- ✅ **Compartir** (`ops::share_mcp`): X→canónico→Y con traducción de formato, testeado
  Claude→Codex y Claude→OpenCode (round-trip válido).
- ✅ `enabled`, `env↔environment`, `command` string↔array, `Authorization`↔`bearer_token_env_var`.

**Cableado UI↔backend (✅ escrito; frontend validado, `src-tauri` compila en máquina con GUI):**
- ✅ Comandos Tauri `install_mcp` / `remove_mcp` / `share_mcp` (`src-tauri/src/mutate.rs`),
  capa fina sobre core + `safe_write`.
- ✅ Acciones en la matriz: clic en celda instalada → eliminar (con confirm); clic en hueco
  con el MCP en otro agente → compartir; botón **ADD MCP** (modal manual). Invalidación SWR.
- ✅ Mock del navegador **mutable** → el preview (`npm run dev`) es interactivo sin backend.
- **Hito M2 alcanzado** a nivel lógico (core testeado + UI cableada). Ejecutar la ventana
  nativa real requiere Tauri v2 (no Ubuntu 20.04).

## Fase 3 — Config por-agente

**Lectura (✅ hecho y testeado):**
- ✅ `parse_model` por adaptador (Claude `settings.json`, Codex/OpenCode su config) + `model_source_path`.
- ✅ `rules_path` por agente (`CLAUDE.md`/`AGENTS.md`) + detección de presencia.
- ✅ `scan_agents` devuelve `config { model, rulesPath, rulesPresent }`; banda **CONFIG** en la
  matriz (modelo con detección de divergencia + reglas presentes/ausentes).

**Escritura (✅ hecho):**
- ✅ `set_model` por adaptador (preservando settings) + comando `set_model` + edición inline
  en la banda CONFIG (clic → prompt).

**Pendiente:**
- Editar reglas (`CLAUDE.md`/`AGENTS.md`) — editor de texto.
- Proveedores + **API keys** con vista de **propagación** (P7). Ojo: keys de Codex/OpenCode
  viven en `auth.json` (intocable) o env vars → diseño de secretos aparte.
- **Hito M3:** "gestiono modelos, API keys y reglas globales desde Nodify".

## Fase 4 — Skills

**Lectura (✅ hecho y testeado):**
- ✅ `parse_frontmatter` (core) + `scan_skills` (io): descubre carpetas con `SKILL.md` en los 3
  agentes, con fallback de nombre a la carpeta. `skills_dir` por agente (Claude `~/.claude/skills`,
  Codex `~/.agents/skills`, OpenCode `~/.config/opencode/skills`).
- ✅ Comando `scan_agents` extendido con `skills`; banda **SKILLS** en la matriz (solo lectura).

**Escritura (✅ hecho):**
- ✅ `copy_skill`/`remove_skill` (FS recursivo) en `nodify-io` + comandos `share_skill`/`remove_skill`
  + acciones en la banda SKILLS (clic hueco → compartir carpeta; clic instalado → eliminar).

**Pendiente:**
- Habilitar/deshabilitar por el mecanismo nativo de cada agente (Codex `[[skills.config]]`,
  OpenCode `permission.skill`); ahora compartir/eliminar es a nivel de carpeta.
- **Hito M4** casi completo; falta Fase 5 sync.

## Fase 5 — Sync multi-dispositivo (GitHub)

**Core (✅ hecho y testeado):**
- ✅ `SyncBundle` + `strip_secrets` (Inline→EnvRef, nunca lleva valores) + `diff_bundles`
  (+/-/~ MCP y model) en `nodify-core`. Tests: no filtra secretos, diff correcto.
- ✅ Comandos Tauri `export_bundle` / `sync_status` (diff) / `sync_push` (write+git add/commit/push) /
  `sync_pull` (git pull --ff-only + aplicar). Git vía CLI.
- ✅ Panel **SYNC** en el dock: ver/exportar bundle, ruta de repo, diff previo, push, pull+aplicar.
  En navegador el bundle se exporta (demo); push/pull requieren app nativa + git.

**Hito M5** alcanzado a nivel lógico. Ejecución real requiere git + app nativa.

---

## Backlog fase 2+ (post-MVP)

- Catálogo/registry curado de MCPs (consumir registry oficial).
- Actualización de versiones de MCPs.
- Bóveda cifrada de secretos (keychain del SO).
- Modelo declarativo: estado deseado, detección de **drift**, historial/rollback.
- **Scope de proyecto** (`.claude/` local, reglas de proyecto).
- Sincronización entre personas/equipo (sobre git).
- Agentes adicionales (Cursor, Gemini CLI, Cline, ...): un adaptador cada uno.
