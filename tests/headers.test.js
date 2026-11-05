// Cabeceras HTTP que Cloudflare añade a todas las páginas (archivo _headers).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ARCHIVO = new URL('../_headers', import.meta.url);

// Formato de Cloudflare: una línea con la ruta y debajo "  Nombre: valor".
function leerHeaders() {
  const reglas = new Map();
  let ruta = null;
  for (const linea of readFileSync(ARCHIVO, 'utf8').split('\n')) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    if (!/^\s/.test(linea)) {
      ruta = linea.trim();
      reglas.set(ruta, new Map());
    } else {
      const i = linea.indexOf(':');
      reglas.get(ruta).set(linea.slice(0, i).trim().toLowerCase(), linea.slice(i + 1).trim());
    }
  }
  return reglas;
}

describe('_headers', () => {
  it('existe', () => assert.ok(existsSync(ARCHIVO)));

  it('aplica a todo el sitio', () => {
    const todas = leerHeaders().get('/*');
    assert.ok(todas, 'falta la regla /*');
    assert.equal(todas.get('x-content-type-options'), 'nosniff');
    assert.equal(todas.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(todas.get('x-frame-options'), 'DENY');
    assert.equal(todas.get('content-security-policy'), "frame-ancestors 'none'");
    assert.match(todas.get('permissions-policy'), /camera=\(\)/);
  });

  it('la CSP solo restringe quién enmarca el sitio (no bloquea scripts ni estilos)', () => {
    // Una CSP de scripts necesita probarse antes en Report-Only: el sitio
    // tiene muchos onclick inline y librerías de CDN.
    const csp = leerHeaders().get('/*').get('content-security-policy');
    assert.doesNotMatch(csp, /script-src|default-src|style-src/);
  });
});
