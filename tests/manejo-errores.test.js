// Ningún error se traga en silencio: los fallos se registran en consola y la
// página conserva su comportamiento por defecto (sin cambios visibles).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fakeConsole, load } from './extract.js';

// ── Supabase falso ─────────────────────────────────────────────────────────
// Imita el query builder de supabase-js: cada consulta es "thenable" y se
// resuelve con { data, count, error }, o se rechaza si se pide `throw`.
function fakeDb(byTable) {
  return {
    from(table) {
      const outcome = byTable[table] ?? { data: null, count: null, error: null };
      const query = {
        select: () => query,
        in: () => query,
        not: () => query,
        then(resolve, reject) {
          if (outcome.throw) return Promise.reject(outcome.throw).then(resolve, reject);
          return Promise.resolve({ data: null, count: null, error: null, ...outcome }).then(
            resolve,
            reject,
          );
        },
      };
      return query;
    },
  };
}

// Variables de nivel superior que usa cargarEstadoComisiones, con los mismos
// valores iniciales que en la página, y un acceso para leerlas en la prueba.
const PRELUDE = `
  let comisionesAbiertas = true;
  let maxSlots = 25;
  let activeCount = 0;
  let slotsFull = false;
  let maxWaitlist = 50;
  let waitlistFull = false;
  let estadoDesconocido = false;
  function __estado() {
    return {
      comisionesAbiertas,
      maxSlots,
      activeCount,
      slotsFull,
      maxWaitlist,
      waitlistFull,
      estadoDesconocido,
    };
  }
`;

// Valores iniciales: con un fallo NO se usan para decidir nada (la
// disponibilidad queda como desconocida), pero tampoco se alteran.
const DEFAULTS = {
  comisionesAbiertas: true,
  maxSlots: 25,
  activeCount: 0,
  slotsFull: false,
  maxWaitlist: 50,
  waitlistFull: false,
};
const sinEstado = (estado) => {
  const copia = { ...estado };
  delete copia.estadoDesconocido;
  return copia;
};

async function cargar(page, tables) {
  const { calls, console } = fakeConsole();
  const ctx = load(
    page,
    ['cargarEstadoComisiones'],
    {
      console,
      db: fakeDb(tables),
      document: { getElementById: () => null },
      goTab: () => {},
    },
    PRELUDE,
  );
  await ctx.cargarEstadoComisiones();
  return { calls, estado: { ...ctx.__estado() } };
}

const supabaseError = { message: 'permission denied for table config', code: '42501' };

for (const page of ['index.html', 'mango.html', 'wuff.html']) {
  describe(`${page}: cargarEstadoComisiones`, () => {
    it('sin errores no registra nada y aplica la configuración', async () => {
      const { calls, estado } = await cargar(page, {
        config: {
          data: [
            { key: 'commissions_open', value: 'true' },
            { key: 'max_slots', value: '3' },
            { key: 'max_waitlist', value: '10' },
          ],
        },
        seguimiento_publico: { count: 3 },
        waitlist: { count: 4 },
      });
      assert.deepEqual(calls, { warn: [], error: [] });
      assert.equal(estado.maxSlots, 3);
      assert.equal(estado.slotsFull, true);
      assert.equal(estado.waitlistFull, false);
      assert.equal(estado.estadoDesconocido, false);
    });

    it('si Supabase devuelve error lo registra y la disponibilidad queda desconocida', async () => {
      const { calls, estado } = await cargar(page, {
        config: { error: supabaseError },
        seguimiento_publico: { error: supabaseError },
        waitlist: { error: supabaseError },
      });
      assert.equal(calls.error.length, 3);
      for (const args of calls.error) assert.ok(args.includes(supabaseError));
      assert.deepEqual(sinEstado(estado), DEFAULTS);
      assert.equal(estado.estadoDesconocido, true);
    });

    it('basta con que falle el conteo de slots para que sea desconocida', async () => {
      const { estado } = await cargar(page, {
        config: { data: [{ key: 'max_slots', value: '3' }] },
        seguimiento_publico: { error: supabaseError },
        waitlist: { count: 0 },
      });
      assert.equal(estado.estadoDesconocido, true);
    });

    it('si sólo falla la waitlist, la disponibilidad de comisiones sí se conoce', async () => {
      const { estado } = await cargar(page, {
        config: { data: [{ key: 'commissions_open', value: 'false' }] },
        waitlist: { error: supabaseError },
      });
      assert.equal(estado.estadoDesconocido, false);
      assert.equal(estado.comisionesAbiertas, false);
    });

    it('al reintentar con éxito deja de ser desconocida', async () => {
      const { calls, console } = fakeConsole();
      const tablas = { config: { error: supabaseError } };
      const ctx = load(
        page,
        ['cargarEstadoComisiones'],
        { console, db: fakeDb(tablas), document: { getElementById: () => null }, goTab: () => {} },
        PRELUDE,
      );
      await ctx.cargarEstadoComisiones();
      assert.equal(ctx.__estado().estadoDesconocido, true);
      tablas.config = { data: [] };
      await ctx.cargarEstadoComisiones();
      assert.equal(ctx.__estado().estadoDesconocido, false);
      assert.equal(calls.error.length, 1);
    });

    it('si la consulta lanza (red caída) lo registra y la disponibilidad queda desconocida', async () => {
      const red = new TypeError('Failed to fetch');
      const { calls, estado } = await cargar(page, {
        config: { throw: red },
        seguimiento_publico: { throw: red },
        waitlist: { throw: red },
      });
      assert.equal(calls.error.length, 3);
      for (const args of calls.error) assert.ok(args.includes(red));
      assert.deepEqual(sinEstado(estado), DEFAULTS);
      assert.equal(estado.estadoDesconocido, true);
    });
  });
}

describe('admin.html: token en sessionStorage', () => {
  const NAMES = ['getToken', 'setToken', 'clearToken'];
  const PRELUDE_ADMIN = "const TOKEN_KEY = 'ea-admin-token';";

  function memoryStorage() {
    const data = new Map();
    return {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
    };
  }

  it('con almacenamiento disponible guarda, lee y borra sin avisos', () => {
    const { calls, console } = fakeConsole();
    const ctx = load(
      'admin.html',
      NAMES,
      { console, sessionStorage: memoryStorage() },
      PRELUDE_ADMIN,
    );
    ctx.setToken('abc');
    assert.equal(ctx.getToken(), 'abc');
    ctx.clearToken();
    assert.equal(ctx.getToken(), '');
    assert.deepEqual(calls, { warn: [], error: [] });
  });

  it('si sessionStorage está bloqueado avisa en consola y el panel sigue sin token', () => {
    const bloqueado = new DOMException('The operation is insecure.', 'SecurityError');
    const storage = {
      getItem() {
        throw bloqueado;
      },
      setItem() {
        throw bloqueado;
      },
      removeItem() {
        throw bloqueado;
      },
    };
    const { calls, console } = fakeConsole();
    const ctx = load('admin.html', NAMES, { console, sessionStorage: storage }, PRELUDE_ADMIN);
    assert.equal(ctx.getToken(), '');
    assert.doesNotThrow(() => ctx.setToken('abc'));
    assert.doesNotThrow(() => ctx.clearToken());
    assert.equal(calls.warn.length, 3);
    for (const args of calls.warn) assert.ok(args.includes(bloqueado));
  });
});

// ── Qué ve el usuario en la pestaña de comisiones ──────────────────────────
// DOM mínimo: sólo los elementos que tocan goTab y actualizarBotonesSrv.
function domFalso() {
  const ids = [
    'main',
    'form-unknown-banner',
    'form-slots-banner',
    'form-closed-banner',
    'form-wrap',
    'comm-status-badge',
    'btn-req-illus',
    'btn-req-edit',
    'btn-req-print',
  ];
  const els = Object.fromEntries(
    ids.map((id) => [id, { id, style: {}, className: '', textContent: '', onclick: null }]),
  );
  return {
    els,
    document: { getElementById: (id) => els[id] ?? null, querySelectorAll: () => [] },
  };
}

function pestanaComisiones(page, estado) {
  const { els, document } = domFalso();
  const prelude = `
    let comisionesAbiertas = ${estado.abiertas};
    let slotsFull = ${estado.llenas};
    let waitlistFull = false;
    let estadoDesconocido = ${estado.desconocido};
  `;
  const ctx = load(
    page,
    ['goTab', 'actualizarBotonesSrv'],
    { document, t: (k) => k, abrirFormulario: () => {} },
    prelude,
  );
  ctx.goTab('comisiones');
  const visible = (id) => els[id].style.display === 'block';
  return {
    aviso: visible('form-unknown-banner'),
    llenas: visible('form-slots-banner'),
    cerradas: visible('form-closed-banner'),
    formulario: visible('form-wrap'),
    badge: [els['comm-status-badge'].className, els['comm-status-badge'].textContent],
    botones: els['btn-req-illus'].textContent,
  };
}

for (const page of ['index.html', 'mango.html', 'wuff.html']) {
  describe(`${page}: pestaña de comisiones`, () => {
    it('con la disponibilidad desconocida muestra sólo el aviso, sin asumir nada', () => {
      for (const abiertas of [true, false]) {
        for (const llenas of [true, false]) {
          const vista = pestanaComisiones(page, { abiertas, llenas, desconocido: true });
          assert.deepEqual(vista, {
            aviso: true,
            llenas: false,
            cerradas: false,
            formulario: false,
            badge: ['comm-badge badge-unknown', 'comm.badge.unknown'],
            // No manda a la waitlist (sería asumir cerradas o llenas).
            botones: 'services.request',
          });
        }
      }
    });

    it('con la disponibilidad conocida se comporta como antes', () => {
      const casos = [
        [{ abiertas: true, llenas: false }, 'formulario', 'badge-open', 'services.request'],
        [{ abiertas: true, llenas: true }, 'llenas', 'badge-full', 'services.waitlist'],
        [{ abiertas: false, llenas: false }, 'cerradas', 'badge-closed', 'services.waitlist'],
      ];
      for (const [estado, panel, clase, boton] of casos) {
        const vista = pestanaComisiones(page, { ...estado, desconocido: false });
        const paneles = ['aviso', 'llenas', 'cerradas', 'formulario'].filter((p) => vista[p]);
        assert.deepEqual(paneles, [panel]);
        assert.equal(vista.badge[0], `comm-badge ${clase}`);
        assert.equal(vista.botones, boton);
      }
    });
  });
}
