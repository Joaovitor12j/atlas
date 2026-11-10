// Regras puras do gatilho de memória alta: lê o uso do /proc/meminfo e decide quando chamar a chama (sem gi://).

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
