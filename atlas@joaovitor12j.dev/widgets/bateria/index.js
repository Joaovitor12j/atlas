// Widget Bateria (UPower).

// ----- Bateria (UPower) -----
import Gio from 'gi://Gio';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {anelDeTile, cor} from '../../desenho.js';
import {COR, linha, Widget} from '../base.js';
import {duracao} from '../formato.js';

export class Bateria extends Widget {
    static FONTES = [0.2, 0.27, 0.17];

    construir() {
        this._criarTexto();
        this._anim = this._animado();
        this._camada((cr, w, h) => anelDeTile(cr, w, h, this._anim.atual, cor(this._corAnel ?? COR.ok)));
    }

    iniciar() {
        Gio.DBusProxy.new_for_bus(Gio.BusType.SYSTEM, Gio.DBusProxyFlags.NONE, null,
            'org.freedesktop.UPower', '/org/freedesktop/UPower/devices/DisplayDevice',
            'org.freedesktop.UPower.Device', null, (_o, res) => {
                try {
                    this._proxy = Gio.DBusProxy.new_for_bus_finish(res);
                } catch (e) {
                    console.error(`[atlas] UPower indisponível: ${e}`);
                    return;
                }
                if (this._destruido) {
                    this._proxy = null;
                    return;
                }
                this._sig = this._proxy.connect('g-properties-changed', () => this._atualizarSeVisivel());
                this.atualizar();
            });
        this.atualizar();
    }

    parar() {
        if (this._proxy && this._sig)
            this._proxy.disconnect(this._sig);
        this._proxy = null;
        this._sig = 0;
    }

    _prop(nome) {
        return this._proxy?.get_cached_property(nome)?.unpack();
    }

    _dados() {
        if (!this._proxy || !this._prop('IsPresent'))
            return null;
        const estado = this._prop('State');           // 1 carregando, 2 descarregando, 4 cheia
        const seg = Number(estado === 1 ? this._prop('TimeToFull') : this._prop('TimeToEmpty')) || 0;
        return {pct: Math.round(this._prop('Percentage') ?? 0), estado, seg};
    }

    _cor(d) {
        if (d.estado === 1)
            return COR.azul;
        return d.pct <= 15 ? COR.erro : d.pct <= 40 ? COR.ambar : COR.ok;
    }

    get etiqueta() {
        const d = this._dados();
        return d ? `Bateria: ${d.pct}%` : 'Bateria';
    }

    atualizar() {
        const d = this._dados();
        if (!d) {
            this._txt(this._topo, 'ENERGIA');
            this._txt(this._meio, 'AC');
            this._txt(this._base, this._proxy ? 'sem bateria' : '...');
            this._anim.definir(0);
            this._pulsar(false);
            return;
        }
        this._corAnel = this._cor(d);
        this._txt(this._topo, d.estado === 1 ? '⚡' : '');
        this._txt(this._meio, `${d.pct}%`);
        this._txt(this._base, d.seg > 0 ? duracao(d.seg) : '');
        this._anim.definir(d.pct / 100);
        this._pulsar(d.estado === 2 && d.pct <= 15);
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Bateria'));
        const d0 = this._dados();
        if (!d0) {
            linha(menu, 'Sem bateria detectada');
            return;
        }
        this._anelGrande(menu, {
            frac: () => (this._dados()?.pct ?? 0) / 100,
            cor: () => (this._dados() ? this._cor(this._dados()) : COR.ok),
            texto: () => `${this._dados()?.pct ?? 0}%`,
            sub: () => {
                const d = this._dados();
                if (!d)
                    return '';
                const estado = d.estado === 1 ? 'carregando' : d.estado === 4 ? 'cheia' : 'na bateria';
                return d.seg > 0 ? `${estado} · ${duracao(d.seg)}` : estado;
            },
        });
    }
}
