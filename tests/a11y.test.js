// Caracterización de a11y.js: qué atributos de accesibilidad pone y cómo
// responde al teclado y a los cambios del formulario, sobre las páginas reales.
// Usa jsdom (sin navegador). Los <script> de la página no se ejecutan: sólo
// a11y.js, que es lo que se prueba.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url);
const A11Y = readFileSync(new URL('a11y.js', ROOT), 'utf8');

// Carga la página, ejecuta a11y.js y espera a DOMContentLoaded, igual que en el
// navegador (el script se incluye con `defer`, y si el documento aún está
// cargando espera ese evento para hacer su primer recorrido).
async function pagina(nombre) {
  const html = readFileSync(new URL(nombre, ROOT), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const listo =
    window.document.readyState === 'loading'
      ? new Promise((resolve) => window.document.addEventListener('DOMContentLoaded', resolve))
      : Promise.resolve();
  window.eval(A11Y);
  await listo;
  return window;
}

// Deja que se procesen los MutationObserver pendientes.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

for (const nombre of ['index.html', 'mango.html', 'wuff.html']) {
  describe(`a11y.js en ${nombre}`, () => {
    it('convierte cada grupo de opciones en radiogroup/group etiquetado', async () => {
      const { document } = await pagina(nombre);
      const grids = [...document.querySelectorAll('.options-grid')];
      assert.ok(grids.length > 0);
      for (const grid of grids) {
        assert.equal(grid.dataset.a11y, '1');
        const multi = [...grid.querySelectorAll('.opt')].some((o) =>
          /toggleOpt\s*\(/.test(o.getAttribute('onclick') || ''),
        );
        assert.equal(grid.getAttribute('role'), multi ? 'group' : 'radiogroup');
        const labelledby = grid.getAttribute('aria-labelledby');
        if (labelledby) assert.equal(document.getElementById(labelledby).tagName, 'LABEL');
      }
    });

    it('da rol, tabindex y aria-checked a cada opción', async () => {
      const { document } = await pagina(nombre);
      const opts = [...document.querySelectorAll('.opt')];
      assert.ok(opts.length > 0);
      for (const opt of opts) {
        assert.match(opt.getAttribute('role'), /^(radio|checkbox)$/);
        assert.equal(
          opt.getAttribute('aria-checked'),
          opt.classList.contains('selected') ? 'true' : 'false',
        );
        const deshabilitada = opt.classList.contains('disabled');
        assert.equal(opt.tabIndex, deshabilitada ? -1 : 0);
        assert.equal(opt.getAttribute('aria-disabled'), deshabilitada ? 'true' : null);
      }
    });

    it('etiqueta las piezas de la galería como botones', async () => {
      const { document } = await pagina(nombre);
      const items = [...document.querySelectorAll('.gallery-item')];
      assert.ok(items.length > 0);
      for (const item of items) {
        assert.equal(item.getAttribute('role'), 'button');
        assert.equal(item.tabIndex, 0);
        const alt = item.querySelector('img')?.getAttribute('alt');
        assert.equal(item.getAttribute('aria-label'), alt ? `Ampliar: ${alt}` : 'Ampliar imagen');
      }
    });

    it('Enter y Espacio hacen click en opciones habilitadas, no en deshabilitadas', async () => {
      const window = await pagina(nombre);
      const [opt, otra] = window.document.querySelectorAll('.opt');
      let clicks = 0;
      opt.addEventListener('click', () => clicks++);
      for (const key of ['Enter', ' ', 'Spacebar', 'a']) {
        opt.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
      }
      assert.equal(clicks, 3);

      otra.setAttribute('aria-disabled', 'true');
      let clicksDeshabilitada = 0;
      otra.addEventListener('click', () => clicksDeshabilitada++);
      otra.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      assert.equal(clicksDeshabilitada, 0);
    });

    it('sincroniza aria-checked y tabindex cuando cambia la clase', async () => {
      const { document } = await pagina(nombre);
      const opt = document.querySelector('.opt');
      opt.classList.add('selected');
      await tick();
      assert.equal(opt.getAttribute('aria-checked'), 'true');
      opt.classList.add('disabled');
      await tick();
      assert.equal(opt.tabIndex, -1);
      assert.equal(opt.getAttribute('aria-disabled'), 'true');
    });

    it('mejora también el contenido que se agrega después', async () => {
      const { document } = await pagina(nombre);
      const extra = document.createElement('div');
      extra.innerHTML =
        '<div class="options-grid"><div class="opt" onclick="toggleOpt(this)">X</div></div>';
      document.body.appendChild(extra);
      await tick();
      const grid = extra.querySelector('.options-grid');
      assert.equal(grid.getAttribute('role'), 'group');
      assert.equal(extra.querySelector('.opt').getAttribute('role'), 'checkbox');
    });

    it('al cambiar de paso mueve el foco al título si se venía del formulario', async () => {
      const { document } = await pagina(nombre);
      // El formulario está en la pestaña de comisiones; un elemento oculto no
      // puede recibir foco, así que se abre esa pestaña como haría el usuario.
      for (const page of document.querySelectorAll('.page')) page.classList.remove('active');
      document.getElementById('page-comisiones').classList.add('active');
      const [actual, siguiente] = document.querySelectorAll('.form-section');
      const opt = actual.querySelector('.opt');
      opt.focus();
      assert.equal(document.activeElement, opt);
      actual.classList.remove('active');
      siguiente.classList.add('active');
      await tick();
      const titulo = siguiente.querySelector('.form-section-title');
      assert.equal(document.activeElement, titulo);
      assert.equal(titulo.tabIndex, -1);
    });
  });
}
