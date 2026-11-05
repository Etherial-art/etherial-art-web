// Librerías de CDN: versión exacta y Subresource Integrity (SRI).
// Con `@latest` o solo la versión mayor, una versión nueva publicada por
// terceros entra al sitio sin que nadie la revise; con `integrity`, el
// navegador rechaza un archivo que no sea byte a byte el que se revisó.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const PAGINAS = ['index.html', 'mango.html', 'wuff.html', 'admin.html'];
const ROOT = new URL('..', import.meta.url);

// Google Fonts genera el CSS según el navegador: no admite SRI.
const SIN_SRI_POSIBLE = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

function recursosExternos(page) {
  const html = readFileSync(new URL(page, ROOT), 'utf8');
  const etiquetas = [...html.matchAll(/<(script|link)\b[^>]*>/g)].map((m) => m[0]);
  return (
    etiquetas
      .map((tag) => {
        const url = (tag.match(/\b(?:src|href)="(https:\/\/[^"]+)"/) || [])[1];
        const rel = (tag.match(/\brel="([^"]+)"/) || [])[1];
        return { tag, url, rel };
      })
      // Solo lo que el navegador descarga y ejecuta o aplica: scripts, hojas de
      // estilo y sus preload (canonical, iconos, etc. no son subrecursos).
      .filter(
        ({ tag, url, rel }) =>
          url &&
          !SIN_SRI_POSIBLE.test(url) &&
          (tag.startsWith('<script') || rel === 'stylesheet' || rel === 'preload'),
      )
  );
}

const integridadPorUrl = new Map();

for (const page of PAGINAS) {
  describe(`${page}: recursos de CDN`, () => {
    const recursos = recursosExternos(page);

    it('hay recursos externos que revisar', () => {
      assert.ok(recursos.length > 0);
    });

    for (const { tag, url } of recursos) {
      it(`${url} tiene versión exacta`, () => {
        assert.match(url, /@\d+\.\d+\.\d+\//, 'falta @X.Y.Z/ en la URL');
      });

      it(`${url} tiene integrity sha384 y crossorigin`, () => {
        assert.match(tag, /\bintegrity="sha384-[A-Za-z0-9+/]{64}"/);
        assert.match(tag, /\bcrossorigin="anonymous"/);
      });

      it(`${url} usa el mismo hash en todas las páginas`, () => {
        const hash = (tag.match(/\bintegrity="([^"]+)"/) || [])[1];
        if (!integridadPorUrl.has(url)) integridadPorUrl.set(url, hash);
        assert.equal(hash, integridadPorUrl.get(url));
      });
    }
  });
}
