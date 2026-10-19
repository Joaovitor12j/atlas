// Widgets do ATLAS: tiles que desenham um estado vivo dentro da doca e abrem um painel (menu) ao clicar.
// Cada widget tem três linhas de texto (topo, meio, base) e herda o ciclo de vida da classe base:
// iniciar() -> atualizar() a cada `intervalo` ms -> destruir().
// O estado que precisa sobreviver à reconstrução da doca (ex.: pomodoro) fica fora da classe.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

// GSettings da extensão, passado por criarWidget; as opções dos widgets são lidas a cada uso.
let CFG = null;

function linha(menu, texto) {
    const mi = new PopupMenu.PopupMenuItem(texto, {reactive: false, can_focus: false});
    menu.addMenuItem(mi);
    return mi;
}

function duracao(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}` : `${m} min`;
}

class Widget {
    // Fração do tamanho do tile usada na fonte de cada linha: [topo, meio, base].
    static FONTES = [0.15, 0.28, 0.15];

    constructor(tam) {
        this._tam = tam;
        this._timerId = 0;
        this._destruido = false;
        this.actor = new St.BoxLayout({style_class: 'atlas-widget', vertical: true, x_expand: true, y_expand: true});
        this.actor.set_size(tam, tam);
        const [ft, fm, fb] = this.constructor.FONTES;
        this._topo = this._label(ft, 'atlas-widget-sub');
        this._meio = this._label(fm, 'atlas-widget-txt');
        this._base = this._label(fb, 'atlas-widget-sub');
        for (const l of [this._topo, this._meio, this._base])
            this.actor.add_child(l);
    }

    _label(fator, classe) {
        const l = new St.Label({
            style_class: classe,
            style: `font-size: ${Math.max(7, Math.round(this._tam * fator))}px; text-align: center;`,
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
        });
        l.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        return l;
    }

    _txt(label, texto) {
        if (label.text !== texto)
            label.text = texto;
    }

    // Texto do tooltip e do primeiro item do painel.
    get etiqueta() {
        return '';
    }

    // Intervalo de atualização em ms; 0 = só quando o próprio widget pedir.
    get intervalo() {
        return 0;
    }

    iniciar() {
        this.atualizar();
        if (this.intervalo > 0) {
            this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.intervalo, () => {
                this.atualizar();
                return GLib.SOURCE_CONTINUE;
            });
        }
    }

    destruir() {
        this._destruido = true;
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
        this.parar();
    }

    atualizar() {}
    parar() {}
    fillMenu(_menu) {}
}

// ----- Relógio -----
class Relogio extends Widget {
    get intervalo() {
        return 1000;
    }

    get etiqueta() {
        return GLib.DateTime.new_now_local().format('%A, %d de %B');
    }

    atualizar() {
        const d = GLib.DateTime.new_now_local();
        this._txt(this._topo, d.format('%a').toUpperCase());
        this._txt(this._meio, d.format(CFG?.get_boolean('relogio-24h') ?? true ? '%H:%M' : '%I:%M'));
        this._txt(this._base, d.format('%d/%m'));
    }

    fillMenu(menu) {
        const d = GLib.DateTime.new_now_local();
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Relógio'));
        linha(menu, d.format(CFG?.get_boolean('relogio-24h') ?? true ? '%H:%M:%S' : '%I:%M:%S %p'));
        linha(menu, d.format('%A, %d de %B de %Y'));
    }
}

// ----- Pomodoro -----
// Fica fora da classe: a doca é reconstruída com frequência e o contador não pode zerar.
const MIN = 60 * 1000;
const FASES = {
    foco: {nome: 'Foco', chave: 'pomodoro-foco', padrao: 25, cor: '#e0654f'},
    pausa: {nome: 'Pausa', chave: 'pomodoro-pausa', padrao: 5, cor: '#3fb8a8'},
    longa: {nome: 'Pausa longa', chave: 'pomodoro-pausa-longa', padrao: 15, cor: '#4a90d9'},
};
const duracaoFase = fase => (CFG?.get_int(FASES[fase].chave) ?? FASES[fase].padrao) * MIN;
// `intacto`: a fase ainda não rodou, então uma mudança de duração nas preferências vale na hora.
const POMO = {fase: 'foco', fim: 0, restante: 25 * MIN, intacto: true, ciclos: 0, dia: ''};

const agoraMs = () => GLib.get_monotonic_time() / 1000;

function pomoRestante() {
    return POMO.fim ? Math.max(0, POMO.fim - agoraMs()) : POMO.restante;
}

function pomoTrocarFase(fase) {
    POMO.fase = fase;
    POMO.restante = duracaoFase(fase);
    POMO.fim = 0;
    POMO.intacto = true;
}

// Foco concluído conta um ciclo; a cada 4 vem a pausa longa.
function pomoAvancar() {
    if (POMO.fase === 'foco') {
        POMO.ciclos++;
        pomoTrocarFase(POMO.ciclos % 4 === 0 ? 'longa' : 'pausa');
    } else {
        pomoTrocarFase('foco');
    }
}

// Idempotente: vários widgets (um por tela) chamam isto, só o primeiro encontra o fim vencido.
function pomoTick() {
    const hoje = GLib.DateTime.new_now_local().format('%Y-%m-%d');
    if (POMO.dia !== hoje) {
        POMO.dia = hoje;
        POMO.ciclos = 0;
    }
    if (POMO.fim && agoraMs() >= POMO.fim) {
        const terminou = POMO.fase;
        pomoAvancar();
        Main.notify('ATLAS',
            terminou === 'foco' ? `Foco concluído. Hora da ${FASES[POMO.fase].nome.toLowerCase()}.` : 'Pausa acabou. Hora de focar.');
    }
}

class Pomodoro extends Widget {
    get intervalo() {
        return 1000;
    }

    get etiqueta() {
        return `Pomodoro: ${FASES[POMO.fase].nome}`;
    }

    atualizar() {
        pomoTick();
        if (POMO.intacto && !POMO.fim)
            POMO.restante = duracaoFase(POMO.fase);
        const seg = Math.ceil(pomoRestante() / 1000);
        const f = FASES[POMO.fase];
        this._txt(this._topo, f.nome.toUpperCase());
        this._txt(this._meio, `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`);
        this._txt(this._base, `${POMO.ciclos % 4}/4${POMO.fim ? '' : '  ❚❚'}`);
        this.actor.style = `border-color: ${f.cor};`;
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Pomodoro'));
        linha(menu, `${FASES[POMO.fase].nome}, ${POMO.ciclos} ciclo(s) hoje`);
        menu.addAction(POMO.fim ? 'Pausar' : 'Iniciar', () => {
            if (POMO.fim) {
                POMO.restante = pomoRestante();
                POMO.fim = 0;
            } else {
                POMO.fim = agoraMs() + POMO.restante;
                POMO.intacto = false;
            }
            this.atualizar();
        });
        menu.addAction('Pular fase', () => {
            pomoAvancar();
            this.atualizar();
        });
        menu.addAction('Reiniciar', () => {
            POMO.ciclos = 0;
            pomoTrocarFase('foco');
            this.atualizar();
        });
    }
}

// ----- Bateria (UPower) -----
class Bateria extends Widget {
    iniciar() {
        Gio.DBusProxy.new_for_bus(Gio.BusType.SYSTEM, Gio.DBusProxyFlags.NONE, null,
            'org.freedesktop.UPower', '/org/freedesktop/UPower/devices/DisplayDevice',
            'org.freedesktop.UPower.Device', null, (_o, res) => {
                try {
                    this._proxy = Gio.DBusProxy.new_for_bus_finish(res);
                } catch (e) {
                    console.error(`[atlas] UPower indisponível: ${e}`);
                    return;
                }
                if (this._destruido) {
                    this._proxy = null;
                    return;
                }
                this._sig = this._proxy.connect('g-properties-changed', () => this.atualizar());
                this.atualizar();
            });
        this.atualizar();
    }

    parar() {
        if (this._proxy && this._sig)
            this._proxy.disconnect(this._sig);
        this._proxy = null;
        this._sig = 0;
    }

    _prop(nome) {
        return this._proxy?.get_cached_property(nome)?.unpack();
    }

    _dados() {
        if (!this._proxy || !this._prop('IsPresent'))
            return null;
        const estado = this._prop('State');           // 1 carregando, 2 descarregando, 4 cheia
        const seg = Number(estado === 1 ? this._prop('TimeToFull') : this._prop('TimeToEmpty')) || 0;
        return {pct: Math.round(this._prop('Percentage') ?? 0), estado, seg};
    }

    get etiqueta() {
        const d = this._dados();
        return d ? `Bateria: ${d.pct}%` : 'Bateria';
    }

    atualizar() {
        const d = this._dados();
        if (!d) {
            this._txt(this._topo, 'ENERGIA');
            this._txt(this._meio, 'AC');
            this._txt(this._base, this._proxy ? 'sem bateria' : '...');
            this.actor.style = '';
            return;
        }
        this._txt(this._topo, d.estado === 1 ? 'CARREGANDO' : d.estado === 4 ? 'CHEIA' : 'BATERIA');
        this._txt(this._meio, `${d.pct}%`);
        this._txt(this._base, d.seg > 0 ? duracao(d.seg) : '');
        const baixa = d.estado === 2 && d.pct <= 15;
        this.actor.style = `border-color: ${baixa ? '#e24b4a' : d.estado === 1 ? '#3fb8a8' : 'transparent'};`;
    }

    fillMenu(menu) {
        const d = this._dados();
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Bateria'));
        if (!d) {
            linha(menu, 'Sem bateria detectada');
            return;
        }
        const quando = d.estado === 1 ? 'para carregar' : 'restante';
        linha(menu, `${d.pct}%${d.seg > 0 ? `, ${duracao(d.seg)} ${quando}` : ''}`);
    }
}

// ----- Música (MPRIS) -----
const MPRIS = 'org.mpris.MediaPlayer2.';

class Musica extends Widget {
    static FONTES = [0.15, 0.17, 0.14];

    constructor(tam) {
        super(tam);
        this._players = new Map(); // nome do bus -> {proxy, sig}, ou null enquanto o proxy é criado
    }

    iniciar() {
        this._sub = Gio.DBus.session.signal_subscribe('org.freedesktop.DBus', 'org.freedesktop.DBus',
            'NameOwnerChanged', '/org/freedesktop/DBus', null, Gio.DBusSignalFlags.NONE, () => this._listar());
        this.atualizar();
        this._listar();
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
                this.atualizar();
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
                this._players.set(nome, {proxy, sig: proxy.connect('g-properties-changed', () => this.atualizar())});
                this.atualizar();
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
            return {titulo: m['xesam:title'] || 'Sem título', artista: [].concat(m['xesam:artist'] ?? []).join(', ')};
        } catch (_e) {
            return {titulo: 'Sem título', artista: ''};
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
        const p = this._ativo();
        if (!p) {
            this._txt(this._topo, 'MÚSICA');
            this._txt(this._meio, '♪');
            this._txt(this._base, 'sem player');
            return;
        }
        const m = this._meta(p);
        this._txt(this._topo, this._estado(p) === 'Playing' ? '▶ TOCANDO' : '❚❚ PAUSADO');
        this._txt(this._meio, m.titulo);
        this._txt(this._base, m.artista);
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
        const m = this._meta(p);
        linha(menu, m.titulo);
        if (m.artista)
            linha(menu, m.artista);
        menu.addAction('Anterior', () => this._chamar(p, 'Previous'));
        menu.addAction(this._estado(p) === 'Playing' ? 'Pausar' : 'Tocar', () => this._chamar(p, 'PlayPause'));
        menu.addAction('Próxima', () => this._chamar(p, 'Next'));
    }
}

const CLASSES = {relogio: Relogio, pomodoro: Pomodoro, bateria: Bateria, musica: Musica};

// Cria e inicia o widget `id` num tile de `tam` px; devolve null se o id não existe.
export function criarWidget(id, tam, settings) {
    CFG = settings;
    const Classe = CLASSES[id];
    if (!Classe)
        return null;
    const w = new Classe(tam);
    w.iniciar();
    return w;
}
