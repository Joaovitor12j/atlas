// Lógica pura do widget Progresso: quanto do dia, da semana, do mês e do ano já passou.

export const bissexto = a => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;

// Fração (0..1) do dia, da semana (começa na segunda), do mês e do ano já passada.
// diaSemana: 1 = segunda ... 7 = domingo; diaMes e diaAno começam em 1.
export function calcularProgresso({hora, minuto, segundo, diaSemana, diaMes, diasNoMes, diaAno, ano}) {
    const dia = (hora * 3600 + minuto * 60 + segundo) / 86400;
    return {
        dia,
        semana: (diaSemana - 1 + dia) / 7,
        mes: (diaMes - 1 + dia) / diasNoMes,
        ano: (diaAno - 1 + dia) / (bissexto(ano) ? 366 : 365),
    };
}
