// Lógica pura do widget Atividade: uso de CPU a partir das amostras de /proc/stat.

// Uso de CPU (0..100) entre duas leituras de /proc/stat ({total, ocioso}); null se não dá para calcular.
export function percentualCpu(ant, agora) {
    if (!ant || !agora || agora.total <= ant.total)
        return null;
    const dt = agora.total - ant.total;
    return Math.round((1 - (agora.ocioso - ant.ocioso) / dt) * 100);
}
