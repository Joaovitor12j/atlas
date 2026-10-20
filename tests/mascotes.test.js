import test from 'node:test';
import assert from 'node:assert/strict';
import {
    avaliarDisparo, batidasDoDisparo, duracaoCuco, deslocamentoAleatorio, deslocamentosLado, duracaoBoneco, duracaoNoel, quadroBoneco, quadroNoel, duracaoChama, memoriaPedeAparicao, quadroChama, rearmarMemoria, usoMemoria, duracaoEsqueleto, duracaoFantasma, escolherAparicao, esperaAte, naJanela, naTemporada, posicionarMascote,
    proximoDisparo, quadroCuco, quadroEsqueleto, quadroFantasma,
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

test('naTemporada: bordas inclusivas e temporada que vira o ano', () => {
    const d = (m, dia) => new Date(2026, m, dia);
    assert.equal(naTemporada(d(9, 24), [9, 24], [9, 31]), true);
    assert.equal(naTemporada(d(9, 31), [9, 24], [9, 31]), true);
    assert.equal(naTemporada(d(9, 23), [9, 24], [9, 31]), false);
    assert.equal(naTemporada(d(10, 1), [9, 24], [9, 31]), false);
    assert.equal(naTemporada(d(11, 25), [11, 20], [0, 6]), true);
    assert.equal(naTemporada(d(0, 3), [11, 20], [0, 6]), true);
    assert.equal(naTemporada(d(5, 3), [11, 20], [0, 6]), false);
});

test('quadroFantasma: começa e termina escondido, valores no intervalo, null depois do fim', () => {
    const fim = duracaoFantasma();
    assert.ok(quadroFantasma(0).sobe < 1e-9);
    assert.equal(quadroFantasma(fim), null);
    assert.ok(quadroFantasma(fim - 1).sobe < 0.01);
    let susto = 0;
    for (let t = 0; t < fim; t += 5) {
        const q = quadroFantasma(t);
        assert.ok(q.sobe >= 0 && q.sobe <= 1.2, `sobe fora em ${t}`);
        assert.ok(q.susto >= 0 && q.susto <= 1, `susto fora em ${t}`);
        assert.ok(Math.abs(q.balanco) <= 1);
        susto = Math.max(susto, q.susto);
    }
    assert.equal(susto, 1);
});

test('quadroEsqueleto: começa e termina escondido, valores no intervalo, null depois do fim', () => {
    const fim = duracaoEsqueleto();
    assert.ok(quadroEsqueleto(0).sobe < 1e-9);
    assert.equal(quadroEsqueleto(fim), null);
    assert.ok(quadroEsqueleto(fim - 1).sobe < 0.01);
    let aceno = 0, queixo = 0;
    for (let t = 0; t < fim; t += 5) {
        const q = quadroEsqueleto(t);
        assert.ok(q.sobe >= 0 && q.sobe <= 1.2, `sobe fora em ${t}`);
        assert.ok(q.mandibula >= 0 && q.mandibula <= 1, `mandíbula fora em ${t}`);
        assert.ok(Math.abs(q.aceno) <= 1 && Math.abs(q.balanco) <= 1);
        aceno = Math.max(aceno, Math.abs(q.aceno));
        queixo = Math.max(queixo, q.mandibula);
    }
    assert.ok(aceno > 0.9 && queixo > 0.9);
});

test('escolherAparicao: um só aparece sozinho; vários, metade todos e metade um sorteado', () => {
    assert.deepEqual(escolherAparicao(0, 0.3), []);
    assert.deepEqual(escolherAparicao(1, 0.9), [0]);
    assert.deepEqual(escolherAparicao(2, 0.1), [0, 1]);
    assert.deepEqual(escolherAparicao(2, 0.49), [0, 1]);
    assert.deepEqual(escolherAparicao(2, 0.5), [0]);
    assert.deepEqual(escolherAparicao(2, 0.99), [1]);
    assert.deepEqual(escolherAparicao(3, 0.99), [2]);
});

test('deslocamentosLado: um fica em 0; dois ficam simétricos com a folga entre eles', () => {
    assert.deepEqual(deslocamentosLado([60]), [0]);
    assert.deepEqual(deslocamentosLado([60, 40], 10), [-25, 35]);
    const [a, b] = deslocamentosLado([50, 50], 10);
    assert.equal(a, -b);
});

test('deslocamentoAleatorio: de ponta a ponta sem passar das bordas; doca estreita fica no centro', () => {
    assert.equal(deslocamentoAleatorio(600, 100, 0), -250);
    assert.equal(deslocamentoAleatorio(600, 100, 0.5), 0);
    assert.equal(deslocamentoAleatorio(600, 100, 1), 250);
    assert.equal(deslocamentoAleatorio(80, 100, 0.9), 0);
});

test('usoMemoria: lê /proc/meminfo e devolve null quando falta dado', () => {
    assert.equal(usoMemoria('MemTotal:       1000 kB\nMemFree: 10 kB\nMemAvailable:    250 kB\n'), 75);
    assert.equal(usoMemoria('MemTotal: 1000 kB\nMemAvailable: 0 kB\n'), 100);
    assert.equal(usoMemoria('MemTotal: 1000 kB\n'), null);
    assert.equal(usoMemoria(''), null);
});

test('memória alta: dispara no limiar, respeita a espera e só rearma 5 pontos abaixo', () => {
    const espera = 600_000;
    assert.equal(memoriaPedeAparicao(90, 90, true, 1_000_000, -Infinity, espera), true);
    assert.equal(memoriaPedeAparicao(89, 90, true, 1_000_000, -Infinity, espera), false);
    assert.equal(memoriaPedeAparicao(95, 90, false, 1_000_000, -Infinity, espera), false);
    assert.equal(memoriaPedeAparicao(95, 90, true, 1_000_000, 500_000, espera), false);
    assert.equal(memoriaPedeAparicao(95, 90, true, 1_100_000, 500_000, espera), true);
    assert.equal(memoriaPedeAparicao(null, 90, true, 1_000_000, -Infinity, espera), false);
    assert.equal(rearmarMemoria(88, 90, false), false);
    assert.equal(rearmarMemoria(84, 90, false), true);
    assert.equal(rearmarMemoria(95, 90, true), true);
    assert.equal(rearmarMemoria(null, 90, false), false);
});

test('quadroChama: começa e termina escondida, valores no intervalo, null depois do fim', () => {
    const fim = duracaoChama();
    assert.ok(quadroChama(0).sobe < 1e-9);
    assert.equal(quadroChama(fim), null);
    assert.ok(quadroChama(fim - 1).sobe < 0.01);
    let aflicao = 0;
    for (let t = 0; t < fim; t += 5) {
        const q = quadroChama(t);
        assert.ok(q.sobe >= 0 && q.sobe <= 1.2 && q.aflicao >= 0 && q.aflicao <= 1);
        aflicao = Math.max(aflicao, q.aflicao);
    }
    assert.equal(aflicao, 1);
});

test('quadroNoel e quadroBoneco: começam e terminam escondidos, valores no intervalo, null depois do fim', () => {
    for (const [quadro, duracao] of [[quadroNoel, duracaoNoel()], [quadroBoneco, duracaoBoneco()]]) {
        assert.ok(quadro(0).sobe < 1e-9);
        assert.equal(quadro(duracao), null);
        assert.ok(quadro(duracao - 1).sobe < 0.01);
        for (let t = 0; t < duracao; t += 5) {
            const q = quadro(t);
            assert.ok(q.sobe >= 0 && q.sobe <= 1.2, `sobe fora em ${t}`);
            assert.ok(Math.abs(q.balanco) <= 1);
        }
    }
    let aceno = 0, riso = 0;
    for (let t = 0; t < duracaoNoel(); t += 5) {
        const q = quadroNoel(t);
        aceno = Math.max(aceno, Math.abs(q.aceno));
        riso = Math.max(riso, q.riso);
        assert.ok(q.riso >= 0 && q.riso <= 1 && Math.abs(q.aceno) <= 1);
    }
    assert.ok(aceno > 0.9 && riso > 0.9);
});
