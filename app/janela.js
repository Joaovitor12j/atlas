// Janela "Palco": cabeçalho, prévia ao vivo fixa no topo, abas com busca e o conteúdo da aba.
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {criarAmbientes} from './ambientes.js';
import {criarAparencia} from './aparencia.js';
import {criarMascotes} from './mascotes.js';
import {criarWidgets} from './widgets.js';
import {Paginas} from './paginas.js';
import {criarPalco} from './previa.js';

const PRESERVAR_AO_RESTAURAR = ['ambientes', 'ambiente-atual'];

// Mostra só o que casa com `q` (texto minúsculo) e devolve quantas linhas/cartões ficaram visíveis.
function filtrar(w, q, forcar = false) {
    let n = 0;
    if (w instanceof Adw.PreferencesGroup) {
        const proprio = `${w.title} ${w.description}`.toLowerCase().includes(q);
        for (let f = w.get_first_child(); f; f = f.get_next_sibling())
            n += filtrar(f, q, forcar || proprio);
        w.visible = !q || proprio || n > 0;
        return q && proprio && n === 0 ? 1 : n;
    }
    if (w instanceof Adw.PreferencesRow) {
        const texto = `${w.title} ${w.subtitle ?? ''}`.toLowerCase();
        w.visible = !q || forcar || texto.includes(q);
        return w.visible ? 1 : 0;
    }
    for (let f = w.get_first_child(); f; f = f.get_next_sibling())
        n += filtrar(f, q, forcar);
    return n;
}

export function criarJanela(app, settings, paginaInicial) {
    const win = new Adw.ApplicationWindow({application: app, title: 'ATLAS', default_width: 1120, default_height: 860});
    win.set_size_request(760, 600);
    const p = new Paginas();
    const abas = [
        {id: 'aparencia', titulo: 'Aparência', icone: 'weather-clear-symbolic', page: criarAparencia(settings, p)},
        {id: 'ambientes', titulo: 'Ambientes', icone: 'view-grid-symbolic', page: criarAmbientes(settings, p, win)},
        {id: 'widgets', titulo: 'Widgets', icone: 'list-add-symbolic', page: criarWidgets(settings, p)},
        {id: 'mascotes', titulo: 'Mascotes', icone: 'face-smile-symbolic', page: criarMascotes(settings, p, win)},
    ];

    // Cabeçalho
    const marca = new Gtk.Box({spacing: 10, valign: Gtk.Align.CENTER});
    marca.append(new Gtk.Label({label: 'A', halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER, css_classes: ['atlas-marca-icone'], width_request: 20, height_request: 20}));
    marca.append(new Gtk.Label({label: 'ATLAS', css_classes: ['atlas-marca']}));
    const cabecalho = new Adw.HeaderBar({title_widget: marca});
    const restaurar = new Gtk.Button({label: 'Restaurar padrões', css_classes: ['atlas-fantasma']});
    cabecalho.pack_end(restaurar);
    restaurar.connect('clicked', () => {
        const d = new Adw.AlertDialog({heading: 'Restaurar padrões?', body: 'As opções visuais e de comportamento voltam ao original. Seus ambientes são mantidos.'});
        d.add_response('cancelar', 'Cancelar');
        d.add_response('restaurar', 'Restaurar');
        d.set_response_appearance('restaurar', Adw.ResponseAppearance.DESTRUCTIVE);
        d.connect('response', (_d, r) => {
            if (r !== 'restaurar')
                return;
            for (const key of settings.settings_schema.list_keys())
                if (!PRESERVAR_AO_RESTAURAR.includes(key))
                    settings.reset(key);
        });
        d.present(win);
    });

    // Conteúdo da aba (com a mensagem de busca vazia)
    const pilha = new Gtk.Stack({transition_type: Gtk.StackTransitionType.CROSSFADE, vexpand: true});
    for (const a of abas)
        pilha.add_named(a.page, a.id);
    const vazio = new Gtk.Label({css_classes: ['atlas-vazio'], visible: false, valign: Gtk.Align.START});
    const conteudo = new Gtk.Overlay({child: pilha});
    conteudo.add_overlay(vazio);

    // Abas e busca
    const barra = new Gtk.Box({spacing: 4, css_classes: ['atlas-abas']});
    const botoes = abas.map(a => {
        const b = new Gtk.ToggleButton({css_classes: ['atlas-aba']});
        const c = new Gtk.Box({spacing: 8});
        c.append(new Gtk.Image({icon_name: a.icone}));
        c.append(new Gtk.Label({label: a.titulo}));
        b.child = c;
        barra.append(b);
        return b;
    });
    botoes.slice(1).forEach(b => b.set_group(botoes[0]));
    barra.append(new Gtk.Box({hexpand: true}));
    const busca = new Gtk.SearchEntry({placeholder_text: 'Buscar opção', css_classes: ['atlas-busca'], valign: Gtk.Align.CENTER});
    barra.append(busca);

    let atual = abas[0];
    const aplicarBusca = () => {
        const q = busca.text.trim().toLowerCase();
        const n = atual._filtrar ? atual.page._filtrar(q) : filtrar(atual.page, q);
        vazio.visible = q.length > 0 && n === 0;
        vazio.label = `Nada encontrado para “${busca.text.trim()}”. Tente outro termo.`;
    };
    const ir = id => {
        const alvo = abas.find(a => a.id === (id === 'dock' ? 'aparencia' : id)) ?? abas[0];
        atual = alvo;
        atual._filtrar = typeof alvo.page._filtrar === 'function';
        pilha.visible_child_name = alvo.id;
        const b = botoes[abas.indexOf(alvo)];
        if (!b.active)
            b.active = true;
        aplicarBusca();
    };
    botoes.forEach((b, i) => b.connect('toggled', () => {
        if (b.active)
            ir(abas[i].id);
    }));
    busca.connect('search-changed', aplicarBusca);

    const corpo = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
    corpo.append(criarPalco(settings));
    corpo.append(barra);
    corpo.append(conteudo);
    const vista = new Adw.ToolbarView({content: corpo});
    vista.add_top_bar(cabecalho);
    win.content = vista;

    ir(paginaInicial ?? abas[0].id);
    return {win, ir};
}
