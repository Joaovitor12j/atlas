// Lógica pura da escolha de telas da doca (chave `telas`, em JSON por posição).

// ----- Telas da doca -----
// A chave `telas` guarda um JSON {"1": {ativa, auto}, "2": {...}}: a chave é a posição da tela (da esquerda para a
// direita, depois de cima para baixo), `ativa` diz se tem doca e `auto` se ela se esconde sozinha. Tela sem entrada
// fica sem doca. Texto vazio ou inválido = ainda não migrado.
export function lerTelas(texto) {
    try {
        const obj = JSON.parse(texto);
        return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
    } catch (_e) {
        return null;
    }
}

// Estado de cada tela (por posição, 0-based). Sem `telas` valem as chaves antigas `monitores` ("principal", "todas",
// "tela-N") e `auto-ocultar` (global). `principal` é a posição da tela principal.
export function resolverTelas({texto, legado = 'principal', autoGlobal = false, n, principal = 0}) {
    const obj = lerTelas(texto);
    const saida = [];
    for (let i = 0; i < n; i++) {
        if (obj) {
            const e = obj[String(i + 1)];
            saida.push({ativa: e?.ativa === true, auto: e?.auto === true});
            continue;
        }
        const m = /^tela-(\d+)$/.exec(legado);
        const ativa = legado === 'todas' ? true : m ? Number(m[1]) - 1 === i : i === principal;
        saida.push({ativa, auto: autoGlobal});
    }
    return saida;
}

// JSON com a tela `pos` (0-based) alterada em `campo` ("ativa" ou "auto"); preserva as demais entradas.
export function definirTela(texto, pos, campo, valor) {
    const obj = lerTelas(texto) ?? {};
    const k = String(pos + 1);
    obj[k] = {ativa: false, auto: false, ...obj[k], [campo]: valor};
    return JSON.stringify(obj);
}

// JSON com o auto-ocultar ligado/desligado em todas as telas que têm doca.
export function definirAutoTodas(texto, valor) {
    const obj = lerTelas(texto) ?? {};
    for (const k of Object.keys(obj)) {
        if (obj[k]?.ativa)
            obj[k] = {...obj[k], auto: valor};
    }
    return JSON.stringify(obj);
}

// Verdadeiro se há ao menos uma tela com doca e todas elas se escondem sozinhas.
export function todasAuto(texto) {
    const ativas = Object.values(lerTelas(texto) ?? {}).filter(e => e?.ativa);
    return ativas.length > 0 && ativas.every(e => e.auto);
}

// Índices dos monitores do Shell na ordem de posição (esquerda para a direita, depois de cima para baixo).
export function ordemTelas(monitores) {
    return monitores.map((m, i) => ({i, x: m.x, y: m.y})).sort((a, b) => a.x - b.x || a.y - b.y).map(o => o.i);
}
