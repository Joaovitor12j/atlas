// Gatilho de clima (calor e frio): confere a temperatura da previsão e as regras puras de quando chamar o mascote.

// Qual mascote do clima aparece agora: 'calor', 'frio' ou null. `temp` em °C (null sem previsão); `ligados`,
// `limiares`, `ultimos` (ms da última aparição) e `esperas` (ms) são {frio, calor}. Enquanto o tempo segue quente
// (ou frio), a espera é o que espaça as aparições.
import GLib from 'gi://GLib';
import {buscarClima, CLIMA} from '../../../clima/servico.js';
import {agendar} from '../../../nucleo/perf.js';
import {mascoteDoClima} from './logica.js';

const AMOSTRA_CLIMA_MS = 5 * 60_000;

// Os de clima conferem a previsão (que só é buscada de novo a cada 30 min, ver clima/servico.js).
// `motor` é o Mascotes (index.js): {settings, ativo(id), disparar(id)}.
export class GatilhoClima {
    constructor(motor) {
        this._motor = motor;
        this._id = 0;
        this._ouvinte = null;
        this._ultimo = {};
    }

    // Tem temporizador, então só com calor ou frio ligado.
    get ligado() {
        return this._motor.ativo('calor') || this._motor.ativo('frio');
    }

    atualizar() {
        this.parar();
        if (!this.ligado)
            return;
        // confere a cada 5 min e logo que chega uma previsão nova
        this._ouvinte = () => this._avaliar();
        CLIMA.ouvintes.add(this._ouvinte);
        this._id = agendar('mascote-clima', AMOSTRA_CLIMA_MS, () => {
            buscarClima(this._motor.settings);
            this._avaliar();
            return GLib.SOURCE_CONTINUE;
        });
        buscarClima(this._motor.settings);
        this._avaliar();
    }

    parar() {
        if (this._id) {
            GLib.source_remove(this._id);
            this._id = 0;
        }
        if (this._ouvinte)
            CLIMA.ouvintes.delete(this._ouvinte);
        this._ouvinte = null;
    }

    // Frio ou calor na previsão (a temperatura de agora, a mesma do widget Clima)? Chama o mascote ligado, respeitando a
    // janela de horas e o tempo de espera de cada um.
    _avaliar() {
        const st = this._motor.settings;
        const tipo = mascoteDoClima(CLIMA.dados?.temp ?? null,
            {frio: this._motor.ativo('frio'), calor: this._motor.ativo('calor')},
            {frio: st.get_int('frio-limiar'), calor: st.get_int('calor-limiar')},
            this._ultimo,
            {frio: st.get_int('frio-espera') * 60_000, calor: st.get_int('calor-espera') * 60_000},
            Date.now());
        if (tipo && this._motor.disparar(tipo))
            this._ultimo[tipo] = Date.now();
    }
}
