// Advertencias que devuelve /comisiones/nueva cuando un correo falla después
// de guardar la solicitud (backend: utils.enviar_tras_guardar).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fakeConsole, functionSources, load } from './extract.js';

const PAGINAS = ['index.html', 'mango.html', 'wuff.html'];

// Contrato con el backend (niko-studio, utils.enviar_tras_guardar devuelve
// "No se pudo enviar {que}."). Si los textos cambian allá, cambian aquí.
const DEL_BACKEND = {
  correoCliente: 'No se pudo enviar el correo de confirmación al cliente.',
  avisoNiko: 'No se pudo enviar el aviso de la nueva solicitud a Niko.',
};

const NOMBRES = [
  'ADVERTENCIA_CORREO_CLIENTE',
  'ADVERTENCIA_AVISO_NIKO',
  'avisoExito',
  'clasificarAdvertencias',
  'pintarAvisoExito',
  'enviarComision',
];

// Variables de la página que usa enviarComision (valores de prueba).
const PRELUDE = `
  const RAILWAY_URL = 'https://api.test';
  let folioKofi = null;
  const formData = { tos: true };
`;

// DOM falso: cada elemento se crea la primera vez que se pide.
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

// Carga la página con un backend falso que responde `respuesta`.
function pagina(page, respuesta) {
  const { el, document } = domFalso();
  const { calls, console } = fakeConsole();
  const idioma = { actual: 'es' };
  const peticiones = [];
  const ctx = load(
    page,
    NOMBRES,
    {
      document,
      console,
      t: (k) => `${idioma.actual}:${k}`,
      showToast: () => {},
      fetch: async (url, opciones) => {
        peticiones.push({ url, opciones });
        return { json: async () => respuesta };
      },
    },
    PRELUDE,
  );
  return { ctx, el, calls, idioma, peticiones };
}

const OK = { status: 'ok', folio: '#0042', mensaje: 'Solicitud recibida. Revisa tu correo.' };

for (const page of PAGINAS) {
  describe(`${page}: advertencias al enviar una comisión`, () => {
    it('las constantes coinciden con los textos del backend', () => {
      const src = functionSources(page, ['ADVERTENCIA_CORREO_CLIENTE', 'ADVERTENCIA_AVISO_NIKO']);
      assert.ok(src.includes(`'${DEL_BACKEND.correoCliente}'`));
      assert.ok(src.includes(`'${DEL_BACKEND.avisoNiko}'`));
    });

    it('clasifica las advertencias (y registra las desconocidas)', () => {
      const { ctx, calls } = pagina(page, OK);
      const c = (lista) => ({ ...ctx.clasificarAdvertencias(lista) });
      const nada = { sinCorreo: false, sinAvisoNiko: false, otras: false };
      assert.deepEqual(c(undefined), nada);
      assert.deepEqual(c([]), nada);
      assert.deepEqual(c([DEL_BACKEND.correoCliente]), { ...nada, sinCorreo: true });
      assert.deepEqual(c([DEL_BACKEND.avisoNiko]), { ...nada, sinAvisoNiko: true });
      assert.deepEqual(calls.warn, []);
      assert.deepEqual(c(['Algo nuevo.']), { ...nada, otras: true });
      assert.deepEqual(calls.warn[0][1], ['Algo nuevo.']);
    });

    it('sin advertencias la pantalla de éxito queda como antes', async () => {
      const { ctx, el, peticiones } = pagina(page, OK);
      await ctx.enviarComision();
      assert.equal(peticiones[0].url, 'https://api.test/comisiones/nueva');
      assert.equal(el('form-success').style.display, 'block');
      assert.equal(el('success-folio').textContent, '#0042');
      assert.equal(el('success-title').textContent, 'es:form.success.title');
      assert.equal(el('success-warning').style.display, 'none');
    });

    it('si no salió el correo: "solicitud recibida", el folio y que lo guarde', async () => {
      const { ctx, el } = pagina(page, { ...OK, advertencias: [DEL_BACKEND.correoCliente] });
      await ctx.enviarComision();
      assert.equal(el('success-folio').textContent, '#0042');
      assert.equal(el('success-title').textContent, 'es:form.success.received');
      assert.equal(el('success-warning').style.display, 'block');
      assert.equal(el('success-warning').innerHTML, '<p>es:form.success.no_email</p>');
    });

    it('si no salió el aviso a Niko, lo dice sin cambiar el título', async () => {
      const { ctx, el } = pagina(page, { ...OK, advertencias: [DEL_BACKEND.avisoNiko] });
      await ctx.enviarComision();
      assert.equal(el('success-title').textContent, 'es:form.success.title');
      assert.equal(el('success-warning').innerHTML, '<p>es:form.success.no_notice</p>');
    });

    it('con ambas advertencias muestra las dos', async () => {
      const advertencias = [DEL_BACKEND.correoCliente, DEL_BACKEND.avisoNiko];
      const { ctx, el } = pagina(page, { ...OK, advertencias });
      await ctx.enviarComision();
      assert.equal(
        el('success-warning').innerHTML,
        '<p>es:form.success.no_email</p><p>es:form.success.no_notice</p>',
      );
    });

    it('al cambiar de idioma el aviso se vuelve a pintar en el nuevo idioma', async () => {
      const { ctx, el, idioma } = pagina(page, {
        ...OK,
        advertencias: [DEL_BACKEND.correoCliente],
      });
      await ctx.enviarComision();
      idioma.actual = 'de';
      ctx.pintarAvisoExito(); // lo que hace applyTranslations al cambiar de idioma
      assert.equal(el('success-title').textContent, 'de:form.success.received');
      assert.equal(el('success-warning').innerHTML, '<p>de:form.success.no_email</p>');
      assert.ok(functionSources(page, ['applyTranslations']).includes('pintarAvisoExito();'));
    });

    it('existen las traducciones es/en/de', () => {
      const src = functionSources(page, ['i18n']);
      for (const clave of [
        'form.success.received',
        'form.success.no_email',
        'form.success.no_notice',
        'form.success.other_warning',
      ]) {
        assert.equal(src.split(`'${clave}'`).length - 1, 3, `${clave} en es/en/de`);
      }
    });
  });
}
