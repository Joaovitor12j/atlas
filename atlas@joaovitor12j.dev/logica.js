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
export function quadroFantasma(t) {
    t = Math.max(0, t);
    if (t >= duracaoFantasma())
        return null;
    const fimFica = FANTASMA.sobe + FANTASMA.fica;
    const q = {sobe: 1, balanco: Math.sin(t / 260), susto: 0, fase: t / 160};
    if (t < FANTASMA.sobe)
        q.sobe = easeOutBack(t / FANTASMA.sobe);
    else if (t >= fimFica)
        q.sobe = 1 - easeInCubic(limitar01((t - fimFica) / FANTASMA.desce));
    // o "bu!": abre a boca e levanta os braços logo depois de subir, e relaxa antes de descer
    const ini = FANTASMA.sobe + 300;
    q.susto = limitar01((t - ini) / FANTASMA.susto) * limitar01((fimFica - 200 - t) / FANTASMA.susto);
    return q;
}

const ESQUELETO = {sobe: 450, fica: 2400, desce: 400};
export const duracaoEsqueleto = () => ESQUELETO.sobe + ESQUELETO.fica + ESQUELETO.desce;

// Estado do esqueleto em `t` ms: {sobe, balanco, aceno, mandibula}. `sobe` de 0 a 1 (um pouco mais no overshoot),
// `balanco` e `aceno` de -1 a 1, `mandibula` de 0 a 1 (bate o queixo enquanto acena). null depois do fim.
export function quadroEsqueleto(t) {
    t = Math.max(0, t);
    if (t >= duracaoEsqueleto())
        return null;
    const fimFica = ESQUELETO.sobe + ESQUELETO.fica;
    const q = {sobe: 1, balanco: Math.sin(t / 320) * 0.6, aceno: 0, mandibula: 0};
    if (t < ESQUELETO.sobe)
        q.sobe = easeOutBack(t / ESQUELETO.sobe);
    else if (t >= fimFica)
        q.sobe = 1 - easeInCubic(limitar01((t - fimFica) / ESQUELETO.desce));
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
export function quadroChama(t) {
    t = Math.max(0, t);
    if (t >= duracaoChama())
        return null;
    const fimFica = CHAMA.sobe + CHAMA.fica;
    const q = {sobe: 1, fase: t / 110, aflicao: 0};
    if (t < CHAMA.sobe)
        q.sobe = easeOutBack(t / CHAMA.sobe);
    else if (t >= fimFica)
        q.sobe = 1 - easeInCubic(limitar01((t - fimFica) / CHAMA.desce));
    q.aflicao = limitar01((t - CHAMA.sobe) / 600) * limitar01((fimFica - t) / 400);
    return q;
}

// Sobe, fica e desce: {sobe, ativo} em `t` ms ou null depois do fim. `sobe` passa um pouco de 1 no overshoot e `ativo`
// (0 a 1) é a rampa da parte animada, que entra logo depois de subir e sai um pouco antes de descer.
function quadroSobeDesce(t, {sobe, fica, desce}) {
    t = Math.max(0, t);
    if (t >= sobe + fica + desce)
        return null;
    const fimFica = sobe + fica;
    let s = 1;
    if (t < sobe)
        s = easeOutBack(t / sobe);
    else if (t >= fimFica)
        s = 1 - easeInCubic(limitar01((t - fimFica) / desce));
    return {sobe: s, ativo: limitar01((t - sobe) / 250) * limitar01((fimFica - 150 - t) / 250)};
}

const NOEL = {sobe: 450, fica: 2800, desce: 400};
export const duracaoNoel = () => NOEL.sobe + NOEL.fica + NOEL.desce;

// Papai Noel em `t` ms: {sobe, balanco, aceno, riso}. `aceno` de -1 a 1 (braço direito) e `riso` de 0 a 1 (a barriga
// sacode no "ho ho ho"). null depois do fim.
export function quadroNoel(t) {
    const b = quadroSobeDesce(t, NOEL);
    if (!b)
        return null;
    return {
        sobe: b.sobe,
        balanco: Math.sin(t / 380) * 0.5,
        aceno: Math.sin(t / 150) * b.ativo,
        riso: Math.abs(Math.sin(t / 210)) * b.ativo,
    };
}

const BONECO = {sobe: 450, fica: 2600, desce: 400};
export const duracaoBoneco = () => BONECO.sobe + BONECO.fica + BONECO.desce;

// Boneco de neve em `t` ms: {sobe, balanco, vento}. `vento` de -1 a 1 balança o cachecol e os galhos. null depois do fim.
export function quadroBoneco(t) {
    const b = quadroSobeDesce(t, BONECO);
    if (!b)
        return null;
    return {sobe: b.sobe, balanco: Math.sin(t / 420) * 0.5, vento: Math.sin(t / 230) * (0.4 + 0.6 * b.ativo)};
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
        return {w: r(larguraDoca), h: r(a * 1.7), abaixo: 0};
    case 'pinguim':
        return {w: r(larguraDoca), h: r(a * 1.3), abaixo: 0};
    case 'neve':
        return {w: r(a * 2.6), h: r(a * 3.2), abaixo: 0};
    case 'pendurado':
        return {w: r(a * 1.6), h: r(a * 2.4), abaixo: r(a * 1.8)};
    default:
        return null;
    }
}

// Escala de um ícone a `distancia` px do ponteiro: gaussiana entre 1 (longe) e `forca` (embaixo do ponteiro).
export function escalaLente(distancia, forca, largura) {
    return 1 + (forca - 1) * Math.exp(-(distancia * distancia) / (2 * largura * largura));
}
