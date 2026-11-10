// Gatilho de memória alta (chama): o amostrador de /proc/meminfo e as regras puras de quando chamar o mascote.

// Uso de memória em % (0 a 100) a partir do texto de /proc/meminfo; null se não der para ler.
import GLib from 'gi://GLib';
import {agendar} from '../../../nucleo/perf.js';
import {memoriaPedeAparicao, rearmarMemoria, usoMemoria} from './logica.js';

const AMOSTRA_MS = 15_000;

// `motor` é o Mascotes (index.js): {settings, ativo(id), disparar(id)}.
export class GatilhoMemoria {
    constructor(motor) {
        this._motor = motor;
        this._id = 0;
        this._mem = {armado: true, ultimo: -Infinity};
    }

    // Tem temporizador, então só com a chama ligada.
    get ligado() {
        return this._motor.ativo('chama');
    }

    atualizar() {
        this.parar();
        if (this.ligado)
            this._id = agendar('mascote-memoria', AMOSTRA_MS, () => this._amostrar());
    }

    parar() {
        if (this._id) {
            GLib.source_remove(this._id);
            this._id = 0;
        }
    }

    // A cada 15 s: lê o uso de memória e chama o mascote quando passa do limiar.
    _amostrar() {
        let uso = null;
        try {
            const [ok, bytes] = GLib.file_get_contents('/proc/meminfo');
            if (ok)
                uso = usoMemoria(new TextDecoder().decode(bytes));
        } catch (e) {
            console.error(`[atlas] não consegui ler /proc/meminfo: ${e}`);
        }
        const st = this._motor.settings;
        const mem = this._mem;
        const limiar = st.get_int('chama-limiar');
        mem.armado = rearmarMemoria(uso, limiar, mem.armado);
        const agora = GLib.get_monotonic_time() / 1000;
        if (memoriaPedeAparicao(uso, limiar, mem.armado, agora, mem.ultimo, st.get_int('chama-espera') * 60_000) && this._motor.disparar('chama')) {
            mem.armado = false;
            mem.ultimo = agora;
        }
        return GLib.SOURCE_CONTINUE;
    }
}
