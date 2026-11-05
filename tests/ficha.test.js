// Bloque 4: resumen al entrar, ficha de comisión (estado con aviso, fecha de
// entrega, pagos, notas, historial) y diálogo de "Mover a" con aviso al
// cliente en su idioma.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { functionSources } from './extract.js';

const ESCAPE_JS = readFileSync(new URL('../js/escape.js', import.meta.url), 'utf8');
const ADMIN_HTML = readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const MALO = '<img src=x onerror="window.__xss=1">';

function constante(nombre) {
  const m = ADMIN_HTML.match(new RegExp(`const ${nombre} = ([\\[{][\\s\\S]*?[\\]}]);`));
  assert.ok(m, `no se encontró ${nombre}`);
  return `const ${nombre} = ${m[1]};`;
}
const CONSTANTES = ['statusLabel', 'ESTADOS_ASIGNABLES', 'AVISAR_POR_DEFECTO', 'IDIOMA_CORTO']
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
    confirm: () => true,
    textoError: (e) => e.message,
    async adminJson(path, opts = {}) {
      const metodo = opts.method || 'GET';
      peticiones.push({ path, metodo, body: JSON.parse(JSON.stringify(opts.body ?? null)) });
      const r = rutas[`${metodo} ${path}`];
      if (r instanceof Error) throw r;
      if (r === undefined) throw new Error(`inesperada: ${metodo} ${path}`);
      return r;
    },
    async cargarComisiones() {},
    renderComisiones() {},
  });
  vm.runInContext(ESCAPE_JS, ctx);
  vm.runInContext(
    `${CONSTANTES}
     const dinero = (v) => '$' + Number(v || 0).toFixed(2);
     const fechaCorta = (iso) => String(iso || '').slice(0, 10);
     const idiomaDe = (c) => IDIOMA_CORTO[c && c.idioma_preferido] || 'ES';
     ${prelude}
     ${functionSources('admin.html', names)}`,
    ctx,
  );
  return { ctx, doc: dom.window.document, peticiones, toasts };
}

const RESUMEN = {
  slots: { usados: 3, maximo: 5, abiertas: true },
  waitlist: { personas: 2, maximo: 50 },
  por_estado: { sketch: 2 },
  pagos_pendientes: { comisiones: 1, monto: 30, lista: [] },
  entregas_proximas: [
    { folio: 2, cliente_tag: MALO, status: 'color', fecha_entrega: '2026-11-01', vencida: true },
  ],
  vencidas: 1,
  pagos_sin_comision: 1,
};

describe('admin.html: resumen', () => {
  it('muestra slots, pagos pendientes, entregas y waitlist (escapado)', async () => {
    const { ctx, doc } = panel(
      '<section id="resumen"></section>',
      ['cargarResumen', 'renderResumen', 'jsArg'],
      {
        rutas: { 'GET /admin/resumen': RESUMEN },
      },
    );
    await ctx.cargarResumen();
    const texto = doc.getElementById('resumen').textContent;
    for (const esperado of [
      '3/5',
      '2 disponibles',
      '$30.00 USD',
      'Vencida',
      '1 vencida',
      '2/50',
      '1 pago de Ko-fi sin comisión',
    ]) {
      assert.ok(texto.includes(esperado), `falta ${esperado}`);
    }
    assert.match(texto, /Hay 2 slots libres/);
    assert.equal(doc.querySelectorAll('#resumen img').length, 0);
  });

  it('si falla, lo dice en el lugar del resumen', async () => {
    const { ctx, doc } = panel(
      '<section id="resumen"></section>',
      ['cargarResumen', 'renderResumen'],
      {
        rutas: { 'GET /admin/resumen': new Error('Sin conexión con el servidor.') },
      },
    );
    await ctx.cargarResumen();
    assert.match(
      doc.getElementById('resumen').textContent,
      /No se pudo cargar el resumen: Sin conexión/,
    );
  });
});

const FICHA = {
  comision: {
    id: 'c1',
    folio: 7,
    status: 'sketch',
    cliente_tag: MALO,
    email: 'a@x.com',
    idioma_preferido: 'Deutsch',
    fecha_entrega: '2026-12-01',
  },
  cliente: { id: 'cl1', cliente_tag: MALO, email: 'a@x.com', comisiones: [3, 7] },
  pagos: [
    {
      monto_recibido: 20,
      metodo_pago: 'ko-fi',
      kofi_transaction_id: MALO,
      created_at: '2026-10-01',
    },
  ],
  pagado: 20,
  saldo: 30,
  notas: [{ id: "n1');window.__x=1;('", texto: MALO }],
  historial: [
    {
      accion: 'UPDATE',
      cambios: { status: { antes: 'waiting', despues: 'sketch' } },
      created_at: '2026-10-02T10:00:00Z',
    },
  ],
  estados: [],
};

const FICHA_FNS = [
  'cargarFicha',
  'renderFicha',
  'describirCambios',
  'actualizarAvisoFicha',
  'guardarEstadoFicha',
  'guardarEntrega',
  'agregarNota',
  'borrarNota',
  'jsArg',
];

function ficha(rutas = {}) {
  return panel('<div id="d-ficha"></div>', FICHA_FNS, {
    prelude: `let fichaAbierta = null;
      const llamadas = [];
      async function cambiarEstado(...a) { llamadas.push(a); }`,
    rutas: { 'GET /admin/comisiones/7': FICHA, ...rutas },
  });
}

describe('admin.html: ficha de comisión', () => {
  it('pinta pagos, saldo, notas, historial y otras comisiones, todo escapado', async () => {
    const { ctx, doc } = ficha();
    await ctx.cargarFicha(7);
    const texto = doc.getElementById('d-ficha').textContent;
    for (const esperado of ['$20.00', 'Saldo pendiente $30.00', '#0003', '(DE)']) {
      assert.ok(texto.includes(esperado), `falta ${esperado}`);
    }
    assert.match(texto, /status: En espera → Boceto/);
    assert.equal(doc.querySelectorAll('#d-ficha img').length, 0);
    assert.ok(texto.includes(MALO));
    assert.equal(doc.getElementById('f-entrega').value, '2026-12-01');
  });

  it('la casilla de aviso se marca según el estado elegido', async () => {
    const { ctx, doc } = ficha();
    await ctx.cargarFicha(7);
    const sel = doc.getElementById('f-estado');
    const chk = doc.getElementById('f-notificar');
    assert.equal(sel.value, 'sketch');
    assert.equal(chk.checked, true);
    sel.value = 'cancelled';
    ctx.actualizarAvisoFicha();
    assert.equal(chk.checked, false);
    sel.value = 'delivered';
    ctx.actualizarAvisoFicha();
    assert.equal(chk.checked, true);
  });

  it('guardar estado manda el aviso si la casilla está marcada', async () => {
    const { ctx, doc } = ficha();
    await ctx.cargarFicha(7);
    doc.getElementById('f-estado').value = 'color';
    doc.getElementById('f-notificar').checked = true;
    await ctx.guardarEstadoFicha(7);
    assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(llamadas)', ctx)), [
      [7, 'color', true],
    ]);
  });

  it('fecha de entrega y notas van a sus endpoints', async () => {
    const { ctx, doc, peticiones } = ficha({
      'PATCH /admin/comisiones/7': { ok: true },
      'POST /admin/comisiones/7/notas': { id: 'n2' },
      [`DELETE /admin/comisiones/7/notas/${encodeURIComponent(FICHA.notas[0].id)}`]: { ok: true },
    });
    await ctx.cargarFicha(7);
    doc.getElementById('f-entrega').value = '2026-12-24';
    await ctx.guardarEntrega(7);
    doc.getElementById('f-nota').value = '  Pidió fondo  ';
    await ctx.agregarNota(7);
    await ctx.borrarNota(7, FICHA.notas[0].id);
    const hechas = peticiones.filter((p) => p.metodo !== 'GET');
    assert.deepEqual(hechas, [
      { path: '/admin/comisiones/7', metodo: 'PATCH', body: { fecha_entrega: '2026-12-24' } },
      { path: '/admin/comisiones/7/notas', metodo: 'POST', body: { texto: 'Pidió fondo' } },
      {
        path: `/admin/comisiones/7/notas/${encodeURIComponent(FICHA.notas[0].id)}`,
        metodo: 'DELETE',
        body: null,
      },
    ]);
  });

  it('el id de la nota no rompe el onclick', async () => {
    const { ctx, doc } = ficha();
    await ctx.cargarFicha(7);
    const boton = doc.querySelector('[aria-label="Borrar nota"]');
    assert.equal(
      boton.getAttribute('onclick'),
      `borrarNota(7, ${JSON.stringify(FICHA.notas[0].id)})`,
    );
  });

  it('si la ficha no carga, lo dice', async () => {
    const { ctx, doc } = ficha({ 'GET /admin/comisiones/7': new Error('No existe el folio #7') });
    await ctx.cargarFicha(7);
    assert.match(
      doc.getElementById('d-ficha').textContent,
      /No se pudo cargar la ficha: No existe el folio #7/,
    );
  });
});

describe('admin.html: mover con aviso', () => {
  const HTML = `<dialog id="mover-dialog"><h2 id="mover-titulo"></h2>
    <input type="checkbox" id="mover-notificar"><span id="mover-notificar-texto"></span></dialog>`;
  const PRELUDE = `let movimientoPendiente = null;
    const llamadas = [];
    async function cambiarEstado(...a) { llamadas.push(a); }
    let comisiones = [
      { folio: 4, cliente_tag: 'Ana', email: 'a@x.com', idioma_preferido: 'English' },
      { folio: 5, cliente_tag: 'Bea', email: null },
    ];`;
  const NAMES = ['confirmarMovimiento', 'cerrarMovimiento', 'confirmarMovimientoEnviar'];

  it('propone avisar en el idioma del cliente y manda notificar', async () => {
    const { ctx, doc } = panel(HTML, NAMES, { prelude: PRELUDE });
    ctx.confirmarMovimiento(4, 'color');
    assert.equal(doc.getElementById('mover-titulo').textContent, 'Mover #0004 a Color');
    assert.equal(doc.getElementById('mover-notificar').checked, true);
    assert.match(doc.getElementById('mover-notificar-texto').textContent, /Ana por correo \(EN\)/);
    await ctx.confirmarMovimientoEnviar({ preventDefault() {} });
    assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(llamadas)', ctx)), [
      [4, 'color', true],
    ]);
  });

  it('sin email no se puede avisar', () => {
    const { ctx, doc } = panel(HTML, NAMES, { prelude: PRELUDE });
    ctx.confirmarMovimiento(5, 'delivered');
    assert.equal(doc.getElementById('mover-notificar').checked, false);
    assert.equal(doc.getElementById('mover-notificar').disabled, true);
  });

  it('cancelar no cambia nada', () => {
    const { ctx } = panel(HTML, NAMES, { prelude: PRELUDE });
    ctx.confirmarMovimiento(4, 'color');
    ctx.cerrarMovimiento();
    assert.equal(vm.runInContext('llamadas.length', ctx), 0);
  });
});
