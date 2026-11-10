// Checagem estática dos módulos (npm run lint): imports que não existem, variáveis indefinidas, imports sem uso,
// ciclos e dependências entre pastas. Importante nas refatorações, porque o GJS só acusa import quebrado quando o
// Shell carrega o módulo.
import importPlugin from 'eslint-plugin-import';

const gjs = {
    console: 'readonly', global: 'readonly', imports: 'readonly', log: 'readonly', logError: 'readonly', print: 'readonly',
    ARGV: 'readonly', printerr: 'readonly', globalThis: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
    setInterval: 'readonly', clearInterval: 'readonly', TextDecoder: 'readonly', TextEncoder: 'readonly', URL: 'readonly',
    Intl: 'readonly', structuredClone: 'readonly', AbortController: 'readonly',
};

// Quem pode depender de quem. `nucleo` não conhece nenhuma funcionalidade; as funcionalidades só conversam entre si
// pelo que listam aqui (o dock é o único que enxerga todas, é ele quem as junta).
const PODE = {
    nucleo: [],
    clima: ['nucleo'],
    ambientes: ['nucleo'],
    temas: ['nucleo', 'ambientes'],
    widgets: ['nucleo', 'clima'],
    mascotes: ['nucleo', 'clima', 'temas'],
    dock: ['nucleo', 'clima', 'ambientes', 'temas', 'widgets', 'mascotes'],
};
const PASTAS = Object.keys(PODE);
// uma restrição por par (importador, importado) que não está em PODE
const restricoes = [];
for (const importador of PASTAS) {
    for (const importado of PASTAS) {
        if (importador !== importado && !PODE[importador].includes(importado)) {
            restricoes.push({
                target: `./atlas@joaovitor12j.dev/${importador}/**/*`, from: `./atlas@joaovitor12j.dev/${importado}/**/*`,
                message: `${importador}/ não pode importar de ${importado}/ (ver PODE em eslint.config.js)`,
            });
        }
    }
}

export default [{
    files: ['**/*.js'],
    ignores: ['**/.run-*/**', 'node_modules/**'],
    plugins: {import: importPlugin},
    languageOptions: {ecmaVersion: 2023, sourceType: 'module', globals: gjs},
    rules: {
        'no-undef': 'error',
        'no-unused-vars': ['warn', {args: 'none', caughtErrors: 'none'}],
        'import/named': 'error',
        'import/no-unresolved': ['error', {ignore: ['^gi://', '^resource:', '^system$']}],
        'import/no-cycle': 'error',
        'import/no-restricted-paths': ['error', {zones: restricoes}],
        'no-dupe-keys': 'error', 'no-redeclare': 'error', 'no-const-assign': 'error',
    },
}];
