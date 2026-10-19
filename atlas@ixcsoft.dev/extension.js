// Carregador do ATLAS. O GJS ignora query string no import, então cada enable() copia dock.js
// para um nome único e importa a cópia. Assim, editar dock.js e fazer disable/enable aplica a mudança
// sem novo login (Wayland).
import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class AtlasLoader extends Extension {
    enable() {
        const token = this._token = {};
        const copy = this.dir.get_child(`.dock-${Date.now()}.js`);
        try {
            this.dir.get_child('dock.js').copy(copy, Gio.FileCopyFlags.OVERWRITE, null, null);
        } catch (e) {
            console.error(`[atlas] não consegui copiar dock.js: ${e}`);
            return;
        }
        import(copy.get_uri()).then(mod => {
            if (this._token !== token)
                return; // desativada enquanto importava
            this._dock = new mod.Dock();
            this._dock.enable();
        }).catch(e => console.error(`[atlas] falha ao carregar dock.js: ${e}\n${e.stack}`))
        .finally(() => {
            try {
                copy.delete(null);
            } catch (_e) { /* já removida */ }
        });
    }

    disable() {
        this._token = null;
        this._dock?.disable();
        this._dock = null;
    }
}
