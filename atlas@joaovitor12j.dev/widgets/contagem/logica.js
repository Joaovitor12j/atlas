// Lógica pura do widget Contagem regressiva.

// Dias de `hoje` ({ano, mes, dia}) até `alvo` ("AAAA-MM-DD"): positivo é no futuro, 0 é hoje.
// null quando o texto não é uma data real (inclui 31/02).
export function diasAte(hoje, alvo) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(alvo ?? '');
    if (!m)
        return null;
    const [a, mes, d] = m.slice(1).map(Number);
    const dt = new Date(Date.UTC(a, mes - 1, d));
    if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== d)
        return null;
    return Math.round((dt.getTime() - Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia)) / 86400000);
}
