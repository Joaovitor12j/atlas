// Lente de ampliação: escala por quadro, decoração do tema, tooltip e acompanhamento do ponteiro.
// Mistura de métodos em DockView (ver `misturar` em dock/mixin.js): usa o estado da doca (this._c, this._items...).
import GLib from 'gi://GLib';
import {agendar} from '../nucleo/perf.js';
import {desenharDoca} from '../temas/decoracao/index.js';
import {escalaLente} from './lente.js';

export class AmpliacaoDoca {
    // Posiciona cada ícone conforme sua escala; o vidro acompanha o tamanho total.
    _applyScales() {
        const c = this._c;
        const max = c.maxPx;
        const widths = this._items.map(i => i.sep ? i.base : i.base * i.s);
        const total = widths.reduce((a, b) => a + b, 0) + c.gap * Math.max(0, widths.length - 1);
        const start = (this._len - total) / 2;
        const d0 = this._d0;
        const dotDepth = c.geo?.dotDepth ?? d0 - 7; // centro do indicador, medido a partir da borda da tela
        const sepLen = Math.round(c.iconSize * 0.7);
        let a = start;

        this._items.forEach((it, idx) => {
            const w = widths[idx];
            const mid = a + w / 2;
            if (it.sep) {
                const [sw, sh] = this._v ? [sepLen, 2] : [2, sepLen];
                it.actor.set_size(sw, sh);
                const [sx, sy] = this._point(mid, d0 + c.iconSize * 0.15 + sepLen / 2, sw, sh);
                it.actor.set_position(sx, sy);
            } else {
                const f = (c.iconSize * it.s) / max; // a escala vem da altura; um tile largo cresce na mesma proporção
                it.actor.set_scale(f, f);
                const [x, y] = this._boxOrigin(a, d0, max);
                it.actor.set_position(x, y);
                const aberto = !!it.app && it.app.get_n_windows() > 0;
                it.dot.visible = c.indicador !== 'nenhum' && aberto && c.dotW > 0;
                if (it.tile && it.tile._ativo !== aberto) {
                    it.tile._ativo = aberto; // Carta marca o app aberto no próprio tile
                    if (c.tema === 'carta')
                        it.tile.queue_repaint();
                }
                const [dx, dy] = this._point(mid, dotDepth, c.dotW, c.dotH);
                it.dot.set_position(dx, dy);
            }
            a += w + c.gap;
        });

        const thickBg = d0 + c.iconSize + c.padV;
        const bgA = Math.round(start - c.padH);
        const bgLen = Math.round(total + c.padH * 2);
        if (c.pos === 'baixo') {
            this._bg.set_position(bgA, this._ch - thickBg);
            this._bg.set_size(bgLen, thickBg);
        } else if (c.pos === 'esquerda') {
            this._bg.set_position(0, bgA);
            this._bg.set_size(thickBg, bgLen);
        } else {
            this._bg.set_position(this._cw - thickBg, bgA);
            this._bg.set_size(thickBg, bgLen);
        }
        const caixa = `${bgA}:${bgLen}:${thickBg}`;
        if (c.geo && caixa !== this._decoCaixa) {
            this._decoCaixa = caixa;
            this._decoMedidas = {bgA, bgLen, thickBg};
            this._deco.queue_repaint();
        }
    }

    // Material do tema no referencial de decoracao.js (vidro de y = -esp a 0, borda da tela em y = 0),
    // girado para as docas laterais.
    _pintarDeco(area) {
        const cr = area.get_context();
        const m = this._decoMedidas;
        try {
            if (!m || !this._c.geo)
                return;
            const pos = this._c.pos;
            if (pos === 'baixo') {
                cr.translate(0, this._ch);
            } else if (pos === 'esquerda') {
                cr.rotate(Math.PI / 2);
            } else {
                cr.translate(this._cw, 0);
                cr.rotate(-Math.PI / 2);
                cr.scale(-1, 1);
            }
            desenharDoca(cr, this._c.tema, m.bgA, m.bgLen, m.thickBg, this._c.iconSize);
        } catch (e) {
            console.error(`[atlas] erro ao desenhar o tema: ${e}`);
        } finally {
            cr.$dispose();
        }
    }

    // Canto superior esquerdo do quadrado (max x max) de um ícone, dado o ponto ao longo da doca `a`
    // e a distância `d0` da borda da tela até a base do ícone.
    _boxOrigin(a, d0, max) {
        if (this._c.pos === 'baixo')
            return [Math.round(a), Math.round(this._ch - d0 - max)];
        if (this._c.pos === 'esquerda')
            return [Math.round(d0), Math.round(a)];
        return [Math.round(this._cw - d0 - max), Math.round(a)];
    }

    // Posição do canto superior esquerdo de um actor w x h cujo centro está em (`mid` ao longo da doca,
    // `depth` a partir da borda da tela).
    _point(mid, depth, w, h) {
        if (this._c.pos === 'baixo')
            return [Math.round(mid - w / 2), Math.round(this._ch - depth - h / 2)];
        if (this._c.pos === 'esquerda')
            return [Math.round(depth - w / 2), Math.round(mid - h / 2)];
        return [Math.round(this._cw - depth - w / 2), Math.round(mid - h / 2)];
    }

    // Posição do ponteiro ao longo da doca e se ele está na zona da lente.
    _pointerZone() {
        const c = this._c;
        const [cx, cy] = this._container.get_transformed_position();
        const [px, py] = global.get_pointer();
        const rx = px - cx;
        const ry = py - cy;
        const lens = c.iconSize * (c.maxScale - 1);
        const reach = this._d0 + c.iconSize + c.padV + lens; // até onde a lente alcança, a partir da borda
        const along = this._v ? ry : rx;
        const depth = c.pos === 'baixo' ? this._ch - ry : c.pos === 'esquerda' ? rx : this._cw - rx;
        const inside = along >= 0 && along <= this._len && depth >= 0 && depth <= Math.min(reach, this._thick);
        return {inside, along};
    }

    _startTick() {
        if (this._tickId)
            return;
        this._tickId = agendar('lente', this._c.frameMs, () => {
            if (!this._container)
                return GLib.SOURCE_REMOVE;
            const c = this._c;
            const {inside, along} = this._pointerZone();
            const sigma = c.lensWidth;

            // centro de cada item sem ampliação, para a lente não "fugir" do ponteiro
            const widths = this._items.map(i => i.base);
            const total = widths.reduce((a, b) => a + b, 0) + c.gap * Math.max(0, widths.length - 1);
            let a = (this._len - total) / 2;
            let moving = false;

            this._items.forEach((it, idx) => {
                const center = a + widths[idx] / 2;
                a += widths[idx] + c.gap;
                if (it.sep)
                    return;
                const d = along - center;
                const target = inside ? escalaLente(d, c.maxScale, sigma) : 1;
                const diff = target - it.s;
                if (Math.abs(diff) > 0.003) {
                    it.s += diff * c.smoothing;
                    moving = true;
                } else {
                    it.s = target;
                }
            });

            this._applyScales();
            this._placeTooltip();

            if (!inside && !moving) {
                this._tickId = 0;
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    _placeTooltip() {
        if (!this._hoverItem || !this._tooltip?.visible)
            return;
        const [x, y] = this._hoverItem.actor.get_transformed_position();
        const [w, h] = this._hoverItem.actor.get_transformed_size();
        const [tw, th] = this._tooltip.get_size();
        let tx, ty;
        if (this._c.pos === 'baixo') {
            tx = x + w / 2 - tw / 2;
            ty = y - th - 8;
        } else if (this._c.pos === 'esquerda') {
            tx = x + w + 8;
            ty = y + h / 2 - th / 2;
        } else {
            tx = x - tw - 8;
            ty = y + h / 2 - th / 2;
        }
        this._tooltip.set_position(Math.round(tx), Math.round(ty));
    }
}
