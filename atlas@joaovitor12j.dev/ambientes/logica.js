// Lógica pura dos ambientes (conjuntos de apps com cor e tema) e do ambiente automático com Não perturbe.

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

// Quando avisar (uma vez) que o Não perturbe não faz nada por falta de um ambiente marcado.
export function deveAvisarDnd(lista, dnd, jaAvisou) {
    return dnd && !jaAvisou && lista.length > 0 && !lista.some(a => a.naoperturbe);
}
