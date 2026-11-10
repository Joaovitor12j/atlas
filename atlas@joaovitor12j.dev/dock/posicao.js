// Posição da doca na tela, reserva de espaço (strut) e auto-ocultar.
// Mistura de métodos em DockView (ver `misturar` em dock/mixin.js): usa o estado da doca (this._c, this._items...).
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {agendar} from '../nucleo/perf.js';

export class PosicaoDoca {
    // Tamanho do container (cabe a lente toda) e posição na tela, conforme a borda escolhida.
    _layoutGeometry() {
        const c = this._c;
        const mon = Main.layoutManager.monitors[this._monIdx];
        const wa = Main.layoutManager.getWorkAreaForMonitor(this._monIdx);
        const n = this._items.length;
        const baseLen = this._items.reduce((w, i) => w + i.base, 0) + c.gap * Math.max(0, n - 1);
        const growth = c.iconSize * (c.maxScale - 1) * 3.2; // sobra máxima da lente ao longo da doca

        this._len = Math.ceil(baseLen + growth + c.padH * 2);                  // eixo da doca
        this._thick = Math.ceil(c.maxPx + c.padV * 2 + c.dotArea + c.sobra);   // eixo transversal
        this._d0 = c.dotArea + c.padV;                                          // borda da tela até a base dos ícones
        this._cw = this._v ? this._thick : this._len;
        this._ch = this._v ? this._len : this._thick;

        let x, y;
        if (c.pos === 'baixo') {
            x = mon.x + (mon.width - this._cw) / 2;
            y = mon.y + mon.height - this._ch - c.margin;
        } else if (c.pos === 'esquerda') {
            x = mon.x + c.margin;
            y = wa.y + (wa.height - this._ch) / 2;
        } else {
            x = mon.x + mon.width - this._cw - c.margin;
            y = wa.y + (wa.height - this._ch) / 2;
        }
        this._container.set_size(this._cw, this._ch);
        this._container.set_position(Math.round(x), Math.round(y));
        this._deco.set_size(this._cw, this._ch);
        this._deco.visible = !!c.geo;
        this._placeHotZone(mon, wa);
        this._placeStrut(mon);
        this._applyHidden(false);
        Main.layoutManager.uiGroup.set_child_above_sibling(this._tooltip, null);
    }

    // Liga/desliga a reserva: entrar e sair do rastreio do LayoutManager é o que o faz recalcular a área útil.
    _setStrut(ativo) {
        if (!this._strut || ativo === !!this._strutAtivo)
            return;
        this._strutAtivo = ativo;
        if (ativo)
            Main.layoutManager.addChrome(this._strut, {affectsStruts: true, trackFullscreen: true});
        else
            Main.layoutManager.removeChrome(this._strut);
    }

    // Reserva da borda até a face externa do vidro. O Mutter converte isso em uma faixa que vai de ponta
    // a ponta da tela, então só importa de qual lado o actor encosta.
    _placeStrut(mon) {
        const c = this._c;
        this._setStrut(c.reserve && !c.autoHide);
        const t = Math.ceil(this._d0 + c.iconSize + c.padV + c.margin);
        const cy = this._container.y;
        if (c.pos === 'baixo') {
            this._strut.set_size(mon.width - 2, t);
            this._strut.set_position(mon.x + 1, mon.y + mon.height - t);
        } else if (c.pos === 'esquerda') {
            this._strut.set_size(t, this._len);
            this._strut.set_position(mon.x, cy);
        } else {
            this._strut.set_size(t, this._len);
            this._strut.set_position(mon.x + mon.width - t, cy);
        }
    }

    // Faixa de 2px na borda da tela, do tamanho da doca, que a faz reaparecer.
    _placeHotZone(mon, wa) {
        const c = this._c;
        const along = this._len;
        if (c.pos === 'baixo') {
            this._hot.set_size(along, 2);
            this._hot.set_position(Math.round(mon.x + (mon.width - along) / 2), mon.y + mon.height - 2);
        } else if (c.pos === 'esquerda') {
            this._hot.set_size(2, along);
            this._hot.set_position(mon.x, Math.round(wa.y + (wa.height - along) / 2));
        } else {
            this._hot.set_size(2, along);
            this._hot.set_position(mon.x + mon.width - 2, Math.round(wa.y + (wa.height - along) / 2));
        }
    }

    // Onde um mascote pousa: o vidro da doca na tela, o tamanho do ícone e o topo da área útil.
    // null com a doca escondida (auto-ocultar) ou ainda sem construir.
    ancoraMascote() {
        if (!this._container || !this._bg || (this._hidden && this._c.autoHide))
            return null;
        const [x, y] = this._bg.get_transformed_position();
        const [w, h] = this._bg.get_transformed_size();
        return {
            caixa: {x, y, w, h},
            icone: this._c.iconSize,
            topoUtil: Main.layoutManager.getWorkAreaForMonitor(this._monIdx).y,
        };
    }

    // Deslocamento que leva a doca toda para fora da tela.
    _hideShift() {
        const away = this._thick + this._c.margin + 2;
        if (this._c.pos === 'baixo')
            return [0, away];
        return [this._c.pos === 'esquerda' ? -away : away, 0];
    }

    _applyHidden(animate) {
        if (!this._container)
            return;
        const hide = this._hidden && this._c.autoHide;
        for (const it of this._items)
            it.widget?.pausar(hide); // escondida, os widgets não gastam desenho
        const [tx, ty] = hide ? this._hideShift() : [0, 0];
        this._hot.visible = hide;
        // Escondida, a doca desliza para fora da borda da tela e, com telas empilhadas ou lado a lado, apareceria na
        // vizinha: some junto (opacidade) em vez de depender de a borda cortar.
        const op = hide ? 0 : 255;
        if (animate) {
            this._container.ease({
                translation_x: tx,
                translation_y: ty,
                opacity: op,
                duration: 180,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        } else {
            this._container.remove_all_transitions();
            this._container.translation_x = tx;
            this._container.translation_y = ty;
            this._container.opacity = op;
        }
    }

    _setHidden(hidden) {
        if (this._hidden === hidden || (hidden && !this._c.autoHide))
            return;
        this._hidden = hidden;
        if (hidden) {
            this._tooltip.hide();
            this._hidePreview();
        }
        this._applyHidden(true);
        if (!hidden)
            this._scheduleHide();
    }

    // Enquanto a doca está visível no modo auto-ocultar, confere o ponteiro a cada 150 ms (sair pela
    // zona da lente não gera mais eventos) e esconde depois de 450 ms fora dela.
    _scheduleHide() {
        if (!this._c.autoHide || this._hideId)
            return;
        let fora = 0;
        this._hideId = agendar('auto-ocultar', 150, () => {
            if (!this._container || !this._c.autoHide || this._hidden) {
                this._hideId = 0;
                return GLib.SOURCE_REMOVE;
            }
            fora = (this._pointerZone().inside || this._menu?.isOpen || this._preview?.visible) ? 0 : fora + 150;
            if (fora >= 450) {
                this._hideId = 0;
                this._setHidden(true);
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    _cancelHide() {
        if (this._hideId) {
            GLib.source_remove(this._hideId);
            this._hideId = 0;
        }
    }
}
