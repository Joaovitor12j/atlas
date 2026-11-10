// Widget Área de transferência: histórico e itens fixados.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {agendar} from '../../nucleo/perf.js';
import {AL, CFG, linha, Widget} from '../base.js';
import {registrarCopia, resumirTexto} from './logica.js';

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

export class AreaTransferencia extends Widget {
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
