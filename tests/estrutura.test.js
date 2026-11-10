// Confere a consistência entre o catálogo, o schema e os temas, que o compilador não pega.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PASSEIOS, SPRITES, temaDecorado} from '../atlas@joaovitor12j.dev/logica.js';
import {CORES_TEMA, MASCOTES, MOVIMENTOS, TEMAS, WIDGETS} from '../atlas@joaovitor12j.dev/catalogo.js';
import {fonte, modulos} from './auxiliar.js';

const raiz = new URL('../atlas@joaovitor12j.dev/', import.meta.url);
const schema = readFileSync(new URL('schemas/org.gnome.shell.extensions.atlas.gschema.xml', raiz), 'utf8');
const css = readFileSync(new URL('temas.css', raiz), 'utf8');
const widgetsJs = readFileSync(new URL('widgets.js', raiz), 'utf8');
const mascotesJs = readFileSync(new URL('mascotes.js', raiz), 'utf8');
const ARQUIVOS_APP = ['paginas', 'aparencia', 'widgets', 'ambientes', 'mascotes', 'janela', 'previa'].map(n => `../atlas@joaovitor12j.dev/app/${n}.js`);
const paginasJs = ARQUIVOS_APP.map(a => readFileSync(new URL(a, import.meta.url), 'utf8')).join('\n');

test('todo tema do catálogo está no schema e tem CSS', () => {
    for (const [id] of TEMAS) {
        assert.ok(schema.includes(`<choice value="${id}"/>`), `schema sem o tema ${id}`);
        assert.ok(css.includes(`.atlas-${id} .atlas-bg`), `CSS sem o tema ${id}`);
        assert.ok(css.includes(`.atlas-tooltip.atlas-${id}`), `CSS sem a dica do tema ${id}`);
    }
});

test('as cores de widgets e do botão de apps (prévia) batem com temas.css', () => {
    for (const [id, c] of Object.entries(CORES_TEMA)) {
        const regra = re => css.match(new RegExp(`\\.atlas-${id} \\.atlas-${re} \\{([^}]*)\\}`))?.[1];
        // noite e cristal herdam parte das regras padrão: só confere onde o tema declara a regra
        const txt = regra('widget-txt');
        if (txt)
            assert.ok(txt.includes(c.txt), `texto dos widgets de ${id}`);
        const icone = regra('apps-icon');
        if (icone)
            assert.ok(icone.includes(c.appsIc), `ícone de apps de ${id}`);
        const widget = regra('widget');
        if (widget && c.wb.startsWith('rgba') && widget.includes('border-color'))
            assert.ok(widget.includes(c.wb), `borda dos widgets de ${id}`);
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
    // de schemas do GNOME, não do ATLAS: favoritos (prefs), Não perturbe (dock) e papel de parede (palco do app)
    for (const externa of ['favorite-apps', 'show-banners', 'picture-uri', 'picture-uri-dark'])
        chaves.add(externa);
    for (const arq of modulos()) {
        const src = fonte(arq);
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
    const chaves = [...(mascotesJs + paginasJs).matchAll(/'((?:cuco|fantasma|esqueleto|noel|boneco|chama|calor|frio|gato|coruja|pilha|satelite|tomate|mascotes?)-[a-z-]+)'/g)].map(m => m[1]);
    assert.ok(chaves.length > 0);
    const rotulos = new Set(['mascote-quadro', 'mascote-memoria', 'mascote-clima', 'mascote-evento', 'mascote-residente', 'mascote-efeito', 'boneco-ilustrado', 'cuco-voa', ...Object.keys(PASSEIOS)]); // linhas do perf.js, ids de passeio e de tamanho, não chaves
    for (const chave of new Set(chaves).difference(rotulos))
        assert.ok(schema.includes(`<key name="${chave}"`), `schema sem a chave ${chave}`);
});

test('todo mascote de horário sazonal tem as três chaves no schema', () => {
    for (const id of ['fantasma', 'esqueleto', 'noel', 'boneco', 'gato', 'coruja']) {
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
        // nos temas de pacote a borda e o indicador são desenhados (decoracao.js), não vêm do CSS
        if (!temaDecorado(id)) {
            assert.ok(bg.includes(c.borda), `borda de ${id}`);
            assert.ok(bloco('dot').includes(c.ponto), `ponto de ${id}`);
        }
        assert.ok(bloco('sep').includes(c.sep), `separador de ${id}`);
    }
});

test('os movimentos de cada mascote batem entre catálogo, schema e motor', () => {
    for (const [id, movs] of Object.entries(MOVIMENTOS)) {
        const chave = schema.match(new RegExp(`<key name="${id}-movimento"[^>]*>([\\s\\S]*?)</key>`));
        assert.ok(chave, `schema sem ${id}-movimento`);
        const valores = [...chave[1].matchAll(/<choice value="([^"]+)"/g)].map(m => m[1]);
        assert.deepEqual(valores, ['sortear', ...movs.map(m => m[0])], `escolhas de ${id}-movimento`);
        const bloco = mascotesJs.match(new RegExp(`\\n    ${id}: \\{[\\s\\S]*?\\n    \\},\\n`));
        assert.ok(bloco, `mascotes.js sem ${id}`);
        for (const [mov] of movs)
            assert.ok(bloco[0].includes(`'${mov}'`), `mascotes.js: ${id} sem o movimento ${mov}`);
    }
});

test('as folhas de sprites existem e batem com SPRITES', () => {
    for (const [id, spec] of Object.entries(SPRITES)) {
        const png = readFileSync(new URL(`sprites/${spec.arquivo}`, raiz));
        assert.equal(png.readUInt32BE(16), spec.fw * spec.quadros, `${id}: largura da tira`);
        assert.equal(png.readUInt32BE(20), spec.fh, `${id}: altura`);
    }
});
