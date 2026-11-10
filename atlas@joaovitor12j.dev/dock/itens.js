// Itens da doca: apps, widgets, coleções, seletor de ambiente e botão de apps (criação e animação).
// Mistura de métodos em DockView (ver `misturar` em dock/mixin.js): usa o estado da doca (this._c, this._items...).
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {fracaoIcone} from '../temas/decoracao/index.js';
import {desenharIndicador} from '../temas/decoracao/indicador.js';
import {desenharTile} from '../temas/decoracao/tile.js';
import {criarWidget} from '../widgets/index.js';

// Ponto de ancoragem (pivô) da ampliação: o ícone cresce a partir da borda da tela.
const PIVOT = {baixo: [0, 1], esquerda: [0, 0], direita: [1, 0]};

export class ItensDoca {
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
}
