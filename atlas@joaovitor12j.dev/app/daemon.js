#!/usr/bin/env -S gjs -m
// Daemon do ATLAS (fase 0: protótipo). Dono do nome D-Bus; amostra só o que o shim assinou.
// Uso: gjs -m app/daemon.js
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {CAMINHO, NOME, VERSAO, XML} from '../protocolo.js';

const assinantes = new Map(); // id -> contagem
let timer = 0;
let exportado = null;

const amostras = {
    relogio() {
        const d = GLib.DateTime.new_now_local();
        return {h: d.get_hour(), m: d.get_minute(), s: d.get_second()};
    },
};

function emitir(id) {
    exportado.emit_signal('Dado', new GLib.Variant('(ss)', [id, JSON.stringify(amostras[id]())]));
}

function tick() {
    for (const id of assinantes.keys())
        emitir(id);
    return GLib.SOURCE_CONTINUE;
}

// Sem assinantes não há timer: custo zero.
function ajustarTimer() {
    if (assinantes.size && !timer)
        timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, tick);
    else if (!assinantes.size && timer) {
        GLib.source_remove(timer);
        timer = 0;
    }
}

const impl = {
    Versao: () => VERSAO,
    Assinar(id) {
        if (!amostras[id])
            return;
        const novo = !assinantes.has(id);
        assinantes.set(id, (assinantes.get(id) ?? 0) + 1);
        if (novo)
            emitir(id); // primeiro valor na hora, sem esperar o tick
        ajustarTimer();
    },
    Soltar(id) {
        const n = (assinantes.get(id) ?? 0) - 1;
        if (n > 0)
            assinantes.set(id, n);
        else
            assinantes.delete(id);
        ajustarTimer();
    },
};

const laco = new GLib.MainLoop(null, false);
Gio.bus_own_name(Gio.BusType.SESSION, NOME, Gio.BusNameOwnerFlags.NONE,
    conn => {
        exportado = Gio.DBusExportedObject.wrapJSObject(XML, impl);
        exportado.export(conn, CAMINHO);
    },
    null,
    () => {
        console.error(`[atlas-daemon] não consegui o nome ${NOME} (já há outro daemon?)`);
        laco.quit();
    });
laco.run();
