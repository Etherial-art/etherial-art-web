// Tracker público con la fila completa (fila_publica) sin datos del cliente,
// buscador por folio que resalta y muestra el nombre enmascarado por la base
// (buscar_folio), y tipos traducidos al idioma del visitante.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { functionSources, variableSources } from './extract.js';

const ESCAPE_JS = readFileSync(new URL('../js/escape.js', import.meta.url), 'utf8');
const PAGINAS = ['index.html', 'mango.html', 'wuff.html'];
const MARCADOR = '██████';

const FILA = [
  {
    lugar_en_fila: 1,
    folio: 3,
    tipo_servicio: 'Ilustración digital',
    tipo_ilustracion: 'Sticker animado',
    status: 'waiting',
    created_at: '2026-10-01',
  },
  {
    lugar_en_fila: 2,
    folio: 12,
    tipo_servicio: 'Diseño Editorial',
    tipo_ilustracion: null,
    status: 'sketch',
    created_at: '2026-10-02',
  },
  {
    lugar_en_fila: 3,
    folio: 20,
    tipo_servicio: 'Ilustración digital',
    tipo_ilustracion: 'Tipo nuevo raro',
    status: 'color',
    created_at: '2026-10-03',
  },
];
const FOLIOS = {
  12: {
    folio: 12,
    tipo_servicio: 'Diseño Editorial',
    status: 'sketch',
    lugar_en_fila: 2,
    cliente_enmascarado: 'Mi***',
  },
  40: {
    folio: 40,
    tipo_servicio: 'Otro',
    status: 'delivered',
    lugar_en_fila: null,
    cliente_enmascarado: '***',
  },
  7: {
    folio: 7,
    tipo_ilustracion: 'x',
    status: 'waiting',
    lugar_en_fila: null,
    cliente_enmascarado: '<img src=x onerror=alert(1)>',
  },
};

function tracker(page, idioma = 'es', { fila = FILA, falla = null } = {}) {
  const dom = new JSDOM(
    `<!doctype html><input id="folio-input"><div id="tracker-result"></div>
     <table><tbody id="folio-tbody"></tbody></table>`,
  );
  const llamadas = [];
  const ctx = vm.createContext({
    document: dom.window.document,
    console: { warn() {}, error() {} },
    db: {
      rpc(fn, params) {
        llamadas.push(fn);
        if (falla === fn) return Promise.resolve({ data: null, error: { message: 'x' } });
        if (fn === 'fila_publica') return Promise.resolve({ data: fila, error: null });
        if (fn === 'buscar_folio') {
          const f = FOLIOS[params.p_folio];
          return Promise.resolve({ data: f ? [f] : [], error: null });
        }
        throw new Error(`rpc inesperada: ${fn}`);
      },
    },
  });
  vm.runInContext(ESCAPE_JS, ctx);
  vm.runInContext(
    `${variableSources(page, ['i18n', 'eClass'])}
     let lang = ${JSON.stringify(idioma)};
     let foliosGlobales = [];
     let folioBuscado = null;
     ${functionSources(page, ['t', 'traducirValor', 'cargarFila', 'buscarFolio', 'renderFolios'])}`,
    ctx,
  );
  const doc = dom.window.document;
  const filas = () =>
    [...doc.querySelectorAll('#folio-tbody tr')].map((tr) =>
      [...tr.cells].map((c) => c.textContent.trim()),
    );
  const buscar = async (q) => {
    doc.getElementById('folio-input').value = q;
    await ctx.buscarFolio();
  };
  return { ctx, doc, filas, buscar, llamadas };
}

for (const page of PAGINAS) {
  const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');

  describe(`${page}: fila pública`, () => {
    it('al abrir carga la fila con fila_publica() y una columna de cliente oculta', async () => {
      const { ctx, doc, filas, llamadas } = tracker(page);
      await ctx.cargarFila();
      assert.deepEqual(llamadas, ['fila_publica']);
      assert.deepEqual(
        filas().map((f) => [f[0], f[1]]),
        [
          ['#0003', MARCADOR],
          ['#0012', MARCADOR],
          ['#0020', MARCADOR],
        ],
      );
      for (const celda of doc.querySelectorAll('.cliente-oculto')) {
        assert.equal(celda.getAttribute('aria-label'), 'oculto');
        assert.equal(celda.textContent, MARCADOR);
        assert.equal(celda.attributes.length, 3); // class, role, aria-label: nada más detrás
      }
      assert.match(html, /<th id="th-client">/);
    });

    it('si fila_publica falla, muestra el error', async () => {
      const { ctx, doc } = tracker(page, 'es', { falla: 'fila_publica' });
      await ctx.cargarFila();
      assert.match(doc.getElementById('folio-tbody').textContent, /No se pudieron cargar/);
    });

    it('buscar resalta el folio en la lista y muestra solo su nombre enmascarado', async () => {
      const { ctx, doc, filas, buscar } = tracker(page);
      await ctx.cargarFila();
      await buscar('#0012');
      const resaltadas = doc.querySelectorAll('#folio-tbody tr.folio-resaltado');
      assert.equal(resaltadas.length, 1);
      assert.equal(resaltadas[0].cells[0].textContent.trim(), '#0012');
      assert.equal(resaltadas[0].cells[1].textContent.trim(), 'Mi***');
      // Las demás siguen ocultas.
      assert.deepEqual(
        filas().map((f) => f[1]),
        [MARCADOR, 'Mi***', MARCADOR],
      );
      assert.match(doc.getElementById('tracker-result').textContent, /#0012.*Mi\*\*\*/);
    });

    it('un folio fuera de la fila se informa sin resaltar nada', async () => {
      const { ctx, doc, buscar } = tracker(page);
      await ctx.cargarFila();
      await buscar('40');
      assert.equal(doc.querySelectorAll('tr.folio-resaltado').length, 0);
      assert.match(doc.getElementById('tracker-result').textContent, /#0040.*\*\*\*.*Entregado/);
    });

    it('el nombre enmascarado se escapa', async () => {
      const { ctx, doc, buscar } = tracker(page);
      await ctx.cargarFila();
      await buscar('7');
      assert.equal(doc.querySelectorAll('img').length, 0);
    });

    it('texto o folio inexistente: no encontrado, la lista sigue', async () => {
      const { ctx, doc, filas, buscar } = tracker(page);
      await ctx.cargarFila();
      await buscar('Busto');
      assert.match(doc.getElementById('tracker-result').textContent, /No se encontró/);
      await buscar('999');
      assert.match(doc.getElementById('tracker-result').textContent, /No se encontró/);
      assert.equal(filas().length, 3);
    });

    for (const [idioma, servicio, sticker, oculto] of [
      ['es', 'Diseño Editorial', 'Sticker animado', 'oculto'],
      ['en', 'Editorial Design', 'Animated sticker', 'hidden'],
      ['de', 'Editorial Design', 'Animierter Sticker', 'verborgen'],
    ]) {
      it(`tipos traducidos (${idioma}); un valor desconocido se muestra tal cual`, async () => {
        const { ctx, doc, filas } = tracker(page, idioma);
        await ctx.cargarFila();
        const tipos = filas().map((f) => f[2]);
        assert.deepEqual(tipos, [sticker, servicio, 'Tipo nuevo raro']);
        assert.equal(doc.querySelector('.cliente-oculto').getAttribute('aria-label'), oculto);
      });
    }
  });

  describe(`${page}: diccionario de tipos`, () => {
    // Valores que el formulario guarda en tipo_servicio / tipo_ilustracion
    // (y tipo_editorial / tipo_print), más los que escribe el backend.
    const doc = new JSDOM(html).window.document;
    const campos = ['servicio', 'tipo_ilus', 'tipo_edit', 'tipo_print', 'wl_interest'];
    const valores = new Set(['Por definir']);
    for (const el of doc.querySelectorAll('[onclick*="selectOpt"]')) {
      const campo = el.getAttribute('onclick').match(/selectOpt\(this,\s*'([^']+)'/)?.[1];
      if (campos.includes(campo) && el.dataset.val) valores.add(el.dataset.val);
    }

    it('el formulario tiene valores (la prueba no está vacía)', () => {
      assert.ok(valores.size >= 15, [...valores].join(', '));
    });

    it('cada valor del formulario tiene traducción en es, en y de', () => {
      const ctx = vm.createContext({});
      vm.runInContext(`${variableSources(page, ['i18n'])} globalThis.__i18n = i18n;`, ctx);
      const faltan = [];
      for (const v of valores) {
        for (const idioma of ['es', 'en', 'de']) {
          if (!ctx.__i18n[idioma][`valor.${v}`]) faltan.push(`${idioma}: ${v}`);
        }
      }
      assert.deepEqual(faltan, []);
    });
  });
}
