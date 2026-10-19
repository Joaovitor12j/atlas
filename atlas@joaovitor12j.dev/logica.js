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
