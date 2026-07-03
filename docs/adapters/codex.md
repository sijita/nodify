# Adaptador — Codex

> Alcance: OpenAI **Codex CLI** (el agente de línea de comandos `codex`, config en `~/.codex/`).
> Fuentes oficiales: `developers.openai.com/codex/*` y el repo `github.com/openai/codex`.
> Fecha de verificación: 2026-07-02.

## Ubicaciones de config (scope global/usuario)

Codex lee configuración de varias ubicaciones, con precedencia (los flags de CLI ganan a todo, luego el config más cercano al directorio de trabajo):

| Scope | Ruta | Notas |
|-------|------|-------|
| **Usuario (global)** | `~/.codex/config.toml` | Config principal / defaults personales. **Este es el archivo que Nodify edita a nivel usuario.** |
| Proyecto | `<repo>/.codex/config.toml` | Overrides por proyecto (solo proyectos "trusted"). |
| Sistema (Unix) | `/etc/codex/config.toml` | Defaults administrados a nivel máquina. |
| Requisitos administrados | `/etc/codex/requirements.toml` (aprox.) | Overrides managed; ej. `allow_managed_hooks_only = true` **solo** aplica aquí. |

- El directorio raíz de Codex es `~/.codex` por defecto, pero es **reubicable** mediante `CODEX_HOME`. Nodify no debe asumir `~/.codex` de forma rígida: si `CODEX_HOME` está definida, la config vive en `$CODEX_HOME/config.toml`.
- En Windows equivale a `%USERPROFILE%\.codex\config.toml` (⚠️ sin confirmar en doc oficial; inferido de `HOME`/`CODEX_HOME`).

Fuentes: [config-basic](https://developers.openai.com/codex/config-basic), [environment-variables](https://developers.openai.com/codex/environment-variables).

## Formato de archivo

- **TOML.** `~/.codex/config.toml`.
- Otros archivos relacionados en `~/.codex/`:
  - `auth.json` — credenciales de sign-in con ChatGPT / tokens (**no es TOML; contiene secretos**).
  - `AGENTS.md` — instrucciones globales (Markdown, ver Config general).
  - Skills en `~/.agents/skills/` (nivel `$HOME`, ver Skills).

## MCPs

**Sí, Codex CLI soporta servidores MCP.** Se declaran con tablas `[mcp_servers.<nombre>]`. Cada servidor es **stdio** (proceso local) **o streamable HTTP** (remoto por URL).

### Ejemplo stdio (proceso local)

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env = { "API_KEY" = "value" }        # opcional
cwd = "/path/to/server"              # opcional
startup_timeout_sec = 10             # opcional (default 10)
tool_timeout_sec = 60                # opcional (default 60)
enabled = true                       # opcional (habilitar/deshabilitar sin borrar)
enabled_tools = ["tool1", "tool2"]   # opcional (allowlist de tools)
disabled_tools = ["restricted_tool"] # opcional
```

### Ejemplo streamable HTTP (servidor remoto por URL)

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"  # env var que contiene el bearer token
http_headers = { "X-Header" = "value" }     # headers estáticos (opcional)
env_http_headers = { "Authorization" = "MY_TOKEN_ENV" } # headers desde env vars (opcional)
```

### Transportes soportados

- **stdio** (proceso local vía `command`/`args`/`env`). Principal y más estable.
- **Streamable HTTP** (remoto vía `url`, con `bearer_token_env_var` y opcionalmente OAuth). Históricamente tras un flag `experimental_use_rmcp_client`; en la doc actual está soportado directamente. ⚠️ El estado del flag puede variar según versión.
- **SSE**: ⚠️ sin confirmar como transporte de primera clase (la doc describe stdio y "Streamable HTTP").

### Campos comunes de `[mcp_servers.<name>]`

`command`, `args`, `env`, `env_vars`, `cwd`, `url`, `bearer_token_env_var`, `http_headers`, `env_http_headers`, `startup_timeout_sec` (default 10), `tool_timeout_sec` (default 60), `enabled`, `enabled_tools`, `disabled_tools`, `default_tools_approval_mode` (`auto`|`prompt`|`approve`), `experimental_environment` (`"remote"`).

### CLI helper

```
codex mcp add <server-name> --env VAR1=VALUE1 -- <stdio-command>
```

Fuentes: [mcp](https://developers.openai.com/codex/mcp), [config-reference](https://developers.openai.com/codex/config-reference).

## Skills

**⚠️ Codex CLI SÍ tiene Skills** (corrige la suposición inicial). OpenAI adoptó el estándar **`SKILL.md`** (mismo formato que Claude Code) en **diciembre de 2025**. Un skill es un directorio con `SKILL.md` (+ `scripts/`, `references/`, `assets/`, opcional `agents/openai.yaml`).

### Frontmatter mínimo

```markdown
---
name: skill-name
description: Explain exactly when this skill should and should not trigger.
---

Skill instructions for Codex to follow.
```

### Ubicaciones donde Codex descubre skills

| Scope | Ruta |
|-------|------|
| Repo (local) | `$CWD/.agents/skills` |
| Repo (raíz) | `$REPO_ROOT/.agents/skills` |
| **Usuario** | `$HOME/.agents/skills` |
| Admin | `/etc/codex/skills` |
| Sistema | built-in (provistos por OpenAI) |

⚠️ **Discrepancia entre fuentes**: la página oficial documenta `~/.agents/skills`; fuentes secundarias mencionan `~/.codex/skills`. Nodify debe tratar la ruta de usuario como **`~/.agents/skills`** (oficial) y detectar también `~/.codex/skills` de forma defensiva.

### Invocación

- Explícita: `$skill-name` en el prompt (o `/skills`).
- Implícita: Codex la activa automáticamente si la tarea coincide con la `description`.

### Config en `config.toml` (habilitar/deshabilitar)

```toml
[[skills.config]]
path = "/path/to/skill/SKILL.md"
enabled = false
```

Restringir a invocación explícita por-skill vía `agents/openai.yaml`:

```yaml
policy:
  allow_implicit_invocation: false
```

Fuentes: [codex/skills](https://developers.openai.com/codex/skills), [Simon Willison — OpenAI adopting skills (Dec 2025)](https://simonwillison.net/2025/Dec/12/openai-skills/).

## Config general

### Modelo por defecto

```toml
model = "gpt-5.5"
model_provider = "openai"
model_context_window = 128000        # opcional
model_reasoning_effort = "medium"    # minimal | low | medium | high | xhigh
model_reasoning_summary = "auto"     # auto | concise | detailed | none
```

⚠️ El nombre del modelo por defecto varía según versión; Nodify no debe hardcodearlo.

### Proveedores

Codex trae `openai` (default) y soporta `ollama`, `lmstudio`, `amazon-bedrock`, y **proveedores personalizados con override de `base_url`** (esto habilita OpenRouter, Azure, gateways locales):

```toml
[model_providers.openrouter]
name = "OpenRouter"
base_url = "https://openrouter.ai/api/v1"
env_key = "OPENROUTER_API_KEY"       # env var de donde toma la API key
wire_api = "chat"                    # "responses" | "chat"
requires_openai_auth = false
```

Opciones avanzadas: `env_http_headers`, `http_headers`, `query_params`, y auth por comando (`[model_providers.<id>.auth]`).

### Manejo de API key / autenticación

⚠️ **Dos mecanismos:**

1. **Sign-in con ChatGPT**: credenciales/tokens en `~/.codex/auth.json` (default interactivo).
2. **API key / tokens vía entorno**:
   - `CODEX_API_KEY` — usada en `codex exec` (no interactivo).
   - `CODEX_ACCESS_TOKEN` — token de acceso para automatización.
   - Proveedores personalizados: key desde la env var declarada en `env_key`.
   - ⚠️ `OPENAI_API_KEY`: aparece en config-reference pero no en environment-variables (que prioriza `CODEX_API_KEY`/`CODEX_ACCESS_TOKEN`/auth.json). **Nodify nunca debe escribir el valor de la key en `config.toml`; solo referencias por nombre de env var (`env_key`).**

### Instrucciones / rules (AGENTS.md)

Codex lee `AGENTS.md` antes de cada tarea. Merge global→proyecto (lo más cercano al CWD gana):

1. Global: `~/.codex/AGENTS.override.md` si existe, si no `~/.codex/AGENTS.md`.
2. Proyecto: desde la raíz de Git hacia abajo hasta el CWD.

Config relacionada: `model_instructions_file`, `project_doc_max_bytes` (32 KiB default), `project_doc_fallback_filenames`, `project_root_markers`.

### Sandbox / aprobaciones

```toml
approval_policy = "on-request"       # untrusted | on-request | never
sandbox_mode = "workspace-write"     # read-only | workspace-write | danger-full-access

[sandbox_workspace_write]
network_access = true
writable_roots = ["/tmp"]
```

Fuentes: [config-basic](https://developers.openai.com/codex/config-basic), [config-reference](https://developers.openai.com/codex/config-reference), [guides/agents-md](https://developers.openai.com/codex/guides/agents-md), [environment-variables](https://developers.openai.com/codex/environment-variables).

## Campos a preservar (unknown-field preservation)

Al editar `~/.codex/config.toml`, Nodify **debe preservar** (round-trip seguro) todo lo que no gestione:

- **Comentarios TOML y orden de claves** — usar parser tipo `toml_edit`, no re-serializar desde cero.
- **Tablas de proveedores completas**: `[model_providers.*]` (incl. `auth`, `env_http_headers`, `http_headers`, `query_params`, `wire_api`, `requires_openai_auth`).
- **Definiciones MCP completas**: `[mcp_servers.*]` con todos sus campos.
- **Config de skills**: `[[skills.config]]`.
- **Sandbox/permisos/red**: `[sandbox_workspace_write]`, `approval_policy`, `sandbox_mode`, `[features.*]`, `[permissions.*]`.
- **Hooks** y cualquier clave de nivel superior no reconocida.
- **Perfiles**: `[profiles.*]`.

Archivos **fuera de `config.toml` que NO deben tocarse**:

- `~/.codex/auth.json` (secretos de sesión). **Nunca leer/escribir ni imprimir valores.**
- `~/.codex/AGENTS.md` / `AGENTS.override.md` (gestionar como texto, no como TOML).
- Skills en `~/.agents/skills/` (directorios con `SKILL.md`).

Regla general: **allowlist de escritura**, no blocklist.

## Fuentes

- Config basics: https://developers.openai.com/codex/config-basic
- Advanced configuration: https://developers.openai.com/codex/config-advanced
- Configuration reference: https://developers.openai.com/codex/config-reference
- MCP: https://developers.openai.com/codex/mcp
- Agent Skills: https://developers.openai.com/codex/skills
- AGENTS.md guide: https://developers.openai.com/codex/guides/agents-md
- Environment variables: https://developers.openai.com/codex/environment-variables
- CLI reference: https://developers.openai.com/codex/cli/reference
- Repo: https://github.com/openai/codex
- Issues (Streamable HTTP MCP): https://github.com/openai/codex/issues/4707 · https://github.com/openai/codex/issues/11284
- Simon Willison — "OpenAI are quietly adopting skills" (2025-12-12): https://simonwillison.net/2025/Dec/12/openai-skills/
