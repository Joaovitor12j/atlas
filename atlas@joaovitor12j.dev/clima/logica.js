// Lógica pura do clima (Open-Meteo): URLs, leitura da resposta, validade do cache e textos. Sem gi://, testável com node.

import {num} from '../nucleo/matematica.js';

// Código WMO (`weather_code`) -> [ícone, texto]. Os ícones são os que clima/desenho.js sabe desenhar.
const TEMPO_WMO = [
    [[0], 'limpo', 'Céu limpo'],
    [[1], 'poucas-nuvens', 'Poucas nuvens'],
    [[2], 'poucas-nuvens', 'Parcialmente nublado'],
    [[3], 'nublado', 'Nublado'],
    [[45, 48], 'nevoeiro', 'Nevoeiro'],
    [[51, 53, 55, 56, 57], 'garoa', 'Garoa'],
    [[61, 63, 66, 80, 81], 'chuva', 'Chuva'],
    [[65, 67, 82], 'chuva', 'Chuva forte'],
    [[71, 73, 75, 77, 85, 86], 'neve', 'Neve'],
    [[95, 96, 99], 'trovoada', 'Trovoada'],
];

export function descreverTempo(codigo) {
    const t = typeof codigo === 'number' && TEMPO_WMO.find(([cods]) => cods.includes(codigo));
    return t ? {icone: t[1], texto: t[2]} : {icone: 'nublado', texto: 'Sem dados'};
}

const coordValida = (lat, lon) => num(lat) !== null && num(lon) !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

// URL da previsão: agora, as próximas horas e 5 dias, no fuso do lugar.
export function urlClima(lat, lon) {
    if (!coordValida(lat, lon))
        return null;
    return 'https://api.open-meteo.com/v1/forecast' +
        `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m' +
        '&hourly=temperature_2m,precipitation_probability' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
        '&forecast_days=5&timezone=auto';
}

// Resposta da previsão -> {temp, sensacao, umidade, vento, codigo, dia, hora, horas: [{hora, temp, chuva}], dias:
// [{data, codigo, max, min, chuva}]}. `horas` são as `nHoras` a partir da hora atual. null se faltar o essencial.
export function lerClima(json, nHoras = 24) {
    const c = json?.current;
    if (!c || num(c.temperature_2m) === null || typeof c.time !== 'string')
        return null;
    const horas = [];
    const h = json.hourly;
    if (Array.isArray(h?.time)) {
        const agora = c.time.slice(0, 13); // "AAAA-MM-DDTHH"
        const i0 = h.time.findIndex(t => t.slice(0, 13) >= agora);
        for (let i = Math.max(0, i0); i0 >= 0 && i < h.time.length && horas.length < nHoras; i++) {
            if (num(h.temperature_2m?.[i]) !== null)
                horas.push({hora: Number(h.time[i].slice(11, 13)), temp: h.temperature_2m[i], chuva: num(h.precipitation_probability?.[i])});
        }
    }
    const d = json.daily;
    const dias = Array.isArray(d?.time) ? d.time.map((data, i) => ({
        data, codigo: num(d.weather_code?.[i]), max: num(d.temperature_2m_max?.[i]), min: num(d.temperature_2m_min?.[i]),
        chuva: num(d.precipitation_probability_max?.[i]),
    })).filter(x => x.max !== null && x.min !== null) : [];
    return {
        temp: c.temperature_2m, sensacao: num(c.apparent_temperature), umidade: num(c.relative_humidity_2m),
        vento: num(c.wind_speed_10m), codigo: num(c.weather_code), dia: c.is_day !== 0, hora: c.time, horas, dias,
    };
}

// 27.6 -> "28°"; -0.4 -> "0°" (sem "-0").
export function formatarTemp(t) {
    if (num(t) === null)
        return '--';
    const r = Math.round(t);
    return `${r === 0 ? 0 : r}°`;
}

// Hora de buscar de novo? Dados com mais de `validadeMs`; depois de uma falha, tenta a cada `esperaErroMs`.
export function climaVencido(agoraMs, buscadoEm, {erro = false, validadeMs = 30 * 60_000, esperaErroMs = 5 * 60_000} = {}) {
    if (!buscadoEm)
        return true;
    return agoraMs - buscadoEm >= (erro ? esperaErroMs : validadeMs);
}

// "AAAA-MM-DD" -> "seg", "ter"...; `hoje` (mesmo formato) vira "hoje".
export function diaCurto(data, hoje) {
    if (data === hoje)
        return 'hoje';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data ?? '');
    if (!m)
        return '';
    return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(Date.UTC(+m[1], m[2] - 1, +m[3])).getUTCDay()];
}

// Busca de cidade (geocodificação do Open-Meteo).
export function urlBuscaLocal(nome, n = 8) {
    const t = String(nome ?? '').trim();
    if (t.length < 2)
        return null;
    return `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(t)}&count=${n}&language=pt&format=json`;
}

// Resposta da busca -> [{nome, rotulo, lat, lon}]; `rotulo` junta estado e país para distinguir homônimos.
export function lerLocais(json) {
    if (!Array.isArray(json?.results))
        return [];
    return json.results.filter(r => typeof r?.name === 'string' && coordValida(r.latitude, r.longitude)).map(r => ({
        nome: r.name,
        rotulo: [r.name, r.admin1, r.country].filter((x, i, a) => x && a.indexOf(x) === i).join(', '),
        lat: r.latitude,
        lon: r.longitude,
    }));
}
