// Widget Relógio: de ponteiros no tile quadrado, digital no largo; calendário do mês no painel.

// ----- Relógio: de ponteiros no tile quadrado, digital no largo; calendário do mês no painel -----
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {barra, cor, relogioAnalogico} from '../../nucleo/desenho.js';
import {obterPonte} from '../../nucleo/ponte.js';
import {AL, CFG, COR, linha, Widget} from '../base.js';
import {DIAS_SEMANA, MESES, mudarMes, semanasDoMes} from './logica.js';

export class Relogio extends Widget {
    static FONTES = [0.14, 0.32, 0.14];
    static LARGURA = 2.2;

    get intervalo() {
        return 1000;
    }

    get etiqueta() {
        return GLib.DateTime.new_now_local().format('%A, %d de %B');
    }

    construir() {
        this._criarTexto();
        this._hms = [0, 0, 0];
        obterPonte().usar('relogio');
        if (this._largo) {
            this._camada((cr, w, h) => barra(cr, 18, h - 11, w - 36, 3, this._hms[2] / 60, cor(COR.ambar)));
        } else {
            this._camada((cr, w, h, fg) => relogioAnalogico(cr, w / 2, h / 2, Math.min(w, h) / 2 - 9,
                ...this._hms, fg, cor(COR.foco)));
            this._texto.hide();
        }
    }

    destruir() {
        obterPonte().soltar('relogio');
        super.destruir();
    }

    atualizar() {
        const d = GLib.DateTime.new_now_local();
        // com o daemon no ar o valor vem dele (fase 0 do app nativo); sem ele, o cálculo local de sempre
        const p = obterPonte().dado('relogio');
        this._hms = p ? [p.h, p.m, p.s] : [d.get_hour(), d.get_minute(), d.get_second()];
        if (this._largo) {
            this._txt(this._topo, d.format('%a, %d %b').toUpperCase());
            this._txt(this._meio, d.format(CFG?.get_boolean('relogio-24h') ?? true ? '%H:%M' : '%I:%M'));
            this._txt(this._base, '');
        }
        this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Calendário'));
        const d = GLib.DateTime.new_now_local();
        let vis = {ano: d.get_year(), mes: d.get_month()};

        const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 6px; min-width: 238px;'});
        const cab = new St.BoxLayout({style: 'spacing: 4px;'});
        const botao = (texto, delta) => {
            const b = new St.Button({label: texto, style_class: 'button', can_focus: true, style: 'padding: 2px 10px;'});
            b.connect('clicked', () => {
                vis = mudarMes(vis, delta);
                desenhar();
            });
            return b;
        };
        const titulo = this._textoPainel('', 14, 'font-weight: bold; text-align: center;');
        titulo.x_expand = true;
        cab.add_child(botao('‹', -1));
        cab.add_child(titulo);
        cab.add_child(botao('›', 1));
        const grade = new St.Widget({layout_manager: new Clutter.GridLayout(), style: 'padding-top: 2px;'});
        caixa.add_child(cab);
        caixa.add_child(grade);

        const celula = (texto, estilo = '') => new St.Label({
            text: texto, x_align: AL.CENTER, y_align: AL.CENTER,
            style: `width: 32px; height: 26px; text-align: center; ${estilo}`,
        });
        const desenhar = () => {
            const hoje = GLib.DateTime.new_now_local();
            titulo.text = `${MESES[vis.mes - 1]} de ${vis.ano}`;
            grade.destroy_all_children();
            const lm = grade.layout_manager;
            DIAS_SEMANA.forEach((n, c) => lm.attach(celula(n, 'opacity: 150; font-size: 11px;'), c, 0, 1, 1));
            semanasDoMes(vis.ano, vis.mes).forEach((sem, r) => sem.forEach((dia, c) => {
                if (dia === null)
                    return;
                const ehHoje = dia === hoje.get_day_of_month() && vis.mes === hoje.get_month() && vis.ano === hoje.get_year();
                lm.attach(celula(String(dia), ehHoje
                    ? `background-color: ${COR.foco}; color: white; border-radius: 13px; font-weight: bold;`
                    : (c === 0 ? 'opacity: 190;' : '')), c, r + 1, 1, 1);
            }));
        };
        desenhar();
        this._item(menu, caixa);
        linha(menu, d.format(CFG?.get_boolean('relogio-24h') ?? true ? '%H:%M:%S' : '%I:%M:%S %p'));
    }
}
