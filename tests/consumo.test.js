import test from 'node:test';
import assert from 'node:assert/strict';
import {
    credencial, formatarFalta, formatarReinicio, juntarLimites, lerStatus, lerUso, nivel,
} from '../atlas@joaovitor12j.dev/consumo.js';

const H = 3600_000;

test('credencial pega o token do login e reconhece a falta ou o vencimento', () => {
    const agora = 10 * H;
    assert.deepEqual(credencial({claudeAiOauth: {accessToken: 't', expiresAt: agora + H}}, agora), {token: 't'});
    assert.deepEqual(credencial({claudeAiOauth: {accessToken: 't', expiresAt: 0}}, agora), {token: 't'}); // validade desconhecida
    assert.deepEqual(credencial({claudeAiOauth: {accessToken: 't', expiresAt: agora - 1}}, agora), {erro: 'expirado'});
    assert.deepEqual(credencial({mcpOAuth: {}}, agora), {erro: 'sem-login'});
    assert.deepEqual(credencial(null, agora), {erro: 'sem-login'});
});

test('lerUso converte a resposta da API de uso', () => {
    const u = lerUso({
        five_hour: {utilization: 63, resets_at: '2026-10-24T16:19:59.772Z'},
        seven_day: {utilization: 11.4, resets_at: '2026-10-30T23:59:59.943648+00:00'},
        seven_day_opus: null,
    });
    assert.deepEqual(u.cinco, {pct: 63, fim: Date.parse('2026-10-24T16:19:59.772Z')});
    assert.equal(u.semana.pct, 11.4);
    assert.ok(Number.isFinite(u.semana.fim));
    // janela ainda não aberta: % sem reinício
    assert.deepEqual(lerUso({five_hour: {utilization: 0, resets_at: null}}).cinco, {pct: 0, fim: null});
    assert.deepEqual(lerUso({}), {cinco: null, semana: null});
});

const st = (mtime, rl) => ({mtime, dados: {session_id: 'x', rate_limits: rl}});

test('lerStatus pega cada janela do JSON mais novo que a traz', () => {
    const agora = 10 * H;
    const l = lerStatus([
        st(agora - 5000, {five_hour: {used_percentage: 30, resets_at: (agora + H) / 1000}, seven_day: {used_percentage: 8, resets_at: (agora + 50 * H) / 1000}}),
        st(agora - 1000, {five_hour: {used_percentage: 64, resets_at: (agora + 2 * H) / 1000}}),
        st(agora - 500, {}),
    ]);
    assert.deepEqual(l.cinco, {pct: 64, fim: agora + 2 * H});
    assert.deepEqual(l.semana, {pct: 8, fim: agora + 50 * H});
    assert.equal(l.lidoEm, agora - 500);
    assert.deepEqual(lerStatus([]), {cinco: null, semana: null, lidoEm: 0});
});

test('juntarLimites prefere a leitura mais nova e zera a janela que já reiniciou', () => {
    const agora = 10 * H;
    const api = {cinco: {pct: 63, fim: agora + H}, semana: {pct: 11, fim: agora + 100 * H}, lidoEm: agora - 60_000};
    const status = {cinco: {pct: 70, fim: agora + H}, semana: null, lidoEm: agora - 1000};
    const l = juntarLimites([api, status], agora);
    assert.equal(l.cinco.pct, 70); // a statusline é mais nova
    assert.equal(l.semana.pct, 11); // só a API traz a semana
    assert.equal(l.lidoEm, agora - 1000);

    const vencida = juntarLimites([{cinco: {pct: 95, fim: agora - 1}, semana: null, lidoEm: agora - H}], agora);
    assert.deepEqual(vencida.cinco, {pct: 0, fim: null});
    assert.equal(juntarLimites([null, {cinco: null, semana: null, lidoEm: 0}], agora), null);
});

test('formatação do tempo até o reinício e da cor', () => {
    assert.equal(formatarFalta(12 * 60_000), '12 min');
    assert.equal(formatarFalta(2 * H + 49 * 60_000), '2 h 49 min');
    assert.equal(formatarFalta(3 * H), '3 h');
    assert.equal(formatarFalta(6 * 24 * H + 10 * H), '6 d 10 h');
    assert.equal(formatarFalta(-5), '0 min');
    const agora = new Date(2026, 9, 24, 10, 0).getTime();
    assert.equal(formatarReinicio(new Date(2026, 9, 24, 13, 19).getTime(), agora), 'às 13:19');
    assert.equal(formatarReinicio(new Date(2026, 9, 30, 20, 59).getTime(), agora), 'sex 20:59');
    assert.deepEqual([nivel(10), nivel(70), nivel(90)], ['ok', 'ambar', 'erro']);
});
