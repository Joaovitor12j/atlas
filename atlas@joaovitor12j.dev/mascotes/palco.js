// Palco dos mascotes de aparição: cria os actors em cima da doca, anima quadro a quadro e destrói ao fim. Só existe
// algo vivo (actor e temporizador de quadros) durante a aparição.
import Cairo from 'gi://cairo';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {agendar, agora, registrar} from '../nucleo/perf.js';
import {PERSONAGENS} from './personagens/index.js';
import {deslocamentoAleatorio, deslocamentosLado, escolherVariante, posicionarMascote} from './posicao.js';
import {SPRITES} from './sprites.js';

const QUADRO_MS = 33; // ~30 quadros por segundo, só durante a aparição

// No teste manual, dizer por que nada apareceu; nos disparos normais pular em silêncio é o esperado.
const pular = (forcar, motivo) => {
    if (forcar)
        console.log(`[atlas] mascote não apareceu: ${motivo}`);
    return false;
};

export class Palco {
    // `ganchos`: {pasta: () => Gio.File da extensão, doca: () => DockView da tela principal}.
    constructor(settings, ganchos) {
        this._settings = settings;
        this._ganchos = ganchos;
        this._atuais = [];
        this._quadroId = 0;
        this._imagens = {};
    }

    get ocupado() {
        return this._atuais.length > 0;
    }

    // Faz aparecer `grupo` ([id, alvo, variante]...), lado a lado e centrado na doca. Doca escondida e Overview sempre pulam.
    iniciar(grupo, forcar) {
        if (!grupo.length || this.ocupado)
            return false;
        if (Main.overview.visible)
            return pular(forcar, 'Overview aberto');
        const anc = this._ganchos.doca()?.ancoraMascote();
        if (!anc)
            return pular(forcar, 'doca escondida'); // pula a aparição
        const impls = grupo.map(([id, , variante]) => this._impl(id, variante));
        if (impls.some(impl => impl.sprite && !this._imagem(impl.sprite)))
            return pular(forcar, 'não consegui abrir a folha de sprites');
        const tams = impls.map(impl => impl.tamanho(anc.icone, anc.caixa));
        // quem atravessa a doca (actor da largura dela) não entra na fila lado a lado: passa por cima, sem deslocamento
        const largo = tams.map(t => t.w > anc.caixa.w * 0.6);
        const larguras = tams.map((t, i) => (largo[i] ? 0 : t.w));
        const folga = Math.round(anc.icone * 0.1);
        // o conjunto aparece num ponto qualquer da doca, sorteado a cada aparição
        const base = deslocamentoAleatorio(anc.caixa.w, larguras.reduce((s, w) => s + w, folga * (larguras.length - 1)), Math.random());
        const dxs = deslocamentosLado(larguras, folga).map((d, i) => (largo[i] ? 0 : d + base));
        grupo.forEach(([id, alvo], i) => {
            if (posicionarMascote(anc.caixa, tams[i], anc.topoUtil, dxs[i]))
                this._criar(id, impls[i], alvo, tams[i], dxs[i], anc.icone);
            else
                pular(forcar, 'não cabe acima da doca');
        });
        if (!this.ocupado)
            return false;
        this._quadroId = agendar('mascote-quadro', QUADRO_MS, () => this._quadro());
        return true;
    }

    // Destrói o actor e o temporizador de quadros; entre aparições não sobra nada vivo.
    encerrar() {
        if (this._quadroId) {
            GLib.source_remove(this._quadroId);
            this._quadroId = 0;
        }
        for (const a of this._atuais)
            a.actor.destroy();
        this._atuais = [];
    }

    // Encerra e solta as folhas de sprites abertas.
    destruir() {
        this.encerrar();
        for (const img of Object.values(this._imagens))
            img.finish();
        this._imagens = {};
    }

    // Folha de sprites `id` (sprites/<arquivo> na pasta da extensão), aberta uma vez e solta ao desligar; null se falhar.
    _imagem(id) {
        if (!this._imagens[id]) {
            try {
                const arq = this._ganchos.pasta().get_child('sprites').get_child(SPRITES[id].arquivo);
                this._imagens[id] = Cairo.ImageSurface.createFromPNG(arq.get_path());
            } catch (e) {
                console.error(`[atlas] sprite ${id}: ${e}`);
                return null;
            }
        }
        return this._imagens[id];
    }

    // O mascote com movimentos dá o escolhido nas preferências (ou um sorteado); os outros são o próprio personagem.
    _impl(id, variante) {
        const m = PERSONAGENS[id];
        if (!m.variantes)
            return m;
        const nomes = Object.keys(m.variantes);
        return m.variantes[escolherVariante(variante ?? this._settings.get_string(`${id}-movimento`), nomes, Math.random())];
    }

    _criar(id, impl, alvo, tam, dx, icone) {
        const ctx = impl.contexto(this._settings, alvo);
        ctx.base = tam.h - (tam.abaixo ?? 0); // a linha do topo da doca dentro do actor
        ctx.icone = icone;
        ctx.largura = tam.w;
        if (impl.sprite)
            ctx.imagem = this._imagem(impl.sprite);
        // cada aparição escolhe um final entre os do mascote (cai, afunda, espia, some)
        if (impl.finais)
            ctx.saida = impl.finais[Math.floor(Math.random() * impl.finais.length)];
        console.log(`[atlas] mascote ${id} aparece (${tam.w}x${tam.h}, deslocamento ${dx})`);
        const atual = {impl, ctx, tam, dx, olhar: {x: 0, y: 0}, q: impl.quadro(0, ctx), t0: GLib.get_monotonic_time()};
        const actor = atual.actor = new St.DrawingArea({reactive: false, clip_to_allocation: true});
        actor.set_size(tam.w, tam.h);
        actor.connect('repaint', a => {
            const cr = a.get_context();
            const t0 = agora();
            try {
                const [w, h] = a.get_surface_size();
                // esticar e esmagar em torno da borda da doca (base do actor), para quem traz `esmaga` no quadro
                const e = atual.q?.esmaga;
                if (e) {
                    const base = atual.ctx.base ?? h;
                    cr.translate(w / 2, base);
                    cr.scale(e.sx, e.sy);
                    cr.translate(-w / 2, -base);
                }
                // "puf": o final `some` desbota o mascote inteiro
                const alfa = atual.q?.alfa ?? 1;
                if (alfa < 1)
                    cr.pushGroup();
                atual.impl.desenhar(cr, w, h, atual.q, atual.ctx);
                if (alfa < 1) {
                    cr.popGroupToSource();
                    cr.paintWithAlpha(Math.max(0, alfa));
                }
            } catch (e) {
                console.error(`[atlas] erro ao desenhar o mascote: ${e}`);
            } finally {
                cr.$dispose();
                registrar('desenho', t0);
            }
        });
        // fora da tela até o primeiro quadro, que posiciona
        actor.set_position(-tam.w, -tam.h);
        // cliques passam direto para o que está embaixo
        Main.layoutManager.addChrome(actor, {affectsInputRegion: false, affectsStruts: false, trackFullscreen: true});
        this._atuais.push(atual);
    }

    // Um quadro de todos os que estão na tela; cada um sai quando termina, e o temporizador acaba com o último.
    _quadro() {
        const anc = this._ganchos.doca()?.ancoraMascote();
        for (const a of [...this._atuais]) {
            const q = a.impl.quadro((GLib.get_monotonic_time() - a.t0) / 1000, a.ctx);
            const pos = anc && posicionarMascote(anc.caixa, a.tam, anc.topoUtil, a.dx);
            if (!pos) { // a doca sumiu ou mudou de lugar: encerra tudo
                this.encerrar();
                return GLib.SOURCE_REMOVE;
            }
            if (!q) {
                a.actor.destroy();
                this._atuais.splice(this._atuais.indexOf(a), 1);
                continue;
            }
            // os olhos seguem o ponteiro (suavizado quadro a quadro); só existe durante a aparição
            const [px, py] = global.get_pointer();
            const alvoX = Math.max(-1, Math.min(1, (px - (pos.x + a.tam.w / 2)) / 400));
            const alvoY = Math.max(-1, Math.min(1, (py - (pos.y + a.tam.h * 0.4)) / 300));
            a.olhar.x += (alvoX - a.olhar.x) * 0.2;
            a.olhar.y += (alvoY - a.olhar.y) * 0.2;
            a.q = {...q, olhar: a.olhar};
            a.actor.set_position(pos.x, pos.y);
            a.actor.queue_repaint();
        }
        if (!this._atuais.length) {
            this._quadroId = 0;
            return GLib.SOURCE_REMOVE;
        }
        return GLib.SOURCE_CONTINUE;
    }
}
