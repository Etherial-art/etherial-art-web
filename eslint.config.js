// Configuración de ESLint (flat config). Ver docs/CODING_STANDARDS.md.
import js from '@eslint/js';
import html from 'eslint-plugin-html';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'img/**'],
  },
  js.configs.recommended,
  {
    // El JS del sitio: <script> inline en cada página y scripts sueltos
    // (p. ej. a11y.js) que se cargan con <script src>.
    files: ['**/*.html', '**/*.js'],
    ignores: ['eslint.config.js', 'tests/**'],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2024,
      // Scripts clásicos (no módulos): las funciones de nivel superior son
      // globales porque se invocan desde atributos onclick="..." del HTML.
      sourceType: 'script',
      globals: {
        ...globals.browser,
        supabase: 'readonly', // <script src="@supabase/supabase-js">
        GLightbox: 'readonly', // <script src="glightbox">
      },
    },
    rules: {
      // Las funciones globales se usan desde el HTML; ESLint no ve ese uso.
      'no-unused-vars': ['error', { vars: 'local', args: 'after-used', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-implicit-globals': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    // ── DEUDA TÉCNICA (línea base) ────────────────────────────────────────
    // a11y.js usa `var`. Pasar a let/const puede cambiar el alcance de las
    // variables, así que se hace en un PR propio. Al corregirlo, borrar este bloque.
    files: ['a11y.js'],
    rules: {
      'no-var': 'warn',
    },
  },
  {
    // ── Configuración y pruebas (Node, módulos ES) ────────────────────────
    files: ['eslint.config.js', 'tests/**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node },
  },
];
