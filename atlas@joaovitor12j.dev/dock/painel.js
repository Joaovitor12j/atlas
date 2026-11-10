// A doca convive com o painel do GNOME: esconde o dock original (Overview) e põe o ícone/menu do ATLAS no painel.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {preencherMenu} from './menus.js';

export class PainelShell {
    // `dir`: pasta da extensão (de onde vem o ícone); `abrirPrefs`: abre o app de configuração.
    constructor(settings, dir, abrirPrefs) {
        this._settings = settings;
        this._dir = dir;
        this._abrirPrefs = abrirPrefs;
        this._dashHidden = false;
        this._indicator = null;
        this._indicatorIdleId = 0;
    }

    // O dock original do GNOME (no Overview) fica escondido enquanto o ATLAS ocupa o lugar dele.
    sincronizarDash() {
        const quer = this._settings?.get_boolean('no-overview') ?? true;
        if (quer)
            this._hideDash();
        else
            this._restoreDash();
    }

    // Ícone no painel superior (some pela opção "Mostrar o ícone do ATLAS no painel").
    sincronizarIcone() {
        const quer = this._settings?.get_boolean('mostrar-icone-painel') ?? true;
        if (quer && !this._indicator) {
            const ind = new PanelMenu.Button(0.5, 'ATLAS', false);
            const icone = this._dir.get_child('icons').get_child('atlas-symbolic.svg');
            ind.add_child(new St.Icon({gicon: new Gio.FileIcon({file: icone}), style_class: 'system-status-icon'}));
            // O menu precisa ter itens antes de abrir: preenche agora e refaz a cada fechamento
            // (ambiente, tema e auto-ocultar mudam o conteúdo).
            const encher = () => {
                ind.menu.removeAll();
                preencherMenu(ind.menu, this._settings, this._abrirPrefs, true);
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

    // Devolve o painel ao que era (desativar a extensão).
    restaurar() {
        this._restoreDash();
        this._destroyIndicator();
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

    _destroyIndicator() {
        if (this._indicatorIdleId) {
            GLib.source_remove(this._indicatorIdleId);
            this._indicatorIdleId = 0;
        }
        this._indicator?.destroy();
        this._indicator = null;
    }
}
