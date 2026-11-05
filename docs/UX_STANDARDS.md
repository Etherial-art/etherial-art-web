# Estándares de UI/UX para etherial-art-web

Resumen de estándares y buenas prácticas vigentes, con la fuente de cada punto, y una
auditoría del sitio (`index.html`) contra ellos. Sirve de base para `docs/BRAND.md`.

> **Cómo se consultaron las fuentes (noviembre 2026).** Desde el entorno donde se
> escribió este documento, la descarga directa de `w3.org`, `web.dev` y
> `m3.material.io` estaba bloqueada por la red, y la página de Apple HIG sólo
> devuelve contenido con JavaScript. Los puntos se verificaron con **extractos de
> esas mismas páginas devueltos por un buscador web**, no leyendo cada página
> completa. Las cifras citadas aparecen en esos extractos; donde una fuente
> no es primaria o no se pudo confirmar, se indica. Ver
> [Fuentes no consultadas](#fuentes-no-consultadas-o-sólo-parcialmente).

---

## 1. Accesibilidad — WCAG 2.2 nivel AA

| Tema                    | Requisito                                                                                                                                                                                                                                                                    | Fuente                                                                                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contraste de texto      | **4.5:1** para texto normal; **3:1** para texto grande. Incluye el texto de _placeholder_ y el que aparece en hover/foco (SC 1.4.3, AA).                                                                                                                                     | [W3C — Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)                                                                                                                                                                                          |
| Contraste no textual    | **3:1** contra colores adyacentes para lo que identifica un control y su estado (bordes de campos, radios, checks) y para el indicador de foco. Los controles inactivos están exentos (SC 1.4.11, AA).                                                                       | [W3C — Understanding 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)                                                                                                                                                                                        |
| Foco visible            | Todo control operable con teclado debe mostrar un indicador de foco visible (SC 2.4.7, AA).                                                                                                                                                                                  | [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)                                                                                                                                                                                                                                         |
| Foco no tapado          | El elemento enfocado no puede quedar **completamente** oculto por contenido del autor, p. ej. barras fijas (SC 2.4.11, AA, nuevo en 2.2).                                                                                                                                    | [W3C — Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)                                                                                                                                                                               |
| Tamaño de objetivo      | Objetivos de puntero de al menos **24 × 24 px CSS**, salvo que tengan espacio suficiente (círculo de 24 px sin solaparse) o sean texto en línea (SC 2.5.8, AA, nuevo en 2.2). El nivel AAA (2.5.5) pide **44 × 44 px**. El W3C recomienda cumplir 24 px aunque haya espacio. | [W3C — Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)                                                                                                       |
| Teclado                 | Toda la funcionalidad debe poder usarse con teclado (SC 2.1.1, A).                                                                                                                                                                                                           | [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)                                                                                                                                                                                                                                         |
| Formularios             | Cada control (incluidas las opciones de radios/checkboxes) necesita etiqueta o instrucciones (SC 3.3.2, A). Los errores se describen **en texto**, no sólo con color (SC 3.3.1, A). No pedir dos veces el mismo dato en un proceso (SC 3.3.7, A, nuevo en 2.2).              | [W3C — 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), [Novedades 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)                                    |
| Propósito de los campos | Los campos que piden datos **del usuario** deben exponer su propósito en código, normalmente con `autocomplete` (SC 1.3.5, AA).                                                                                                                                              | [W3C — Understanding 1.3.5](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html), [Técnica H98](https://www.w3.org/WAI/WCAG22/Techniques/html/H98)                                                                                                                  |
| Texto redimensionable   | El texto debe poder ampliarse al **200 %** sin perder contenido (SC 1.4.4, AA). Usar sólo unidades de viewport para el tamaño de letra es un fallo (F94); con `clamp()` el máximo debe dejar llegar al 200 %.                                                                | [W3C — 1.4.4](https://www.w3.org/WAI/WCAG20/Understanding/resize-text), [F94](https://www.w3.org/WAI/WCAG21/Techniques/failures/F94.html), [MDN — clamp()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/clamp)                                                     |
| Movimiento reducido     | La animación disparada por interacción debe poder desactivarse (SC 2.3.3, **AAA**). La técnica C39 usa `prefers-reduced-motion`. MDN aclara que no implica quitar _toda_ animación, sino la no esencial.                                                                     | [W3C — 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39), [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) |

## 2. Móvil

- **Mobile-first.** Diseñar primero para pantallas pequeñas y añadir un breakpoint sólo
  cuando el contenido lo pida. — [web.dev — Responsive web design basics](https://web.dev/articles/responsive-web-design-basics)
- **Objetivos táctiles.**
  - WCAG 2.2: mínimo 24 × 24 px (AA), 44 × 44 px (AAA). — ver tabla anterior.
  - Apple: controles de al menos **44 × 44 pt**; la zona táctil puede ser mayor que el
    gráfico visible. — [Apple — UI Design Dos and Don'ts](https://developer.apple.com/design/tips/)
  - Material Design: al menos **48 × 48 dp**, separados ~8 dp. — [Material 3 — Accessibility: structure](https://m3.material.io/foundations/designing/structure), [Android — API defaults](https://developer.android.com/develop/ui/compose/accessibility/api-defaults)
  - NN/g: mínimo **1 cm × 1 cm** físico; más grande para acciones principales. — [NN/g — Touch Targets](https://www.nngroup.com/articles/touch-target-size/)
  - web.dev: botones de al menos 48 px y separación de "un dedo" entre campos. — [web.dev — Sign-in form best practices](https://web.dev/articles/sign-in-form-best-practices)
- **Zonas del pulgar.** Estudio observacional de Steven Hoober (1 333 observaciones):
  49 % sujeta el teléfono con una mano, 36 % en "cuna" y 15 % con dos manos.
  _Fuente secundaria (revista UXmatters, 2013); el propio autor ha matizado después su
  diagrama de zonas, cosa que no se pudo verificar en la fuente original._ —
  [UXmatters — How Do Users Really Hold Mobile Devices?](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)
  Material 3 propone barra de navegación inferior para ventanas _compact_ (< 600 dp) y
  _medium_ (600–839 dp) con **3–5** destinos principales, y riel o pestañas en escritorio. —
  [Material 3 — Navigation bar](https://m3.material.io/components/navigation-bar/guidelines), [Scaffold — bars](https://m3.material.io/foundations/layout/scaffold/bars)
- **Tipografía legible sin zoom.** La auditoría (ya retirada en Lighthouse 13) marcaba
  la página si ≥ 40 % del texto medía menos de 12 px y aconsejaba ≥ 12 px en al menos
  el 60 % del texto. — [Chrome for Developers — Legible font sizes](https://developer.chrome.com/docs/lighthouse/seo/font-size)
  web.dev sugiere ~20 px en campos de formulario en móvil. — [web.dev — Learn Forms: Identity](https://web.dev/learn/forms/identity)
  Safari en iOS hace zoom al enfocar campos con letra < 16 px. _Fuente secundaria:_
  [CSS-Tricks — 16px or larger text prevents iOS form zoom](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/)
- **Formularios en móvil.** `inputmode` indica el teclado virtual adecuado (`email`,
  `numeric`, `url`…) sin validar nada por sí mismo. — [MDN — inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode)
  Usar valores de `autocomplete` (`email`, `tel`, `name`…). — [web.dev — Sign-up form best practices](https://web.dev/articles/sign-up-form-best-practices)
  Un paso a la vez con indicador "paso X de N" y etapas rotuladas. — [NN/g — Wizards](https://www.nngroup.com/articles/wizards/)

## 3. Escritorio

- **Longitud de línea.** 50–75 caracteres (Baymard); web.dev cita 45–75 con 66 como
  ideal y sugiere limitar el ancho con `max-inline-size` en `ch` (ojo: `ch` es el ancho
  del "0" de la fuente; en DM Sans `65ch` equivale a ~99 caracteres reales, medido); WCAG 1.4.8 (AAA) fija
  un tope de 80. — [Baymard — Line length](https://baymard.com/blog/line-length-readability), [web.dev — Typography](https://web.dev/learn/design/typography/), [Material 2 — Understanding typography](https://m2.material.io/design/typography/understanding-typography.html)
- **Jerarquía y consistencia.** Consistencia interna (dentro del producto) y externa
  (convenciones del sector). — [NN/g — 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Pantallas grandes.** Material 3 define _expanded_ (840–1199 dp), _large_ (1200–1599)
  y _extra-large_ (≥ 1600) y recomienda un solo panel en compact/medium. — [Material 3 — Breakpoints](https://m3.material.io/foundations/layout/applying-layout), [Android — Window size classes](https://developer.android.com/develop/ui/views/layout/use-window-size-classes)

## 4. Responsive

- **Breakpoints por contenido, no por dispositivo** (los tamaños de dispositivo cambian
  cada año). — [web.dev — Media queries](https://web.dev/learn/design/media-queries)
  Referencia Material: compact < 600, medium 600–839, expanded ≥ 840 dp.
- **Imágenes responsivas.** `srcset` con descriptores `w` + `sizes`; sin `sizes` se
  asume `100vw`. Declarar `width`/`height` para reservar espacio. — [MDN — Responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- **Unidades fluidas.** `clamp(MIN, VAL, MAX)`; MDN recomienda que el máximo sea al
  menos el doble del mínimo y usar unidades relativas para respetar el zoom; web.dev
  propone sumar un término de viewport a una base relativa (`clamp(1em, 16px + .25vw, 1.25em)`)
  y advierte de no impedir el 200 %. — [MDN — clamp()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/clamp), [web.dev — Fluid type](https://web.dev/articles/baseline-in-action-fluid-type), [web.dev — min/max/clamp](https://web.dev/articles/min-max-clamp)

## 5. Usabilidad — heurísticas de Nielsen aplicadas a este sitio

Fuente general: [NN/g — 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [Visibility of system status](https://www.nngroup.com/articles/visibility-system-status/).

| Heurística                   | Aplicación aquí                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1 Visibilidad del estado    | Indicador "Paso X de 5" y barra de progreso; estado de comisiones (abiertas/llenas/cerradas); "cargando…" del tracker; mensaje y folio al enviar.                                                                                                                                                                                        |
| #4 Consistencia y estándares | Mismo aspecto para todos los botones primarios, todos los campos y todas las tarjetas; pestaña activa siempre marcada igual.                                                                                                                                                                                                             |
| #5 Prevención de errores     | Validar cada paso antes de avanzar, opciones bloqueadas visibles como tales, resumen antes de enviar. NN/g: validar al salir del campo y explicar cómo corregir, no sólo "campo vacío"; no depender de un toast o resumen como único aviso. — [NN/g — Errors in forms](https://www.nngroup.com/articles/errors-forms-design-guidelines/) |

## 6. Portafolios de arte

- **Lightbox.** Botón de cierre visible, caja distinguible del fondo, accesible con
  teclado (incluido Escape); en móvil, cuidar que la parte baja no quede bajo las barras
  del navegador. — [NN/g — Overuse of overlays](https://www.nngroup.com/articles/overuse-of-overlays/)
- **Galería.** Fotos consistentes (encuadre, fondo) para escanear rápido. — [NN/g — Product photos on listing pages](https://www.nngroup.com/articles/product-photos-listing-pages/)
- **Carga de imágenes.** `loading="lazy"` sólo fuera del primer viewport; **nunca** en la
  imagen LCP; `fetchpriority="high"` en la imagen LCP probable (una o dos como mucho). — [web.dev — Lazy loading](https://web.dev/articles/browser-level-image-lazy-loading), [web.dev — Fetch Priority](https://web.dev/articles/fetch-priority), [web.dev — Optimize LCP](https://web.dev/articles/optimize-lcp)
- **Metadatos por pieza.** Título, técnica/categoría y año junto a la obra; texto
  alternativo descriptivo en cada imagen (WCAG 1.1.1). _No se encontró una guía primaria
  específica de portafolios; es práctica derivada de las anteriores._

## 7. Animación y movimiento

- **Duraciones.** NN/g: la mayoría entre **100 y 500 ms**; ~100 ms para respuestas
  simples, 200–300 ms para cambios grandes, ~400 ms como tope en pantallas grandes;
  elegir la más corta que no resulte brusca. — [NN/g — Animation duration](https://www.nngroup.com/articles/animation-duration/)
  Material 3 (sistema de _tokens_ anterior): _short_ 50–200 ms, _medium_ 250–400 ms,
  _long_ 450–600 ms. — [Material 3 — Easing and duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)
- **Qué animar.** `transform` y `opacity` son las únicas propiedades que se animan sin
  provocar _layout_ ni _paint_; animar `top/left`, `height`, etc. perjudica los Web Vitals. —
  [web.dev — Compositor-only properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count), [web.dev — High-performance CSS animations](https://web.dev/articles/animations-guide), [web.dev — CSS for Web Vitals](https://web.dev/articles/css-web-vitals)
- **prefers-reduced-motion.** Ver §1. Disponible en todos los navegadores desde 2020
  (Baseline). — [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

## 8. Rendimiento — Core Web Vitals

Umbrales "bueno" en el **percentil 75** de visitas, por móvil y escritorio por separado.
— [web.dev — Web Vitals](https://web.dev/articles/vitals), [Cómo se definieron los umbrales](https://web.dev/articles/defining-core-web-vitals-thresholds)

| Métrica | Bueno    | Malo     | Efecto en el diseño                                                                                                                                                                                                   |
| ------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LCP     | ≤ 2.5 s  | > 4 s    | La primera obra suele ser el LCP: no ocultarla con animaciones de entrada ni cargarla en diferido.                                                                                                                    |
| INP     | ≤ 200 ms | > 500 ms | Interacciones (opciones del formulario, pestañas) con poco JS.                                                                                                                                                        |
| CLS     | ≤ 0.1    | > 0.25   | `width`/`height` o `aspect-ratio` en imágenes; no insertar contenido sin espacio reservado; las fuentes web pueden mover el layout (`size-adjust`). — [web.dev — Optimize CLS](https://web.dev/articles/optimize-cls) |

---

## 9. Auditoría del sitio actual (antes de este cambio)

Medido con Chromium headless (Playwright), **axe-core** con reglas WCAG 2.0/2.1/2.2 A+AA
y Lighthouse 13.6 (simulación móvil y escritorio), con Supabase y Railway bloqueados o
simulados. Sobre la rama con las mejoras de accesibilidad de
`claude/busy-wright-8g8uub` (a11y.js, etiquetas, foco visible, WebP).

### Móvil (375 px)

| Área                          | Estado                                                                                                                                                                                                                                                                              | Gravedad                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Contraste — modo claro        | **Falla.** `--teal` (#A8D8D4) como texto da **1.48:1** (antetítulos, precios, encabezados de tabla); `--gl` (#1F8F85) como texto da **3.74:1** (marca, pestaña activa, chips, enlaces de contacto); blanco sobre `--gl` en botones **3.94:1**. 86 nodos con contraste insuficiente. | **Alta**                         |
| Contraste — modo oscuro       | Casi bien. Falla el botón "Enviar mensaje" de Contacto (blanco sobre `--gl`, 2.26:1, estilo inline que no cubrió el arreglo anterior) y la tarjeta bloqueada.                                                                                                                       | Media                            |
| Contraste no textual (1.4.11) | Bordes de campos y círculos de radio en `--gb`: **1.4:1** claro / 1.66:1 oscuro (requiere 3:1).                                                                                                                                                                                     | **Alta**                         |
| Nombres accesibles            | Las pestañas ocultan su texto con `display:none` en móvil → 6 botones sin nombre.                                                                                                                                                                                                   | **Alta**                         |
| Objetivos táctiles            | Selector de idioma 30 × 20 px (< 24 px, falla 2.5.8 AA); tema 36 × 26; filtros 26 px de alto; botones y campos 35–39 px (< 44 Apple / 48 Material).                                                                                                                                 | **Alta** (idioma), Media (resto) |
| Una mano                      | Navegación arriba, lejos del pulgar.                                                                                                                                                                                                                                                | Media                            |
| Texto pequeño                 | Hasta el **54 %** del texto visible < 12 px (Portafolio); campos a 13 px provocan zoom en iOS.                                                                                                                                                                                      | Media                            |
| Teclado / foco                | Bien: foco visible en todos los controles, opciones del formulario operables (a11y.js). La tabla del tracker con scroll horizontal no es alcanzable por teclado.                                                                                                                    | Baja                             |
| Landmarks                     | No hay región `main`.                                                                                                                                                                                                                                                               | Baja                             |
| Rendimiento                   | Lighthouse móvil 59–64; LCP ≈ 8.5 s (imagen 1 de la galería) por CSS/JS bloqueante en `<head>` (Google Fonts, Tabler, GLightbox, supabase-js). CLS ≈ 0.                                                                                                                             | Media (fuera del alcance visual) |

### Escritorio (1440 px)

| Área                    | Estado                                                                                                  | Gravedad |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| Contraste — modo claro  | Mismos fallos que en móvil (73 nodos).                                                                  | **Alta** |
| Contraste — modo oscuro | Botón de Contacto y tarjeta bloqueada.                                                                  | Media    |
| Objetivos               | Selector de idioma < 24 px; CTA "Contactar" 28 px de alto.                                              | Media    |
| Longitud de línea       | Descripción de servicios **118** caracteres por línea, introducción del formulario 98, bio 72 (medido). | Baja     |
| Pantallas grandes       | La galería no tiene ancho máximo: en monitores muy anchos las columnas crecen sin límite.               | Baja     |
| Rendimiento             | Lighthouse escritorio 93; LCP 1.6 s; CLS 0.01.                                                          | Bien     |

### Lo que ya se cumplía

Formulario en pasos con "Paso X de 5" y foco que se mueve al título del paso; etiquetas
asociadas en todos los campos; `width`/`height` en todas las miniaturas; miniaturas WebP
con carga diferida a partir de la 5.ª; lightbox con navegación táctil; modo oscuro con
preferencia del sistema; `lang` del documento actualizado al cambiar de idioma.

### Fuera del alcance de este PR (recomendado después)

- Diferir `supabase-js` y GLightbox (`defer`) y añadir `fetchpriority="high"` a la
  primera obra: es lo que más mueve el LCP móvil.
- La galería recorta las obras con alturas fijas (`object-fit: cover`); para que la obra
  sea protagonista convendría respetar su proporción (`aspect-ratio` desde `width/height`).
- Sustituir `<div class="main" role="main">` por `<main>` y los `.opt` por
  `<input type="radio|checkbox">` nativos cuando se toque la estructura.
- Mensajes de error junto al campo (hoy sólo un _toast_), según NN/g.

---

## Fuentes no consultadas (o sólo parcialmente)

- **w3.org, web.dev, m3.material.io**: no accesibles directamente desde el entorno
  (DNS bloqueado por la política de red). Consultadas sólo mediante extractos del
  buscador; vale la pena revisar las páginas completas.
- **Apple Human Interface Guidelines** (`developer.apple.com/design/human-interface-guidelines`):
  la página necesita JavaScript y no devolvió contenido. Los 44 × 44 pt se citan desde la
  página "UI Design Dos and Don'ts" de Apple.
- **Steven Hoober, 4ourth Mobile (2022)**, sobre la revisión de su diagrama de zonas del
  pulgar: mencionada por terceros, no localizada.
- No se encontró una guía primaria (W3C/NN/g) específica sobre **metadatos de obra en
  portafolios**; §6 lo indica.
