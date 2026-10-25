// Widgets do ATLAS: tiles vivos desenhados dentro da doca, que abrem um painel ao clicar.
//
// Um tile é um St.Widget em camadas: uma Camada de desenho (Cairo, ver desenho.js) por baixo e três linhas de
// texto (topo, meio, base) por cima. Os que têm mais a mostrar ganham uma versão larga (static LARGURA).
// Ciclo de vida: construir() -> iniciar() -> atualizar() a cada `intervalo` ms -> destruir().
// O estado que precisa sobreviver à reconstrução da doca (pomodoro, histórico de CPU...) fica fora da classe.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Pango from 'gi://Pango';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {anel, barra, cor, grafico, iconeTempo, relogioAnalogico} from './desenho.js';
import {agendar, agora, registrar} from './perf.js';
import {CLIMA, buscarClima, localDoClima} from './clima.js';
import {
    DIAS_SEMANA, MESES, calcularProgresso, descreverTempo, diaCurto, diasAte, duracao, escalaGrafico,
    formatarCrono, formatarFaixa, formatarTaxa, formatarTemp, lerNaoLidas, mudarMes, pct, percentualCpu, proximaFase, registrarCopia, resumirTexto, semanasDoMes, textoDoSelo,
} from './logica.js';

// GSettings da extensão, passado por criarWidget; as opções dos widgets são lidas a cada uso.
let CFG = null;

const COR = {foco: '#e0654f', ok: '#3fb8a8', azul: '#4a90d9', ambar: '#e8a93a', erro: '#e24b4a'};
const agoraMs = () => GLib.get_monotonic_time() / 1000;
const AL = Clutter.ActorAlign;

function linha(menu, texto) {
    const mi = new PopupMenu.PopupMenuItem(texto, {reactive: false, can_focus: false});
    menu.addMenuItem(mi);
    return mi;
}

// Área de desenho com Cairo. `desenhar(cr, largura, altura, [r, g, b])` recebe a cor do texto do tema.
// Sem classe de estilo (nos painéis do menu) herda a cor do próprio menu.
// Texto dos menus do Shell, que são sempre escuros. Nos painéis a cor é fixa: buscar o nó de tema de um actor
// dentro do menu, no meio da destruição dele, enche o log de avisos do GJS.
const FG_MENU = [0.95, 0.95, 0.97];

class Camada {
    constructor(desenhar, classe = 'atlas-widget-txt') {
        this.actor = new St.DrawingArea({style_class: classe || null, x_expand: true, y_expand: true});
        this.actor.connect('repaint', a => {
            const cr = a.get_context();
            const t0 = agora();
            try {
                const [w, h] = a.get_surface_size();
                let fg = FG_MENU;
                if (classe) {
                    const c = a.get_theme_node().get_foreground_color();
                    fg = [c.red / 255, c.green / 255, c.blue / 255];
                }
                desenhar(cr, w, h, fg);
            } catch (e) {
                console.error(`[atlas] erro ao desenhar o widget: ${e}`);
            } finally {
                cr.$dispose();
                registrar('desenho', t0);
            }
        });
    }

    redesenhar() {
        this.actor.queue_repaint();
    }
}

// Valor que anda suave até o alvo (para os anéis). O primeiro valor entra direto, sem varrer do zero a cada
// reconstrução da doca.
class Animado {
    constructor(aoMudar) {
        this.atual = 0;
        this.alvo = 0;
        this._id = 0;
        this._inicial = true;
        this._aoMudar = aoMudar;
    }

    definir(alvo) {
        this.alvo = alvo;
        if (this._inicial) {
            this._inicial = false;
            this.atual = alvo;
            this._aoMudar();
            return;
        }
        if (this._id || Math.abs(alvo - this.atual) < 0.001)
            return;
        this._id = agendar('anel-anima', 33, () => {
            this.atual += (this.alvo - this.atual) * 0.3;
            const fim = Math.abs(this.alvo - this.atual) < 0.002;
            if (fim)
                this.atual = this.alvo;
            this._aoMudar();
            if (fim)
                this._id = 0;
            return fim ? GLib.SOURCE_REMOVE : GLib.SOURCE_CONTINUE;
        });
    }

    parar() {
        if (this._id) {
            GLib.source_remove(this._id);
            this._id = 0;
        }
    }
}

class Widget {
    // Fração do tamanho do tile usada na fonte de cada linha: [topo, meio, base].
    static FONTES = [0.15, 0.28, 0.15];
    // Largura da versão larga, em múltiplos do lado; 1 = o widget não tem versão larga.
    static LARGURA = 1;

    constructor(tam, largo = false) {
        this._tam = tam;
        this._largo = largo && this.constructor.LARGURA > 1;
        this.larg = this._largo ? this.constructor.LARGURA : 1; // lido pelo dock
        this._larg = Math.round(tam * this.larg);
        this._timerId = 0;
        this._destruido = false;
        this._camadas = [];
        this._animados = [];
        this._timersPainel = new Set();
        this._pulsando = false;
        this.pausado = false; // o dock pausa os widgets quando está escondido (auto-ocultar)
        this._ult = {};
        this.actor = new St.Widget({
            style_class: 'atlas-widget', layout_manager: new Clutter.BinLayout(), x_expand: true, y_expand: true,
        });
        this.actor.set_size(this._larg, tam);
        // no Overview ou em tela cheia o actor sai da tela: ao voltar, atualiza na hora
        this.actor.connect('notify::mapped', () => {
            if (this.actor.mapped && !this._destruido)
                this.despausar();
        });
        this.construir();
    }

    // Monta as camadas do tile; o padrão é só as três linhas de texto.
    construir() {
        this._criarTexto();
    }

    _criarTexto() {
        const [ft, fm, fb] = this.constructor.FONTES;
        this._texto = new St.BoxLayout({vertical: true, x_expand: true, y_expand: true});
        this._topo = this._label(ft, 'atlas-widget-sub');
        this._meio = this._label(fm, 'atlas-widget-txt');
        this._base = this._label(fb, 'atlas-widget-sub');
        for (const l of [this._topo, this._meio, this._base])
            this._texto.add_child(l);
        this.actor.add_child(this._texto);
    }

    _label(fator, classe) {
        const l = new St.Label({
            style_class: classe,
            style: `font-size: ${Math.max(7, Math.round(this._tam * fator))}px; text-align: center;`,
            y_align: AL.CENTER,
            y_expand: true,
        });
        l.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        return l;
    }

    // Atualiza um rótulo; rótulo vazio some (não ocupa espaço) e um rótulo `_ocultar`ado nunca volta.
    _txt(label, texto) {
        if (label._oculto)
            return;
        if (label.text !== texto)
            label.text = texto;
        label.visible = texto !== '';
    }

    _ocultar(...rotulos) {
        for (const l of rotulos) {
            l._oculto = true;
            l.hide();
        }
    }

    // Camada de desenho por baixo do texto.
    _camada(desenhar) {
        const c = new Camada(desenhar);
        this.actor.insert_child_below(c.actor, this._texto ?? null);
        this._camadas.push(c);
        return c;
    }

    _animado() {
        const a = new Animado(() => this._camadas.forEach(c => c.redesenhar()));
        this._animados.push(a);
        return a;
    }

    _redesenhar() {
        this._camadas.forEach(c => c.redesenhar());
    }

    // Texto à esquerda, ocupando só um quadrado, para o desenho largo usar o resto (versão larga).
    _textoNoQuadrado(lado = this._tam) {
        this._texto.set_width(lado);
        this._texto.x_align = AL.START;
    }

    // Pisca o tile enquanto `ligar` for verdadeiro (fim do timer, bateria baixa).
    _pulsar(ligar) {
        if (ligar === this._pulsando)
            return;
        this._pulsando = ligar;
        this.actor.remove_all_transitions();
        if (!ligar) {
            this.actor.opacity = 255;
            return;
        }
        const ciclo = baixo => {
            if (!this._pulsando || this._destruido)
                return;
            this.actor.ease({
                opacity: baixo ? 110 : 255, duration: 650, mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
                onComplete: () => ciclo(!baixo),
            });
        };
        ciclo(true);
    }

    // ----- painel (conteúdo do menu ao clicar) -----

    // Põe um actor qualquer no menu, como uma linha que não reage ao clique.
    _item(menu, actor) {
        const it = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        it.add_child(actor);
        menu.addMenuItem(it);
        return it;
    }

    // Executa `fn` a cada `ms` enquanto o menu estiver aberto. Para ao fechar, ao destruir o menu (o dock
    // destrói o menu antigo ao abrir outro, sem fechá-lo) e ao destruir o widget.
    _vivo(menu, ms, fn, conteudo) {
        const t = {id: 0};
        let vivo = true; // o menu ainda vai abrir; só o fechamento ou a destruição encerram o laço
        const parar = () => {
            vivo = false;
            if (t.id) {
                GLib.source_remove(t.id);
                t.id = 0;
            }
        };
        t.id = agendar('painel-vivo', ms, () => {
            if (this._destruido || !vivo) {
                t.id = 0;
                return GLib.SOURCE_REMOVE;
            }
            fn();
            return GLib.SOURCE_CONTINUE;
        });
        t.parar = parar;
        this._timersPainel.add(t);
        menu.connect('open-state-changed', (_m, aberto) => {
            if (!aberto)
                parar();
        });
        menu.connect('destroy', parar);
        conteudo?.connect('destroy', parar); // o menu pode ser destruído ainda aberto, sem emitir nada
    }

    _textoPainel(texto, px = 13, extra = '') {
        return new St.Label({text: texto, style: `font-size: ${px}px; ${extra}`, y_align: AL.CENTER});
    }

    // Anel grande com texto no centro, atualizado a cada segundo enquanto o menu está aberto.
    _anelGrande(menu, {frac, cor: corFn, texto, sub = () => ''}) {
        const lado = 112;
        const caixa = new St.Widget({layout_manager: new Clutter.BinLayout(), width: lado, height: lado, x_align: AL.CENTER});
        const camada = new Camada((cr, w, h) => anel(cr, w / 2, h / 2, w / 2 - 9, 8, frac(), cor(corFn())), '');
        camada.actor.set_size(lado, lado);
        caixa.add_child(camada.actor);
        const centro = new St.BoxLayout({vertical: true, x_expand: true, y_expand: true, y_align: AL.CENTER});
        const t1 = this._textoPainel('', 24, 'font-weight: bold; text-align: center;');
        const t2 = this._textoPainel('', 11, 'text-align: center;');
        t1.x_align = t2.x_align = AL.CENTER;
        centro.add_child(t1);
        centro.add_child(t2);
        caixa.add_child(centro);
        const atualizar = () => {
            t1.text = texto();
            t2.text = sub();
            camada.redesenhar();
        };
        atualizar();
        this._item(menu, caixa);
        this._vivo(menu, 1000, atualizar, caixa);
        return atualizar;
    }

    // Texto do tooltip.
    get etiqueta() {
        return '';
    }

    // Intervalo de atualização em ms; 0 = só quando o próprio widget pedir.
    get intervalo() {
        return 0;
    }

    // O widget está sendo visto? Escondido pelo auto-ocultar, ou fora da tela (Overview, tela cheia), não é.
    _visivel() {
        return !this.pausado && this.actor.mapped;
    }

    // Para sinais (D-Bus, área de transferência): só gasta desenho se alguém vê o tile.
    _atualizarSeVisivel() {
        if (this._visivel())
            this.atualizar();
    }

    // O dock chama isto ao esconder ou mostrar a doca.
    pausar(sim) {
        if (sim === this.pausado)
            return;
        this.pausado = sim;
        if (!sim && !this._destruido)
            this.despausar();
    }

    despausar() {
        this.atualizar();
    }

    // Verdadeiro se `valor` for diferente do último guardado em `chave`: serve para só redesenhar quando algo mudou.
    _mudou(chave, valor) {
        if (this._ult[chave] === valor)
            return false;
        this._ult[chave] = valor;
        return true;
    }

    // O que não pode parar nem com o tile invisível: fim do timer, amostras de CPU e rede.
    logica() {}

    // Um ciclo: a lógica sempre; o desenho só se o tile estiver à vista; e confere se o intervalo mudou.
    _passo() {
        this.logica();
        if (this._visivel())
            this.atualizar();
    }

    // Os widgets que mudam de ritmo (parado x rodando) devolvem outro `intervalo`; o temporizador acompanha.
    _agendar() {
        const ms = this.intervalo;
        this._msAtual = ms;
        if (ms <= 0)
            return;
        this._timerId = agendar(this.constructor.name, ms, () => {
            this._passo();
            if (this._destruido)
                return GLib.SOURCE_REMOVE;
            if (this.intervalo !== ms) {
                this._agendar();
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    // Para quem muda de ritmo fora do temporizador (clique no menu, sinal de D-Bus).
    reagendar() {
        if (this._destruido || this.intervalo === this._msAtual)
            return;
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
        this._agendar();
    }

    // Ação do usuário num painel: roda um ciclo e ajusta o ritmo.
    _acao() {
        this._passo();
        this.reagendar();
    }

    iniciar() {
        this.logica();
        this.atualizar();
        this._agendar();
    }

    destruir() {
        this._destruido = true;
        this._pulsando = false;
        this.actor.remove_all_transitions();
        for (const a of this._animados)
            a.parar();
        for (const t of this._timersPainel)
            t.parar();
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

// ----- Relógio: de ponteiros no tile quadrado, digital no largo; calendário do mês no painel -----
class Relogio extends Widget {
    static FONTES = [0.14, 0.32, 0.14];
    static LARGURA = 2.2;

    get intervalo() {
        return 1000;
    }

    get etiqueta() {
        return GLib.DateTime.new_now_local().format('%A, %d de %B');
    }

    construir() {
        this._criarTexto();
        this._hms = [0, 0, 0];
        if (this._largo) {
            this._camada((cr, w, h) => barra(cr, 18, h - 11, w - 36, 3, this._hms[2] / 60, cor(COR.ambar)));
        } else {
            this._camada((cr, w, h, fg) => relogioAnalogico(cr, w / 2, h / 2, Math.min(w, h) / 2 - 9,
                ...this._hms, fg, cor(COR.foco)));
            this._texto.hide();
        }
    }

    atualizar() {
        const d = GLib.DateTime.new_now_local();
        this._hms = [d.get_hour(), d.get_minute(), d.get_second()];
        if (this._largo) {
            this._txt(this._topo, d.format('%a, %d %b').toUpperCase());
            this._txt(this._meio, d.format(CFG?.get_boolean('relogio-24h') ?? true ? '%H:%M' : '%I:%M'));
            this._txt(this._base, '');
        }
        this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Calendário'));
        const d = GLib.DateTime.new_now_local();
        let vis = {ano: d.get_year(), mes: d.get_month()};

        const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 6px; min-width: 238px;'});
        const cab = new St.BoxLayout({style: 'spacing: 4px;'});
        const botao = (texto, delta) => {
            const b = new St.Button({label: texto, style_class: 'button', can_focus: true, style: 'padding: 2px 10px;'});
            b.connect('clicked', () => {
                vis = mudarMes(vis, delta);
                desenhar();
            });
            return b;
        };
        const titulo = this._textoPainel('', 14, 'font-weight: bold; text-align: center;');
        titulo.x_expand = true;
        cab.add_child(botao('‹', -1));
        cab.add_child(titulo);
        cab.add_child(botao('›', 1));
        const grade = new St.Widget({layout_manager: new Clutter.GridLayout(), style: 'padding-top: 2px;'});
        caixa.add_child(cab);
        caixa.add_child(grade);

        const celula = (texto, estilo = '') => new St.Label({
            text: texto, x_align: AL.CENTER, y_align: AL.CENTER,
            style: `width: 32px; height: 26px; text-align: center; ${estilo}`,
        });
        const desenhar = () => {
            const hoje = GLib.DateTime.new_now_local();
            titulo.text = `${MESES[vis.mes - 1]} de ${vis.ano}`;
            grade.destroy_all_children();
            const lm = grade.layout_manager;
            DIAS_SEMANA.forEach((n, c) => lm.attach(celula(n, 'opacity: 150; font-size: 11px;'), c, 0, 1, 1));
            semanasDoMes(vis.ano, vis.mes).forEach((sem, r) => sem.forEach((dia, c) => {
                if (dia === null)
                    return;
                const ehHoje = dia === hoje.get_day_of_month() && vis.mes === hoje.get_month() && vis.ano === hoje.get_year();
                lm.attach(celula(String(dia), ehHoje
                    ? `background-color: ${COR.foco}; color: white; border-radius: 13px; font-weight: bold;`
                    : (c === 0 ? 'opacity: 190;' : '')), c, r + 1, 1, 1);
            }));
        };
        desenhar();
        this._item(menu, caixa);
        linha(menu, d.format(CFG?.get_boolean('relogio-24h') ?? true ? '%H:%M:%S' : '%I:%M:%S %p'));
    }
}

// ----- Pomodoro -----
// Fica fora da classe: a doca é reconstruída com frequência e o contador não pode zerar.
const MIN = 60 * 1000;
const FASES = {
    foco: {nome: 'Foco', chave: 'pomodoro-foco', padrao: 25, cor: COR.foco},
    pausa: {nome: 'Pausa', chave: 'pomodoro-pausa', padrao: 5, cor: COR.ok},
    longa: {nome: 'Pausa longa', chave: 'pomodoro-pausa-longa', padrao: 15, cor: COR.azul},
};
const duracaoFase = fase => (CFG?.get_int(FASES[fase].chave) ?? FASES[fase].padrao) * MIN;
// `intacto`: a fase ainda não rodou, então uma mudança de duração nas preferências vale na hora.
const POMO = {fase: 'foco', fim: 0, restante: 25 * MIN, intacto: true, ciclos: 0, dia: '', pulsoAte: 0};

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
    const prox = proximaFase(POMO.fase, POMO.ciclos);
    POMO.ciclos = prox.ciclos;
    pomoTrocarFase(prox.fase);
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
        POMO.pulsoAte = agoraMs() + 10000; // o tile pisca por 10 s
        Main.notify('ATLAS',
            terminou === 'foco' ? `Foco concluído. Hora da ${FASES[POMO.fase].nome.toLowerCase()}.` : 'Pausa acabou. Hora de focar.');
    }
}

const pomoFrac = () => (POMO.intacto && !POMO.fim ? 0 : 1 - pomoRestante() / duracaoFase(POMO.fase));
const mmss = ms => formatarCrono(Math.ceil(ms / 1000) * 1000);

class Pomodoro extends Widget {
    static FONTES = [0.13, 0.27, 0.18];

    // parado, só confere de vez em quando; rodando, a cada segundo
    get intervalo() {
        return POMO.fim ? 1000 : 4000;
    }

    logica() {
        pomoTick();
    }

    get etiqueta() {
        return `Pomodoro: ${FASES[POMO.fase].nome}`;
    }

    construir() {
        this._criarTexto();
        this._ocultar(this._topo); // a fase aparece na cor do anel e no tooltip
        this._anim = this._animado();
        this._camada((cr, w, h) => anel(cr, w / 2, h / 2, Math.min(w, h) / 2 - 7, 5, this._anim.atual, cor(FASES[POMO.fase].cor)));
    }

    atualizar() {
        pomoTick();
        if (POMO.intacto && !POMO.fim)
            POMO.restante = duracaoFase(POMO.fase);
        const f = FASES[POMO.fase];
        const c = POMO.ciclos % 4;
        this._txt(this._topo, f.nome.toUpperCase());
        this._txt(this._meio, mmss(pomoRestante()));
        this._txt(this._base, '●'.repeat(c) + '○'.repeat(4 - c));
        this._anim.definir(pomoFrac());
        this._pulsar(agoraMs() < POMO.pulsoAte);
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Pomodoro'));
        this._anelGrande(menu, {
            frac: pomoFrac, cor: () => FASES[POMO.fase].cor, texto: () => mmss(pomoRestante()),
            sub: () => `${FASES[POMO.fase].nome} · ${POMO.ciclos} ciclo(s) hoje`,
        });
        menu.addAction(POMO.fim ? 'Pausar' : 'Iniciar', () => {
            if (POMO.fim) {
                POMO.restante = pomoRestante();
                POMO.fim = 0;
            } else {
                POMO.fim = agoraMs() + POMO.restante;
                POMO.intacto = false;
                POMO.pulsoAte = 0;
            }
            this._acao();
        });
        menu.addAction('Pular fase', () => {
            pomoAvancar();
            POMO.pulsoAte = 0;
            this._acao();
        });
        menu.addAction('Reiniciar', () => {
            POMO.ciclos = 0;
            pomoTrocarFase('foco');
            POMO.pulsoAte = 0;
            this._acao();
        });
    }
}

// ----- Bateria (UPower) -----
class Bateria extends Widget {
    static FONTES = [0.2, 0.27, 0.17];

    construir() {
        this._criarTexto();
        this._anim = this._animado();
        this._camada((cr, w, h) => anel(cr, w / 2, h / 2, Math.min(w, h) / 2 - 7, 5, this._anim.atual, cor(this._corAnel ?? COR.ok)));
    }

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
                this._sig = this._proxy.connect('g-properties-changed', () => this._atualizarSeVisivel());
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

    _cor(d) {
        if (d.estado === 1)
            return COR.azul;
        return d.pct <= 15 ? COR.erro : d.pct <= 40 ? COR.ambar : COR.ok;
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
            this._anim.definir(0);
            this._pulsar(false);
            return;
        }
        this._corAnel = this._cor(d);
        this._txt(this._topo, d.estado === 1 ? '⚡' : '');
        this._txt(this._meio, `${d.pct}%`);
        this._txt(this._base, d.seg > 0 ? duracao(d.seg) : '');
        this._anim.definir(d.pct / 100);
        this._pulsar(d.estado === 2 && d.pct <= 15);
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Bateria'));
        const d0 = this._dados();
        if (!d0) {
            linha(menu, 'Sem bateria detectada');
            return;
        }
        this._anelGrande(menu, {
            frac: () => (this._dados()?.pct ?? 0) / 100,
            cor: () => (this._dados() ? this._cor(this._dados()) : COR.ok),
            texto: () => `${this._dados()?.pct ?? 0}%`,
            sub: () => {
                const d = this._dados();
                if (!d)
                    return '';
                const estado = d.estado === 1 ? 'carregando' : d.estado === 4 ? 'cheia' : 'na bateria';
                return d.seg > 0 ? `${estado} · ${duracao(d.seg)}` : estado;
            },
        });
    }
}

// ----- Música (MPRIS) -----
const MPRIS = 'org.mpris.MediaPlayer2.';
const ICONE_MUSICA = 'audio-x-generic-symbolic';

class Musica extends Widget {
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
        this._sub = Gio.DBus.session.signal_subscribe('org.freedesktop.DBus', 'org.freedesktop.DBus',
            'NameOwnerChanged', '/org/freedesktop/DBus', null, Gio.DBusSignalFlags.NONE, () => this._listar());
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

// ----- Progresso do tempo: quatro anéis concêntricos (dia, semana, mês, ano) -----
const PROGRESSO = [
    ['Dia', 'dia', COR.foco],
    ['Semana', 'semana', COR.ambar],
    ['Mês', 'mes', COR.ok],
    ['Ano', 'ano', COR.azul],
];

function progresso() {
    const d = GLib.DateTime.new_now_local();
    return calcularProgresso({
        hora: d.get_hour(), minuto: d.get_minute(), segundo: d.get_second(),
        diaSemana: d.get_day_of_week(), diaMes: d.get_day_of_month(),
        diasNoMes: GLib.Date.get_days_in_month(d.get_month(), d.get_year()),
        diaAno: d.get_day_of_year(), ano: d.get_year(),
    });
}

class Progresso extends Widget {
    static FONTES = [0.13, 0.19, 0.13];

    get intervalo() {
        return 30000;
    }

    get etiqueta() {
        const p = progresso();
        return `Hoje ${pct(p.dia)}, semana ${pct(p.semana)}, mês ${pct(p.mes)}, ano ${pct(p.ano)}`;
    }

    construir() {
        this._criarTexto();
        this._p = progresso();
        this._camada((cr, w, h) => {
            const r0 = Math.min(w, h) / 2 - 5;
            PROGRESSO.forEach(([, chave, c], i) => anel(cr, w / 2, h / 2, r0 - i * 6, 3.2, this._p[chave], cor(c)));
        });
        this._texto.y_align = AL.CENTER;
        this._ocultar(this._topo, this._base);
    }

    atualizar() {
        this._p = progresso();
        this._txt(this._meio, pct(this._p.dia));
        this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Progresso do tempo'));
        const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 8px; min-width: 240px;'});
        const linhas = PROGRESSO.map(([nome, chave, c]) => {
            const l = new St.BoxLayout({style: 'spacing: 8px;'});
            const rotulo = this._textoPainel('', 12, 'min-width: 92px;');
            let f = 0;
            const barraCamada = new Camada((cr, w, h) => barra(cr, 0, h / 2 - 4, w, 8, f, cor(c)), '');
            barraCamada.actor.set_height(18);
            barraCamada.actor.x_expand = true;
            l.add_child(rotulo);
            l.add_child(barraCamada.actor);
            caixa.add_child(l);
            return () => {
                const p = progresso();
                f = p[chave];
                rotulo.text = `${nome} ${pct(f)}`;
                barraCamada.redesenhar();
            };
        });
        const atualizar = () => linhas.forEach(fn => fn());
        atualizar();
        this._item(menu, caixa);
        this._vivo(menu, 5000, atualizar, caixa);
    }
}

// ----- Cronômetro (estado fora da classe, como o pomodoro) -----
const CRONO = {inicio: 0, acumulado: 0, voltas: []};

const cronoMs = () => CRONO.acumulado + (CRONO.inicio ? agoraMs() - CRONO.inicio : 0);

class Cronometro extends Widget {
    static FONTES = [0.13, 0.27, 0.17];

    get intervalo() {
        return CRONO.inicio ? 250 : 2000; // parado não há o que animar
    }

    get etiqueta() {
        return `Cronômetro: ${formatarCrono(cronoMs())}`;
    }

    construir() {
        this._criarTexto();
        this._ocultar(this._topo);
        // o anel dá uma volta por minuto
        this._camada((cr, w, h) => anel(cr, w / 2, h / 2, Math.min(w, h) / 2 - 7, 5, (cronoMs() % 60000) / 60000,
            cor(CRONO.inicio ? COR.ok : COR.ambar)));
    }

    atualizar() {
        this._txt(this._topo, 'CRONÔMETRO');
        this._txt(this._meio, formatarCrono(cronoMs()));
        this._txt(this._base, CRONO.voltas.length ? `${CRONO.voltas.length} volta(s)` : (CRONO.inicio ? '' : '❚❚'));
        // rodando o anel anda a cada passo; parado só redesenha se algo mudou
        if (CRONO.inicio || this._mudou('crono', `${cronoMs()}|${CRONO.voltas.length}`))
            this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Cronômetro'));
        this._anelGrande(menu, {
            frac: () => (cronoMs() % 60000) / 60000, cor: () => (CRONO.inicio ? COR.ok : COR.ambar),
            texto: () => formatarCrono(cronoMs()), sub: () => (CRONO.inicio ? 'rodando' : 'parado'),
        });
        menu.addAction(CRONO.inicio ? 'Pausar' : 'Iniciar', () => {
            if (CRONO.inicio) {
                CRONO.acumulado = cronoMs();
                CRONO.inicio = 0;
            } else {
                CRONO.inicio = agoraMs();
            }
            this._acao();
        });
        menu.addAction('Volta', () => {
            CRONO.voltas.push(cronoMs());
            this._acao();
        });
        menu.addAction('Zerar', () => {
            CRONO.inicio = 0;
            CRONO.acumulado = 0;
            CRONO.voltas = [];
            this._acao();
        });
        CRONO.voltas.slice(-5).forEach((ms, i, ult) => {
            const n = CRONO.voltas.length - ult.length + i + 1;
            const anterior = n > 1 ? CRONO.voltas[n - 2] : 0;
            linha(menu, `Volta ${n}: ${formatarCrono(ms)} (+${formatarCrono(ms - anterior)})`);
        });
    }
}

// ----- Timer (contagem regressiva) -----
const duracaoTimer = () => (CFG?.get_int('timer-minutos') ?? 10) * MIN;
// `extra`: minutos somados com "+1 minuto", para o anel continuar proporcional.
const TIMER = {fim: 0, restante: 10 * MIN, intacto: true, extra: 0, pulsoAte: 0};

function timerRestante() {
    return TIMER.fim ? Math.max(0, TIMER.fim - agoraMs()) : TIMER.restante;
}

const timerFrac = () => (TIMER.intacto && !TIMER.fim ? 0 : 1 - timerRestante() / (duracaoTimer() + TIMER.extra));

function timerTick() {
    if (TIMER.fim && agoraMs() >= TIMER.fim) {
        TIMER.fim = 0;
        TIMER.extra = 0;
        TIMER.restante = duracaoTimer();
        TIMER.intacto = true;
        TIMER.pulsoAte = agoraMs() + 10000;
        Main.notify('ATLAS', 'O timer acabou.');
    }
}

class Timer extends Widget {
    static FONTES = [0.13, 0.28, 0.18];

    get intervalo() {
        return TIMER.fim ? 1000 : 4000;
    }

    logica() {
        timerTick();
    }

    get etiqueta() {
        return 'Timer';
    }

    construir() {
        this._criarTexto();
        this._ocultar(this._topo);
        this._anim = this._animado();
        this._camada((cr, w, h) => anel(cr, w / 2, h / 2, Math.min(w, h) / 2 - 7, 5, this._anim.atual, cor(COR.ambar)));
    }

    atualizar() {
        timerTick();
        if (TIMER.intacto && !TIMER.fim)
            TIMER.restante = duracaoTimer();
        this._txt(this._topo, 'TIMER');
        this._txt(this._meio, mmss(timerRestante()));
        this._txt(this._base, TIMER.fim ? '' : '❚❚');
        this._anim.definir(timerFrac());
        this._pulsar(agoraMs() < TIMER.pulsoAte);
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Timer'));
        this._anelGrande(menu, {
            frac: timerFrac, cor: () => COR.ambar, texto: () => mmss(timerRestante()),
            sub: () => (TIMER.fim ? 'contando' : 'parado'),
        });
        menu.addAction(TIMER.fim ? 'Pausar' : 'Iniciar', () => {
            if (TIMER.fim) {
                TIMER.restante = timerRestante();
                TIMER.fim = 0;
            } else {
                TIMER.fim = agoraMs() + TIMER.restante;
                TIMER.intacto = false;
                TIMER.pulsoAte = 0;
            }
            this._acao();
        });
        menu.addAction('+1 minuto', () => {
            if (TIMER.fim)
                TIMER.fim += MIN;
            else
                TIMER.restante += MIN;
            TIMER.extra += MIN;
            TIMER.intacto = false;
            this._acao();
        });
        menu.addAction('Reiniciar', () => {
            TIMER.fim = 0;
            TIMER.extra = 0;
            TIMER.restante = duracaoTimer();
            TIMER.intacto = true;
            TIMER.pulsoAte = 0;
            this._acao();
        });
    }
}

// ----- Atividade (CPU e memória, via /proc) -----
function lerProc(caminho) {
    try {
        const [ok, bytes] = GLib.file_get_contents(caminho);
        return ok ? new TextDecoder().decode(bytes) : '';
    } catch (_e) {
        return '';
    }
}

const empilhar = (lista, v, max = 60) => {
    lista.push(v);
    if (lista.length > max)
        lista.shift();
};

// Amostras compartilhadas: o gráfico não zera quando a doca é reconstruída nem quando há uma doca por tela.
const ATIV = {cpu: [], mem: [], ant: null, ultimo: 0};

function ativAmostrar() {
    const agora = agoraMs();
    if (ATIV.ultimo && agora - ATIV.ultimo < 1500)
        return;
    ATIV.ultimo = agora;
    const n = lerProc('/proc/stat').split('\n')[0].trim().split(/\s+/).slice(1, 9).map(Number);
    const atual = n.length >= 4 ? {total: n.reduce((a, b) => a + b, 0), ocioso: n[3] + (n[4] || 0)} : null;
    const cpu = percentualCpu(ATIV.ant, atual);
    if (atual)
        ATIV.ant = atual;
    const txt = lerProc('/proc/meminfo');
    const total = Number(/MemTotal:\s+(\d+)/.exec(txt)?.[1]);
    const livre = Number(/MemAvailable:\s+(\d+)/.exec(txt)?.[1]);
    if (cpu !== null)
        empilhar(ATIV.cpu, cpu);
    if (total)
        empilhar(ATIV.mem, Math.round((1 - livre / total) * 100));
}

const ultimo = (lista, padrao = 0) => (lista.length ? lista[lista.length - 1] : padrao);

class Atividade extends Widget {
    static FONTES = [0.13, 0.27, 0.17];
    static LARGURA = 2.2;

    get intervalo() {
        return 2000;
    }

    logica() {
        ativAmostrar();
    }

    get etiqueta() {
        return `CPU ${ultimo(ATIV.cpu)}%, memória ${ultimo(ATIV.mem)}%`;
    }

    construir() {
        this._criarTexto();
        this._camada((cr, w, h) => {
            const lado = Math.min(h, this._tam);
            const cx = lado / 2;
            const cy = h / 2;
            const r = lado / 2 - 6;
            anel(cr, cx, cy, r, 5, ultimo(ATIV.cpu) / 100, cor(COR.ambar));
            anel(cr, cx, cy, r - 8, 4, ultimo(ATIV.mem) / 100, cor(COR.azul));
            if (this._largo) {
                grafico(cr, lado + 6, 12, w - lado - 18, h - 24, [
                    {valores: ATIV.mem, cor: cor(COR.azul, 0.9)},
                    {valores: ATIV.cpu, cor: cor(COR.ambar), preencher: true},
                ]);
            }
        });
        if (this._largo)
            this._textoNoQuadrado();
        else
            this._ocultar(this._base); // no quadrado, o RAM já está no anel de dentro e no tooltip
        this._ocultar(this._topo);
    }

    atualizar() {
        this._txt(this._meio, `${ultimo(ATIV.cpu)}%`);
        this._txt(this._base, `RAM ${ultimo(ATIV.mem)}%`);
        // no quadrado só os anéis mudam com os valores; no largo o gráfico anda a cada amostra
        if (this._largo || this._mudou('v', `${ultimo(ATIV.cpu)}|${ultimo(ATIV.mem)}`))
            this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Atividade'));
        const l = this._textoPainel('', 13);
        const grade = new Camada((cr, w, h) => {
            cr.setSourceRGBA(0.5, 0.5, 0.5, 0.12);
            cr.rectangle(0, 0, w, h);
            cr.fill();
            grafico(cr, 4, 6, w - 8, h - 12, [
                {valores: ATIV.mem, cor: cor(COR.azul, 0.9)},
                {valores: ATIV.cpu, cor: cor(COR.ambar), preencher: true},
            ]);
        }, '');
        grade.actor.set_size(244, 92);
        const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 6px;'});
        caixa.add_child(grade.actor);
        caixa.add_child(l);
        const atualizar = () => {
            ativAmostrar();
            l.text = `CPU ${ultimo(ATIV.cpu)}%  ·  Memória ${ultimo(ATIV.mem)}%`;
            grade.redesenhar();
        };
        atualizar();
        this._item(menu, caixa);
        this._vivo(menu, 2000, atualizar, caixa);
    }
}

// ----- Rede (bytes por segundo, via /proc/net/dev) -----
function formatarBps(bps) {
    return `${formatarTaxa(bps)}/s`;
}

const REDE = {down: [], up: [], ant: null, ultimo: 0};

function redeAmostrar() {
    const t = agoraMs();
    if (REDE.ultimo && t - REDE.ultimo < 800)
        return;
    REDE.ultimo = t;
    let rx = 0;
    let tx = 0;
    for (const l of lerProc('/proc/net/dev').split('\n').slice(2)) {
        const [nome, resto] = l.split(':');
        if (!resto || nome.trim() === 'lo')
            continue;
        const c = resto.trim().split(/\s+/).map(Number);
        rx += c[0] || 0;
        tx += c[8] || 0;
    }
    if (REDE.ant) {
        const dt = Math.max(0.001, (t - REDE.ant.t) / 1000);
        empilhar(REDE.down, Math.max(0, (rx - REDE.ant.rx) / dt));
        empilhar(REDE.up, Math.max(0, (tx - REDE.ant.tx) / dt));
    }
    REDE.ant = {rx, tx, t};
}

class Rede extends Widget {
    static FONTES = [0.22, 0.22, 0.12];
    static LARGURA = 2.2;

    get intervalo() {
        return 1000;
    }

    logica() {
        redeAmostrar();
    }

    get etiqueta() {
        return `Rede: ↓ ${formatarBps(ultimo(REDE.down))}, ↑ ${formatarBps(ultimo(REDE.up))}`;
    }

    construir() {
        this._criarTexto();
        this._camada((cr, w, h) => {
            const x0 = this._largo ? this._tam + 2 : 6;
            const topo = this._largo ? 10 : h * 0.5;
            const max = escalaGrafico([REDE.down, REDE.up], 10240);
            grafico(cr, x0, topo, w - x0 - 8, h - topo - 8, [
                {valores: REDE.down, cor: cor(COR.ok), preencher: true},
                {valores: REDE.up, cor: cor(COR.ambar)},
            ], {max});
        });
        this._texto.y_align = AL.START;
        this._topo.style += ` color: ${COR.ok};`;
        this._meio.style += ` color: ${COR.ambar};`;
        this._ocultar(this._base);
        if (this._largo)
            this._textoNoQuadrado();
    }

    atualizar() {
        this._txt(this._topo, `↓${formatarTaxa(ultimo(REDE.down))}`);
        this._txt(this._meio, `↑${formatarTaxa(ultimo(REDE.up))}`);
        // com o histórico cheio e a taxa igual, o gráfico não muda
        if (this._mudou('r', `${ultimo(REDE.down)}|${ultimo(REDE.up)}`) || REDE.down.length < 60)
            this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Rede'));
        const l = this._textoPainel('', 13);
        const grade = new Camada((cr, w, h) => {
            cr.setSourceRGBA(0.5, 0.5, 0.5, 0.12);
            cr.rectangle(0, 0, w, h);
            cr.fill();
            grafico(cr, 4, 6, w - 8, h - 12, [
                {valores: REDE.down, cor: cor(COR.ok), preencher: true},
                {valores: REDE.up, cor: cor(COR.ambar)},
            ], {max: escalaGrafico([REDE.down, REDE.up], 10240)});
        }, '');
        grade.actor.set_size(244, 92);
        const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 6px;'});
        caixa.add_child(grade.actor);
        caixa.add_child(l);
        const atualizar = () => {
            redeAmostrar();
            l.text = `↓ ${formatarBps(ultimo(REDE.down))}  ·  ↑ ${formatarBps(ultimo(REDE.up))}`;
            grade.redesenhar();
        };
        atualizar();
        this._item(menu, caixa);
        this._vivo(menu, 1000, atualizar, caixa);
    }
}

// ----- Contagem regressiva -----
class Contagem extends Widget {
    static FONTES = [0.17, 0.3, 0.17];

    get intervalo() {
        return 60000;
    }

    _dias() {
        const d = GLib.DateTime.new_now_local();
        return diasAte({ano: d.get_year(), mes: d.get_month(), dia: d.get_day_of_month()}, CFG?.get_string('contagem-data'));
    }

    _nome() {
        return (CFG?.get_string('contagem-nome') ?? '').trim();
    }

    get etiqueta() {
        const n = this._dias();
        if (n === null)
            return 'Contagem regressiva: defina a data nas preferências';
        const nome = this._nome() || 'Contagem';
        return n === 0 ? `${nome}: hoje` : n > 0 ? `${nome}: faltam ${n} dia(s)` : `${nome}: há ${-n} dia(s)`;
    }

    atualizar() {
        const n = this._dias();
        this._txt(this._topo, (this._nome() || 'CONTAGEM').toUpperCase());
        if (n === null) {
            this._txt(this._meio, '--');
            this._txt(this._base, 'defina a data');
            return;
        }
        this._txt(this._meio, n === 0 ? 'HOJE' : String(Math.abs(n)));
        this._txt(this._base, n === 0 ? '' : n > 0 ? (n === 1 ? 'dia' : 'dias') : 'dias atrás');
        this.actor.style = n === 0 ? 'border-color: #e8a93a;' : '';
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Contagem regressiva'));
        linha(menu, this.etiqueta);
        const data = CFG?.get_string('contagem-data');
        if (data)
            linha(menu, `Data: ${data}`);
        linha(menu, 'Nome e data ficam nas preferências (Widgets)');
    }
}

// ----- Nota -----
class Nota extends Widget {
    static FONTES = [0.17, 0.2, 0.1];

    constructor(tam) {
        super(tam);
        this._ocultar(this._topo, this._base);
        this._meio.clutter_text.line_wrap = true;
        this._meio.clutter_text.ellipsize = Pango.EllipsizeMode.END;
    }

    get etiqueta() {
        return CFG?.get_string('nota-texto')?.trim() || 'Nota (clique para escrever)';
    }

    atualizar() {
        const t = CFG?.get_string('nota-texto')?.trim() ?? '';
        this._txt(this._topo, 'NOTA');
        this._txt(this._meio, t || '...');
        this._txt(this._base, '');
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Nota'));
        const item = new PopupMenu.PopupBaseMenuItem({activate: false});
        const entry = new St.Entry({
            text: CFG?.get_string('nota-texto') ?? '',
            hint_text: 'Escreva e tecle Enter',
            x_expand: true,
            width: 260,
        });
        const salvar = () => {
            CFG?.set_string('nota-texto', entry.text);
            menu.close();
        };
        entry.clutter_text.connect('activate', salvar);
        item.add_child(entry);
        menu.addMenuItem(item);
        menu.addAction('Limpar nota', () => CFG?.set_string('nota-texto', ''));
        // o foco no campo só vale depois do menu abrir
        menu.connect('open-state-changed', (_m, aberto) => {
            if (aberto)
                entry.grab_key_focus();
        });
    }
}

// ----- Área de transferência -----
// O histórico fica só na memória e é perdido ao desligar a extensão; só os fixados vão para o GSettings.
// O monitor é um serviço do módulo (os widgets são recriados a cada reconstrução da doca) e para sozinho
// quando nenhum widget o usa, para não registrar o que você copia sem ninguém ver.
const CLIP = {historico: [], sel: null, selId: 0, usos: 0, paradaId: 0, ouvintes: new Set()};

function clipLer() {
    const clip = St.Clipboard.get_default();
    // gerenciadores de senha marcam o conteúdo como sensível; esse não entra
    let tipos = [];
    try {
        tipos = clip.get_mimetypes(St.ClipboardType.CLIPBOARD);
    } catch (_e) { /* sem tipos: segue */ }
    if (tipos.includes('x-kde-passwordManagerHint'))
        return;
    clip.get_text(St.ClipboardType.CLIPBOARD, (_c, texto) => {
        const fixados = CFG?.get_strv('clipboard-fixados') ?? [];
        if (typeof texto !== 'string' || fixados.includes(texto))
            return;
        const novo = registrarCopia(CLIP.historico, texto);
        if (novo === CLIP.historico)
            return;
        CLIP.historico = novo;
        for (const f of CLIP.ouvintes)
            f();
    });
}

function clipIniciar() {
    if (CLIP.paradaId) {
        GLib.source_remove(CLIP.paradaId);
        CLIP.paradaId = 0;
    }
    CLIP.usos++;
    if (CLIP.selId)
        return;
    CLIP.sel = global.display.get_selection();
    CLIP.selId = CLIP.sel.connect('owner-changed', (_s, tipo) => {
        if (tipo === Meta.SelectionType.SELECTION_CLIPBOARD)
            clipLer();
    });
    clipLer();
}

function clipSoltar() {
    CLIP.usos = Math.max(0, CLIP.usos - 1);
    if (CLIP.usos > 0 || CLIP.paradaId)
        return;
    // espera um pouco: a doca destrói e recria os widgets a cada reconstrução
    CLIP.paradaId = agendar('clipboard-parada', 2000, () => {
        CLIP.paradaId = 0;
        pararClipboard();
        return GLib.SOURCE_REMOVE;
    });
}

// Desliga o monitor e apaga o histórico (chamado ao desativar a extensão).
export function pararClipboard() {
    if (CLIP.paradaId) {
        GLib.source_remove(CLIP.paradaId);
        CLIP.paradaId = 0;
    }
    if (CLIP.sel && CLIP.selId)
        CLIP.sel.disconnect(CLIP.selId);
    CLIP.sel = null;
    CLIP.selId = 0;
    CLIP.usos = 0;
    CLIP.historico = [];
    CLIP.ouvintes.clear();
}

class AreaTransferencia extends Widget {
    static FONTES = [0.15, 0.15, 0.26];

    // Ícone de colar com a quantidade de itens embaixo; o conteúdo fica no painel e no tooltip.
    construir() {
        this._criarTexto();
        this._ocultar(this._topo, this._meio);
        this._icone = new St.Icon({
            icon_name: 'edit-paste-symbolic', icon_size: Math.round(this._tam * 0.4), style_class: 'atlas-widget-txt',
            x_align: AL.CENTER, y_align: AL.START, style: `margin-top: ${Math.round(this._tam * 0.1)}px;`,
        });
        this.actor.insert_child_below(this._icone, this._texto);
        this._texto.y_align = AL.END;
    }

    iniciar() {
        this._ouvinte = () => this._atualizarSeVisivel();
        CLIP.ouvintes.add(this._ouvinte);
        clipIniciar();
        super.iniciar();
    }

    parar() {
        CLIP.ouvintes.delete(this._ouvinte);
        clipSoltar();
    }

    _fixados() {
        return CFG?.get_strv('clipboard-fixados') ?? [];
    }

    get etiqueta() {
        const ultimo = CLIP.historico[0] ?? this._fixados()[0];
        return ultimo ? `Área de transferência: ${resumirTexto(ultimo, 40)}` : 'Área de transferência';
    }

    atualizar() {
        this._txt(this._base, String(CLIP.historico.length + this._fixados().length));
    }

    _copiar(texto) {
        St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, texto);
    }

    // Linha do painel: o texto (clique copia de volta) e uma estrela para fixar ou desafixar.
    _linha(menu, texto, fixado) {
        const item = new PopupMenu.PopupBaseMenuItem();
        item.add_child(new St.Label({text: resumirTexto(texto, 44) || '(só espaços)', x_expand: true, y_align: Clutter.ActorAlign.CENTER}));
        const estrela = new St.Button({
            style_class: 'button',
            child: new St.Icon({icon_name: fixado ? 'starred-symbolic' : 'non-starred-symbolic', icon_size: 14}),
            can_focus: true,
        });
        estrela.connect('clicked', () => {
            const fixados = this._fixados().filter(t => t !== texto);
            if (!fixado)
                fixados.unshift(texto);
            CFG?.set_strv('clipboard-fixados', fixados);
            if (!fixado)
                CLIP.historico = CLIP.historico.filter(t => t !== texto);
            else
                CLIP.historico = registrarCopia(CLIP.historico, texto);
            this.atualizar();
            menu.close();
        });
        item.add_child(estrela);
        item.connect('activate', () => this._copiar(texto));
        menu.addMenuItem(item);
    }

    fillMenu(menu) {
        const fixados = this._fixados();
        if (fixados.length) {
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Fixados'));
            for (const t of fixados)
                this._linha(menu, t, true);
        }
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Recentes'));
        if (!CLIP.historico.length)
            linha(menu, 'Nada copiado ainda');
        for (const t of CLIP.historico.slice(0, 10))
            this._linha(menu, t, false);
        if (CLIP.historico.length) {
            menu.addAction('Limpar histórico', () => {
                CLIP.historico = [];
                this.atualizar();
            });
        }
    }
}

// ----- Slack: ícone com selo quando há mensagens não lidas -----
// O Slack publica um item de bandeja (StatusNotifierItem) cujo tooltip diz "Nenhuma mensagem não lida" ou o
// que está pendente. É o mesmo sinal do ícone da barra superior, lido direto pelo D-Bus. Funciona com qualquer
// app que use a bandeja; aqui o filtro é o Id do item começar com "Slack".
const SNI = 'org.freedesktop.StatusNotifierItem-';

class Slack extends Widget {
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
    _ler() {
        if (this._lendo || this._destruido)
            return;
        this._lendo = true;
        const bus = Gio.DBus.session;
        bus.call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus', 'ListNames', null,
            new GLib.VariantType('(as)'), Gio.DBusCallFlags.NONE, 1000, null, (conn, res) => {
                let nomes = [];
                try {
                    [nomes] = conn.call_finish(res).deepUnpack();
                } catch (_e) { /* sem lista: tratado abaixo */ }
                const itens = nomes.filter(n => n.startsWith(SNI));
                const resultados = [];
                let faltam = itens.length;
                const fim = () => {
                    this._lendo = false;
                    if (this._destruido)
                        return;
                    this._aplicar(resultados.filter(Boolean));
                };
                if (!faltam) {
                    fim();
                    return;
                }
                for (const nome of itens) {
                    bus.call(nome, '/StatusNotifierItem', 'org.freedesktop.DBus.Properties', 'GetAll',
                        new GLib.Variant('(s)', ['org.kde.StatusNotifierItem']), new GLib.VariantType('(a{sv})'),
                        Gio.DBusCallFlags.NONE, 1000, null, (c, r) => {
                            try {
                                const [p] = c.call_finish(r).recursiveUnpack();
                                if (String(p.Id ?? '').toLowerCase().startsWith('slack'))
                                    resultados.push({texto: String(p.ToolTip?.[2] ?? ''), status: p.Status});
                            } catch (_e) { /* o item pode ter saído */ }
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

// ----- Clima (Open-Meteo, sem conta nem chave) -----
// A previsão é um serviço do módulo clima.js, dividido com os mascotes de frio e calor.
const climaLocal = () => localDoClima(CFG);
const climaBuscar = (forcar = false) => buscarClima(CFG, forcar);

// Faixa de temperaturas com folga, para o gráfico (que vai de 0 a max) não colar nas bordas.
function faixaTemp(temps) {
    const lo = Math.floor(Math.min(...temps)) - 2;
    return {lo, max: Math.max(1, Math.ceil(Math.max(...temps)) + 2 - lo)};
}

class Clima extends Widget {
    static FONTES = [0.13, 0.26, 0.13];
    static LARGURA = 2.2;

    get intervalo() {
        return 60000;
    }

    logica() {
        climaBuscar();
    }

    get etiqueta() {
        const local = climaLocal();
        const d = CLIMA.dados;
        if (!local)
            return 'Clima: escolha a cidade nas preferências (Widgets)';
        if (!d)
            return `Clima em ${this._cidade()}: ${CLIMA.erro ? 'sem conexão, tentando de novo' : 'buscando'}`;
        return `${this._cidade()}: ${formatarTemp(d.temp)}, ${descreverTempo(d.codigo).texto.toLowerCase()}`;
    }

    _cidade() {
        return climaLocal()?.nome.split(',')[0] ?? '';
    }

    construir() {
        this._criarTexto();
        this._camada((cr, w, h, fg) => {
            const d = CLIMA.dados;
            const icone = d ? descreverTempo(d.codigo).icone : 'nublado';
            if (this._largo)
                iconeTempo(cr, h / 2 + 2, h / 2, h * 0.78, icone, fg, d?.dia ?? true);
            else
                iconeTempo(cr, w / 2, h * 0.38, h * 0.58, icone, fg, d?.dia ?? true);
        });
        if (this._largo) {
            this._texto.set_width(this._larg - this._tam);
            this._texto.x_align = AL.END;
        } else {
            this._ocultar(this._topo, this._base);
            this._texto.y_align = AL.END;
            this._texto.style = 'padding-bottom: 3px;';
        }
        this._ouvinte = () => this._atualizarSeVisivel();
        CLIMA.ouvintes.add(this._ouvinte);
        this._sinal = CFG?.connect('changed::clima-cidade', () => {
            climaBuscar();
            this.atualizar();
        });
    }

    atualizar() {
        const d = CLIMA.dados;
        this._txt(this._meio, d ? formatarTemp(d.temp) : '--');
        const hoje = d?.dias[0];
        this._txt(this._topo, d ? descreverTempo(d.codigo).texto : (climaLocal() ? '' : 'CLIMA'));
        this._txt(this._base, hoje ? `↑${formatarTemp(hoje.max)} ↓${formatarTemp(hoje.min)}` : (climaLocal() ? '' : 'defina a cidade'));
        if (this._mudou('c', d ? `${d.codigo}|${d.dia}` : ''))
            this._redesenhar();
    }

    parar() {
        CLIMA.ouvintes.delete(this._ouvinte);
        if (this._sinal)
            CFG?.disconnect(this._sinal);
        this._sinal = 0;
    }

    fillMenu(menu) {
        const local = climaLocal();
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(local ? `Clima · ${this._cidade()}` : 'Clima'));
        const d = CLIMA.dados;
        if (!d) {
            linha(menu, this.etiqueta);
            if (local) {
                const de = new PopupMenu.PopupMenuItem('Tentar agora');
                de.connect('activate', () => climaBuscar(true));
                menu.addMenuItem(de);
            }
            return;
        }
        const tempo = descreverTempo(d.codigo);

        // agora: ícone grande, temperatura e detalhes
        const topo = new St.BoxLayout({style: 'spacing: 12px; min-width: 244px;'});
        const icone = new Camada((cr, w, h) => iconeTempo(cr, w / 2, h / 2, w, tempo.icone, FG_MENU, d.dia), '');
        icone.actor.set_size(64, 64);
        icone.actor.x_expand = icone.actor.y_expand = false;
        const col = new St.BoxLayout({vertical: true, y_align: AL.CENTER});
        col.add_child(this._textoPainel(formatarTemp(d.temp), 28, 'font-weight: bold;'));
        col.add_child(this._textoPainel(tempo.texto, 13));
        topo.add_child(icone.actor);
        topo.add_child(col);
        this._item(menu, topo);
        const det = [
            d.sensacao !== null && `Sensação ${formatarTemp(d.sensacao)}`,
            d.umidade !== null && `Umidade ${d.umidade}%`,
            d.vento !== null && `Vento ${Math.round(d.vento)} km/h`,
        ].filter(Boolean).join('  ·  ');
        if (det)
            this._item(menu, this._textoPainel(det, 12, 'opacity: 0.85;'));

        // próximas horas: temperatura (âmbar) e chance de chuva (azul, de 0 a 100%)
        if (d.horas.length > 1) {
            const temps = d.horas.map(h => h.temp);
            const {lo, max} = faixaTemp(temps);
            const chuva = d.horas.map(h => h.chuva ?? 0);
            const graf = new Camada((cr, w, h) => {
                cr.setSourceRGBA(0.5, 0.5, 0.5, 0.12);
                cr.rectangle(0, 0, w, h);
                cr.fill();
                if (chuva.some(v => v > 0))
                    grafico(cr, 4, 6, w - 8, h - 12, [{valores: chuva, cor: cor(COR.azul, 0.8), preencher: true}], {pontos: chuva.length});
                grafico(cr, 4, 6, w - 8, h - 12, [{valores: temps.map(t => t - lo), cor: cor(COR.ambar)}], {max, pontos: temps.length});
            }, '');
            graf.actor.set_size(244, 70);
            const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 4px;'});
            caixa.add_child(graf.actor);
            const maxChuva = Math.max(...chuva);
            caixa.add_child(this._textoPainel(`Próximas ${d.horas.length} h: ${formatarTemp(Math.min(...temps))} a ${formatarTemp(Math.max(...temps))}` +
                (maxChuva > 0 ? `, chuva até ${maxChuva}%` : ''), 12, 'opacity: 0.85;'));
            this._item(menu, caixa);
        }

        // próximos dias
        if (d.dias.length) {
            const grade = new St.Widget({layout_manager: new Clutter.GridLayout({column_spacing: 10, row_spacing: 2})});
            const lm = grade.layout_manager;
            const hoje = d.hora.slice(0, 10);
            d.dias.forEach((dia, r) => {
                const t = descreverTempo(dia.codigo);
                const ic = new Camada((cr, w, h) => iconeTempo(cr, w / 2, h / 2, w, t.icone, FG_MENU, true), '');
                ic.actor.set_size(24, 24);
                ic.actor.x_expand = ic.actor.y_expand = false;
                lm.attach(this._textoPainel(diaCurto(dia.data, hoje), 13, 'min-width: 40px;'), 0, r, 1, 1);
                lm.attach(ic.actor, 1, r, 1, 1);
                lm.attach(this._textoPainel(`${formatarTemp(dia.max)} / ${formatarTemp(dia.min)}`, 13, 'min-width: 76px;'), 2, r, 1, 1);
                lm.attach(this._textoPainel(dia.chuva ? `${dia.chuva}%` : '', 12, `color: ${COR.azul};`), 3, r, 1, 1);
            });
            this._item(menu, grade);
        }
        linha(menu, `Atualizado às ${d.hora.slice(11, 16)}${CLIMA.erro ? ' (sem conexão agora)' : ''} · Open-Meteo`);
    }
}

const CLASSES = {
    relogio: Relogio, pomodoro: Pomodoro, bateria: Bateria, musica: Musica,
    progresso: Progresso, cronometro: Cronometro, timer: Timer, atividade: Atividade, rede: Rede,
    contagem: Contagem, nota: Nota, clipboard: AreaTransferencia, slack: Slack, clima: Clima,
};

// Cria e inicia o widget `id` num tile de `tam` px (`largo`: versão larga, se o widget tiver); null se não existe.
export function criarWidget(id, tam, settings, largo = false) {
    CFG = settings;
    const Classe = CLASSES[id];
    if (!Classe)
        return null;
    const w = new Classe(tam, largo);
    w.iniciar();
    return w;
}
