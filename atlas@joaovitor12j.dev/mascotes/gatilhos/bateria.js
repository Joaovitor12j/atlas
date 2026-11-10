// Gatilho de bateria baixa (pilha): escuta o UPower e as regras puras de quando chamar o mascote.

// Bateria baixa: deve aparecer agora? Só descarregando (estado 2 do UPower), no limiar ou abaixo, armado (já carregou
// ou subiu 5 pontos desde a última) e depois de `esperaMs` da aparição anterior.
export function bateriaPedeAparicao(pct, estado, limiar, armado, agoraMs, ultimoMs, esperaMs) {
    return pct !== null && estado === 2 && armado && pct <= limiar && agoraMs - ultimoMs >= esperaMs;
}

// Rearma quando a bateria carrega ou passa 5 pontos do limiar.
export const rearmarBateria = (pct, estado, limiar, armado) => armado || estado !== 2 || (pct !== null && pct > limiar + 5);
