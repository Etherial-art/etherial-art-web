// Tablero de comisiones por estado (bloque 3): columnas, búsqueda, fechas,
// chips del teléfono y "Mover a →" con solo estados asignables.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { functionSources } from './extract.js';

const ESCAPE_JS = readFileSync(new URL('../js/escape.js', import.meta.url), 'utf8');
const ADMIN_HTML = readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

function constante(nombre) {
  const m = ADMIN_HTML.match(new RegExp(`const ${nombre} = ([\\[{][\\s\\S]*?[\\]}]);`));
  assert.ok(m, `no se encontró ${nombre}`);
  return `const ${nombre} = ${m[1]};`;
}

const COMISIONES = [
  { folio: 1, status: 'waiting', cliente_tag: 'Ana', email: 'ana@x.com', created_at: '2026-09-15' },
  { folio: 2, status: 'sketch', cliente_tag: 'Bea', created_at: '2026-10-01' },
  { folio: 3, status: 'active', cliente_tag: 'Caro', created_at: '2026-10-05' },
  {
    folio: 4,
    status: 'revision',
    cliente_tag: 'Dani',
    email: 'd@ana.mx',
    created_at: '2026-10-20',
  },
  { folio: 41, status: 'delivered', cliente_tag: 'Eli', created_at: '2026-11-01' },
  { folio: 5, status: 'cancelled', cliente_tag: 'Fer', created_at: '2026-08-01' },
];

function tablero({ q = '', desde = '', hasta = '' } = {}) {
  const dom = new JSDOM(`<!doctype html><body>
    <input id="busca-q" value="${q}"><input id="busca-desde" value="${desde}">
    <input id="busca-hasta" value="${hasta}"><div id="tablero"></div></body>`);
  const ctx = vm.createContext({ document: dom.window.document });
  vm.runInContext(ESCAPE_JS, ctx);
  const constantes = ['statusLabel', 'ESTADOS_ASIGNABLES', 'statusClass', 'statusColor', 'COLUMNAS']
    .map(constante)
    .join('\n');
  vm.runInContext(
    `${constantes}
     let columnaMovil = 'recibida';
     let comisiones = ${JSON.stringify(COMISIONES)};
     ${functionSources('admin.html', [
       'renderTablero',
       'tarjetaComision',
       'filtrarComisiones',
       'valorCampo',
       'opcionesMover',
       'setColumnaMovil',
     ])}`,
    ctx,
  );
  ctx.renderTablero();
  const doc = dom.window.document;
  const columnas = Object.fromEntries(
    [...doc.querySelectorAll('.kanban-col')].map((col) => [
      col.getAttribute('aria-label'),
      [...col.querySelectorAll('.folio-num')].map((f) => Number(f.textContent.replace('#', ''))),
    ]),
  );
  return { ctx, doc, columnas };
}

describe('admin.html: tablero', () => {
  it('agrupa por columna; el estado heredado active cae en Boceto', () => {
    const { columnas } = tablero();
    assert.deepEqual(columnas, {
      Recibida: [1],
      Boceto: [2, 3],
      Color: [4],
      Entregada: [41],
      Cerradas: [5],
    });
  });

  it('busca por folio exacto (con o sin #)', () => {
    for (const q of ['41', '#41', '0041']) {
      const { columnas } = tablero({ q });
      assert.deepEqual(Object.values(columnas).flat(), [41], q);
    }
  });

  it('busca por nombre o email, sin distinguir mayúsculas', () => {
    const { columnas } = tablero({ q: 'ANA' });
    assert.deepEqual(Object.values(columnas).flat(), [1, 4]);
  });

  it('filtra por rango de fechas (inclusive)', () => {
    const { columnas } = tablero({ desde: '2026-10-01', hasta: '2026-10-20' });
    assert.deepEqual(Object.values(columnas).flat(), [2, 3, 4]);
  });

  it('en el teléfono solo la columna elegida está activa; los chips llevan la cuenta', () => {
    const { ctx, doc } = tablero();
    assert.equal(doc.querySelector('.kanban-col.activa').getAttribute('aria-label'), 'Recibida');
    ctx.setColumnaMovil('boceto');
    assert.equal(doc.querySelector('.kanban-col.activa').getAttribute('aria-label'), 'Boceto');
    const chip = [...doc.querySelectorAll('.kanban-chip')].find((c) =>
      c.textContent.includes('Boceto'),
    );
    assert.equal(chip.getAttribute('aria-pressed'), 'true');
    assert.match(chip.textContent, /2/);
  });

  it('"Mover a" ofrece solo estados asignables y no el actual', () => {
    const { doc } = tablero({ q: '2' });
    const opciones = [...doc.querySelectorAll('.kanban-card option')]
      .map((o) => o.value)
      .filter(Boolean);
    assert.deepEqual(opciones, [
      'waiting',
      'quoted',
      'color',
      'revision',
      'delivered',
      'completed',
      'cancelled',
    ]);
  });

  it('escapa el nombre del cliente en la tarjeta', () => {
    const dom = tablero();
    dom.ctx.comisiones = [
      { folio: 9, status: 'waiting', cliente_tag: '<img src=x onerror=alert(1)>' },
    ];
    vm.runInContext(
      "comisiones = [{ folio: 9, status: 'waiting', cliente_tag: '<img src=x onerror=alert(1)>' }]",
      dom.ctx,
    );
    dom.ctx.renderTablero();
    assert.equal(dom.doc.querySelectorAll('.kanban-card img').length, 0);
    assert.match(dom.doc.querySelector('.kc-cliente').textContent, /<img/);
  });
});
