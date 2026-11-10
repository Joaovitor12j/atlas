// Lógica pura do Relógio: nomes e grade do calendário do mês.

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Semanas do mês (domingo primeiro): listas de 7 posições com o dia, ou null fora do mês. `mes` vai de 1 a 12.
export function semanasDoMes(ano, mes) {
    const inicio = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay(); // 0 = domingo
    const dias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const celulas = [...Array(inicio).fill(null), ...Array.from({length: dias}, (_, i) => i + 1)];
    while (celulas.length % 7)
        celulas.push(null);
    const semanas = [];
    for (let i = 0; i < celulas.length; i += 7)
        semanas.push(celulas.slice(i, i + 7));
    return semanas;
}

// Mês anterior ou seguinte (delta = -1 ou 1), virando o ano quando preciso.
export function mudarMes({ano, mes}, delta) {
    const n = ano * 12 + (mes - 1) + delta;
    return {ano: Math.floor(n / 12), mes: (n % 12) + 1};
}
