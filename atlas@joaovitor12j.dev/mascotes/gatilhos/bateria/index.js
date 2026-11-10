// Gatilho de bateria baixa (pilha): escuta o UPower e as regras puras de quando chamar o mascote.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {bateriaPedeAparicao, rearmarBateria} from './logica.js';

// Bateria baixa: deve aparecer agora? Só descarregando (estado 2 do UPower), no limiar ou abaixo, armado (já carregou
// ou subiu 5 pontos desde a última) e depois de `esperaMs` da aparição anterior.
// Escuta o UPower só enquanto o mascote da pilha está ligado: sem temporizador em repouso.
// `motor` é o Mascotes (index.js): {settings, ativo(id), disparar(id)}.
export class GatilhoBateria {
    constructor(motor) {
        this._motor = motor;
        this._bat = null;
    }

    atualizar() {
        if (this._motor.ativo('pilha'))
            this._abrir();
        else
            this.parar();
    }

    parar() {
        if (this._bat?.proxy && this._bat.sig)
            this._bat.proxy.disconnect(this._bat.sig);
        this._bat = null;
    }

    _abrir() {
        if (this._bat)
            return;
        const bat = this._bat = {proxy: null, sig: 0, armado: true, ultimo: -Infinity};
        Gio.DBusProxy.new_for_bus(Gio.BusType.SYSTEM, Gio.DBusProxyFlags.NONE, null,
            'org.freedesktop.UPower', '/org/freedesktop/UPower/devices/DisplayDevice',
            'org.freedesktop.UPower.Device', null, (_o, res) => {
                try {
                    const proxy = Gio.DBusProxy.new_for_bus_finish(res);
                    if (this._bat !== bat)
                        return; // desligado enquanto conectava
                    bat.proxy = proxy;
                    bat.sig = proxy.connect('g-properties-changed', () => this._mudou());
                    this._mudou();
                } catch (e) {
                    console.error(`[atlas] UPower indisponível para o mascote da bateria: ${e}`);
                }
            });
    }

    _mudou() {
        const bat = this._bat;
        const p = bat?.proxy;
        if (!p || !p.get_cached_property('IsPresent')?.unpack())
            return;
        const pct = p.get_cached_property('Percentage')?.unpack() ?? null;
        const estado = p.get_cached_property('State')?.unpack() ?? 0; // 1 carregando, 2 descarregando
        const st = this._motor.settings;
        const limiar = st.get_int('pilha-limiar');
        bat.armado = rearmarBateria(pct, estado, limiar, bat.armado);
        const agoraMs = GLib.get_monotonic_time() / 1000;
        if (bateriaPedeAparicao(pct, estado, limiar, bat.armado, agoraMs, bat.ultimo, st.get_int('pilha-espera') * 60_000) &&
            this._motor.disparar('pilha')) {
            bat.armado = false;
            bat.ultimo = agoraMs;
        }
    }
}
