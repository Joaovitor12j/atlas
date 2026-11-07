// Aba Aparência: seletores visuais em cartões (tema, posição, ícones e lente, detalhes, comportamento).
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {PACOTES, TEMAS} from '../catalogo.js';
import {appsDaPrevia, desenharMiniDoca, retanguloArredondado} from './previa.js';

function cor(cr, css) {
    const c = new Gdk.RGBA();
    c.parse(css);
    cr.setSourceRGBA(c.red, c.green, c.blue, c.alpha);
}

// Cartão com título e frase de apoio; `_texto` alimenta a busca.
export function cartao(titulo, sub, ...filhos) {
    const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 0, css_classes: ['atlas-cartao']});
    box.append(new Gtk.Label({label: titulo, xalign: 0, css_classes: ['atlas-cartao-titulo']}));
    if (sub)
        box.append(new Gtk.Label({label: sub, xalign: 0, wrap: true, css_classes: ['atlas-cartao-sub']}));
    for (const f of filhos)
        box.append(f);
    box._texto = `${titulo} ${sub ?? ''} ${filhos.map(f => f._texto ?? '').join(' ')}`.toLowerCase();
    return box;
}

// Botões lado a lado ligados a uma chave string.
function segmentado(settings, key, opcoes) {
    const box = new Gtk.Box({css_classes: ['atlas-seg'], spacing: 2, homogeneous: true});
    const botoes = opcoes.map(([valor, nome]) => {
        const b = new Gtk.ToggleButton({label: nome});
        b.connect('toggled', () => {
            if (b.active)
                settings.set_string(key, valor);
        });
        box.append(b);
        return [valor, b];
    });
    botoes.slice(1).forEach(([, b]) => b.set_group(botoes[0][1]));
    const sync = () => {
        const v = settings.get_string(key);
        for (const [valor, b] of botoes)
            if (b.active !== (valor === v))
                b.active = valor === v;
    };
    sync();
    settings.connect(`changed::${key}`, sync);
    box._texto = opcoes.map(o => o[1]).join(' ').toLowerCase();
    return box;
}

// Rótulo + controle numa linha; `ctl` ocupa o espaço que sobra.
function linha(rotulo, ctl, valor) {
    const box = new Gtk.Box({spacing: 12, margin_top: 10});
    box.append(new Gtk.Label({label: rotulo, xalign: 0, css_classes: ['atlas-rotulo'], width_request: 190}));
    ctl.hexpand = true;
    box.append(ctl);
    if (valor)
        box.append(valor);
    box._texto = rotulo.toLowerCase();
    return box;
}

function escala(settings, key, min, max, passo, digitos, formato) {
    const adj = new Gtk.Adjustment({lower: min, upper: max, step_increment: passo, page_increment: passo * 5});
    settings.bind(key, adj, 'value', Gio.SettingsBindFlags.DEFAULT);
    const s = new Gtk.Scale({orientation: Gtk.Orientation.HORIZONTAL, adjustment: adj, draw_value: false, digits: digitos});
    const v = new Gtk.Label({xalign: 1, css_classes: ['atlas-valor']});
    const att = () => {
        v.label = formato(adj.value);
    };
    adj.connect('value-changed', att);
    att();
    return [s, v];
}

function miniaturaTema(settings, id) {
    const a = new Gtk.DrawingArea({content_width: 150, content_height: 78, hexpand: true});
    a.set_draw_func((_a, cr, w, h) => desenharMiniDoca(cr, w, h, id, appsDaPrevia(settings)));
    return a;
}

// Temas dos pacotes Pixel, Materiais e Natal (2026-11-01): ganham a badge "novo" no seletor.
const TEMAS_NOVOS = new Set(['vila', 'floresta', 'lua', 'praia', 'aurora', 'carta', 'jardim', 'chuva', 'nevepixel', 'nevemat', 'vitrine', 'brasileiro']);

// Um tema do catálogo vira botão com miniatura, nome (+ badge "novo") e descrição.
function botaoTema(settings, [id, nome, desc]) {
    const b = new Gtk.ToggleButton({css_classes: ['atlas-tema'], tooltip_text: nome});
    const col = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 2});
    col.append(miniaturaTema(settings, id));
    const linhaNome = new Gtk.Box({spacing: 6, margin_top: 4});
    linhaNome.append(new Gtk.Label({label: nome, xalign: 0, css_classes: ['atlas-tema-nome'], hexpand: true}));
    if (TEMAS_NOVOS.has(id))
        linhaNome.append(new Gtk.Label({label: 'novo', css_classes: ['atlas-badge-novo']}));
    col.append(linhaNome);
    col.append(new Gtk.Label({label: desc.split(',')[0].replace(/^(Grafite-azulado)/, 'Grafite e coral'), xalign: 0, css_classes: ['atlas-tema-desc'], ellipsize: 3}));
    b.child = col;
    b.connect('toggled', () => {
        if (b.active)
            settings.set_string('tema', id);
    });
    return b;
}

// Um grupo de botões por pacote (PACOTES, catalogo.js), todos no mesmo grupo de seleção (um tema ativo só).
function seletorTema(settings) {
    const caixa = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 12, margin_top: 6});
    const porId = new Map(TEMAS.map(t => [t[0], t]));
    const botoes = [];
    let primeiro = null;
    for (const [, nomePacote, ids] of PACOTES) {
        const temas = ids.map(id => porId.get(id)).filter(Boolean);
        if (!temas.length)
            continue;
        caixa.append(new Gtk.Label({label: nomePacote.toUpperCase(), xalign: 0, css_classes: ['atlas-caps']}));
        const grade = new Gtk.Grid({column_spacing: 10, row_spacing: 10, column_homogeneous: true});
        temas.forEach((tema, i) => {
            const b = botaoTema(settings, tema);
            if (primeiro)
                b.set_group(primeiro);
            else
                primeiro = b;
            grade.attach(b, i % 3, Math.floor(i / 3), 1, 1);
            botoes.push([tema[0], b]);
        });
        caixa.append(grade);
    }
    const sync = () => {
        for (const [id, b] of botoes)
            b.active = id === settings.get_string('tema');
    };
    sync();
    settings.connect('changed::tema', sync);
    caixa._texto = TEMAS.map(t => `${t[1]} ${t[2]}`).join(' ').toLowerCase();
    return caixa;
}

function miniTela(settings) {
    const a = new Gtk.DrawingArea({content_width: 230, content_height: 130, halign: Gtk.Align.CENTER, margin_top: 6, margin_bottom: 10});
    a.set_draw_func((_a, cr, w, h) => {
        retanguloArredondado(cr, 1, 1, w - 2, h - 2, 12);
        cor(cr, '#0c1a1f');
        cr.fillPreserve();
        cor(cr, '#31565f');
        cr.setLineWidth(2);
        cr.stroke();
        cr.selectFontFace('Sans', 0, 0);
        cr.setFontSize(11);
        cor(cr, '#6b8a8c');
        const e = cr.textExtents('tela');
        cr.moveTo((w - e.width) / 2, h / 2 + 4);
        cr.showText('tela');
        cor(cr, '#ff6b4a');
        const pos = settings.get_string('posicao');
        if (pos === 'baixo')
            retanguloArredondado(cr, w * 0.25, h - 18, w * 0.5, 7, 3.5);
        else if (pos === 'esquerda')
            retanguloArredondado(cr, 11, h * 0.2, 7, h * 0.6, 3.5);
        else
            retanguloArredondado(cr, w - 18, h * 0.2, 7, h * 0.6, 3.5);
        cr.fill();
    });
    settings.connect('changed::posicao', () => a.queue_draw());
    a._texto = 'tela borda';
    return a;
}

export function criarAparencia(settings, p) {
    const grade = new Gtk.Grid({column_spacing: 16, row_spacing: 16, column_homogeneous: true, css_classes: ['atlas-corpo']});
    const cartoes = [];
    // Coluna da direita: cartões empilhados com a altura natural, sem esticar para acompanhar o Tema.
    const direita = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 16, valign: Gtk.Align.START});
    grade.attach(direita, 7, 0, 5, 1);
    const add = (c, col, lin, larg) => {
        if (col === 7)
            direita.append(c);
        else
            grade.attach(c, col, lin, larg, 1);
        cartoes.push(c);
    };

    add(cartao('Tema', 'A doca muda na prévia acima, na hora.', seletorTema(settings)), 0, 0, 7);

    const [sMargem, vMargem] = escala(settings, 'margem', 0, 60, 1, 0, v => `${Math.round(v)} px`);
    add(cartao('Posição', 'Em que borda da tela a doca fica.', miniTela(settings),
        segmentado(settings, 'posicao', [['esquerda', 'Esquerda'], ['baixo', 'Embaixo'], ['direita', 'Direita']]),
        linha('Margem da borda', sMargem, vMargem)), 7, 0, 5);

    const [sTam, vTam] = escala(settings, 'tamanho-icone', 32, 96, 2, 0, v => `${Math.round(v)} px`);
    const [sForca, vForca] = escala(settings, 'lente-forca', 1, 2.5, 0.05, 2, v => `${v.toFixed(2)}×`);
    const [sLarg, vLarg] = escala(settings, 'lente-largura', 30, 160, 5, 0, v => `${Math.round(v)} px`);
    add(cartao('Ícones e lente', 'Força 1,00 desliga a lente.',
        linha('Tamanho dos ícones', sTam, vTam), linha('Força da lente', sForca, vForca), linha('Largura da lente', sLarg, vLarg)), 7, 1, 5);

    add(cartao('Detalhes', 'Como a doca reage e indica os apps.',
        linha('Indicador de app aberto', segmentado(settings, 'estilo-indicador', [['ponto', 'Ponto'], ['barra', 'Barra'], ['nenhum', 'Nenhum']])),
        linha('Efeito ao passar o mouse', segmentado(settings, 'efeito-hover', [['nenhum', 'Só a lente'], ['brilho', 'Brilho'], ['elevar', 'Sobe']])),
        linha('Animação de abertura', segmentado(settings, 'animacao-abertura', [['nenhuma', 'Nenhuma'], ['deslizar', 'Deslizar'], ['surgir', 'Surgir']]))), 7, 2, 5);

    const lista = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE, css_classes: ['boxed-list']});
    const linhas = [
        p._switch(settings, 'reservar-espaco', 'Reservar espaço', 'Janelas maximizadas terminam acima da doca (não vale com auto-ocultar)'),
        p._switch(settings, 'previa-janelas', 'Prévia de janelas', 'Miniaturas das janelas ao parar o mouse num app aberto'),
        p._switch(settings, 'no-overview', 'ATLAS na tela de aplicativos', 'Mantém a doca visível ao abrir todos os aplicativos e esconde o dock original do GNOME'),
        p._switch(settings, 'mostrar-icone-painel', 'Ícone no painel superior', 'Menu do ATLAS na barra de cima; também dá para ocultar pelo próprio menu'),
        ...p._linhasTelas(settings),
    ];
    for (const l of linhas)
        lista.append(l);
    const comp = cartao('Comportamento', 'Quando a doca aparece e em quais telas.', lista);
    comp._texto += ` ${linhas.map(l => `${l.title} ${l.subtitle ?? ''}`).join(' ').toLowerCase()}`;
    add(comp, 0, 1, 12);

    const rolagem = new Gtk.ScrolledWindow({child: grade, hscrollbar_policy: Gtk.PolicyType.NEVER, vexpand: true});
    rolagem._filtrar = q => {
        let achou = 0;
        for (const c of cartoes) {
            c.visible = !q || c._texto.includes(q);
            achou += c.visible ? 1 : 0;
        }
        return achou;
    };
    return rolagem;
}
