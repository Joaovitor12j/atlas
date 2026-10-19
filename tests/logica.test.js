import test from 'node:test';
import assert from 'node:assert/strict';
import {
    appsDoAmbiente, bissexto, calcularProgresso, duracao, escolherAmbiente, formatarCrono, formatarTaxa,
    decidirDnd, deveAvisarDnd, diasAte, escalaGrafico, formatarFaixa, mudarMes, semanasDoMes, normalizarAmbientes, pct, percentualCpu, proximaFase, registrarCopia, resumirTexto,
} from '../atlas@joaovitor12j.dev/logica.js';

test('duracao: minutos e horas', () => {
    assert.equal(duracao(0), '0 min');
    assert.equal(duracao(59), '0 min');
    assert.equal(duracao(42 * 60), '42 min');
    assert.equal(duracao(3600), '1h 00');
    assert.equal(duracao(2 * 3600 + 5 * 60), '2h 05');
});

test('formatarCrono: mm:ss e h:mm:ss', () => {
    assert.equal(formatarCrono(0), '00:00');
    assert.equal(formatarCrono(999), '00:00');
    assert.equal(formatarCrono(65_000), '01:05');
    assert.equal(formatarCrono(3_600_000), '1:00:00');
    assert.equal(formatarCrono(3_725_000), '1:02:05');
});

test('formatarTaxa: B, K e M', () => {
    assert.equal(formatarTaxa(0), '0B');
    assert.equal(formatarTaxa(1023), '1023B');
    assert.equal(formatarTaxa(2048), '2K');
    assert.equal(formatarTaxa(1048576), '1.0M');
    assert.equal(formatarTaxa(1.5 * 1048576), '1.5M');
});

test('bissexto', () => {
    assert.equal(bissexto(2024), true);
    assert.equal(bissexto(2100), false);
    assert.equal(bissexto(2000), true);
    assert.equal(bissexto(2026), false);
});

test('calcularProgresso: meio-dia de uma quarta, 15 de junho de 2026', () => {
    const p = calcularProgresso({
        hora: 12, minuto: 0, segundo: 0, diaSemana: 3, diaMes: 15, diasNoMes: 30, diaAno: 166, ano: 2026,
    });
    assert.equal(p.dia, 0.5);
    assert.equal(p.semana, (2 + 0.5) / 7);
    assert.equal(p.mes, (14 + 0.5) / 30);
    assert.equal(p.ano, (165 + 0.5) / 365);
});

test('calcularProgresso: começo e fim', () => {
    const inicio = calcularProgresso({hora: 0, minuto: 0, segundo: 0, diaSemana: 1, diaMes: 1, diasNoMes: 31, diaAno: 1, ano: 2025});
    assert.deepEqual(inicio, {dia: 0, semana: 0, mes: 0, ano: 0});
    const fim = calcularProgresso({hora: 23, minuto: 59, segundo: 59, diaSemana: 7, diaMes: 31, diasNoMes: 31, diaAno: 366, ano: 2024});
    for (const v of Object.values(fim))
        assert.ok(v < 1 && v > 0.99);
});

test('pct arredonda para baixo', () => {
    assert.equal(pct(0), '0%');
    assert.equal(pct(0.999), '99%');
    assert.equal(pct(1), '100%');
});

test('proximaFase: ciclo do pomodoro', () => {
    assert.deepEqual(proximaFase('foco', 0), {fase: 'pausa', ciclos: 1});
    assert.deepEqual(proximaFase('foco', 2), {fase: 'pausa', ciclos: 3});
    assert.deepEqual(proximaFase('foco', 3), {fase: 'longa', ciclos: 4});
    assert.deepEqual(proximaFase('pausa', 1), {fase: 'foco', ciclos: 1});
    assert.deepEqual(proximaFase('longa', 4), {fase: 'foco', ciclos: 4});
});

test('percentualCpu', () => {
    assert.equal(percentualCpu(null, {total: 100, ocioso: 50}), null);
    assert.equal(percentualCpu({total: 100, ocioso: 50}, {total: 100, ocioso: 50}), null);
    assert.equal(percentualCpu({total: 100, ocioso: 50}, {total: 200, ocioso: 100}), 50);
    assert.equal(percentualCpu({total: 100, ocioso: 50}, {total: 200, ocioso: 150}), 0);
    assert.equal(percentualCpu({total: 100, ocioso: 50}, {total: 200, ocioso: 50}), 100);
});

test('normalizarAmbientes: tolera lixo e preenche padrões', () => {
    assert.deepEqual(normalizarAmbientes('não é json'), []);
    assert.deepEqual(normalizarAmbientes('{}'), []);
    assert.deepEqual(normalizarAmbientes(undefined), []);
    const lista = normalizarAmbientes(JSON.stringify([
        {id: 'a', nome: 'A', apps: ['x.desktop']},
        {nome: 'sem id', apps: []},
        {id: 'b', nome: 'B'},
        null,
        {id: 'c', nome: 'C', apps: [], widgets: ['relogio'], colecoes: [{id: 'k', apps: ['y.desktop']}, {id: 'ruim'}]},
    ]));
    assert.deepEqual(lista.map(a => a.id), ['a', 'c']);
    assert.deepEqual(lista[0].widgets, []);
    assert.deepEqual(lista[0].colecoes, []);
    assert.deepEqual(lista[1].widgets, ['relogio']);
    assert.deepEqual(lista[1].colecoes.map(c => c.id), ['k']);
});

test('escolherAmbiente: id, ou o primeiro', () => {
    const lista = [{id: 'a'}, {id: 'b'}];
    assert.equal(escolherAmbiente(lista, 'b').id, 'b');
    assert.equal(escolherAmbiente(lista, 'zzz').id, 'a');
    assert.equal(escolherAmbiente([], 'a'), null);
});

test('appsDoAmbiente: fixados e coleções, sem repetir', () => {
    const amb = {apps: ['a', 'b'], colecoes: [{apps: ['b', 'c']}, {apps: ['d']}]};
    assert.deepEqual([...appsDoAmbiente(amb)].sort(), ['a', 'b', 'c', 'd']);
});

test('decidirDnd: ida e volta', () => {
    const lista = [{id: 'a'}, {id: 'b', naoperturbe: true}, {id: 'c'}];
    const ida = decidirDnd(lista, 'a', true, null);
    assert.equal(ida.ir, 'b');
    assert.deepEqual(ida.memoria, {de: 'a', para: 'b'});
    const volta = decidirDnd(lista, 'b', false, ida.memoria);
    assert.equal(volta.ir, 'a');
    assert.equal(volta.memoria, null);
});

test('decidirDnd: sem ambiente marcado ou já nele, não faz nada', () => {
    assert.equal(decidirDnd([{id: 'a'}], 'a', true, null).ir, null);
    const lista = [{id: 'a', naoperturbe: true}];
    const r = decidirDnd(lista, 'a', true, null);
    assert.equal(r.ir, null);
    assert.equal(r.memoria, null);
});

test('decidirDnd: se o usuário já saiu do ambiente, a volta não o puxa de lá', () => {
    const lista = [{id: 'a'}, {id: 'b', naoperturbe: true}, {id: 'c'}];
    const r = decidirDnd(lista, 'c', false, {de: 'a', para: 'b'});
    assert.equal(r.ir, null);
    assert.equal(r.memoria, null);
});

test('decidirDnd: desligar sem ter ligado por aqui não faz nada; ambiente de origem apagado também não', () => {
    assert.equal(decidirDnd([{id: 'a'}], 'a', false, null).ir, null);
    const r = decidirDnd([{id: 'b'}], 'b', false, {de: 'sumiu', para: 'b'});
    assert.equal(r.ir, null);
});

test('diasAte: futuro, hoje e passado', () => {
    const hoje = {ano: 2026, mes: 10, dia: 19};
    assert.equal(diasAte(hoje, '2026-10-19'), 0);
    assert.equal(diasAte(hoje, '2026-10-20'), 1);
    assert.equal(diasAte(hoje, '2026-10-18'), -1);
    assert.equal(diasAte(hoje, '2026-12-25'), 67);
    assert.equal(diasAte(hoje, '2027-10-19'), 365);
});

test('diasAte: vira de ano e conta o 29/02 de ano bissexto', () => {
    assert.equal(diasAte({ano: 2026, mes: 12, dia: 31}, '2027-01-01'), 1);
    assert.equal(diasAte({ano: 2028, mes: 2, dia: 28}, '2028-03-01'), 2);
    assert.equal(diasAte({ano: 2027, mes: 2, dia: 28}, '2027-03-01'), 1);
});

test('diasAte: datas inválidas viram null', () => {
    const hoje = {ano: 2026, mes: 10, dia: 19};
    for (const ruim of ['', undefined, 'amanhã', '2026-13-01', '2026-02-30', '2026-2-3', '19/10/2026'])
        assert.equal(diasAte(hoje, ruim), null, `esperava null para ${ruim}`);
});

test('deveAvisarDnd: só quando liga, há ambientes, nenhum marcado e nunca avisou', () => {
    const sem = [{id: 'a'}];
    assert.equal(deveAvisarDnd(sem, true, false), true);
    assert.equal(deveAvisarDnd(sem, false, false), false);
    assert.equal(deveAvisarDnd(sem, true, true), false);
    assert.equal(deveAvisarDnd([], true, false), false);
    assert.equal(deveAvisarDnd([{id: 'a', naoperturbe: true}], true, false), false);
});

test('registrarCopia: mais recente primeiro, sem repetir, com limite', () => {
    assert.deepEqual(registrarCopia([], 'a'), ['a']);
    assert.deepEqual(registrarCopia(['a', 'b'], 'c'), ['c', 'a', 'b']);
    assert.deepEqual(registrarCopia(['a', 'b', 'c'], 'b'), ['b', 'a', 'c']);
    assert.deepEqual(registrarCopia(['a', 'b', 'c'], 'd', {max: 3}), ['d', 'a', 'b']);
});

test('registrarCopia: ignora vazio, só espaços, não-texto e texto grande demais', () => {
    const h = ['a'];
    assert.equal(registrarCopia(h, ''), h);
    assert.equal(registrarCopia(h, '   \n'), h);
    assert.equal(registrarCopia(h, null), h);
    assert.equal(registrarCopia(h, 'x'.repeat(11), {maxChars: 10}), h);
    assert.deepEqual(registrarCopia(h, 'x'.repeat(10), {maxChars: 10}), ['x'.repeat(10), 'a']);
});

test('resumirTexto: primeira linha, espaços colapsados, corte com reticências', () => {
    assert.equal(resumirTexto('  olá   mundo  \nsegunda linha'), 'olá mundo');
    assert.equal(resumirTexto(''), '');
    assert.equal(resumirTexto(undefined), '');
    assert.equal(resumirTexto('abcdefghij', 5), 'abcd…');
    assert.equal(resumirTexto('abcde', 5), 'abcde');
});

test('semanasDoMes: outubro de 2026 começa numa quinta', () => {
    const s = semanasDoMes(2026, 10);
    assert.deepEqual(s[0], [null, null, null, null, 1, 2, 3]);
    assert.deepEqual(s[s.length - 1].filter(Boolean).slice(-1), [31]);
    assert.ok(s.every(sem => sem.length === 7));
    assert.equal(s.flat().filter(Boolean).length, 31);
});

test('semanasDoMes: fevereiro bissexto e mês que começa no domingo', () => {
    assert.equal(semanasDoMes(2028, 2).flat().filter(Boolean).length, 29);
    assert.equal(semanasDoMes(2027, 2).flat().filter(Boolean).length, 28);
    assert.equal(semanasDoMes(2026, 2)[0][0], 1); // 1º de fevereiro de 2026 é domingo
    assert.equal(semanasDoMes(2026, 2).length, 4);
});

test('mudarMes: vira o ano nos dois sentidos', () => {
    assert.deepEqual(mudarMes({ano: 2026, mes: 10}, 1), {ano: 2026, mes: 11});
    assert.deepEqual(mudarMes({ano: 2026, mes: 12}, 1), {ano: 2027, mes: 1});
    assert.deepEqual(mudarMes({ano: 2026, mes: 1}, -1), {ano: 2025, mes: 12});
});

test('escalaGrafico: usa o piso quando os valores são pequenos', () => {
    assert.equal(escalaGrafico([[1, 2], [3]], 10), 10);
    assert.equal(escalaGrafico([[100, 2], [3]], 10), 100);
    assert.equal(escalaGrafico([[], []], 10), 10);
});

test('formatarFaixa: microssegundos em m:ss', () => {
    assert.equal(formatarFaixa(0), '0:00');
    assert.equal(formatarFaixa(65_000_000), '1:05');
    assert.equal(formatarFaixa(3_725_000_000), '62:05');
    assert.equal(formatarFaixa(undefined), '0:00');
    assert.equal(formatarFaixa(-5), '0:00');
});
