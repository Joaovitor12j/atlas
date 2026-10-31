// Casca da janela: barra lateral com a marca e as seções, conteúdo à direita (Adw.NavigationSplitView).
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {Paginas} from './paginas.js';
import {lerVersao} from './config.js';

const SITE = 'https://atlas-dock-sage.vercel.app';

export function criarJanela(app, settings, paginaInicial) {
    const win = new Adw.ApplicationWindow({application: app, title: 'ATLAS', default_width: 980, default_height: 720});
    const secoes = [...new Paginas().criar(win, settings), secaoSobre()];

    const split = new Adw.NavigationSplitView({min_sidebar_width: 200, max_sidebar_width: 240});
    const conteudo = new Adw.NavigationPage({title: 'ATLAS', tag: 'conteudo'});
    const tituloConteudo = new Adw.WindowTitle({title: ''});
    const pilha = new Gtk.Stack({transition_type: Gtk.StackTransitionType.CROSSFADE, css_classes: ['atlas-conteudo']});
    for (const s of secoes)
        pilha.add_named(s.page, s.id);

    const barraConteudo = new Adw.HeaderBar({title_widget: tituloConteudo, show_title: true});
    const vistaConteudo = new Adw.ToolbarView({content: pilha});
    vistaConteudo.add_top_bar(barraConteudo);
    conteudo.child = vistaConteudo;
    split.content = conteudo;

    const lista = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.SINGLE, css_classes: ['navigation-sidebar']});
    for (const s of secoes) {
        const linha = new Adw.ActionRow({title: s.titulo, activatable: true});
        linha.add_prefix(new Gtk.Image({icon_name: s.icone}));
        linha._id = s.id;
        lista.append(linha);
    }
    const ir = id => {
        const s = secoes.find(x => x.id === id) ?? secoes[0];
        pilha.visible_child_name = s.id;
        tituloConteudo.title = s.titulo;
        let i = 0;
        for (let l = lista.get_row_at_index(i); l; l = lista.get_row_at_index(++i))
            if (l._id === s.id)
                lista.select_row(l);
        split.show_content = true;
    };
    lista.connect('row-selected', (_l, linha) => {
        if (linha)
            ir(linha._id);
    });

    const marca = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 10, css_classes: ['atlas-marca']});
    marca.append(new Gtk.Image({icon_name: 'dev.joaovitor12j.Atlas', pixel_size: 36}));
    const nomes = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, valign: Gtk.Align.CENTER});
    nomes.append(new Gtk.Label({label: 'ATLAS', xalign: 0, css_classes: ['atlas-marca-nome']}));
    nomes.append(new Gtk.Label({label: `v${lerVersao()}`, xalign: 0, css_classes: ['atlas-marca-versao']}));
    marca.append(nomes);

    const lateral = new Adw.NavigationPage({title: 'ATLAS', tag: 'lateral'});
    const caixa = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, css_classes: ['atlas-lateral']});
    caixa.append(marca);
    caixa.append(new Gtk.ScrolledWindow({child: lista, vexpand: true, hscrollbar_policy: Gtk.PolicyType.NEVER}));
    lateral.child = caixa;
    split.sidebar = lateral;

    // Abaixo de ~640 px a barra lateral recolhe e vira uma página à parte.
    const bp = new Adw.Breakpoint({condition: Adw.BreakpointCondition.parse('max-width: 640sp')});
    bp.add_setter(split, 'collapsed', true);
    win.add_breakpoint(bp);
    win.set_size_request(360, 400);
    win.content = split;

    ir(paginaInicial ?? secoes[0].id);
    return {win, ir};
}

function secaoSobre() {
    const page = new Adw.PreferencesPage();
    const g = new Adw.PreferencesGroup({title: 'ATLAS', description: 'Ambientes, Tarefas, Lançadores, Aplicativos e Sistema.'});
    page.add(g);
    g.add(new Adw.ActionRow({title: 'Versão', subtitle: lerVersao()}));
    g.add(new Adw.ActionRow({title: 'Compatibilidade', subtitle: 'Testado só no GNOME Shell 46'}));
    const site = new Adw.ActionRow({title: 'Página do projeto', subtitle: SITE, activatable: true});
    site.add_suffix(new Gtk.Image({icon_name: 'adw-external-link-symbolic'}));
    site.connect('activated', () => Gtk.show_uri(null, SITE, 0));
    g.add(site);
    return {id: 'sobre', titulo: 'Sobre', icone: 'help-about-symbolic', page};
}
