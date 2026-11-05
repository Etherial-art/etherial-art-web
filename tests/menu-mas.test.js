// Menú "Más" de la barra inferior (index.html): qué pestañas mueve al panel y
// cómo responde al teclado, al lector de pantalla (aria-*) y a goTab.
// Usa jsdom sobre la página real y ejecuta sólo iniciarMenuMas, extraída del
// <script> inline con espree (ver extract.js).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';
import { functionSources } from './extract.js';

const ROOT = new URL('..', import.meta.url);
const FUENTE = functionSources('index.html', ['iniciarMenuMas']);

function pagina() {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  const { window } = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  const { document } = window;
  // Doble de goTab: marca la pestaña activa igual que la función real.
  window.llamadas = [];
  window.goTab = (nombre) => {
    window.llamadas.push(nombre);
    document
      .querySelectorAll('.tab')
      .forEach((t) => t.classList.toggle('active', t.dataset.tab === nombre));
  };
  window.eval(`${FUENTE}\niniciarMenuMas();`);
  const $ = (sel) => document.querySelector(sel);
  return { window, document, $, boton: $('#tab-more'), panel: $('#more-menu') };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const tecla = (window, el, key) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));

describe('menú "Más" en index.html', () => {
  it('deja 4 pestañas en la barra y mueve Sobre mí y Portafolio al panel', () => {
    const { document, $ } = pagina();
    assert.ok($('.tabbar').classList.contains('has-more'));
    const visibles = [...document.querySelectorAll('.tab:not(.tab-secondary):not(.tab-more)')];
    assert.deepEqual(
      visibles.map((t) => t.dataset.tab),
      ['inicio', 'comisiones', 'seguimiento', 'contacto'],
    );
    const items = [...document.querySelectorAll('#more-menu .more-item')];
    assert.deepEqual(
      items.map((i) => i.dataset.tab),
      ['sobre', 'portafolio'],
    );
  });

  it('empieza cerrado y expone su estado con aria-expanded/aria-controls', () => {
    const { boton, panel } = pagina();
    assert.equal(boton.tagName, 'BUTTON');
    assert.equal(boton.getAttribute('aria-expanded'), 'false');
    assert.equal(boton.getAttribute('aria-controls'), 'more-menu');
    assert.equal(panel.hidden, true);
    assert.equal(panel.getAttribute('aria-labelledby'), 'tab-more');
  });

  it('al abrir muestra el panel, copia los textos de las pestañas y enfoca el primero', () => {
    const { document, boton, panel, $ } = pagina();
    $('.tab[data-tab="sobre"] span').textContent = 'About';
    boton.click();
    assert.equal(boton.getAttribute('aria-expanded'), 'true');
    assert.equal(panel.hidden, false);
    const primero = panel.querySelector('.more-item');
    assert.equal(primero.textContent, 'About');
    assert.equal(document.activeElement, primero);
    assert.equal(primero.querySelector('i').getAttribute('aria-hidden'), 'true');
  });

  it('flechas, Inicio y Fin mueven el foco dentro del panel', () => {
    const { window, document, boton, panel } = pagina();
    boton.click();
    const [a, b] = panel.querySelectorAll('.more-item');
    tecla(window, a, 'ArrowDown');
    assert.equal(document.activeElement, b);
    tecla(window, b, 'ArrowDown');
    assert.equal(document.activeElement, a);
    tecla(window, a, 'ArrowUp');
    assert.equal(document.activeElement, b);
    tecla(window, b, 'Home');
    assert.equal(document.activeElement, a);
    tecla(window, a, 'End');
    assert.equal(document.activeElement, b);
  });

  it('Escape cierra y devuelve el foco al botón "Más"', () => {
    const { window, document, boton, panel } = pagina();
    boton.click();
    tecla(window, panel.querySelector('.more-item'), 'Escape');
    assert.equal(boton.getAttribute('aria-expanded'), 'false');
    assert.equal(panel.hidden, true);
    assert.equal(document.activeElement, boton);
  });

  it('elegir una sección llama a goTab, cierra y marca "Más" como activo', async () => {
    const { window, document, boton, panel } = pagina();
    boton.click();
    panel.querySelector('[data-tab="portafolio"]').click();
    await tick();
    assert.deepEqual(window.llamadas, ['portafolio']);
    assert.equal(panel.hidden, true);
    assert.equal(document.activeElement, boton);
    assert.ok(boton.classList.contains('active'));
    const item = panel.querySelector('[data-tab="portafolio"]');
    assert.equal(item.getAttribute('aria-current'), 'page');
  });

  it('"Más" deja de estar activo al volver a una pestaña principal', async () => {
    const { window, boton, panel } = pagina();
    window.goTab('sobre');
    await tick();
    assert.ok(boton.classList.contains('active'));
    window.goTab('inicio');
    await tick();
    assert.ok(!boton.classList.contains('active'));
    assert.equal(panel.querySelector('[aria-current]'), null);
  });

  it('un clic fuera cierra sin mover el foco; un clic en el botón abierto lo cierra', () => {
    const { document, boton, panel } = pagina();
    boton.click();
    document.body.click();
    assert.equal(panel.hidden, true);
    boton.click();
    assert.equal(panel.hidden, false);
    boton.click();
    assert.equal(panel.hidden, true);
  });
});
