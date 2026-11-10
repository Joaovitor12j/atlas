// ATLAS: dock com lente de ampliação para GNOME Shell (Wayland/X11).
// Mutter não aceita layer-shell, então o dock é um actor "chrome" desenhado pelo próprio Shell.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Pango from 'gi://Pango';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {appsDoAmbiente, decidirDnd, deveAvisarDnd, escolherAmbiente, normalizarAmbientes} from '../ambientes/logica.js';
import {pararClima} from '../clima/servico.js';
import {Mascotes} from '../mascotes/index.js';
import {agendar, perfilar} from '../nucleo/perf.js';
import {pararPonte} from '../nucleo/ponte.js';
import {TEMAS} from '../temas/catalogo.js';
import {desenharDoca, fracaoIcone} from '../temas/decoracao/index.js';
import {desenharIndicador} from '../temas/decoracao/indicador.js';
import {desenharTile} from '../temas/decoracao/tile.js';
import {geometriaTema, temaEfetivo} from '../temas/logica.js';
import {WIDGETS} from '../widgets/catalogo.js';
import {criarWidget, pararWidgets} from '../widgets/index.js';
import {escalaLente} from './lente.js';
import {definirAutoTodas, ordemTelas, resolverTelas, todasAuto} from './telas.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.atlas';

const THUMB_W = 200;   // miniatura da prévia de janela
const THUMB_H = 125;

// ----- Ambientes: apps, tema, widgets e coleções, guardados como JSON no GSettings -----
// [{id, nome, cor, apps: [ids .desktop], tema?: id, widgets?: [ids], colecoes?: [{id, nome, apps}]}]
function lerAmbientes(st) {
    return normalizarAmbientes(st?.get_string('ambientes'));
}

function ambienteAtual(st, lista) {
    return escolherAmbiente(lista, st?.get_string('ambiente-atual'));
}

function trocarAmbiente(st, delta) {
    const lista = lerAmbientes(st);
    if (lista.length < 2)
        return;
    const i = lista.indexOf(ambienteAtual(st, lista));
    selecionarAmbiente(st, lista[(i + delta + lista.length) % lista.length]);
}

function selecionarAmbiente(st, amb) {
    st.set_string('ambiente-atual', amb.id);
    try {
        Main.osdWindowManager.show(-1, new Gio.ThemedIcon({name: 'view-grid-symbolic'}), amb.nome, null);
    } catch (_e) { /* OSD é só um aviso */ }
}

// Ctrl+Alt+N: vai direto ao N-ésimo ambiente (1 = primeiro da lista).
function irParaAmbiente(st, n) {
    const lista = lerAmbientes(st);
    const amb = lista[n - 1];
    if (amb && amb.id !== ambienteAtual(st, lista)?.id)
        selecionarAmbiente(st, amb);
}

// Conteúdo do menu do ATLAS, usado no ícone do painel e no clique direito na doca.
function preencherMenu(menu, st, abrirPrefs, ocultarIcone) {
    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('ATLAS'));

    const lista = lerAmbientes(st);
    if (lista.length) {
        const atual = ambienteAtual(st, lista);
        for (const amb of lista) {
            const mi = new PopupMenu.PopupMenuItem(`Ambiente: ${amb.nome}`);
            mi.setOrnament(amb.id === atual?.id ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
            mi.connect('activate', () => st.set_string('ambiente-atual', amb.id));
            menu.addMenuItem(mi);
        }
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    const tema = st.get_string('tema');
    for (const [id, nome] of TEMAS) {
        const mi = new PopupMenu.PopupMenuItem(`Tema ${nome}`);
        mi.setOrnament(id === tema ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
        mi.connect('activate', () => st.set_string('tema', id));
        menu.addMenuItem(mi);
    }

    // vale para todas as telas que têm doca; o ajuste por tela fica nas configurações
    const auto = new PopupMenu.PopupSwitchMenuItem('Auto-ocultar', todasAuto(st.get_string('telas')));
    auto.connect('toggled', (_i, estado) => st.set_string('telas', definirAutoTodas(st.get_string('telas'), estado)));
    menu.addMenuItem(auto);

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    menu.addAction('Configurações', abrirPrefs);
    if (ocultarIcone)
        menu.addAction('Ocultar este ícone', () => st.set_boolean('mostrar-icone-painel', false));
}

// Valores que não têm opção na janela de preferências (ainda).
const FIXED = {
    gap: 8,             // espaço entre ícones
    padH: 14,           // margem do vidro ao longo da doca
    padV: 10,           // margem do vidro no sentido transversal
    dotArea: 8,         // faixa entre o ícone e a borda da tela para o indicador de app aberto
    sepWidth: 14,       // espaço do separador favoritos | abertos
    smoothing: 0.35,    // 0..1, fração do caminho percorrida por quadro
    frameMs: 16,
};

// Ponto de ancoragem (pivô) da ampliação: o ícone cresce a partir da borda da tela.
const PIVOT = {baixo: [0, 1], esquerda: [0, 0], direita: [1, 0]};

// Estado das telas: `lista` por posição (esquerda para a direita), `porIndice` por índice do monitor no Shell e
// `ativos` com os índices que têm doca.
function telasDoShell(st) {
    const mons = Main.layoutManager.monitors;
    const ordem = ordemTelas(mons);
    const lista = resolverTelas({
        texto: st?.get_string('telas') ?? '',
        legado: st?.get_string('monitores') ?? 'principal',
        autoGlobal: st?.get_boolean('auto-ocultar') ?? false,
        n: mons.length,
        principal: ordem.indexOf(Main.layoutManager.primaryIndex),
    });
    const porIndice = new Map();
    ordem.forEach((idx, pos) => porIndice.set(idx, lista[pos]));
    return {lista, porIndice, ativos: ordem.filter(idx => porIndice.get(idx).ativa)};
}

// Uma doca em um monitor. O gerenciador `Dock` (no fim do arquivo) cria uma por tela.
class DockView {
    constructor(settings, monIdx, abrirPrefs) {
        this._settings = settings;
        this._abrirPrefs = abrirPrefs;
        this._monIdx = monIdx;
    }

    enable() {
        this._items = [];
        this._signals = [];
        this._tickId = 0;
        this._rebuildId = 0;

        this._hidden = false;
        this._hideId = 0;
        this._previewShowId = 0;
        this._previewHideId = 0;
        this._readConfig();
        this._tooltip = new St.Label({style_class: 'atlas-tooltip', visible: false});
        Main.layoutManager.addTopChrome(this._tooltip);

        this._preview = new St.BoxLayout({style_class: 'atlas-preview', visible: false, reactive: true, track_hover: true});
        this._preview.connect('notify::hover', () => {
            if (this._preview.hover)
                this._clearPreviewTimers();
            else
                this._schedulePreviewHide();
        });
        Main.layoutManager.addTopChrome(this._preview);

        this._container = new St.Widget({reactive: false});
        this._bg = new St.Widget({style_class: 'atlas-bg', reactive: true, track_hover: true});
        this._container.add_child(this._bg);
        // material dos temas de pacote (madeira, papel, neve...), desenhado em Cairo por cima do vidro
        this._deco = new St.DrawingArea({reactive: false});
        this._deco.connect('repaint', a => this._pintarDeco(a));
        this._container.add_child(this._deco);
        this._decoCaixa = '';
        this._hookScroll(this._bg);
        this._bg.connect('button-press-event', (_a, event) => {
            if (event.get_button() !== Clutter.BUTTON_SECONDARY)
                return Clutter.EVENT_PROPAGATE;
            this._openDockMenu(this._bg);
            return Clutter.EVENT_STOP;
        });
        Main.layoutManager.addChrome(this._container, {
            affectsStruts: false,
            trackFullscreen: true,
        });

        // Faixa transparente que reserva espaço (strut) para as janelas maximizadas não ficarem sob a doca.
        this._strut = new St.Widget({reactive: false});
        this._strutAtivo = false;

        // Zona fina na borda da tela que traz a doca de volta no modo auto-ocultar.
        this._hot = new St.Widget({reactive: true, visible: false});
        Main.layoutManager.addChrome(this._hot, {affectsStruts: false, trackFullscreen: true});
        this._hot.connect('enter-event', () => {
            this._setHidden(false);
            return Clutter.EVENT_PROPAGATE;
        });

        this._container.connect('captured-event', (_actor, event) => {
            const t = event.type();
            if (t === Clutter.EventType.MOTION || t === Clutter.EventType.ENTER) {
                this._cancelHide();
                if (this._hidden)
                    this._setHidden(false);
                this._startTick();
            } else if (t === Clutter.EventType.LEAVE) {
                this._scheduleHide();
            }
            return Clutter.EVENT_PROPAGATE;
        });

        const apps = Shell.AppSystem.get_default();
        const favs = AppFavorites.getAppFavorites();
        this._connect(apps, 'app-state-changed', () => this._queueRebuild());
        this._connect(apps, 'installed-changed', () => this._queueRebuild());
        this._connect(favs, 'changed', () => this._queueRebuild());
        this._connect(Main.overview, 'showing', () => {
            if (!this._c.noOverview) {
                this._container.hide();
                this._tooltip.hide();
            }
        });
        this._connect(Main.overview, 'hiding', () => this._container.show());
        this._connect(global.display, 'window-created', () => this._queueRebuild());

        if (this._settings) {
            this._connect(this._settings, 'changed', (_s, key) => {
                // os mascotes têm o próprio motor; mexer neles não reconstrói a doca
                if (key === 'monitores' || key === 'mascotes-ativos' || key === 'mascote-teste' ||
                    key === 'mascote-residente-ativo' || key === 'efeito-epoca-ativo' ||
                    /^(cuco|fantasma|esqueleto|chama|noel|boneco|gato|coruja|pilha|satelite|tomate|calor|frio)-/.test(key))
                    return;
                const autoAntes = this._c?.autoHide;
                this._readConfig();
                // o tema pode vir do ambiente atual, então trocar de ambiente também reaplica
                if (key === 'tema' || key === 'ambiente-atual' || key === 'ambientes')
                    this._applyTheme();
                if ((key === 'auto-ocultar' || key === 'telas') && autoAntes !== this._c.autoHide) {
                    this._cancelHide();
                    this._hidden = this._c.autoHide;
                }
                this._queueRebuild();
            });
        }
        this._applyTheme();

        this._hidden = this._c.autoHide;
        this._rebuild();
        this._animarAbertura();
        console.log(`[atlas] tela ${this._monIdx}: ${this._items.length} itens, posição ${this._c.pos}`);
    }

    disable() {
        if (this._tickId) {
            GLib.source_remove(this._tickId);
            this._tickId = 0;
        }
        if (this._rebuildId) {
            GLib.source_remove(this._rebuildId);
            this._rebuildId = 0;
        }
        if (this._menuIdleId) {
            GLib.source_remove(this._menuIdleId);
            this._menuIdleId = 0;
        }
        this._cancelHide();
        this._closeMenu();
        this._clearPreviewTimers();
        for (const [obj, id] of this._signals)
            obj.disconnect(id);
        this._signals = [];
        this._bg?.remove_effect_by_name('atlas-blur');
        for (const it of this._items)
            it.widget?.destruir();
        this._setStrut(false);
        this._container?.destroy();
        this._strut?.destroy();
        this._hot?.destroy();
        this._tooltip?.destroy();
        this._preview?.destroy();
        this._container = this._bg = this._deco = this._hot = this._strut = this._tooltip = this._preview = null;
        this._items = [];
    }

    // Auto-ocultar desta tela (chave `telas`; sem ela vale o `auto-ocultar` antigo, global).
    _autoDaTela() {
        const st = this._settings;
        if (!st)
            return false;
        const t = telasDoShell(st);
        return t.porIndice.get(this._monIdx)?.auto ?? false;
    }

    // Junta as opções da janela de preferências com os valores fixos.
    _readConfig() {
        const st = this._settings;
        const c = {
            ...FIXED,
            iconSize: st?.get_int('tamanho-icone') ?? 52,
            maxScale: st?.get_double('lente-forca') ?? 1.75,
            lensWidth: st?.get_int('lente-largura') ?? 70,
            pos: st?.get_string('posicao') ?? 'baixo',
            margin: st?.get_int('margem') ?? 8,
            autoHide: this._autoDaTela(),
            preview: st?.get_boolean('previa-janelas') ?? true,
        };
        c.maxPx = Math.ceil(c.iconSize * c.maxScale);
        c.reserve = st?.get_boolean('reservar-espaco') ?? true;
        c.noOverview = st?.get_boolean('no-overview') ?? true;
        c.trocaRoda = st?.get_boolean('troca-roda') ?? true;
        c.rodaInverter = st?.get_boolean('roda-inverter') ?? false;
        c.seletor = st?.get_boolean('mostrar-seletor') ?? true;
        c.ambientes = lerAmbientes(st);
        c.amb = ambienteAtual(st, c.ambientes);
        c.widgets = c.amb?.widgets ?? [];
        c.colecoes = c.amb?.colecoes ?? [];
        c.hover = st?.get_string('efeito-hover') ?? 'nenhum';
        c.abertura = st?.get_string('animacao-abertura') ?? 'nenhuma';
        c.indicador = st?.get_string('estilo-indicador') ?? 'ponto';
        const vertical = c.pos !== 'baixo';
        // ponto 6x6; barra fina ao longo da doca
        [c.dotW, c.dotH] = c.indicador === 'barra' ? (vertical ? [3, 16] : [16, 3]) : [6, 6];
        c.widgetsAntes = (st?.get_string('widgets-posicao') ?? 'depois') === 'antes';
        // tema do ambiente atual, quando definido e válido; senão o global
        c.tema = temaEfetivo(c.amb, st?.get_string('tema') ?? 'noite', TEMAS.map(t => t[0]));
        // temas de pacote: medidas do protótipo (margens, espaço, indicador) e espaço para o que passa do vidro
        c.geo = geometriaTema(c.tema, c.iconSize);
        c.sobra = 0;
        if (c.geo) {
            Object.assign(c, {padV: c.geo.padV, padH: c.geo.padH, gap: c.geo.gap, dotArea: c.geo.dotArea});
            c.dotW = c.geo.dotW;
            c.dotH = c.geo.dotH;
            c.sobra = Math.max(0, Math.ceil(c.iconSize * 0.6 - (c.maxPx - c.iconSize)));
        }
        this._c = c;
        this._v = c.pos !== 'baixo'; // doca vertical
    }

    _applyTheme() {
        // tema do ambiente atual, quando definido e válido; senão o global
        const tema = this._c.tema;
        this._container.style_class = `atlas-${tema}`;
        this._tooltip.style_class = `atlas-tooltip atlas-${tema}`;
        this._preview.style_class = `atlas-preview atlas-${tema}`;
        this._bg.remove_effect_by_name('atlas-blur');
        if (tema === 'cristal') {
            try {
                this._bg.add_effect_with_name('atlas-blur', new Shell.BlurEffect({
                    mode: Shell.BlurMode.BACKGROUND, radius: 40, brightness: 0.95,
                }));
            } catch (e) {
                console.error(`[atlas] blur indisponível: ${e}`);
            }
        }
    }

    _connect(obj, name, cb) {
        this._signals.push([obj, obj.connect(name, cb)]);
    }

    _queueRebuild() {
        if (this._rebuildId)
            return;
        this._rebuildId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._rebuildId = 0;
            this._rebuild();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Favoritos (na ordem salva), depois separador, depois apps abertos que não são favoritos.
    _appList() {
        const sistema = Shell.AppSystem.get_default();
        const favs = this._c.amb
            ? this._c.amb.apps.map(id => sistema.lookup_app(id)).filter(Boolean)
            : AppFavorites.getAppFavorites().getFavorites();
        const favIds = new Set(favs.map(a => a.get_id()));
        const running = Shell.AppSystem.get_default().get_running()
            .filter(a => !favIds.has(a.get_id()));
        return {favs, running};
    }

    _rebuild() {
        if (!this._container)
            return;
        this._hidePreview();
        const old = new Map(this._items.filter(i => i.key).map(i => [i.key, i.s]));
        this._destroyItems();
        this._nTiles = 0;
        this._decoCaixa = '';

        const {favs, running} = this._appList();
        if (this._c.ambientes.length && this._c.seletor) {
            this._addEnvChip(old);
            this._addSeparator();
        }
        const widgets = this._c.widgets.filter(id => WIDGETS.some(w => w[0] === id));
        if (this._c.widgetsAntes && widgets.length) {
            for (const id of widgets)
                this._addWidget(id, old);
            this._addSeparator();
        }
        for (const app of favs)
            this._addApp(app, old);
        for (const col of this._c.colecoes)
            this._addCollection(col, old);
        if ((favs.length || this._c.colecoes.length) && running.length)
            this._addSeparator();
        for (const app of running)
            this._addApp(app, old);
        if (!this._c.widgetsAntes && widgets.length) {
            if (this._items.length)
                this._addSeparator();
            for (const id of widgets)
                this._addWidget(id, old);
        }
        if (this._items.length)
            this._addSeparator();
        this._addAppsButton(old);

        // nos temas de pacote a borda é desenhada (decoracao.js); o raio acompanha o tamanho do ícone
        this._bg.style = this._c.geo ? `border-radius: ${Math.round(this._c.geo.raio)}px;`
            : this._c.amb ? `border-color: ${this._c.amb.cor};` : '';

        this._layoutGeometry();
        this._applyScales();
    }

    _destroyItems() {
        // o item sob o ponteiro vai ser destruído: sem isto o tooltip seguia um actor já descartado
        this._hoverItem = null;
        this._tooltip?.hide();
        for (const it of this._items) {
            it.widget?.destruir();
            it.actor.destroy();
            it.dot?.destroy();
        }
        this._items = [];
    }

    _addApp(app, old) {
        this._makeItem({
            key: app.get_id(),
            app,
            gicon: app.get_icon(),
            child: this._c.geo ? this._tileApp(app.get_icon(), this._nTiles++) : null,
            label: app.get_name(),
            onClick: button => this._activate(app, button),
        }, old);
    }

    // Widget: tile vivo; o clique abre o painel do próprio widget.
    _addWidget(id, old) {
        let widget = null;
        try {
            // versão larga só com a doca na horizontal (num lado, a faixa ficaria comprida demais)
            const largo = !this._v && (this._settings?.get_strv('widgets-largos') ?? []).includes(id);
            widget = criarWidget(id, this._c.maxPx, this._settings, largo);
        } catch (e) {
            console.error(`[atlas] widget ${id} falhou: ${e}\n${e.stack}`); // um widget com defeito não derruba a doca
        }
        if (!widget)
            return;
        widget.pausar(this._hidden && this._c.autoHide);
        const key = `w:${id}`;
        this._makeItem({
            key,
            app: null,
            child: widget.actor,
            widget,
            larg: widget.larg,
            label: () => widget.etiqueta,
            // widgets como o Slack levam a um app em vez de abrir um painel
            onClick: () => (widget.aoClicar ? widget.aoClicar() : this._openItemMenu(key, menu => widget.fillMenu(menu))),
        }, old);
    }

    // Coleção: um ícone que guarda um grupo de apps (mosaico 2x2); o clique abre a lista.
    _addCollection(col, old) {
        const sistema = Shell.AppSystem.get_default();
        const apps = col.apps.map(id => sistema.lookup_app(id)).filter(Boolean);
        const lado = Math.round(this._c.maxPx * 0.4);
        const mosaico = new St.BoxLayout({
            style_class: 'atlas-collection', vertical: true, x_expand: true, y_expand: true,
        });
        for (let r = 0; r < 2; r++) {
            const linha = new St.BoxLayout({x_expand: true, y_expand: true, x_align: Clutter.ActorAlign.CENTER});
            for (const app of apps.slice(r * 2, r * 2 + 2))
                linha.add_child(new St.Icon({gicon: app.get_icon(), icon_size: lado}));
            mosaico.add_child(linha);
        }
        const key = `c:${col.id}`;
        this._makeItem({
            key,
            app: null,
            child: mosaico,
            label: col.nome,
            onClick: () => this._openItemMenu(key, menu => {
                menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(col.nome));
                if (!apps.length)
                    menu.addMenuItem(new PopupMenu.PopupMenuItem('Coleção vazia', {reactive: false}));
                for (const app of apps) {
                    const mi = new PopupMenu.PopupImageMenuItem(app.get_name(), app.get_icon());
                    mi.connect('activate', () => this._activate(app, Clutter.BUTTON_PRIMARY));
                    menu.addMenuItem(mi);
                }
            }),
        }, old);
    }

    _openItemMenu(key, fill) {
        const item = this._items.find(i => i.key === key);
        if (item)
            this._popup(item.actor, fill);
    }

    // Seletor de ambiente: círculo na cor do ambiente com a inicial; clique abre a lista.
    _addEnvChip(old) {
        const c = this._c;
        const amb = c.amb;
        const label = new St.Label({
            text: (amb.nome || '?').trim().charAt(0).toUpperCase(),
            style: `font-size: ${Math.round(c.maxPx * 0.42)}px; font-weight: bold; color: white;`,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
        });
        this._makeItem({
            key: '__env__',
            app: null,
            child: label,
            style: `background-color: ${amb.cor}; border-radius: ${Math.round(c.maxPx * 0.28)}px;`,
            label: `Ambiente: ${amb.nome}`,
            onClick: () => this._openEnvMenu(),
        }, old);
    }

    // Botão "Mostrar aplicativos": abre/fecha a grade de apps do GNOME.
    _addAppsButton(old) {
        this._makeItem({
            key: '__apps__',
            app: null,
            child: this._appsTile(),
            label: 'Mostrar aplicativos',
            onClick: () => {
                if (Main.overview.visible)
                    Main.overview.hide();
                else if (typeof Main.overview.showApps === 'function')
                    Main.overview.showApps();
                else
                    Main.overview.dash.showAppsButton.checked = true;
            },
        }, old);
    }

    // Tile do protótipo atrás do ícone (temas de pacote): moldura desenhada e o ícone menor no centro.
    _tileApp(gicon, i) {
        const c = this._c;
        const caixa = new St.Widget({layout_manager: new Clutter.BinLayout(), x_expand: true, y_expand: true});
        const fundo = new St.DrawingArea({x_expand: true, y_expand: true});
        fundo._ativo = false;
        fundo.connect('repaint', a => {
            const cr = a.get_context();
            const [w, h] = a.get_surface_size();
            try {
                desenharTile(cr, c.tema, Math.min(w, h), i, a._ativo);
            } catch (e) {
                console.error(`[atlas] erro ao desenhar o tile: ${e}`);
            } finally {
                cr.$dispose();
            }
        });
        caixa.add_child(fundo);
        caixa.add_child(new St.Icon({
            gicon, icon_size: Math.round(c.maxPx * fracaoIcone(c.tema)),
            x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER,
        }));
        caixa._fundo = fundo;
        return caixa;
    }

    // Ícone simbólico num tile: a cor vem do tema (.atlas-apps-icon), senão some em fundos claros.
    _appsTile() {
        const icone = new St.Icon({
            icon_name: 'view-app-grid-symbolic',
            icon_size: Math.round(this._c.maxPx * 0.56),
            style_class: 'atlas-apps-icon',
        });
        return new St.Bin({
            style_class: 'atlas-apps',
            child: icone,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
        });
    }

    _makeItem({key, app, gicon, label, onClick, child, style, widget, larg = 1}, old) {
        const c = this._c;
        const icon = child ?? new St.Icon({gicon, icon_size: c.maxPx});
        const btn = new St.Button({
            style_class: 'atlas-item',
            style: style ?? '',
            child: icon,
            reactive: true,
            track_hover: true,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.TWO | St.ButtonMask.THREE,
        });
        this._hookScroll(btn);
        btn.set_size(Math.round(c.maxPx * larg), c.maxPx);
        btn.set_pivot_point(...PIVOT[c.pos]);
        this._container.add_child(btn);

        let dot;
        if (c.geo) {
            // indicador do tema (coração, folha, floco...) desenhado
            dot = new St.DrawingArea({reactive: false});
            dot.connect('repaint', a => {
                const cr = a.get_context();
                const [w, h] = a.get_surface_size();
                try {
                    desenharIndicador(cr, c.tema, w, h);
                } finally {
                    cr.$dispose();
                }
            });
        } else {
            dot = new St.Widget({style_class: 'atlas-dot'});
        }
        dot.set_size(Math.max(1, c.dotW), Math.max(1, c.dotH));
        this._container.add_child(dot);

        const item = {key, app, widget, actor: btn, dot, tile: child?._fundo ?? null, s: old.get(key) ?? 1, base: c.iconSize * larg};
        btn.connect('clicked', (_b, button) => {
            if (button === Clutter.BUTTON_SECONDARY && item.app)
                this._openMenu(item, btn);
            else if (button === Clutter.BUTTON_SECONDARY)
                this._openDockMenu(btn);
            else
                onClick(button);
        });
        btn.connect('notify::hover', () => {
            this._efeitoHover(btn);
            if (btn.hover) {
                this._hoverItem = item;
                this._tooltip.set_text(typeof label === 'function' ? label() : label);
                this._tooltip.show();
                this._placeTooltip();
                this._startTick();
                if (this._c.preview && app?.get_n_windows() > 0)
                    this._schedulePreview(item);
                else
                    this._schedulePreviewHide();
            } else if (this._hoverItem === item) {
                this._hoverItem = null;
                this._tooltip.hide();
                this._schedulePreviewHide();
            }
        });
        this._items.push(item);
    }

    // Efeito extra ao passar o mouse (a lente é independente): brilho no fundo ou ícone que sobe.
    _efeitoHover(btn) {
        const c = this._c;
        if (c.hover === 'brilho') {
            btn.style_class = btn.hover ? 'atlas-item atlas-item-hover' : 'atlas-item';
        } else if (c.hover === 'elevar') {
            const d = btn.hover ? Math.round(c.iconSize * 0.14) : 0;
            const eixo = c.pos === 'baixo' ? {translation_y: -d} : {translation_x: c.pos === 'esquerda' ? d : -d};
            btn.ease({...eixo, duration: 120, mode: Clutter.AnimationMode.EASE_OUT_QUAD});
        }
    }

    // Entrada da doca ao ser criada: surge (fade) ou desliza da borda da tela.
    _animarAbertura() {
        const modo = this._c.abertura;
        if (modo === 'nenhuma' || this._hidden || !this._container)
            return;
        if (modo === 'surgir') {
            this._container.opacity = 0;
            this._container.ease({
                opacity: 255, duration: 1100, mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        } else {
            const [tx, ty] = this._hideShift();
            this._container.translation_x = tx;
            this._container.translation_y = ty;
            this._container.ease({
                translation_x: 0, translation_y: 0, duration: 1000, mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
            });
        }
    }

    _addSeparator() {
        const actor = new St.Widget({style_class: 'atlas-sep'});
        this._container.add_child(actor);
        this._items.push({app: null, actor, dot: null, s: 1, base: this._c.sepWidth, sep: true});
    }

    // O container não é reativo, então a roda é ligada no vidro e em cada ícone.
    _hookScroll(actor) {
        actor.connect('scroll-event', (_a, event) => {
            if (!this._c.trocaRoda || this._c.ambientes.length < 2)
                return Clutter.EVENT_PROPAGATE;
            this._onScroll(event);
            return Clutter.EVENT_STOP;
        });
    }

    // Roda do mouse sobre a doca troca de ambiente (com um intervalo para não disparar várias vezes).
    _onScroll(event) {
        const dir = event.get_scroll_direction();
        let delta = 0;
        if (dir === Clutter.ScrollDirection.UP || dir === Clutter.ScrollDirection.LEFT)
            delta = -1;
        else if (dir === Clutter.ScrollDirection.DOWN || dir === Clutter.ScrollDirection.RIGHT)
            delta = 1;
        else if (dir === Clutter.ScrollDirection.SMOOTH)
            delta = Math.sign(event.get_scroll_delta()[1]);
        if (this._c.rodaInverter)
            delta = -delta;
        const agora = GLib.get_monotonic_time() / 1000;
        if (delta && agora - (this._lastScroll ?? 0) > 250) {
            this._lastScroll = agora;
            trocarAmbiente(this._settings, delta);
        }
    }

    // ----- Prévia de janelas -----

    _clearPreviewTimers() {
        for (const k of ['_previewShowId', '_previewHideId']) {
            if (this[k]) {
                GLib.source_remove(this[k]);
                this[k] = 0;
            }
        }
    }

    _schedulePreview(item) {
        this._clearPreviewTimers();
        const delay = this._preview.visible ? 120 : 350;
        this._previewShowId = agendar('previa-mostrar', delay, () => {
            this._previewShowId = 0;
            if (this._hoverItem === item)
                this._showPreview(item);
            return GLib.SOURCE_REMOVE;
        });
    }

    _schedulePreviewHide() {
        if (this._previewHideId || !this._preview?.visible && !this._previewShowId)
            return;
        if (this._previewShowId) {
            GLib.source_remove(this._previewShowId);
            this._previewShowId = 0;
        }
        this._previewHideId = agendar('previa-esconder', 250, () => {
            this._previewHideId = 0;
            if (this._preview && !this._preview.hover && !this._hoverItem)
                this._hidePreview();
            return GLib.SOURCE_REMOVE;
        });
    }

    _hidePreview() {
        this._clearPreviewTimers();
        if (!this._preview)
            return;
        this._preview.hide();
        this._preview.destroy_all_children();
    }

    _showPreview(item) {
        const wins = item.app?.get_windows() ?? [];
        if (!wins.length || this._menu?.isOpen)
            return;
        this._preview.destroy_all_children();
        for (const win of wins)
            this._preview.add_child(this._makeCard(win, item.app));
        this._tooltip.hide();
        this._preview.show();
        this._placePreview(item);
    }

    _makeCard(win, app) {
        const card = new St.Button({
            style_class: 'atlas-preview-card',
            reactive: true,
            track_hover: true,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.TWO,
        });
        const box = new St.BoxLayout({vertical: true, style: 'spacing: 6px;'});
        card.set_child(box);

        const head = new St.BoxLayout({style: 'spacing: 6px;'});
        const title = new St.Label({
            text: win.get_title() || app.get_name(),
            style_class: 'atlas-preview-title',
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        title.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        title.set_width(THUMB_W - 26);
        const close = new St.Button({
            style_class: 'atlas-preview-close',
            child: new St.Icon({icon_name: 'window-close-symbolic', icon_size: 14}),
            reactive: true,
            track_hover: true,
        });
        close.connect('clicked', () => {
            win.delete(global.get_current_time());
            this._hidePreview();
        });
        head.add_child(title);
        head.add_child(close);
        box.add_child(head);

        const thumb = new St.Widget({
            style_class: 'atlas-preview-thumb',
            layout_manager: new Clutter.BinLayout(),
            width: THUMB_W,
            height: THUMB_H,
        });
        const actor = win.get_compositor_private();
        if (actor && !win.minimized) {
            const [aw, ah] = actor.get_size();
            const k = Math.min(THUMB_W / Math.max(aw, 1), THUMB_H / Math.max(ah, 1));
            const clone = new Clutter.Clone({
                source: actor,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            clone.set_size(Math.round(aw * k), Math.round(ah * k));
            thumb.add_child(clone);
        } else {
            thumb.add_child(new St.Icon({
                gicon: app.get_icon(),
                icon_size: 48,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            }));
        }
        box.add_child(thumb);

        card.connect('clicked', (_b, button) => {
            if (button === Clutter.BUTTON_MIDDLE) {
                win.delete(global.get_current_time());
            } else {
                Main.activateWindow(win);
            }
            this._hidePreview();
        });
        return card;
    }

    _placePreview(item) {
        const mon = Main.layoutManager.monitors[this._monIdx];
        const [x, y] = item.actor.get_transformed_position();
        const [w, h] = item.actor.get_transformed_size();
        const [, pw] = this._preview.get_preferred_width(-1);
        const [, ph] = this._preview.get_preferred_height(pw);
        let px, py;
        if (this._c.pos === 'baixo') {
            px = x + w / 2 - pw / 2;
            py = y - ph - 12;
        } else if (this._c.pos === 'esquerda') {
            px = x + w + 12;
            py = y + h / 2 - ph / 2;
        } else {
            px = x - pw - 12;
            py = y + h / 2 - ph / 2;
        }
        px = Math.max(mon.x + 8, Math.min(px, mon.x + mon.width - pw - 8));
        py = Math.max(mon.y + 8, Math.min(py, mon.y + mon.height - ph - 8));
        this._preview.set_position(Math.round(px), Math.round(py));
    }

    // Cria um menu ancorado em `btn`, preenche com `fill(menu)` e abre.
    _popup(btn, fill) {
        this._closeMenu();
        this._tooltip.hide();
        this._hidePreview();

        const side = {baixo: St.Side.BOTTOM, esquerda: St.Side.LEFT, direita: St.Side.RIGHT}[this._c.pos];
        const menu = new PopupMenu.PopupMenu(btn, 0.5, side);
        Main.uiGroup.add_child(menu.actor);
        this._menuManager ??= new PopupMenu.PopupMenuManager(this._container);
        this._menuManager.addMenu(menu);
        this._menu = menu;
        fill(menu);

        menu.connect('open-state-changed', (_m, open) => {
            if (open)
                return;
            // destrói depois que o menu termina de fechar, e reavalia o auto-ocultar
            if (this._menuIdleId)
                GLib.source_remove(this._menuIdleId);
            this._menuIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                this._menuIdleId = 0;
                if (this._menu === menu)
                    this._closeMenu();
                return GLib.SOURCE_REMOVE;
            });
            this._scheduleHide();
        });
        menu.open();
    }

    // Menu geral do ATLAS (clique direito no vidro, no seletor ou no botão de apps).
    _openDockMenu(origem) {
        this._popup(origem, menu => preencherMenu(menu, this._settings, this._abrirPrefs, false));
    }

    // Lista de ambientes para escolher.
    _openEnvMenu() {
        const item = this._items.find(i => i.key === '__env__');
        if (!item)
            return;
        this._popup(item.actor, menu => {
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Ambientes'));
            for (const amb of this._c.ambientes) {
                const mi = new PopupMenu.PopupMenuItem(amb.nome);
                mi.setOrnament(amb.id === this._c.amb?.id ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
                mi.connect('activate', () => this._settings.set_string('ambiente-atual', amb.id));
                menu.addMenuItem(mi);
            }
        });
    }

    _isPinned(id) {
        return this._c.amb ? this._c.amb.apps.includes(id) : AppFavorites.getAppFavorites().isFavorite(id);
    }

    // Fixa/desafixa no ambiente atual (ou nos favoritos do GNOME quando não há ambientes).
    _setPinned(id, fixar) {
        if (!this._c.amb) {
            const favs = AppFavorites.getAppFavorites();
            if (fixar)
                favs.addFavorite(id);
            else
                favs.removeFavorite(id);
            return;
        }
        const lista = lerAmbientes(this._settings);
        const amb = lista.find(a => a.id === this._c.amb.id);
        if (!amb)
            return;
        amb.apps = amb.apps.filter(a => a !== id);
        if (fixar)
            amb.apps.push(id);
        this._settings.set_string('ambientes', JSON.stringify(lista));
    }

    // Menu de clique direito: ações do app, nova janela, fixar/desafixar e fechar janelas.
    _openMenu(item, btn) {
        const app = item.app;
        if (!app)
            return;
        this._popup(btn, menu => {
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(app.get_name()));
            const info = app.get_app_info();
            for (const action of info?.list_actions() ?? [])
                menu.addAction(info.get_action_name(action), () => app.launch_action(action, global.get_current_time(), -1));
            menu.addAction('Nova janela', () => app.open_new_window(-1));

            const id = app.get_id();
            const destino = this._c.amb ? `ambiente ${this._c.amb.nome}` : 'a doca';
            if (this._isPinned(id))
                menu.addAction(`Desafixar de ${destino}`, () => this._setPinned(id, false));
            else
                menu.addAction(`Fixar em ${destino}`, () => this._setPinned(id, true));

            if (app.get_n_windows() > 0) {
                menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                menu.addAction('Fechar todas as janelas', () => {
                    const t = global.get_current_time();
                    app.get_windows().forEach(w => w.delete(t));
                });
            }
        });
    }

    _closeMenu() {
        const menu = this._menu;
        this._menu = null;
        if (menu) {
            this._menuManager?.removeMenu(menu);
            menu.destroy();
        }
    }

    _activate(app, button) {
        const ctrl = (Clutter.get_current_event()?.get_state() ?? 0) & Clutter.ModifierType.CONTROL_MASK;
        if (app.get_n_windows() === 0 || button === Clutter.BUTTON_MIDDLE || ctrl)
            app.open_new_window(-1);
        else
            app.activate();
        Main.overview.hide();
    }

    // Tamanho do container (cabe a lente toda) e posição na tela, conforme a borda escolhida.
    _layoutGeometry() {
        const c = this._c;
        const mon = Main.layoutManager.monitors[this._monIdx];
        const wa = Main.layoutManager.getWorkAreaForMonitor(this._monIdx);
        const n = this._items.length;
        const baseLen = this._items.reduce((w, i) => w + i.base, 0) + c.gap * Math.max(0, n - 1);
        const growth = c.iconSize * (c.maxScale - 1) * 3.2; // sobra máxima da lente ao longo da doca

        this._len = Math.ceil(baseLen + growth + c.padH * 2);                  // eixo da doca
        this._thick = Math.ceil(c.maxPx + c.padV * 2 + c.dotArea + c.sobra);   // eixo transversal
        this._d0 = c.dotArea + c.padV;                                          // borda da tela até a base dos ícones
        this._cw = this._v ? this._thick : this._len;
        this._ch = this._v ? this._len : this._thick;

        let x, y;
        if (c.pos === 'baixo') {
            x = mon.x + (mon.width - this._cw) / 2;
            y = mon.y + mon.height - this._ch - c.margin;
        } else if (c.pos === 'esquerda') {
            x = mon.x + c.margin;
            y = wa.y + (wa.height - this._ch) / 2;
        } else {
            x = mon.x + mon.width - this._cw - c.margin;
            y = wa.y + (wa.height - this._ch) / 2;
        }
        this._container.set_size(this._cw, this._ch);
        this._container.set_position(Math.round(x), Math.round(y));
        this._deco.set_size(this._cw, this._ch);
        this._deco.visible = !!c.geo;
        this._placeHotZone(mon, wa);
        this._placeStrut(mon);
        this._applyHidden(false);
        Main.layoutManager.uiGroup.set_child_above_sibling(this._tooltip, null);
    }

    // Liga/desliga a reserva: entrar e sair do rastreio do LayoutManager é o que o faz recalcular a área útil.
    _setStrut(ativo) {
        if (!this._strut || ativo === !!this._strutAtivo)
            return;
        this._strutAtivo = ativo;
        if (ativo)
            Main.layoutManager.addChrome(this._strut, {affectsStruts: true, trackFullscreen: true});
        else
            Main.layoutManager.removeChrome(this._strut);
    }

    // Reserva da borda até a face externa do vidro. O Mutter converte isso em uma faixa que vai de ponta
    // a ponta da tela, então só importa de qual lado o actor encosta.
    _placeStrut(mon) {
        const c = this._c;
        this._setStrut(c.reserve && !c.autoHide);
        const t = Math.ceil(this._d0 + c.iconSize + c.padV + c.margin);
        const cy = this._container.y;
        if (c.pos === 'baixo') {
            this._strut.set_size(mon.width - 2, t);
            this._strut.set_position(mon.x + 1, mon.y + mon.height - t);
        } else if (c.pos === 'esquerda') {
            this._strut.set_size(t, this._len);
            this._strut.set_position(mon.x, cy);
        } else {
            this._strut.set_size(t, this._len);
            this._strut.set_position(mon.x + mon.width - t, cy);
        }
    }

    // Faixa de 2px na borda da tela, do tamanho da doca, que a faz reaparecer.
    _placeHotZone(mon, wa) {
        const c = this._c;
        const along = this._len;
        if (c.pos === 'baixo') {
            this._hot.set_size(along, 2);
            this._hot.set_position(Math.round(mon.x + (mon.width - along) / 2), mon.y + mon.height - 2);
        } else if (c.pos === 'esquerda') {
            this._hot.set_size(2, along);
            this._hot.set_position(mon.x, Math.round(wa.y + (wa.height - along) / 2));
        } else {
            this._hot.set_size(2, along);
            this._hot.set_position(mon.x + mon.width - 2, Math.round(wa.y + (wa.height - along) / 2));
        }
    }

    // Onde um mascote pousa: o vidro da doca na tela, o tamanho do ícone e o topo da área útil.
    // null com a doca escondida (auto-ocultar) ou ainda sem construir.
    ancoraMascote() {
        if (!this._container || !this._bg || (this._hidden && this._c.autoHide))
            return null;
        const [x, y] = this._bg.get_transformed_position();
        const [w, h] = this._bg.get_transformed_size();
        return {
            caixa: {x, y, w, h},
            icone: this._c.iconSize,
            topoUtil: Main.layoutManager.getWorkAreaForMonitor(this._monIdx).y,
        };
    }

    // Deslocamento que leva a doca toda para fora da tela.
    _hideShift() {
        const away = this._thick + this._c.margin + 2;
        if (this._c.pos === 'baixo')
            return [0, away];
        return [this._c.pos === 'esquerda' ? -away : away, 0];
    }

    _applyHidden(animate) {
        if (!this._container)
            return;
        const hide = this._hidden && this._c.autoHide;
        for (const it of this._items)
            it.widget?.pausar(hide); // escondida, os widgets não gastam desenho
        const [tx, ty] = hide ? this._hideShift() : [0, 0];
        this._hot.visible = hide;
        // Escondida, a doca desliza para fora da borda da tela e, com telas empilhadas ou lado a lado, apareceria na
        // vizinha: some junto (opacidade) em vez de depender de a borda cortar.
        const op = hide ? 0 : 255;
        if (animate) {
            this._container.ease({
                translation_x: tx,
                translation_y: ty,
                opacity: op,
                duration: 180,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        } else {
            this._container.remove_all_transitions();
            this._container.translation_x = tx;
            this._container.translation_y = ty;
            this._container.opacity = op;
        }
    }

    _setHidden(hidden) {
        if (this._hidden === hidden || (hidden && !this._c.autoHide))
            return;
        this._hidden = hidden;
        if (hidden) {
            this._tooltip.hide();
            this._hidePreview();
        }
        this._applyHidden(true);
        if (!hidden)
            this._scheduleHide();
    }

    // Enquanto a doca está visível no modo auto-ocultar, confere o ponteiro a cada 150 ms (sair pela
    // zona da lente não gera mais eventos) e esconde depois de 450 ms fora dela.
    _scheduleHide() {
        if (!this._c.autoHide || this._hideId)
            return;
        let fora = 0;
        this._hideId = agendar('auto-ocultar', 150, () => {
            if (!this._container || !this._c.autoHide || this._hidden) {
                this._hideId = 0;
                return GLib.SOURCE_REMOVE;
            }
            fora = (this._pointerZone().inside || this._menu?.isOpen || this._preview?.visible) ? 0 : fora + 150;
            if (fora >= 450) {
                this._hideId = 0;
                this._setHidden(true);
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    _cancelHide() {
        if (this._hideId) {
            GLib.source_remove(this._hideId);
            this._hideId = 0;
        }
    }

    // Posiciona cada ícone conforme sua escala; o vidro acompanha o tamanho total.
    _applyScales() {
        const c = this._c;
        const max = c.maxPx;
        const widths = this._items.map(i => i.sep ? i.base : i.base * i.s);
        const total = widths.reduce((a, b) => a + b, 0) + c.gap * Math.max(0, widths.length - 1);
        const start = (this._len - total) / 2;
        const d0 = this._d0;
        const dotDepth = c.geo?.dotDepth ?? d0 - 7; // centro do indicador, medido a partir da borda da tela
        const sepLen = Math.round(c.iconSize * 0.7);
        let a = start;

        this._items.forEach((it, idx) => {
            const w = widths[idx];
            const mid = a + w / 2;
            if (it.sep) {
                const [sw, sh] = this._v ? [sepLen, 2] : [2, sepLen];
                it.actor.set_size(sw, sh);
                const [sx, sy] = this._point(mid, d0 + c.iconSize * 0.15 + sepLen / 2, sw, sh);
                it.actor.set_position(sx, sy);
            } else {
                const f = (c.iconSize * it.s) / max; // a escala vem da altura; um tile largo cresce na mesma proporção
                it.actor.set_scale(f, f);
                const [x, y] = this._boxOrigin(a, d0, max);
                it.actor.set_position(x, y);
                const aberto = !!it.app && it.app.get_n_windows() > 0;
                it.dot.visible = c.indicador !== 'nenhum' && aberto && c.dotW > 0;
                if (it.tile && it.tile._ativo !== aberto) {
                    it.tile._ativo = aberto; // Carta marca o app aberto no próprio tile
                    if (c.tema === 'carta')
                        it.tile.queue_repaint();
                }
                const [dx, dy] = this._point(mid, dotDepth, c.dotW, c.dotH);
                it.dot.set_position(dx, dy);
            }
            a += w + c.gap;
        });

        const thickBg = d0 + c.iconSize + c.padV;
        const bgA = Math.round(start - c.padH);
        const bgLen = Math.round(total + c.padH * 2);
        if (c.pos === 'baixo') {
            this._bg.set_position(bgA, this._ch - thickBg);
            this._bg.set_size(bgLen, thickBg);
        } else if (c.pos === 'esquerda') {
            this._bg.set_position(0, bgA);
            this._bg.set_size(thickBg, bgLen);
        } else {
            this._bg.set_position(this._cw - thickBg, bgA);
            this._bg.set_size(thickBg, bgLen);
        }
        const caixa = `${bgA}:${bgLen}:${thickBg}`;
        if (c.geo && caixa !== this._decoCaixa) {
            this._decoCaixa = caixa;
            this._decoMedidas = {bgA, bgLen, thickBg};
            this._deco.queue_repaint();
        }
    }

    // Material do tema no referencial de decoracao.js (vidro de y = -esp a 0, borda da tela em y = 0),
    // girado para as docas laterais.
    _pintarDeco(area) {
        const cr = area.get_context();
        const m = this._decoMedidas;
        try {
            if (!m || !this._c.geo)
                return;
            const pos = this._c.pos;
            if (pos === 'baixo') {
                cr.translate(0, this._ch);
            } else if (pos === 'esquerda') {
                cr.rotate(Math.PI / 2);
            } else {
                cr.translate(this._cw, 0);
                cr.rotate(-Math.PI / 2);
                cr.scale(-1, 1);
            }
            desenharDoca(cr, this._c.tema, m.bgA, m.bgLen, m.thickBg, this._c.iconSize);
        } catch (e) {
            console.error(`[atlas] erro ao desenhar o tema: ${e}`);
        } finally {
            cr.$dispose();
        }
    }

    // Canto superior esquerdo do quadrado (max x max) de um ícone, dado o ponto ao longo da doca `a`
    // e a distância `d0` da borda da tela até a base do ícone.
    _boxOrigin(a, d0, max) {
        if (this._c.pos === 'baixo')
            return [Math.round(a), Math.round(this._ch - d0 - max)];
        if (this._c.pos === 'esquerda')
            return [Math.round(d0), Math.round(a)];
        return [Math.round(this._cw - d0 - max), Math.round(a)];
    }

    // Posição do canto superior esquerdo de um actor w x h cujo centro está em (`mid` ao longo da doca,
    // `depth` a partir da borda da tela).
    _point(mid, depth, w, h) {
        if (this._c.pos === 'baixo')
            return [Math.round(mid - w / 2), Math.round(this._ch - depth - h / 2)];
        if (this._c.pos === 'esquerda')
            return [Math.round(depth - w / 2), Math.round(mid - h / 2)];
        return [Math.round(this._cw - depth - w / 2), Math.round(mid - h / 2)];
    }

    // Posição do ponteiro ao longo da doca e se ele está na zona da lente.
    _pointerZone() {
        const c = this._c;
        const [cx, cy] = this._container.get_transformed_position();
        const [px, py] = global.get_pointer();
        const rx = px - cx;
        const ry = py - cy;
        const lens = c.iconSize * (c.maxScale - 1);
        const reach = this._d0 + c.iconSize + c.padV + lens; // até onde a lente alcança, a partir da borda
        const along = this._v ? ry : rx;
        const depth = c.pos === 'baixo' ? this._ch - ry : c.pos === 'esquerda' ? rx : this._cw - rx;
        const inside = along >= 0 && along <= this._len && depth >= 0 && depth <= Math.min(reach, this._thick);
        return {inside, along};
    }

    _startTick() {
        if (this._tickId)
            return;
        this._tickId = agendar('lente', this._c.frameMs, () => {
            if (!this._container)
                return GLib.SOURCE_REMOVE;
            const c = this._c;
            const {inside, along} = this._pointerZone();
            const sigma = c.lensWidth;

            // centro de cada item sem ampliação, para a lente não "fugir" do ponteiro
            const widths = this._items.map(i => i.base);
            const total = widths.reduce((a, b) => a + b, 0) + c.gap * Math.max(0, widths.length - 1);
            let a = (this._len - total) / 2;
            let moving = false;

            this._items.forEach((it, idx) => {
                const center = a + widths[idx] / 2;
                a += widths[idx] + c.gap;
                if (it.sep)
                    return;
                const d = along - center;
                const target = inside ? escalaLente(d, c.maxScale, sigma) : 1;
                const diff = target - it.s;
                if (Math.abs(diff) > 0.003) {
                    it.s += diff * c.smoothing;
                    moving = true;
                } else {
                    it.s = target;
                }
            });

            this._applyScales();
            this._placeTooltip();

            if (!inside && !moving) {
                this._tickId = 0;
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    _placeTooltip() {
        if (!this._hoverItem || !this._tooltip?.visible)
            return;
        const [x, y] = this._hoverItem.actor.get_transformed_position();
        const [w, h] = this._hoverItem.actor.get_transformed_size();
        const [tw, th] = this._tooltip.get_size();
        let tx, ty;
        if (this._c.pos === 'baixo') {
            tx = x + w / 2 - tw / 2;
            ty = y - th - 8;
        } else if (this._c.pos === 'esquerda') {
            tx = x + w + 8;
            ty = y + h / 2 - th / 2;
        } else {
            tx = x - tw - 8;
            ty = y + h / 2 - th / 2;
        }
        this._tooltip.set_position(Math.round(tx), Math.round(ty));
    }
}

// Gerenciador: carrega configuração e CSS uma vez e cria uma doca por tela conforme a chave `telas`.
export class Dock {
    // `dir`: pasta da extensão, dada pelo extension.js (os módulos rodam de uma cópia temporária).
    constructor(dir) {
        this._extDir = dir ?? Gio.File.new_for_uri(import.meta.url.split('?')[0]).get_parent();
    }

    enable() {
        this._signals = [];
        this._views = [];
        this._settings = this._loadSettings();
        this._loadThemeCss();

        this._connect(Main.layoutManager, 'monitors-changed', () => this._buildViews());
        if (this._settings)
            this._connect(this._settings, 'changed::no-overview', () => {
                this._syncDash();
                this._buildViews();
            });
        this._syncDash();
        if (this._settings)
            this._connect(this._settings, 'changed::mostrar-icone-painel', () => this._syncIndicator());
        this._syncIndicator();
        this._atalhos = [];
        if (this._settings) {
            for (const [chave, delta] of [['atalho-proximo', 1], ['atalho-anterior', -1]]) {
                Main.wm.addKeybinding(chave, this._settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                    Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW, () => {
                        if (this._settings.get_boolean('atalhos-ativos'))
                            trocarAmbiente(this._settings, delta);
                    });
                this._atalhos.push(chave);
            }
            for (let n = 1; n <= 9; n++) {
                const chave = `atalho-ambiente-${n}`;
                Main.wm.addKeybinding(chave, this._settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                    Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW, () => {
                        if (this._settings.get_boolean('atalhos-ativos') && this._settings.get_boolean('atalho-numero-ativo'))
                            irParaAmbiente(this._settings, n);
                    });
                this._atalhos.push(chave);
            }
        }
        if (this._settings)
            this._connect(this._settings, 'changed::monitores', () => this._buildViews());
        if (this._settings) {
            this._migrarTelas();
            // só recria as docas se mudou quais telas têm doca; o auto-ocultar cada doca resolve sozinha
            this._connect(this._settings, 'changed::telas', () => {
                // "Restaurar padrões" do app esvazia a chave: regrava na hora, senão o app mostra todas as telas
                // desligadas e ligar uma delas apagaria a doca das outras
                if (!this._settings.get_string('telas')) {
                    this._migrarTelas();
                    return; // a gravação acima dispara este sinal de novo
                }
                const quer = this._monitorIndexes().join();
                if (quer !== this._views.map(v => v._monIdx).join())
                    this._buildViews();
            });
        }
        // Não perturbe (GNOME): show-banners = false. O ambiente marcado com `naoperturbe` entra sozinho.
        this._dndMemoria = null;
        try {
            this._notif = new Gio.Settings({schema_id: 'org.gnome.desktop.notifications'});
            this._connect(this._notif, 'changed::show-banners', () => this._seguirNaoPerturbe());
        } catch (e) {
            console.error(`[atlas] sem acesso ao Não perturbe: ${e}`);
        }
        if (this._settings) {
            perfilar(this._settings.get_boolean('perfil-ativo'));
            this._connect(this._settings, 'changed::perfil-ativo', () => perfilar(this._settings.get_boolean('perfil-ativo')));
        }
        if (this._settings) {
            // um temporizador só, e só com um mascote ligado
            this._mascotes = new Mascotes(this._settings, {
                pasta: () => this._extDir,
                doca: () => this._views.find(v => v._monIdx === Main.layoutManager.primaryIndex) ?? this._views[0],
                naoPerturbe: () => !!this._notif && !this._notif.get_boolean('show-banners'),
            });
            this._mascotes.enable();
        }
        this._minimizadas = new Map(); // janela -> id do sinal 'unmanaged'
        if (this._settings) {
            this._connect(this._settings, 'changed::ambiente-atual', () => this._seguirAmbiente());
            this._connect(this._settings, 'changed::janelas-seguem', () => {
                if (this._settings.get_boolean('janelas-seguem'))
                    this._seguirAmbiente();
                else
                    this._restaurarJanelas();
            });
        }
        this._buildViews();
    }

    disable() {
        for (const [obj, id] of this._signals)
            obj.disconnect(id);
        this._signals = [];
        for (const chave of this._atalhos ?? [])
            Main.wm.removeKeybinding(chave);
        this._atalhos = [];
        this._restaurarJanelas();
        this._mascotes?.disable();
        this._mascotes = null;
        perfilar(false);
        pararWidgets();
        pararPonte();
        pararClima();
        this._notif = null;
        this._dndMemoria = null;
        this._destroyViews();
        this._restoreDash();
        this._destroyIndicator();
        this._unloadThemeCss();
        this._settings = null;
    }

    _connect(obj, name, cb) {
        this._signals.push([obj, obj.connect(name, cb)]);
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

    // ----- Janelas seguem o ambiente -----

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

    // Traz de volta tudo o que esta função minimizou (ao desligar a opção ou a extensão).
    _restaurarJanelas() {
        for (const win of [...(this._minimizadas?.keys() ?? [])])
            this._devolver(win);
    }

    _buildViews() {
        this._destroyViews();
        for (const i of this._monitorIndexes()) {
            const view = new DockView(this._settings, i, () => this._openPrefs());
            this._views.push(view); // entra antes, para o disable limpar mesmo se o enable falhar no meio
            try {
                view.enable();
            } catch (e) {
                console.error(`[atlas] falha ao criar a doca da tela ${i}: ${e}\n${e.stack}`);
            }
        }
    }

    // Primeira vez com o recurso: grava em `telas` o que as chaves antigas (`monitores`, `auto-ocultar`) diziam.
    _migrarTelas() {
        const st = this._settings;
        if (st.get_string('telas'))
            return;
        const t = telasDoShell(st);
        const obj = {};
        t.lista.forEach((e, i) => {
            obj[String(i + 1)] = {ativa: e.ativa, auto: e.auto};
        });
        st.set_string('telas', JSON.stringify(obj));
    }

    // Índices dos monitores do Shell que têm doca.
    _monitorIndexes() {
        return telasDoShell(this._settings).ativos;
    }

    // O dock original do GNOME (no Overview) fica escondido enquanto o ATLAS ocupa o lugar dele.
    _syncDash() {
        const quer = this._settings?.get_boolean('no-overview') ?? true;
        if (quer)
            this._hideDash();
        else
            this._restoreDash();
    }

    _hideDash() {
        const dash = Main.overview.dash;
        if (!dash || this._dashHidden)
            return;
        this._dashHidden = true;
        dash.hide();
        dash.set_height(0);
    }

    _restoreDash() {
        const dash = Main.overview.dash;
        if (!dash || !this._dashHidden)
            return;
        this._dashHidden = false;
        dash.set_height(-1);
        dash.show();
    }

    // Ícone no painel superior (some pela opção "Mostrar o ícone do ATLAS no painel").
    _syncIndicator() {
        const quer = this._settings?.get_boolean('mostrar-icone-painel') ?? true;
        if (quer && !this._indicator) {
            const ind = new PanelMenu.Button(0.5, 'ATLAS', false);
            const icone = this._dir().get_child('icons').get_child('atlas-symbolic.svg');
            ind.add_child(new St.Icon({gicon: new Gio.FileIcon({file: icone}), style_class: 'system-status-icon'}));
            // O menu precisa ter itens antes de abrir: preenche agora e refaz a cada fechamento
            // (ambiente, tema e auto-ocultar mudam o conteúdo).
            const encher = () => {
                ind.menu.removeAll();
                preencherMenu(ind.menu, this._settings, () => this._openPrefs(), true);
            };
            encher();
            ind.menu.connect('open-state-changed', (_m, aberto) => {
                if (aberto)
                    return;
                if (this._indicatorIdleId)
                    GLib.source_remove(this._indicatorIdleId);
                this._indicatorIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    this._indicatorIdleId = 0;
                    if (this._indicator === ind)
                        encher();
                    return GLib.SOURCE_REMOVE;
                });
            });
            Main.panel.addToStatusArea('atlas-indicator', ind);
            this._indicator = ind;
        } else if (!quer) {
            this._destroyIndicator();
        }
    }

    _destroyIndicator() {
        if (this._indicatorIdleId) {
            GLib.source_remove(this._indicatorIdleId);
            this._indicatorIdleId = 0;
        }
        this._indicator?.destroy();
        this._indicator = null;
    }

    // Abre o app de configuração (app/main.js, dentro da pasta da extensão); sem ele, cai no prefs do Shell.
    _openPrefs() {
        try {
            const dir = this._dir();
            const main = dir.get_child('app').get_child('main.js');
            if (main.query_exists(null))
                Gio.Subprocess.new(['gjs', '-m', main.get_path()], Gio.SubprocessFlags.NONE);
            else if (Main.extensionManager.lookup(dir.get_basename())?.hasPrefs)
                Main.extensionManager.openExtensionPrefs(dir.get_basename(), '', {});
            else
                Main.notify('ATLAS', 'App de configuração não encontrado.');
        } catch (e) {
            console.error(`[atlas] não consegui abrir as preferências: ${e}`);
        }
    }

    _destroyViews() {
        for (const v of this._views ?? [])
            v.disable();
        this._views = [];
    }

    _dir() {
        return this._extDir;
    }

    // Lê o schema da pasta da própria extensão (sem precisar instalá-lo no sistema).
    _loadSettings() {
        try {
            const src = Gio.SettingsSchemaSource.new_from_directory(
                this._dir().get_child('schemas').get_path(), Gio.SettingsSchemaSource.get_default(), false);
            return new Gio.Settings({settings_schema: src.lookup(SCHEMA_ID, true)});
        } catch (e) {
            console.error(`[atlas] sem GSettings, usando valores padrão: ${e}`);
            return null;
        }
    }

    // O Shell só lê stylesheet.css no login; temas.css é carregado aqui para valer ao recarregar.
    _loadThemeCss() {
        this._themeCss = this._dir().get_child('temas.css');
        this._theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        // Nunca duas entradas do mesmo arquivo no mesmo tema: descarregar uma delas deixa a outra
        // apontando para um GFile já liberado e o próximo Main.loadTheme() derruba o Shell.
        // unload_stylesheet não faz nada se o arquivo não estiver carregado.
        this._theme.unload_stylesheet(this._themeCss);
        this._theme.load_stylesheet(this._themeCss);
    }

    // O Shell troca o St.Theme ao bloquear/desbloquear a tela (Main.loadTheme) e copia os estilos
    // customizados para o novo. Descarregar só do tema guardado deixava o temas.css no tema novo
    // e o gnome-shell caía com SIGSEGV em st_theme_get_custom_stylesheets. Descarrega dos dois.
    _unloadThemeCss() {
        if (this._themeCss) {
            const atual = St.ThemeContext.get_for_stage(global.stage).get_theme();
            for (const tema of new Set([this._theme, atual])) {
                if (!tema)
                    continue;
                try {
                    tema.unload_stylesheet(this._themeCss);
                } catch (e) {
                    console.error(`[atlas] falha ao descarregar temas.css: ${e}`);
                }
            }
        }
        this._theme = this._themeCss = null;
    }
}
