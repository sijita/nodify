# Adaptador — Claude Code

> CLI oficial de Anthropic. Config en `~/.claude/` + `~/.claude.json`.
> Fecha de verificación: 2026-07-02 (docs oficiales + `~/.claude.json`/`~/.claude/` reales cruzados).

## Ubicaciones de config (scope global/usuario)

| SO | Usuario-global | Proyecto | Override |
|----|----------------|----------|----------|
| Linux / macOS | `~/.claude/` | `.claude/` (raíz del repo) | `CLAUDE_CONFIG_DIR` |
| Windows | `%USERPROFILE%\.claude\` | `.claude/` | `CLAUDE_CONFIG_DIR` |

- **`CLAUDE_CONFIG_DIR`**: si está definida, Claude Code lee la config desde ahí en vez de `~/.claude/`. Nodify no debe asumir `~/.claude/` de forma rígida.
- Jerarquía de scope (mayor→menor): **Managed** (IT) > **Local** > **Project** > **User** > default.
- Archivos clave a nivel usuario:
  - `~/.claude/settings.json` — settings (incluye `model`).
  - `~/.claude.json` — **estado de máquina** + `mcpServers` de usuario (⚠️ ver preservación).
  - `~/.claude/skills/<name>/SKILL.md` — skills de usuario.
  - `~/.claude/CLAUDE.md` — reglas/memoria global.

## Formato de archivo

- **`settings.json`**: JSON (se recomienda JSON estricto; schema en `https://json.schemastore.org/claude-code-settings.json`).
- **`~/.claude.json`**: JSON estricto, **sin comentarios**. Contiene tokens OAuth, caches y estado de máquina → **preservar íntegro** al editar `mcpServers`.

## MCPs

Tres ubicaciones según scope:

| Scope | Ubicación | Uso |
|-------|-----------|-----|
| **user** | `~/.claude.json` → clave `mcpServers` | Tus herramientas globales. **Scope de Nodify.** |
| **project** | `.mcp.json` en la raíz del repo | Compartidas con el equipo. |
| **local** | `~/.claude.json` → `projects[<path>].mcpServers` | Personales por proyecto. |

Cada servidor es una clave (nombre) → objeto de config. Tres transportes:

### stdio (proceso local)
```json
{
  "codegraph": {
    "type": "stdio",
    "command": "codegraph",
    "args": ["serve", "--mcp"],
    "env": { "HEADLESS": "true" }
  }
}
```
Campos: `type` (`"stdio"`), `command` (req., string), `args` (opcional, array), `env` (opcional, objeto).

### http
```json
{
  "claude-docs": {
    "type": "http",
    "url": "https://code.claude.com/docs/mcp",
    "headers": { "Authorization": "Bearer ••••" }
  }
}
```
Campos: `type` (`"http"`), `url` (req.), `headers` (opcional).

### sse
```json
{
  "sentry-mcp": {
    "type": "sse",
    "url": "https://mcp.sentry.dev/mcp",
    "headers": { "Authorization": "Bearer ••••" }
  }
}
```
Campos: `type` (`"sse"`), `url` (req.), `headers` (opcional).

> **No hay flag `enabled` nativo por servidor** (a diferencia de OpenCode/Codex): deshabilitar = quitar la entrada. Nodify debe emular "deshabilitar" moviendo la entrada a un almacén propio o borrándola (decisión de diseño pendiente).

### CLI de gestión
```bash
claude mcp add [--scope user|project|local] [--transport stdio|http|sse] <name> [<url>|-- <command>]
claude mcp list
claude mcp get <name>
claude mcp remove <name> [--scope ...]
```
Timeout de conexión: default 30 s, override `MCP_TIMEOUT` (ms).

## Skills

- **Ubicación:** `~/.claude/skills/<name>/SKILL.md` (usuario) o `.claude/skills/<name>/SKILL.md` (proyecto).
- **Formato:** carpeta con `SKILL.md` + frontmatter YAML. Campos confirmados: **`name`**, **`description`**. Otros observados/posibles (⚠️ variables según versión): `allowed-tools`, `disable-model-invocation`. Fuentes secundarias mencionan `invocation`/`tools`/`tags` — **sin confirmar en doc oficial**.
- **Habilitar/deshabilitar:** presencia del `SKILL.md` = habilitado; borrar carpeta/archivo = deshabilitado. **No hay flag nativo** de enabled/disabled.
- **Plugins/marketplace:** skills remotas se descargan a `~/.claude/plugins/` (gestionado). Marketplace vía comandos in-session.

## Config general

### Modelo por defecto
- `model` en `settings.json` (`~/.claude/settings.json` para usuario).
- Precedencia: `/model` in-session > env `ANTHROPIC_MODEL` > `model` en settings (local>project>user) > default de cuenta.

### API key / proveedor
- Env vars: `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_AWS_API_KEY`, `ANTHROPIC_FOUNDRY_API_KEY`.
- `ANTHROPIC_BASE_URL` — enruta por proxy/gateway (habilita gateways compatibles).
- También pueden inyectarse vía `settings.json` → `env: { "ANTHROPIC_API_KEY": "..." }`.

### Reglas / system prompt
- **`CLAUDE.md`**: `~/.claude/CLAUDE.md` (usuario, aplica a todo) o `.claude/CLAUDE.md` (proyecto). Markdown. Se cargan ambos; proyecto sobre usuario.
- Memoria auto: `autoMemoryEnabled` en settings.

## Campos a preservar (unknown-field preservation)

Al editar `~/.claude.json` para gestionar `mcpServers`, Nodify **debe**:
1. Leer el archivo entero antes de modificar.
2. Preservar **todas las claves de nivel superior** salvo `mcpServers` (y `projects[<path>].mcpServers` si toca local).
3. **Merge, no replace**: tocar solo las claves MCP.
4. **Nunca** modificar `oauthAccount`, `userID`, `machineID`, `firstStartTime`, migraciones ni caches.
5. En `projects[<path>]`, preservar el resto de campos del objeto de proyecto.

Claves de nivel superior observadas en `~/.claude.json` a preservar: `oauthAccount`, `userID`, `firstStartTime`, `cachedGrowthBookFeatures(+At)`, `cachedExperimentFeatures`, `cachedExtraUsageDisabledReason`, `additionalModelCostsCache`, `additionalModelOptionsCache`, `clientDataCache`, `metricsStatusCache`, `migrationVersion`, `opusProMigrationComplete`, `sonnet1m45MigrationComplete`, `unpin*LaunchEffort`, `seenNotifications`, `pluginUsage`, `skillUsage`, `projects`.

Regla: **allowlist de escritura** (solo `mcpServers`), no blocklist.

## Fuentes

- Settings: https://code.claude.com/docs/en/settings.md
- Directorio `.claude`: https://code.claude.com/docs/en/claude-directory.md
- MCP: https://code.claude.com/docs/en/mcp.md · https://code.claude.com/docs/en/mcp-quickstart.md
- Skills: https://code.claude.com/docs/en/skills.md
- Env vars: https://code.claude.com/docs/en/env-vars.md
- Model config: https://code.claude.com/docs/en/model-config.md
- Verificado en máquina (secretos enmascarados): `~/.claude.json`, `~/.claude/settings.json`, `~/.claude/skills/`
