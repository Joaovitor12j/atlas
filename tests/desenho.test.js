import test from 'node:test';
import assert from 'node:assert/strict';
import {cor} from '../atlas@joaovitor12j.dev/desenho.js';

test('cor: hex para RGBA de 0 a 1', () => {
    assert.deepEqual(cor('#000000'), [0, 0, 0, 1]);
    assert.deepEqual(cor('#ffffff', 0.5), [1, 1, 1, 0.5]);
    const [r, g, b, a] = cor('#e0654f');
    assert.equal(r, 224 / 255);
    assert.equal(g, 101 / 255);
    assert.equal(b, 79 / 255);
    assert.equal(a, 1);
});

test('cor: aceita hex sem o #', () => {
    assert.deepEqual(cor('3fb8a8'), cor('#3fb8a8'));
});
