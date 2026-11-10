// Mascotes do ATLAS: aparecem em cima da doca, fazem o que têm de fazer e somem. Ver docs/MASCOTES.md.
//
// Este arquivo só orquestra. Cada parte mora no seu lugar:
//   gatilhos/     o que chama cada mascote (horário, memória, bateria, rede, Pomodoro, clima);
//   palco.js      os actors da aparição e a animação quadro a quadro;
//   personagens/  os mascotes de aparição (desenho, linha do tempo e como o motor os usa);
//   residente.js  e residentes/: o mascote que mora na doca do tema; efeito.js: o efeito de época do tema.
// Em repouso o custo é um único temporizador (no máximo a cada 15 min) e só com um mascote ligado; o actor só
// existe durante a aparição.
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {naJanela, naTemporada} from './gatilhos/horario/logica.js';
import {EfeitoEpoca} from './efeito.js';
import {GatilhoBateria} from './gatilhos/bateria/index.js';
import {GatilhoClima} from './gatilhos/clima/index.js';
import {GatilhoHorario} from './gatilhos/horario/index.js';
import {GatilhoMemoria} from './gatilhos/memoria/index.js';
import {GatilhoPomodoro} from './gatilhos/pomodoro/index.js';
import {GatilhoRede} from './gatilhos/rede/index.js';
import {Palco} from './palco.js';
import {HORARIOS, PERSONAGENS} from './personagens/index.js';
import {Residente} from './residente.js';

// mascotes de evento: ligam só ao evento (sem janela de horas nem temporada)
const DE_EVENTO = new Set(['memoria', 'bateria', 'rede', 'pomodoro']);
const naData = (p, ms) => !p.temporada || naTemporada(new Date(ms), p.temporada.ini, p.temporada.fim);

export class Mascotes {
    // `ganchos`: {pasta: () => Gio.File da extensão, doca: () => DockView da tela principal, naoPerturbe: () => bool};
    // só são chamados na hora de usar.
    constructor(settings, ganchos) {
        this.settings = settings;
        this._ganchos = ganchos;
    }

    enable() {
        this._sinais = [];
        this._palco = new Palco(this.settings, this._ganchos);
        this._residente = new Residente(this.settings, this._ganchos);
        this._efeito = new EfeitoEpoca(this.settings, this._ganchos);
        // os de evento primeiro; os três com temporizador (horário, memória, clima) têm `ligado`
        this._gatilhos = [new GatilhoBateria(this), new GatilhoRede(this), new GatilhoPomodoro(this)];
        this._gatilhos.push(new GatilhoHorario(this), new GatilhoMemoria(this), new GatilhoClima(this));
        const st = this.settings;
        for (const chave of ['mascotes-ativos', 'clima-cidade', ...HORARIOS.map(id => `${PERSONAGENS[id].prefixo}-intervalo`)])
            this._sinais.push([st, st.connect(`changed::${chave}`, () => this.reagendar())]);
        this._sinais.push([st, st.connect('changed::mascote-teste', () => this._teste())]);
        // o tema pode vir do ambiente atual, então trocar de ambiente (ou editar o tema dele) também reavalia
        for (const chave of ['tema', 'ambiente-atual', 'ambientes']) {
            this._sinais.push([st, st.connect(`changed::${chave}`, () => {
                this._residente.atualizar();
                this._efeito.atualizar();
            })]);
        }
        this._sinais.push([st, st.connect('changed::mascote-residente-ativo', () => this._residente.atualizar())]);
        this._sinais.push([st, st.connect('changed::efeito-epoca-ativo', () => this._efeito.atualizar())]);
        this._sinais.push([Main.overview, Main.overview.connect('showing', () => this._palco.encerrar())]);
        this.reagendar();
        this._residente.atualizar();
        this._efeito.atualizar();
    }

    disable() {
        for (const [obj, id] of this._sinais ?? [])
            obj.disconnect(id);
        this._sinais = [];
        for (const g of this._gatilhos ?? [])
            g.parar();
        this._palco?.destruir();
        this._residente?.parar();
        this._efeito?.parar();
    }

    // ----- o que os gatilhos usam -----

    ativo(id) {
        return this.settings.get_strv('mascotes-ativos').includes(id);
    }

    // Reavalia todos os gatilhos (ligam ou desligam conforme as chaves). Sem nenhum temporizador ligado, não sobra
    // actor nem temporizador de quadros.
    reagendar() {
        for (const g of this._gatilhos)
            g.atualizar();
        if (!this._gatilhos.some(g => g.ligado))
            this._palco.encerrar();
    }

    // Chama o mascote `id` agora, se ele estiver ligado e puder aparecer.
    disparar(id) {
        const d = new Date();
        const alvo = {hora: d.getHours(), minuto: d.getMinutes(), ms: d.getTime()};
        return this.pode(id, alvo, false) && this.iniciar([[id, alvo]], false);
    }

    // O mascote `id` pode aparecer neste alvo? `forcar` (teste) ignora ligado, janela de horas, temporada e Não perturbe.
    pode(id, alvo, forcar) {
        if (forcar)
            return true;
        const p = PERSONAGENS[id];
        if (DE_EVENTO.has(p.gatilho))
            return this.ativo(id) && !this._ganchos.naoPerturbe();
        if (p.gatilho === 'clima') {
            return this.ativo(id) && naJanela(alvo.hora, this.settings.get_int(`${id}-das`), this.settings.get_int(`${id}-ate`)) &&
                !this._ganchos.naoPerturbe();
        }
        const st = this.settings;
        return this.ativo(id) && naJanela(alvo.hora, st.get_int(`${p.prefixo}-das`), st.get_int(`${p.prefixo}-ate`)) &&
            naData(p, alvo.ms) && !this._ganchos.naoPerturbe();
    }

    // Faz aparecer `grupo` ([id, alvo, variante]...), lado a lado, no palco.
    iniciar(grupo, forcar) {
        return this._palco.iniciar(grupo, forcar);
    }

    // Botão "Testar agora" das preferências: o valor é "id:marca-de-tempo", que sempre muda. Vários ids com "+"
    // ("fantasma+esqueleto:...") aparecem juntos, lado a lado; "calor=picole:..." força um movimento.
    _teste() {
        const pedidos = this.settings.get_string('mascote-teste').split(':')[0].split('+').map(p => p.split('='));
        const d = new Date();
        const alvo = {hora: d.getHours(), minuto: 0, ms: d.getTime()};
        this.iniciar(pedidos.filter(([id]) => PERSONAGENS[id]).map(([id, variante]) => [id, alvo, variante]), true);
    }
}
