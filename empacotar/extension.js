// Carregador de produção do ATLAS: importa o dock direto. O pack.sh troca o extension.js de desenvolvimento
// (que copia os módulos para .run-*/ para recarregar sem relogin) por este arquivo dentro do zip.
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class AtlasExtension extends Extension {
    enable() {
        const token = this._token = {};
        import('./dock.js').then(mod => {
            if (this._token !== token)
                return; // desativada enquanto importava
            this._dock = new mod.Dock(this.dir);
            this._dock.enable();
        }).catch(e => console.error(`[atlas] falha ao carregar dock.js: ${e}\n${e.stack}`));
    }

    disable() {
        this._token = null;
        this._dock?.disable();
        this._dock = null;
    }
}
