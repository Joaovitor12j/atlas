// Agenda dos mascotes de horário: próximo disparo, janela de horas, temporada do ano e quanto dormir (puro, testável com node).

// Próxima hora cheia ou meia hora, em hora local, estritamente depois de `agoraMs` (epoch em ms).
// `intervalo`: 'hora' ou 'meia-hora'. Devolve {ms, hora, minuto} do alvo.
export function proximoDisparo(agoraMs, intervalo) {
    const passo = intervalo === 'meia-hora' ? 30 : 60;
    const d = new Date(agoraMs);
    d.setSeconds(0, 0);
    d.setMinutes((Math.floor(d.getMinutes() / passo) + 1) * passo);
    return {ms: d.getTime(), hora: d.getHours(), minuto: d.getMinutes()};
}

// `hora` está entre `das` e `ate`, inclusive; se `das > ate` a janela cruza a meia-noite.
export function naJanela(hora, das, ate) {
    return das <= ate ? hora >= das && hora <= ate : hora >= das || hora <= ate;
}

// Ao acordar: ainda cedo, hora de disparar, ou perdido (a suspensão do computador parou o relógio do GLib).
export function avaliarDisparo(agoraMs, alvoMs, toleranciaMs = 90_000) {
    if (agoraMs < alvoMs)
        return 'esperar';
    return agoraMs - alvoMs <= toleranciaMs ? 'disparar' : 'perdido';
}

// Quanto dormir até o alvo: um pouco depois dele, no máximo `teto` (o erro do relógio monotônico fica limitado).
export function esperaAte(agoraMs, alvoMs, teto = 15 * 60_000, folgaMs = 200) {
    return Math.max(folgaMs, Math.min(alvoMs - agoraMs + folgaMs, teto));
}

// `data` cai entre `ini` e `fim` (ambos [mês 0..11, dia], inclusive); se `ini` > `fim` a temporada vira o ano.
export function naTemporada(data, ini, fim) {
    const x = data.getMonth() * 100 + data.getDate();
    const a = ini[0] * 100 + ini[1];
    const b = fim[0] * 100 + fim[1];
    return a <= b ? x >= a && x <= b : x >= a || x <= b;
}
