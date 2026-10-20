// Mascotes do ATLAS: aparecem em cima da doca, fazem o que têm de fazer e somem. Ver docs/MASCOTES.md.
//
// Em repouso o custo é um único temporizador (no máximo a cada 15 min) e só com um mascote ligado; o actor só
// existe durante a aparição. A lógica de horários e a linha do tempo estão em logica.js, o desenho em desenho.js.
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {cuco} from './desenho.js';
import {agendar, agora, registrar} from './perf.js';
import {
    avaliarDisparo, batidasDoDisparo, duracaoCuco, esperaAte, naJanela, posicionarMascote, proximoDisparo, quadroCuco,
} from './logica.js';

// No teste manual, dizer por que nada apareceu; nos disparos normais pular em silêncio é o esperado.
const pular = (forcar, motivo) => {
    if (forcar)
        console.log(`[atlas] mascote não apareceu: ${motivo}`);
};

const QUADRO_MS = 33; // ~30 quadros por segundo, só durante a aparição

// Cada mascote: tamanho do actor (a partir do ícone), duração e quadro (puros, em logica.js) e o desenho.
const IMPL = {
    cuco: {
        tamanho: icone => ({w: Math.round(icone * 1.6), h: Math.round(icone * 2)}),
        contexto: (settings, alvo) => ({
            batidas: batidasDoDisparo(alvo.hora, alvo.minuto, settings.get_int('cuco-max-batidas')),
            hora: alvo.hora,
            minuto: alvo.minuto,
        }),
        duracao: ctx => duracaoCuco(ctx.batidas),
        quadro: (t, ctx) => quadroCuco(t, ctx.batidas),
        desenhar: (cr, w, h, q, ctx) => cuco(cr, w, h, q, ctx),
    },
};

export class Mascotes {
    // `ganchos`: {doca: () => DockView da tela principal, naoPerturbe: () => bool}; só são chamados na hora de usar.
    constructor(settings, ganchos) {
        this._settings = settings;
        this._ganchos = ganchos;
    }

    enable() {
        this._sinais = [];
        this._timerId = 0;
        this._quadroId = 0;
        this._atual = null;
        this._alvo = null;
        const st = this._settings;
        for (const chave of ['mascotes-ativos', 'cuco-intervalo'])
            this._sinais.push([st, st.connect(`changed::${chave}`, () => this._reagendar())]);
        this._sinais.push([st, st.connect('changed::mascote-teste', () => this._teste())]);
        this._sinais.push([Main.overview, Main.overview.connect('showing', () => this._encerrar())]);
        this._reagendar();
    }

    disable() {
        for (const [obj, id] of this._sinais ?? [])
            obj.disconnect(id);
        this._sinais = [];
        this._cancelar();
        this._encerrar();
    }

    _ativo(id) {
        return this._settings.get_strv('mascotes-ativos').includes(id);
    }

    _cancelar() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
    }

    // Recalcula o próximo disparo a partir de agora; sem mascote ligado não sobra temporizador.
    _reagendar() {
        this._cancelar();
        if (!this._ativo('cuco')) {
            this._encerrar();
            return;
        }
        this._alvo = proximoDisparo(Date.now(), this._settings.get_string('cuco-intervalo'));
        this._dormir();
    }

    _dormir() {
        const ms = esperaAte(Date.now(), this._alvo.ms);
        this._timerId = agendar('mascotes', ms, () => {
            this._timerId = 0;
            this._acordar();
            return GLib.SOURCE_REMOVE;
        });
    }

    _acordar() {
        const alvo = this._alvo;
        const r = avaliarDisparo(Date.now(), alvo.ms);
        if (r === 'esperar') {
            this._dormir();
            return;
        }
        if (r === 'disparar')
            this._disparar('cuco', alvo, false);
        else
            console.log('[atlas] cuco: disparo perdido (suspensão do computador), descartado');
        this._reagendar();
    }

    // Botão "Testar agora" das preferências: o valor é "id:marca-de-tempo", que sempre muda.
    _teste() {
        const id = this._settings.get_string('mascote-teste').split(':')[0];
        if (!IMPL[id])
            return;
        const d = new Date();
        this._disparar(id, {hora: d.getHours(), minuto: 0}, true);
    }

    // `forcar` (teste) ignora a janela de horas e o Não perturbe; doca escondida e Overview sempre pulam.
    _disparar(id, alvo, forcar) {
        const st = this._settings;
        if (this._atual)
            return;
        if (!forcar) {
            if (!this._ativo(id))
                return;
            if (!naJanela(alvo.hora, st.get_int('cuco-das'), st.get_int('cuco-ate')))
                return;
            if (this._ganchos.naoPerturbe())
                return;
        }
        if (Main.overview.visible)
            return pular(forcar, 'Overview aberto');
        const impl = IMPL[id];
        const anc = this._ganchos.doca()?.ancoraMascote();
        if (!anc)
            return pular(forcar, 'doca escondida'); // pula a aparição
        const tam = impl.tamanho(anc.icone);
        const pos = posicionarMascote(anc.caixa, tam, anc.topoUtil);
        if (!pos)
            return pular(forcar, 'não cabe acima da doca');

        const ctx = impl.contexto(st, alvo);
        console.log(`[atlas] mascote ${id} aparece em ${pos.x},${pos.y} (${tam.w}x${tam.h})`);
        const atual = this._atual = {impl, ctx, tam, q: impl.quadro(0, ctx), t0: GLib.get_monotonic_time(), fim: impl.duracao(ctx)};
        const actor = atual.actor = new St.DrawingArea({reactive: false, clip_to_allocation: true});
        actor.set_size(tam.w, tam.h);
        actor.set_position(pos.x, pos.y);
        actor.connect('repaint', a => {
            const cr = a.get_context();
            const t0 = agora();
            try {
                const [w, h] = a.get_surface_size();
                atual.impl.desenhar(cr, w, h, atual.q, atual.ctx);
            } catch (e) {
                console.error(`[atlas] erro ao desenhar o mascote: ${e}`);
            } finally {
                cr.$dispose();
                registrar('desenho', t0);
            }
        });
        // cliques passam direto para o que está embaixo
        Main.layoutManager.addChrome(actor, {affectsInputRegion: false, affectsStruts: false, trackFullscreen: true});
        this._quadroId = agendar('mascote-quadro', QUADRO_MS, () => this._quadro());
    }

    _quadro() {
        const a = this._atual;
        if (!a)
            return this._parar();
        const q = a.impl.quadro((GLib.get_monotonic_time() - a.t0) / 1000, a.ctx);
        const anc = this._ganchos.doca()?.ancoraMascote();
        const pos = anc && posicionarMascote(anc.caixa, a.tam, anc.topoUtil);
        if (!q || !pos) { // acabou, ou a doca sumiu/mudou de lugar
            this._quadroId = 0;
            this._encerrar();
            return GLib.SOURCE_REMOVE;
        }
        a.q = q;
        a.actor.set_position(pos.x, pos.y);
        a.actor.queue_repaint();
        return GLib.SOURCE_CONTINUE;
    }

    _parar() {
        this._quadroId = 0;
        return GLib.SOURCE_REMOVE;
    }

    // Destrói o actor e o temporizador de quadros; entre aparições não sobra nada vivo.
    _encerrar() {
        if (this._quadroId) {
            GLib.source_remove(this._quadroId);
            this._quadroId = 0;
        }
        this._atual?.actor?.destroy();
        this._atual = null;
    }
}
