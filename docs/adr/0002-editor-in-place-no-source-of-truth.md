# En el MVP, los archivos nativos de cada agente son la única fuente de verdad

Nodify actúa como un **editor visual multi-agente in-place**: lee y escribe
directamente los archivos de configuración nativos de cada agente y no mantiene un
"estado deseado" propio. Compartir y versionar son acciones directas sobre esos
archivos, sin memoria maestra.

Descartamos (para el MVP) el modelo declarativo estilo Terraform/dotfiles, donde
Nodify sería la fuente de verdad y detectaría *drift* frente al disco: es más potente
(historial, rollback, detección de cambios externos) pero mucho más complejo. Se
deja para una fase posterior, una vez haya tracción.

Consecuencia: en el MVP no hay historial ni detección de cambios hechos por fuera;
lo que Nodify muestra es siempre el estado actual del disco.
