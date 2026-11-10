// Lógica pura do widget Rede: formatação da taxa e escala do gráfico.

// Bytes por segundo -> "512B", "20K" ou "1.5M".
export function formatarTaxa(bps) {
    if (bps >= 1048576)
        return `${(bps / 1048576).toFixed(1)}M`;
    if (bps >= 1024)
        return `${Math.round(bps / 1024)}K`;
    return `${Math.round(bps)}B`;
}

// Maior valor das séries, com um piso, para escalar um gráfico sem ficar colado no teto.
export function escalaGrafico(series, piso = 1) {
    return Math.max(piso, ...series.flat().filter(Number.isFinite));
}

export function formatarBps(bps) {
    return `${formatarTaxa(bps)}/s`;
}
