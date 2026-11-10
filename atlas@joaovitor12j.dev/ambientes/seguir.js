// O que acompanha o ambiente atual: as janelas dos apps de outros ambientes (opção `janelas-seguem`) e o
// Não perturbe do GNOME (o ambiente marcado com `naoperturbe` entra sozinho).
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ambienteAtual, lerAmbientes, selecionarAmbiente} from './acoes.js';
import {appsDoAmbiente, decidirDnd, deveAvisarDnd} from './logica.js';

export class SeguirAmbiente {
    // `conectar(obj, nome, cb)`: liga o sinal e o desliga junto com o resto da extensão.
    constructor(settings, conectar) {
        this._settings = settings;
        this._dndMemoria = null;
        this._minimizadas = new Map(); // janela -> id do sinal 'unmanaged'
        try {
            this._notif = new Gio.Settings({schema_id: 'org.gnome.desktop.notifications'});
            conectar(this._notif, 'changed::show-banners', () => this._seguirNaoPerturbe());
        } catch (e) {
            console.error(`[atlas] sem acesso ao Não perturbe: ${e}`);
        }
        if (settings) {
            conectar(settings, 'changed::ambiente-atual', () => this._seguirAmbiente());
            conectar(settings, 'changed::janelas-seguem', () => {
                if (settings.get_boolean('janelas-seguem'))
                    this._seguirAmbiente();
                else
                    this.restaurarJanelas();
            });
        }
    }

    // Não perturbe ligado agora? (os mascotes ficam quietos)
    naoPerturbe() {
        return !!this._notif && !this._notif.get_boolean('show-banners');
    }

    parar() {
        this.restaurarJanelas();
        this._notif = null;
        this._dndMemoria = null;
    }

    // Liga o ambiente marcado quando o Não perturbe liga e volta ao anterior quando desliga.
    _seguirNaoPerturbe() {
        if (!this._settings || !this._notif)
            return;
        const lista = lerAmbientes(this._settings);
        const atual = ambienteAtual(this._settings, lista);
        const dnd = !this._notif.get_boolean('show-banners');
        const r = decidirDnd(lista, atual?.id, dnd, this._dndMemoria);
        this._dndMemoria = r.memoria;
        // Uma vez só: explica por que ligar o Não perturbe não mudou nada
        if (deveAvisarDnd(lista, dnd, this._settings.get_boolean('dica-dnd-vista'))) {
            this._settings.set_boolean('dica-dnd-vista', true);
            Main.notify('ATLAS', 'Para trocar de ambiente com o Não perturbe, marque um ambiente em Configurações > Ambientes > (expandir o ambiente) > Entra com Não perturbe.');
        }
        const alvo = r.ir && lista.find(a => a.id === r.ir);
        if (alvo) {
            console.log(`[atlas] Não perturbe ${dnd ? 'ligado' : 'desligado'}: ambiente ${alvo.nome}`);
            selecionarAmbiente(this._settings, alvo);
        }
    }

    // Minimiza as janelas de apps que são de outros ambientes e restaura as que esta troca minimizou antes.
    // Apps que não estão em nenhum ambiente, janelas de diálogo e o que o usuário já minimizou ficam como estão.
    _seguirAmbiente() {
        if (!this._settings?.get_boolean('janelas-seguem'))
            return;
        const lista = lerAmbientes(this._settings);
        const atual = ambienteAtual(this._settings, lista);
        if (!atual)
            return;
        const doAtual = appsDoAmbiente(atual);
        const deAlgum = new Set(lista.flatMap(a => [...appsDoAmbiente(a)]));
        const rastreador = Shell.WindowTracker.get_default();
        let minimizou = 0;
        let devolveu = 0;

        for (const win of global.get_window_actors().map(a => a.meta_window)) {
            if (win.get_window_type() !== Meta.WindowType.NORMAL || win.is_skip_taskbar() || win.get_transient_for())
                continue;
            const id = rastreador.get_window_app(win)?.get_id();
            if (!id)
                continue;
            if (doAtual.has(id)) {
                if (this._minimizadas.has(win)) {
                    this._devolver(win);
                    devolveu++;
                }
            } else if (deAlgum.has(id) && !win.minimized) {
                this._minimizadas.set(win, win.connect('unmanaged', () => this._minimizadas.delete(win)));
                win.minimize();
                minimizou++;
            }
        }
        console.log(`[atlas] ambiente ${atual.nome}: ${minimizou} janela(s) minimizada(s), ${devolveu} devolvida(s)`);
    }

    _devolver(win) {
        const sinal = this._minimizadas.get(win);
        this._minimizadas.delete(win);
        try {
            win.disconnect(sinal);
            win.unminimize();
        } catch (_e) { /* janela já fechada */ }
    }

    // Traz de volta tudo o que esta classe minimizou (ao desligar a opção ou a extensão).
    restaurarJanelas() {
        for (const win of [...this._minimizadas.keys()])
            this._devolver(win);
    }
}
