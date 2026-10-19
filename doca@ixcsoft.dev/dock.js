// ATLAS: dock com lente de ampliação para GNOME Shell (Wayland/X11).
// Mutter não aceita layer-shell, então o dock é um actor "chrome" desenhado pelo próprio Shell.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.atlas';

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

// Uma doca em um monitor. O gerenciador `Dock` (no fim do arquivo) cria uma por tela.
class DockView {
    constructor(settings, monIdx) {
        this._settings = settings;
        this._monIdx = monIdx;
    }

    enable() {
        this._items = [];
        this._signals = [];
        this._tickId = 0;
        this._rebuildId = 0;

        this._hidden = false;
        this._hideId = 0;
        this._readConfig();
        this._tooltip = new St.Label({style_class: 'atlas-tooltip', visible: false});
        Main.layoutManager.addTopChrome(this._tooltip);

        this._container = new St.Widget({reactive: false});
        this._bg = new St.Widget({style_class: 'atlas-bg', reactive: true, track_hover: true});
        this._container.add_child(this._bg);
        Main.layoutManager.addChrome(this._container, {
            affectsStruts: false,
            trackFullscreen: true,
        });

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
        this._connect(Main.overview, 'showing', () => { this._container.hide(); this._tooltip.hide(); });
        this._connect(Main.overview, 'hiding', () => this._container.show());
        this._connect(global.display, 'window-created', () => this._queueRebuild());

        if (this._settings) {
            this._connect(this._settings, 'changed', (_s, key) => {
                if (key === 'tema') {
                    this._applyTheme();
                } else if (key !== 'monitores') {
                    this._readConfig();
                    this._cancelHide();
                    this._hidden = this._c.autoHide;
                    this._queueRebuild();
                }
            });
        }
        this._applyTheme();

        this._hidden = this._c.autoHide;
        this._rebuild();
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
        this._cancelHide();
        for (const [obj, id] of this._signals)
            obj.disconnect(id);
        this._signals = [];
        this._bg?.remove_effect_by_name('atlas-blur');
        this._container?.destroy();
        this._hot?.destroy();
        this._tooltip?.destroy();
        this._container = this._bg = this._hot = this._tooltip = null;
        this._items = [];
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
            autoHide: st?.get_boolean('auto-ocultar') ?? false,
        };
        c.maxPx = Math.ceil(c.iconSize * c.maxScale);
        this._c = c;
        this._v = c.pos !== 'baixo'; // doca vertical
    }

    _applyTheme() {
        const tema = this._settings?.get_string('tema') ?? 'noite';
        this._container.style_class = `atlas-${tema}`;
        this._tooltip.style_class = `atlas-tooltip atlas-${tema}`;
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
        const favs = AppFavorites.getAppFavorites().getFavorites();
        const favIds = new Set(favs.map(a => a.get_id()));
        const running = Shell.AppSystem.get_default().get_running()
            .filter(a => !favIds.has(a.get_id()));
        return {favs, running};
    }

    _rebuild() {
        if (!this._container)
            return;
        const old = new Map(this._items.filter(i => i.key).map(i => [i.key, i.s]));
        for (const it of this._items) {
            it.actor.destroy();
            it.dot?.destroy();
        }
        this._items = [];

        const {favs, running} = this._appList();
        for (const app of favs)
            this._addApp(app, old);
        if (favs.length && running.length)
            this._addSeparator();
        for (const app of running)
            this._addApp(app, old);
        if (this._items.length)
            this._addSeparator();
        this._addAppsButton(old);

        this._layoutGeometry();
        this._applyScales();
    }

    _addApp(app, old) {
        this._makeItem({
            key: app.get_id(),
            app,
            gicon: app.get_icon(),
            label: app.get_name(),
            onClick: button => this._activate(app, button),
        }, old);
    }

    // Botão "Mostrar aplicativos": abre/fecha a grade de apps do GNOME.
    _addAppsButton(old) {
        this._makeItem({
            key: '__apps__',
            app: null,
            gicon: new Gio.ThemedIcon({name: 'view-app-grid-symbolic'}),
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

    _makeItem({key, app, gicon, label, onClick}, old) {
        const c = this._c;
        const icon = new St.Icon({gicon, icon_size: c.maxPx});
        const btn = new St.Button({
            style_class: 'atlas-item',
            child: icon,
            reactive: true,
            track_hover: true,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.TWO,
        });
        btn.set_size(c.maxPx, c.maxPx);
        btn.set_pivot_point(...PIVOT[c.pos]);
        this._container.add_child(btn);

        const dot = new St.Widget({style_class: 'atlas-dot'});
        dot.set_size(6, 6);
        this._container.add_child(dot);

        const item = {key, app, actor: btn, dot, s: old.get(key) ?? 1, base: c.iconSize};
        btn.connect('clicked', (_b, button) => onClick(button));
        btn.connect('notify::hover', () => {
            if (btn.hover) {
                this._hoverItem = item;
                this._tooltip.set_text(label);
                this._tooltip.show();
                this._placeTooltip();
                this._startTick();
            } else if (this._hoverItem === item) {
                this._hoverItem = null;
                this._tooltip.hide();
            }
        });
        this._items.push(item);
    }

    _addSeparator() {
        const actor = new St.Widget({style_class: 'atlas-sep'});
        this._container.add_child(actor);
        this._items.push({app: null, actor, dot: null, s: 1, base: this._c.sepWidth, sep: true});
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
        this._thick = Math.ceil(c.maxPx + c.padV * 2 + c.dotArea);             // eixo transversal
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
        this._placeHotZone(mon, wa);
        this._applyHidden(false);
        Main.layoutManager.uiGroup.set_child_above_sibling(this._tooltip, null);
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
        const [tx, ty] = hide ? this._hideShift() : [0, 0];
        this._hot.visible = hide;
        if (animate) {
            this._container.ease({
                translation_x: tx,
                translation_y: ty,
                duration: 180,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        } else {
            this._container.remove_all_transitions();
            this._container.translation_x = tx;
            this._container.translation_y = ty;
        }
    }

    _setHidden(hidden) {
        if (this._hidden === hidden || (hidden && !this._c.autoHide))
            return;
        this._hidden = hidden;
        if (hidden)
            this._tooltip.hide();
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
        this._hideId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
            if (!this._container || !this._c.autoHide || this._hidden) {
                this._hideId = 0;
                return GLib.SOURCE_REMOVE;
            }
            fora = this._pointerZone().inside ? 0 : fora + 150;
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
        const dotDepth = d0 - 7; // centro do indicador, medido a partir da borda da tela
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
                const f = (it.base * it.s) / max;
                it.actor.set_scale(f, f);
                const [x, y] = this._boxOrigin(a, d0, max);
                it.actor.set_position(x, y);
                it.dot.visible = !!it.app && it.app.get_n_windows() > 0;
                const [dx, dy] = this._point(mid, dotDepth, 6, 6);
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
        this._tickId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this._c.frameMs, () => {
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
                const target = inside ? 1 + (c.maxScale - 1) * Math.exp(-(d * d) / (2 * sigma * sigma)) : 1;
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

// Gerenciador: carrega configuração e CSS uma vez e cria uma doca por tela conforme a opção "monitores".
export class Dock {
    enable() {
        this._signals = [];
        this._views = [];
        this._settings = this._loadSettings();
        this._loadThemeCss();

        this._connect(Main.layoutManager, 'monitors-changed', () => this._buildViews());
        if (this._settings)
            this._connect(this._settings, 'changed::monitores', () => this._buildViews());
        this._buildViews();
    }

    disable() {
        for (const [obj, id] of this._signals)
            obj.disconnect(id);
        this._signals = [];
        this._destroyViews();
        this._unloadThemeCss();
        this._settings = null;
    }

    _connect(obj, name, cb) {
        this._signals.push([obj, obj.connect(name, cb)]);
    }

    _buildViews() {
        this._destroyViews();
        const todas = this._settings?.get_string('monitores') === 'todas';
        const idxs = todas
            ? Main.layoutManager.monitors.map((_m, i) => i)
            : [Main.layoutManager.primaryIndex];
        for (const i of idxs) {
            const view = new DockView(this._settings, i);
            view.enable();
            this._views.push(view);
        }
    }

    _destroyViews() {
        for (const v of this._views ?? [])
            v.disable();
        this._views = [];
    }

    _dir() {
        return Gio.File.new_for_uri(import.meta.url.split('?')[0]).get_parent();
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
        this._theme.load_stylesheet(this._themeCss);
    }

    _unloadThemeCss() {
        if (this._theme && this._themeCss)
            this._theme.unload_stylesheet(this._themeCss);
        this._theme = this._themeCss = null;
    }
}
