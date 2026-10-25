// Mascotes do ATLAS: aparecem em cima da doca, fazem o que têm de fazer e somem. Ver docs/MASCOTES.md.
//
// Em repouso o custo é um único temporizador (no máximo a cada 15 min) e só com um mascote ligado; o actor só
// existe durante a aparição. A lógica de horários e a linha do tempo estão em logica.js, o desenho em desenho.js.
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {boneco, chama, cuco, esqueleto, fantasma, neve, noel, pendurado, picole, pinguim, solArco, solLeque} from './desenho.js';
import {CLIMA, buscarClima} from './clima.js';
import {agendar, agora, registrar} from './perf.js';
import {
    avaliarDisparo, batidasDoDisparo, deslocamentoAleatorio, deslocamentosLado, duracaoBoneco, duracaoChama, duracaoCuco,
    duracaoEsqueleto, duracaoFantasma, duracaoNeve, duracaoNoel, duracaoPendurado, duracaoPicole, duracaoPinguim,
    duracaoSolArco, duracaoSolLeque, escolherAparicao, escolherVariante, esperaAte, flocosDeNeve, mascoteDoClima,
    memoriaPedeAparicao, naJanela, naTemporada, posicionarMascote, proximoDisparo, quadroBoneco, quadroChama, quadroCuco,
    quadroEsqueleto, quadroFantasma, quadroNeve, quadroNoel, quadroPendurado, quadroPicole, quadroPinguim, quadroSolArco,
    quadroSolLeque, rearmarMemoria, tamanhoMascoteClima, usoMemoria,
} from './logica.js';

// No teste manual, dizer por que nada apareceu; nos disparos normais pular em silêncio é o esperado.
const pular = (forcar, motivo) => {
    if (forcar)
        console.log(`[atlas] mascote não apareceu: ${motivo}`);
    return false;
};

const QUADRO_MS = 33; // ~30 quadros por segundo, só durante a aparição

// Cada mascote: `prefixo` das chaves do schema (`<prefixo>-intervalo`, `-das`, `-ate`), tamanho do actor (a partir do
// ícone e da doca), duração e quadro (puros, em logica.js) e o desenho. `temporada` (opcional) limita a aparição a datas
// do ano; `gatilho: 'memoria'` troca o horário pelo amostrador de memória (sem `prefixo`) e `gatilho: 'clima'` pela
// previsão do tempo (clima.js). Quem tem `variantes` escolhe o movimento a cada aparição (chave `<id>-movimento`).
// Um movimento dos mascotes do clima: o desenho recebe `ctx.base` e `ctx.icone` do motor; `dir` sorteia o lado de onde
// vêm os que atravessam a doca.
const movimento = (variante, duracao, quadro, desenhar) => ({
    tamanho: (icone, caixa) => tamanhoMascoteClima(variante, icone, caixa.w),
    contexto: () => ({dir: Math.random() < 0.5 ? -1 : 1}),
    duracao,
    quadro: (t, ctx) => quadro(t, ctx.dir),
    desenhar: (cr, w, h, q, ctx) => desenhar(cr, w, h, q, ctx),
});

const IMPL = {
    cuco: {
        prefixo: 'cuco',
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
    fantasma: {
        prefixo: 'fantasma',
        temporada: {ini: [9, 24], fim: [9, 31]}, // 24 a 31 de outubro
        tamanho: icone => ({w: Math.round(icone * 1.4), h: Math.round(icone * 1.8)}),
        contexto: () => ({}),
        duracao: () => duracaoFantasma(),
        quadro: t => quadroFantasma(t),
        desenhar: (cr, w, h, q) => fantasma(cr, w, h, q),
    },
    esqueleto: {
        prefixo: 'esqueleto',
        temporada: {ini: [9, 24], fim: [9, 31]},
        tamanho: icone => ({w: Math.round(icone * 1.2), h: Math.round(icone * 1.9)}),
        contexto: () => ({}),
        duracao: () => duracaoEsqueleto(),
        quadro: t => quadroEsqueleto(t),
        desenhar: (cr, w, h, q) => esqueleto(cr, w, h, q),
    },
    noel: {
        prefixo: 'noel',
        temporada: {ini: [11, 1], fim: [11, 25]}, // 1 a 25 de dezembro
        tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.8)}),
        contexto: () => ({}),
        duracao: () => duracaoNoel(),
        quadro: t => quadroNoel(t),
        desenhar: (cr, w, h, q) => noel(cr, w, h, q),
    },
    boneco: {
        prefixo: 'boneco',
        temporada: {ini: [11, 1], fim: [11, 25]},
        tamanho: icone => ({w: Math.round(icone * 1.2), h: Math.round(icone * 1.8)}),
        contexto: () => ({}),
        duracao: () => duracaoBoneco(),
        quadro: t => quadroBoneco(t),
        desenhar: (cr, w, h, q) => boneco(cr, w, h, q),
    },
    chama: {
        gatilho: 'memoria',
        tamanho: icone => ({w: Math.round(icone * 1.1), h: Math.round(icone * 1.5)}),
        contexto: () => ({}),
        duracao: () => duracaoChama(),
        quadro: t => quadroChama(t),
        desenhar: (cr, w, h, q) => chama(cr, w, h, q),
    },
    calor: {
        gatilho: 'clima',
        variantes: {
            'picole': movimento('picole', duracaoPicole, t => quadroPicole(t), picole),
            'sol-arco': movimento('sol-arco', duracaoSolArco, quadroSolArco, solArco),
            'sol-leque': movimento('sol-leque', duracaoSolLeque, quadroSolLeque, solLeque),
        },
    },
    frio: {
        gatilho: 'clima',
        variantes: {
            'pinguim': movimento('pinguim', duracaoPinguim, quadroPinguim, pinguim),
            'neve': movimento('neve', duracaoNeve, t => quadroNeve(t),
                (cr, w, h, q, ctx) => neve(cr, w, h, q, {...ctx, flocos: flocosDeNeve(q.t)})),
            'pendurado': movimento('pendurado', duracaoPendurado, t => quadroPendurado(t), pendurado),
        },
    },
};
// os de horário (cuco, fantasma, esqueleto, noel, boneco) dividem o temporizador de disparos; a chama tem o amostrador
// de memória e os do clima conferem a previsão (que só é buscada de novo a cada 30 min, ver clima.js)
const HORARIOS = Object.keys(IMPL).filter(id => !IMPL[id].gatilho);
const DO_CLIMA = Object.keys(IMPL).filter(id => IMPL[id].gatilho === 'clima');
const AMOSTRA_MS = 15_000;
const AMOSTRA_CLIMA_MS = 5 * 60_000;
const naData = (impl, ms) => !impl.temporada || naTemporada(new Date(ms), impl.temporada.ini, impl.temporada.fim);

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
        this._atuais = [];
        this._alvo = null;
        this._memId = 0;
        this._mem = {armado: true, ultimo: -Infinity};
        this._climaId = 0;
        this._climaUltimo = {};
        this._climaOuvinte = null;
        const st = this._settings;
        for (const chave of ['mascotes-ativos', 'clima-cidade', ...HORARIOS.map(id => `${IMPL[id].prefixo}-intervalo`)])
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
        for (const campo of ['_timerId', '_memId', '_climaId']) {
            if (this[campo]) {
                GLib.source_remove(this[campo]);
                this[campo] = 0;
            }
        }
        if (this._climaOuvinte)
            CLIMA.ouvintes.delete(this._climaOuvinte);
        this._climaOuvinte = null;
    }

    // Recalcula o próximo disparo de cada mascote ligado; o temporizador espera o mais próximo. Sem mascote ligado
    // não sobra temporizador.
    _reagendar() {
        this._cancelar();
        const ligados = HORARIOS.filter(id => this._ativo(id));
        const comMemoria = this._ativo('chama');
        const comClima = DO_CLIMA.some(id => this._ativo(id));
        if (!ligados.length && !comMemoria && !comClima) {
            this._encerrar();
            return;
        }
        if (comMemoria)
            this._memId = agendar('mascote-memoria', AMOSTRA_MS, () => this._amostrar());
        if (comClima) {
            // confere a cada 5 min e logo que chega uma previsão nova
            this._climaOuvinte = () => this._avaliarClima();
            CLIMA.ouvintes.add(this._climaOuvinte);
            this._climaId = agendar('mascote-clima', AMOSTRA_CLIMA_MS, () => {
                buscarClima(this._settings);
                this._avaliarClima();
                return GLib.SOURCE_CONTINUE;
            });
            buscarClima(this._settings);
            this._avaliarClima();
        }
        this._alvos = [];
        if (!ligados.length)
            return;
        const agora = Date.now();
        this._alvos = ligados.map(id => [id, proximoDisparo(agora, this._settings.get_string(`${IMPL[id].prefixo}-intervalo`))]);
        this._alvo = this._alvos.reduce((a, [, b]) => (b.ms < a.ms ? b : a), this._alvos[0][1]);
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
        if (r === 'disparar') {
            const juntos = this._alvos.filter(([id, a]) => a.ms === alvo.ms && this._pode(id, a, false));
            // vários na mesma hora: às vezes um só (sorteado), às vezes todos lado a lado
            const grupo = escolherAparicao(juntos.length, Math.random());
            this._iniciar(grupo.map(i => juntos[i]), false);
        } else {
            console.log('[atlas] mascote: disparo perdido (suspensão do computador), descartado');
        }
        this._reagendar();
    }

    // A cada 15 s, só com a chama ligada: lê o uso de memória e chama o mascote quando passa do limiar.
    _amostrar() {
        let uso = null;
        try {
            const [ok, bytes] = GLib.file_get_contents('/proc/meminfo');
            if (ok)
                uso = usoMemoria(new TextDecoder().decode(bytes));
        } catch (e) {
            console.error(`[atlas] não consegui ler /proc/meminfo: ${e}`);
        }
        const st = this._settings;
        const mem = this._mem;
        const limiar = st.get_int('chama-limiar');
        mem.armado = rearmarMemoria(uso, limiar, mem.armado);
        const agora = GLib.get_monotonic_time() / 1000;
        if (memoriaPedeAparicao(uso, limiar, mem.armado, agora, mem.ultimo, st.get_int('chama-espera') * 60_000) &&
            this._pode('chama', null, false) && this._iniciar([['chama', {hora: 0, minuto: 0, ms: Date.now()}]], false)) {
            mem.armado = false;
            mem.ultimo = agora;
        }
        return GLib.SOURCE_CONTINUE;
    }

    // Frio ou calor na previsão (a temperatura de agora, a mesma do widget Clima)? Chama o mascote ligado, respeitando a
    // janela de horas e o tempo de espera de cada um.
    _avaliarClima() {
        const st = this._settings;
        const tipo = mascoteDoClima(CLIMA.dados?.temp ?? null,
            {frio: this._ativo('frio'), calor: this._ativo('calor')},
            {frio: st.get_int('frio-limiar'), calor: st.get_int('calor-limiar')},
            this._climaUltimo,
            {frio: st.get_int('frio-espera') * 60_000, calor: st.get_int('calor-espera') * 60_000},
            Date.now());
        if (!tipo)
            return;
        const d = new Date();
        const alvo = {hora: d.getHours(), minuto: d.getMinutes(), ms: d.getTime()};
        if (this._pode(tipo, alvo, false) && this._iniciar([[tipo, alvo]], false))
            this._climaUltimo[tipo] = Date.now();
    }

    // Botão "Testar agora" das preferências: o valor é "id:marca-de-tempo", que sempre muda. Vários ids com "+"
    // ("fantasma+esqueleto:...") aparecem juntos, lado a lado; "calor=picole:..." força um movimento.
    _teste() {
        const pedidos = this._settings.get_string('mascote-teste').split(':')[0].split('+').map(p => p.split('='));
        const d = new Date();
        const alvo = {hora: d.getHours(), minuto: 0, ms: d.getTime()};
        this._iniciar(pedidos.filter(([id]) => IMPL[id]).map(([id, variante]) => [id, alvo, variante]), true);
    }

    // O mascote `id` pode aparecer neste alvo? `forcar` (teste) ignora ligado, janela de horas, temporada e Não perturbe.
    _pode(id, alvo, forcar) {
        if (forcar)
            return true;
        if (IMPL[id].gatilho === 'memoria')
            return this._ativo(id) && !this._ganchos.naoPerturbe();
        if (IMPL[id].gatilho === 'clima') {
            return this._ativo(id) && naJanela(alvo.hora, this._settings.get_int(`${id}-das`), this._settings.get_int(`${id}-ate`)) &&
                !this._ganchos.naoPerturbe();
        }
        const st = this._settings;
        const p = IMPL[id].prefixo;
        return this._ativo(id) && naJanela(alvo.hora, st.get_int(`${p}-das`), st.get_int(`${p}-ate`)) &&
            naData(IMPL[id], alvo.ms) && !this._ganchos.naoPerturbe();
    }

    // Faz aparecer `grupo` ([id, alvo]...), lado a lado e centrado na doca. Doca escondida e Overview sempre pulam.
    _iniciar(grupo, forcar) {
        if (!grupo.length || this._atuais.length)
            return false;
        if (Main.overview.visible)
            return pular(forcar, 'Overview aberto');
        const anc = this._ganchos.doca()?.ancoraMascote();
        if (!anc)
            return pular(forcar, 'doca escondida'); // pula a aparição
        const impls = grupo.map(([id, , variante]) => this._impl(id, variante));
        const tams = impls.map(impl => impl.tamanho(anc.icone, anc.caixa));
        const larguras = tams.map(t => t.w);
        const folga = Math.round(anc.icone * 0.1);
        // o conjunto aparece num ponto qualquer da doca, sorteado a cada aparição
        const base = deslocamentoAleatorio(anc.caixa.w, larguras.reduce((s, w) => s + w, folga * (larguras.length - 1)), Math.random());
        const dxs = deslocamentosLado(larguras, folga).map(d => d + base);
        grupo.forEach(([id, alvo], i) => {
            if (posicionarMascote(anc.caixa, tams[i], anc.topoUtil, dxs[i]))
                this._criar(id, impls[i], alvo, tams[i], dxs[i], anc.icone);
            else
                pular(forcar, 'não cabe acima da doca');
        });
        if (!this._atuais.length)
            return false;
        this._quadroId = agendar('mascote-quadro', QUADRO_MS, () => this._quadro());
        return true;
    }

    // O mascote com movimentos dá o escolhido nas preferências (ou um sorteado); os outros são o próprio IMPL.
    _impl(id, variante) {
        const m = IMPL[id];
        if (!m.variantes)
            return m;
        const nomes = Object.keys(m.variantes);
        return m.variantes[escolherVariante(variante ?? this._settings.get_string(`${id}-movimento`), nomes, Math.random())];
    }

    _criar(id, impl, alvo, tam, dx, icone) {
        const ctx = impl.contexto(this._settings, alvo);
        ctx.base = tam.h - (tam.abaixo ?? 0); // a linha do topo da doca dentro do actor
        ctx.icone = icone;
        console.log(`[atlas] mascote ${id} aparece (${tam.w}x${tam.h}, deslocamento ${dx})`);
        const atual = {impl, ctx, tam, dx, q: impl.quadro(0, ctx), t0: GLib.get_monotonic_time()};
        const actor = atual.actor = new St.DrawingArea({reactive: false, clip_to_allocation: true});
        actor.set_size(tam.w, tam.h);
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
                this._encerrar();
                return GLib.SOURCE_REMOVE;
            }
            if (!q) {
                a.actor.destroy();
                this._atuais.splice(this._atuais.indexOf(a), 1);
                continue;
            }
            a.q = q;
            a.actor.set_position(pos.x, pos.y);
            a.actor.queue_repaint();
        }
        if (!this._atuais.length) {
            this._quadroId = 0;
            return GLib.SOURCE_REMOVE;
        }
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
        for (const a of this._atuais ?? [])
            a.actor.destroy();
        this._atuais = [];
    }
}
