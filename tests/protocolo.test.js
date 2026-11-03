// Mantém o contrato D-Bus coerente entre protocolo.js, o cliente (ponte.js) e o daemon.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INTERFACE, NOME, VERSAO, XML} from '../atlas@joaovitor12j.dev/protocolo.js';

const ponte = readFileSync(new URL('../atlas@joaovitor12j.dev/ponte.js', import.meta.url), 'utf8');
const daemon = readFileSync(new URL('../atlas@joaovitor12j.dev/app/daemon.js', import.meta.url), 'utf8');

const metodos = [...XML.matchAll(/<method name="(\w+)"/g)].map(m => m[1]);
const sinais = [...XML.matchAll(/<signal name="(\w+)"/g)].map(m => m[1]);

test('o nome D-Bus segue a interface versionada', () => {
    assert.equal(NOME, 'dev.joaovitor12j.Atlas');
    assert.equal(INTERFACE, 'dev.joaovitor12j.Atlas1');
    assert.ok(Number.isInteger(VERSAO) && VERSAO >= 1);
});

test('todo método do protocolo é implementado pelo daemon', () => {
    for (const m of metodos)
        assert.match(daemon, new RegExp(`\\b${m}\\b`), `daemon sem ${m}`);
});

test('todo método e sinal que a ponte usa existe no protocolo', () => {
    for (const [, m] of ponte.matchAll(/_chamar\('(\w+)'/g))
        assert.ok(metodos.includes(m), `ponte chama ${m}, ausente no protocolo`);
    assert.match(ponte, /'Versao'/);
    assert.ok(metodos.includes('Versao'));
    assert.ok(sinais.includes('Dado'));
});

test('a ponte e o protocolo não importam o Shell', () => {
    for (const src of [ponte, readFileSync(new URL('../atlas@joaovitor12j.dev/protocolo.js', import.meta.url), 'utf8')])
        assert.doesNotMatch(src, /resource:\/\/\/org\/gnome\/shell|gi:\/\/(St|Clutter|Meta|Shell)\b/);
});
