// Leitura de /proc e séries curtas de amostras, usadas pelos widgets Atividade e Rede.

import GLib from 'gi://GLib';

// ----- Atividade (CPU e memória, via /proc) -----
export function lerProc(caminho) {
    try {
        const [ok, bytes] = GLib.file_get_contents(caminho);
        return ok ? new TextDecoder().decode(bytes) : '';
    } catch (_e) {
        return '';
    }
}

export const empilhar = (lista, v, max = 60) => {
    lista.push(v);
    if (lista.length > max)
        lista.shift();
};

export const ultimo = (lista, padrao = 0) => (lista.length ? lista[lista.length - 1] : padrao);
