# Etherial_Art — Identidad visual "etérea"

Guía para que todas las páginas hablen el mismo idioma visual. Los tokens viven en
`:root` (y `[data-theme="dark"]`) dentro de `index.html`; los estándares que justifican
cada número están en [`UX_STANDARDS.md`](UX_STANDARDS.md).

## 1. Concepto: cuatro principios

1. **La obra es la luz; la interfaz es la niebla.** La UI usa la paleta en tonos
   suaves y translúcidos para que el color fuerte lo ponga la ilustración. Nada de
   fondos saturados detrás de una obra.
2. **Profundidad por difusión, no por líneas.** Separar con sombras amplias y muy
   tenues (teñidas con el verde de la marca) y divisores casi invisibles, en lugar de
   bordes duros. Los bordes fuertes se reservan para lo que _debe_ verse como control
   (campos, radios), por accesibilidad.
3. **Aire.** Espacio generoso y fluido (`--page-gutter`, `--section-space`), líneas de texto
   cortas (`--reading-width`) y una sola idea por bloque.
4. **Movimiento como respiración.** Cambios breves de opacidad y desplazamientos de
   pocos píxeles, con salida suave (_ease-out_). Nada en bucle, nada que rebote, y sólo
   opacidad si la persona pidió reducir el movimiento.

## 2. Color

### Paleta existente (sin cambios)

| Token               | Claro     | Oscuro    | Uso                                                                                               |
| ------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------- |
| `--cream`           | `#F5FAFA` | `#0A1F1E` | Fondo de página                                                                                   |
| `--card`            | `#FFFFFF` | `#122422` | Superficies: tarjetas, campos                                                                     |
| `--gp`              | `#DFF2EF` | `#122422` | Seleccionado (opción, filtro activo), fondo de iconos                                             |
| `--gb` / `--border` | `#B2DDD9` | `#1F4744` | Decorativo: barra de progreso pendiente, base de divisores                                        |
| `--teal`            | `#A8D8D4` | `#5EC9C1` | Halo/brillo, auras. **En claro no es color de texto.** En oscuro sí (antetítulos). Iconos del pie |
| `--gl`              | `#1F8F85` | `#4DBDB5` | Anillo de foco, radio/check marcado, paso completado. **En claro no es color de texto pequeño**   |
| `--gold`            | `#F5D000` | `#F5D000` | Firma: filo de botones, pestaña activa, paso actual. Nunca como texto ni relleno grande           |
| `--dark`            | `#0F2B29` | `#E8F5F4` | Texto principal y títulos                                                                         |
| `--dg`              | `#155950` | `#A8DDD9` | Nombres, cifras, texto de énfasis; fondo del pie (claro)                                          |
| `--muted`           | `#3D706B` | `#7BB8B4` | Texto de lectura secundario, etiquetas de campo                                                   |
| `--hint`            | `#467874` | `#5E9F9A` | Notas, metadatos, antetítulos (claro). No sobre `--gp` en claro (4.3:1)                           |

Los colores de estado ya existentes (avisos azul/amarillo/rojo, _pills_ del tracker,
insignias cerrado/lleno) se conservan tal cual.

### Tonos derivados permitidos

Sólo mezclas u opacidades de la paleta. No se añaden tonos nuevos.

| Token               | Claro                  | Oscuro                      | Derivación                                                      | Por qué                                                                     |
| ------------------- | ---------------------- | --------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `--color-accent`    | `#1A7169`              | `= --gl`                    | claro: `--gl` 70 % + `--dark` 30 %                              | `--gl` da 3.7:1 como texto; esto da 5.5:1 y deja leer blanco encima (5.8:1) |
| `--color-on-accent` | `#FFFFFF`              | `= --cream`                 | —                                                               | Texto sobre botón primario                                                  |
| `--color-eyebrow`   | `= --hint`             | `= --teal`                  | —                                                               | Antetítulos, precios, encabezados de tabla                                  |
| `--border-field`    | `#669692`              | `#4D807C`                   | `--gb`+`--muted` (35/65 claro, 50/50 oscuro)                    | Borde de campos y radios: 3:1 mínimo (WCAG 1.4.11)                          |
| `--border-soft`     | `--gb` al 75 %         | `--gb` al 90 %              | opacidad                                                        | Divisores y bordes de tarjetas (decorativos)                                |
| `--surface-hover`   | `#EFF9F7`              | `#17302E`                   | claro: `--gp`/`--card` 50/50; oscuro: `--gp` 65 % + `--gb` 35 % | Hover muy leve                                                              |
| `--surface-bar`     | `--cream` al 78 %      | `--cream` al 80 %           | opacidad                                                        | Barras superior/inferior translúcidas                                       |
| `--background-aura` | `--teal` 34 % + `--gp` | `--teal` 11 % + `--gb` 45 % | degradados radiales                                             | "Luz difusa" en el fondo de la página                                       |

### Contraste medido (WCAG 2.x)

Texto normal necesita 4.5:1; texto grande y elementos de control 3:1.

| Primer plano                 | sobre cream | sobre card | sobre gp | sobre mist |
| ---------------------------- | ----------- | ---------- | -------- | ---------- |
| **Claro** `--dark`           | 14.3        | 15.0       | 12.9     | 14.0       |
| `--dg`                       | 7.7         | 8.2        | 7.0      | 7.6        |
| `--muted`                    | 5.3         | 5.6        | 4.9      | 5.2        |
| `--hint` / `--color-eyebrow` | 4.7         | 5.0        | _4.3_    | 4.7        |
| `--color-accent`             | 5.5         | 5.8        | 5.0      | 5.4        |
| `--border-field` (control)   | 3.1         | 3.3        | —        | 3.1        |
| `--gl` (sólo foco / control) | 3.7         | 3.9        | 3.4      | 3.7        |
| **Oscuro** `--dark`          | 15.3        | 14.4       | 14.4     | 12.5       |
| `--dg`                       | 11.4        | 10.8       | 10.8     | 9.3        |
| `--muted`                    | 7.6         | 7.2        | 7.2      | 6.2        |
| `--hint`                     | 5.6         | 5.3        | 5.3      | 4.6        |
| `--color-accent` / `--gl`    | 7.5         | 7.1        | 7.1      | 6.2        |
| `--color-eyebrow` (`--teal`) | 8.6         | 8.1        | 8.1      | 7.1        |
| `--border-field` (control)   | 3.8         | 3.6        | 3.6      | 3.1        |

Botón primario: blanco sobre `--color-accent` **5.8:1** (claro); `--cream` sobre `--gl`
**7.5:1** (oscuro). Pie: `--teal` sobre `--dg` 5.2:1 (claro).

## 3. Tipografía

Se conservan **Cormorant Garamond** (títulos, marca: el trazo fino y contrastado _es_ la
sensación etérea) y **DM Sans** (texto e interfaz: limpia y legible en tamaños pequeños).
No hay razón para cambiarlas.

| Token                 | Tamaño                                                  | Uso                                                          |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `--font-size-label`   | 12 px (`.75rem`)                                        | Antetítulos, etiquetas, insignias. Mínimo absoluto del sitio |
| `--font-size-sm`      | 14 px                                                   | Notas, metadatos, botones                                    |
| `--font-size-base`    | `clamp(.9375rem, .9rem + .16vw, 1rem)` → 15–16 px       | Texto de lectura                                             |
| `--font-size-input`   | 16 px                                                   | Campos (evita el zoom automático de iOS)                     |
| `--font-size-h3`      | `clamp(1.375rem, 1.2rem + .75vw, 1.75rem)` → 22–28 px   | Título de paso, cifras                                       |
| `--font-size-h2`      | `clamp(1.75rem, 1.45rem + 1.3vw, 2.5rem)` → 28–40 px    | Títulos de página, nombre                                    |
| `--font-size-h1`      | `clamp(1.875rem, 1.45rem + 1.9vw, 2.875rem)` → 30–46 px | Titular de portada                                           |
| `--font-size-display` | `clamp(2.5rem, 2rem + 2.2vw, 3.5rem)`                   | Folio de confirmación                                        |

- Títulos serif en peso 300, interlineado `--line-height-tight` (1.15). Texto 1.7.
- Etiquetas en mayúsculas con espaciado `.12–.22em`.
- Los `clamp()` usan `rem` + un término pequeño en `vw`, y el máximo nunca pasa de 2.5×
  el mínimo: el zoom del navegador sigue funcionando (WCAG 1.4.4).
- Ancho de lectura `--reading-width: 34em` (≈ 70–75 caracteres en DM Sans). No usar `65ch`:
  el "0" de DM Sans es ancho y daría ~99 caracteres.

## 4. Espaciado, forma, sombras

**Espaciado** (base 4 px): `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 ·
`--space-5` 24 · `--space-6` 32 · `--space-7` 48 · `--space-8` 64.
Márgenes laterales `--page-gutter: clamp(1.25rem, 5vw, 2.5rem)`; aire vertical de sección
`--section-space: clamp(2.5rem, 6vw, 4.5rem)`. Anchos: `--width-content` 900 px, `--width-form`
860 px, `--width-wide` 1440 px (galería y portafolio).

**Radios** — una regla: _píldora = acción, rectángulo suave = campo o contenedor._
`--radius-sm` 10 px (campos, opciones, avisos) · `--radius-md` 14 px (tarjetas) · `--radius-lg` 20 px
(paneles grandes) · `--radius-pill` (botones, chips, filtros, idioma).

**Sombras** (teñidas con la marca, nunca negro puro en claro):

- `--shadow-rest` — reposo de tarjetas: casi imperceptible.
- `--shadow-raised` — elevación/hover: halo verde muy difuso.
- `--glow-focus` — anillo `--teal` de 4 px en campos con foco (acompaña, no sustituye, al
  contorno de foco de 2 px).
- `--glow-button` — brillo de botones al pasar el ratón; aparece por **opacidad** de un
  pseudo-elemento (no se anima `box-shadow`).

**Objetivos táctiles**: `--tap-target` 44 px (todo control), `--tap-target-lg` 48 px (campos, opciones
del formulario, botones de navegación del formulario). El selector de idioma se ve de
32 px pero su área táctil llega a 44 px con `::before`.

## 5. Movimiento

| Token              | Valor                         | Uso                                                                    |
| ------------------ | ----------------------------- | ---------------------------------------------------------------------- |
| `--duration-base`  | 200 ms                        | Hover de botones, iconos                                               |
| `--duration-slow`  | 250 ms                        | Tarjetas, chevron, indicador de pestaña, _toast_, apertura de servicio |
| `--duration-enter` | 500 ms                        | Apariciones (scroll, paso del formulario, confirmación)                |
| `--ease-out`       | `cubic-bezier(.22,.61,.36,1)` | Única curva: desacelera, sin sobrepasar (sin rebote)                   |
| `--hover-lift`     | `-3px`                        | Elevación en hover de tarjetas                                         |
| `--hover-zoom`     | `1.03`                        | "Respiración" de la imagen en hover                                    |

Reglas:

- Sólo `transform` y `opacity`. Los cambios de color, fondo o borde son instantáneos.
- Aparición al hacer scroll **una vez** (`IntersectionObserver` + `.reveal`), desplazando
  12 px. Lo que ya está en pantalla al cargar no se oculta (protege el LCP).
- El acordeón de servicios abre sin animar la altura; su contenido entra con opacidad.
- `prefers-reduced-motion: reduce` → `--hover-lift: 0`, `--hover-zoom: 1`, todas las transiciones
  limitadas a `opacity` y las apariciones pasan a fundido simple. El _spinner_ del
  tracker (indicador de carga, la única animación continua) se detiene.

## 6. Componentes

- **Botón primario** (`.srv-pay`, `.btn-next`, `.btn-submit`, `.tracker-btn`): píldora,
  fondo `--color-accent`, texto `--color-on-accent`, filo `--gold` de 1 px, ≥ 44 px (48 px en el
  formulario).
- **Botón secundario** (`.srv-pay-outline`, `.topbar-cta`): píldora, fondo `--card`,
  texto `--color-accent`, filo `--gold`.
- **Botón fantasma** (`.btn-back`): transparente, borde `--border-field`.
- **Chip / filtro** (`.about-contact-chip`, `.port-filter`): píldora 44 px, borde
  `--border-soft`; activo = fondo `--gp` + filo `--gold`.
- **Tarjeta** (galería, portafolio, universos, servicios, cifras): `--card`, borde
  `--border-soft`, `--radius-md`, `--shadow-rest`; hover = `--hover-lift` (+ `--shadow-raised` donde no recorta).
- **Campo** (`input`, `textarea` en formulario, waitlist, tracker y contacto): 48 px,
  16 px de letra, borde `--border-field`, `--radius-sm`; foco = borde `--color-accent` + `--glow-focus`.
- **Opción** (`.opt`): 48 px, borde `--border-soft`, radio/check con `--border-field`;
  seleccionada = `--gp` + borde `--color-accent` + `--shadow-rest`.
- **Pestañas**: teléfono (≤ 768 px) barra inferior al alcance del pulgar, sólo iconos
  en < 481 px e icono + etiqueta (12 px) en tablet; escritorio, barra superior con las 6.
  Activa = texto `--color-accent` + barra `--gold` que crece con `scaleX`.
- **Menú "Más"** (sólo teléfono/tablet): la barra inferior lleva 4 destinos (Inicio,
  Comisiones, Seguimiento, Contacto) y un botón "Más" que abre un panel con las
  pestañas marcadas `.tab-secondary` (Sobre mí, Portafolio). Patrón _disclosure_:
  `aria-expanded`/`aria-controls`, foco al primer elemento al abrir, flechas/Inicio/Fin
  dentro del panel, Escape cierra y devuelve el foco. Panel = tarjeta `--radius-md` +
  `--shadow-raised`, elementos de 48 px; entra con `rise` (sólo `fade` con movimiento
  reducido). "Más" se marca activo cuando la página actual está en el panel.

## 7. Qué hacer / qué no hacer

| ✅ Hacer                                                               | ❌ No hacer                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Usar `--color-accent` para texto de acento y enlaces                   | Usar `--gl` o `--teal` como texto pequeño en modo claro             |
| Dejar que la imagen llene su tarjeta; la UI alrededor, en tonos suaves | Poner degradados o colores saturados detrás de la obra              |
| Separar con aire y `--shadow-rest`                                     | Apilar bordes gruesos y sombras oscuras                             |
| `--gold` como filo o subrayado fino                                    | `--gold` como fondo, texto o superficie grande                      |
| Borde `--border-field` en todo lo que se escribe o se marca            | Bordes `--gb`/`--border-soft` en campos (no llegan a 3:1)           |
| Animar `transform`/`opacity` con `--duration-*` y `--ease-out`         | Animar `height`, `top`, `box-shadow`, `background`; bucles; rebotes |
| Áreas táctiles ≥ 44 px                                                 | Iconos o enlaces sueltos de 18–24 px                                |
| Letra ≥ 12 px y 16 px en campos                                        | Texto de 10–11 px                                                   |
| Tokens (`var(--space-4)`, `var(--radius-md)`…)                         | Valores sueltos repetidos en estilos inline                         |
| Probar siempre claro **y** oscuro                                      | Arreglar el contraste de un tema y olvidar el otro                  |
