# Escrituras quirúrgicas: preservar campos desconocidos, backup y escritura atómica

Como Nodify edita in-place la config viva de los agentes (ADR-0002) y el modelo
canónico no captura todos los campos de cada archivo (p.ej. `~/.claude.json` tiene
decenas de claves ajenas a MCPs), escribir serializando "solo lo que Nodify entiende"
destruiría el resto. Por tanto, toda escritura debe:

1. **Parsear preservando lo desconocido** (round-trip: mantener claves no modeladas y,
   donde aplique, comentarios de `.jsonc`/TOML).
2. **Editar solo las claves gestionadas** por Nodify (`mcpServers`, `mcp`, ...).
3. **Escribir a un temporal y validar** que parsea/es válido antes de reemplazar.
4. **Backup del original** y **reemplazo atómico**.

"No romper la config del agente" es un requisito no negociable, no un extra. Claude
Code ya mantiene `~/.claude/backups/`, señal de que es la expectativa del ecosistema.
