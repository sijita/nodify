# Sync multi-dispositivo vía GitHub: bundle canónico, sin secretos, git manual

Nodify puede sincronizar la config gestionada entre dispositivos del mismo usuario a
través de un repositorio de GitHub. Decisiones:

- **Qué se guarda:** un **bundle canónico portable** (representación normalizada de los
  MCPs/skills/config que Nodify gestiona), **no** los archivos nativos crudos. Los
  archivos nativos contienen estado de máquina (caches, oauth, IDs) y rutas no portables
  entre SOs. En cada dispositivo, Nodify **aplica** el bundle a los nativos vía adaptadores.
- **Secretos:** se **excluyen del bundle** en el MVP (se sincroniza estructura y nombres
  de variables, no valores). El sync de secretos cifrados llega en fase 2 junto con la
  bóveda cifrada (ver ADR-0004). Evita filtrar credenciales a un repo.
- **Transporte:** **git real** (commit/push/pull). Regala historial y rollback del
  bundle sin construir un sistema de versionado propio.
- **Disparo y conflictos:** **manual** (botones Push/Pull), cada operación muestra un
  **diff canónico previo** y exige confirmación antes de aplicar. Sin demonio de
  auto-sync en el MVP. El historial git es la red de seguridad.

Consecuencia: el sync **resucita parcialmente el modelo declarativo** aplazado en
ADR-0002 — el bundle es un "estado deseado" y aplicarlo es "aplicar estado deseado" —
pero **sin detección continua de drift**; solo push/pull explícito. El editor in-place
sigue siendo el modo de uso diario.
