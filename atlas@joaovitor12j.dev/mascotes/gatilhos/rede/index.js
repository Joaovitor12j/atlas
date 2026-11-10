// Gatilho de rede caída (satélite): escuta o NetworkMonitor só enquanto o mascote está ligado. O único temporizador
// existe nos segundos de confirmação da queda.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {agendar} from '../../../nucleo/perf.js';

const CONFIRMA_REDE_MS = 6000; // fica sem rede por esse tempo antes de o satélite aparecer

// `motor` é o Mascotes (index.js): {settings, ativo(id), disparar(id)}.
export class GatilhoRede {
    constructor(motor) {
        this._motor = motor;
        this._sinal = null;
        this._id = 0;
        this._ultimo = -Infinity;
    }

    atualizar() {
        if (this._motor.ativo('satelite')) {
            if (!this._sinal) {
                const m = Gio.NetworkMonitor.get_default();
                this._sinal = [m, m.connect('network-changed', () => this._mudou(m))];
            }
        } else {
            this.parar();
        }
    }

    parar() {
        if (this._sinal)
            this._sinal[0].disconnect(this._sinal[1]);
        this._sinal = null;
        this._cancelarConfirmacao();
    }

    _cancelarConfirmacao() {
        if (this._id) {
            GLib.source_remove(this._id);
            this._id = 0;
        }
    }

    // Passou `esperaMin` desde a última aparição? (marca o instante ao devolver verdadeiro)
    _livre(esperaMin) {
        const agoraMs = Date.now();
        if (agoraMs - this._ultimo < esperaMin * 60_000)
            return false;
        this._ultimo = agoraMs;
        return true;
    }

    // A rede caiu? Confirma depois de alguns segundos (oscilações curtas não contam) antes de chamar o satélite.
    _mudou(monitor) {
        if (monitor.network_available) {
            this._cancelarConfirmacao();
            return;
        }
        if (this._id)
            return;
        this._id = agendar('mascote-evento', CONFIRMA_REDE_MS, () => {
            this._id = 0;
            if (!monitor.network_available && this._motor.ativo('satelite') && this._livre(this._motor.settings.get_int('satelite-espera')))
                this._motor.disparar('satelite');
            return GLib.SOURCE_REMOVE;
        });
    }
}
