// Widget Slack: selo de mensagens não lidas (item de bandeja).

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {AL, Widget} from '../base.js';
import {lerNaoLidas, textoDoSelo} from './logica.js';

// ----- Slack: ícone com selo quando há mensagens não lidas -----
// O Slack publica um item de bandeja (StatusNotifierItem) cujo tooltip diz "Nenhuma mensagem não lida" ou o
// que está pendente. É o mesmo sinal do ícone da barra superior, lido direto pelo D-Bus. Funciona com qualquer
// app que use a bandeja; aqui o filtro é o Id do item começar com "Slack".
export class Slack extends Widget {
    // Os sinais do D-Bus avisam das mudanças; isto é só uma rede de segurança.
    get intervalo() {
        return 30000;
    }

    logica() {
        this._ler();
    }

    // De volta à tela: o estado pode ter mudado enquanto o tile estava escondido.
    despausar() {
        this._ler();
        this.atualizar();
    }

    construir() {
        this._app = Shell.AppSystem.get_default().lookup_app('slack.desktop');
        this._estado = {rodando: false, tem: false, n: null, texto: ''};
        const lado = Math.round(this._tam * 0.62);
        this._icone = new St.Icon({icon_size: lado, x_align: AL.CENTER, y_align: AL.CENTER});
        if (this._app)
            this._icone.gicon = this._app.get_icon();
        else
            this._icone.icon_name = 'mail-unread-symbolic';
        this.actor.add_child(this._icone);

        // selo no canto de cima: o número, ou só um ponto quando o texto não traz número
        this._selo = new St.Label({
            style_class: 'atlas-slack-selo', x_align: AL.END, y_align: AL.START, visible: false,
            style: `font-size: ${Math.round(this._tam * 0.17)}px; min-width: ${Math.round(this._tam * 0.26)}px; height: ${Math.round(this._tam * 0.26)}px;`,
        });
        this.actor.add_child(this._selo);
    }

    iniciar() {
        const bus = Gio.DBus.session;
        const quando = () => this._ler();
        this._subs = [
            // um app de bandeja abriu ou fechou
            bus.signal_subscribe('org.freedesktop.DBus', 'org.freedesktop.DBus', 'NameOwnerChanged',
                '/org/freedesktop/DBus', null, Gio.DBusSignalFlags.NONE, quando),
            // o tooltip, o ícone ou o status de algum item mudou
            ...['NewToolTip', 'NewIcon', 'NewStatus', 'NewOverlayIcon'].map(sinal =>
                bus.signal_subscribe(null, 'org.kde.StatusNotifierItem', sinal, null, null, Gio.DBusSignalFlags.NONE, quando)),
        ];
        super.iniciar(); // o primeiro ciclo já lê o estado (logica)
    }

    parar() {
        for (const id of this._subs ?? [])
            Gio.DBus.session.signal_unsubscribe(id);
        this._subs = [];
    }

    // Procura os itens de bandeja do Slack e junta o estado: qualquer um com mensagens vale.
    // A lista vem do StatusNotifierWatcher: o Slack (Electron) se registra com o nome único (":1.96") e não com
    // um nome conhecido "org.*.StatusNotifierItem-*", então ListNames não o enxerga.
    _ler() {
        if (this._destruido)
            return;
        if (this._lendo) {
            this._relerDepois = true; // o sinal chegou no meio de uma leitura, que pode ter pego o valor antigo
            return;
        }
        this._lendo = true;
        const bus = Gio.DBus.session;
        bus.call('org.kde.StatusNotifierWatcher', '/StatusNotifierWatcher', 'org.freedesktop.DBus.Properties', 'Get',
            new GLib.Variant('(ss)', ['org.kde.StatusNotifierWatcher', 'RegisteredStatusNotifierItems']),
            new GLib.VariantType('(v)'), Gio.DBusCallFlags.NONE, 1000, null, (conn, res) => {
                let registrados = [];
                try {
                    [registrados] = conn.call_finish(res).recursiveUnpack();
                } catch (_e) { /* sem watcher: tratado abaixo */ }
                // cada entrada é "destino@/caminho" ou só o destino (caminho padrão)
                const itens = registrados.map(r => {
                    const i = String(r).indexOf('@');
                    return i < 0 ? [String(r), '/StatusNotifierItem'] : [r.slice(0, i), r.slice(i + 1)];
                });
                const resultados = [];
                let faltam = itens.length;
                const fim = () => {
                    this._lendo = false;
                    if (this._destruido)
                        return;
                    this._aplicar(resultados.filter(Boolean));
                    if (this._relerDepois) {
                        this._relerDepois = false;
                        this._ler();
                    }
                };
                if (!faltam) {
                    fim();
                    return;
                }
                for (const [nome, caminho] of itens) {
                    bus.call(nome, caminho, 'org.freedesktop.DBus.Properties', 'GetAll',
                        new GLib.Variant('(s)', ['org.kde.StatusNotifierItem']), new GLib.VariantType('(a{sv})'),
                        Gio.DBusCallFlags.NONE, 1000, null, (c, r) => {
                            try {
                                const [p] = c.call_finish(r).recursiveUnpack();
                                if (String(p.Id ?? '').toLowerCase().startsWith('slack'))
                                    resultados.push({texto: String(p.ToolTip?.[2] ?? ''), status: p.Status});
                            } catch (_e) { /* o item pode ter saído ou ser de outra interface */ }
                            if (--faltam === 0)
                                fim();
                        });
                }
            });
    }

    _aplicar(itens) {
        const lidos = itens.map(i => ({...lerNaoLidas(i.texto), texto: i.texto}));
        const com = lidos.filter(l => l.tem);
        const novo = {
            rodando: itens.length > 0,
            tem: com.length > 0,
            n: com.some(l => l.n !== null) ? com.reduce((a, l) => a + (l.n ?? 0), 0) : null,
            texto: (com[0] ?? lidos[0])?.texto ?? '',
        };
        if (novo.tem !== this._estado.tem || novo.n !== this._estado.n || novo.rodando !== this._estado.rodando)
            console.log(`[atlas] slack: ${novo.rodando ? (novo.tem ? `não lidas (${novo.n ?? '?'})` : 'sem novidades') : 'fechado'}`);
        this._estado = novo;
        this._atualizarSeVisivel();
    }

    get etiqueta() {
        const e = this._estado;
        if (!this._app)
            return 'Slack não encontrado';
        if (!e.rodando)
            return 'Slack (fechado): clique para abrir';
        return e.texto ? `Slack: ${e.texto}` : 'Slack';
    }

    atualizar() {
        const e = this._estado;
        this._icone.opacity = e.rodando ? 255 : 120; // fechado: esmaecido
        this._selo.visible = e.tem;
        if (e.tem) {
            const t = textoDoSelo(e.n);
            if (this._selo.text !== t)
                this._selo.text = t;
        }
        this._pulsar(false);
    }

    // Em vez de abrir um painel, o clique leva ao próprio Slack.
    aoClicar() {
        if (!this._app)
            return;
        if (this._app.get_n_windows() > 0)
            this._app.activate();
        else
            this._app.open_new_window(-1);
        Main.overview.hide();
    }
}
