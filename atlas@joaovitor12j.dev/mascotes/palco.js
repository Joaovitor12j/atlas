// Palco dos mascotes: onde e como aparecem em cima da doca (posição, deslocamento lado a lado, sorteio de variante).

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

// Movimento escolhido nas preferências, ou um sorteado (`r` em [0, 1)) com "sortear" ou valor desconhecido.
export function escolherVariante(valor, variantes, r) {
    if (variantes.includes(valor))
        return valor;
    return variantes[Math.min(variantes.length - 1, Math.floor(r * variantes.length))];
}
