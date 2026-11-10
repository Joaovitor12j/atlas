// Menus de clique direito da doca (do app, do ATLAS e dos ambientes) e ativação de apps.
// Mistura de métodos em DockView (ver `misturar` em dock/mixin.js): usa o estado da doca (this._c, this._items...).
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {lerAmbientes, ambienteAtual} from '../ambientes/acoes.js';
import {TEMAS} from '../temas/catalogo.js';
import {definirAutoTodas, todasAuto} from './telas.js';

export class MenusDoca {
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
}

// Conteúdo do menu do ATLAS, usado no ícone do painel e no clique direito na doca.
export function preencherMenu(menu, st, abrirPrefs, ocultarIcone) {
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
