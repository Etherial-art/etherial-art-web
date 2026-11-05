/*
 * a11y.js — mejoras de accesibilidad sin cambiar el comportamiento visual.
 *
 * - Las opciones del formulario (.opt) son <div onclick>, así que no se podían
 *   usar con teclado ni las anunciaba un lector de pantalla. Aquí se les da
 *   role="radio"/"checkbox", tabindex y aria-checked sincronizado con la clase
 *   .selected, y Enter/Espacio disparan el mismo click que ya existía.
 * - Los grupos (.options-grid) reciben role="radiogroup"/"group" y se
 *   etiquetan con el <label class="field-label"> que los precede.
 * - Las piezas de la galería (.gallery-item) se pueden abrir con teclado.
 * - Al avanzar/retroceder de paso en el formulario, el foco se mueve al
 *   título del paso nuevo para que el usuario de teclado no se pierda.
 *
 * No toca formData ni las funciones selectOpt/toggleOpt: sólo llama a .click().
 */
(function () {
  'use strict';

  var uid = 0;
  function ensureId(el, prefix) {
    if (!el.id) el.id = prefix + '-' + ++uid;
    return el.id;
  }

  function isMulti(el) {
    return /toggleOpt\s*\(/.test(el.getAttribute('onclick') || '');
  }

  function syncOpt(el) {
    var disabled = el.classList.contains('disabled');
    el.setAttribute('aria-checked', el.classList.contains('selected') ? 'true' : 'false');
    el.tabIndex = disabled ? -1 : 0;
    if (disabled) el.setAttribute('aria-disabled', 'true');
    else el.removeAttribute('aria-disabled');
  }

  function upgradeGrid(grid) {
    if (grid.dataset.a11y) return;
    grid.dataset.a11y = '1';
    var opts = grid.querySelectorAll('.opt');
    var multi = false;
    for (var i = 0; i < opts.length; i++)
      if (isMulti(opts[i])) {
        multi = true;
        break;
      }
    grid.setAttribute('role', multi ? 'group' : 'radiogroup');
    var label = grid.previousElementSibling;
    while (label && label.tagName !== 'LABEL') label = label.previousElementSibling;
    if (label) {
      grid.setAttribute('aria-labelledby', ensureId(label, 'lbl-grp'));
    }
    for (var j = 0; j < opts.length; j++) upgradeOpt(opts[j], multi);
  }

  function upgradeOpt(el, multiGroup) {
    if (el.dataset.a11y) return;
    el.dataset.a11y = '1';
    var multi = isMulti(el) || (multiGroup && !el.getAttribute('onclick'));
    el.setAttribute('role', multi ? 'checkbox' : 'radio');
    syncOpt(el);
  }

  function upgradeGallery(el) {
    if (el.dataset.a11y) return;
    el.dataset.a11y = '1';
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    var img = el.querySelector('img');
    var name = (img && img.getAttribute('alt')) || '';
    el.setAttribute('aria-label', name ? 'Ampliar: ' + name : 'Ampliar imagen');
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var grids = root.querySelectorAll('.options-grid');
    for (var i = 0; i < grids.length; i++) upgradeGrid(grids[i]);
    var opts = root.querySelectorAll('.opt');
    for (var j = 0; j < opts.length; j++) upgradeOpt(opts[j], false);
    var gal = root.querySelectorAll('.gallery-item');
    for (var k = 0; k < gal.length; k++) upgradeGallery(gal[k]);
    if (root.classList && root.classList.contains('gallery-item')) upgradeGallery(root);
  }

  // Enter / Espacio activan los controles que no son <button>.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var t = e.target;
    if (!t || !t.matches) return;
    if (t.matches('.opt[role], .gallery-item[role="button"]')) {
      e.preventDefault();
      if (t.getAttribute('aria-disabled') !== 'true') t.click();
    }
  });

  // Foco al título del paso cuando cambia la sección activa del formulario.
  function focusStep(section) {
    var title = section.querySelector('.form-section-title');
    if (!title) return;
    if (!title.hasAttribute('tabindex')) title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'attributes') {
        var el = m.target;
        if (el.classList.contains('opt') && el.dataset.a11y) syncOpt(el);
        if (
          el.classList.contains('form-section') &&
          el.classList.contains('active') &&
          !(m.oldValue || '').split(/\s+/).includes('active')
        ) {
          var a = document.activeElement;
          // Sólo si el usuario venía interactuando con el formulario
          if (a && a.closest && a.closest('.form-section')) focusStep(el);
        }
      } else {
        for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]);
      }
    }
  });

  function init() {
    scan(document);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
