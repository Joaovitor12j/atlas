// Widget Clima (Open-Meteo).

// ----- Clima (Open-Meteo, sem conta nem chave) -----
// A previsão é um serviço do módulo clima.js, dividido com os mascotes de frio e calor.
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {descreverTempo, diaCurto, formatarTemp} from '../../clima/logica.js';
import {buscarClima, CLIMA, localDoClima} from '../../clima/servico.js';
import {cor, grafico, iconeTempo} from '../../desenho.js';
import {AL, Camada, CFG, COR, FG_MENU, linha, Widget} from '../base.js';

const climaLocal = () => localDoClima(CFG);

const climaBuscar = (forcar = false) => buscarClima(CFG, forcar);

// Faixa de temperaturas com folga, para o gráfico (que vai de 0 a max) não colar nas bordas.
function faixaTemp(temps) {
    const lo = Math.floor(Math.min(...temps)) - 2;
    return {lo, max: Math.max(1, Math.ceil(Math.max(...temps)) + 2 - lo)};
}

export class Clima extends Widget {
    static FONTES = [0.13, 0.26, 0.13];
    static LARGURA = 2.2;

    get intervalo() {
        return 60000;
    }

    logica() {
        climaBuscar();
    }

    get etiqueta() {
        const local = climaLocal();
        const d = CLIMA.dados;
        if (!local)
            return 'Clima: escolha a cidade nas preferências (Widgets)';
        if (!d)
            return `Clima em ${this._cidade()}: ${CLIMA.erro ? 'sem conexão, tentando de novo' : 'buscando'}`;
        return `${this._cidade()}: ${formatarTemp(d.temp)}, ${descreverTempo(d.codigo).texto.toLowerCase()}`;
    }

    _cidade() {
        return climaLocal()?.nome.split(',')[0] ?? '';
    }

    construir() {
        this._criarTexto();
        this._camada((cr, w, h, fg) => {
            const d = CLIMA.dados;
            const icone = d ? descreverTempo(d.codigo).icone : 'nublado';
            if (this._largo)
                iconeTempo(cr, h / 2 + 2, h / 2, h * 0.78, icone, fg, d?.dia ?? true);
            else
                iconeTempo(cr, w / 2, h * 0.38, h * 0.58, icone, fg, d?.dia ?? true);
        });
        if (this._largo) {
            this._texto.set_width(this._larg - this._tam);
            this._texto.x_align = AL.END;
        } else {
            this._ocultar(this._topo, this._base);
            this._texto.y_align = AL.END;
            this._texto.style = 'padding-bottom: 3px;';
        }
        this._ouvinte = () => this._atualizarSeVisivel();
        CLIMA.ouvintes.add(this._ouvinte);
        this._sinal = CFG?.connect('changed::clima-cidade', () => {
            climaBuscar();
            this.atualizar();
        });
    }

    atualizar() {
        const d = CLIMA.dados;
        this._txt(this._meio, d ? formatarTemp(d.temp) : '--');
        const hoje = d?.dias[0];
        this._txt(this._topo, d ? descreverTempo(d.codigo).texto : (climaLocal() ? '' : 'CLIMA'));
        this._txt(this._base, hoje ? `↑${formatarTemp(hoje.max)} ↓${formatarTemp(hoje.min)}` : (climaLocal() ? '' : 'defina a cidade'));
        if (this._mudou('c', d ? `${d.codigo}|${d.dia}` : ''))
            this._redesenhar();
    }

    parar() {
        CLIMA.ouvintes.delete(this._ouvinte);
        if (this._sinal)
            CFG?.disconnect(this._sinal);
        this._sinal = 0;
    }

    fillMenu(menu) {
        const local = climaLocal();
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(local ? `Clima · ${this._cidade()}` : 'Clima'));
        const d = CLIMA.dados;
        if (!d) {
            linha(menu, this.etiqueta);
            if (local) {
                const de = new PopupMenu.PopupMenuItem('Tentar agora');
                de.connect('activate', () => climaBuscar(true));
                menu.addMenuItem(de);
            }
            return;
        }
        const tempo = descreverTempo(d.codigo);

        // agora: ícone grande, temperatura e detalhes
        const topo = new St.BoxLayout({style: 'spacing: 12px; min-width: 244px;'});
        const icone = new Camada((cr, w, h) => iconeTempo(cr, w / 2, h / 2, w, tempo.icone, FG_MENU, d.dia), '');
        icone.actor.set_size(64, 64);
        icone.actor.x_expand = icone.actor.y_expand = false;
        const col = new St.BoxLayout({vertical: true, y_align: AL.CENTER});
        col.add_child(this._textoPainel(formatarTemp(d.temp), 28, 'font-weight: bold;'));
        col.add_child(this._textoPainel(tempo.texto, 13));
        topo.add_child(icone.actor);
        topo.add_child(col);
        this._item(menu, topo);
        const det = [
            d.sensacao !== null && `Sensação ${formatarTemp(d.sensacao)}`,
            d.umidade !== null && `Umidade ${d.umidade}%`,
            d.vento !== null && `Vento ${Math.round(d.vento)} km/h`,
        ].filter(Boolean).join('  ·  ');
        if (det)
            this._item(menu, this._textoPainel(det, 12, 'opacity: 0.85;'));

        // próximas horas: temperatura (âmbar) e chance de chuva (azul, de 0 a 100%)
        if (d.horas.length > 1) {
            const temps = d.horas.map(h => h.temp);
            const {lo, max} = faixaTemp(temps);
            const chuva = d.horas.map(h => h.chuva ?? 0);
            const graf = new Camada((cr, w, h) => {
                cr.setSourceRGBA(0.5, 0.5, 0.5, 0.12);
                cr.rectangle(0, 0, w, h);
                cr.fill();
                if (chuva.some(v => v > 0))
                    grafico(cr, 4, 6, w - 8, h - 12, [{valores: chuva, cor: cor(COR.azul, 0.8), preencher: true}], {pontos: chuva.length});
                grafico(cr, 4, 6, w - 8, h - 12, [{valores: temps.map(t => t - lo), cor: cor(COR.ambar)}], {max, pontos: temps.length});
            }, '');
            graf.actor.set_size(244, 70);
            const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 4px;'});
            caixa.add_child(graf.actor);
            const maxChuva = Math.max(...chuva);
            caixa.add_child(this._textoPainel(`Próximas ${d.horas.length} h: ${formatarTemp(Math.min(...temps))} a ${formatarTemp(Math.max(...temps))}` +
                (maxChuva > 0 ? `, chuva até ${maxChuva}%` : ''), 12, 'opacity: 0.85;'));
            this._item(menu, caixa);
        }

        // próximos dias
        if (d.dias.length) {
            const grade = new St.Widget({layout_manager: new Clutter.GridLayout({column_spacing: 10, row_spacing: 2})});
            const lm = grade.layout_manager;
            const hoje = d.hora.slice(0, 10);
            d.dias.forEach((dia, r) => {
                const t = descreverTempo(dia.codigo);
                const ic = new Camada((cr, w, h) => iconeTempo(cr, w / 2, h / 2, w, t.icone, FG_MENU, true), '');
                ic.actor.set_size(24, 24);
                ic.actor.x_expand = ic.actor.y_expand = false;
                lm.attach(this._textoPainel(diaCurto(dia.data, hoje), 13, 'min-width: 40px;'), 0, r, 1, 1);
                lm.attach(ic.actor, 1, r, 1, 1);
                lm.attach(this._textoPainel(`${formatarTemp(dia.max)} / ${formatarTemp(dia.min)}`, 13, 'min-width: 76px;'), 2, r, 1, 1);
                lm.attach(this._textoPainel(dia.chuva ? `${dia.chuva}%` : '', 12, `color: ${COR.azul};`), 3, r, 1, 1);
            });
            this._item(menu, grade);
        }
        linha(menu, `Atualizado às ${d.hora.slice(11, 16)}${CLIMA.erro ? ' (sem conexão agora)' : ''} · Open-Meteo`);
    }
}
