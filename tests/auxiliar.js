// Utilitários dos testes de estrutura: varre os módulos da extensão, onde quer que estejam.
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

export const RAIZ = fileURLToPath(new URL('../atlas@joaovitor12j.dev/', import.meta.url));

// Caminhos relativos à extensão de todo .js (ou só dos que estão sob `sub`), sem as pastas .run-* do loader.
export function modulos(sub = '') {
    const achados = [];
    const varrer = pasta => {
        for (const e of readdirSync(pasta, {withFileTypes: true})) {
            if (e.name.startsWith('.'))
                continue;
            const caminho = join(pasta, e.name);
            if (e.isDirectory())
                varrer(caminho);
            else if (e.name.endsWith('.js'))
                achados.push(relative(RAIZ, caminho));
        }
    };
    varrer(join(RAIZ, sub));
    return achados;
}

export const fonte = caminho => readFileSync(join(RAIZ, caminho), 'utf8');
