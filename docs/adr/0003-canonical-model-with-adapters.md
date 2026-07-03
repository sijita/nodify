# Modelo canónico interno + adaptadores por agente

Nodify representa cada artefacto (MCP, Skill, config) en un **modelo canónico neutral**
propio. Cada agente soportado tiene un **adaptador** que traduce entre el formato
nativo del agente y el canónico (nativo↔canónico), en ambos sentidos.

Compartir un MCP de X a Y = leer nativo(X) → canónico → escribir nativo(Y). Esto evita
la explosión combinatoria N² de traducciones par-a-par y hace que añadir un agente
nuevo cueste sólo un adaptador nuevo.

Cada adaptador debe fundamentarse en la **documentación oficial** del agente: su
esquema de config, ubicaciones de archivo, tipos de transporte de MCP, y qué campos
soporta o no. Cuando un artefacto no es traducible 1:1 al destino, el adaptador lo
declara y Nodify avisa en vez de romper silenciosamente.

Formatos reales observados (a documentar formalmente por adaptador):
- **Claude Code:** `~/.claude.json` → `mcpServers: { name: { type:"stdio", command:"...", args:[...] } }` (también http/sse remotos).
- **OpenCode:** `opencode.json` → `mcp: { name: { type:"local"|"remote", command:[...], args:[...], env:{}, headers:{}, enabled:bool } }`.
- **Codex:** config TOML en `~/.codex/` (pendiente de documentar).
