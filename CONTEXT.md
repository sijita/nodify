# Nodify — Contexto y Glosario

Nodify es una aplicación de escritorio para gestionar y unificar la configuración
de múltiples agentes de IA de código (Claude Code, Codex, OpenCode, ...) en la
máquina del desarrollador: MCPs, Skills y configuración general (modelos,
proveedores, API keys, prompts, reglas).

## Glosario

- **Agente (Agent):** Una herramienta de IA de código instalada localmente cuya
  configuración vive en archivos del sistema (p.ej. Claude Code, Codex, OpenCode).
  Cada agente tiene su propio formato y ubicación de config.

- **MCP:** Servidor Model Context Protocol que un agente puede tener configurado.
  Nodify permite ver, instalar, eliminar, actualizar y compartir MCPs entre agentes,
  incluyendo sus variables de entorno.

- **Skill:** Capacidad/instrucción reutilizable que un agente puede tener disponible.
  Nodify permite ver, habilitar/deshabilitar, compartir y versionar skills.

- **Compartir (Share):** Tomar un artefacto (MCP o Skill) configurado en un agente y
  replicarlo/sincronizarlo hacia otro u otros agentes.

## Alcance inicial

- **Producto público** (open-source / vendible), pero con un conjunto **acotado de
  agentes soportados** al inicio.
- **Agentes del MVP:** Claude Code (prioridad 1), Codex, OpenCode. Cubren tres
  formatos de config distintos (JSON, TOML, JSON) a propósito, para forzar una capa
  de abstracción sana desde el inicio.
- **Scope:** el MVP opera solo sobre config **global / de usuario** de cada agente
  (`~/.claude.json`, `~/.codex/config.toml`, `~/.config/opencode/opencode.json`).
  El scope de **proyecto** (`.claude/`, `opencode.jsonc` local) se deja para fase
  posterior.

## Términos por afinar

- **Scope:** nivel al que aplica una config — *usuario/global* vs *proyecto*.
- **Adaptador (Adapter):** módulo por agente que traduce nativo↔canónico, fundado en
  la documentación oficial del agente.
- **Matriz (artefacto×agente):** vista principal para MCPs/skills — filas = artefactos,
  columnas = agentes, celda = estado (instalado / ausente / difiere). Convierte
  "compartir" en un gesto sobre la celda.
- **Detección:** proceso por el que Nodify localiza agentes instalados y sus archivos
  de config (rutas por defecto por SO + presencia de binario + override manual).
- **Drift (fase 2):** divergencia entre el estado deseado en Nodify y el estado real
  en disco. No existe en el MVP (ver ADR-0002).
- **Bundle canónico:** representación normalizada y portable de lo que Nodify gestiona
  (MCPs/skills/config), sin secretos ni estado de máquina. Es la unidad de sincronización.
- **Sync:** push/pull manual del bundle canónico contra un repo de GitHub (git real),
  con diff previo y confirmación, para backup + historial + multi-dispositivo (ver ADR-0006).
- **Aplicar (Apply):** escribir un bundle canónico a los archivos nativos del dispositivo
  actual vía adaptadores.

## Features del MVP (alcance acordado)

**MCPs:** ver, instalar, eliminar, compartir entre agentes, configurar env/secretos.
**Skills:** ver, habilitar/deshabilitar, compartir. Los **tres** agentes soportan `SKILL.md`
  (corrección Fase 0: Codex también, desde dic-2025). Portables vía carpeta + frontmatter
  `name`+`description`; el toggle difiere por agente. Ver [modelo canónico](docs/canonical-model.md).
**Config:** modelos por defecto, proveedores, API keys, prompts de sistema, reglas.

**Fuera del MVP (descartado explícitamente):**
- Versionar skills (el ecosistema no tiene versionado de skills; rompería el modelo A).
- Actualizar MCPs / detección de versiones nuevas.
- Bóveda cifrada de secretos (fase 2).
- Modelo declarativo con historial/drift (fase 2).
- Scope de proyecto (fase 2).
