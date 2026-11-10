import assert from 'node:assert/strict';
import test from 'node:test';
import {PASSEIOS} from '../atlas@joaovitor12j.dev/logica.js';
import {avaliarDisparo, esperaAte, naJanela, naTemporada, proximoDisparo} from '../atlas@joaovitor12j.dev/mascotes/agenda.js';
import {bateriaPedeAparicao, rearmarBateria} from '../atlas@joaovitor12j.dev/mascotes/gatilhos/bateria.js';
import {memoriaPedeAparicao, rearmarMemoria, usoMemoria} from '../atlas@joaovitor12j.dev/mascotes/gatilhos/memoria.js';
import {duracaoPasseio, faseSobeDesce, FINAIS, quadroPasseio, tamanhoPasseio} from '../atlas@joaovitor12j.dev/mascotes/movimento.js';
import {deslocamentoAleatorio, deslocamentosLado, escolherAparicao, posicionarMascote} from '../atlas@joaovitor12j.dev/mascotes/palco.js';
import {duracaoBoneco, quadroBoneco} from '../atlas@joaovitor12j.dev/mascotes/personagens/boneco.js';
import {duracaoChama, quadroChama} from '../atlas@joaovitor12j.dev/mascotes/personagens/chama.js';
import {duracaoCoruja, quadroCoruja} from '../atlas@joaovitor12j.dev/mascotes/personagens/coruja.js';
import {batidasDoDisparo, duracaoCuco, quadroCuco} from '../atlas@joaovitor12j.dev/mascotes/personagens/cuco.js';
import {duracaoEsqueleto, quadroEsqueleto} from '../atlas@joaovitor12j.dev/mascotes/personagens/esqueleto.js';
import {duracaoFantasma, quadroFantasma} from '../atlas@joaovitor12j.dev/mascotes/personagens/fantasma.js';
import {duracaoNoel, quadroNoel} from '../atlas@joaovitor12j.dev/mascotes/personagens/noel.js';
import {duracaoPilha, quadroPilha} from '../atlas@joaovitor12j.dev/mascotes/personagens/pilha.js';
import {duracaoSatelite, quadroSatelite} from '../atlas@joaovitor12j.dev/mascotes/personagens/satelite.js';
import {confete, duracaoTomate, quadroTomate} from '../atlas@joaovitor12j.dev/mascotes/personagens/tomate.js';
import {quadroAguaViva} from '../atlas@joaovitor12j.dev/mascotes/residentes/agua-viva.js';
import {quadroBonecoIlustrado} from '../atlas@joaovitor12j.dev/mascotes/residentes/boneco-ilustrado.js';
import {proximoEstadoResidente} from '../atlas@joaovitor12j.dev/mascotes/residentes/estado.js';
import {quadroGaivota} from '../atlas@joaovitor12j.dev/mascotes/residentes/gaivota.js';
import {quadroGatoIlustrado} from '../atlas@joaovitor12j.dev/mascotes/residentes/gato.js';
import {quadroPapaiNoel} from '../atlas@joaovitor12j.dev/mascotes/residentes/papai-noel.js';
import {quadroRena} from '../atlas@joaovitor12j.dev/mascotes/residentes/rena.js';
import {quadroSapo} from '../atlas@joaovitor12j.dev/mascotes/residentes/sapo.js';
import {quadroSprite, SPRITES} from '../atlas@joaovitor12j.dev/mascotes/sprites.js';
import {brilhosDourados, campoNeve, luzinhasPiscando, marOnda} from '../atlas@joaovitor12j.dev/temas/particulas.js';

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

test('faseSobeDesce: começa e termina escondido, esmaga dentro de limites e assenta em 1', () => {
    const f = {sobe: 450, fica: 2000, desce: 400};
    const fim = f.sobe + f.fica + f.desce;
    assert.ok(faseSobeDesce(0, f).sobe < 1e-9);
    assert.ok(faseSobeDesce(fim - 1, f).sobe < 0.01);
    let maximo = 0;
    for (let t = 0; t < fim; t += 10) {
        const {sobe, esmaga} = faseSobeDesce(t, f);
        maximo = Math.max(maximo, sobe);
        assert.ok(sobe >= 0 && sobe <= 1.2, `sobe ${sobe} em ${t}`);
        assert.ok(esmaga.sx > 0.85 && esmaga.sx < 1.1 && esmaga.sy > 0.85 && esmaga.sy < 1.2, `esmaga em ${t}`);
    }
    assert.ok(maximo > 1.05, 'a subida passa do alvo (mola)');
    assert.equal(faseSobeDesce(f.sobe + 1500, f).sobe, 1);
    // a preparação da descida sobe um pouco antes de cair
    assert.ok(faseSobeDesce(f.sobe + f.fica + 40, f).sobe > 1);
});

test('faseSobeDesce: cada final termina escondido e fica em limites', () => {
    const f = {sobe: 450, fica: 2000, desce: 400};
    const fim = f.sobe + f.fica + f.desce;
    for (const saida of FINAIS) {
        const ultimo = faseSobeDesce(fim - 1, f, saida);
        assert.ok(ultimo.sobe < 0.02 || ultimo.alfa < 0.02, `${saida} termina escondido`);
        for (let t = f.sobe + f.fica; t < fim; t += 10) {
            const q = faseSobeDesce(t, f, saida);
            assert.ok(q.sobe >= 0 && q.sobe <= 1.2 && q.alfa >= 0 && q.alfa <= 1, `${saida} em ${t}`);
        }
    }
    // o `some` não mexe na altura, só no desbotar; o `espia` volta a subir depois de esconder
    assert.equal(faseSobeDesce(f.sobe + f.fica + 200, f, 'some').sobe, 1);
    assert.ok(faseSobeDesce(f.sobe + f.fica + 200, f, 'espia').sobe < faseSobeDesce(f.sobe + f.fica + 280, f, 'espia').sobe);
    // quem não sorteia final fica com o padrão
    assert.deepEqual(quadroFantasma(2000, 'cai').esmaga, quadroFantasma(2000).esmaga);
});

test('quadroPasseio: atravessa a doca, para quando tem pausa e termina fora dela', () => {
    for (const [chave, c] of Object.entries(PASSEIOS)) {
        for (const dir of [1, -1]) {
            assert.equal(quadroPasseio(c.dur, dir, c), null, `${chave} acaba`);
            const ini = quadroPasseio(0, dir, c);
            const fim = quadroPasseio(c.dur - 1, dir, c);
            const antes = dir < 0 ? ini.x > 1 : ini.x < 0;
            const depois = dir < 0 ? fim.x < 0 : fim.x > 1;
            assert.ok(antes && depois, `${chave} entra e sai fora da doca (dir ${dir})`);
            for (let t = 0; t < c.dur; t += 20) {
                const q = quadroPasseio(t, dir, c);
                assert.ok(q.dy >= -0.01 && q.dy <= (c.altura ?? 0) + c.bob + 0.01, `${chave} dy ${q.dy}`);
                assert.ok(q.sx > 0.8 && q.sx < 1.2 && q.sy > 0.8 && q.sy < 1.2, `${chave} esmaga`);
                assert.ok(q.parado >= 0 && q.parado <= 1);
            }
        }
        const meio = quadroPasseio(c.dur / 2, 1, c);
        if (c.pausa)
            assert.ok(Math.abs(meio.x - 0.5) < 1e-9 && meio.parado > 0.99, `${chave} para no meio`);
        const t = tamanhoPasseio(chave, 50, 800);
        assert.ok(t.w === 800 && t.h >= 50 * c.fig[1], `${chave} cabe a figura`);
        assert.equal(duracaoPasseio(chave), c.dur);
    }
});

// ----- Gato, coruja, pilha, satélite e tomate -----

test('os mascotes novos têm linha do tempo que acaba e some', () => {
    for (const [dur, quadro] of [[duracaoCoruja, quadroCoruja], [duracaoPilha, quadroPilha],
        [duracaoSatelite, quadroSatelite], [duracaoTomate, quadroTomate]]) {
        assert.ok(dur() > 2000);
        assert.ok(quadro(dur() / 2), 'no meio da aparição devolve o estado');
        assert.equal(quadro(dur()), null);
        assert.equal(quadro(dur() + 500), null);
        assert.ok(Number.isFinite(quadro(0).sobe));
    }
});

test('a coruja dorme ao subir e ao descer', () => {
    const c = quadroCoruja(450 + 100);
    assert.equal(c.sono, 1);
    assert.equal(c.olhos, 0);
    const acordada = quadroCoruja(450 + 1500);
    assert.equal(acordada.sono, 0);
    assert.ok(quadroCoruja(duracaoCoruja() - 700).sono > 0.5, 'volta a dormir antes de descer');
});

test('a pilha fica com pouca carga e o tomate solta confete só depois de subir', () => {
    for (let t = 0; t < duracaoPilha(); t += 100)
        assert.ok(quadroPilha(t).nivel <= 0.16 && quadroPilha(t).nivel >= 0.1);
    assert.equal(quadroTomate(0).confete, 0);
    assert.ok(quadroTomate(1000).confete > 0.5);
    const a = confete(3, 18, 0.5), b = confete(3, 18, 0.5);
    assert.deepEqual(a, b, 'determinístico');
    assert.ok(confete(3, 18, 2).y > confete(3, 18, 0.4).y, 'cai com a gravidade');
});

test('bateriaPedeAparicao só descarregando, no limiar, armada e depois da espera', () => {
    const livre = -Infinity;
    assert.equal(bateriaPedeAparicao(14, 2, 15, true, 1e6, livre, 1e5), true);
    assert.equal(bateriaPedeAparicao(14, 1, 15, true, 1e6, livre, 1e5), false, 'carregando');
    assert.equal(bateriaPedeAparicao(30, 2, 15, true, 1e6, livre, 1e5), false, 'acima do limiar');
    assert.equal(bateriaPedeAparicao(14, 2, 15, false, 1e6, livre, 1e5), false, 'desarmada');
    assert.equal(bateriaPedeAparicao(14, 2, 15, true, 1e6, 1e6 - 10, 1e5), false, 'dentro da espera');
    assert.equal(bateriaPedeAparicao(null, 2, 15, true, 1e6, livre, 1e5), false);
});

test('rearmarBateria volta ao carregar ou ao passar 5 pontos do limiar', () => {
    assert.equal(rearmarBateria(10, 2, 15, false), false);
    assert.equal(rearmarBateria(10, 1, 15, false), true);
    assert.equal(rearmarBateria(21, 2, 15, false), true);
    assert.equal(rearmarBateria(20, 2, 15, false), false);
    assert.equal(rearmarBateria(10, 2, 15, true), true);
});

test('os passeios novos atravessam a doca', () => {
    for (const chave of ['coruja-salta', 'pilha-arrasta', 'satelite-deriva', 'tomate-pula']) {
        const c = PASSEIOS[chave];
        assert.ok(c, chave);
        assert.ok(quadroPasseio(c.dur / 2, 1, c));
        assert.equal(quadroPasseio(c.dur, 1, c), null);
        assert.ok(tamanhoPasseio(chave, 48, 600).w === 600);
    }
});

test('quadroSprite atravessa a doca sem escorregar e some no fim', () => {
    const cfg = {largura: 1200, icone: 48, velocidade: 3, passo: 0.8};
    const a = quadroSprite(0, 1, SPRITES.gato, cfg);
    assert.ok(a.x < 0, 'começa fora da doca');
    const quadros = new Set();
    let ultimo = -Infinity;
    for (let t = 0; t < 12000; t += 33) {
        const q = quadroSprite(t, 1, SPRITES.gato, cfg);
        if (!q)
            break;
        assert.ok(q.x >= ultimo, 'só avança');
        ultimo = q.x;
        quadros.add(q.quadro);
    }
    assert.equal(quadros.size, SPRITES.gato.quadros, 'usa todos os quadros');
    assert.equal(quadroSprite(60000, 1, SPRITES.gato, cfg), null);
    const e = quadroSprite(0, -1, SPRITES.gato, cfg);
    assert.ok(e.x > 1200 && e.dir === -1, 'da direita para a esquerda');
});

test('proximoEstadoResidente: respeita o peso de cada estado nas bordas da roleta', () => {
    const estados = [['flutuando', 6], ['nadando', 3], ['brilhando', 1]];
    assert.equal(proximoEstadoResidente(estados, 0), 'flutuando');
    assert.equal(proximoEstadoResidente(estados, 0.5999), 'flutuando');
    assert.equal(proximoEstadoResidente(estados, 0.6), 'nadando');
    assert.equal(proximoEstadoResidente(estados, 0.8999), 'nadando');
    assert.equal(proximoEstadoResidente(estados, 0.9), 'brilhando');
    assert.equal(proximoEstadoResidente(estados, 0.999999), 'brilhando');
});

test('quadroAguaViva: sino mais rápido nadando, parado e escuro dormindo, brilho só em brilhando', () => {
    const parado = quadroAguaViva(0, 'flutuando');
    assert.equal(parado.tentaculos.length, 5);
    assert.equal(parado.brilho, 0);
    const dormindo = quadroAguaViva(500, 'dormindo');
    assert.ok(dormindo.dormindo);
    assert.equal(dormindo.sino, 0.15);
    assert.deepEqual(dormindo.tentaculos, [0, 0, 0, 0, 0]);
    const brilhando = quadroAguaViva(0, 'brilhando');
    assert.ok(brilhando.brilho > 0);
    // o mesmo instante de relógio dentro do estado produz sinos em fases diferentes (período menor nadando)
    const nadando = quadroAguaViva(475, 'nadando');
    const flutuando = quadroAguaViva(475, 'flutuando');
    assert.notEqual(nadando.sino, flutuando.sino);
});

test('quadroGaivota: perna só andando, asa só voando, recolhida dormindo', () => {
    assert.equal(quadroGaivota(0, 'parada').perna, 0);
    assert.notEqual(quadroGaivota(200, 'andando').perna, 0);
    assert.ok(quadroGaivota(0, 'voando').voando);
    assert.ok(quadroGaivota(100, 'dormindo').dormindo);
});

test('quadroGatoIlustrado: amplitude maior correndo que andando, pisca de vez em quando', () => {
    const andando = quadroGatoIlustrado(200, 'andando');
    const correndo = quadroGatoIlustrado(200, 'correndo');
    assert.ok(Math.abs(correndo.perna) <= 38.01);
    assert.ok(Math.abs(andando.perna) <= 22.01);
    assert.equal(quadroGatoIlustrado(0, 'dormindo').perna, 0);
});

test('quadroSapo: papo só infla coaxando, salto só pulando', () => {
    assert.equal(quadroSapo(0, 'parado').papo, 1);
    assert.ok(quadroSapo(75, 'coaxando').papo > 1);
    assert.equal(quadroSapo(0, 'parado').salto, 0);
    assert.ok(quadroSapo(550, 'pulando').salto >= 0);
});

test('quadroBonecoIlustrado: braço só acena acenando, parado sem salto', () => {
    assert.equal(quadroBonecoIlustrado(0, 'parado').salto, 0);
    assert.ok(quadroBonecoIlustrado(250, 'acenando').braco <= -10);
});

test('quadroRena: cabeça só balança no sininho, perna só trotando', () => {
    assert.equal(quadroRena(0, 'parada').perna, 0);
    assert.equal(quadroRena(0, 'parada').cabeca, 0);
    assert.notEqual(quadroRena(200, 'trotando').perna, 0);
    assert.notEqual(quadroRena(200, 'sininho').cabeca, 0);
});

test('quadroPapaiNoel: barriga só chacoalha rindo, perna só passeando', () => {
    assert.equal(quadroPapaiNoel(0, 'parado').barriga, 1);
    assert.notEqual(quadroPapaiNoel(100, 'rindo').barriga, 1);
    assert.notEqual(quadroPapaiNoel(200, 'passeando').perna, 0);
});

test('campoNeve: fica dentro da largura/altura, mesma semente sempre no mesmo lugar', () => {
    const a = campoNeve(1000, 200, 100);
    const b = campoNeve(1000, 200, 100);
    assert.deepEqual(a, b);
    for (const floco of a) {
        assert.ok(floco.y >= 0 && floco.y <= 100);
        assert.ok(floco.r > 0);
    }
});

test('luzinhasPiscando: brilho sempre entre 0,3 e 1, nunca mais de 1x por segundo (período > 2s)', () => {
    const brilhos = luzinhasPiscando(500, 6);
    assert.equal(brilhos.length, 6);
    for (const b of brilhos)
        assert.ok(b >= 0.3 && b <= 1);
});

test('brilhosDourados: x e y entre 0 e 1, brilho nunca negativo', () => {
    for (const p of brilhosDourados(700, 5)) {
        assert.ok(p.x >= 0 && p.x <= 1);
        assert.ok(p.y >= 0 && p.y <= 1);
        assert.ok(p.brilho >= 0);
    }
});

test('marOnda: oscila entre -1 e 1, começa em 0', () => {
    assert.equal(marOnda(0), 0);
    for (let t = 0; t < 5000; t += 500)
        assert.ok(Math.abs(marOnda(t)) <= 1);
});
