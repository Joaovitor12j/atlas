// Carregador do ATLAS. O GJS ignora query string no import e guarda cada módulo em cache pela URL, então
// cada enable() copia os módulos (dock.js, widgets.js, catalogo.js) para uma pasta com nome único e importa
// de lá. Assim, editar qualquer um deles e fazer disable/enable aplica a mudança sem novo login (Wayland).
import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const MODULOS = ['dock.js', 'widgets.js', 'catalogo.js'];

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
            for (const nome of MODULOS)
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
