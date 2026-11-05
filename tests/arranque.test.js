// Arranque de index.html: supabase-js se carga después del script principal
// (para no bloquear el primer pintado), así que ese script no puede depender de
// la librería al ejecutarse. Aquí se ejecutan los <script> inline reales en
// jsdom, sin cargar supabase-js ni ninguna librería externa.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = new URL('..', import.meta.url);
const HTML = readFileSync(new URL('index.html', ROOT), 'utf8');

async function arrancar({ tema = null, idioma = 'en-US', prefiereOscuro = false } = {}) {
  const errores = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errores.push(e.message));
  const dom = new JSDOM(HTML, {
    url: 'https://etherialart.com/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      if (tema) window.localStorage.setItem('ea-theme', tema);
      Object.defineProperty(window.navigator, 'language', { value: idioma });
      window.matchMedia = (q) => ({
        matches: prefiereOscuro && q.includes('dark'),
        addEventListener() {},
      });
      // Dobles de lo que la página espera del navegador o de otras librerías.
      window.GLightbox = () => {};
      window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
      };
    },
  });
  const { window } = dom;
  const html = window.document.documentElement;
  // Estado justo al terminar los scripts, antes de DOMContentLoaded.
  const antesDeDCL = { tema: html.getAttribute('data-theme'), idioma: html.lang };
  await new Promise((resolve) => {
    if (window.document.readyState !== 'loading') resolve();
    else window.document.addEventListener('DOMContentLoaded', resolve);
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { window, errores, antesDeDCL };
}

describe('arranque de index.html sin supabase-js', () => {
  it('el script principal no lanza aunque supabase-js no haya cargado', async () => {
    const { errores } = await arrancar();
    assert.deepEqual(errores, []);
  });

  it('aplica tema e idioma al ejecutarse, sin esperar a DOMContentLoaded', async () => {
    const { antesDeDCL, window } = await arrancar({ tema: 'dark', idioma: 'de-DE' });
    assert.deepEqual(antesDeDCL, { tema: 'dark', idioma: 'de' });
    assert.equal(window.document.getElementById('theme-icon').className, 'ti ti-sun');
  });

  it('sin tema guardado usa el del sistema', async () => {
    const oscuro = await arrancar({ prefiereOscuro: true });
    assert.equal(oscuro.antesDeDCL.tema, 'dark');
    const claro = await arrancar({ prefiereOscuro: false });
    assert.equal(claro.antesDeDCL.tema, 'light');
  });

  it('crea el cliente de Supabase una sola vez, al primer uso (from y rpc)', async () => {
    const { window } = await arrancar();
    const creados = [];
    window.supabase = {
      createClient: (url, key) => {
        creados.push([url, key]);
        return { from: (tabla) => ({ tabla }), rpc: (funcion, args) => ({ funcion, args }) };
      },
    };
    assert.deepEqual(window.eval("db.from('config')"), { tabla: 'config' });
    assert.deepEqual(window.eval("db.rpc('contar_waitlist')"), {
      funcion: 'contar_waitlist',
      args: undefined,
    });
    assert.equal(creados.length, 1);
    assert.match(creados[0][0], /^https:\/\/[a-z0-9]+\.supabase\.co$/);
  });

  it('si supabase-js no carga, las consultas fallan dentro de su try/catch', async () => {
    const { window } = await arrancar();
    assert.throws(() => window.eval("db.from('config')"), /createClient/);
  });
});
