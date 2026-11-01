// Prévia ao vivo do dock: desenha o dock com o tema, tamanho, indicador, posição e lente escolhidos
// e deixa a lente seguir o mouse. Ícones são placeholders coloridos; o que importa é a forma.
import Gdk from 'gi://Gdk';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import {CORES_TEMA, TEMAS, WIDGETS} from '../atlas@joaovitor12j.dev/catalogo.js';
import {anel, anelDeTile, iconeTempo, relogioAnalogico} from '../atlas@joaovitor12j.dev/desenho.js';
import {escalaLente, escolherAmbiente, normalizarAmbientes} from '../atlas@joaovitor12j.dev/logica.js';

const ALTURA = 218;
// Mesmos valores do dock real (FIXED em dock.js).
const GAP = 8;
const PAD_H = 14; // margem do vidro ao longo da doca
const PAD_V = 10; // margem do vidro no sentido transversal
const DOT_AREA = 8; // faixa entre o ícone e a borda para o indicador
const SEP_W = 14;
const MARGEM = 28;
const MAX_APPS = 12;

// Texto de cada widget no tile (a prévia não mede nada: são valores de exemplo).
const TEXTO_WIDGET = {
    pomodoro: '25:00', bateria: '87%', cronometro: '0:00', timer: '5:00', contagem: '12d',
    slack: 'S', clima: '24°', nota: 'Aa',
};
// Largura da versão larga de cada widget, em múltiplos do lado (static LARGURA em widgets.js).
const LARGURAS = {relogio: 2.2, musica: 5.2, atividade: 2.2, rede: 2.2, clima: 2.2};
const CHAVES = [
    'tema', 'tamanho-icone', 'lente-forca', 'lente-largura', 'posicao', 'estilo-indicador', 'margem',
    'ambientes', 'ambiente-atual', 'mostrar-seletor', 'widgets-posicao', 'widgets-largos',
];

function rgbDe(css) {
    const c = new Gdk.RGBA();
    c.parse(css);
    return [c.red, c.green, c.blue];
}

function corRgba(grad, pos, css) {
    const c = new Gdk.RGBA();
    c.parse(css);
    grad.addColorStopRGBA(pos, c.red, c.green, c.blue, c.alpha);
}

function cor(cr, css, alfa = 1) {
    const c = new Gdk.RGBA();
    c.parse(css);
    cr.setSourceRGBA(c.red, c.green, c.blue, c.alpha * alfa);
}

export function retanguloArredondado(cr, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    cr.newSubPath();
    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    cr.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI);
    cr.closePath();
}

// Papel de parede real do desktop (GSettings do GNOME), em "cobrir" e reescalado só quando o tamanho muda.
let fundoDesktop = null;
let imagem = null; // {uri, pb}
let cacheFundo = null; // {w, h, uri, surf}
function pixbufDoDesktop() {
    try {
        fundoDesktop ??= new Gio.Settings({schema_id: 'org.gnome.desktop.background'});
        const escuro = fundoDesktop.get_string('picture-uri-dark');
        const uri = escuro || fundoDesktop.get_string('picture-uri');
        if (!uri)
            return null;
        if (imagem?.uri !== uri)
            imagem = {uri, pb: GdkPixbuf.Pixbuf.new_from_file(Gio.File.new_for_uri(uri).get_path())};
        return imagem;
    } catch (e) {
        imagem = null;
        return null;
    }
}

function superficieDoFundo(w, h) {
    const img = pixbufDoDesktop();
    if (!img)
        return null;
    if (cacheFundo?.w === w && cacheFundo.h === h && cacheFundo.uri === img.uri)
        return cacheFundo.surf;
    const k = Math.max(w / img.pb.get_width(), h / img.pb.get_height());
    const pw = Math.ceil(img.pb.get_width() * k);
    const ph = Math.ceil(img.pb.get_height() * k);
    const esc = img.pb.scale_simple(pw, ph, GdkPixbuf.InterpType.BILINEAR);
    const surf = new imports.cairo.ImageSurface(imports.cairo.Format.ARGB32, w, h);
    const cr = new imports.cairo.Context(surf);
    Gdk.cairo_set_source_pixbuf(cr, esc, (w - pw) / 2, (h - ph) / 2);
    cr.paint();
    cr.$dispose();
    cacheFundo = {w, h, uri: img.uri, surf};
    return surf;
}

// Fundo do palco: o papel de parede do desktop (com véu escuro para a doca aparecer); sem imagem, degradê verde-água com riscas.
export function desenharPapelDeParede(cr, w, h, raio) {
    cr.save();
    retanguloArredondado(cr, 0, 0, w, h, raio);
    cr.clip();
    const surf = superficieDoFundo(Math.round(w), Math.round(h));
    if (surf) {
        cr.setSourceSurface(surf, 0, 0);
        cr.paint();
        cr.setSourceRGBA(0.03, 0.08, 0.1, 0.22);
        cr.paint();
        cr.restore();
        return;
    }
    const g = new (imports.cairo.LinearGradient)(0, 0, w * 0.5, h);
    g.addColorStopRGB(0, 0.17, 0.40, 0.44);
    g.addColorStopRGB(1, 0.06, 0.16, 0.19);
    cr.setSource(g);
    cr.paint();
    cr.setSourceRGBA(1, 1, 1, 0.045);
    cr.setLineWidth(1);
    for (let x = -h; x < w; x += 46) {
        cr.moveTo(x, h);
        cr.lineTo(x + h * 0.45, 0);
    }
    cr.stroke();
    cr.restore();
}

// Texto centrado em (x, y).
function texto(cr, str, x, y, tamanho) {
    cr.selectFontFace('Sora', 0, 1);
    cr.setFontSize(tamanho);
    const e = cr.textExtents(str);
    cr.moveTo(x - e.width / 2 - e.xBearing, y - e.height / 2 - e.yBearing);
    cr.showText(str);
}

// ---- Ícones reais dos apps, convertidos uma vez para superfícies Cairo de 128 px ----
const LADO_ICONE = 128;
const iconesApp = new Map();
function iconeDoApp(id) {
    if (iconesApp.has(id))
        return iconesApp.get(id);
    let surf = null;
    try {
        const gicon = Gio.DesktopAppInfo.new(id)?.get_icon();
        const p = gicon && Gtk.IconTheme.get_for_display(Gdk.Display.get_default())
            .lookup_by_gicon(gicon, LADO_ICONE, 1, Gtk.TextDirection.NONE, 0);
        const caminho = p?.get_file()?.get_path();
        if (caminho) {
            const pb = GdkPixbuf.Pixbuf.new_from_file_at_size(caminho, LADO_ICONE, LADO_ICONE);
            surf = new imports.cairo.ImageSurface(imports.cairo.Format.ARGB32, LADO_ICONE, LADO_ICONE);
            const cr = new imports.cairo.Context(surf);
            Gdk.cairo_set_source_pixbuf(cr, pb, (LADO_ICONE - pb.get_width()) / 2, (LADO_ICONE - pb.get_height()) / 2);
            cr.paint();
            cr.$dispose();
        }
    } catch (e) {
        surf = null;
    }
    iconesApp.set(id, surf);
    return surf;
}

// Itens da doca como o dock.js monta (_rebuild): seletor de ambiente, widgets, apps do ambiente e botão de apps.
function montarItens(settings) {
    const lista = normalizarAmbientes(settings.get_string('ambientes'));
    const amb = escolherAmbiente(lista, settings.get_string('ambiente-atual'));
    let apps = amb?.apps;
    if (!apps) {
        try {
            apps = new Gio.Settings({schema_id: 'org.gnome.shell'}).get_strv('favorite-apps');
        } catch (e) {
            apps = [];
        }
    }
    apps = apps.filter(id => Gio.DesktopAppInfo.new(id)).slice(0, MAX_APPS);
    const widgets = (amb?.widgets ?? []).filter(id => WIDGETS.some(w => w[0] === id));
    const antes = settings.get_string('widgets-posicao') === 'antes';
    // versão larga só com a doca na horizontal
    const largos = settings.get_string('posicao') === 'baixo' ? settings.get_strv('widgets-largos') : [];
    const widget = id => ({tipo: 'widget', id, larg: largos.includes(id) ? (LARGURAS[id] ?? 1) : 1});
    const out = [];
    const sep = () => out.push({tipo: 'sep'});
    if (amb && settings.get_boolean('mostrar-seletor')) {
        out.push({tipo: 'ambiente', t: (amb.nome || '?').trim().charAt(0).toUpperCase(), cor: amb.cor ?? '#ff6b4a'});
        sep();
    }
    if (antes && widgets.length) {
        widgets.forEach(id => out.push(widget(id)));
        sep();
    }
    apps.forEach((id, i) => out.push({tipo: 'app', id, aberto: i % 3 === 0}));
    if (!antes && widgets.length) {
        if (out.length)
            sep();
        widgets.forEach(id => out.push(widget(id)));
    }
    if (out.length)
        sep();
    out.push({tipo: 'apps'});
    return {itens: out, tema: amb?.tema};
}

// Tile de widget: vidro do tema (gradiente, borda, brilho) com um desenho de exemplo dentro.
export function desenharWidget(cr, id, w, h, ex, largo) {
    const raio = largo && id === 'musica' ? h * 0.42 : h * 0.3;
    retanguloArredondado(cr, 0, 0, w, h, raio);
    const g = new (imports.cairo.LinearGradient)(0, 0, 0, h);
    corRgba(g, 0, ex.w0);
    corRgba(g, 1, ex.w1);
    cr.setSource(g);
    cr.fillPreserve();
    cor(cr, ex.wb);
    cr.setLineWidth(1);
    cr.stroke();
    const m = h / 2;
    const [r, gg, b] = rgbDe(ex.txt);
    if (largo) {
        desenharLargo(cr, id, w, h, ex);
        return;
    }
    if (id === 'relogio') {
        const d = GLib.DateTime.new_now_local();
        relogioAnalogico(cr, m, m, h / 2 - h * 0.16, d.get_hour(), d.get_minute(), d.get_second(), [r, gg, b], [1, 0.42, 0.29, 1]);
        return;
    }
    if (id === 'progresso' || id === 'atividade') {
        // anéis finos, como no Shell, deixando o miolo livre para o percentual
        const n = id === 'progresso' ? 4 : 2;
        const fr = id === 'progresso' ? [0.62, 0.4, 0.78, 0.25] : [0.45, 0.7];
        const cores = id === 'progresso' ? null : [[0.91, 0.66, 0.23, 1], [0.29, 0.56, 0.85, 1]];
        const passo = id === 'progresso' ? h * 0.075 : h * 0.11;
        for (let i = 0; i < n; i++)
            anel(cr, m, m, h * 0.44 - i * passo, id === 'progresso' ? h * 0.045 : h * (0.07 - i * 0.025), fr[i], cores?.[i] ?? [r, gg, b, 0.95], [r, gg, b, 0.16]);
        cor(cr, ex.txt);
        texto(cr, id === 'progresso' ? '62%' : '45%', m, m, h * 0.17);
        return;
    }
    const aneis = {
        pomodoro: [0.62, [0.88, 0.4, 0.31, 1], '25:00'],
        bateria: [0.87, [0.37, 0.84, 0.66, 1], '87%'],
        cronometro: [0.4, [0.29, 0.56, 0.85, 1], '0:24'],
        timer: [0.55, [0.91, 0.66, 0.23, 1], '5:00'],
    };
    if (aneis[id]) {
        const [frac, rgba, txt] = aneis[id];
        anelDeTile(cr, w, h, frac, rgba);
        cor(cr, ex.txt);
        texto(cr, txt, m, m, h * (id === 'bateria' ? 0.2 : 0.17));
        return;
    }
    if (id === 'clima') {
        iconeTempo(cr, m, h * 0.4, h * 0.62, 'limpo', [r, gg, b], false);
        cor(cr, ex.txt);
        texto(cr, '24°', m, h * 0.78, h * 0.2);
        return;
    }
    cor(cr, ex.txt);
    if (desenharGlifo(cr, id, m, h))
        return;
    texto(cr, TEXTO_WIDGET[id] ?? WIDGETS.find(x => x[0] === id)?.[1].slice(0, 3) ?? '', m, m, Math.max(8, h * 0.26));
}

// Glifos que a fonte do texto não tem (nota musical, prancheta, setas): desenhados com traços, na cor já escolhida.
function desenharGlifo(cr, id, m, h) {
    const u = h / 100;
    cr.setLineCap(1);
    cr.setLineJoin(1);
    if (id === 'musica') {
        cr.arc(m - 9 * u, m + 15 * u, 8 * u, 0, 2 * Math.PI);
        cr.fill();
        cr.setLineWidth(5 * u);
        cr.moveTo(m - 2 * u, m + 15 * u);
        cr.lineTo(m - 2 * u, m - 22 * u);
        cr.curveTo(m + 4 * u, m - 20 * u, m + 14 * u, m - 12 * u, m + 12 * u, m - 2 * u);
        cr.stroke();
        return true;
    }
    if (id === 'clipboard') {
        cr.setLineWidth(3.5 * u);
        retanguloArredondado(cr, m - 17 * u, m - 20 * u, 34 * u, 42 * u, 6 * u);
        cr.stroke();
        retanguloArredondado(cr, m - 8 * u, m - 26 * u, 16 * u, 9 * u, 4 * u);
        cr.fill();
        cr.setLineWidth(3 * u);
        for (const dy of [-4, 6]) {
            cr.moveTo(m - 9 * u, m + dy * u);
            cr.lineTo(m + 9 * u, m + dy * u);
        }
        cr.stroke();
        return true;
    }
    if (id === 'rede') {
        cr.setLineWidth(4 * u);
        for (const [x, dir] of [[m - 11 * u, -1], [m + 11 * u, 1]]) {
            const topo = m - dir * 20 * u, base = m + dir * 20 * u;
            cr.moveTo(x, topo);
            cr.lineTo(x, base);
            cr.moveTo(x - 8 * u, base - dir * 9 * u);
            cr.lineTo(x, base);
            cr.lineTo(x + 8 * u, base - dir * 9 * u);
        }
        cr.stroke();
        return true;
    }
    return false;
}

// Versão larga: pílula da música (capa, título, barra, controles) ou hora e linha de apoio.
function desenharLargo(cr, id, w, h, ex) {
    const [r, g, b] = rgbDe(ex.txt);
    if (id === 'musica') {
        const cap = h * 0.62;
        retanguloArredondado(cr, h * 0.19, h * 0.19, cap, cap, cap * 0.22);
        cor(cr, '#ff6b4a');
        cr.fill();
        cor(cr, ex.txt);
        cr.selectFontFace('Sora', 0, 1);
        cr.setFontSize(h * 0.2);
        cr.moveTo(h * 0.19 + cap + h * 0.14, h * 0.42);
        cr.showText('Nada tocando');
        retanguloArredondado(cr, h * 0.19 + cap + h * 0.14, h * 0.62, w * 0.36, h * 0.05, h * 0.025);
        cr.setSourceRGBA(r, g, b, 0.3);
        cr.fill();
        for (let i = 0; i < 3; i++) {
            cr.setSourceRGBA(r, g, b, 0.9);
            cr.arc(w - h * 1.0 + i * h * 0.3, h / 2, h * 0.07, 0, 2 * Math.PI);
            cr.fill();
        }
        return;
    }
    const d = GLib.DateTime.new_now_local();
    cor(cr, ex.txt);
    texto(cr, id === 'relogio' ? d.format('%H:%M') : (WIDGETS.find(x => x[0] === id)?.[1] ?? ''), w / 2, h / 2, h * 0.34);
}

// Botão "Mostrar aplicativos": tile translúcido com a grade 3x3.
function desenharBotaoApps(cr, w, h, ex) {
    retanguloArredondado(cr, 0, 0, w, h, h * 0.27);
    cor(cr, ex.apps);
    cr.fill();
    cor(cr, ex.appsIc);
    const q = h * 0.11;
    const passo = h * 0.19;
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
            retanguloArredondado(cr, w / 2 - passo - q / 2 + i * passo, h / 2 - passo - q / 2 + j * passo, q, q, q * 0.3);
            cr.fill();
        }
}

// Vidro da doca no referencial local (borda do dock em y = 0): sombra suave, halo do tema, fundo e borda.
// A borda segue a cor do ambiente quando ele tem uma (como `_bg.style` no dock.js).
function desenharVidro(cr, t, x, w, espessura, corBorda) {
    const raio = t.raio ?? 22;
    for (let i = 4; i >= 1; i--) {
        retanguloArredondado(cr, x - i * 3, -espessura - i * 3 + 8, w + i * 6, espessura + i * 6, raio + i * 3);
        cr.setSourceRGBA(0, 0, 0, 0.07);
        cr.fill();
    }
    if (t.brilho) {
        for (let i = 3; i >= 1; i--) {
            retanguloArredondado(cr, x - i * 2, -espessura - i * 2, w + i * 4, espessura + i * 4, raio + i * 2);
            cor(cr, t.brilho, 0.1);
            cr.setLineWidth(2);
            cr.stroke();
        }
    }
    retanguloArredondado(cr, x, -espessura, w, espessura, raio);
    if (t.fundo2) {
        const g = new (imports.cairo.LinearGradient)(x, -espessura, x + w, 0);
        corRgba(g, 0, t.fundo);
        corRgba(g, 1, t.fundo2);
        cr.setSource(g);
    } else {
        cor(cr, t.fundo);
    }
    cr.fillPreserve();
    cor(cr, corBorda ?? t.borda);
    cr.setLineWidth(1);
    cr.stroke();
}

// Miniatura de tema: o papel de parede com uma doca pequena (quatro apps, um widget, botão de apps) no tema `id`.
export function desenharMiniDoca(cr, w, h, id, apps) {
    const t = CORES_TEMA[id] ?? CORES_TEMA.noite;
    desenharPapelDeParede(cr, w, h, 9);
    const icone = 52;
    const itens = [...apps.slice(0, 4).map(a => ({tipo: 'app', id: a})), {tipo: 'sep'}, {tipo: 'widget'}, {tipo: 'apps'}];
    const base = itens.map(i => i.tipo === 'sep' ? SEP_W : icone);
    const total = base.reduce((a, b) => a + b, 0) + GAP * (base.length - 1);
    const espessura = DOT_AREA + PAD_V + icone + PAD_V;
    const k = Math.min((w - 12) / (total + 2 * PAD_H), (h - 10) / espessura);
    cr.save();
    cr.translate(w / 2, h - 7);
    cr.scale(k, k);
    desenharVidro(cr, t, -total / 2 - PAD_H, total + 2 * PAD_H, espessura, null);
    let a = -total / 2;
    itens.forEach((it, i) => {
        const centro = a + base[i] / 2;
        a += base[i] + GAP;
        const y = -(DOT_AREA + PAD_V) - icone;
        if (it.tipo === 'sep') {
            const len = Math.round(icone * 0.7);
            cor(cr, t.sep);
            retanguloArredondado(cr, centro - 1, -(DOT_AREA + PAD_V) - icone * 0.15 - len, 2, len, 1);
            cr.fill();
            return;
        }
        cr.save();
        cr.translate(centro - icone / 2, y);
        if (it.tipo === 'app') {
            const surf = iconeDoApp(it.id);
            if (surf) {
                cr.scale(icone / LADO_ICONE, icone / LADO_ICONE);
                cr.setSourceSurface(surf, 0, 0);
                cr.getSource().setFilter(imports.cairo.Filter.BEST);
                cr.paint();
            } else {
                retanguloArredondado(cr, 0, 0, icone, icone, icone * 0.22);
                cor(cr, '#2f3a4d');
                cr.fill();
            }
        } else if (it.tipo === 'widget') {
            desenharWidget(cr, 'relogio', icone, icone, t, false);
        } else {
            desenharBotaoApps(cr, icone, icone, t);
        }
        cr.restore();
        if (it.tipo === 'app' && i === 0) {
            cor(cr, t.ponto);
            cr.arc(centro, -(DOT_AREA + PAD_V) + 7, 3, 0, 2 * Math.PI);
            cr.fill();
        }
    });
    cr.restore();
}

// Ids dos apps que a prévia mostra (os do ambiente atual), para as miniaturas usarem os mesmos ícones.
export function appsDaPrevia(settings) {
    return montarItens(settings).itens.filter(i => i.tipo === 'app').map(i => i.id);
}

export function criarPrevia(settings) {
    const area = new Gtk.DrawingArea({content_height: ALTURA, hexpand: true, css_classes: ['atlas-previa']});
    let ponteiro = null; // [x, y] em px do widget, ou null com o mouse fora
    let montagem = montarItens(settings);
    let escalas = montagem.itens.map(() => 1);
    let tick = 0;

    const lerConfig = () => {
        const indicador = settings.get_string('estilo-indicador');
        const pos = settings.get_string('posicao');
        const doAmb = montagem.tema;
        const tema = TEMAS.some(t => t[0] === doAmb) ? doAmb : settings.get_string('tema');
        return {
            tema,
            icone: settings.get_int('tamanho-icone'),
            forca: settings.get_double('lente-forca'),
            largura: settings.get_int('lente-largura'),
            pos,
            indicador,
            // ponto 6x6; barra fina ao longo da doca (como em _readConfig do dock.js)
            dot: indicador === 'barra' ? (pos !== 'baixo' ? [3, 16] : [16, 3]) : [6, 6],
        };
    };

    // Geometria no referencial local: eixo "ao longo" em x (centrado em 0), borda do dock em y = 0, "para fora" = -y.
    const geometria = (c, w, h) => {
        const vertical = c.pos !== 'baixo';
        const ao = vertical ? h : w;
        const prof = vertical ? w : h;
        const base = montagem.itens.map(i => i.tipo === 'sep' ? SEP_W : c.icone * (i.larg ?? 1));
        const total = base.reduce((a, b) => a + b, 0) + GAP * (base.length - 1) + 2 * PAD_H;
        const k = Math.min(1, (ao - 2 * MARGEM) / total, (prof - MARGEM) / (c.icone * c.forca + PAD_V + DOT_AREA + PAD_V));
        return {vertical, ao, prof, base, total, k};
    };

    // Ponteiro da tela para o referencial local (antes da escala k).
    const paraLocal = (c, g, w, h, x, y) => {
        let lx, ly;
        if (c.pos === 'baixo') {
            lx = x - w / 2;
            ly = y - (h - MARGEM);
        } else if (c.pos === 'esquerda') {
            lx = y - h / 2;
            ly = MARGEM - x;
        } else {
            lx = y - h / 2;
            ly = x - (w - MARGEM);
        }
        return [lx / g.k, ly / g.k];
    };

    const alvos = (c, g) => {
        const alvo = montagem.itens.map(() => 1);
        if (!ponteiro)
            return alvo;
        const [px, py] = paraLocal(c, g, area.get_width(), area.get_height(), ...ponteiro);
        const alcance = c.icone * c.forca + PAD_V + DOT_AREA;
        const dentro = Math.abs(px) <= g.total / 2 && py <= 4 && py >= -(alcance + c.icone);
        if (!dentro)
            return alvo;
        let a = -g.total / 2 + PAD_H;
        montagem.itens.forEach((it, i) => {
            const centro = a + g.base[i] / 2;
            a += g.base[i] + GAP;
            if (it.tipo !== 'sep')
                alvo[i] = escalaLente(px - centro, c.forca, c.largura);
        });
        return alvo;
    };

    const animar = () => {
        if (tick)
            return;
        tick = area.add_tick_callback(() => {
            const c = lerConfig();
            const g = geometria(c, area.get_width(), area.get_height());
            const alvo = alvos(c, g);
            let mexeu = false;
            escalas = escalas.map((s, i) => {
                const d = alvo[i] - s;
                if (Math.abs(d) < 0.003)
                    return alvo[i];
                mexeu = true;
                return s + d * 0.3;
            });
            area.queue_draw();
            if (!mexeu && !ponteiro) {
                tick = 0;
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    };

    area.set_draw_func((_a, cr, w, h) => {
        const c = lerConfig();
        const t = CORES_TEMA[c.tema] ?? CORES_TEMA.noite;
        const ex = t;
        const g = geometria(c, w, h);
        const itens = montagem.itens;
        const amb = normalizarAmbientes(settings.get_string('ambientes'));
        const corAmb = escolherAmbiente(amb, settings.get_string('ambiente-atual'))?.cor;

        desenharPapelDeParede(cr, w, h, 16);

        cr.save();
        let desvirar; // desfaz a rotação do referencial para os ícones ficarem em pé
        if (c.pos === 'baixo') {
            cr.translate(w / 2, h - MARGEM);
            desvirar = () => {};
        } else if (c.pos === 'esquerda') {
            cr.translate(MARGEM, h / 2);
            cr.rotate(Math.PI / 2);
            desvirar = () => cr.rotate(-Math.PI / 2);
        } else {
            cr.translate(w - MARGEM, h / 2);
            cr.rotate(-Math.PI / 2);
            cr.scale(-1, 1); // mesma ordem de cima para baixo da borda esquerda
            desvirar = () => {
                cr.scale(-1, 1);
                cr.rotate(Math.PI / 2);
            };
        }
        cr.scale(g.k, g.k);

        // O vidro acompanha a largura total, que cresce com a lente (como em _applyScales do dock.js).
        const larguras = itens.map((it, i) => it.tipo === 'sep' ? SEP_W : g.base[i] * escalas[i]);
        const total = larguras.reduce((a, b) => a + b, 0) + GAP * (larguras.length - 1);
        const espessura = DOT_AREA + PAD_V + c.icone + PAD_V;
        const bgX = -total / 2 - PAD_H;
        const bgW = total + 2 * PAD_H;

        desenharVidro(cr, t, bgX, bgW, espessura, corAmb);

        let a = -total / 2;
        itens.forEach((it, i) => {
            const lar = larguras[i];
            const centro = a + lar / 2;
            a += lar + GAP;
            if (it.tipo === 'sep') {
                const len = Math.round(c.icone * 0.7);
                cor(cr, t.sep);
                retanguloArredondado(cr, centro - 1, -(DOT_AREA + PAD_V) - c.icone * 0.15 - len, 2, len, 1);
                cr.fill();
                return;
            }
            const lado = lar;
            const alto = c.icone * escalas[i];
            const yMeio = -(DOT_AREA + PAD_V) - alto / 2;
            cr.save();
            cr.translate(centro, yMeio);
            desvirar();
            cr.translate(-lado / 2, -alto / 2);
            if (it.tipo === 'app') {
                const surf = iconeDoApp(it.id);
                if (surf) {
                    cr.save();
                    cr.scale(lado / LADO_ICONE, alto / LADO_ICONE);
                    cr.setSourceSurface(surf, 0, 0);
                    cr.getSource().setFilter(imports.cairo.Filter.BEST);
                    cr.paint();
                    cr.restore();
                } else {
                    retanguloArredondado(cr, 0, 0, lado, alto, alto * 0.22);
                    cor(cr, '#2f3a4d');
                    cr.fill();
                }
            } else if (it.tipo === 'ambiente') {
                retanguloArredondado(cr, 0, 0, lado, alto, alto * 0.28);
                cor(cr, it.cor);
                cr.fill();
                cor(cr, '#ffffff');
                texto(cr, it.t, lado / 2, alto / 2, Math.max(9, alto * 0.42));
            } else if (it.tipo === 'widget') {
                desenharWidget(cr, it.id, lado, alto, ex, (it.larg ?? 1) > 1);
            } else {
                desenharBotaoApps(cr, lado, alto, ex);
            }
            cr.restore();
            if (it.aberto && c.indicador !== 'nenhum') {
                cor(cr, t.ponto);
                const [dw, dh] = c.dot;
                const dy = -(DOT_AREA + PAD_V) + 7; // centro do indicador: 7 px abaixo da base do ícone (dotDepth = d0 - 7)
                if (c.indicador === 'barra')
                    retanguloArredondado(cr, centro - dw / 2, dy - dh / 2, dw, dh, 1.5);
                else
                    cr.arc(centro, dy, dw / 2, 0, 2 * Math.PI);
                cr.fill();
            }
        });
        cr.restore();
    });

    const mov = new Gtk.EventControllerMotion();
    mov.connect('motion', (_m, x, y) => {
        ponteiro = [x, y];
        animar();
    });
    mov.connect('leave', () => {
        ponteiro = null;
        animar();
    });
    area.add_controller(mov);

    const ids = CHAVES.map(k => settings.connect(`changed::${k}`, () => {
        if (['ambientes', 'ambiente-atual', 'mostrar-seletor', 'widgets-posicao', 'widgets-largos', 'posicao'].includes(k)) {
            montagem = montarItens(settings);
            escalas = montagem.itens.map(() => 1);
        }
        area.queue_draw();
    }));
    area.connect('destroy', () => {
        ids.forEach(id => settings.disconnect(id));
    });
    return area;
}

// Palco: a prévia com a etiqueta "Prévia ao vivo" e a dica por cima (rótulos não pegam o mouse).
export function criarPalco(settings) {
    const palco = new Gtk.Overlay({child: criarPrevia(settings), css_classes: ['atlas-palco']});
    palco.add_overlay(new Gtk.Label({
        use_markup: true, label: '<span foreground="#5fd6a8">●</span>  PRÉVIA AO VIVO', halign: Gtk.Align.START, valign: Gtk.Align.START,
        can_target: false, css_classes: ['atlas-palco-rotulo'],
    }));
    palco.add_overlay(new Gtk.Label({
        label: 'Passe o mouse na doca para ver a lente', halign: Gtk.Align.END, valign: Gtk.Align.START,
        can_target: false, css_classes: ['atlas-palco-dica'],
    }));
    return palco;
}
