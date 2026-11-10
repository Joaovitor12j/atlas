// Widget Nota rápida.

import Pango from 'gi://Pango';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {CFG, Widget} from '../base.js';

// ----- Nota -----
export class Nota extends Widget {
    static FONTES = [0.17, 0.2, 0.1];

    constructor(tam) {
        super(tam);
        this._ocultar(this._topo, this._base);
        this._meio.clutter_text.line_wrap = true;
        this._meio.clutter_text.ellipsize = Pango.EllipsizeMode.END;
    }

    get etiqueta() {
        return CFG?.get_string('nota-texto')?.trim() || 'Nota (clique para escrever)';
    }

    atualizar() {
        const t = CFG?.get_string('nota-texto')?.trim() ?? '';
        this._txt(this._topo, 'NOTA');
        this._txt(this._meio, t || '...');
        this._txt(this._base, '');
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Nota'));
        const item = new PopupMenu.PopupBaseMenuItem({activate: false});
        const entry = new St.Entry({
            text: CFG?.get_string('nota-texto') ?? '',
            hint_text: 'Escreva e tecle Enter',
            x_expand: true,
            width: 260,
        });
        const salvar = () => {
            CFG?.set_string('nota-texto', entry.text);
            menu.close();
        };
        entry.clutter_text.connect('activate', salvar);
        item.add_child(entry);
        menu.addMenuItem(item);
        menu.addAction('Limpar nota', () => CFG?.set_string('nota-texto', ''));
        // o foco no campo só vale depois do menu abrir
        menu.connect('open-state-changed', (_m, aberto) => {
            if (aberto)
                entry.grab_key_focus();
        });
    }
}
