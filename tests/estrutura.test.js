// Confere a consistência entre o catálogo, o schema e os temas, que o compilador não pega.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TEMAS, WIDGETS} from '../atlas@joaovitor12j.dev/catalogo.js';

const raiz = new URL('../atlas@joaovitor12j.dev/', import.meta.url);
const schema = readFileSync(new URL('schemas/org.gnome.shell.extensions.atlas.gschema.xml', raiz), 'utf8');
const css = readFileSync(new URL('temas.css', raiz), 'utf8');
const widgetsJs = readFileSync(new URL('widgets.js', raiz), 'utf8');

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
    for (const arq of ['dock.js', 'widgets.js', 'prefs.js']) {
        const src = readFileSync(new URL(arq, raiz), 'utf8');
        for (const m of src.matchAll(/(?:get|set)_(?:string|boolean|int|double|strv)\('([a-z0-9-]+)'/g))
            assert.ok(chaves.has(m[1]), `${arq} usa a chave ${m[1]}, que não está no schema`);
    }
});
