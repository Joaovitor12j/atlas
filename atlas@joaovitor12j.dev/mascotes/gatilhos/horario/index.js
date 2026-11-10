// Gatilho de horário e data (cuco, gato, coruja, fantasma...): um único temporizador acorda no máximo a cada 15 min,
// só com um mascote de horário ligado, e espera o disparo mais próximo.
import GLib from 'gi://GLib';
import {agendar} from '../../../nucleo/perf.js';
import {avaliarDisparo, esperaAte, proximoDisparo} from './logica.js';
import {HORARIOS, PERSONAGENS} from '../../personagens/index.js';
import {escolherAparicao} from '../../posicao.js';

// `motor` é o Mascotes (index.js): {settings, ativo(id), pode(id, alvo, forcar), iniciar(grupo, forcar), reagendar()}.
export class GatilhoHorario {
    constructor(motor) {
        this._motor = motor;
        this._id = 0;
        this._alvo = null;
        this._alvos = [];
    }

    get ligados() {
        return HORARIOS.filter(id => this._motor.ativo(id));
    }

    // Tem temporizador, então só com algum mascote de horário ligado.
    get ligado() {
        return this.ligados.length > 0;
    }

    // Recalcula o próximo disparo de cada mascote ligado; o temporizador espera o mais próximo.
    atualizar() {
        this.parar();
        this._alvos = [];
        const ligados = this.ligados;
        if (!ligados.length)
            return;
        const agora = Date.now();
        const st = this._motor.settings;
        this._alvos = ligados.map(id => [id, proximoDisparo(agora, st.get_string(`${PERSONAGENS[id].prefixo}-intervalo`))]);
        this._alvo = this._alvos.reduce((a, [, b]) => (b.ms < a.ms ? b : a), this._alvos[0][1]);
        this._dormir();
    }

    parar() {
        if (this._id) {
            GLib.source_remove(this._id);
            this._id = 0;
        }
    }

    _dormir() {
        const ms = esperaAte(Date.now(), this._alvo.ms);
        this._id = agendar('mascotes', ms, () => {
            this._id = 0;
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
            const juntos = this._alvos.filter(([id, a]) => a.ms === alvo.ms && this._motor.pode(id, a, false));
            // vários na mesma hora: às vezes um só (sorteado), às vezes todos lado a lado
            const grupo = escolherAparicao(juntos.length, Math.random());
            this._motor.iniciar(grupo.map(i => juntos[i]), false);
        } else {
            console.log('[atlas] mascote: disparo perdido (suspensão do computador), descartado');
        }
        this._motor.reagendar();
    }
}
