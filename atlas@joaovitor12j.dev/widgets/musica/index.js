// Widget Música (MPRIS).

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {barra, cor} from '../../nucleo/desenho.js';
import {AL, Camada, COR, linha, Widget} from '../base.js';
import {formatarFaixa} from './logica.js';

// ----- Música (MPRIS) -----
const MPRIS = 'org.mpris.MediaPlayer2.';

const ICONE_MUSICA = 'audio-x-generic-symbolic';

export class Musica extends Widget {
    static FONTES = [0.13, 0.17, 0.14];
    static LARGURA = 5.2; // pílula: capa, título, barra e controles

    constructor(tam, largo) {
        super(tam, largo);
        this._players = new Map(); // nome do bus -> {proxy, sig}, ou null enquanto o proxy é criado
        this._pos = 0;
    }

    _tocando() {
        const p = this._ativo();
        return !!p && this._estado(p) === 'Playing';
    }

    // Só a versão larga tocando precisa perguntar a posição a cada segundo; o resto vem por sinal.
    get intervalo() {
        return this._largo && this._tocando() ? 1000 : 10000;
    }

    _atualizarSeVisivel() {
        super._atualizarSeVisivel();
        this.reagendar();
    }

    construir() {
        if (this._largo) {
            this._construirLargo();
            return;
        }
        // quadrado: só a capa, com o estado no canto de cima
        this._criarTexto();
        this._arte = new St.Icon({
            icon_name: ICONE_MUSICA, icon_size: this._tam - 10, style: 'border-radius: 10px;',
            x_align: AL.CENTER, y_align: AL.CENTER,
        });
        this.actor.insert_child_below(this._arte, this._texto);
        this._texto.y_align = AL.START;
        this._ocultar(this._meio, this._base);
    }

    // Pílula de vidro: capa à esquerda; título, artista e barra no meio; anterior, play e próxima à direita.
    _construirLargo() {
        const t = this._tam;
        const pad = Math.round(t * 0.12);
        this.actor.add_style_class_name('atlas-musica-largo');
        const fila = new St.BoxLayout({
            x_expand: true, y_expand: true, style: `padding: ${pad}px; spacing: ${Math.round(t * 0.14)}px;`,
        });
        this._arte = new St.Icon({
            icon_name: ICONE_MUSICA, icon_size: t - pad * 2, y_align: AL.CENTER, style: 'border-radius: 14px;',
        });
        const texto = (fator, classe, extra = '') => {
            const l = new St.Label({
                style_class: classe,
                style: `font-size: ${Math.round(t * fator)}px; text-align: left; ${extra}`,
            });
            l.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            return l;
        };
        this._titulo = texto(0.2, 'atlas-widget-txt');
        this._artista = texto(0.15, 'atlas-widget-sub', 'font-weight: normal;');
        this._barra = new Camada((cr, w, h, fg) => barra(cr, 0, h / 2 - 1.5, w, 3, this._frac(),
            [fg[0], fg[1], fg[2], 0.95], [fg[0], fg[1], fg[2], 0.22]));
        this._barra.actor.set_height(Math.round(t * 0.1));
        const coluna = new St.BoxLayout({
            vertical: true, x_expand: true, y_expand: true, y_align: AL.CENTER, style: `spacing: ${Math.round(t * 0.02)}px;`,
        });
        for (const a of [this._titulo, this._artista, this._barra.actor])
            coluna.add_child(a);

        const controles = new St.BoxLayout({y_align: AL.CENTER, style: `spacing: ${Math.round(t * 0.04)}px;`});
        const botao = (icone, lado, aoClicar, classe = '') => {
            const b = new St.Button({
                style_class: `atlas-widget-txt atlas-musica-btn ${classe}`, reactive: true, can_focus: false,
                style: `width: ${lado + 10}px; height: ${lado + 10}px;`,
                child: new St.Icon({icon_name: icone, icon_size: lado}),
            });
            b.connect('clicked', () => {
                const p = this._ativo();
                if (p)
                    aoClicar(p);
            });
            controles.add_child(b);
            return b;
        };
        const lado = Math.round(t * 0.2);
        botao('media-skip-backward-symbolic', lado, p => this._chamar(p, 'Previous'));
        this._play = botao('media-playback-start-symbolic', Math.round(t * 0.24), p => this._chamar(p, 'PlayPause'), 'atlas-musica-play');
        botao('media-skip-forward-symbolic', lado, p => this._chamar(p, 'Next'));

        fila.add_child(this._arte);
        fila.add_child(coluna);
        fila.add_child(controles);
        this.actor.add_child(fila);
        this._camadas.push(this._barra);
    }

    iniciar() {
        // só os nomes de players: sem o filtro, qualquer app entrando ou saindo do barramento refazia a lista
        this._sub = Gio.DBus.session.signal_subscribe('org.freedesktop.DBus', 'org.freedesktop.DBus',
            'NameOwnerChanged', '/org/freedesktop/DBus', MPRIS.slice(0, -1), Gio.DBusSignalFlags.MATCH_ARG0_NAMESPACE,
            () => this._listar());
        this.atualizar();
        this._listar();
        super.iniciar();
    }

    parar() {
        if (this._sub) {
            Gio.DBus.session.signal_unsubscribe(this._sub);
            this._sub = 0;
        }
        for (const p of this._players.values())
            p?.proxy.disconnect(p.sig);
        this._players.clear();
    }

    _listar() {
        Gio.DBus.session.call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus',
            'ListNames', null, new GLib.VariantType('(as)'), Gio.DBusCallFlags.NONE, -1, null, (conn, res) => {
                if (this._destruido)
                    return;
                let nomes;
                try {
                    [nomes] = conn.call_finish(res).deepUnpack();
                } catch (_e) {
                    return;
                }
                const vivos = new Set(nomes.filter(n => n.startsWith(MPRIS)));
                for (const [nome, p] of [...this._players]) {
                    if (!vivos.has(nome)) {
                        p?.proxy.disconnect(p.sig);
                        this._players.delete(nome);
                    }
                }
                for (const nome of vivos) {
                    if (!this._players.has(nome))
                        this._conectar(nome);
                }
                this._atualizarSeVisivel();
            });
    }

    _conectar(nome) {
        this._players.set(nome, null);
        Gio.DBusProxy.new_for_bus(Gio.BusType.SESSION, Gio.DBusProxyFlags.NONE, null, nome,
            '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', null, (_o, res) => {
                let proxy;
                try {
                    proxy = Gio.DBusProxy.new_for_bus_finish(res);
                } catch (_e) {
                    this._players.delete(nome);
                    return;
                }
                if (this._destruido || !this._players.has(nome))
                    return;
                this._players.set(nome, {proxy, sig: proxy.connect('g-properties-changed', () => this._atualizarSeVisivel())});
                this._atualizarSeVisivel();
            });
    }

    _estado(p) {
        return p.proxy.get_cached_property('PlaybackStatus')?.unpack() ?? 'Stopped';
    }

    // O que está tocando; senão o primeiro player encontrado.
    _ativo() {
        let alvo = null;
        for (const p of this._players.values()) {
            if (!p)
                continue;
            if (this._estado(p) === 'Playing')
                return p;
            alvo ??= p;
        }
        return alvo;
    }

    _meta(p) {
        try {
            const m = p.proxy.get_cached_property('Metadata')?.recursiveUnpack() ?? {};
            return {
                titulo: m['xesam:title'] || 'Sem título',
                artista: [].concat(m['xesam:artist'] ?? []).join(', '),
                arte: m['mpris:artUrl'] || '',
                duracao: Number(m['mpris:length']) || 0,
            };
        } catch (_e) {
            return {titulo: 'Sem título', artista: '', arte: '', duracao: 0};
        }
    }

    // A posição não é emitida como sinal; precisa ser perguntada.
    _pedirPosicao(p) {
        Gio.DBus.session.call(p.proxy.get_name(), '/org/mpris/MediaPlayer2', 'org.freedesktop.DBus.Properties', 'Get',
            new GLib.Variant('(ss)', ['org.mpris.MediaPlayer2.Player', 'Position']), new GLib.VariantType('(v)'),
            Gio.DBusCallFlags.NONE, 500, null, (conn, res) => {
                if (this._destruido)
                    return;
                try {
                    [this._pos] = conn.call_finish(res).recursiveUnpack();
                    this._pos = Number(this._pos) || 0;
                    this._redesenhar();
                } catch (_e) { /* player sem Position */ }
            });
    }

    _frac() {
        const p = this._ativo();
        const dur = p ? this._meta(p).duracao : 0;
        return dur > 0 ? this._pos / dur : 0;
    }

    // Aplica a capa (ou o ícone padrão) a um St.Icon, só quando a URL muda.
    _aplicarArte(icone, url) {
        if (icone._url === url)
            return;
        icone._url = url;
        try {
            if (url)
                icone.gicon = new Gio.FileIcon({file: Gio.File.new_for_uri(url)});
            else
                icone.icon_name = ICONE_MUSICA;
        } catch (_e) {
            icone.icon_name = ICONE_MUSICA;
        }
    }

    get etiqueta() {
        const p = this._ativo();
        if (!p)
            return 'Música';
        const m = this._meta(p);
        return m.artista ? `${m.titulo} • ${m.artista}` : m.titulo;
    }

    atualizar() {
        if (this._largo) {
            this._atualizarLargo();
            return;
        }
        const p = this._ativo();
        if (!p) {
            this._aplicarArte(this._arte, '');
            this._txt(this._topo, 'MÚSICA');
            this._txt(this._meio, 'sem player');
            this._txt(this._base, '');
            return;
        }
        const m = this._meta(p);
        const tocando = this._estado(p) === 'Playing';
        this._aplicarArte(this._arte, m.arte);
        this._txt(this._topo, tocando ? '▶' : '❚❚');
        this._txt(this._meio, m.titulo);
        this._txt(this._base, m.artista);
    }

    _atualizarLargo() {
        const p = this._ativo();
        const tocando = !!p && this._estado(p) === 'Playing';
        const m = p ? this._meta(p) : {titulo: 'Nada tocando', artista: 'Abra um player de música', arte: ''};
        this._aplicarArte(this._arte, m.arte);
        this._txt(this._titulo, m.titulo);
        this._txt(this._artista, m.artista);
        this._play.child.icon_name = tocando ? 'media-playback-pause-symbolic' : 'media-playback-start-symbolic';
        if (tocando)
            this._pedirPosicao(p);
        else if (!p)
            this._pos = 0;
        // tocando, a resposta da posição já redesenha a barra
        if (!tocando && this._mudou('l', `${m.titulo}|${m.artista}|${m.arte}|${p ? 1 : 0}`))
            this._redesenhar();
    }

    _chamar(p, metodo) {
        p.proxy.call(metodo, null, Gio.DBusCallFlags.NONE, -1, null, (px, res) => {
            try {
                px.call_finish(res);
            } catch (_e) { /* player pode ter fechado */ }
        });
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Música'));
        const p = this._ativo();
        if (!p) {
            linha(menu, 'Nenhum player aberto');
            return;
        }
        const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 8px; min-width: 232px;'});
        const arte = new St.Icon({icon_name: ICONE_MUSICA, icon_size: 168, x_align: AL.CENTER, style: 'border-radius: 12px;'});
        const titulo = this._textoPainel('', 15, 'font-weight: bold; text-align: center;');
        const artista = this._textoPainel('', 12, 'opacity: 170; text-align: center;');
        const tempos = new St.BoxLayout({style: 'spacing: 6px;'});
        const tAtual = this._textoPainel('0:00', 11);
        const tTotal = this._textoPainel('0:00', 11);
        let frac = 0;
        const progresso = new Camada((cr, w, h) => barra(cr, 0, h / 2 - 2, w, 4, frac, cor(COR.ok)), '');
        progresso.actor.set_height(14);
        progresso.actor.x_expand = true;
        tempos.add_child(tAtual);
        tempos.add_child(progresso.actor);
        tempos.add_child(tTotal);

        const controles = new St.BoxLayout({style: 'spacing: 14px;', x_align: AL.CENTER});
        const botao = (icone, aoClicar) => {
            const b = new St.Button({
                style_class: 'button', can_focus: true, style: 'padding: 6px 14px; border-radius: 99px;',
                child: new St.Icon({icon_name: icone, icon_size: 18}),
            });
            b.connect('clicked', aoClicar);
            controles.add_child(b);
            return b;
        };
        botao('media-skip-backward-symbolic', () => this._chamar(p, 'Previous'));
        const play = botao('media-playback-start-symbolic', () => {
            this._chamar(p, 'PlayPause');
        });
        botao('media-skip-forward-symbolic', () => this._chamar(p, 'Next'));

        const atualizar = () => {
            const m = this._meta(p);
            this._aplicarArte(arte, m.arte);
            titulo.text = m.titulo;
            artista.text = m.artista;
            tTotal.text = formatarFaixa(m.duracao);
            tAtual.text = formatarFaixa(this._pos);
            frac = m.duracao > 0 ? this._pos / m.duracao : 0;
            play.child.icon_name = this._estado(p) === 'Playing' ? 'media-playback-pause-symbolic' : 'media-playback-start-symbolic';
            progresso.redesenhar();
            this._pedirPosicao(p);
        };
        for (const a of [arte, titulo, artista])
            caixa.add_child(a);
        caixa.add_child(tempos);
        caixa.add_child(controles);
        this._item(menu, caixa);
        atualizar();
        this._vivo(menu, 1000, atualizar, caixa);
    }
}
