// Widget Contagem regressiva até uma data.

import GLib from 'gi://GLib';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {CFG, linha, Widget} from '../base.js';
import {diasAte} from './logica.js';

// ----- Contagem regressiva -----
export class Contagem extends Widget {
    static FONTES = [0.17, 0.3, 0.17];

    get intervalo() {
        return 60000;
    }

    _dias() {
        const d = GLib.DateTime.new_now_local();
        return diasAte({ano: d.get_year(), mes: d.get_month(), dia: d.get_day_of_month()}, CFG?.get_string('contagem-data'));
    }

    _nome() {
        return (CFG?.get_string('contagem-nome') ?? '').trim();
    }

    get etiqueta() {
        const n = this._dias();
        if (n === null)
            return 'Contagem regressiva: defina a data nas preferências';
        const nome = this._nome() || 'Contagem';
        return n === 0 ? `${nome}: hoje` : n > 0 ? `${nome}: faltam ${n} dia(s)` : `${nome}: há ${-n} dia(s)`;
    }

    atualizar() {
        const n = this._dias();
        this._txt(this._topo, (this._nome() || 'CONTAGEM').toUpperCase());
        if (n === null) {
            this._txt(this._meio, '--');
            this._txt(this._base, 'defina a data');
            return;
        }
        this._txt(this._meio, n === 0 ? 'HOJE' : String(Math.abs(n)));
        this._txt(this._base, n === 0 ? '' : n > 0 ? (n === 1 ? 'dia' : 'dias') : 'dias atrás');
        this.actor.style = n === 0 ? 'border-color: #e8a93a;' : '';
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Contagem regressiva'));
        linha(menu, this.etiqueta);
        const data = CFG?.get_string('contagem-data');
        if (data)
            linha(menu, `Data: ${data}`);
        linha(menu, 'Nome e data ficam nas preferências (Widgets)');
    }
}
