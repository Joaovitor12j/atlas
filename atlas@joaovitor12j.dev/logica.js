// Lógica pura do ATLAS (sem gi://, St ou Shell): formatação, contas de tempo e ambientes.
// Fica separada para poder ser testada com `node --test` fora do GNOME Shell.

// Segundos -> "2h 05" ou "42 min".
export function duracao(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}` : `${m} min`;
}

// Milissegundos -> "mm:ss" ou "h:mm:ss".
export function formatarCrono(ms) {
    const t = Math.floor(ms / 1000);
    const h = Math.floor(t / 3600);
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
    const s = String(t % 60).padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// Bytes por segundo -> "512B", "20K" ou "1.5M".
export function formatarTaxa(bps) {
    if (bps >= 1048576)
        return `${(bps / 1048576).toFixed(1)}M`;
    if (bps >= 1024)
        return `${Math.round(bps / 1024)}K`;
    return `${Math.round(bps)}B`;
}

export const bissexto = a => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;

// Fração (0..1) do dia, da semana (começa na segunda), do mês e do ano já passada.
// diaSemana: 1 = segunda ... 7 = domingo; diaMes e diaAno começam em 1.
export function calcularProgresso({hora, minuto, segundo, diaSemana, diaMes, diasNoMes, diaAno, ano}) {
    const dia = (hora * 3600 + minuto * 60 + segundo) / 86400;
    return {
        dia,
        semana: (diaSemana - 1 + dia) / 7,
        mes: (diaMes - 1 + dia) / diasNoMes,
        ano: (diaAno - 1 + dia) / (bissexto(ano) ? 366 : 365),
    };
}

export const pct = f => `${Math.floor(f * 100)}%`;

// Pomodoro: foco concluído conta um ciclo; a cada 4 vem a pausa longa. Qualquer pausa volta ao foco.
export function proximaFase(fase, ciclos) {
    if (fase !== 'foco')
        return {fase: 'foco', ciclos};
    const c = ciclos + 1;
    return {fase: c % 4 === 0 ? 'longa' : 'pausa', ciclos: c};
}

// Uso de CPU (0..100) entre duas leituras de /proc/stat ({total, ocioso}); null se não dá para calcular.
export function percentualCpu(ant, agora) {
    if (!ant || !agora || agora.total <= ant.total)
        return null;
    const dt = agora.total - ant.total;
    return Math.round((1 - (agora.ocioso - ant.ocioso) / dt) * 100);
}

// Lê o JSON do GSettings: descarta o que não tem id/apps e preenche widgets e coleções.
export function normalizarAmbientes(texto) {
    try {
        const v = JSON.parse(texto ?? '[]');
        return Array.isArray(v)
            ? v.filter(a => a && a.id && Array.isArray(a.apps)).map(a => ({
                ...a,
                widgets: Array.isArray(a.widgets) ? a.widgets : [],
                colecoes: Array.isArray(a.colecoes) ? a.colecoes.filter(c => c && c.id && Array.isArray(c.apps)) : [],
            }))
            : [];
    } catch (_e) {
        return [];
    }
}

// O ambiente com esse id, ou o primeiro da lista.
export function escolherAmbiente(lista, id) {
    return lista.find(a => a.id === id) ?? lista[0] ?? null;
}

// Apps que pertencem a um ambiente: os fixados e os das coleções.
export function appsDoAmbiente(amb) {
    return new Set([...amb.apps, ...amb.colecoes.flatMap(c => c.apps)]);
}

// Não perturbe: decide para qual ambiente ir quando o modo liga ou desliga.
// `dnd` é true com o modo ligado; `memoria` é {de, para} do que esta função devolveu na ida, ou null.
// Na ida vai ao ambiente marcado com `naoperturbe`; na volta só retorna se o usuário ainda estiver nele.
export function decidirDnd(lista, atualId, dnd, memoria) {
    if (dnd) {
        const alvo = lista.find(a => a.naoperturbe);
        if (!alvo || alvo.id === atualId)
            return {ir: null, memoria};
        return {ir: alvo.id, memoria: {de: atualId, para: alvo.id}};
    }
    if (!memoria)
        return {ir: null, memoria: null};
    const volta = lista.find(a => a.id === memoria.de);
    return {ir: volta && atualId === memoria.para ? volta.id : null, memoria: null};
}

// Dias de `hoje` ({ano, mes, dia}) até `alvo` ("AAAA-MM-DD"): positivo é no futuro, 0 é hoje.
// null quando o texto não é uma data real (inclui 31/02).
export function diasAte(hoje, alvo) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(alvo ?? '');
    if (!m)
        return null;
    const [a, mes, d] = m.slice(1).map(Number);
    const dt = new Date(Date.UTC(a, mes - 1, d));
    if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== d)
        return null;
    return Math.round((dt.getTime() - Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia)) / 86400000);
}

// Quando avisar (uma vez) que o Não perturbe não faz nada por falta de um ambiente marcado.
export function deveAvisarDnd(lista, dnd, jaAvisou) {
    return dnd && !jaAvisou && lista.length > 0 && !lista.some(a => a.naoperturbe);
}

// Histórico da área de transferência: o texto mais recente primeiro, sem repetir, no máximo `max` itens.
// Texto vazio ou maior que `maxChars` não entra (cortar mudaria o que o usuário copiou).
export function registrarCopia(historico, texto, {max = 20, maxChars = 5000} = {}) {
    if (typeof texto !== 'string' || !texto.trim() || texto.length > maxChars)
        return historico;
    return [texto, ...historico.filter(t => t !== texto)].slice(0, max);
}

// Primeira linha, sem espaços repetidos, cortada em `max` caracteres com reticências.
export function resumirTexto(texto, max = 50) {
    const linha = (texto ?? '').trim().split(/\r?\n/)[0].replace(/\s+/g, ' ').trim();
    return linha.length > max ? `${linha.slice(0, max - 1)}…` : linha;
}

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Semanas do mês (domingo primeiro): listas de 7 posições com o dia, ou null fora do mês. `mes` vai de 1 a 12.
export function semanasDoMes(ano, mes) {
    const inicio = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay(); // 0 = domingo
    const dias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const celulas = [...Array(inicio).fill(null), ...Array.from({length: dias}, (_, i) => i + 1)];
    while (celulas.length % 7)
        celulas.push(null);
    const semanas = [];
    for (let i = 0; i < celulas.length; i += 7)
        semanas.push(celulas.slice(i, i + 7));
    return semanas;
}

// Mês anterior ou seguinte (delta = -1 ou 1), virando o ano quando preciso.
export function mudarMes({ano, mes}, delta) {
    const n = ano * 12 + (mes - 1) + delta;
    return {ano: Math.floor(n / 12), mes: (n % 12) + 1};
}

// Maior valor das séries, com um piso, para escalar um gráfico sem ficar colado no teto.
export function escalaGrafico(series, piso = 1) {
    return Math.max(piso, ...series.flat().filter(Number.isFinite));
}

// Microssegundos -> "m:ss" (posição de uma faixa de música).
export function formatarFaixa(us) {
    const t = Math.max(0, Math.floor((Number(us) || 0) / 1e6));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// Estado de notificações lido do texto do tooltip que um app de bandeja (StatusNotifierItem) publica.
// O Slack diz "Nenhuma mensagem não lida" quando não há nada; com mensagens o texto muda (e pode trazer o
// número). Devolve {tem, n}: `n` é o primeiro número do texto, ou null quando o texto não traz nenhum.
export function lerNaoLidas(texto) {
    const t = String(texto ?? '').trim().toLowerCase();
    if (!t)
        return {tem: false, n: null};
    const vazio = /\b(nenhum[a]?|sem|no|none|nothing)\b/.test(t) || /^0\b/.test(t) || /\b0 (mensage|message|notifica|men[cç])/.test(t);
    if (vazio)
        return {tem: false, n: null};
    const sinal = /(n[aã]o lida|unread|men[cç][aãõ]|mention|mensage|message|notifica|nova|new)/.test(t);
    if (!sinal)
        return {tem: false, n: null};
    const num = /(\d+)/.exec(t);
    return {tem: true, n: num ? Number(num[1]) : null};
}

// Texto do selo: o número (99+ no máximo) ou vazio para só o ponto.
export function textoDoSelo(n) {
    if (n === null || n === undefined)
        return '';
    return n > 99 ? '99+' : String(n);
}

// ----- Clima (Open-Meteo) -----

// Código WMO (`weather_code`) -> [ícone, texto]. Os ícones são os que desenho.js sabe desenhar.
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

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
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

// ----- Mascotes -----

// Cuco: quantas vezes canta. `hora` (0..23) vira 1..12, limitado por `max`; na meia hora é uma só.
export function batidasDoDisparo(hora, minuto, max = 3) {
    if (minuto === 30)
        return 1;
    return Math.min(hora % 12 || 12, max);
}

// Próxima hora cheia ou meia hora, em hora local, estritamente depois de `agoraMs` (epoch em ms).
// `intervalo`: 'hora' ou 'meia-hora'. Devolve {ms, hora, minuto} do alvo.
export function proximoDisparo(agoraMs, intervalo) {
    const passo = intervalo === 'meia-hora' ? 30 : 60;
    const d = new Date(agoraMs);
    d.setSeconds(0, 0);
    d.setMinutes((Math.floor(d.getMinutes() / passo) + 1) * passo);
    return {ms: d.getTime(), hora: d.getHours(), minuto: d.getMinutes()};
}

// `hora` está entre `das` e `ate`, inclusive; se `das > ate` a janela cruza a meia-noite.
export function naJanela(hora, das, ate) {
    return das <= ate ? hora >= das && hora <= ate : hora >= das || hora <= ate;
}

// Ao acordar: ainda cedo, hora de disparar, ou perdido (a suspensão do computador parou o relógio do GLib).
export function avaliarDisparo(agoraMs, alvoMs, toleranciaMs = 90_000) {
    if (agoraMs < alvoMs)
        return 'esperar';
    return agoraMs - alvoMs <= toleranciaMs ? 'disparar' : 'perdido';
}

// Quanto dormir até o alvo: um pouco depois dele, no máximo `teto` (o erro do relógio monotônico fica limitado).
export function esperaAte(agoraMs, alvoMs, teto = 15 * 60_000, folgaMs = 200) {
    return Math.max(folgaMs, Math.min(alvoMs - agoraMs + folgaMs, teto));
}

const limitar01 = x => Math.max(0, Math.min(1, x));
const easeOutCubic = x => 1 - (1 - x) ** 3;
const easeInCubic = x => x ** 3;
const easeInOut = x => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2);
const easeOutBack = x => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

// Mola amortecida de 0 a 1: passa uns 12% do alvo, volta e assenta (x de 0 a 1; vale 1 a partir do fim).
const molaAmortecida = x => (x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(x * 9));

// Sobe de trás da borda, fica e desce, com os princípios de animação aplicados num lugar só (os mascotes que sobem da
// doca usam): subida em mola com esticada (rápido = alto e fino), assentada com esmagada, respiração enquanto fica e,
// antes de descer, uma preparação (sobe um pouco, encolhe) seguida da queda esticada.
// Devolve {sobe, esmaga: {sx, sy}}: `sobe` de 0 a 1 (passa um pouco no overshoot) e `esmaga` é a escala em torno da
// borda da doca. `t` fora de [0, duração) devolve o estado escondido.
const FRAC_PREPARO = 0.22;
export const FINAIS = ['cai', 'afunda', 'espia', 'some'];

export function faseSobeDesce(t, {sobe, fica, desce}, saida = 'cai') {
    t = Math.max(0, t);
    let alfa = 1;
    const fimFica = sobe + fica;
    let s = 0;
    let sx = 1;
    let sy = 1;
    if (t < sobe) {
        const x = t / sobe;
        s = molaAmortecida(x);
        const v = molaAmortecida(Math.min(1, x + 0.04)) - s; // velocidade: quanto mais rápido, mais esticado
        sy += Math.min(0.14, v * 3.2);
        sx -= Math.min(0.08, v * 1.8);
    } else if (t < fimFica) {
        s = 1;
        const a = (t - sobe) / 260; // assentada: esmaga e volta oscilando
        const pouso = Math.exp(-5 * a) * Math.cos(a * 11);
        const respira = Math.sin(t / 430) * 0.012;
        sy += respira - 0.07 * pouso * Math.min(1, a * 6);
        sx += -respira * 0.6 + 0.045 * pouso * Math.min(1, a * 6);
    } else if (t < fimFica + desce) {
        const x = (t - fimFica) / desce;
        if (saida === 'afunda') {
            // some de vergonha: afunda devagar, sem preparação
            s = 1 - easeInOut(x);
            sy -= 0.04 * Math.sin(x * Math.PI);
        } else if (saida === 'espia') {
            // esconde, espia de volta e some de vez
            const ponto = (a, b, y) => a + (b - a) * easeInOut(limitar01(y));
            if (x < 0.3)
                s = ponto(1, 0.4, x / 0.3);
            else if (x < 0.5)
                s = 0.4;
            else if (x < 0.72)
                s = ponto(0.4, 0.85, (x - 0.5) / 0.22);
            else
                s = ponto(0.85, 0, (x - 0.72) / 0.28);
        } else if (saida === 'some') {
            // puf: desbota e encolhe no lugar
            s = 1;
            alfa = 1 - easeInOut(x);
            sx -= 0.18 * x;
            sy -= 0.18 * x;
        } else if (x < FRAC_PREPARO) {
            const p = Math.sin((x / FRAC_PREPARO) * Math.PI);
            s = 1 + 0.05 * p;
            sy -= 0.06 * p;
            sx += 0.04 * p;
        } else {
            const y = (x - FRAC_PREPARO) / (1 - FRAC_PREPARO);
            s = 1 - easeInCubic(y);
            sy += 0.1 * y;
            sx -= 0.05 * y;
        }
    }
    return {sobe: s, esmaga: {sx, sy}, alfa};
}

const CUCO = {sobe: 300, porta: 200, batida: 700, saida: 200, canto: 300, fecha: 200, desce: 300};
CUCO.inicio = CUCO.sobe + CUCO.porta;

export const duracaoCuco = batidas => CUCO.inicio + CUCO.batida * batidas + CUCO.fecha + CUCO.desce;

// Estado do cuco em `t` ms: {casa, porta, passaro, bico, inclina}, todos de 0 a 1 (o pássaro passa um pouco de 1
// no overshoot da saída). null depois do fim.
export function quadroCuco(t, batidas) {
    t = Math.max(0, t);
    const fimBatidas = CUCO.inicio + CUCO.batida * batidas;
    if (t >= duracaoCuco(batidas))
        return null;
    const q = {casa: 1, porta: 1, passaro: 0, bico: 0, inclina: 0};
    if (t < CUCO.sobe) {
        q.casa = easeOutCubic(t / CUCO.sobe);
        q.porta = 0;
    } else if (t < CUCO.inicio) {
        q.porta = easeInOut((t - CUCO.sobe) / CUCO.porta);
    } else if (t < fimBatidas) {
        const s = (t - CUCO.inicio) % CUCO.batida;
        if (s < CUCO.saida) {
            q.passaro = easeOutBack(s / CUCO.saida);
        } else if (s < CUCO.saida + CUCO.canto) {
            const x = (s - CUCO.saida) / CUCO.canto;
            q.passaro = 1;
            q.bico = Math.abs(Math.sin(x * 2 * Math.PI));
            q.inclina = Math.sin(x * Math.PI);
        } else {
            q.passaro = 1 - easeInOut((s - CUCO.saida - CUCO.canto) / (CUCO.batida - CUCO.saida - CUCO.canto));
        }
    } else if (t < fimBatidas + CUCO.fecha) {
        q.porta = 1 - easeInOut((t - fimBatidas) / CUCO.fecha);
    } else {
        q.porta = 0;
        q.casa = 1 - easeInCubic(limitar01((t - fimBatidas - CUCO.fecha) / CUCO.desce));
    }
    return q;
}

// `data` cai entre `ini` e `fim` (ambos [mês 0..11, dia], inclusive); se `ini` > `fim` a temporada vira o ano.
export function naTemporada(data, ini, fim) {
    const x = data.getMonth() * 100 + data.getDate();
    const a = ini[0] * 100 + ini[1];
    const b = fim[0] * 100 + fim[1];
    return a <= b ? x >= a && x <= b : x >= a || x <= b;
}

const FANTASMA = {sobe: 450, fica: 2000, desce: 400, susto: 300};
export const duracaoFantasma = () => FANTASMA.sobe + FANTASMA.fica + FANTASMA.desce;

// Estado do fantasma em `t` ms: {sobe, balanco, susto, fase}. `sobe` e `susto` de 0 a 1 (sobe passa um pouco de 1 no
// overshoot), `balanco` de -1 a 1, `fase` cresce sempre (ondulação da barra). null depois do fim.
export function quadroFantasma(t, saida = 'cai') {
    t = Math.max(0, t);
    if (t >= duracaoFantasma())
        return null;
    const fimFica = FANTASMA.sobe + FANTASMA.fica;
    const q = {...faseSobeDesce(t, FANTASMA, saida), balanco: Math.sin(t / 260), susto: 0, fase: t / 160};
    // o "bu!": abre a boca e levanta os braços logo depois de subir, e relaxa antes de descer
    const ini = FANTASMA.sobe + 300;
    q.susto = limitar01((t - ini) / FANTASMA.susto) * limitar01((fimFica - 200 - t) / FANTASMA.susto);
    return q;
}

const ESQUELETO = {sobe: 450, fica: 2400, desce: 400};
export const duracaoEsqueleto = () => ESQUELETO.sobe + ESQUELETO.fica + ESQUELETO.desce;

// Estado do esqueleto em `t` ms: {sobe, balanco, aceno, mandibula}. `sobe` de 0 a 1 (um pouco mais no overshoot),
// `balanco` e `aceno` de -1 a 1, `mandibula` de 0 a 1 (bate o queixo enquanto acena). null depois do fim.
export function quadroEsqueleto(t, saida = 'cai') {
    t = Math.max(0, t);
    if (t >= duracaoEsqueleto())
        return null;
    const fimFica = ESQUELETO.sobe + ESQUELETO.fica;
    const q = {...faseSobeDesce(t, ESQUELETO, saida), balanco: Math.sin(t / 320) * 0.6, aceno: 0, mandibula: 0};
    // acena e bate o queixo no meio da permanência, com entrada e saída suaves
    const rampa = limitar01((t - ESQUELETO.sobe - 150) / 250) * limitar01((fimFica - 150 - t) / 250);
    q.aceno = Math.sin(t / 130) * rampa;
    q.mandibula = Math.abs(Math.sin(t / 95)) * rampa;
    return q;
}

// Uso de memória em % (0 a 100) a partir do texto de /proc/meminfo; null se não der para ler.
export function usoMemoria(texto) {
    const total = Number(/MemTotal:\s+(\d+)/.exec(texto)?.[1]);
    const livre = Number(/MemAvailable:\s+(\d+)/.exec(texto)?.[1]);
    if (!total || !Number.isFinite(livre))
        return null;
    return Math.max(0, Math.min(100, (1 - livre / total) * 100));
}

// Mascote de memória: deve aparecer agora? Precisa estar armado (o uso já caiu abaixo da histerese desde a última
// vez), com o uso no limiar ou acima, e ter passado `esperaMs` desde a última aparição.
export function memoriaPedeAparicao(uso, limiar, armado, agoraMs, ultimoMs, esperaMs) {
    return uso !== null && armado && uso >= limiar && agoraMs - ultimoMs >= esperaMs;
}

// Rearma quando o uso cai 5 pontos abaixo do limiar, para não repetir enquanto a memória segue alta.
export const rearmarMemoria = (uso, limiar, armado) => armado || (uso !== null && uso < limiar - 5);

const CHAMA = {sobe: 400, fica: 3200, desce: 400};
export const duracaoChama = () => CHAMA.sobe + CHAMA.fica + CHAMA.desce;

// Estado da chama em `t` ms: {sobe, fase, aflicao}. `sobe` de 0 a 1 (um pouco mais no overshoot), `fase` cresce sempre
// (dança da chama) e `aflicao` de 0 a 1 é o quanto ela está assustada com o calor. null depois do fim.
export function quadroChama(t, saida = 'cai') {
    t = Math.max(0, t);
    if (t >= duracaoChama())
        return null;
    const fimFica = CHAMA.sobe + CHAMA.fica;
    const q = {...faseSobeDesce(t, CHAMA, saida), fase: t / 110, aflicao: 0};
    q.aflicao = limitar01((t - CHAMA.sobe) / 600) * limitar01((fimFica - t) / 400);
    return q;
}

// Sobe, fica e desce: {sobe, ativo} em `t` ms ou null depois do fim. `sobe` passa um pouco de 1 no overshoot e `ativo`
// (0 a 1) é a rampa da parte animada, que entra logo depois de subir e sai um pouco antes de descer.
function quadroSobeDesce(t, {sobe, fica, desce}, saida = 'cai') {
    t = Math.max(0, t);
    if (t >= sobe + fica + desce)
        return null;
    const fimFica = sobe + fica;
    return {...faseSobeDesce(t, {sobe, fica, desce}, saida), ativo: limitar01((t - sobe) / 250) * limitar01((fimFica - 150 - t) / 250)};
}

const NOEL = {sobe: 450, fica: 2800, desce: 400};
export const duracaoNoel = () => NOEL.sobe + NOEL.fica + NOEL.desce;

// Papai Noel em `t` ms: {sobe, balanco, aceno, riso}. `aceno` de -1 a 1 (braço direito) e `riso` de 0 a 1 (a barriga
// sacode no "ho ho ho"). null depois do fim.
export function quadroNoel(t, saida = 'cai') {
    const b = quadroSobeDesce(t, NOEL, saida);
    if (!b)
        return null;
    return {
        sobe: b.sobe,
        esmaga: b.esmaga,
        alfa: b.alfa,
        balanco: Math.sin(t / 380) * 0.5,
        aceno: Math.sin(t / 150) * b.ativo,
        riso: Math.abs(Math.sin(t / 210)) * b.ativo,
    };
}

const BONECO = {sobe: 450, fica: 2600, desce: 400};
export const duracaoBoneco = () => BONECO.sobe + BONECO.fica + BONECO.desce;

// Boneco de neve em `t` ms: {sobe, balanco, vento}. `vento` de -1 a 1 balança o cachecol e os galhos. null depois do fim.
export function quadroBoneco(t, saida = 'cai') {
    const b = quadroSobeDesce(t, BONECO, saida);
    if (!b)
        return null;
    return {sobe: b.sobe, esmaga: b.esmaga, alfa: b.alfa, balanco: Math.sin(t / 420) * 0.5, vento: Math.sin(t / 230) * (0.4 + 0.6 * b.ativo)};
}

// Onde pôr um mascote de `tam` {w, h, abaixo?}: centrado na doca `caixa` {x, y, w, h} e encostado no topo dela;
// `abaixo` px do actor descem sobre a doca (pingos, quem fica pendurado na borda).
// null quando não cabe acima (abaixo de `topoUtil`, a borda de cima da área útil).
// `dx` desloca na horizontal (mascotes lado a lado).
export function posicionarMascote(caixa, tam, topoUtil, dx = 0) {
    const y = caixa.y - tam.h + (tam.abaixo ?? 0);
    if (y < topoUtil)
        return null;
    return {x: Math.round(caixa.x + (caixa.w - tam.w) / 2 + dx), y: Math.round(y)};
}

// Quais dos `n` mascotes que coincidem aparecem, dado um sorteio `r` em [0, 1): com 1 só, ele; com vários, metade das
// vezes todos lado a lado e metade das vezes um só, sorteado. Devolve os índices.
export function escolherAparicao(n, r) {
    if (n <= 1)
        return Array.from({length: n}, (_, i) => i);
    if (r < 0.5)
        return Array.from({length: n}, (_, i) => i);
    return [Math.min(n - 1, Math.floor((r - 0.5) * 2 * n))];
}

// Deslocamento horizontal de cada mascote de largura `larguras[i]` para ficarem lado a lado, com `folga` entre eles,
// o conjunto centrado (um só fica em 0).
export function deslocamentosLado(larguras, folga = 0) {
    const total = larguras.reduce((s, w) => s + w, 0) + folga * (larguras.length - 1);
    let x = -total / 2;
    return larguras.map(w => {
        const centro = x + w / 2;
        x += w + folga;
        return centro;
    });
}

// Deslocamento horizontal (em relação ao centro da doca, de largura `larguraDoca`) para um conjunto de largura
// `largura` ficar em qualquer ponto dela sem passar das pontas, dado um sorteio `r` em [0, 1].
export function deslocamentoAleatorio(larguraDoca, largura, r) {
    const folga = Math.max(0, larguraDoca - largura);
    return Math.round((r - 0.5) * folga);
}

// ----- Mascotes do clima (frio e calor) -----

// Qual mascote do clima aparece agora: 'calor', 'frio' ou null. `temp` em °C (null sem previsão); `ligados`,
// `limiares`, `ultimos` (ms da última aparição) e `esperas` (ms) são {frio, calor}. Enquanto o tempo segue quente
// (ou frio), a espera é o que espaça as aparições.
export function mascoteDoClima(temp, ligados, limiares, ultimos, esperas, agoraMs) {
    if (typeof temp !== 'number' || !Number.isFinite(temp))
        return null;
    const tipo = temp >= limiares.calor ? 'calor' : temp <= limiares.frio ? 'frio' : null;
    if (!tipo || !ligados[tipo] || agoraMs - (ultimos[tipo] ?? -Infinity) < esperas[tipo])
        return null;
    return tipo;
}

// Movimento escolhido nas preferências, ou um sorteado (`r` em [0, 1)) com "sortear" ou valor desconhecido.
export function escolherVariante(valor, variantes, r) {
    if (variantes.includes(valor))
        return valor;
    return variantes[Math.min(variantes.length - 1, Math.floor(r * variantes.length))];
}

// Rampa de 0 a 1 entre `a` e `b` ms (com easeInOut); antes 0, depois 1.
const rampa = (t, a, b) => easeInOut(limitar01((t - a) / (b - a)));

// Picolé: sobe da doca, pinga pela borda, derrete numa poça e a poça evapora.
const PICOLE = {sobe: 450, pinga: 3000, derrete: 1300, evapora: 900};
export const duracaoPicole = () => PICOLE.sobe + PICOLE.pinga + PICOLE.derrete + PICOLE.evapora;

// {sobe, fase, suor, derrete, vapor, alfa}: `fase` cresce sempre (pingos), `derrete` de 0 (inteiro) a 1 (poça),
// `vapor` e `alfa` cuidam da poça sumindo. null depois do fim.
export function quadroPicole(t) {
    t = Math.max(0, t);
    if (t >= duracaoPicole())
        return null;
    const iDerrete = PICOLE.sobe + PICOLE.pinga;
    const iEvapora = iDerrete + PICOLE.derrete;
    const vapor = limitar01((t - iEvapora) / PICOLE.evapora);
    return {
        sobe: t < PICOLE.sobe ? easeOutBack(t / PICOLE.sobe) : 1,
        fase: t / 1000,
        suor: rampa(t, PICOLE.sobe, PICOLE.sobe + 500),
        derrete: rampa(t, iDerrete, iEvapora),
        vapor,
        alfa: 1 - easeInCubic(vapor),
    };
}

// Sol atravessando: nasce numa ponta da doca, faz um arco por cima e se põe na outra.
const SOL_ARCO = 5200;
export const duracaoSolArco = () => SOL_ARCO;

// {x, altura, giro}: `x` de 0 a 1 ao longo da doca (`dir` -1 vai da direita para a esquerda), `altura` de 0 (atrás
// da doca) a 1 (no alto do arco), `giro` em radianos (raios girando). null depois do fim.
export function quadroSolArco(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= SOL_ARCO)
        return null;
    const p = easeInOut(t / SOL_ARCO);
    return {x: dir < 0 ? 1 - p : p, altura: Math.sin(Math.PI * p), giro: t / 900};
}

// Sol de óculos: entra andando por uma ponta, para no meio, se abana e enxuga a testa, e sai pela outra.
const SOL_LEQUE = {entra: 1800, abana: 2600, sai: 1600};
export const duracaoSolLeque = () => SOL_LEQUE.entra + SOL_LEQUE.abana + SOL_LEQUE.sai;

// {x, anda, passo, leque, enxuga, dir}: `x` de 0 a 1 ao longo da doca (fora dela nas pontas), `anda` 1 enquanto
// caminha, `passo` é a fase das pernas, `leque` de -1 a 1 (abanando), `enxuga` de 0 a 1 (mão na testa). null no fim.
export function quadroSolLeque(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= duracaoSolLeque())
        return null;
    const iSai = SOL_LEQUE.entra + SOL_LEQUE.abana;
    let p;
    if (t < SOL_LEQUE.entra)
        p = -0.1 + 0.6 * easeOutCubic(t / SOL_LEQUE.entra);
    else if (t < iSai)
        p = 0.5;
    else
        p = 0.5 + 0.6 * easeInCubic((t - iSai) / SOL_LEQUE.sai);
    const anda = t < SOL_LEQUE.entra - 150 || t >= iSai + 100 ? 1 : 0;
    const abano = rampa(t, SOL_LEQUE.entra, SOL_LEQUE.entra + 300) * (1 - rampa(t, iSai - 1100, iSai - 800));
    return {
        x: dir < 0 ? 1 - p : p,
        anda,
        passo: t / 110,
        leque: Math.sin(t / 85) * abano,
        enxuga: rampa(t, iSai - 1100, iSai - 800) * (1 - rampa(t, iSai - 250, iSai)),
        dir: dir < 0 ? -1 : 1,
    };
}

// Pinguim no tobogã: desliza de barriga pela doca de ponta a ponta e dá um pulinho antes de sair.
const PINGUIM = 3800;
export const duracaoPinguim = () => PINGUIM;

// {x, pulo, inclina, dir}: `x` de 0 a 1 (fora da doca nas pontas), `pulo` de 0 a 1 (altura do pulinho), `inclina` em
// radianos (o corpo gira no pulo). null depois do fim.
export function quadroPinguim(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= PINGUIM)
        return null;
    const p = t / PINGUIM;
    const x = -0.08 + 1.16 * p;
    const pul = limitar01((p - 0.78) / 0.14);
    const pulo = pul > 0 && pul < 1 ? Math.sin(Math.PI * pul) : 0;
    return {x: dir < 0 ? 1 - x : x, pulo, inclina: -0.5 * pulo * (dir < 0 ? -1 : 1), dir: dir < 0 ? -1 : 1};
}

// Neve acumulando: flocos caem e formam um monte em cima da doca; um boneco espia do monte, treme e afunda.
const NEVE = {cai: 2600, espia: 2000, afunda: 500, derrete: 800, queda: 1100};
export const duracaoNeve = () => NEVE.cai + NEVE.espia + NEVE.afunda + NEVE.derrete;

// {t, monte, cabeca, treme, alfa}: `monte` de 0 a 1 (altura do monte), `cabeca` de 0 (escondida) a 1 (um pouco mais
// no overshoot), `treme` de -1 a 1, `alfa` some no fim. `t` vai para flocosDeNeve. null depois do fim.
export function quadroNeve(t) {
    t = Math.max(0, t);
    if (t >= duracaoNeve())
        return null;
    const iEspia = NEVE.cai;
    const iAfunda = iEspia + NEVE.espia;
    const iDerrete = iAfunda + NEVE.afunda;
    let cabeca = 0;
    if (t >= iEspia + 200 && t < iAfunda)
        cabeca = easeOutBack(limitar01((t - iEspia - 200) / 450));
    else if (t >= iAfunda && t < iDerrete)
        cabeca = 1 - easeInCubic((t - iAfunda) / NEVE.afunda);
    const alfa = 1 - easeInCubic(limitar01((t - iDerrete) / NEVE.derrete));
    return {t, monte: easeOutCubic(limitar01(t / (NEVE.cai + 300))), cabeca, treme: Math.sin(t / 32) * Math.min(1, cabeca), alfa};
}

// Pseudoaleatório fixo por índice (o mesmo floco cai sempre no mesmo lugar), em [0, 1).
const sorteioFixo = i => {
    const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
};

// Flocos no ar em `t` ms: [{x, y, r}] com `x` de 0 a 1 na largura, `y` de 0 (topo) a 1 (pousou) e `r` de 0.6 a 1
// (tamanho relativo). Os `n` flocos começam a cair espalhados pelo tempo de queda da neve.
export function flocosDeNeve(t, n = 22) {
    const flocos = [];
    for (let i = 0; i < n; i++) {
        const ini = (i / n) * NEVE.cai * 0.8 + sorteioFixo(i + 50) * 250;
        const f = (t - ini) / NEVE.queda;
        if (f < 0 || f >= 1)
            continue;
        const x0 = 0.08 + 0.84 * sorteioFixo(i);
        flocos.push({x: x0 + Math.sin(f * 5 + i) * 0.04, y: f, r: 0.6 + 0.4 * sorteioFixo(i + 100)});
    }
    return flocos;
}

// Pendurado tremendo: cai de cima, se agarra na borda da doca, balança, treme, espirra e cai.
const PENDURADO = {cai: 500, balanca: 2400, espirro: 800, solta: 700};
export const duracaoPendurado = () => PENDURADO.cai + PENDURADO.balanca + PENDURADO.espirro + PENDURADO.solta;

// {queda, balanco, treme, inspira, atchim, solta, alfa}: `queda` de -1 (acima, fora) a 0 (agarrado), `balanco` em
// radianos (pêndulo que amortece), `treme` de -1 a 1, `inspira` e `atchim` de 0 a 1 (o espirro), `solta` de 0
// (agarrado) a 1 (caiu). null depois do fim.
export function quadroPendurado(t) {
    t = Math.max(0, t);
    if (t >= duracaoPendurado())
        return null;
    const iBalanca = PENDURADO.cai;
    const iEspirro = iBalanca + PENDURADO.balanca;
    const iSolta = iEspirro + PENDURADO.espirro;
    const s = limitar01((t - iBalanca) / (PENDURADO.balanca + PENDURADO.espirro));
    const solta = easeInCubic(limitar01((t - iSolta) / PENDURADO.solta));
    return {
        queda: t < iBalanca ? easeOutBack(t / iBalanca) - 1 : 0,
        balanco: t < iBalanca ? 0 : Math.sin((t - iBalanca) / 260) * 0.35 * (1 - 0.6 * s),
        treme: Math.sin(t / 30) * rampa(t, iBalanca, iBalanca + 300) * (1 - rampa(t, iSolta, iSolta + 100)),
        inspira: rampa(t, iEspirro, iEspirro + 500) * (1 - rampa(t, iEspirro + 500, iEspirro + 560)),
        atchim: limitar01((t - iEspirro - 500) / 300) * (1 - limitar01((t - iSolta - 200) / 300)),
        solta,
        alfa: 1 - easeInCubic(limitar01((t - iSolta - PENDURADO.solta * 0.4) / (PENDURADO.solta * 0.6))),
    };
}

// Tamanho do actor de cada movimento, em px, a partir do tamanho dos ícones `icone` e da largura da doca: {w, h,
// abaixo} (`abaixo` é a parte que desce sobre a doca). Os que atravessam a doca ocupam a largura toda dela.
export function tamanhoMascoteClima(variante, icone, larguraDoca) {
    const a = icone;
    const r = x => Math.round(x);
    switch (variante) {
    case 'picole':
        return {w: r(a * 1.3), h: r(a * 2.2), abaixo: r(a * 0.7)};
    case 'sol-arco':
        return {w: r(larguraDoca), h: r(a * 2), abaixo: 0};
    case 'sol-leque':
    case 'sol-corre':
        return {w: r(larguraDoca), h: r(a * 1.7), abaixo: 0};
    case 'sol-quica':
    case 'sol-nasce':
        return {w: r(larguraDoca), h: r(a * 2), abaixo: 0};
    case 'cuco-voa':
        return {w: r(larguraDoca), h: r(a * 2.4), abaixo: 0};
    case 'pinguim':
    case 'pinguim-pula':
    case 'pinguim-anda':
        return {w: r(larguraDoca), h: r(a * 1.3), abaixo: 0};
    case 'neve':
        return {w: r(a * 2.6), h: r(a * 3.2), abaixo: 0};
    case 'pendurado':
        return {w: r(a * 1.6), h: r(a * 2.4), abaixo: r(a * 1.8)};
    default:
        return null;
    }
}

// ----- Passeios: mascotes que atravessam a doca em vez de só subir e descer -----
// Cada passeio é uma configuração: `dur` em ms, `fig` [largura, altura] da figura em múltiplos do ícone, `cabeca` (folga
// acima da figura, em múltiplos da altura dela), `modo` do movimento (`flutua`: paira e balança; `anda`: passinhos;
// `salta`: pulos de um lado ao outro), `passoMs` (período de um ciclo), `altura` (pairando, em alturas da figura),
// `bob` (amplitude, em alturas), `inclina` (rad) e `pausa` opcional {dur}: para no meio da doca por `dur` ms.
export const PASSEIOS = {
    'fantasma-flutua': {dur: 6200, fig: [1.4, 1.8], cabeca: 0.3, modo: 'flutua', passoMs: 1500, altura: 0.12, bob: 0.07, inclina: 0.1, pausa: {dur: 1500}},
    'fantasma-zigue': {dur: 4600, fig: [1.4, 1.8], cabeca: 0.5, modo: 'flutua', passoMs: 900, altura: 0.3, bob: 0.22, inclina: 0.22},
    'esqueleto-caminha': {dur: 7000, fig: [1.2, 1.9], cabeca: 0.1, modo: 'anda', passoMs: 380, bob: 0.03, inclina: 0.07, pausa: {dur: 1900}},
    'esqueleto-danca': {dur: 6600, fig: [1.2, 1.9], cabeca: 0.3, modo: 'salta', passoMs: 520, bob: 0.1, inclina: 0.14, pausa: {dur: 3600}},
    'noel-passeia': {dur: 7000, fig: [1.3, 1.8], cabeca: 0.1, modo: 'anda', passoMs: 420, bob: 0.03, inclina: 0.06, pausa: {dur: 2200}},
    'noel-pula': {dur: 5600, fig: [1.3, 1.8], cabeca: 0.4, modo: 'salta', passoMs: 800, bob: 0.22, inclina: 0.05},
    'boneco-desliza': {dur: 5200, fig: [1.2, 1.8], cabeca: 0.1, modo: 'flutua', passoMs: 700, altura: 0.012, bob: 0.012, inclina: 0.16},
    'boneco-pula': {dur: 5400, fig: [1.2, 1.8], cabeca: 0.4, modo: 'salta', passoMs: 700, bob: 0.2, inclina: 0.05},
    'chama-salta': {dur: 4200, fig: [1.1, 1.5], cabeca: 0.5, modo: 'salta', passoMs: 600, bob: 0.3, inclina: 0.1},
    'cuco-passeia': {dur: 8200, fig: [1.6, 2], cabeca: 0.1, modo: 'anda', passoMs: 460, bob: 0.015, inclina: 0.05, pausa: {dur: 3600}},
    'coruja-salta': {dur: 5200, fig: [1.2, 1.4], cabeca: 0.4, modo: 'salta', passoMs: 700, bob: 0.2, inclina: 0.07},
    'pilha-arrasta': {dur: 7400, fig: [1, 1.5], cabeca: 0.1, modo: 'anda', passoMs: 760, bob: 0.02, inclina: 0.06, pausa: {dur: 2000}},
    'satelite-deriva': {dur: 6400, fig: [1.3, 1.3], cabeca: 0.4, modo: 'flutua', passoMs: 1800, altura: 0.25, bob: 0.12, inclina: 0.14},
    'tomate-pula': {dur: 4800, fig: [1.1, 1.1], cabeca: 0.5, modo: 'salta', passoMs: 600, bob: 0.25, inclina: 0.08},
    'chama-corre': {dur: 3200, fig: [1.1, 1.5], cabeca: 0.2, modo: 'anda', passoMs: 200, bob: 0.08, inclina: 0.16},
};

export const duracaoPasseio = chave => PASSEIOS[chave].dur;

// Tamanho do actor de um passeio: a largura da doca inteira e a altura da figura mais a folga para pulos e voo.
export function tamanhoPasseio(chave, icone, larguraDoca) {
    const c = PASSEIOS[chave];
    return {w: Math.round(larguraDoca), h: Math.round(icone * c.fig[1] * (1 + c.cabeca + (c.altura ?? 0) + c.bob)), abaixo: 0};
}

// Estado do passeio em `t` ms: {x, dy, rot, sx, sy, parado, acena, t, dir}. `x` de 0 a 1 ao longo da doca (um pouco
// fora nas pontas; `dir` -1 vai da direita para a esquerda), `dy` é a altura do chão em alturas da figura, `rot` a
// inclinação em rad e `sx`/`sy` o esticar e esmagar. `parado` (0 a 1) vale 1 enquanto para no meio e `acena` oscila
// de -1 a 1 nessa hora. null depois do fim.
export function quadroPasseio(t, dir, c) {
    t = Math.max(0, t);
    if (t >= c.dur)
        return null;
    const margem = 0.14;
    const lerp = (a, b, x) => a + (b - a) * limitar01(x);
    let p;
    let parado = 0;
    if (c.pausa) {
        const a = (c.dur - c.pausa.dur) / 2;
        if (t < a) {
            p = lerp(-margem, 0.5, t / a);
        } else if (t < a + c.pausa.dur) {
            p = 0.5;
            parado = rampa(t, a, a + 250) * (1 - rampa(t, a + c.pausa.dur - 250, a + c.pausa.dur));
        } else {
            p = lerp(0.5, 1 + margem, (t - a - c.pausa.dur) / a);
        }
    } else {
        p = lerp(-margem, 1 + margem, t / c.dur);
    }
    const andando = 1 - parado;
    const ciclo = (t % c.passoMs) / c.passoMs;
    let dy = 0;
    let rot = 0;
    let sx = 1;
    let sy = 1;
    if (c.modo === 'flutua') {
        dy = c.altura + Math.sin(ciclo * 2 * Math.PI) * c.bob;
        rot = Math.sin(ciclo * 2 * Math.PI + 1) * c.inclina * 0.6 + (dir < 0 ? -1 : 1) * c.inclina * 0.5 * andando;
    } else if (c.modo === 'anda') {
        dy = Math.abs(Math.sin(ciclo * Math.PI)) * c.bob * andando;
        rot = Math.sin(ciclo * 2 * Math.PI) * c.inclina * andando;
    } else {
        const s = Math.sin(ciclo * Math.PI);
        dy = s * c.bob;
        const chao = 1 - Math.min(1, s * 4); // perto do chão: agacha e alarga
        sy = 1 - 0.12 * chao + 0.06 * (1 - chao);
        sx = 1 + 0.08 * chao - 0.03 * (1 - chao);
        rot = Math.sin(ciclo * 2 * Math.PI) * c.inclina;
    }
    return {
        x: dir < 0 ? 1 - p : p, dy, rot, sx, sy, parado, t, dir: dir < 0 ? -1 : 1,
        acena: Math.sin(t / 150) * parado,
    };
}

// ----- Movimentos extras (Cuco, Calor e Frio) -----

// Cuco voando: o pássaro sai da casinha e cruza a doca batendo asas e cantando.
const CUCO_VOA = 4800;
export const duracaoCucoVoa = () => CUCO_VOA;

// {x, alt, asa, bico, dir}: `x` de 0 a 1 ao longo da doca (fora nas pontas), `alt` altura do voo em ícones, `asa` de -1
// a 1 (batida), `bico` de 0 a 1. null depois do fim.
export function quadroCucoVoa(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= CUCO_VOA)
        return null;
    const p = t / CUCO_VOA;
    const x = -0.1 + 1.2 * p;
    return {
        x: dir < 0 ? 1 - x : x,
        alt: 0.9 + 0.35 * Math.sin(p * Math.PI * 3),
        asa: Math.sin(t / 55),
        bico: Math.abs(Math.sin(t / 210)),
        dir: dir < 0 ? -1 : 1,
    };
}

// Sol correndo: atravessa a doca sem parar, abanando o leque o tempo todo.
const SOL_CORRE = 3000;
export const duracaoSolCorre = () => SOL_CORRE;

// Mesmo estado do sol de óculos (quadroSolLeque), só que correndo: passos curtos e rápidos e o leque a mil.
export function quadroSolCorre(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= SOL_CORRE)
        return null;
    const p = -0.1 + 1.2 * (t / SOL_CORRE);
    return {x: dir < 0 ? 1 - p : p, anda: 1, passo: t / 70, leque: Math.sin(t / 55), enxuga: 0, dir: dir < 0 ? -1 : 1};
}

// Sol quicando: atravessa a doca pulando, como uma bola.
const SOL_QUICA = 4400;
export const duracaoSolQuica = () => SOL_QUICA;

// Estado do sol no arco (quadroSolArco): `altura` sobe e desce em quicadas.
export function quadroSolQuica(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= SOL_QUICA)
        return null;
    const p = t / SOL_QUICA;
    const x = -0.02 + 1.04 * p;
    return {x: dir < 0 ? 1 - x : x, altura: 0.18 + 0.55 * Math.abs(Math.sin(p * Math.PI * 5)) * (1 - 0.3 * p), giro: t / 600};
}

// Sol nascendo no meio da doca: sobe, brilha e se põe no mesmo lugar.
const SOL_NASCE = {sobe: 1500, brilha: 2600, desce: 1300};
export const duracaoSolNasce = () => SOL_NASCE.sobe + SOL_NASCE.brilha + SOL_NASCE.desce;

export function quadroSolNasce(t) {
    t = Math.max(0, t);
    if (t >= duracaoSolNasce())
        return null;
    const iDesce = SOL_NASCE.sobe + SOL_NASCE.brilha;
    let altura = 1;
    if (t < SOL_NASCE.sobe)
        altura = easeOutCubic(t / SOL_NASCE.sobe);
    else if (t >= iDesce)
        altura = 1 - easeInCubic((t - iDesce) / SOL_NASCE.desce);
    return {x: 0.5, altura, giro: t / 700};
}

// Pinguim pulando: atravessa a doca em pulinhos seguidos.
const PINGUIM_PULA = 4400;
export const duracaoPinguimPula = () => PINGUIM_PULA;

// Mesmo estado do pinguim (quadroPinguim): vários pulos pelo caminho.
export function quadroPinguimPula(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= PINGUIM_PULA)
        return null;
    const p = t / PINGUIM_PULA;
    const x = -0.08 + 1.16 * p;
    const ciclo = (p * 8) % 1;
    const pulo = Math.sin(Math.PI * ciclo);
    return {x: dir < 0 ? 1 - x : x, pulo, inclina: -0.35 * pulo * (dir < 0 ? -1 : 1), dir: dir < 0 ? -1 : 1};
}

// Pinguim andando de lado a lado e parando no meio, balançando como pinguim.
const PINGUIM_ANDA = 5200;
export const duracaoPinguimAnda = () => PINGUIM_ANDA;

export function quadroPinguimAnda(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= PINGUIM_ANDA)
        return null;
    const a = 1800;
    const parado = 1600;
    let x;
    let anda = 1;
    if (t < a) {
        x = -0.08 + 0.58 * easeOutCubic(t / a);
    } else if (t < a + parado) {
        x = 0.5;
        anda = 0;
    } else {
        x = 0.5 + 0.58 * easeInCubic((t - a - parado) / (PINGUIM_ANDA - a - parado));
    }
    const balanco = Math.sin(t / 150);
    return {
        x: dir < 0 ? 1 - x : x,
        pulo: anda ? 0.12 * Math.abs(balanco) : 0.04 * Math.abs(Math.sin(t / 400)),
        inclina: balanco * (anda ? 0.22 : 0.05),
        dir: dir < 0 ? -1 : 1,
    };
}

// ----- Mascotes novos: coruja, pilha (bateria baixa), satélite (sem rede) e tomate (pomodoro) -----

// Olho aberto de 0 a 1: fecha por ~150 ms a cada `periodo` ms (piscada).
const piscada = (t, periodo = 2100) => {
    const f = t % periodo;
    return f < 150 ? 1 - Math.sin((f / 150) * Math.PI) : 1;
};

const CORUJA = {sobe: 450, fica: 3600, desce: 400};
export const duracaoCoruja = () => CORUJA.sobe + CORUJA.fica + CORUJA.desce;

// Estado da coruja em `t` ms: {sobe, esmaga, alfa, sono, olhos, cabeca}. Sobe dormindo (`sono` 1, olhos fechados),
// acorda, pisca e olha em volta (`cabeca` de -1 a 1) e volta a dormir antes de descer. null depois do fim.
export function quadroCoruja(t, saida = 'cai') {
    const q = quadroSobeDesce(t, CORUJA, saida);
    if (!q)
        return null;
    const fimFica = CORUJA.sobe + CORUJA.fica;
    const sono = 1 - rampa(t, CORUJA.sobe + 400, CORUJA.sobe + 900) + rampa(t, fimFica - 900, fimFica - 300);
    const sonoOk = limitar01(sono);
    return {...q, sono: sonoOk, olhos: (1 - sonoOk) * piscada(t, 1700), cabeca: Math.sin(t / 650) * (1 - sonoOk)};
}

const PILHA = {sobe: 500, fica: 3200, desce: 450};
export const duracaoPilha = () => PILHA.sobe + PILHA.fica + PILHA.desce;

// Estado da pilha em `t` ms: {sobe, esmaga, alfa, nivel, cansaco, suspiro}. `nivel` (0 a 1) é a carga, sempre baixa e
// piscando; `cansaco` de -1 a 1 é o balanço de sono em pé e `suspiro` de 0 a 1 a pausa pesada. null depois do fim.
export function quadroPilha(t, saida = 'cai') {
    const q = quadroSobeDesce(t, PILHA, saida);
    if (!q)
        return null;
    return {
        ...q,
        nivel: 0.1 + 0.05 * Math.abs(Math.sin(t / 420)),
        cansaco: Math.sin(t / 700) * 0.8,
        suspiro: 0.5 + 0.5 * Math.sin(t / 900),
    };
}

const SATELITE = {sobe: 500, fica: 3400, desce: 450};
export const duracaoSatelite = () => SATELITE.sobe + SATELITE.fica + SATELITE.desce;

// Estado do satélite em `t` ms: {sobe, esmaga, alfa, giro, sinal, perdido}. `giro` (rad) é o balanço da antena
// procurando o sinal e `sinal` (0 a 1) o pulso do arco que nunca chega; `perdido` vale 1 durante a permanência. null
// depois do fim.
export function quadroSatelite(t, saida = 'cai') {
    const q = quadroSobeDesce(t, SATELITE, saida);
    if (!q)
        return null;
    return {...q, giro: Math.sin(t / 520) * 0.5, sinal: (t % 1300) / 1300, perdido: q.ativo};
}

const TOMATE = {sobe: 400, fica: 3000, desce: 400};
export const duracaoTomate = () => TOMATE.sobe + TOMATE.fica + TOMATE.desce;

// Estado do tomate em `t` ms: {sobe, esmaga, alfa, pulo, confete}. `pulo` (0 a 1) é a altura do pulinho de alegria e
// `confete` o tempo, em segundos, desde o estouro (0 antes de subir). null depois do fim.
export function quadroTomate(t, saida = 'cai') {
    const q = quadroSobeDesce(t, TOMATE, saida);
    if (!q)
        return null;
    return {...q, pulo: q.ativo * Math.abs(Math.sin(t / 240)), confete: Math.max(0, t - TOMATE.sobe * 0.6) / 1000};
}

// Posição (0 a 1 de cada eixo, relativa ao ponto de origem) de cada pedaço de confete `i` de `n`, `s` segundos depois
// do estouro: sobe em arco, cai com a gravidade e gira. Determinístico (sem sorteio) para a prévia bater com o Shell.
export function confete(i, n, s) {
    const ang = -Math.PI / 2 + ((i / n) - 0.5) * 2.4 + Math.sin(i * 12.9898) * 0.25;
    const vel = 0.9 + 0.5 * Math.abs(Math.sin(i * 78.233));
    return {x: Math.cos(ang) * vel * s, y: Math.sin(ang) * vel * s + 1.6 * s * s, giro: s * (4 + (i % 5)) * (i % 2 ? 1 : -1)};
}

// Folhas de sprites (sprites/<id>.png, quadros lado a lado): `quadros`, tamanho de cada um (`fw` x `fh`, em px da
// imagem), `chao` (a linha dos pés, em px a partir do topo do quadro) e `altura`, a do mascote em múltiplos do ícone.
// quanto o sprite afunda na doca, em ícones: os pés pousam no vidro, não na linha do topo
const PE_NA_DOCA = 0.25;
export const SPRITES = {
    gato: {arquivo: 'gato.png', quadros: 6, fw: 212, fh: 131, chao: 123, altura: 1.25},
};

// Gato (ou outro sprite que anda) atravessando a doca de ponta a ponta. A posição avança em velocidade quase constante
// (`velocidade` em ícones por segundo, com uma leve respirada) e o quadro é amarrado à distância percorrida
// (`passo` = comprimento do ciclo de quadros em larguras do sprite), então os pés não escorregam.
// Devolve {x, quadro, dir, escala, pe}: `x` em px dentro do actor de largura `largura` e `pe` quanto os pés afundam
// abaixo da linha do topo da doca (o vidro da doca tem uma folga em cima). null depois do fim.
export function quadroSprite(t, dir, spec, {largura, icone, velocidade, passo}) {
    t = Math.max(0, t);
    const escala = (icone * spec.altura) / spec.fh;
    const fw = spec.fw * escala;
    const dist = icone * velocidade * (t / 1000 + 0.12 * Math.sin(t / 900));
    if (dist >= largura + fw)
        return null;
    const ciclo = dist / (fw * passo);
    const quadro = Math.floor((ciclo % 1) * spec.quadros) % spec.quadros;
    const x = dir < 0 ? largura + fw / 2 - dist : -fw / 2 + dist;
    return {x, quadro, dir: dir < 0 ? -1 : 1, escala, pe: icone * PE_NA_DOCA};
}

// Bateria baixa: deve aparecer agora? Só descarregando (estado 2 do UPower), no limiar ou abaixo, armado (já carregou
// ou subiu 5 pontos desde a última) e depois de `esperaMs` da aparição anterior.
export function bateriaPedeAparicao(pct, estado, limiar, armado, agoraMs, ultimoMs, esperaMs) {
    return pct !== null && estado === 2 && armado && pct <= limiar && agoraMs - ultimoMs >= esperaMs;
}

// Rearma quando a bateria carrega ou passa 5 pontos do limiar.
export const rearmarBateria = (pct, estado, limiar, armado) => armado || estado !== 2 || (pct !== null && pct > limiar + 5);

// Escala de um ícone a `distancia` px do ponteiro: gaussiana entre 1 (longe) e `forca` (embaixo do ponteiro).
export function escalaLente(distancia, forca, largura) {
    return 1 + (forca - 1) * Math.exp(-(distancia * distancia) / (2 * largura * largura));
}

// Mascote residente (mora na doca do tema atual, nunca sai): `estados` é [[id, peso]], peso maior = mais comum
// ("parado" costuma pesar mais). `r` em [0, 1) escolhe o próximo estado por roleta ponderada.
export function proximoEstadoResidente(estados, r) {
    const total = estados.reduce((s, [, peso]) => s + peso, 0);
    let acc = r * total;
    for (const [id, peso] of estados) {
        if (acc < peso)
            return id;
        acc -= peso;
    }
    return estados[estados.length - 1][0];
}

// Água-viva (tema Aurora): sino pulsando (mais rápido nadando) e 5 tentáculos ondulando com atraso entre eles.
// `t` em ms desde que o estado atual começou.
export function quadroAguaViva(t, estado) {
    const dormindo = estado === 'dormindo';
    const periodo = estado === 'nadando' ? 950 : 3400;
    const sino = dormindo ? 0.15 : 0.5 + 0.5 * Math.sin((t / periodo) * Math.PI * 2);
    const tentaculos = Array.from({length: 5}, (_, i) => {
        if (dormindo)
            return 0;
        const fase = (t - i * 120) / (periodo * 0.6) * Math.PI * 2;
        return Math.sin(fase) * (estado === 'nadando' ? 18 : 10);
    });
    return {sino, tentaculos, dormindo, brilho: estado === 'brilhando' ? 0.5 + 0.5 * Math.sin(t / 260) : 0};
}

// Gaivota (tema Carta): pernas giram no quadril andando (0,8 s, ±24°), asas batem voando (0,45 s, -28° a 42°).
export function quadroGaivota(t, estado) {
    const dormindo = estado === 'dormindo';
    const voando = estado === 'voando';
    const andando = estado === 'andando';
    const perna = andando ? Math.sin(t / 800 * Math.PI * 2) * 24 : 0;
    const asa = voando ? -28 + (42 + 28) * (0.5 + 0.5 * Math.sin(t / 450 * Math.PI * 2)) : dormindo ? -4 : 0;
    const voo = voando ? Math.sin(t / 900 * Math.PI * 2) * 4 : 0;
    return {perna, asa, voo, voando, dormindo};
}

// Gato ilustrado (tema Jardim): pernas ±22° em 0,8 s (±38° em 0,5 s correndo); rabo e orelha com fase própria.
export function quadroGatoIlustrado(t, estado) {
    const dormindo = estado === 'dormindo';
    const correndo = estado === 'correndo';
    const periodo = correndo ? 500 : 800;
    const amp = correndo ? 38 : 22;
    const perna = (estado === 'andando' || correndo) ? Math.sin(t / periodo * Math.PI * 2) * amp : 0;
    const rabo = dormindo ? 0 : Math.sin(t / 600 * Math.PI * 2) * (correndo ? 10 : 16);
    const orelha = Math.sin(t / 900 * Math.PI * 2) * 2;
    const piscada = !dormindo && (t % 2600) < 120;
    return {perna, rabo, orelha, piscada, dormindo, correndo};
}

// Sapo (tema Chuva): salto de 1,1 s (agachar/esticar/pousar), papo infla ao coaxar, guarda-chuva balança no vento.
export function quadroSapo(t, estado) {
    const dormindo = estado === 'dormindo';
    const pulando = estado === 'pulando';
    const ciclo = (t % 1100) / 1100;
    const salto = pulando ? Math.sin(ciclo * Math.PI) : 0;
    const agachar = pulando && ciclo < 0.15 ? (0.15 - ciclo) / 0.15 : 0;
    const papo = estado === 'coaxando' ? 1 + 0.6 * Math.abs(Math.sin(t / 300 * Math.PI * 2)) : 1;
    const guardaChuva = Math.sin(t / 700 * Math.PI * 2) * 6;
    return {salto, agachar, papo, guardaChuva, dormindo};
}

// Boneco de neve ilustrado (tema Noite de neve/materiais): salto com gingado, braço acena, cachecol balança.
export function quadroBonecoIlustrado(t, estado) {
    const dormindo = estado === 'dormindo';
    const saltitando = estado === 'saltitando';
    const salto = saltitando ? Math.abs(Math.sin(t / 700 * Math.PI * 2)) : 0;
    const gingado = saltitando ? Math.sin(t / 700 * Math.PI * 2) * 6 : 0;
    const braco = estado === 'acenando' ? -10 - 52 * (0.5 + 0.5 * Math.sin(t / 500 * Math.PI * 2)) : -4;
    const cachecol = dormindo ? 0 : Math.sin(t / 650 * Math.PI * 2) * 8;
    return {salto, gingado, braco, cachecol, dormindo};
}

// Rena (tema Vitrine): pernas ±24° em 0,8 s trotando; cabeça balança ±13° tocando o sino.
export function quadroRena(t, estado) {
    const dormindo = estado === 'dormindo';
    const trotando = estado === 'trotando';
    const perna = trotando ? Math.sin(t / 800 * Math.PI * 2) * 24 : 0;
    const sininho = estado === 'sininho';
    const cabeca = sininho ? Math.sin(t / 800 * Math.PI * 2) * 13 : 0;
    return {perna, cabeca, sininho, dormindo};
}

// Papai Noel (tema Natal brasileiro): pernas ±20° em 0,9 s passeando; braço acena; barriga chacoalha ao rir.
export function quadroPapaiNoel(t, estado) {
    const dormindo = estado === 'dormindo';
    const passeando = estado === 'passeando';
    const perna = passeando ? Math.sin(t / 900 * Math.PI * 2) * 20 : 0;
    const gingado = passeando ? Math.sin(t / 900 * Math.PI * 2) * 5 : 0;
    const braco = estado === 'acenando' ? -10 - 55 * (0.5 + 0.5 * Math.sin(t / 480 * Math.PI * 2)) : -6;
    const barriga = estado === 'rindo' ? 1 + 0.08 * Math.sin(t / 220 * Math.PI * 2) : 1;
    return {perna, gingado, braco, barriga, dormindo};
}
