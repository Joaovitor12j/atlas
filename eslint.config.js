// Checagem estática dos módulos (npm run lint): imports que não existem, variáveis indefinidas e imports sem uso.
// Importante nas refatorações, porque o GJS só acusa import quebrado quando o Shell carrega o módulo.
import importPlugin from 'eslint-plugin-import';
const gjs = {console: 'readonly', global: 'readonly', imports: 'readonly', log: 'readonly', logError: 'readonly', print: 'readonly', ARGV: 'readonly', printerr: 'readonly',
    globalThis: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', TextDecoder: 'readonly', TextEncoder: 'readonly',
    URL: 'readonly', Intl: 'readonly', structuredClone: 'readonly', AbortController: 'readonly'};
export default [{
    files: ['**/*.js'],
    ignores: ['**/.run-*/**'],
    plugins: {import: importPlugin},
    languageOptions: {ecmaVersion: 2023, sourceType: 'module', globals: gjs},
    rules: {
        'no-undef': 'error',
        'no-unused-vars': ['warn', {args: 'none', caughtErrors: 'none'}],
        'import/named': 'error',
        'import/no-unresolved': ['error', {ignore: ['^gi://', '^resource:', '^system$']}],
        'no-dupe-keys': 'error', 'no-redeclare': 'error', 'no-const-assign': 'error',
    },
}];
