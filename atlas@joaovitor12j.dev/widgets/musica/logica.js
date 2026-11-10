// Lógica pura do widget Música.

// Microssegundos -> "m:ss" (posição de uma faixa de música).
export function formatarFaixa(us) {
    const t = Math.max(0, Math.floor((Number(us) || 0) / 1e6));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
