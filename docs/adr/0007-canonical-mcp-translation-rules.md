# Reglas de traducción del modelo canónico (MCP y secretos)

Tras la Fase 0 (investigación de docs oficiales), se fijan reglas de traducción no
obvias que el modelo canónico y los adaptadores deben respetar. Ver detalle en
[canonical-model.md](../canonical-model.md).

- **`command` string vs array:** Claude y Codex usan `command` (string) + `args` (array);
  **OpenCode usa `command` como array** que fusiona ambos. El adaptador OpenCode une
  `command`+`args`→`command[]` al escribir y los separa al leer.
- **`env` vs `environment`:** OpenCode nombra el mapa de entorno `environment`; Claude y
  Codex usan `env`. Renombrar en ambos sentidos.
- **`enabled` no existe en Claude:** OpenCode y Codex tienen flag `enabled` por servidor;
  Claude no. "Deshabilitar" en Claude implica quitar la entrada (o un almacén propio de
  Nodify) — es una operación no reversible 1:1; el adaptador avisa.
- **Secretos por valor vs por referencia:** el secreto canónico es
  `{ inline?: valor } | { envRef?: nombre_env_var }`. Claude/OpenCode admiten valor inline;
  **Codex prefiere referencia por env var** (`env_key`, `bearer_token_env_var`) y nunca
  debe recibir el valor en `config.toml`. Coherente con ADR-0004.
- **`auth.json` intocable:** credenciales de Codex (`~/.codex/auth.json`) y OpenCode
  (`~/.local/share/opencode/auth.json`) no se leen ni escriben nunca.
- **Los TRES agentes soportan skills** (`SKILL.md`), corrigiendo la suposición previa de que
  Codex no. Compartir skill = copiar la carpeta con `SKILL.md`; el habilitado se traduce por
  el mecanismo de cada agente.

Campos ricos sin destino común (p.ej. `enabled_tools`/`disabled_tools` de Codex, `oauth`
de OpenCode) se guardan en `extras` y se preservan, pero no se propagan al compartir.
