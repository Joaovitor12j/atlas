// Carregador do ATLAS. O GJS ignora query string no import e guarda cada módulo em cache pela URL, então
// cada enable() copia os módulos (todo .js, menos extension.js e prefs.js) para uma pasta com nome único e importa
// de lá. Assim, editar qualquer um deles e fazer disable/enable aplica a mudança sem novo login (Wayland).
import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// Tudo o que o dock importa; extension.js e os arquivos das preferências ficam de fora.
const FORA = new Set(['extension.js', 'prefs.js']);

function apagarPasta(pasta) {
    try {
        const filhos = pasta.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
        for (let info = filhos.next_file(null); info; info = filhos.next_file(null))
            pasta.get_child(info.get_name()).delete(null);
        pasta.delete(null);
    } catch (_e) { /* já removida */ }
}

export default class AtlasLoader extends Extension {
    enable() {
        const token = this._token = {};
        this._limparSobras();
        const pasta = this.dir.get_child(`.run-${Date.now()}`);
        try {
            pasta.make_directory(null);
            for (const nome of this._modulos())
                this.dir.get_child(nome).copy(pasta.get_child(nome), Gio.FileCopyFlags.OVERWRITE, null, null);
        } catch (e) {
            console.error(`[atlas] não consegui copiar os módulos: ${e}`);
            apagarPasta(pasta);
            return;
        }
        import(pasta.get_child('dock.js').get_uri()).then(mod => {
            if (this._token !== token)
                return; // desativada enquanto importava
            this._dock = new mod.Dock(this.dir);
            this._dock.enable();
        }).catch(e => console.error(`[atlas] falha ao carregar dock.js: ${e}\n${e.stack}`))
        .finally(() => apagarPasta(pasta)); // os módulos já estão em memória
    }

    disable() {
        this._token = null;
        this._dock?.disable();
        this._dock = null;
    }

    _modulos() {
        const nomes = [];
        const filhos = this.dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
        for (let info = filhos.next_file(null); info; info = filhos.next_file(null)) {
            const nome = info.get_name();
            if (nome.endsWith('.js') && !nome.startsWith('.') && !FORA.has(nome))
                nomes.push(nome);
        }
        return nomes;
    }

    // Pastas de uma sessão que travou no meio do carregamento.
    _limparSobras() {
        try {
            const filhos = this.dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
            for (let info = filhos.next_file(null); info; info = filhos.next_file(null)) {
                if (info.get_name().startsWith('.run-'))
                    apagarPasta(this.dir.get_child(info.get_name()));
            }
        } catch (_e) { /* sem sobras */ }
    }
}
