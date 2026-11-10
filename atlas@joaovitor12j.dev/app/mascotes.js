// Aba Mascotes: cartões em duas colunas por categoria, com o desenho do mascote, Testar e interruptor.
// As opções de cada um (horários, limites, movimentos) abrem num diálogo pelo botão de engrenagem.
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import {CATEGORIAS_MASCOTE, MASCOTES} from '../nucleo/catalogo.js';
import {retanguloArredondado} from './previa.js';

export function criarMascotes(settings, p, win) {
    const {miniaturas, opcoes} = p._mascotesDados(settings);
    const itens = []; // cartões de mascote, para a busca

    const principal = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, css_classes: ['atlas-cartao']});
    principal.append(new Gtk.Label({label: 'Mascotes', xalign: 0, css_classes: ['atlas-cartao-titulo']}));
    principal.append(new Gtk.Label({
        label: 'Aparecem sozinhos na doca, em horas, datas e eventos certos. Desligados, não gastam nada. Não aparecem com a doca escondida, no Overview nem com o Não perturbe ligado.',
        xalign: 0, wrap: true, css_classes: ['atlas-cartao-sub'],
    }));

    // Mascote residente: mora na doca do tema atual (ex.: água-viva no Aurora); sem lista própria, é um interruptor só.
    const linhaResidente = new Gtk.Box({spacing: 12, margin_top: 10});
    linhaResidente.append(new Gtk.Label({
        label: 'Mascote residente do tema', xalign: 0, hexpand: true, css_classes: ['atlas-w-nome'],
    }));
    const swResidente = new Gtk.Switch({valign: Gtk.Align.CENTER});
    settings.bind('mascote-residente-ativo', swResidente, 'active', Gio.SettingsBindFlags.DEFAULT);
    linhaResidente.append(swResidente);
    principal.append(linhaResidente);
    principal.append(new Gtk.Label({
        label: 'Alguns temas (ex.: Aurora) trazem um mascote que mora na doca e não sai; este interruptor liga e desliga ele, separado dos mascotes por horário/data/evento abaixo.',
        xalign: 0, wrap: true, css_classes: ['atlas-cartao-sub'], margin_bottom: 6,
    }));

    // Efeito de época: campo de partículas do tema (neve, brilhos, etc.), ligado por padrão nos temas que têm.
    const linhaEfeito = new Gtk.Box({spacing: 12, margin_top: 4});
    linhaEfeito.append(new Gtk.Label({
        label: 'Efeito de época do tema', xalign: 0, hexpand: true, css_classes: ['atlas-w-nome'],
    }));
    const swEfeito = new Gtk.Switch({valign: Gtk.Align.CENTER});
    settings.bind('efeito-epoca-ativo', swEfeito, 'active', Gio.SettingsBindFlags.DEFAULT);
    linhaEfeito.append(swEfeito);
    principal.append(linhaEfeito);
    principal.append(new Gtk.Label({
        label: 'Temas de pacote trazem um efeito animado no vidro da doca (vagalumes, estrelas, pétalas, gotas de chuva, neve, luzinhas, brilhos); este interruptor desliga o efeito, mantendo o resto do tema.',
        xalign: 0, wrap: true, css_classes: ['atlas-cartao-sub'], margin_bottom: 6,
    }));

    const ligados = () => settings.get_strv('mascotes-ativos');

    const abrirOpcoes = (id, nome) => {
        const dlg = new Adw.Dialog({title: nome, content_width: 520, content_height: 600});
        const pagina = new Adw.PreferencesPage();
        const grupo = new Adw.PreferencesGroup();
        pagina.add(grupo);
        opcoes[id]?.({add_row: r => grupo.add(r)});
        const vista = new Adw.ToolbarView({content: pagina});
        vista.add_top_bar(new Adw.HeaderBar());
        dlg.child = vista;
        dlg.present(win);
    };

    const item = ([id, nome, desc]) => {
        const box = new Gtk.Box({spacing: 12, css_classes: ['atlas-masc']});
        const tile = new Gtk.DrawingArea({content_width: 52, content_height: 52, valign: Gtk.Align.CENTER});
        tile.set_draw_func((_a, cr, w, h) => {
            retanguloArredondado(cr, 0, 0, w, h, 12);
            cr.setSourceRGBA(0.047, 0.102, 0.129, 1);
            cr.fill();
            cr.save();
            cr.translate(w * 0.1, h * 0.1);
            miniaturas[id]?.(cr, w * 0.8, h * 0.8);
            cr.restore();
        });
        box.append(tile);

        const textos = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, valign: Gtk.Align.CENTER, hexpand: true});
        textos.append(new Gtk.Label({label: nome, xalign: 0, css_classes: ['atlas-w-nome']}));
        textos.append(new Gtk.Label({label: desc, xalign: 0, wrap: true, lines: 2, ellipsize: 3, css_classes: ['atlas-w-desc'], tooltip_text: desc}));
        box.append(textos);

        if (opcoes[id]) {
            const eng = new Gtk.Button({icon_name: 'emblem-system-symbolic', tooltip_text: 'Opções', valign: Gtk.Align.CENTER, css_classes: ['flat', 'circular']});
            eng.connect('clicked', () => abrirOpcoes(id, nome));
            box.append(eng);
        }
        const testar = new Gtk.Button({label: 'Testar', valign: Gtk.Align.CENTER, css_classes: ['atlas-testar']});
        testar.connect('clicked', () => settings.set_string('mascote-teste', `${id}:${GLib.get_monotonic_time()}`));
        box.append(testar);

        const sw = new Gtk.Switch({valign: Gtk.Align.CENTER, active: ligados().includes(id)});
        sw.connect('notify::active', () => {
            const lista = ligados().filter(x => x !== id);
            if (sw.active)
                lista.push(id);
            settings.set_strv('mascotes-ativos', lista);
        });
        settings.connect('changed::mascotes-ativos', () => {
            const on = ligados().includes(id);
            if (sw.active !== on)
                sw.active = on;
        });
        box.append(sw);
        box._texto = `${nome} ${desc}`.toLowerCase();
        itens.push(box);
        return box;
    };

    const secoes = [];
    for (const [catId, titulo] of CATEGORIAS_MASCOTE) {
        const daCategoria = MASCOTES.filter(m => m[3] === catId);
        if (!daCategoria.length)
            continue;
        const rotulo = new Gtk.Label({label: titulo.toUpperCase(), xalign: 0, css_classes: ['atlas-caps']});
        const grade = new Gtk.Grid({column_spacing: 10, row_spacing: 10, column_homogeneous: true});
        daCategoria.forEach((m, i) => grade.attach(item(m), i % 2, Math.floor(i / 2), 1, 1));
        principal.append(rotulo);
        principal.append(grade);
        secoes.push([rotulo, grade]);
    }

    const corpo = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, css_classes: ['atlas-corpo']});
    corpo.append(principal);
    const rolagem = new Gtk.ScrolledWindow({child: corpo, hscrollbar_policy: Gtk.PolicyType.NEVER, vexpand: true});
    rolagem._filtrar = q => {
        let n = 0;
        for (const it of itens) {
            it.visible = !q || it._texto.includes(q);
            n += it.visible ? 1 : 0;
        }
        for (const [rotulo, grade] of secoes) {
            let alguma = false;
            for (let f = grade.get_first_child(); f; f = f.get_next_sibling())
                alguma = alguma || f.visible;
            rotulo.visible = grade.visible = alguma;
        }
        return n;
    };
    return rolagem;
}
