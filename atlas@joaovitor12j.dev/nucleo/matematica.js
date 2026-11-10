// Contas pequenas e curvas de animação usadas por mais de uma funcionalidade (sem gi://, testável com node).

export const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export const limitar01 = x => Math.max(0, Math.min(1, x));

export const easeOutCubic = x => 1 - (1 - x) ** 3;

export const easeInCubic = x => x ** 3;

export const easeInOut = x => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2);

export const easeOutBack = x => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

// Mola amortecida de 0 a 1: passa uns 12% do alvo, volta e assenta (x de 0 a 1; vale 1 a partir do fim).
export const molaAmortecida = x => (x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(x * 9));

// Rampa de 0 a 1 entre `a` e `b` ms (com easeInOut); antes 0, depois 1.
export const rampa = (t, a, b) => easeInOut(limitar01((t - a) / (b - a)));
