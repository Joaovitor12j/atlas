// Confere a consistência entre o catálogo, o schema e os temas, que o compilador não pega.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CORES_TEMA, MASCOTES, TEMAS, WIDGETS} from '../atlas@joaovitor12j.dev/catalogo.js';

const raiz = new URL('../atlas@joaovitor12j.dev/', import.meta.url);
const schema = readFileSync(new URL('schemas/org.gnome.shell.extensions.atlas.gschema.xml', raiz), 'utf8');
const css = readFileSync(new URL('temas.css', raiz), 'utf8');
const widgetsJs = readFileSync(new URL('widgets.js', raiz), 'utf8');
const mascotesJs = readFileSync(new URL('mascotes.js', raiz), 'utf8');
const ARQUIVOS_APP = ['paginas', 'aparencia', 'widgets', 'ambientes', 'mascotes', 'janela', 'previa'].map(n => `../app/${n}.js`);
const paginasJs = ARQUIVOS_APP.map(a => readFileSync(new URL(a, import.meta.url), 'utf8')).join('\n');

test('todo tema do catálogo está no schema e tem CSS', () => {
    for (const [id] of TEMAS) {
        assert.ok(schema.includes(`<choice value="${id}"/>`), `schema sem o tema ${id}`);
        assert.ok(css.includes(`.atlas-${id} .atlas-bg`), `CSS sem o tema ${id}`);
        assert.ok(css.includes(`.atlas-tooltip.atlas-${id}`), `CSS sem a dica do tema ${id}`);
    }
});

test('todo widget do catálogo tem classe em widgets.js', () => {
    for (const [id] of WIDGETS)
        assert.match(widgetsJs, new RegExp(`\\b${id}: [A-Z]`), `widgets.js sem a classe de ${id}`);
});

test('ids de temas e widgets são únicos', () => {
    assert.equal(new Set(TEMAS.map(t => t[0])).size, TEMAS.length);
    assert.equal(new Set(WIDGETS.map(w => w[0])).size, WIDGETS.length);
});

test('as chaves que o código lê existem no schema', () => {
    const chaves = new Set([...schema.matchAll(/<key name="([^"]+)"/g)].map(m => m[1]));
    // de schemas do GNOME, não do ATLAS: favoritos (prefs) e Não perturbe (dock)
    for (const externa of ['favorite-apps', 'show-banners'])
        chaves.add(externa);
    for (const arq of ['dock.js', 'widgets.js', 'mascotes.js', ...ARQUIVOS_APP]) {
        const src = readFileSync(new URL(arq, raiz), 'utf8');
        for (const m of src.matchAll(/(?:get|set)_(?:string|boolean|int|double|strv)\('([a-z0-9-]+)'/g))
            assert.ok(chaves.has(m[1]), `${arq} usa a chave ${m[1]}, que não está no schema`);
    }
});

test('todo mascote do catálogo tem implementação em mascotes.js', () => {
    for (const [id] of MASCOTES)
        assert.match(mascotesJs, new RegExp(`\\b${id}: \\{`), `mascotes.js sem o mascote ${id}`);
    assert.equal(new Set(MASCOTES.map(m => m[0])).size, MASCOTES.length);
});

test('as chaves de mascotes lidas pelo prefs e pelo motor existem no schema', () => {
    const chaves = [...(mascotesJs + paginasJs).matchAll(/'((?:cuco|fantasma|esqueleto|noel|boneco|chama|calor|frio|mascotes?)-[a-z-]+)'/g)].map(m => m[1]);
    assert.ok(chaves.length > 0);
    const rotulos = new Set(['mascote-quadro', 'mascote-memoria', 'mascote-clima']); // nomes de linha do perf.js, não chaves
    for (const chave of new Set(chaves).difference(rotulos))
        assert.ok(schema.includes(`<key name="${chave}"`), `schema sem a chave ${chave}`);
});

test('todo mascote de horário sazonal tem as três chaves no schema', () => {
    for (const id of ['fantasma', 'esqueleto', 'noel', 'boneco']) {
        for (const sufixo of ['intervalo', 'das', 'ate'])
            assert.ok(schema.includes(`<key name="${id}-${sufixo}"`), `schema sem ${id}-${sufixo}`);
    }
});

test('as cores de tema do catálogo (prévia) batem com temas.css', () => {
    assert.deepEqual(Object.keys(CORES_TEMA).sort(), TEMAS.map(t => t[0]).sort());
    for (const [id, c] of Object.entries(CORES_TEMA)) {
        const bloco = re => css.match(new RegExp(`\\.atlas-${id} \\.atlas-${re} \\{([^}]*)\\}`))?.[1] ?? '';
        const bg = bloco('bg');
        assert.ok(bg.includes(`background-color: ${c.fundo};`), `fundo de ${id}`);
        assert.ok(bg.includes(c.borda), `borda de ${id}`);
        assert.ok(bloco('dot').includes(c.ponto), `ponto de ${id}`);
        assert.ok(bloco('sep').includes(c.sep), `separador de ${id}`);
    }
});
