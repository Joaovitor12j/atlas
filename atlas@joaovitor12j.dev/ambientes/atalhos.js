// Atalhos de teclado para trocar de ambiente (próximo, anterior e Ctrl+Alt+N). Cada um respeita as chaves
// `atalhos-ativos` e `atalho-numero-ativo`. Devolve a função que remove os atalhos.
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {irParaAmbiente, trocarAmbiente} from './acoes.js';

export function registrarAtalhos(settings) {
    const chaves = [];
    const ligar = (chave, acao) => {
        Main.wm.addKeybinding(chave, settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW, acao);
        chaves.push(chave);
    };
    for (const [chave, delta] of [['atalho-proximo', 1], ['atalho-anterior', -1]]) {
        ligar(chave, () => {
            if (settings.get_boolean('atalhos-ativos'))
                trocarAmbiente(settings, delta);
        });
    }
    for (let n = 1; n <= 9; n++) {
        ligar(`atalho-ambiente-${n}`, () => {
            if (settings.get_boolean('atalhos-ativos') && settings.get_boolean('atalho-numero-ativo'))
                irParaAmbiente(settings, n);
        });
    }
    return () => {
        for (const chave of chaves)
            Main.wm.removeKeybinding(chave);
    };
}
