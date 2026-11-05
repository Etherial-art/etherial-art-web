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

    it('busca por número de folio exacto, no por texto', () => {
      const dom = new JSDOM(
        '<!doctype html><input id="folio-input"><div id="tracker-result"></div><table><tbody id="folio-tbody"></tbody></table>',
      );
      const ctx = vm.createContext({ document: dom.window.document });
      vm.runInContext(ESCAPE_JS, ctx);
      vm.runInContext(
        `let lang = 'es'; const t = (k) => k; const eClass = {};
         let foliosGlobales = ${JSON.stringify(FOLIOS)};
         ${functionSources(page, ['buscarFolio', 'renderFolios'])}`,
        ctx,
      );
      const buscar = (q) => {
        dom.window.document.getElementById('folio-input').value = q;
        ctx.buscarFolio();
        return [...dom.window.document.querySelectorAll('#folio-tbody .folio-num')].map((c) =>
          c.textContent.trim(),
        );
      };
      assert.deepEqual(buscar('#0012'), ['#0012']);
      assert.deepEqual(buscar('12'), ['#0012']);
      assert.deepEqual(buscar('Busto'), []);
      assert.deepEqual(buscar('1'), ['#0001']);
      // Sin búsqueda: todos, con 5 columnas (sin cliente).
      assert.equal(buscar('').length, 3);
      assert.equal(dom.window.document.querySelector('#folio-tbody tr').cells.length, 5);
    });
  });
}
