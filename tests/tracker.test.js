// Tracker público: no pide datos del cliente (solo funciones de la base) y
// muestra los estados nuevos (boceto, color) traducidos. El comportamiento de
// la fila y del buscador está en tests/fila-publica.test.js.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

for (const page of ['index.html', 'mango.html', 'wuff.html']) {
  const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');

  describe(`${page}: tracker solo por folio`, () => {
    it('no pide cliente_tag: la columna de cliente es un marcador', () => {
      // cliente_tag solo aparece en el envío del formulario, nunca en una consulta.
      assert.doesNotMatch(html, /select\([^)]*cliente_tag/);
      assert.doesNotMatch(html, /from\('(clientes|comisiones_v2)'\)/);
      assert.doesNotMatch(html, /folio number or name/);
    });

    it('tiene etiquetas de boceto y color en los tres idiomas', () => {
      for (const clave of ['status.sketch', 'status.color']) {
        assert.equal(html.split(`'${clave}'`).length - 1, 3, clave);
      }
    });

    // El comportamiento del tracker (fila, búsqueda, resaltado, traducción)
    // está en tests/fila-publica.test.js.
    it('no lee ninguna tabla ni vista: usa las funciones', () => {
      assert.doesNotMatch(html, /seguimiento_publico/);
      assert.match(html, /rpc\('buscar_folio', \{ p_folio: numero \}\)/);
      assert.match(html, /rpc\('fila_publica'\)/);
      assert.match(html, /rpc\('contar_comisiones_activas'\)/);
    });
  });
}
