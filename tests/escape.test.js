// Ningún texto que venga de clientes o de la base se interpreta como HTML, ni
// en el panel admin ni en el sitio público. Se pinta con las funciones reales
// de cada página sobre un DOM de jsdom y se comprueba que el "ataque" queda
// como texto y no crea elementos.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { functionSources } from './extract.js';

const ESCAPE_JS = readFileSync(new URL('../js/escape.js', import.meta.url), 'utf8');
const MALO = '<img src=x onerror="window.__xss=1">';

// Contexto con el DOM de jsdom, js/escape.js y las funciones pedidas.
function pagina(page, names, html, prelude = '', extra = {}) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  const ctx = vm.createContext({
    document: dom.window.document,
    console: { warn() {}, error() {} },
    ...extra,
  });
  vm.runInContext(ESCAPE_JS, ctx);
  vm.runInContext(`${prelude}\n${functionSources(page, names)}`, ctx);
  return { ctx, doc: dom.window.document };
}

function sinInyeccion(doc) {
  // La miniatura del panel tiene un onerror propio: se busca el del ataque.
  assert.equal(doc.querySelectorAll('[onerror*="__xss"], img[src="x"]').length, 0);
  assert.ok(doc.body.textContent.includes(MALO), 'el texto se ve tal cual');
}

describe('js/escape.js', () => {
  const ctx = vm.createContext({});
  vm.runInContext(ESCAPE_JS, ctx);

  it('esc escapa los 5 caracteres de HTML y trata null como vacío', () => {
    assert.equal(
      ctx.esc(`<a href="x" title='y'>&</a>`),
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
    assert.equal(ctx.esc(null), '');
    assert.equal(ctx.esc(undefined), '');
    assert.equal(ctx.esc(0), '0');
  });

  it("rutaImagen no deja cerrar src ni url('…')", () => {
    assert.equal(ctx.rutaImagen('galeria-01.jpg'), 'img/galeria-01.jpg');
    assert.equal(ctx.rutaImagen("a') ;x:y('.jpg"), 'img/a%27%29%20%3Bx%3Ay%28%27.jpg');
    assert.equal(ctx.rutaImagen('"><b>.jpg'), 'img/%22%3E%3Cb%3E.jpg');
    assert.equal(ctx.rutaImagen(null), 'img/');
  });
});

// ── Panel admin ────────────────────────────────────────────────────────────
const PRELUDE_ADMIN = `
  let comisiones = [];
  let filtroActual = 'all';
  let waitlistItems = [];
  let portItems = [];
  const statusLabel = { waiting: 'En espera' };
  const statusClass = { waiting: 's-waiting' };
  const statusColor = { waiting: '#999' };
  const ESTADOS_ASIGNABLES = ['waiting'];
  const COLUMNAS = [{ clave: 'recibida', etiqueta: 'Recibida', estados: ['waiting'] }];
  let columnaMovil = 'recibida';
`;
const LISTA_FNS = [
  'renderComisiones',
  'renderTablero',
  'tarjetaComision',
  'filtrarComisiones',
  'valorCampo',
  'opcionesMover',
  'necesitaCotizacion',
  'jsArg',
];

describe('admin.html: escape al pintar', () => {
  it('lista de comisiones', () => {
    const { ctx, doc } = pagina(
      'admin.html',
      LISTA_FNS,
      '<table><tbody id="admin-tbody"></tbody></table><div id="tablero"></div>',
      PRELUDE_ADMIN,
    );
    vm.runInContext(
      `comisiones = [{ folio: 1, status: 'waiting', cliente_tag: ${JSON.stringify(MALO)},
        email: ${JSON.stringify(MALO)}, tipo_ilustracion: ${JSON.stringify(MALO)} }]`,
      ctx,
    );
    ctx.renderComisiones();
    sinInyeccion(doc);
  });

  it('un status desconocido no rompe el atributo', () => {
    const { ctx, doc } = pagina(
      'admin.html',
      LISTA_FNS,
      '<table><tbody id="admin-tbody"></tbody></table><div id="tablero"></div>',
      PRELUDE_ADMIN,
    );
    vm.runInContext(`comisiones = [{ folio: 1, status: '"><b id=x>' }]`, ctx);
    ctx.renderComisiones();
    assert.equal(doc.getElementById('x'), null);
  });

  it('detalle de comisión', () => {
    const { ctx, doc } = pagina(
      'admin.html',
      ['abrirDetalle'],
      '<span id="d-folio"></span><div id="d-body"></div><div id="detail-overlay"></div>',
      PRELUDE_ADMIN + 'function cargarFicha() {}',
    );
    vm.runInContext(
      `comisiones = [{ folio: 1, cliente_tag: ${JSON.stringify(MALO)},
        descripcion_arte: ${JSON.stringify(MALO)}, descripcion_adicional: ${JSON.stringify(MALO)} }]`,
      ctx,
    );
    ctx.abrirDetalle(1);
    sinInyeccion(doc);
  });

  it('waitlist, incluidos los id en onclick', () => {
    const { ctx, doc } = pagina(
      'admin.html',
      ['renderWaitlist', 'jsArg'],
      '<table><tbody id="waitlist-tbody"></tbody></table>',
      PRELUDE_ADMIN,
    );
    const id = `x');window.__xss=1;('`;
    vm.runInContext(
      `waitlistItems = [{ id: ${JSON.stringify(id)}, nombre: ${JSON.stringify(MALO)},
        email: ${JSON.stringify(MALO)}, tipo_interes: ${JSON.stringify(MALO)} }]`,
      ctx,
    );
    ctx.renderWaitlist();
    sinInyeccion(doc);
    // El id llega intacto como argumento de texto, sin ejecutar nada.
    const onclick = doc.querySelector('button').getAttribute('onclick');
    assert.equal(onclick, `promoverWaitlist(${JSON.stringify(id)})`);
  });

  it('portafolio', () => {
    const { ctx, doc } = pagina(
      'admin.html',
      ['renderPortfolio', 'jsArg'],
      '<div id="port-list"></div>',
      PRELUDE_ADMIN,
    );
    vm.runInContext(
      `portItems = [{ id: 'a', nombre: ${JSON.stringify(MALO)}, categoria: ${JSON.stringify(MALO)},
        imagen: '"><b id=x>.jpg', anio: '2026', site: 'art', en_galeria: true }]`,
      ctx,
    );
    ctx.renderPortfolio();
    sinInyeccion(doc);
    assert.equal(doc.getElementById('x'), null);
  });
});

// ── Sitio público ──────────────────────────────────────────────────────────
for (const page of ['index.html', 'mango.html', 'wuff.html']) {
  describe(`${page}: escape al pintar`, () => {
    it('tracker de folios', () => {
      const { ctx, doc } = pagina(
        page,
        ['renderFolios', 'traducirValor'],
        '<table><tbody id="folio-tbody"></tbody></table>',
        `let lang = 'es'; const t = (k) => k; const eClass = {}; const i18n = { es: {} };
         let folioBuscado = { folio: 1, cliente_enmascarado: ${JSON.stringify(MALO)} };`,
      );
      ctx.renderFolios([
        {
          folio: 1,
          cliente_tag: MALO,
          tipo_ilustracion: MALO,
          status: '"><b id=x>',
          lugar_en_fila: MALO,
        },
      ]);
      sinInyeccion(doc);
      assert.equal(doc.getElementById('x'), null);
    });

    it('galería extra del portafolio', async () => {
      const obra = {
        nombre: MALO,
        categoria: MALO,
        imagen: "a') ;background:red;('.jpg",
        anio: MALO,
        en_galeria: true,
      };
      const query = {
        select: () => query,
        eq: () => query,
        order: () => Promise.resolve({ data: [obra], error: null }),
      };
      const { ctx, doc } = pagina(
        page,
        ['loadExtraPortfolio'],
        '<div id="gallery-extra-items"></div><div id="port-extra-items"></div>',
        '',
        { db: { from: () => query }, GLightbox: () => ({}) },
      );
      await ctx.loadExtraPortfolio();
      sinInyeccion(doc);
      const estilo = doc.querySelector('.port-img').getAttribute('style');
      assert.ok(!estilo.includes('background:red'), estilo);
    });

    it('galería extra: si Supabase devuelve error lo registra y no pinta nada', async () => {
      const errores = [];
      const query = {
        select: () => query,
        eq: () => query,
        order: () => Promise.resolve({ data: null, error: { message: 'x' } }),
      };
      const { ctx, doc } = pagina(
        page,
        ['loadExtraPortfolio'],
        '<div id="gallery-extra-items"></div>',
        '',
        {
          db: { from: () => query },
          GLightbox: () => ({}),
          console: { warn() {}, error: (...a) => errores.push(a) },
        },
      );
      await ctx.loadExtraPortfolio();
      assert.equal(errores.length, 1);
      assert.equal(doc.getElementById('gallery-extra-items').innerHTML, '');
    });
  });
}
