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
    // El JS vive en <script> inline dentro de cada página.
    files: ['**/*.html'],
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
    // `catch (e) {}` vacíos que existían al adoptar estos estándares. Corregirlos
    // implica decidir qué hacer con el error (cambio de lógica), así que van en
    // PRs propios. Al corregir un archivo, QUITARLO de esta lista.
    files: ['index.html', 'mango.html', 'wuff.html'],
    rules: {
      'no-empty': 'warn',
    },
  },
];
