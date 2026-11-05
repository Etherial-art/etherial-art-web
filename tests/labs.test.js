// Pestaña Labs del panel (bloque 5): lista, filtros, vista previa en un iframe
// con sandbox y URLs que solo pueden apuntar a labs.etherialart.com.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { functionSources } from './extract.js';

const ESCAPE_JS = readFileSync(new URL('../js/escape.js', import.meta.url), 'utf8');
const ADMIN_HTML = readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const MALO = '<img src=x onerror="window.__xss=1">';

const HTML = `<div id="labs-avisos"></div><div id="labs-lista"></div>
  <section id="lab-preview" hidden><h2 id="lab-preview-titulo"></h2><a id="lab-preview-abrir"></a>
  <p id="lab-preview-nota"></p><div id="lab-preview-marco"></div></section>
  <button data-estado-lab="todos"></button><button data-estado-lab="borrador"></button>`;

const LABS = [
  {
    slug: 'hola-labs',
    nombre: MALO,
    descripcion: MALO,
    fecha: '2026-11-05',
    estado: 'publicado',
    dispositivo: false,
    url: 'https://labs.etherialart.com/labs/hola-labs/',
  },
  {
    slug: 'sensor-luz',
    nombre: 'Sensor',
    descripcion: 'WebSerial',
    fecha: '2026-11-20',
    estado: 'borrador',
    dispositivo: true,
    url: null,
  },
  {
    slug: 'trampa',
    nombre: 'Trampa',
    descripcion: 'URL que no coincide con el slug',
    fecha: '2026-11-01',
    estado: 'publicado',
    url: 'https://evil.example/',
  },
  {
    slug: 'disp',
    nombre: 'Con dispositivo',
    descripcion: 'x',
    fecha: '2026-11-02',
    estado: 'archivado',
    dispositivo: true,
    url: 'https://labs.etherialart.com/labs/disp/',
  },
];

function panel(respuesta) {
  const dom = new JSDOM(`<!doctype html><body>${HTML}</body>`);
  const toasts = [];
  const ctx = vm.createContext({
    document: dom.window.document,
    console: { warn() {}, error() {} },
    showToast: (m, t) => toasts.push([m, t]),
    textoError: (e) => e.message,
    async adminJson(path) {
      assert.equal(path, '/admin/labs');
      if (respuesta instanceof Error) throw respuesta;
      return respuesta;
    },
  });
  vm.runInContext(ESCAPE_JS, ctx);
  const constantes = ['LABS_ORIGEN', 'PATRON_SLUG_LAB', 'ETIQUETA_LAB']
    .map((n) => ADMIN_HTML.match(new RegExp(`const ${n} = [^\\n]+;`))[0])
    .join('\n');
  vm.runInContext(
    `${constantes}
     let labsItems = [];
     let filtroLabs = 'todos';
     ${functionSources('admin.html', [
       'urlLab',
       'cargarLabs',
       'setFiltroLabs',
       'renderLabs',
       'abrirPreviewLab',
       'cerrarPreviewLab',
       'jsArg',
     ])}`,
    ctx,
  );
  return { ctx, doc: dom.window.document, toasts };
}

describe('admin.html: labs', () => {
  it('lista los labs escapados, con avisos del backend', async () => {
    const { ctx, doc } = panel({ labs: LABS, advertencias: ['<b>Sin token</b>'] });
    await ctx.cargarLabs();
    assert.equal(doc.querySelectorAll('.lab-card').length, 4);
    assert.equal(doc.querySelectorAll('#labs-lista img, #labs-avisos b').length, 0);
    assert.ok(doc.getElementById('labs-lista').textContent.includes(MALO));
    assert.match(doc.getElementById('labs-avisos').textContent, /<b>Sin token<\/b>/);
  });

  it('los borradores no tienen vista previa; las URLs raras tampoco', async () => {
    const { ctx, doc } = panel({ labs: LABS });
    await ctx.cargarLabs();
    const tarjetas = [...doc.querySelectorAll('.lab-card')];
    const conPreview = tarjetas.map((t) => Boolean(t.querySelector('a[href]')));
    assert.deepEqual(conPreview, [true, false, false, true]);
    assert.ok(!doc.getElementById('labs-lista').innerHTML.includes('evil.example'));
  });

  it('filtra por estado', async () => {
    const { ctx, doc } = panel({ labs: LABS });
    await ctx.cargarLabs();
    ctx.setFiltroLabs('borrador');
    assert.equal(doc.querySelectorAll('.lab-card').length, 1);
    assert.equal(
      doc.querySelector('[data-estado-lab="borrador"]').getAttribute('aria-pressed'),
      'true',
    );
  });

  it('la vista previa es un iframe con sandbox solo allow-scripts', async () => {
    const { ctx, doc } = panel({ labs: LABS });
    await ctx.cargarLabs();
    ctx.abrirPreviewLab('hola-labs');
    const iframe = doc.querySelector('#lab-preview-marco iframe');
    assert.equal(iframe.getAttribute('sandbox'), 'allow-scripts');
    assert.equal(iframe.getAttribute('referrerpolicy'), 'no-referrer');
    assert.equal(iframe.getAttribute('src'), 'https://labs.etherialart.com/labs/hola-labs/');
    assert.equal(doc.getElementById('lab-preview').hidden, false);
    assert.equal(doc.getElementById('lab-preview-titulo').textContent, MALO);
  });

  it('avisa que los dispositivos no funcionan en la vista previa', async () => {
    const { ctx, doc } = panel({ labs: LABS });
    await ctx.cargarLabs();
    ctx.abrirPreviewLab('disp');
    assert.match(doc.getElementById('lab-preview-nota').textContent, /pestaña nueva/);
  });

  it('no abre una URL que no sea la del slug en labs.etherialart.com', async () => {
    const { ctx, doc, toasts } = panel({ labs: LABS });
    await ctx.cargarLabs();
    ctx.abrirPreviewLab('trampa');
    assert.equal(doc.querySelector('#lab-preview-marco iframe'), null);
    assert.equal(toasts[0][1], 'error');
  });

  it('cerrar quita el iframe (detiene el lab)', async () => {
    const { ctx, doc } = panel({ labs: LABS });
    await ctx.cargarLabs();
    ctx.abrirPreviewLab('hola-labs');
    ctx.cerrarPreviewLab();
    assert.equal(doc.querySelector('#lab-preview-marco iframe'), null);
    assert.equal(doc.getElementById('lab-preview').hidden, true);
  });

  it('si falla la carga, lo dice', async () => {
    const { ctx, doc } = panel(new Error('No se pudo leer la lista de labs'));
    await ctx.cargarLabs();
    assert.match(
      doc.getElementById('labs-lista').textContent,
      /No se pudieron cargar los labs: No se pudo leer/,
    );
  });

  it('los enlaces a labs abren sin opener ni referrer', () => {
    for (const m of ADMIN_HTML.matchAll(/<a[^>]*target="_blank"[^>]*>/g)) {
      if (m[0].includes('lab')) assert.match(m[0], /rel="noopener noreferrer"/);
    }
    assert.match(ADMIN_HTML, /setAttribute\('sandbox', 'allow-scripts'\)/);
    assert.doesNotMatch(ADMIN_HTML, /sandbox['"]?[,=]\s*['"][^'"]*allow-same-origin/);
  });
});
