// Escape de datos externos antes de meterlos en HTML. Lo usan las páginas del
// sitio y el panel admin: todo texto que viene de la base o de clientes pasa
// por aquí antes de entrar en innerHTML.

/* exported esc, rutaImagen */
/* eslint-disable no-redeclare -- aquí se definen; eslint.config.js las declara globales para las páginas */

// Texto seguro dentro de elementos y de atributos entre comillas.
function esc(valor) {
  if (valor == null) return '';
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Ruta "img/<archivo>" segura en src, data-href y url('…') de CSS.
// encodeURIComponent no codifica ' ( ) * !, que cerrarían un url('…').
function rutaImagen(nombre) {
  const codificado = encodeURIComponent(String(nombre ?? '')).replace(
    /['()*!]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
  return 'img/' + codificado;
}
