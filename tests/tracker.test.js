// Tracker público solo por folio: no pide ni muestra datos del cliente, busca
// por número de folio y muestra los estados nuevos (boceto, color) traducidos.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { functionSources } from './extract.js';

const ESCAPE_JS = readFileSync(new URL('../js/escape.js', import.meta.url), 'utf8');

const FOLIOS = [
  { folio: 1, status: 'waiting', tipo_ilustracion: 'Busto', lugar_en_fila: 1 },
  { folio: 12, status: 'sketch', tipo_ilustracion: 'Full body', lugar_en_fila: 2 },
  { folio: 120, status: 'color', tipo_servicio: 'Editorial', lugar_en_fila: 3 },
];

for (const page of ['index.html', 'mango.html', 'wuff.html']) {
  const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');

  describe(`${page}: tracker solo por folio`, () => {
    it('no pide cliente_tag ni tiene columna de cliente', () => {
      assert.doesNotMatch(html, /'folio,cliente_tag/);
      assert.doesNotMatch(html, /id="th-client"/);
      assert.doesNotMatch(html, /folio number or name/);
    });

    it('tiene etiquetas de boceto y color en los tres idiomas', () => {
      for (const clave of ['status.sketch', 'status.color']) {
        assert.equal(html.split(`'${clave}'`).length - 1, 3, clave);
      }
    });

    it('no lee ninguna tabla ni vista: usa las funciones', () => {
      assert.doesNotMatch(html, /seguimiento_publico/);
      assert.match(html, /rpc\('buscar_folio', \{ p_folio: numero \}\)/);
      assert.match(html, /rpc\('contar_comisiones_activas'\)/);
    });

    function tracker(respuesta) {
      const dom = new JSDOM(
        '<!doctype html><input id="folio-input"><div id="tracker-result"></div><table><tbody id="folio-tbody"></tbody></table>',
      );
      const llamadas = [];
      const ctx = vm.createContext({
        document: dom.window.document,
        console: { warn() {}, error() {} },
        db: {
          rpc(fn, params) {
            llamadas.push([fn, params.p_folio]);
            if (respuesta instanceof Error) return Promise.reject(respuesta);
            return Promise.resolve(respuesta(params.p_folio));
          },
        },
      });
      vm.runInContext(ESCAPE_JS, ctx);
      vm.runInContext(
        `let lang = 'es'; const t = (k) => k; const eClass = {};
         let foliosGlobales = [];
         ${functionSources(page, ['buscarFolio', 'renderFolios'])}`,
        ctx,
      );
      const buscar = async (q) => {
        dom.window.document.getElementById('folio-input').value = q;
        await ctx.buscarFolio();
        return [...dom.window.document.querySelectorAll('#folio-tbody .folio-num')].map((c) =>
          c.textContent.trim(),
        );
      };
      return { buscar, llamadas, doc: dom.window.document };
    }

    const porFolio = (n) => ({ data: FOLIOS.filter((f) => f.folio === n), error: null });

    it('busca un folio con buscar_folio(), sin listar los demás', async () => {
      const { buscar, llamadas, doc } = tracker(porFolio);
      assert.deepEqual(await buscar('#0012'), ['#0012']);
      assert.deepEqual(await buscar('12'), ['#0012']);
      assert.deepEqual(await buscar('1'), ['#0001']);
      assert.equal(doc.querySelector('#folio-tbody tr').cells.length, 5);
      assert.deepEqual(llamadas, [
        ['buscar_folio', 12],
        ['buscar_folio', 12],
        ['buscar_folio', 1],
      ]);
    });

    it('texto o folio inexistente: "no encontrado", sin consultar texto libre', async () => {
      const { buscar, llamadas, doc } = tracker(porFolio);
      assert.deepEqual(await buscar('Busto'), []);
      assert.equal(llamadas.length, 0);
      assert.equal(doc.getElementById('tracker-result').textContent, 'tracker.notfound');
      assert.deepEqual(await buscar('999'), []);
      assert.equal(doc.getElementById('tracker-result').textContent, 'tracker.notfound');
    });

    it('vacío: vuelve a la indicación inicial', async () => {
      const { buscar, doc } = tracker(porFolio);
      await buscar('12');
      assert.deepEqual(await buscar(''), []);
      assert.match(doc.getElementById('folio-tbody').textContent, /tracker\.empty/);
    });

    it('si la función falla, muestra el error', async () => {
      for (const respuesta of [
        () => ({ data: null, error: { message: 'x' } }),
        new TypeError('Failed to fetch'),
      ]) {
        const { buscar, doc } = tracker(respuesta);
        assert.deepEqual(await buscar('12'), []);
        assert.match(doc.getElementById('folio-tbody').textContent, /tracker\.error/);
      }
    });
  });
}
