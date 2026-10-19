// Doca: dock com lente de ampliação para GNOME Shell (Wayland/X11).
// Mutter não aceita layer-shell, então o dock é um actor "chrome" desenhado pelo próprio Shell.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';

const CONFIG = {
    iconSize: 52,       // tamanho base do ícone (px)
    maxScale: 1.75,     // ampliação máxima sob o ponteiro
    lensWidth: 70,      // largura (sigma) da lente, em px
    gap: 8,             // espaço entre ícones
    padH: 14,           // margem horizontal do vidro
    padV: 10,           // margem vertical do vidro
    bottomMargin: 8,    // distância da borda inferior da tela
    dotArea: 8,         // faixa abaixo dos ícones para o indicador de app aberto
    sepWidth: 14,       // largura do separador favoritos | abertos
    smoothing: 0.35,    // 0..1, fração do caminho percorrida por quadro
    frameMs: 16,
};

export class Dock {
    enable() {
        this._items = [];
        this._signals = [];
        this._hovering = false;
        this._tickId = 0;
        this._rebuildId = 0;

        this._settings = this._loadSettings();
        this._tooltip = new St.Label({style_class: 'doca-tooltip', visible: false});
        Main.layoutManager.addTopChrome(this._tooltip);

        this._container = new St.Widget({reactive: false});
        this._bg = new St.Widget({style_class: 'doca-bg', reactive: true, track_hover: true});
        this._container.add_child(this._bg);
        Main.layoutManager.addChrome(this._container, {
            affectsStruts: false,
            trackFullscreen: true,
        });

        this._container.connect('captured-event', (_actor, event) => {
            const t = event.type();
            if (t === Clutter.EventType.MOTION || t === Clutter.EventType.ENTER)
                this._startTick();
            return Clutter.EVENT_PROPAGATE;
        });

        const apps = Shell.AppSystem.get_default();
        const favs = AppFavorites.getAppFavorites();
        this._connect(apps, 'app-state-changed', () => this._queueRebuild());
        this._connect(apps, 'installed-changed', () => this._queueRebuild());
        this._connect(favs, 'changed', () => this._queueRebuild());
        this._connect(Main.layoutManager, 'monitors-changed', () => this._queueRebuild());
        this._connect(Main.overview, 'showing', () => { this._container.hide(); this._tooltip.hide(); });
        this._connect(Main.overview, 'hiding', () => this._container.show());
        this._connect(global.display, 'window-created', () => this._queueRebuild());

        if (this._settings)
            this._connect(this._settings, 'changed::tema', () => this._applyTheme());
        this._applyTheme();

        this._rebuild();
        console.log(`[doca] ativo: ${this._items.length} itens, container ${this._cw}x${this._ch}`);
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
        for (const [obj, id] of this._signals)
            obj.disconnect(id);
        this._signals = [];
        this._bg?.remove_effect_by_name('atlas-blur');
        this._settings = null;
        this._container?.destroy();
        this._tooltip?.destroy();
        this._container = this._bg = this._tooltip = null;
        this._items = [];
    }

    // Lê o schema da pasta da própria extensão (sem precisar instalá-lo no sistema).
    _loadSettings() {
        try {
            const dir = Gio.File.new_for_uri(import.meta.url.split('?')[0]).get_parent();
            const src = Gio.SettingsSchemaSource.new_from_directory(
                dir.get_child('schemas').get_path(), Gio.SettingsSchemaSource.get_default(), false);
            return new Gio.Settings({settings_schema: src.lookup('org.gnome.shell.extensions.atlas', true)});
        } catch (e) {
            console.error(`[atlas] sem GSettings, usando tema padrão: ${e}`);
            return null;
        }
    }

    _applyTheme() {
        const tema = this._settings?.get_string('tema') ?? 'noite';
        this._container.style_class = `atlas-${tema}`;
        this._tooltip.style_class = `doca-tooltip atlas-${tema}`;
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
        this._applyScales(true);
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
        const max = Math.ceil(CONFIG.iconSize * CONFIG.maxScale);
        const icon = new St.Icon({gicon, icon_size: max});
        const btn = new St.Button({
            style_class: 'doca-item',
            child: icon,
            reactive: true,
            track_hover: true,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.TWO,
        });
        btn.set_size(max, max);
        btn.set_pivot_point(0, 1);
        this._container.add_child(btn);

        const dot = new St.Widget({style_class: 'doca-dot'});
        dot.set_size(6, 6);
        this._container.add_child(dot);

        const item = {key, app, actor: btn, dot, s: old.get(key) ?? 1, base: CONFIG.iconSize};
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
        const actor = new St.Widget({style_class: 'doca-sep'});
        actor.set_size(2, CONFIG.iconSize * 0.7);
        this._container.add_child(actor);
        this._items.push({app: null, actor, dot: null, s: 1, base: CONFIG.sepWidth, sep: true});
    }

    _activate(app, button) {
        const ctrl = (Clutter.get_current_event()?.get_state() ?? 0) & Clutter.ModifierType.CONTROL_MASK;
        if (app.get_n_windows() === 0 || button === Clutter.BUTTON_MIDDLE || ctrl)
            app.open_new_window(-1);
        else
            app.activate();
        Main.overview.hide();
    }

    // Tamanho do container (cabe a lente toda) e posição na tela.
    _layoutGeometry() {
        const mon = Main.layoutManager.primaryMonitor;
        const n = this._items.length;
        const baseW = this._items.reduce((w, i) => w + i.base, 0) + CONFIG.gap * Math.max(0, n - 1);
        const growth = CONFIG.iconSize * (CONFIG.maxScale - 1) * 3.2; // sobra horizontal máxima da lente
        this._cw = Math.ceil(baseW + growth + CONFIG.padH * 2);
        const maxH = CONFIG.iconSize * CONFIG.maxScale;
        this._ch = Math.ceil(maxH + CONFIG.padV * 2 + CONFIG.dotArea);
        this._baseline = this._ch - CONFIG.padV - CONFIG.dotArea; // y da base dos ícones

        this._container.set_size(this._cw, this._ch);
        this._container.set_position(
            Math.round(mon.x + (mon.width - this._cw) / 2),
            Math.round(mon.y + mon.height - this._ch - CONFIG.bottomMargin));
        // keep tooltip above everything else
        Main.layoutManager.uiGroup.set_child_above_sibling(this._tooltip, null);
    }

    // Posiciona cada ícone conforme sua escala; o vidro acompanha a largura total.
    _applyScales() {
        const max = Math.ceil(CONFIG.iconSize * CONFIG.maxScale);
        const widths = this._items.map(i => i.sep ? i.base : i.base * i.s);
        const total = widths.reduce((a, b) => a + b, 0) + CONFIG.gap * Math.max(0, widths.length - 1);
        let x = (this._cw - total) / 2;
        const B = this._baseline;

        this._items.forEach((it, idx) => {
            const w = widths[idx];
            if (it.sep) {
                it.actor.set_position(Math.round(x + w / 2 - 1), Math.round(B - CONFIG.iconSize * 0.85));
            } else {
                const f = (it.base * it.s) / max;
                it.actor.set_scale(f, f);
                it.actor.set_position(Math.round(x), Math.round(B - max));
                const running = !!it.app && it.app.get_n_windows() > 0;
                it.dot.visible = running;
                it.dot.set_position(Math.round(x + w / 2 - 3), Math.round(B + 4));
            }
            x += w + CONFIG.gap;
        });

        const bgX = (this._cw - total) / 2 - CONFIG.padH;
        const bgTop = B - CONFIG.iconSize - CONFIG.padV;
        this._bg.set_position(Math.round(bgX), Math.round(bgTop));
        this._bg.set_size(Math.round(total + CONFIG.padH * 2),
            Math.round(CONFIG.iconSize + CONFIG.padV * 2 + CONFIG.dotArea));
    }

    _pointerZone() {
        const [cx, cy] = this._container.get_transformed_position();
        const [px, py] = global.get_pointer();
        const lensH = CONFIG.iconSize * (CONFIG.maxScale - 1);
        const top = cy + this._baseline - CONFIG.iconSize - CONFIG.padV - lensH;
        const inside = px >= cx && px <= cx + this._cw && py >= top && py <= cy + this._ch;
        return {inside, px: px - cx};
    }

    _startTick() {
        if (this._tickId)
            return;
        this._tickId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, CONFIG.frameMs, () => {
            if (!this._container)
                return GLib.SOURCE_REMOVE;
            const {inside, px} = this._pointerZone();
            const sigma = CONFIG.lensWidth;
            const max = CONFIG.maxScale;

            // centro de cada item sem ampliação, para a lente não "fugir" do ponteiro
            const widths = this._items.map(i => i.base);
            const total = widths.reduce((a, b) => a + b, 0) + CONFIG.gap * Math.max(0, widths.length - 1);
            let x = (this._cw - total) / 2;
            let moving = false;

            this._items.forEach((it, idx) => {
                const center = x + widths[idx] / 2;
                x += widths[idx] + CONFIG.gap;
                if (it.sep)
                    return;
                const d = px - center;
                const target = inside ? 1 + (max - 1) * Math.exp(-(d * d) / (2 * sigma * sigma)) : 1;
                const diff = target - it.s;
                if (Math.abs(diff) > 0.003) {
                    it.s += diff * CONFIG.smoothing;
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
        const [w] = this._hoverItem.actor.get_transformed_size();
        const [tw] = this._tooltip.get_size();
        this._tooltip.set_position(Math.round(x + w / 2 - tw / 2), Math.round(y - this._tooltip.height - 8));
    }
}
