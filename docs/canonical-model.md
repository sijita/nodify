# Modelo canónico v1 + tabla de compatibilidad

Síntesis de los adaptadores ([claude-code](adapters/claude-code.md), [codex](adapters/codex.md),
[opencode](adapters/opencode.md)). Define la representación neutral de Nodify y cómo cada
adaptador traduce nativo↔canónico. Fecha: 2026-07-02.

## Hallazgos que corrigen el diseño

1. **Los TRES agentes soportan skills vía `SKILL.md`.** Codex adoptó el estándar en dic-2025
   (`~/.agents/skills/`), igual que Claude (`~/.claude/skills/`) y OpenCode
   (`~/.config/opencode/skills/`, que además lee `.claude/skills/`). → **Corrige** la
   suposición "Codex no soporta skills". Los skills son **altamente portables** (copiar
   carpeta con `SKILL.md`, cuyo frontmatter mínimo `name`+`description` es común).
2. **Secretos: por valor vs por referencia.** Claude y OpenCode admiten el secreto *inline*
   (valor en `env`/`headers`); Codex usa **referencias por nombre de env var**
   (`env_key`, `bearer_token_env_var`) y `auth.json`. El modelo canónico debe representar
   un secreto como **{nombre, valor?, ref-env?}** para traducir en ambos sentidos sin filtrar.

---

## MCP — modelo canónico

```
CanonicalMcp {
  name: string
  transport: "stdio" | "http"          // "sse" se normaliza como variante de http
  # stdio:
  command?: string                     // ejecutable
  args?: string[]                      // argumentos separados
  # http:
  url?: string
  headers?: { [k]: SecretValue }
  # comunes:
  env?: { [k]: SecretValue }
  enabled?: boolean                    // default true
  timeoutMs?: number
  extras: RawMap                       // campos nativos no modelados (preservados)
}
SecretValue = { inline?: string } | { envRef?: string }   // valor o referencia a env var
```

### Tabla de compatibilidad MCP

| Campo canónico | Claude Code | Codex | OpenCode | Regla de traducción |
|----------------|-------------|-------|----------|---------------------|
| transport stdio | `type:"stdio"` | `[mcp_servers.x]` con `command` | `type:"local"` | — |
| transport http/sse | `type:"http"`/`"sse"` | `url` (streamable HTTP) | `type:"remote"` | Claude distingue http/sse; Codex/OpenCode no → normalizar a http |
| `command` (string) | `command` (string) | `command` (string) | **`command[0]`** (array) | **OpenCode: unir `command`+`args`→`command[]`; al leer, `command=[0]`, `args=[1..]`** |
| `args` (array) | `args` | `args` | (dentro de `command[]`) | idem |
| `env` | `env` | `env` (inline) | **`environment`** | **Renombrar `env`↔`environment` en OpenCode** |
| `url` | `url` | `url` | `url` | — |
| `headers` | `headers` | `http_headers` / `env_http_headers` / `bearer_token_env_var` | `headers` (+ `oauth`) | Codex separa headers estáticos vs desde-env; bearer por env ref |
| `enabled` | ❌ nativo | ✅ `enabled` | ✅ `enabled` | **Claude no lo tiene** → "deshabilitar" en Claude = quitar entrada (o almacén propio) |
| `timeoutMs` | ❌ (global `MCP_TIMEOUT`) | `startup_timeout_sec`/`tool_timeout_sec` | `timeout` (ms) | Claude solo global; Codex en segundos; OpenCode en ms |
| secreto inline | ✅ | ⚠️ desaconsejado (usa `env_key`) | ✅ (o `{env:KEY}`) | Codex prefiere `envRef`; nunca escribir valor en `config.toml` |

**No traducible 1:1 (el adaptador avisa):**
- `enabled:false` → Claude (no hay flag): requiere emulación o borrado.
- Campos ricos de Codex (`enabled_tools`, `disabled_tools`, `default_tools_approval_mode`,
  `experimental_environment`) → viven en `extras`, no tienen destino en Claude/OpenCode.
- `oauth` de OpenCode → sin equivalente directo.

---

## Skill — modelo canónico

```
CanonicalSkill {
  name: string                  // = nombre de carpeta; regex ^[a-z0-9]+(-[a-z0-9]+)*$
  description: string
  bodyPath: string              // SKILL.md
  files: string[]               // recursos adjuntos
  enabled: boolean
  frontmatterExtras: RawMap     // campos extra preservados
}
```

| Aspecto | Claude Code | Codex | OpenCode | Nota |
|---------|-------------|-------|----------|------|
| Ubicación usuario | `~/.claude/skills/<n>/SKILL.md` | `~/.agents/skills/<n>/SKILL.md` ⚠️ | `~/.config/opencode/skills/<n>/SKILL.md` | Codex: `~/.agents/skills` oficial (detectar `~/.codex/skills` defensivo) |
| Frontmatter mínimo | `name`, `description` | `name`, `description` | `name`, `description` | **Común → portable** |
| Habilitar/deshabilitar | presencia de archivo | `[[skills.config]] enabled` | `permission.skill` (wildcards) / `tools.skill:false` | Claude no tiene flag → toggle = presencia |
| Lee skills de otros | — | — | **lee `.claude/skills/`** | OpenCode ↔ Claude especialmente compatibles |

**Compartir skill = copiar la carpeta `<n>/` con su `SKILL.md`** a la ubicación del destino.
El habilitado se traduce según el mecanismo de cada agente.

---

## Config — modelo canónico (parcial, scope global)

| Concepto canónico | Claude Code | Codex | OpenCode |
|-------------------|-------------|-------|----------|
| Modelo por defecto | `settings.json` `model` (alias/nombre) | `config.toml` `model` + `model_provider` | `opencode.json` `model` = `"provider/model-id"` |
| Proveedor / base URL | `ANTHROPIC_BASE_URL` (env) | `[model_providers.x]` `base_url`+`env_key` | `provider.x.options.baseURL` |
| API key (dónde) | env `ANTHROPIC_API_KEY` o `settings.env` | env ref `env_key` / `auth.json` | `auth.json` o `{env:KEY}` |
| Reglas / system prompt | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | `~/.config/opencode/AGENTS.md` (fallback lee `CLAUDE.md`) |

**Secretos nunca en el archivo de config donde se puede evitar:** Codex y OpenCode guardan
credenciales en `auth.json` (que Nodify **no toca**). Coherente con ADR-0004: el modelo
canónico prefiere `envRef` cuando el destino lo soporta.

---

## Reglas transversales para todos los adaptadores

1. **Round-trip con preservación** (`extras`/`frontmatterExtras`): nunca perder campos no
   modelados (ADR-0005). Parsers que preserven comentarios: `toml_edit` (Codex), `jsonc-parser`
   (OpenCode acepta comentarios incluso en `.json`), JSON estricto (Claude `~/.claude.json`).
2. **Allowlist de escritura**, no blocklist: tocar solo las claves gestionadas.
3. **Nunca tocar** `~/.codex/auth.json`, `~/.local/share/opencode/auth.json`, ni el estado de
   máquina de `~/.claude.json`.
4. **Rutas reubicables:** respetar `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`, `OPENCODE_CONFIG`.
5. **No asumir que un config existente es válido** (los MCP de OpenCode en la máquina de prueba
   usaban forma Claude/Cursor inválida, generada por `opencode-synced`): normalizar al escribir y avisar.
