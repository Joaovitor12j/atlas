// Efeito de época dos temas de pacote (neve, luzinhas, brilhos, mar): campo de partículas em loop desenhado dentro do
// vidro da doca (não a tela toda), ligado por `efeito-epoca-ativo`. `desenhar(cr, w, h, t)` é puro, sem estado (temas/decoracao.js).
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {agendar, agora, registrar} from '../nucleo/perf.js';
import {EFEITOS_TEMA} from '../temas/decoracao.js';
import {temaDaDoca} from '../temas/atual.js';
import {QUADRO_MS} from './residente.js';

export class EfeitoEpoca {
    // `ganchos`: {doca: () => DockView da tela principal}.
    constructor(settings, ganchos) {
        this._settings = settings;
        this._ganchos = ganchos;
        this._id = 0;
        this._e = null;
    }

    // Religa ou desliga ao trocar de tema ou de chave.
    atualizar() {
        const desenhar = EFEITOS_TEMA[temaDaDoca(this._settings)];
        if (!desenhar || !this._settings.get_boolean('efeito-epoca-ativo')) {
            this.parar();
            return;
        }
        if (this._e?.desenhar === desenhar)
            return; // já é esse: não recria o actor
        this.parar();
        this._iniciar(desenhar);
    }

    parar() {
        if (this._id) {
            GLib.source_remove(this._id);
            this._id = 0;
        }
        this._e?.actor.destroy();
        this._e = null;
    }

    _iniciar(desenhar) {
        const actor = new St.DrawingArea({reactive: false, clip_to_allocation: true});
        actor.set_position(-1, -1);
        this._e = {desenhar, actor, t0: GLib.get_monotonic_time()};
        actor.connect('repaint', a => {
            const cr = a.get_context();
            const t0 = agora();
            try {
                const [w, h] = a.get_surface_size();
                desenhar(cr, w, h, (GLib.get_monotonic_time() - this._e.t0) / 1000);
            } catch (e) {
                console.error(`[atlas] erro ao desenhar o efeito de época: ${e}`);
            } finally {
                cr.$dispose();
                registrar('desenho', t0);
            }
        });
        Main.layoutManager.addChrome(actor, {affectsInputRegion: false, affectsStruts: false, trackFullscreen: true});
        this._id = agendar('mascote-efeito', QUADRO_MS, () => this._quadro());
    }

    // Cobre exatamente o vidro da doca (ancoraMascote().caixa); some sem gastar desenho se a doca estiver escondida.
    _quadro() {
        const e = this._e;
        if (!e)
            return GLib.SOURCE_REMOVE;
        const anc = this._ganchos.doca()?.ancoraMascote();
        if (!anc || Main.overview.visible) {
            e.actor.visible = false;
            return GLib.SOURCE_CONTINUE;
        }
        e.actor.visible = true;
        e.actor.set_size(anc.caixa.w, anc.caixa.h);
        e.actor.set_position(Math.round(anc.caixa.x), Math.round(anc.caixa.y));
        e.actor.queue_repaint();
        return GLib.SOURCE_CONTINUE;
    }
}
