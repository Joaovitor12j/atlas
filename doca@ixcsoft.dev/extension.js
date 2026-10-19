// Carregador do Doca: importa dock.js com um carimbo na URL, o que força o GJS a reler o arquivo.
// Assim, editar dock.js e fazer disable/enable da extensão aplica a mudança sem novo login (Wayland).
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class DocaLoader extends Extension {
    enable() {
        const token = this._token = {};
        const url = `${this.dir.get_uri()}/dock.js?t=${Date.now()}`;
        import(url).then(mod => {
            if (this._token !== token)
                return; // desativada enquanto importava
            this._dock = new mod.Dock();
            this._dock.enable();
        }).catch(e => console.error(`[doca] falha ao carregar dock.js: ${e}\n${e.stack}`));
    }

    disable() {
        this._token = null;
        this._dock?.disable();
        this._dock = null;
    }
}
