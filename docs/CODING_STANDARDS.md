# Estándares de código — etherial-art-web (frontend)

Este documento define **cómo se escribe el código** del sitio de Etherial_Art y
**por qué**. Cada regla existe para resolver un problema concreto; si una regla
deja de tener sentido, se cambia aquí primero (con un PR) y después en la
configuración.

El backend (`niko-studio`) tiene su propio documento con las reglas de Python;
las secciones de **idioma**, **nombres** y **commits** son las mismas en ambos
repos.

## Stack

Sitio **estático sin paso de build**: cada página es un `.html` autocontenido
con su `<style>` y su `<script>` inline, más librerías por CDN (Supabase JS,
GLightbox, Tabler Icons). Se publica tal cual.

Por eso **no** se usa TypeScript, bundler ni framework: agregarían un build que
hoy no existe. Las herramientas de abajo son solo de desarrollo; `node_modules/`
nunca llega a producción.

---

## 1. Herramientas

| Herramienta                                                                                                  | Qué hace                                                       | Configuración                         |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------- |
| [Prettier](https://prettier.io/)                                                                             | Formatea HTML, el CSS de `<style>` y el JS de `<script>`       | `.prettierrc.json`, `.prettierignore` |
| [ESLint](https://eslint.org/) + [`eslint-plugin-html`](https://github.com/BenoitZugmeyer/eslint-plugin-html) | Lint del JS que vive dentro de los `.html`                     | `eslint.config.js`                    |
| [pre-commit](https://pre-commit.com/)                                                                        | Corre todo lo anterior antes de cada commit                    | `.pre-commit-config.yaml`             |
| [EditorConfig](https://editorconfig.org/)                                                                    | Misma indentación, encoding y fin de línea en cualquier editor | `.editorconfig`                       |

**Por qué estas:** Prettier y ESLint son el estándar del ecosistema JS y ambos
entienden JS embebido en HTML (ESLint vía `eslint-plugin-html`), que es justo
como está escrito este sitio. pre-commit es el mismo gestor de hooks que usa el
backend, así que el flujo es idéntico en los dos repos.

Las versiones están **fijadas exactas** en `package.json` (y en
`package-lock.json`). _Por qué:_ una versión nueva de Prettier puede cambiar el
formato de cientos de líneas; actualizarla debe ser un PR explícito, con su
reformateo en un PR aparte.

### Puesta en marcha (una vez por clon)

Requiere Node.js ≥ 20 y Python (solo para pre-commit).

```bash
npm ci
pip install pre-commit   # o: pipx install pre-commit
pre-commit install
```

Desde ese momento, cada `git commit` formatea con Prettier y revisa con ESLint
los archivos que cambiaron. Si un hook modifica archivos, el commit se aborta:
revisa los cambios, haz `git add` y vuelve a commitear.

El hook de ESLint **no** usa `--fix`: algunos autofix (como `var` → `let`)
cambian el alcance de las variables, es decir, la lógica. Esos se aplican a
conciencia con `npm run lint:fix` y en un commit propio.

```bash
pre-commit run --all-files   # todo el repo
npm run format               # solo Prettier
npm run lint                 # solo ESLint
npm run check                # Prettier --check + ESLint, sin modificar nada
```

### CI

`.github/workflows/ci.yml` corre pre-commit en cada PR, sobre los archivos que
cambia el PR (en `main`, sobre todo el repo). Es el mismo chequeo que el hook
local. Un PR solo se mergea con el check en verde. (No hay job de pytest: este
repo no tiene Python; las pruebas del backend están en `niko-studio`.)

> **No uses `git commit --no-verify`** para saltarte los hooks. Si un hook se
> equivoca, corrige la configuración en un PR aparte.

---

## 2. Formato

Lo decide Prettier, no las personas.

- **Indentación de 2 espacios**, sin tabs. _Por qué:_ es lo habitual en
  HTML/CSS/JS y evita que el HTML anidado se vaya a la derecha.
- **Largo de línea 100.** _Por qué:_ igual que el backend; cabe en dos paneles.
- **Comillas simples en JS**, dobles en atributos HTML. _Por qué:_ es lo que
  el código ya usaba, y evita escapar comillas al construir HTML desde JS.
- **Punto y coma siempre.** _Por qué:_ evita los casos raros de inserción
  automática de `;` (líneas que empiezan con `(` o `` ` ``).
- **Coma final en listas multilínea.** _Por qué:_ agregar un elemento cambia
  una sola línea en el diff, no dos.
- **LF y UTF-8 sin BOM.** _Por qué:_ el repo se edita desde Windows y se
  publica en Linux; mezclar fines de línea ensucia los diffs.
- **`htmlWhitespaceSensitivity: "css"`.** _Por qué:_ Prettier no agrega ni
  quita espacios donde el navegador los mostraría (dentro de elementos
  `inline`), así que formatear no cambia cómo se ve la página.
- **No se escribe CSS ni JS "minificado a mano"** (todo en una línea).
  _Por qué:_ es imposible de revisar en un diff; si hace falta minificar para
  producción, lo hace una herramienta.

---

## 3. Nombres

| Elemento                      | Convención                 | Ejemplo                                 |
| ----------------------------- | -------------------------- | --------------------------------------- |
| Archivos                      | `kebab-case`               | `galeria-01.jpg`, `favicon-mango.svg`   |
| Clases e ids CSS              | `kebab-case`               | `.topbar-cta`, `#theme-btn`             |
| Variables CSS                 | `--kebab-case` descriptivo | `--color-texto` (ver nota)              |
| Funciones y variables JS      | `camelCase`                | `cargarFolios`, `renderFolios`, `goTab` |
| Constantes JS globales        | `UPPER_SNAKE_CASE`         | `RAILWAY_URL`                           |
| Claves de traducción (`i18n`) | `seccion.subseccion.clave` | `'form.success.title'`                  |
| Atributos `data-*`            | `kebab-case`               | `data-i18n="nav.home"`                  |

_Por qué:_ son las convenciones nativas de cada lenguaje; mezclarlas
(`.topbarCta`, `cargar_folios`) obliga a recordar casos especiales.

- **Booleanos como pregunta:** `comisionesAbiertas`, `slotsFull`.
- **Nada de abreviaturas crípticas** en código nuevo. Variables de una letra
  solo en callbacks muy cortos (`items.map((x) => x.id)`).
- _Nota sobre variables CSS:_ las actuales (`--gl`, `--gp`, `--dg`) son
  demasiado cortas para saber qué color son. **No se renombran en masa** (sería
  un cambio grande sin beneficio inmediato), pero las variables nuevas usan
  nombres descriptivos.

---

## 4. Idioma del código

| Qué                                                                | Idioma                                                | Por qué                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Funciones/variables del **dominio**                                | **Español**                                           | `cargarFolios`, `abrirFormulario`: coinciden con el backend y la base de datos. |
| Términos **técnicos**                                              | Inglés                                                | `render`, `toggle`, `toast`, `theme`, `btn`. Son vocabulario estándar de UI.    |
| **Valores que vienen del backend** (`status`, nombres de columnas) | Los que define el backend, sin traducir               | Son un contrato con la API.                                                     |
| **Textos visibles**                                                | Siempre vía `i18n` (es / en / de), nunca hardcodeados | El sitio es trilingüe; un texto fuera de `i18n` solo aparece en un idioma.      |
| **Comentarios**                                                    | Español                                               | Es el idioma de quien mantiene el código.                                       |
| **Commits** y títulos de PR                                        | Inglés, modo imperativo                               | Convención del historial existente.                                             |

- **No mezclar idiomas dentro de un nombre** (`getFolios` es incorrecto;
  `cargarFolios` es correcto).
- **Acentos solo en textos y comentarios**, nunca en identificadores ni nombres
  de archivo.

---

## 5. Estructura de carpetas

```
etherial-art-web/
├── index.html          # Sitio principal
├── mango.html          # Variante de tema "mango"
├── wuff.html           # Variante de tema "wuff"
├── admin.html          # Panel de administración (requiere X-Admin-Key)
├── a11y.js             # Mejoras de accesibilidad compartidas por las páginas
├── favicon*.svg
├── robots.txt, sitemap.xml
├── img/                # Imágenes del portafolio y perfil
│   └── thumb/          #   Miniaturas .webp para la galería
├── docs/               # Documentación (este archivo)
├── .github/workflows/  # CI: pre-commit en cada PR
├── eslint.config.js, .prettierrc.json, .editorconfig, .pre-commit-config.yaml
└── package.json        # Solo herramientas de desarrollo
```

Reglas:

- **Imágenes en `img/`**, nombre en `kebab-case` con número de dos dígitos
  cuando son series (`galeria-07.jpg`). Optimizar antes de subir (el hook
  rechaza archivos > 1 MB). _Por qué:_ las imágenes son lo que más pesa en la
  carga de la página.
- **Duplicación entre páginas.** `index.html`, `mango.html` y `wuff.html`
  repiten casi todo su CSS y JS (~1 900 líneas cada una): un bug corregido en
  una hay que corregirlo a mano en las otras dos. **Código nuevo que se
  comparta entre páginas va en archivos aparte** y se incluye con
  `<link>`/`<script src>`:
  ```
  css/base.css        # estilos comunes
  css/tema-mango.css  # solo lo que cambia por tema
  js/i18n.js          # traducciones
  js/api.js           # llamadas al backend (RAILWAY_URL, fetch)
  ```
  Mover el código existente a esos archivos es deseable, pero en PRs propios y
  pequeños (una sección a la vez), nunca mezclado con cambios de comportamiento.
- **Una sola fuente para la URL del backend** (`RAILWAY_URL`). _Por qué:_ si
  cambia el dominio, se cambia en un lugar.

---

## 6. JavaScript

- **`const` por defecto, `let` si se reasigna, nunca `var`** (`no-var`,
  `prefer-const`). _Por qué:_ `var` tiene alcance de función y se "eleva", lo
  que produce bugs sutiles; `const` deja claro qué no cambia.
- **`===` y `!==` siempre** (`eqeqeq`), salvo `== null` para cubrir `null` y
  `undefined` a la vez. _Por qué:_ `==` hace conversiones de tipo sorpresivas
  (`'0' == false`).
- **Nada de `eval`, `new Function` ni `setTimeout('código')`.** _Por qué:_
  ejecutan strings como código: riesgo de XSS.
- **Funciones globales solo si se usan desde el HTML** (`onclick="goTab(...)"`).
  ESLint está configurado para no marcarlas como "sin usar" (no puede ver ese
  uso). En código nuevo, preferir `addEventListener` desde el script.
- **`innerHTML` solo con contenido propio o escapado.** Cualquier dato que
  venga del usuario o de la base de datos (nombres, descripciones) se inserta
  con `textContent` o se escapa antes. _Por qué:_ `innerHTML` con datos
  externos es la vía clásica de XSS; el tracker público muestra datos que
  escriben los clientes.
- **`async`/`await` en vez de cadenas de `.then()`.** _Por qué:_ se lee de
  arriba abajo y el manejo de errores usa `try/catch` normal.
- **`console.log` no se commitea** (`no-console` avisa). `console.warn` y
  `console.error` sí, para errores reales.

---

## 7. Manejo de errores

- **Toda llamada de red (`fetch`, Supabase) va en `try/catch`** y el usuario
  ve algo útil si falla: un `showToast(t('form.conn.error'))`, un mensaje en
  la tabla, el botón re-habilitado. _Por qué:_ un error silencioso deja el
  botón en "Enviando…" para siempre.
- **Revisar `res.ok` después de `fetch`.** _Por qué:_ `fetch` no lanza error
  en un `400` o `500`, solo en fallos de red.
- **Nunca `catch (e) {}` vacío** (`no-empty`). Si de verdad el error se puede
  ignorar, el bloque lleva un comentario que diga por qué y cuál es el
  comportamiento por defecto:
  ```js
  } catch (e) {
    // Sin conexión a Supabase: se asume comisiones abiertas con 25 slots.
    console.warn('No se pudo leer config', e);
  }
  ```
  _Por qué:_ un `catch` vacío esconde bugs propios (un typo se ve igual que
  "la red falló").
- **Los mensajes de error visibles pasan por `i18n`.**

### Línea base (deuda técnica)

Al adoptar estos estándares había código que no cumplía reglas cuyo arreglo
cambia lógica. Para no bloquear commits, `eslint.config.js` baja esas reglas a
_warning_ solo en esos archivos:

- `no-empty`: `catch (e) {}` vacíos en `index.html`, `mango.html`, `wuff.html`
  y `admin.html`.
- `no-var`: `a11y.js`.

Se siguen viendo en cada `npm run lint`. Al corregirlos (en un PR propio),
**quitar el archivo de la lista**. Archivos nuevos nunca se agregan.

---

## 8. HTML y CSS

- **HTML semántico**: `<button>` para acciones (no `<div onclick>`), `<a>`
  para navegación, `<label for>` en cada campo de formulario. _Por qué:_
  accesibilidad (teclado y lectores de pantalla) sin esfuerzo extra.
- **`alt` en toda imagen** (vacío `alt=""` si es decorativa).
- **Colores y tipografías solo vía variables CSS** (`var(--dark)`), nunca
  valores sueltos repetidos. _Por qué:_ el modo oscuro y los temas
  mango/wuff cambian las variables, no cada regla.
- **Librerías por CDN con versión fijada** (`@supabase/supabase-js@2.45.0`, no
  `@latest`). _Por qué:_ una versión nueva publicada por terceros puede romper
  el sitio sin que nadie haya tocado el código. (Hoy varias usan `@latest` o
  solo la versión mayor; fijarlas es un cambio pendiente.)

---

## 9. Comentarios

- **El comentario explica el _por qué_, no el _qué_.**
  ```js
  // Mal:  ocultar el botón
  // Bien: Ko-fi ya cobró el depósito; no dejar reenviar el formulario.
  ```
- **Separadores de sección** (`// ━━ TRADUCCIONES ━━`) están bien en archivos
  largos.
- **Sin marcas de historial** (`[added]`, `[fix]`, "de Gemini"). Eso lo guarda
  `git log`.
- **`TODO` con contexto**, nunca solo `// TODO`.
- **Nada de código comentado.** Si ya no se usa, se borra.

---

## 10. Secretos

- En el frontend **todo es público**: cualquier valor en el HTML lo puede leer
  cualquiera. Solo se permite la _anon key_ de Supabase (diseñada para ser
  pública y limitada por Row Level Security).
- **Nunca** la `service_role` key de Supabase, la `ADMIN_SECRET`, ni claves de
  Resend/Ko-fi. Esas viven solo en el backend.

---

## 11. Commits y pull requests

- **Un PR = un propósito.** **Los cambios de formato nunca se mezclan con
  cambios de lógica.** _Por qué:_ en un diff donde cambia la indentación de
  1 000 líneas, el cambio real de una línea pasa desapercibido.
- Cambiar la configuración de estilo y aplicar el reformateo resultante son
  dos PRs distintos.
- Commits pequeños, en inglés imperativo: `Filter illustration add-ons based on selected type`.
- Antes de pedir revisión: `pre-commit run --all-files` en verde.
