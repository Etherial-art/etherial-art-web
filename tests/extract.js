// Extrae funciones del <script> inline de una página para probarlas en Node,
// sin navegador. Se parsea el JS con espree (el mismo parser de ESLint), así
// que se prueba el código real de la página, no una copia.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as espree from 'espree';

const ROOT = new URL('..', import.meta.url);

function inlineScripts(page) {
  const html = readFileSync(new URL(page, ROOT), 'utf8');
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/**
 * Devuelve el código fuente de las declaraciones de nivel superior pedidas:
 * funciones y también `const`/`let` de un solo nombre (p. ej. constantes que
 * deben probarse tal como están en la página, sin copiarlas en la prueba).
 */
export function functionSources(page, names) {
  const found = new Map();
  for (const src of inlineScripts(page)) {
    const ast = espree.parse(src, { ecmaVersion: 2024, range: true });
    for (const node of ast.body) {
      const name =
        node.type === 'FunctionDeclaration'
          ? node.id.name
          : node.type === 'VariableDeclaration' && node.declarations.length === 1
            ? node.declarations[0].id.name
            : null;
      if (name && names.includes(name)) found.set(name, src.slice(...node.range));
    }
  }
  const missing = names.filter((n) => !found.has(n));
  if (missing.length) throw new Error(`${page}: no se encontró ${missing.join(', ')}`);
  return names.map((n) => found.get(n)).join('\n');
}

/**
 * Ejecuta las funciones en un contexto aislado con los globals dados.
 * `prelude` permite declarar variables de nivel superior que usan.
 */
export function load(page, names, globals, prelude = '') {
  const context = vm.createContext({ ...globals });
  vm.runInContext(`${prelude}\n${functionSources(page, names)}`, context);
  return context;
}

/** console falso que guarda las llamadas a warn y error. */
export function fakeConsole() {
  const calls = { warn: [], error: [] };
  return {
    calls,
    console: {
      warn: (...args) => calls.warn.push(args),
      error: (...args) => calls.error.push(args),
    },
  };
}
