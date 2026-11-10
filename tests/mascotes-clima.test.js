import assert from 'node:assert/strict';
import test from 'node:test';
import {mascoteDoClima} from '../atlas@joaovitor12j.dev/mascotes/gatilhos/clima.js';
import {escolherVariante, posicionarMascote} from '../atlas@joaovitor12j.dev/mascotes/palco.js';
import {
    duracaoPicole, duracaoSolArco, duracaoSolLeque, quadroPicole, quadroSolArco, quadroSolLeque,
} from '../atlas@joaovitor12j.dev/mascotes/personagens/calor.js';
import {
    duracaoNeve, duracaoPendurado, duracaoPinguim, flocosDeNeve, quadroNeve, quadroPendurado, quadroPinguim,
} from '../atlas@joaovitor12j.dev/mascotes/personagens/frio.js';

const HORA = 3_600_000;
const ligados = {frio: true, calor: true};
const limiares = {frio: 18, calor: 25};
const esperas = {frio: 2 * HORA, calor: 2 * HORA};
const nunca = {frio: -Infinity, calor: -Infinity};

test('mascoteDoClima: calor a partir de 25, frio até 18, nada no meio', () => {
    assert.equal(mascoteDoClima(25, ligados, limiares, nunca, esperas, 0), 'calor');
    assert.equal(mascoteDoClima(31.4, ligados, limiares, nunca, esperas, 0), 'calor');
    assert.equal(mascoteDoClima(18, ligados, limiares, nunca, esperas, 0), 'frio');
    assert.equal(mascoteDoClima(-3, ligados, limiares, nunca, esperas, 0), 'frio');
    assert.equal(mascoteDoClima(21, ligados, limiares, nunca, esperas, 0), null);
    assert.equal(mascoteDoClima(24.9, ligados, limiares, nunca, esperas, 0), null);
});

test('mascoteDoClima: sem previsão, desligado ou dentro da espera não aparece', () => {
    assert.equal(mascoteDoClima(null, ligados, limiares, nunca, esperas, 0), null);
    assert.equal(mascoteDoClima(NaN, ligados, limiares, nunca, esperas, 0), null);
    assert.equal(mascoteDoClima(30, {frio: true, calor: false}, limiares, nunca, esperas, 0), null);
    const agora = 10 * HORA;
    assert.equal(mascoteDoClima(30, ligados, limiares, {frio: -Infinity, calor: agora - HORA}, esperas, agora), null);
    assert.equal(mascoteDoClima(30, ligados, limiares, {frio: -Infinity, calor: agora - 2 * HORA}, esperas, agora), 'calor');
    // a espera de um não segura o outro
    assert.equal(mascoteDoClima(10, ligados, limiares, {frio: -Infinity, calor: agora}, esperas, agora), 'frio');
});

test('escolherVariante: a escolhida, ou sorteada com "sortear"', () => {
    const v = ['picole', 'sol-arco', 'sol-leque'];
    assert.equal(escolherVariante('sol-arco', v, 0.9), 'sol-arco');
    assert.equal(escolherVariante('sortear', v, 0), 'picole');
    assert.equal(escolherVariante('sortear', v, 0.5), 'sol-arco');
    assert.equal(escolherVariante('sortear', v, 0.999), 'sol-leque');
    assert.equal(escolherVariante('xyz', v, 0.4), 'sol-arco');
});

test('posicionarMascote: `abaixo` desce o actor sobre a doca', () => {
    const caixa = {x: 100, y: 800, w: 600, h: 90};
    assert.deepEqual(posicionarMascote(caixa, {w: 80, h: 100, abaixo: 30}, 30), {x: 360, y: 730});
    assert.deepEqual(posicionarMascote(caixa, {w: 600, h: 100}, 30), {x: 100, y: 700});
    assert.equal(posicionarMascote({x: 100, y: 100, w: 600, h: 90}, {w: 80, h: 100, abaixo: 30}, 40), null);
});

const LINHAS = [
    ['picolé', duracaoPicole(), t => quadroPicole(t)],
    ['sol no arco', duracaoSolArco(), t => quadroSolArco(t, 1)],
    ['sol abanando', duracaoSolLeque(), t => quadroSolLeque(t, -1)],
    ['pinguim', duracaoPinguim(), t => quadroPinguim(t, 1)],
    ['neve', duracaoNeve(), t => quadroNeve(t)],
    ['pendurado', duracaoPendurado(), t => quadroPendurado(t)],
];

test('as seis linhas do tempo: valores finitos durante e null no fim', () => {
    for (const [nome, d, quadro] of LINHAS) {
        assert.ok(d > 2000 && d < 8000, `${nome}: duração ${d}`);
        for (let t = 0; t < d; t += 50) {
            const q = quadro(t);
            assert.ok(q, `${nome}: sem quadro em ${t}`);
            for (const [k, v] of Object.entries(q))
                assert.ok(Number.isFinite(v), `${nome}: ${k} = ${v} em ${t}`);
        }
        assert.equal(quadro(d), null, `${nome}: deveria acabar em ${d}`);
    }
});

test('sol no arco: nasce e se põe atrás da doca, alto no meio; dir -1 inverte', () => {
    assert.equal(quadroSolArco(0, 1).altura, 0);
    assert.equal(quadroSolArco(0, 1).x, 0);
    assert.equal(quadroSolArco(0, -1).x, 1);
    assert.ok(quadroSolArco(duracaoSolArco() / 2, 1).altura > 0.99);
    assert.ok(quadroSolArco(duracaoSolArco() - 1, 1).x > 0.99);
});

test('sol abanando: entra de fora, para no meio abanando e sai pela outra ponta', () => {
    const d = duracaoSolLeque();
    assert.ok(quadroSolLeque(0, 1).x < 0);
    const meio = quadroSolLeque(2600, 1);
    assert.equal(meio.x, 0.5);
    assert.equal(meio.anda, 0);
    assert.ok(Math.abs(meio.leque) > 0 || Math.abs(quadroSolLeque(2650, 1).leque) > 0);
    assert.ok(quadroSolLeque(d - 1, 1).x > 1);
    assert.ok(quadroSolLeque(d - 1, -1).x < 0);
    assert.ok(Math.max(...Array.from({length: 60}, (_, i) => quadroSolLeque(i * 100, 1).enxuga)) > 0.9);
});

test('pinguim: atravessa de ponta a ponta e pula perto do fim', () => {
    assert.ok(quadroPinguim(0, 1).x < 0);
    assert.ok(quadroPinguim(duracaoPinguim() - 1, 1).x > 1);
    assert.equal(quadroPinguim(duracaoPinguim() * 0.3, 1).pulo, 0);
    assert.ok(Math.max(...Array.from({length: 100}, (_, i) => quadroPinguim(i * 38, 1).pulo)) > 0.95);
});

test('picolé: derrete depois de pingar e a poça some no fim', () => {
    const d = duracaoPicole();
    assert.equal(quadroPicole(1000).derrete, 0);
    assert.equal(quadroPicole(d - 800).derrete, 1);
    assert.ok(quadroPicole(d - 1).alfa < 0.05);
});

test('neve: monte cresce, cabeça aparece e afunda, tudo some no fim', () => {
    const d = duracaoNeve();
    assert.equal(quadroNeve(0).monte, 0);
    assert.equal(quadroNeve(0).cabeca, 0);
    assert.ok(quadroNeve(3500).cabeca > 0.9);
    assert.ok(quadroNeve(d - 1).alfa < 0.05);
});

test('flocosDeNeve: posições dentro do quadro, os mesmos a cada chamada, e acabam', () => {
    const f = flocosDeNeve(1200);
    assert.ok(f.length > 3);
    for (const {x, y, r} of f) {
        assert.ok(x > 0 && x < 1 && y >= 0 && y < 1 && r >= 0.6 && r <= 1);
    }
    assert.deepEqual(flocosDeNeve(1200), f);
    assert.deepEqual(flocosDeNeve(0), []);
    assert.deepEqual(flocosDeNeve(5000), []);
});

test('pendurado: cai de cima, espirra e solta a borda', () => {
    assert.ok(quadroPendurado(0).queda < -0.999);
    assert.equal(quadroPendurado(1500).queda, 0);
    assert.ok(Math.max(...Array.from({length: 88}, (_, i) => quadroPendurado(i * 50).atchim)) > 0.95);
    assert.equal(quadroPendurado(1500).solta, 0);
    assert.ok(quadroPendurado(duracaoPendurado() - 1).solta > 0.95);
});
