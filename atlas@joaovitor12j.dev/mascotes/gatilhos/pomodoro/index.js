// Gatilho do fim do foco do Pomodoro (tomate): escuta o aviso do widget só enquanto o mascote está ligado.
import {AO_CONCLUIR_FOCO} from '../../../nucleo/eventos.js';

// `motor` é o Mascotes (index.js): {ativo(id), disparar(id)}.
export class GatilhoPomodoro {
    constructor(motor) {
        this._motor = motor;
        this._aoFoco = () => this._motor.disparar('tomate');
    }

    atualizar() {
        if (this._motor.ativo('tomate'))
            AO_CONCLUIR_FOCO.add(this._aoFoco);
        else
            this.parar();
    }

    parar() {
        AO_CONCLUIR_FOCO.delete(this._aoFoco);
    }
}
