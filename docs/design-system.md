# Sistema de diseño — Nodify

## Base

- **Librería:** shadcn/ui. No es dependencia: los componentes se **copian al repo**
  (somos dueños del código), construidos sobre **Radix UI** (primitivas accesibles) +
  **Tailwind CSS**. Tokens vía **variables CSS**.

## Tema

- **Claro y oscuro**, con opción "seguir al sistema".
- **Default: oscuro** (público dev), respetando la preferencia del SO al primer arranque.
- Implementado con variables CSS + clase `.dark` (patrón estándar shadcn).

## Color

- **Monocromo puro.** Blanco y negro con sus variantes de gris, sin color de marca.
- **Neutral base: `neutral`** (gris puro, sin tinte — ni `zinc` azulado ni `stone` cálido).
- **Primary = monocromo:** negro sobre blanco (tema claro) / blanco sobre negro (oscuro).
  No hay accent cromático de marca.
- **Colores semánticos funcionales** (rojo/ámbar/verde **apagados**): reservados
  **exclusivamente para estados** (destructivo/error, aviso, éxito). **Nunca decorativos.**
  - Rojo apagado → destructivo / error (config rota, borrar).
  - Ámbar apagado → aviso / "difiere" / secreto faltante.
  - Verde apagado → éxito / "instalado y coincide".
- **Negros/blancos ópticos, no matemáticos ("tinta sobre papel", estilo Firecrawl):**
  - Tema claro: texto `#1a1a1a`–`#262626` sobre fondo `#F9F9F9`.
  - Tema oscuro: texto `#e8e8e8` sobre `#0a0a0a`–`#141414`.
  - `#000`/`#FFF` puros reservados para acentos de máximo contraste (foco, selección).

## Tipografía

- **Sans (prosa/párrafos largos):** `Geist` (alternativa libre a Suisse, neo-grotesca).
- **Mono (protagonista):** `Geist Mono`.
- **Enfoque mono-forward:** el mono es la voz principal — títulos, etiquetas, botones,
  celdas de la matriz, comandos, rutas, `env`, previews de JSON/TOML. El sans queda para
  prosa larga. Da la lectura "terminal/hacker" y encaja con contenido intrínsecamente
  técnico. Ambas fuentes se empaquetan con la app (sin dependencia de red/SO).

## Forma

- **Radios mixtos (fiel a Firecrawl):** superficies (inputs, cards, paneles, celdas de
  matriz) casi rectas (`0–2px`); controles interactivos (botones) con radio pequeño
  (`~6–8px`).
- Base de espaciado 4px.

## Elevación

- **Flat + bordes 1px** (tinta suave) como recurso principal de estructura y separación,
  supliendo al color. Las líneas refuerzan la metáfora de matriz/tabla.
- Sombras suaves **solo en overlays** (menús, popovers, modales) para despegarlos del
  fondo. Sin hard-shadows neo-brutalistas.

## Densidad

- **Cómoda** (aire por defecto de shadcn): padding generoso, controles amplios. No se
  usa la variante compacta/TUI en el MVP (posible ajuste futuro).

## Iconografía y motivos

- **Iconos:** `lucide` (default de shadcn; trazo fino, geométrico).
- **Motivos retro/hacker — dosis media (acentos, no protagonista):**
  - Etiquetas de estado **monoespaciadas en MAYÚSCULAS**: `INSTALLED` / `MISSING` /
    `DIFFERS` (refuerzan estado sin depender solo del color).
  - Fondo con **grid/puntos muy sutil** como firma visual.
  - Evitar excesos que envejecen mal: nada de cursores parpadeantes generalizados ni
    ASCII art.

## Estados de la matriz (cómo se renderiza el estado)

Cada estado se comunica por **triple señal** (icono + etiqueta mono + color semántico
apagado) para no depender solo del color:

| Estado | Icono (lucide) | Etiqueta | Color semántico |
|--------|----------------|----------|-----------------|
| Instalado y coincide | check | `INSTALLED` | verde apagado |
| Ausente | (vacío / dash) | `MISSING` | neutro |
| Difiere entre agentes | alert-triangle | `DIFFERS` | ámbar apagado |
| Error / config rota | x-octagon | `ERROR` | rojo apagado |

## Tokens finales (migrados del export de Claude Design)

Fuente de verdad: [`src/app/globals.css`](../src/app/globals.css) (CSS vars + `@theme` de Tailwind v4).
Paleta exacta (dark): `--background #0d0d0d`, `--surface #101010`, `--elevated #141414`,
`--elevated-2 #1b1b1b`, `--foreground #e8e8e8`, `--muted-foreground #8a8a8a`, `--faint #565656`,
`--border #242424`, `--border-strong #333333`, `--primary #ffffff`, `--primary-foreground #0a0a0a`,
`--success #7ea884`, `--warning #c2a15f`, `--danger #c27f74`, `--grid rgba(255,255,255,.028)`.
Tema claro análogo. Radios: `--radius-sm 2px` (superficies), `--radius 7px` (controles),
`--radius-lg 14px` (dock). Fuentes locales `@fontsource-variable/geist(-mono)`.

## Inventario de componentes (shadcn + CVA)

- `components/ui/button.tsx` — variantes `accent`/`outline`/`ghost`, tamaños `sm`/`md`/`icon`.
- `components/ui/badge.tsx` — variantes `outline` (pill) / `avatar` (cuadro de agente).
- `components/ui/status-indicator.tsx` — 4 estados (`installed`/`missing`/`differs`/`error`),
  glifo `✓ – ≠ ✕` + etiqueta mono + color semántico (CVA).
- `components/ui/card.tsx`, `components/ui/input.tsx` — superficie boxy / input terminal.
- Shell: `app/grid-background.tsx` (grid + glifos ASCII), `app/dock-nav.tsx` (dock lateral),
  `app/top-bar.tsx` (wordmark + filtro + tema + SCAN).
- Feature: `features/mcps/mcp-matrix.tsx` + `stat-cards.tsx`.

## Referencia estética

- Dirección: **retro/hacker pero moderno**, inspirada en Firecrawl (evidencia extraída
  de firecrawl.dev el 2026-07-02). Lo "retro/hacker" nace de: papel roto + tinta
  casi-negra, inputs de **esquinas rectas**, cajas boxy y bloques monoespaciados —
  no de una tipografía mono en sí. Se adopta el *lenguaje estructural*, en monocromo
  (el naranja `#FF4C00` de Firecrawl se sustituye por negro/blanco).
- Tokens de referencia Firecrawl: base 4px; radios mixtos (inputs `0px`, botones `~10px`);
  fuente Suisse (grotesca suiza, propietaria → se sustituye por alternativa libre).
