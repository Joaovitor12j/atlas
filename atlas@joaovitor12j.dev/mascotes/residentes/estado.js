// Sorteio do próximo estado do mascote residente (puro).

// Mascote residente (mora na doca do tema atual, nunca sai): `estados` é [[id, peso]], peso maior = mais comum
// ("parado" costuma pesar mais). `r` em [0, 1) escolhe o próximo estado por roleta ponderada.
export function proximoEstadoResidente(estados, r) {
    const total = estados.reduce((s, [, peso]) => s + peso, 0);
    let acc = r * total;
    for (const [id, peso] of estados) {
        if (acc < peso)
            return id;
        acc -= peso;
    }
    return estados[estados.length - 1][0];
}
