// Base dos widgets: a classe Widget (tile em camadas, ciclo de vida, painel) e o que as subclasses dividem.
//
// Um tile é um St.Widget em camadas: uma Camada de desenho (Cairo) por baixo e três linhas de texto (topo, meio, base)
// por cima. Os que têm mais a mostrar ganham uma versão larga (static LARGURA).
// Ciclo de vida: construir() -> iniciar() -> atualizar() a cada `intervalo` ms -> destruir().
// O estado que precisa sobreviver à reconstrução da doca (pomodoro, histórico de CPU...) fica fora da classe.

// GSettings da extensão, passado por criarWidget; as opções dos widgets são lidas a cada uso.
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {anel, cor} from '../nucleo/desenho.js';
import {agendar, agora, registrar} from '../nucleo/perf.js';

export let CFG = null;
export const definirCfg = settings => {
    CFG = settings;
};

export const COR = {foco: '#e0654f', ok: '#3fb8a8', azul: '#4a90d9', ambar: '#e8a93a', erro: '#e24b4a'};

export const agoraMs = () => GLib.get_monotonic_time() / 1000;

export const AL = Clutter.ActorAlign;

export function linha(menu, texto) {
    const mi = new PopupMenu.PopupMenuItem(texto, {reactive: false, can_focus: false});
    menu.addMenuItem(mi);
    return mi;
}

// Área de desenho com Cairo. `desenhar(cr, largura, altura, [r, g, b])` recebe a cor do texto do tema.
// Sem classe de estilo (nos painéis do menu) herda a cor do próprio menu.
// Texto dos menus do Shell, que são sempre escuros. Nos painéis a cor é fixa: buscar o nó de tema de um actor
// dentro do menu, no meio da destruição dele, enche o log de avisos do GJS.
export const FG_MENU = [0.95, 0.95, 0.97];

export class Camada {
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

export class Widget {
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

// ----- Pomodoro -----
// Fica fora da classe: a doca é reconstruída com frequência e o contador não pode zerar.
export const MIN = 60 * 1000;
