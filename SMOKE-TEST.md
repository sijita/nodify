# Smoke test — Nodify (app nativa)

Checklist para la **primera ejecución real** de Nodify contra tus archivos de config.
El core está testeado (44 tests) y el frontend compila, pero la cadena completa
**UI real → comandos Tauri → tus archivos** nunca se ha ejecutado (tu Ubuntu 20.04 no
puede compilar Tauri v2). Corre esto en una máquina compatible —tu **Mac** es ideal—
antes de considerar la app "lista".

Tiempo estimado: ~10–15 min.

---

## 0. Antes de empezar — red de seguridad

Nodify hace backup + escritura atómica en cada write, pero para un primer arranque
haz una copia manual por si acaso. En el Mac:

```bash
mkdir -p ~/nodify-backup
cp -v ~/.claude.json ~/nodify-backup/ 2>/dev/null || true
cp -rv ~/.claude ~/nodify-backup/claude 2>/dev/null || true
cp -rv ~/.codex ~/nodify-backup/codex 2>/dev/null || true
cp -rv ~/.config/opencode ~/nodify-backup/opencode 2>/dev/null || true
cp -rv ~/.agents ~/nodify-backup/agents 2>/dev/null || true
```

> Si algo sale mal en cualquier paso: **detente**, restaura desde `~/nodify-backup/` y
> anota qué acción lo causó.

---

## 1. Levantar la app

```bash
git clone https://github.com/sijita/nodify.git
cd nodify
npm install
npx tauri icon <ruta/a/un/logo.png>   # genera src-tauri/icons/ (solo la 1ª vez)
npm run tauri dev
```

**✔ Verifica:**
- [ ] La ventana nativa abre (no el navegador).
- [ ] **NO** aparece el aviso amarillo "preview en navegador · datos DEMO". Si aparece,
      estás viendo el mock, no el backend real — algo falló en el arranque de Tauri.
- [ ] La consola donde corre `tauri dev` no escupe errores de Rust en rojo.

---

## 2. Detección (solo lectura — riesgo cero)

En la vista **MATRIX** y en **ALIGN** (🤖):

- [ ] Aparecen tus agentes realmente instalados como **detectados**; los que no tienes,
      como "no detectado".
- [ ] Las rutas de config bajo cada agente coinciden con las reales:
  - Claude Code → `~/.claude.json`
  - Codex → `~/.codex/config.toml`
  - OpenCode → `~/.config/opencode/opencode.json`
- [ ] Tus MCPs reales aparecen en la banda **MCP SERVERS** con el estado correcto por agente.
- [ ] Tus skills reales aparecen en la banda **SKILLS**.
- [ ] La banda **CONFIG** muestra tu modelo por defecto y si hay reglas (`CLAUDE.md`/`AGENTS.md`).
- [ ] En el drawer (clic en tarjeta de agente o cabecera) la pestaña **PROVIDERS** lista tus
      proveedores; las API keys se muestran **solo como nombre de env var**, nunca el valor.

Si algo aquí está mal, **para**: es un problema de lectura y no tiene sentido escribir.

---

## 3. Instalar un MCP (primera escritura)

Usa el botón **ADD MCP**. Instala uno **de prueba** (no uno que te importe), p. ej.:

- nombre: `nodify-test`
- transport: `stdio`
- command: `echo`
- args: `hola`

Instálalo solo en **un** agente (empieza por Claude Code).

**✔ Verifica en terminal (fuera de la app):**
```bash
grep -n "nodify-test" ~/.claude.json          # debe aparecer
ls -la ~/.claude.json.nodify.bak              # debe existir el backup
```
- [ ] El MCP `nodify-test` está en `~/.claude.json`.
- [ ] Se creó `~/.claude.json.nodify.bak`.
- [ ] **Clave:** el resto del archivo quedó intacto (tus otros MCPs, campos y formato).
      Compara con el backup: `diff <(jq -S . ~/.claude.json.nodify.bak) <(jq -S . ~/.claude.json)`
      — la única diferencia debe ser el bloque de `nodify-test`.
- [ ] En la MATRIX, la celda hizo el "pop" y quedó verde (installed).

---

## 4. Compartir un MCP entre agentes (traducción de formato)

Con `nodify-test` en Claude, en la MATRIX haz clic en la celda vacía del **mismo MCP**
bajo **Codex** (aparece "+ compartir aquí").

**✔ Verifica:**
```bash
grep -n "nodify-test" ~/.codex/config.toml    # debe aparecer, en formato TOML
ls -la ~/.codex/config.toml.nodify.bak
```
- [ ] `nodify-test` existe ahora en `~/.codex/config.toml` **en formato TOML** (no JSON pegado).
- [ ] Backup creado; el resto del `config.toml` (incl. comentarios) intacto.
- [ ] Repite compartiendo a **OpenCode** y verifica `~/.config/opencode/opencode.json`
      (respetando comentarios JSONC si los tenías).

---

## 5. Editar el modelo por defecto

Banda **CONFIG** → celda "default model" de Claude → clic → escribe un valor de prueba
(p. ej. `claude-opus-4-8`) en el diálogo.

**✔ Verifica:**
```bash
grep -n "model" ~/.claude/settings.json
ls -la ~/.claude/settings.json.nodify.bak
```
- [ ] El modelo se actualizó en `settings.json`, backup creado, resto intacto.

> Anota el valor original antes, para restaurarlo al terminar.

---

## 6. Editar reglas

Drawer de un agente → pestaña **RULES** → edita el texto → **guardar**.

**✔ Verifica:**
- [ ] `~/.claude/CLAUDE.md` (o `AGENTS.md` según agente) refleja el cambio.
- [ ] Backup `.nodify.bak` creado junto al archivo.

---

## 7. API keys / SECRETS

Vista **SECRETS** (🔑):
- [ ] Lista los nombres de env var referenciados por tus MCPs/proveedores.
- [ ] "set Claude" en una var de prueba escribe el valor en `~/.claude/settings.json`
      (bloque `env`) — verifica con `grep`.
- [ ] Confirma que **no** se tocó `~/.claude/.credentials` ni `auth.json` de ningún agente.

---

## 8. ALIGN (propagación masiva)

Vista **ALIGN** → elige Claude como **fuente** → mira el plan de cambios hacia otro agente
→ **Alinear**.
- [ ] Los cambios listados (+/~ mcps, + skills, ~ modelo) se aplican al destino.
- [ ] Backups creados; nada de lo que el destino ya tenía **de más** se eliminó (es aditivo).

---

## 9. Eliminar (limpieza del test)

Elimina `nodify-test` de todos los agentes donde lo pusiste (clic en celda verde → confirmar).
- [ ] Desaparece de cada archivo; el resto del archivo sigue intacto.
- [ ] Restaura el modelo/reglas de prueba a sus valores originales si los cambiaste.

---

## 10. Sync (opcional — requiere un repo git)

Vista **SYNC**:
- [ ] **Export** genera el bundle canónico; ábrelo y confirma que **no contiene valores**
      de secretos (solo referencias `${ENV_VAR}`).
- [ ] Con un repo git configurado: **push** hace commit+push; **pull** aplica y muestra diff.

---

## Resultado

- [ ] **Todo verde** → la app está funcionalmente lista para uso personal.
- [ ] **Algo falló** → anota: paso, acción, qué archivo, mensaje de error de la consola de
      `tauri dev`. Restaura desde `~/nodify-backup/`. Con esos datos se arregla rápido.

### Limpieza final
```bash
# Cuando confirmes que todo quedó bien, puedes borrar los backups automáticos:
find ~ -maxdepth 3 -name "*.nodify.bak" -print   # revisa antes
# find ... -delete                                # borra cuando estés seguro
rm -rf ~/nodify-backup                            # tu copia manual
```

---

## Pendientes conocidos (no bloquean el smoke test)

- Enable/disable **nativo** de skills por agente (hoy solo compartir/eliminar carpeta).
- Escribir el **valor** de una key en Codex/OpenCode (leen del shell o `auth.json`; fuera
  de alcance por diseño — ver [ADR-0004](docs/adr/0004-secrets-passthrough-masked.md)).
