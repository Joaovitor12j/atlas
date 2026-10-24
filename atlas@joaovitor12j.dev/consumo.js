// Limites do plano do Claude Code (sem gi://, St ou Shell): janela de 5 h e semana, em % usado e hora do reinício.
// Fica separado para o `node --test`. Duas fontes, ambas com os números reais do plano (nada é estimado):
// - a API de uso do plano (a mesma do /usage), com o login do Claude Code em ~/.claude/.credentials.json;
// - a statusline (claude-statusline.sh), que grava o JSON que o Claude Code manda a cada atualização da barra.
// O app desktop não roda a statusline, então nele só a API funciona.

export const URL_USO = 'https://api.anthropic.com/api/oauth/usage';
export const BETA_OAUTH = 'oauth-2025-04-20';

// O token do login do Claude Code, ou o motivo de não ter: 'sem-login' ou 'expirado'.
// `expiresAt` 0 ou ausente = validade desconhecida (vale tentar; um 401 da API decide).
export function credencial(json, agora) {
    const o = json?.claudeAiOauth;
    if (!o?.accessToken)
        return {erro: 'sem-login'};
    if (o.expiresAt > 0 && o.expiresAt <= agora)
        return {erro: 'expirado'};
    return {token: o.accessToken};
}

// {pct, fim (ms) ou null quando a janela ainda não abriu}, ou null sem %.
const janela = (pct, fim) => (typeof pct === 'number' ? {pct, fim: Number.isFinite(fim) ? fim : null} : null);

// Resposta da API ({five_hour: {utilization, resets_at}, seven_day: {...}}) -> {cinco, semana}.
// `utilization` já vem em %; `resets_at` é ISO 8601.
export function lerUso(dados) {
    const pega = j => janela(j?.utilization, Date.parse(j?.resets_at));
    return {cinco: pega(dados?.five_hour), semana: pega(dados?.seven_day)};
}

// JSONs da statusline: `lista` = [{mtime (ms), dados}]. Vale o mais novo que traz cada janela; `resets_at` em segundos.
export function lerStatus(lista) {
    const ord = [...lista].sort((a, b) => b.mtime - a.mtime);
    const pega = chave => {
        for (const e of ord) {
            const j = e.dados?.rate_limits?.[chave];
            const w = janela(j?.used_percentage, j?.resets_at * 1000);
            if (w)
                return w;
        }
        return null;
    };
    return {cinco: pega('five_hour'), semana: pega('seven_day'), lidoEm: ord[0]?.mtime ?? 0};
}

// Junta as duas fontes ({cinco, semana, lidoEm} ou null), janela a janela, preferindo a leitura mais nova.
// Uma janela cujo reinício já passou volta a 0% (a próxima só abre na próxima mensagem; o fim fica desconhecido).
export function juntarLimites(fontes, agora) {
    const ord = fontes.filter(Boolean).sort((a, b) => b.lidoEm - a.lidoEm);
    const pega = chave => {
        const w = ord.find(f => f[chave])?.[chave];
        if (!w)
            return null;
        return w.fim !== null && w.fim <= agora ? {pct: 0, fim: null} : w;
    };
    const cinco = pega('cinco');
    const semana = pega('semana');
    return cinco || semana ? {cinco, semana, lidoEm: ord[0].lidoEm} : null;
}

// Milissegundos até o reinício -> "2 h 49 min", "6 d 10 h", "12 min".
export function formatarFalta(ms) {
    const min = Math.max(0, Math.round(ms / 60_000));
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const m = min % 60;
    if (d > 0)
        return h > 0 ? `${d} d ${h} h` : `${d} d`;
    if (h > 0)
        return m > 0 ? `${h} h ${m} min` : `${h} h`;
    return `${m} min`;
}

// Cor do % usado: tranquilo, atenção (70%) e quase no limite (90%).
export const nivel = pct => (pct >= 90 ? 'erro' : pct >= 70 ? 'ambar' : 'ok');

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Hora do reinício: "às 13:19" no mesmo dia, "sex 20:59" em outro (hora local).
export function formatarReinicio(fim, agora) {
    const d = new Date(fim);
    return d.toDateString() === new Date(agora).toDateString() ? `às ${hhmm(d)}` : `${DIAS[d.getDay()]} ${hhmm(d)}`;
}
