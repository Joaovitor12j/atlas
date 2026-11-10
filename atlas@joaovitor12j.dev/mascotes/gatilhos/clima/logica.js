// Regra pura do gatilho de clima: qual mascote (calor ou frio) chamar para a temperatura de agora (sem gi://).

export function mascoteDoClima(temp, ligados, limiares, ultimos, esperas, agoraMs) {
    if (typeof temp !== 'number' || !Number.isFinite(temp))
        return null;
    const tipo = temp >= limiares.calor ? 'calor' : temp <= limiares.frio ? 'frio' : null;
    if (!tipo || !ligados[tipo] || agoraMs - (ultimos[tipo] ?? -Infinity) < esperas[tipo])
        return null;
    return tipo;
}
