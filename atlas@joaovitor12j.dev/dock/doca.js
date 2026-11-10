// Uma doca em um monitor: ciclo de vida, configuração, tema e reconstrução. O resto vem de mixins:
// itens.js, previa.js, menus.js, posicao.js, ampliacao.js (e ambientes/roda.js).
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ambienteAtual, lerAmbientes} from '../ambientes/acoes.js';
import {RodaAmbientes} from '../ambientes/roda.js';
import {TEMAS} from '../temas/catalogo.js';
import {geometriaTema, temaEfetivo} from '../temas/logica.js';
import {WIDGETS} from '../widgets/catalogo.js';
import {AmpliacaoDoca} from './ampliacao.js';
import {ItensDoca} from './itens.js';
import {misturar} from './mixin.js';
import {MenusDoca} from './menus.js';
import {telasDoShell} from './monitores.js';
import {PosicaoDoca} from './posicao.js';
import {PreviaJanelas} from './previa.js';

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

// Uma doca em um monitor. O gerenciador `Dock` (dock/index.js) cria uma por tela.
export class DockView {
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















    // ----- Prévia de janelas -----
































}

misturar(DockView, ItensDoca, RodaAmbientes, PreviaJanelas, MenusDoca, PosicaoDoca, AmpliacaoDoca);
