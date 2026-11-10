// Lógica pura do widget Slack: lê o número de não lidas da bandeja e monta o texto do selo.

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
