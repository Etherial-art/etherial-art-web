// El panel admin solo habla con el backend (/admin/*): no carga supabase-js ni
// conoce la URL o la clave de Supabase, y muestra al usuario los errores del
// backend en lugar de dar por buena una operación que falló.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import { fakeConsole, load } from './extract.js';

const ADMIN_HTML = readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

describe('admin.html: sin acceso directo a Supabase', () => {
  it('no carga supabase-js ni crea un cliente', () => {
    assert.doesNotMatch(ADMIN_HTML, /supabase-js/);
    assert.doesNotMatch(ADMIN_HTML, /createClient/);
    assert.doesNotMatch(ADMIN_HTML, /supabase\.co/);
    assert.doesNotMatch(ADMIN_HTML, /SUPABASE_(URL|KEY)/);
  });

  it('no usa un cliente `db` en ninguna parte', () => {
    assert.doesNotMatch(ADMIN_HTML, /\bdb\s*\.\s*(from|rpc)\s*\(/);
  });
});

// ── Backend falso ──────────────────────────────────────────────────────────
// Responde según el método y la ruta; guarda cada petición.
// `realm.TypeError` es el del contexto aislado de la página: un TypeError de
// otro contexto no pasaría el `instanceof` que hace el panel.
function fakeBackend(rutas, realm) {
  const peticiones = [];
  async function fetch(url, init = {}) {
    const metodo = init.method || 'GET';
    const ruta = url.replace('https://api.test', '');
    peticiones.push({
      metodo,
      ruta,
      headers: init.headers || {},
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    const r = rutas[`${metodo} ${ruta}`];
    if (!r) throw new Error(`Petición inesperada: ${metodo} ${ruta}`);
    if (r.red) throw new realm.TypeError('Failed to fetch');
    return {
      ok: r.status < 400,
      status: r.status,
      json: async () => {
        if (r.sinJson) throw new SyntaxError('Unexpected token <');
        return r.body;
      },
    };
  }
  return { fetch, peticiones };
}

const NOMBRES = ['adminFetch', 'adminJson', 'mensajeDeError', 'textoError'];

function panel(rutas, extraNombres = [], prelude = '', extraGlobals = {}) {
  const realm = {};
  const backend = fakeBackend(rutas, realm);
  const { calls, console } = fakeConsole();
  const toasts = [];
  const ctx = load(
    'admin.html',
    [...NOMBRES, ...extraNombres],
    {
      console,
      fetch: backend.fetch,
      getToken: () => 'token-de-prueba',
      clearToken: () => {},
      pedirToken: () => {},
      showToast: (msg, tipo) => toasts.push([msg, tipo]),
      ...extraGlobals,
    },
    `const RAILWAY_URL = 'https://api.test';
     class AuthError extends Error {}
     ${prelude}`,
  );
  realm.TypeError = vm.runInContext('TypeError', ctx);
  return { ctx, backend, calls, toasts };
}

describe('admin.html: adminJson', () => {
  it('manda el token y el cuerpo en JSON, y devuelve la respuesta', async () => {
    const { ctx, backend } = panel({
      'PATCH /admin/config': { status: 200, body: { max_slots: 5 } },
    });
    const data = await ctx.adminJson('/admin/config', { method: 'PATCH', body: { max_slots: 5 } });
    assert.deepEqual(data, { max_slots: 5 });
    const [p] = backend.peticiones;
    assert.equal(p.headers['X-Admin-Key'], 'token-de-prueba');
    assert.equal(p.headers['Content-Type'], 'application/json');
    assert.deepEqual(p.body, { max_slots: 5 });
  });

  it('con error del backend lanza su `detail`', async () => {
    const { ctx } = panel({
      'DELETE /admin/portfolio/x': { status: 404, body: { detail: 'No existe esa obra' } },
    });
    await assert.rejects(ctx.adminJson('/admin/portfolio/x', { method: 'DELETE' }), {
      message: 'No existe esa obra',
    });
  });

  it('422 de validación (detail en lista) da un mensaje legible', async () => {
    const { ctx } = panel({
      'POST /admin/portfolio': { status: 422, body: { detail: [{ loc: ['body', 'imagen'] }] } },
    });
    await assert.rejects(ctx.adminJson('/admin/portfolio', { method: 'POST', body: {} }), {
      message: 'Algún dato no es válido. Revisa los campos.',
    });
  });

  it('500 sin JSON avisa en consola y lanza un mensaje claro', async () => {
    const { ctx, calls } = panel({ 'GET /admin/config': { status: 502, sinJson: true } });
    await assert.rejects(ctx.adminJson('/admin/config'), /El servidor falló \(HTTP 502\)/);
    assert.equal(calls.warn.length, 1);
  });

  it('textoError distingue red caída', () => {
    const { ctx } = panel({});
    const red = vm.runInContext("new TypeError('Failed to fetch')", ctx);
    assert.equal(ctx.textoError(red), 'Sin conexión con el servidor.');
  });
});

// ── Configuración: abrir/cerrar y límites ─────────────────────────────────
const PRELUDE_CONFIG = `
  let comisionesAbiertasAdmin = true;
  let maxSlots = 25;
  let ui = 0;
  function actualizarToggleUI() { ui += 1; }
  function __estado() { return { comisionesAbiertasAdmin, maxSlots, ui }; }
`;
const CONFIG_FN = ['cargarEstadoComisiones', 'actualizarMaxSlots', 'toggleComisiones'];

describe('admin.html: configuración por /admin/config', () => {
  it('carga el estado desde el backend', async () => {
    const { ctx, calls } = panel(
      {
        'GET /admin/config': {
          status: 200,
          body: { commissions_open: false, max_slots: 7, max_waitlist: 9 },
        },
      },
      CONFIG_FN,
      PRELUDE_CONFIG,
    );
    await ctx.cargarEstadoComisiones();
    assert.deepEqual({ ...ctx.__estado() }, { comisionesAbiertasAdmin: false, maxSlots: 7, ui: 1 });
    assert.deepEqual(calls, { warn: [], error: [] });
  });

  it('si falla la carga lo dice en un toast y no cambia nada', async () => {
    const { ctx, toasts, calls } = panel(
      { 'GET /admin/config': { red: true } },
      CONFIG_FN,
      PRELUDE_CONFIG,
    );
    await ctx.cargarEstadoComisiones();
    assert.equal(ctx.__estado().comisionesAbiertasAdmin, true);
    assert.equal(calls.error.length, 1);
    assert.deepEqual(toasts, [
      ['No se pudo leer la configuración: Sin conexión con el servidor.', 'error'],
    ]);
  });

  it('el límite de slots solo cambia si el backend lo guardó', async () => {
    const ok = panel(
      {
        'PATCH /admin/config': {
          status: 200,
          body: { commissions_open: true, max_slots: 30, max_waitlist: 50 },
        },
      },
      CONFIG_FN,
      PRELUDE_CONFIG,
    );
    await ok.ctx.actualizarMaxSlots('30');
    assert.equal(ok.ctx.__estado().maxSlots, 30);
    assert.deepEqual(ok.backend.peticiones[0].body, { max_slots: 30 });
    assert.equal(ok.toasts[0][1], 'ok');

    const falla = panel(
      { 'PATCH /admin/config': { status: 500, body: { detail: 'Error interno' } } },
      CONFIG_FN,
      PRELUDE_CONFIG,
    );
    await falla.ctx.actualizarMaxSlots('30');
    assert.equal(falla.ctx.__estado().maxSlots, 25);
    assert.deepEqual(falla.toasts, [['No se guardó el límite: Error interno', 'error']]);
  });

  it('abrir/cerrar usa la respuesta del backend', async () => {
    const { ctx, backend } = panel(
      {
        'PATCH /admin/config': {
          status: 200,
          body: { commissions_open: false, max_slots: 25, max_waitlist: 50 },
        },
      },
      CONFIG_FN,
      PRELUDE_CONFIG,
    );
    await ctx.toggleComisiones();
    assert.deepEqual(backend.peticiones[0].body, { commissions_open: false });
    assert.equal(ctx.__estado().comisionesAbiertasAdmin, false);
  });
});

// ── Portafolio ─────────────────────────────────────────────────────────────
describe('admin.html: portafolio por /admin/portfolio', () => {
  it('si eliminar falla lo dice en un toast', async () => {
    const { ctx, toasts } = panel(
      { 'DELETE /admin/portfolio/a%2Fb': { status: 404, body: { detail: 'No existe esa obra' } } },
      ['eliminarObra'],
      'async function cargarPortfolio() {}',
      { confirm: () => true },
    );
    await ctx.eliminarObra('a/b');
    assert.deepEqual(toasts, [['No se eliminó la obra: No existe esa obra', 'error']]);
  });

  it('si cargar falla muestra el error como texto (sin interpretar HTML)', async () => {
    const lista = {
      innerHTML: '',
      hijos: [],
      appendChild(n) {
        this.hijos.push(n);
      },
    };
    const { ctx } = panel(
      { 'GET /admin/portfolio': { status: 500, body: { detail: '<img src=x onerror=alert(1)>' } } },
      ['cargarPortfolio'],
      'let portItems = []; function renderPortfolio() {}',
      {
        document: {
          getElementById: () => lista,
          createElement: () => ({ style: {}, className: '', textContent: '' }),
        },
      },
    );
    await ctx.cargarPortfolio();
    assert.equal(lista.innerHTML, '');
    assert.equal(lista.hijos.length, 1);
    assert.match(lista.hijos[0].textContent, /<img src=x/);
  });
});
