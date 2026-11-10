// Formatação de números e tempos que mais de um widget usa (sem gi://, testável com node).

export function duracao(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}` : `${m} min`;
}

// Milissegundos -> "mm:ss" ou "h:mm:ss".
export function formatarCrono(ms) {
    const t = Math.floor(ms / 1000);
    const h = Math.floor(t / 3600);
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
    const s = String(t % 60).padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export const pct = f => `${Math.floor(f * 100)}%`;
