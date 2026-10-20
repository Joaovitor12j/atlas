import test from 'node:test';
import assert from 'node:assert/strict';
import {
    avaliarDisparo, batidasDoDisparo, duracaoCuco, esperaAte, naJanela, posicionarMascote, proximoDisparo, quadroCuco,
} from '../atlas@joaovitor12j.dev/logica.js';

const local = (h, m, s = 0) => new Date(2026, 9, 19, h, m, s).getTime();

test('batidasDoDisparo: 0 vira 12, 13 vira 1, limite respeitado, meia hora é uma', () => {
    assert.equal(batidasDoDisparo(0, 0, 12), 12);
    assert.equal(batidasDoDisparo(12, 0, 12), 12);
    assert.equal(batidasDoDisparo(13, 0, 12), 1);
    assert.equal(batidasDoDisparo(23, 0, 12), 11);
    assert.equal(batidasDoDisparo(9, 0, 3), 3);
    assert.equal(batidasDoDisparo(2, 0, 3), 2);
    assert.equal(batidasDoDisparo(9, 30, 12), 1);
});

test('proximoDisparo: hora cheia e meia hora, sempre depois de agora', () => {
    let r = proximoDisparo(local(14, 59, 30), 'hora');
    assert.deepEqual([r.hora, r.minuto, r.ms], [15, 0, local(15, 0)]);
    r = proximoDisparo(local(14, 0, 0), 'hora');
    assert.deepEqual([r.hora, r.minuto], [15, 0]); // no instante exato devolve o próximo
    r = proximoDisparo(local(14, 10), 'meia-hora');
    assert.deepEqual([r.hora, r.minuto], [14, 30]);
    r = proximoDisparo(local(14, 30), 'meia-hora');
    assert.deepEqual([r.hora, r.minuto], [15, 0]);
    r = proximoDisparo(local(23, 45), 'hora');
    assert.deepEqual([r.hora, r.minuto], [0, 0]);
    assert.equal(r.ms, new Date(2026, 9, 20, 0, 0).getTime());
});

test('naJanela: normal, cruzando a meia-noite e bordas inclusivas', () => {
    assert.equal(naJanela(8, 8, 22), true);
    assert.equal(naJanela(22, 8, 22), true);
    assert.equal(naJanela(7, 8, 22), false);
    assert.equal(naJanela(23, 8, 22), false);
    assert.equal(naJanela(23, 20, 6), true);
    assert.equal(naJanela(3, 20, 6), true);
    assert.equal(naJanela(12, 20, 6), false);
});

test('avaliarDisparo: espera, dispara dentro da tolerância e descarta o perdido', () => {
    const alvo = 1_000_000;
    assert.equal(avaliarDisparo(alvo - 1, alvo), 'esperar');
    assert.equal(avaliarDisparo(alvo, alvo), 'disparar');
    assert.equal(avaliarDisparo(alvo + 90_000, alvo), 'disparar');
    assert.equal(avaliarDisparo(alvo + 90_001, alvo), 'perdido');
});

test('esperaAte: folga depois do alvo, teto de 15 min e nunca negativa', () => {
    assert.equal(esperaAte(0, 10_000), 10_200);
    assert.equal(esperaAte(0, 3_600_000), 15 * 60_000);
    assert.equal(esperaAte(50_000, 10_000), 200);
});

test('duracaoCuco: 1000 + 700 por batida', () => {
    assert.equal(duracaoCuco(1), 1700);
    assert.equal(duracaoCuco(3), 3100);
    assert.equal(duracaoCuco(12), 9400);
});

test('quadroCuco: valores no intervalo, começa e termina fechado, null depois do fim', () => {
    const n = 3;
    const fim = duracaoCuco(n);
    const q0 = quadroCuco(0, n);
    assert.deepEqual([q0.casa, q0.porta, q0.passaro], [0, 0, 0]);
    assert.equal(quadroCuco(fim, n), null);
    assert.equal(quadroCuco(fim + 500, n), null);
    const ultimo = quadroCuco(fim - 1, n);
    assert.ok(ultimo.casa < 0.01 && ultimo.porta === 0 && ultimo.passaro === 0);
    for (let t = 0; t < fim; t += 7) {
        const q = quadroCuco(t, n);
        assert.ok(q.casa >= 0 && q.casa <= 1, `casa fora em ${t}`);
        assert.ok(q.porta >= 0 && q.porta <= 1, `porta fora em ${t}`);
        assert.ok(q.passaro >= 0 && q.passaro <= 1.15, `pássaro fora em ${t}`);
        assert.ok(q.bico >= 0 && q.bico <= 1, `bico fora em ${t}`);
        assert.ok(q.inclina >= 0 && q.inclina <= 1, `inclinação fora em ${t}`);
    }
});

test('quadroCuco: o pássaro sai uma vez por batida e só com a porta aberta', () => {
    for (const n of [1, 3, 12]) {
        let saidas = 0;
        let fora = false;
        for (let t = 0; t < duracaoCuco(n); t++) {
            const q = quadroCuco(t, n);
            if (q.passaro > 0.5 && !fora)
                saidas++;
            fora = q.passaro > 0.5;
            if (q.passaro > 0)
                assert.equal(q.porta, 1, `pássaro com a porta fechada em ${t} (n=${n})`);
        }
        assert.equal(saidas, n);
    }
});

test('posicionarMascote: centrado na doca, encostado no topo; null se não cabe', () => {
    assert.deepEqual(posicionarMascote({x: 100, y: 800, w: 600, h: 90}, {w: 80, h: 100}, 30), {x: 360, y: 700});
    assert.equal(posicionarMascote({x: 100, y: 120, w: 600, h: 90}, {w: 80, h: 100}, 30), null);
    assert.deepEqual(posicionarMascote({x: 100, y: 130, w: 600, h: 90}, {w: 80, h: 100}, 30), {x: 360, y: 30});
});
