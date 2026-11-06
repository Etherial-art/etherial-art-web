// Formulario abierto desde el correo de Ko-fi (?folio=…&token=…): el token del
// enlace se manda al backend para guardar los detalles de ese pedido.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fakeConsole, functionSources, load } from './extract.js';

const PAGINAS = ['index.html', 'mango.html', 'wuff.html'];

const NOMBRES = [
  'ADVERTENCIA_CORREO_CLIENTE',
  'ADVERTENCIA_AVISO_NIKO',
  'avisoExito',
  'clasificarAdvertencias',
  'pintarAvisoExito',
  'enviarComision',
];

function domFalso() {
  const els = new Map();
  const el = (id) => {
    if (!els.has(id)) {
      els.set(id, {
        id,
        value: '',
        style: {},
        textContent: '',
        innerHTML: '',
        disabled: false,
        classList: { add() {}, remove() {} },
      });
    }
    return els.get(id);
  };
  return { el, document: { getElementById: el } };
}

function pagina(page, { folio, token, status = 200, respuesta }) {
  const { el, document } = domFalso();
  const { console } = fakeConsole();
  const peticiones = [];
  const toasts = [];
  const ctx = load(
    page,
    NOMBRES,
    {
      document,
      console,
      t: (k) => k,
      showToast: (msg) => toasts.push(msg),
      fetch: async (url, opciones) => {
        peticiones.push({ url, opciones });
        return { ok: status < 400, status, json: async () => respuesta };
      },
    },
    `
      const RAILWAY_URL = 'https://api.test';
      let folioKofi = ${JSON.stringify(folio)};
      let tokenKofi = ${JSON.stringify(token)};
      const formData = { tos: true };
    `,
  );
  return { ctx, el, peticiones, toasts };
}

const OK = { status: 'ok', folio: '#0007' };

for (const page of PAGINAS) {
  describe(`${page}: detalles de un pedido de Ko-fi`, () => {
    it('lee el token del enlace junto con el folio', () => {
      assert.match(functionSources(page, ['tokenKofi']), /let tokenKofi = null/);
      // La lectura de ?token= vive dentro del arranque de la página (no es una
      // función aparte), así que se comprueba en el HTML.
      const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
      assert.match(html, /folioKofi = pFolio;\s*tokenKofi = p\.get\('token'\);/);
    });

    it('manda el token del enlace en X-Detalles-Token', async () => {
      const { ctx, peticiones } = pagina(page, { folio: '7', token: 'tok-7', respuesta: OK });
      await ctx.enviarComision();
      assert.equal(peticiones[0].url, 'https://api.test/comisiones/7/detalles');
      assert.equal(peticiones[0].opciones.method, 'PATCH');
      assert.equal(peticiones[0].opciones.headers['X-Detalles-Token'], 'tok-7');
      assert.equal(peticiones[0].opciones.headers['Content-Type'], 'application/json');
    });

    it('una solicitud nueva (sin folio) no manda el header', async () => {
      const { ctx, peticiones } = pagina(page, { folio: null, token: null, respuesta: OK });
      await ctx.enviarComision();
      assert.equal(peticiones[0].url, 'https://api.test/comisiones/nueva');
      assert.equal('X-Detalles-Token' in peticiones[0].opciones.headers, false);
    });

    for (const status of [401, 403]) {
      it(`si el backend no acepta el enlace (${status}) lo dice, no "error genérico"`, async () => {
        const { ctx, toasts, el } = pagina(page, {
          folio: '7',
          token: null,
          status,
          respuesta: { detail: 'x' },
        });
        await ctx.enviarComision();
        assert.deepEqual(toasts, ['form.link.invalid']);
        assert.equal(el('btn-submit').disabled, false);
      });
    }

    it('otros errores siguen mostrando el mensaje genérico', async () => {
      const { ctx, toasts } = pagina(page, {
        folio: '7',
        token: 'tok-7',
        status: 409,
        respuesta: { detail: 'x' },
      });
      await ctx.enviarComision();
      assert.deepEqual(toasts, ['form.error']);
    });
  });
}
