// Mascote residente: mora na doca do tema atual (ligado por `mascote-residente-ativo`) e nunca sai, diferente dos
// mascotes de aparição. O tema que a doca mostra decide qual (ou nenhum); um temporizador de quadros só existe enquanto ele vive.
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {agendar, agora, registrar} from '../nucleo/perf.js';
import {temaDaDoca} from '../temas/atual.js';
import {posicionarMascote} from './posicao.js';
import {proximoEstadoResidente} from './residentes/estado.js';
import {RESIDENTES} from './residentes/index.js';

export const QUADRO_MS = 33;

export class Residente {
    // `ganchos`: {doca: () => DockView da tela principal}.
    constructor(settings, ganchos) {
        this._settings = settings;
        this._ganchos = ganchos;
        this._id = 0;
        this._r = null;
    }

    // Religa ou desliga ao trocar de tema ou de chave; o tema atual decide qual (ou nenhum).
    atualizar() {
        const spec = RESIDENTES[temaDaDoca(this._settings)];
        if (!spec || !this._settings.get_boolean('mascote-residente-ativo')) {
            this.parar();
            return;
        }
        if (this._r?.spec === spec)
            return; // já é esse: não recria o actor
        this.parar();
        this._iniciar(spec);
    }

    parar() {
        if (this._id) {
            GLib.source_remove(this._id);
            this._id = 0;
        }
        this._r?.actor.destroy();
        this._r = null;
    }

    _iniciar(spec) {
        const anc = this._ganchos.doca()?.ancoraMascote();
        const icone = anc?.icone ?? 48;
        const tam = spec.tamanho(icone);
        const actor = new St.DrawingArea({reactive: false, clip_to_allocation: true});
        actor.set_size(tam.w, tam.h);
        actor.set_position(-tam.w, -tam.h);
        const [faixaMin, faixaMax] = spec.duracaoMs[spec.estados[0][0]];
        this._r = {
            spec, tam, actor, icone,
            estado: spec.estados[0][0],
            t0: GLib.get_monotonic_time(),
            trocaEm: faixaMin + Math.random() * (faixaMax - faixaMin),
        };
        actor.connect('repaint', a => {
            const cr = a.get_context();
            const t0 = agora();
            try {
                const [w, h] = a.get_surface_size();
                const t = (GLib.get_monotonic_time() - this._r.t0) / 1000;
                spec.desenhar(cr, w, h, spec.quadro(t, this._r.estado));
            } catch (e) {
                console.error(`[atlas] erro ao desenhar o mascote residente: ${e}`);
            } finally {
                cr.$dispose();
                registrar('desenho', t0);
            }
        });
        Main.layoutManager.addChrome(actor, {affectsInputRegion: false, affectsStruts: false, trackFullscreen: true});
        this._id = agendar('mascote-residente', QUADRO_MS, () => this._quadro());
    }

    // A cada quadro: esconde sem gastar desenho se a doca estiver escondida/Overview aberto; senão posiciona,
    // troca de estado quando a janela do estado atual termina (sorteio ponderado) e pede o próximo repaint.
    _quadro() {
        const r = this._r;
        if (!r)
            return GLib.SOURCE_REMOVE;
        const anc = this._ganchos.doca()?.ancoraMascote();
        if (!anc || Main.overview.visible) {
            r.actor.visible = false;
            return GLib.SOURCE_CONTINUE;
        }
        // o residente nasce antes da doca (tamanho padrão) e o tamanho do ícone pode mudar depois: acompanha
        if (r.icone !== anc.icone) {
            r.icone = anc.icone;
            r.tam = r.spec.tamanho(anc.icone);
            r.actor.set_size(r.tam.w, r.tam.h);
        }
        const dx = Math.round(anc.caixa.w / 2 - r.tam.w / 2 - anc.icone * 0.15);
        const pos = posicionarMascote(anc.caixa, r.tam, anc.topoUtil, dx);
        if (!pos) {
            r.actor.visible = false;
            return GLib.SOURCE_CONTINUE;
        }
        r.actor.visible = true;
        r.actor.set_position(pos.x, pos.y);
        const tEstado = (GLib.get_monotonic_time() - r.t0) / 1000;
        if (tEstado >= r.trocaEm) {
            r.estado = proximoEstadoResidente(r.spec.estados, Math.random());
            r.t0 = GLib.get_monotonic_time();
            const [faixaMin, faixaMax] = r.spec.duracaoMs[r.estado];
            r.trocaEm = faixaMin + Math.random() * (faixaMax - faixaMin);
        }
        r.actor.queue_repaint();
        return GLib.SOURCE_CONTINUE;
    }
}
