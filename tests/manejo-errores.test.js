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
  function __estado() {
    return { comisionesAbiertas, maxSlots, activeCount, slotsFull, maxWaitlist, waitlistFull };
  }
`;

const DEFAULTS = {
  comisionesAbiertas: true,
  maxSlots: 25,
  activeCount: 0,
  slotsFull: false,
  maxWaitlist: 50,
  waitlistFull: false,
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
    });

    it('si Supabase devuelve error lo registra y mantiene los valores por defecto', async () => {
      const { calls, estado } = await cargar(page, {
        config: { error: supabaseError },
        seguimiento_publico: { error: supabaseError },
        waitlist: { error: supabaseError },
      });
      assert.equal(calls.error.length, 3);
      for (const args of calls.error) assert.ok(args.includes(supabaseError));
      assert.deepEqual(estado, DEFAULTS);
    });

    it('si la consulta lanza (red caída) lo registra y mantiene los valores por defecto', async () => {
      const red = new TypeError('Failed to fetch');
      const { calls, estado } = await cargar(page, {
        config: { throw: red },
        seguimiento_publico: { throw: red },
        waitlist: { throw: red },
      });
      assert.equal(calls.error.length, 3);
      for (const args of calls.error) assert.ok(args.includes(red));
      assert.deepEqual(estado, DEFAULTS);
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
