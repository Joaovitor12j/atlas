// Quais monitores têm doca (chave `telas`), na ordem esquerda-direita da tela.
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ordemTelas, resolverTelas} from './telas.js';

// Estado das telas: `lista` por posição (esquerda para a direita), `porIndice` por índice do monitor no Shell e
// `ativos` com os índices que têm doca.
export function telasDoShell(st) {
    const mons = Main.layoutManager.monitors;
    const ordem = ordemTelas(mons);
    const lista = resolverTelas({
        texto: st?.get_string('telas') ?? '',
        legado: st?.get_string('monitores') ?? 'principal',
        autoGlobal: st?.get_boolean('auto-ocultar') ?? false,
        n: mons.length,
        principal: ordem.indexOf(Main.layoutManager.primaryIndex),
    });
    const porIndice = new Map();
    ordem.forEach((idx, pos) => porIndice.set(idx, lista[pos]));
    return {lista, porIndice, ativos: ordem.filter(idx => porIndice.get(idx).ativa)};
}
