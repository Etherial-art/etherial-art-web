// index.html no carga tabler-icons.min.css completo (240 KB, bloqueaba el
// primer pintado): lleva en su <style> un subconjunto con los iconos que usa.
// Esta prueba evita que un icono nuevo se vea vacío: cada `ti-*` que aparece en
// la página (HTML o JS) necesita su regla y una @font-face que cubra su código.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ROOT = new URL('..', import.meta.url);
const html = readFileSync(new URL('index.html', ROOT), 'utf8');
const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
const resto = html.slice(html.indexOf('</style>'));

// Iconos usados fuera del <style>: clases `ti ti-nombre` en el HTML y en las
// plantillas o classList del JS.
const usados = [
  ...new Set([...resto.matchAll(/\bti-([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((m) => m[1])),
];

const reglas = new Map(
  [...css.matchAll(/\.ti-([a-z0-9-]+):before\s*\{\s*content:\s*'\\([0-9a-f]+)'/g)].map((m) => [
    m[1],
    parseInt(m[2], 16),
  ]),
);

const rangos = [...css.matchAll(/@font-face\s*\{[^}]*font-family:\s*'tabler-icons'[^}]*\}/g)].map(
  (m) =>
    /unicode-range:\s*([^;}]+)/
      .exec(m[0])[1]
      .split(',')
      .map((parte) => {
        const [a, b] = parte.trim().replace('U+', '').split('-');
        return [parseInt(a, 16), parseInt(b ?? a, 16)];
      }),
);

describe('subconjunto de iconos en index.html', () => {
  it('la página usa iconos y el subconjunto tiene reglas', () => {
    assert.ok(usados.length > 10, `sólo se encontraron ${usados.length} iconos`);
    assert.ok(reglas.size > 0);
    assert.ok(rangos.length > 0);
  });

  it('cada icono usado tiene su regla .ti-NOMBRE:before', () => {
    const faltan = usados.filter((nombre) => !reglas.has(nombre));
    assert.deepEqual(faltan, [], `faltan reglas para: ${faltan.join(', ')}`);
  });

  it('cada regla del subconjunto tiene una @font-face que cubre su código', () => {
    const sinFuente = [...reglas].filter(
      ([, cp]) => !rangos.some((rango) => rango.some(([a, b]) => cp >= a && cp <= b)),
    );
    assert.deepEqual(
      sinFuente.map(([nombre]) => nombre),
      [],
    );
  });

  it('la página ya no carga tabler-icons.min.css completo', () => {
    assert.doesNotMatch(html, /<link[^>]+tabler-icons(\.min)?\.css/);
  });
});
