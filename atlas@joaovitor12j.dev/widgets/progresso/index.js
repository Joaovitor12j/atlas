// Widget Progresso do dia, da semana, do mês e do ano.

import GLib from 'gi://GLib';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {anel, barra, cor} from '../../nucleo/desenho.js';
import {AL, Camada, COR, Widget} from '../base.js';
import {pct} from '../formato.js';
import {calcularProgresso} from './logica.js';

// ----- Progresso do tempo: quatro anéis concêntricos (dia, semana, mês, ano) -----
const PROGRESSO = [
    ['Dia', 'dia', COR.foco],
    ['Semana', 'semana', COR.ambar],
    ['Mês', 'mes', COR.ok],
    ['Ano', 'ano', COR.azul],
];

function progresso() {
    const d = GLib.DateTime.new_now_local();
    return calcularProgresso({
        hora: d.get_hour(), minuto: d.get_minute(), segundo: d.get_second(),
        diaSemana: d.get_day_of_week(), diaMes: d.get_day_of_month(),
        diasNoMes: GLib.Date.get_days_in_month(d.get_month(), d.get_year()),
        diaAno: d.get_day_of_year(), ano: d.get_year(),
    });
}

export class Progresso extends Widget {
    static FONTES = [0.13, 0.15, 0.13];

    get intervalo() {
        return 30000;
    }

    get etiqueta() {
        const p = progresso();
        return `Hoje ${pct(p.dia)}, semana ${pct(p.semana)}, mês ${pct(p.mes)}, ano ${pct(p.ano)}`;
    }

    construir() {
        this._criarTexto();
        this._p = progresso();
        this._camada((cr, w, h) => {
            const r0 = Math.min(w, h) / 2 - 4;
            PROGRESSO.forEach(([, chave, c], i) => anel(cr, w / 2, h / 2, r0 - i * 4.2, 2.4, this._p[chave], cor(c)));
        });
        this._texto.y_align = AL.CENTER;
        this._meio.x_align = AL.CENTER;
        this._ocultar(this._topo, this._base);
    }

    atualizar() {
        this._p = progresso();
        this._txt(this._meio, pct(this._p.dia));
        this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Progresso do tempo'));
        const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 8px; min-width: 240px;'});
        const linhas = PROGRESSO.map(([nome, chave, c]) => {
            const l = new St.BoxLayout({style: 'spacing: 8px;'});
            const rotulo = this._textoPainel('', 12, 'min-width: 92px;');
            let f = 0;
            const barraCamada = new Camada((cr, w, h) => barra(cr, 0, h / 2 - 4, w, 8, f, cor(c)), '');
            barraCamada.actor.set_height(18);
            barraCamada.actor.x_expand = true;
            l.add_child(rotulo);
            l.add_child(barraCamada.actor);
            caixa.add_child(l);
            return () => {
                const p = progresso();
                f = p[chave];
                rotulo.text = `${nome} ${pct(f)}`;
                barraCamada.redesenhar();
            };
        });
        const atualizar = () => linhas.forEach(fn => fn());
        atualizar();
        this._item(menu, caixa);
        this._vivo(menu, 5000, atualizar, caixa);
    }
}
