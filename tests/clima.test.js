import assert from 'node:assert/strict';
import test from 'node:test';
import {
    climaVencido, descreverTempo, diaCurto, formatarTemp, lerClima, lerLocais, urlBuscaLocal, urlClima,
} from '../atlas@joaovitor12j.dev/clima/logica.js';

// Recorte de uma resposta real do Open-Meteo (Fortaleza, 22/10/2026).
const RESPOSTA = {
    current: {
        time: '2026-10-22T16:15', temperature_2m: 28.4, apparent_temperature: 31.5, relative_humidity_2m: 73,
        weather_code: 0, is_day: 1, wind_speed_10m: 16.9,
    },
    hourly: {
        time: ['2026-10-22T15:00', '2026-10-22T16:00', '2026-10-22T17:00', '2026-10-22T18:00'],
        temperature_2m: [29.1, 28.5, 27.9, 27.0],
        precipitation_probability: [0, 0, 5, null],
    },
    daily: {
        time: ['2026-10-22', '2026-10-23'],
        weather_code: [1, 61],
        temperature_2m_max: [30.2, 29.8],
        temperature_2m_min: [24.1, 23.9],
        precipitation_probability_max: [3, 60],
    },
};

test('descreverTempo: códigos WMO em ícone e texto', () => {
    assert.deepEqual(descreverTempo(0), {icone: 'limpo', texto: 'Céu limpo'});
    assert.equal(descreverTempo(2).icone, 'poucas-nuvens');
    assert.equal(descreverTempo(3).icone, 'nublado');
    assert.equal(descreverTempo(45).icone, 'nevoeiro');
    assert.equal(descreverTempo(53).icone, 'garoa');
    assert.equal(descreverTempo(81).icone, 'chuva');
    assert.equal(descreverTempo(65).texto, 'Chuva forte');
    assert.equal(descreverTempo(75).icone, 'neve');
    assert.equal(descreverTempo(95).icone, 'trovoada');
    assert.equal(descreverTempo(null).texto, 'Sem dados');
    assert.equal(descreverTempo(1234).texto, 'Sem dados');
});

test('urlClima: só com coordenadas válidas', () => {
    const u = urlClima(-3.71722, -38.54306);
    assert.match(u, /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=-3\.7172&longitude=-38\.5431&/);
    assert.match(u, /timezone=auto/);
    assert.equal(urlClima(null, 0), null);
    assert.equal(urlClima(91, 0), null);
    assert.equal(urlClima(0, -181), null);
    assert.equal(urlClima(NaN, 0), null);
});

test('lerClima: agora, próximas horas a partir da atual e dias', () => {
    const c = lerClima(RESPOSTA);
    assert.equal(c.temp, 28.4);
    assert.equal(c.sensacao, 31.5);
    assert.equal(c.umidade, 73);
    assert.equal(c.vento, 16.9);
    assert.equal(c.codigo, 0);
    assert.equal(c.dia, true);
    assert.deepEqual(c.horas.map(h => h.hora), [16, 17, 18]);
    assert.equal(c.horas[0].temp, 28.5);
    assert.equal(c.horas[2].chuva, null);
    assert.deepEqual(c.dias[1], {data: '2026-10-23', codigo: 61, max: 29.8, min: 23.9, chuva: 60});
    assert.equal(lerClima(RESPOSTA, 2).horas.length, 2);
});

test('lerClima: noite, e resposta incompleta ou inválida', () => {
    assert.equal(lerClima({...RESPOSTA, current: {...RESPOSTA.current, is_day: 0}}).dia, false);
    const so = lerClima({current: RESPOSTA.current});
    assert.deepEqual(so.horas, []);
    assert.deepEqual(so.dias, []);
    for (const ruim of [null, {}, {current: {}}, {current: {time: '2026-10-22T16:00', temperature_2m: 'x'}}, {error: true, reason: 'x'}])
        assert.equal(lerClima(ruim), null);
});

test('formatarTemp: arredonda, sem -0', () => {
    assert.equal(formatarTemp(27.6), '28°');
    assert.equal(formatarTemp(-0.4), '0°');
    assert.equal(formatarTemp(-3.5), '-3°');
    assert.equal(formatarTemp(null), '--');
    assert.equal(formatarTemp(undefined), '--');
});

test('climaVencido: validade normal e espera menor depois de erro', () => {
    const min = 60_000;
    assert.equal(climaVencido(1000, 0), true);
    assert.equal(climaVencido(29 * min, 1), false);
    assert.equal(climaVencido(30 * min + 1, 1), true);
    assert.equal(climaVencido(4 * min, 1, {erro: true}), false);
    assert.equal(climaVencido(5 * min + 1, 1, {erro: true}), true);
});

test('diaCurto: hoje e dia da semana', () => {
    assert.equal(diaCurto('2026-10-22', '2026-10-22'), 'hoje');
    assert.equal(diaCurto('2026-10-23', '2026-10-22'), 'sex');
    assert.equal(diaCurto('2026-10-25', '2026-10-22'), 'dom');
    assert.equal(diaCurto('xx', '2026-10-22'), '');
});

test('urlBuscaLocal: codifica o nome e ignora texto curto', () => {
    assert.equal(urlBuscaLocal('a'), null);
    assert.equal(urlBuscaLocal('  '), null);
    assert.match(urlBuscaLocal('São Paulo'), /name=S%C3%A3o%20Paulo&count=8&language=pt/);
});

test('lerLocais: rótulo com estado e país, sem repetir e sem coordenada ruim', () => {
    const r = lerLocais({results: [
        {name: 'Fortaleza', admin1: 'Ceará', country: 'Brasil', latitude: -3.71722, longitude: -38.54306},
        {name: 'Brasília', admin1: 'Brasília', country: 'Brasil', latitude: -15.78, longitude: -47.93},
        {name: 'Lugar', latitude: 'x', longitude: 0},
    ]});
    assert.equal(r.length, 2);
    assert.deepEqual(r[0], {nome: 'Fortaleza', rotulo: 'Fortaleza, Ceará, Brasil', lat: -3.71722, lon: -38.54306});
    assert.equal(r[1].rotulo, 'Brasília, Brasil');
    assert.deepEqual(lerLocais({}), []);
    assert.deepEqual(lerLocais(null), []);
});
