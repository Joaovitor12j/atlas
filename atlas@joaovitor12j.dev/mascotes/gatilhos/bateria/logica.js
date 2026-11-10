// Regras puras do gatilho de bateria baixa: quando chamar a pilha e quando rearmar (sem gi://).

export function bateriaPedeAparicao(pct, estado, limiar, armado, agoraMs, ultimoMs, esperaMs) {
    return pct !== null && estado === 2 && armado && pct <= limiar && agoraMs - ultimoMs >= esperaMs;
}

// Rearma quando a bateria carrega ou passa 5 pontos do limiar.
export const rearmarBateria = (pct, estado, limiar, armado) => armado || estado !== 2 || (pct !== null && pct > limiar + 5);
