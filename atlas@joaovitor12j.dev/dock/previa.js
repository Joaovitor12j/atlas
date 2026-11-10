// Prévia de janelas (miniaturas ao passar o mouse num app aberto).
// Mistura de métodos em DockView (ver `misturar` em dock/mixin.js): usa o estado da doca (this._c, this._items...).
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {agendar} from '../nucleo/perf.js';

const THUMB_W = 200;   // miniatura da prévia de janela
const THUMB_H = 125;

export class PreviaJanelas {
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
}
