// Cliente do daemon do ATLAS no shim. Só Gio/GLib: roda no Shell e em gjs puro (testes).
// Nunca bloqueia: tudo assíncrono. Sem daemon, `dado()` devolve null e o widget usa o cálculo local.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {CAMINHO, INTERFACE, NOME, VERSAO} from './protocolo.js';

// Dado mais velho que isso é ignorado (daemon travado ou morto sem aviso).
const VALIDADE_MS = 3000;

class Ponte {
    constructor() {
        this._dados = new Map(); // id -> {valor, em}
        this._uso = new Map(); // id -> contagem de widgets que usam
        this._ok = false;
        this._sub = 0;
        this._conn = null;
        this._watch = Gio.bus_watch_name(Gio.BusType.SESSION, NOME, Gio.BusNameWatcherFlags.NONE,
            (conn) => this._aparecer(conn), () => this._sumir());
    }

    _aparecer(conn) {
        this._conn = conn;
        conn.call(NOME, CAMINHO, INTERFACE, 'Versao', null, null, Gio.DBusCallFlags.NONE, 2000, null, (_c, res) => {
            try {
                const [v] = conn.call_finish(res).deepUnpack();
                if (v !== VERSAO || this._conn !== conn)
                    return;
            } catch (_e) {
                return;
            }
            this._sub = conn.signal_subscribe(NOME, INTERFACE, 'Dado', CAMINHO, null,
                Gio.DBusSignalFlags.NONE, (_c, _s, _p, _i, _n, params) => {
                    const [id, json] = params.deepUnpack();
                    if (!this._uso.has(id))
                        return; // chegou depois do soltar
                    try {
                        this._dados.set(id, {valor: JSON.parse(json), em: GLib.get_monotonic_time() / 1000});
                    } catch (_e) { /* json inválido: ignora */ }
                });
            this._ok = true;
            for (const id of this._uso.keys())
                this._chamar('Assinar', id);
        });
    }

    _sumir() {
        if (this._conn && this._sub)
            this._conn.signal_unsubscribe(this._sub);
        this._sub = 0;
        this._conn = null;
        this._ok = false;
        this._dados.clear();
    }

    _chamar(metodo, id) {
        this._conn?.call(NOME, CAMINHO, INTERFACE, metodo, new GLib.Variant('(s)', [id]), null,
            Gio.DBusCallFlags.NONE, 2000, null, null);
    }

    // Um widget passa a depender de `id`; o daemon só amostra o que alguém assinou.
    usar(id) {
        const n = (this._uso.get(id) ?? 0) + 1;
        this._uso.set(id, n);
        if (n === 1 && this._ok)
            this._chamar('Assinar', id);
    }

    soltar(id) {
        const n = (this._uso.get(id) ?? 0) - 1;
        if (n > 0) {
            this._uso.set(id, n);
            return;
        }
        this._uso.delete(id);
        this._dados.delete(id);
        if (this._ok)
            this._chamar('Soltar', id);
    }

    dado(id) {
        const d = this._dados.get(id);
        if (!d || GLib.get_monotonic_time() / 1000 - d.em > VALIDADE_MS)
            return null;
        return d.valor;
    }

    destruir() {
        this._sumir();
        Gio.bus_unwatch_name(this._watch);
    }
}

let PONTE = null;

export function obterPonte() {
    return PONTE ??= new Ponte();
}

export function pararPonte() {
    PONTE?.destruir();
    PONTE = null;
}
