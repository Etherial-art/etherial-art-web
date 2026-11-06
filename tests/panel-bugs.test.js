// Bugs del panel admin corregidos (bloque 2): estados que el backend acepta,
// columna de cliente, detalle con las columnas reales, edición con los nombres
// de campo del backend y alta manual por el endpoint de admin (sin correo).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { functionSources } from './extract.js';

const ESCAPE_JS = readFileSync(new URL('../js/escape.js', import.meta.url), 'utf8');
const ADMIN_HTML = readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

// Estados que acepta PATCH /admin/comisiones/{folio}/status (VALID_STATUSES).
const ESTADOS_BACKEND = [
  'waiting',
  'quoted',
  'sketch',
  'color',
  'revision',
  'delivered',
  'completed',
  'cancelled',
];
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

// Bloque `const nombre = {…};` / `[…];` del script del panel, tal cual.
function constante(nombre) {
  const m = ADMIN_HTML.match(new RegExp(`const ${nombre} = ([\\[{][\\s\\S]*?[\\]}]);`));
  assert.ok(m, `no se encontró ${nombre}`);
  return `const ${nombre} = ${m[1]};`;
}
const CONSTANTES = [
  'statusLabel',
  'ESTADOS_ASIGNABLES',
  'statusClass',
  'statusColor',
  'ESTADOS_ACTIVOS',
  'COLUMNAS',
  'IDIOMAS_BACKEND',
]
  .map(constante)
  .join('\n');

function panel(html, names, { prelude = '', rutas = {} } = {}) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  const peticiones = [];
  const toasts = [];
  const ctx = vm.createContext({
    document: dom.window.document,
    console: { warn() {}, error() {} },
    showToast: (m, t) => toasts.push([m, t]),
    async adminJson(path, opts = {}) {
      // JSON: los objetos del contexto vm no son del mismo realm que la prueba.
      peticiones.push({
        path,
        method: opts.method || 'GET',
        body: JSON.parse(JSON.stringify(opts.body ?? null)),
      });
      const r = rutas[`${opts.method || 'GET'} ${path}`];
      if (!r) throw new Error(`inesperada: ${opts.method || 'GET'} ${path}`);
      return r;
    },
    textoError: (e) => e.message,
    cerrarModal() {},
    limpiarModal() {},
    cerrarEditar() {},
    async cargarComisiones() {},
  });
  vm.runInContext(ESCAPE_JS, ctx);
  vm.runInContext(`${CONSTANTES}\n${prelude}\n${functionSources('admin.html', names)}`, ctx);
  return { ctx, doc: dom.window.document, peticiones, toasts };
}

describe('admin.html: estados', () => {
  it('el panel ofrece exactamente los estados del backend', () => {
    const { ctx } = panel('', []);
    assert.deepEqual(
      JSON.parse(vm.runInContext('JSON.stringify(ESTADOS_ASIGNABLES)', ctx)),
      ESTADOS_BACKEND,
    );
    assert.doesNotMatch(ADMIN_HTML, /'notified'|'expired'/);
  });

  it('se puede marcar como entregada desde la lista', () => {
    const { ctx, doc } = panel(
      '<table><tbody id="admin-tbody"></tbody></table><div id="tablero"></div>',
      LISTA_FNS,
      {
        prelude:
          "let filtroActual = 'all'; let columnaMovil = 'recibida'; let comisiones = [{ folio: 3, status: 'sketch' }];",
      },
    );
    ctx.renderComisiones();
    const opciones = [...doc.querySelectorAll('.status-select option')].map((o) => o.value);
    assert.ok(opciones.includes('delivered'));
    assert.ok(!opciones.includes('sketch'), 'no ofrece el estado actual');
    assert.ok(!opciones.includes('active'), 'el estado heredado no se asigna');
    for (const v of opciones.filter(Boolean)) assert.ok(ESTADOS_BACKEND.includes(v));
  });

  it('la columna cliente muestra nombre y email', () => {
    const { ctx, doc } = panel(
      '<table><tbody id="admin-tbody"></tbody></table><div id="tablero"></div>',
      LISTA_FNS,
      {
        prelude: `let filtroActual = 'all'; let columnaMovil = 'recibida';
          let comisiones = [{ folio: 1, status: 'waiting', cliente_tag: 'Ana', email: 'ana@x.com' }];`,
      },
    );
    ctx.renderComisiones();
    const celda = doc.querySelectorAll('#admin-tbody td')[1].textContent;
    assert.match(celda, /Ana/);
    assert.match(celda, /ana@x\.com/);
  });

  it('el contador de slots usa los mismos estados activos que el backend', () => {
    const { ctx } = panel('', []);
    assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(ESTADOS_ACTIVOS)', ctx)), [
      'waiting',
      'quoted',
      'sketch',
      'color',
      'active',
      'revision',
      'delivered',
    ]);
  });

  it('si el backend rechaza el cambio de estado, lo dice y repinta', async () => {
    let repintado = 0;
    const { ctx, toasts } = panel('', ['cambiarEstado'], {
      prelude: 'function renderComisiones() { __repinta(); }',
    });
    ctx.__repinta = () => (repintado += 1);
    ctx.adminJson = async () => {
      throw new Error('Status invalido: x');
    };
    await ctx.cambiarEstado(1, 'x');
    assert.deepEqual(toasts, [['No se cambió el estado: Status invalido: x', 'error']]);
    assert.equal(repintado, 1);
  });
});

describe('admin.html: detalle', () => {
  it('muestra las columnas reales de la comisión', () => {
    const { ctx, doc } = panel(
      '<span id="d-folio"></span><div id="d-body"></div><div id="detail-overlay"></div>',
      ['abrirDetalle'],
      {
        prelude: `function cargarFicha() {}
          let comisiones = [{ folio: 2, status: 'quoted', cliente_tag: 'Ana',
          email: 'ana@x.com', descripcion_arte: 'Un zorro azul', contacto_preferido: 'discord',
          num_personajes: '2', codigo_descuento: 'OTONO10', precio_total: 40, addons: ['Fondo'],
          como_me_encontro: 'Instagram' }];`,
      },
    );
    ctx.abrirDetalle(2);
    const texto = doc.getElementById('d-body').textContent;
    for (const esperado of [
      'Ana',
      'ana@x.com',
      'Cotizada',
      'Un zorro azul',
      'discord',
      'OTONO10',
      '$40.00 USD',
      'Fondo',
      'Instagram',
    ]) {
      assert.ok(texto.includes(esperado), `falta ${esperado}`);
    }
  });
});

describe('admin.html: editar', () => {
  it('manda los nombres de campo que acepta el backend', async () => {
    const campos = {
      'e-servicio': 'Ilustración digital',
      'e-tipo': 'Busto',
      'e-tag': 'Ana M.',
      'e-email': 'ana@nuevo.com',
      'e-desc': 'Dos zorros',
      'e-canal': 'discord',
      'e-descuento': 'X10',
    };
    const html =
      Object.entries(campos)
        .map(([id, v]) => `<input id="${id}" value="${v}">`)
        .join('') +
      '<input type="checkbox" id="e-rush"><input type="checkbox" id="e-nsfw"><button id="e-save-btn"></button>';
    const { ctx, peticiones } = panel(html, ['guardarEdicion'], {
      prelude: 'let eFolioActual = 5;',
      rutas: { 'PATCH /admin/comisiones/5': { ok: true } },
    });
    await ctx.guardarEdicion();
    assert.deepEqual(peticiones[0].body, {
      cliente_tag: 'Ana M.',
      email: 'ana@nuevo.com',
      tipo_servicio: 'Ilustración digital',
      tipo_ilustracion: 'Busto',
      descripcion_arte: 'Dos zorros',
      es_rush: false,
      es_nsfw: false,
      contacto_preferido: 'discord',
      codigo_descuento: 'X10',
    });
  });
});

describe('admin.html: alta manual', () => {
  it('usa POST /admin/comisiones (no manda el correo de solicitud recibida)', async () => {
    const html = `
      <input id="m-tag" value="Bea"><input id="m-email" value="bea@x.com">
      <select id="m-servicio"><option value="Ilustración digital" selected></option></select>
      <select id="m-tipo"><option value="Busto" selected></option></select>
      <textarea id="m-desc"></textarea>
      <select id="m-lang"><option value="de" selected></option></select>
      <input id="m-descuento" value="">
      <input type="checkbox" id="m-rush" checked><input type="checkbox" id="m-primera">
      <button id="btn-save"></button>`;
    const { ctx, peticiones, toasts } = panel(html, ['guardarComision'], {
      rutas: { 'POST /admin/comisiones': { ok: true, folio: 12 } },
    });
    await ctx.guardarComision();
    assert.equal(peticiones.length, 1);
    assert.equal(peticiones[0].path, '/admin/comisiones');
    assert.deepEqual(peticiones[0].body, {
      cliente_tag: 'Bea',
      email: 'bea@x.com',
      idioma_preferido: 'Deutsch',
      es_primera_comision: false,
      tipo_servicio: 'Ilustración digital',
      tipo_ilustracion: 'Busto',
      es_rush: true,
      descripcion_arte: 'Alta manual desde el panel',
      codigo_descuento: null,
    });
    assert.deepEqual(toasts, [['Comisión creada: folio #0012', 'ok']]);
    assert.doesNotMatch(ADMIN_HTML, /RAILWAY_URL}\/comisiones\/nueva/);
  });
});
