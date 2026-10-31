// Prévia ao vivo do dock: desenha o dock com o tema, tamanho, indicador, posição e lente escolhidos
// e deixa a lente seguir o mouse. Ícones são placeholders coloridos; o que importa é a forma.
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import {CORES_TEMA} from '../atlas@joaovitor12j.dev/catalogo.js';
import {escalaLente} from '../atlas@joaovitor12j.dev/logica.js';

const ALTURA = 218;
const PADDING = 8;
const GAP = 8;
const MARGEM = 28;
// Itens do palco (como no mockup): app com sigla e cor, separador, tile de relógio e seletor de ambiente.
// `rel` = largura em múltiplos do ícone; `aberto` mostra o indicador de app aberto.
const ITENS = [
    {tipo: 'app', t: 'Fx', cor: '#ff7a3d', aberto: true},
    {tipo: 'app', t: 'Cd', cor: '#4a6bff', aberto: true},
    {tipo: 'app', t: 'Tm', cor: '#2f3a4d'},
    {tipo: 'app', t: 'Sl', cor: '#2fb67c', aberto: true},
    {tipo: 'sep'},
    {tipo: 'app', t: 'Ob', cor: '#7c5cff'},
    {tipo: 'app', t: 'Sp', cor: '#1db954'},
    {tipo: 'sep'},
    {tipo: 'relogio', t: '14:32', cor: '#0e1a21'},
    {tipo: 'ambiente', t: 'T', cor: '#ff6b4a', rel: 0.62},
];
const CHAVES = ['tema', 'tamanho-icone', 'lente-forca', 'lente-largura', 'posicao', 'estilo-indicador', 'margem'];

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

// Fundo do palco: degradê verde-água com riscas diagonais finas (como no mockup).
export function desenharPapelDeParede(cr, w, h, raio) {
    const g = new (imports.cairo.LinearGradient)(0, 0, w * 0.5, h);
    g.addColorStopRGB(0, 0.17, 0.40, 0.44);
    g.addColorStopRGB(1, 0.06, 0.16, 0.19);
    cr.save();
    retanguloArredondado(cr, 0, 0, w, h, raio);
    cr.clip();
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

export function criarPrevia(settings) {
    const area = new Gtk.DrawingArea({content_height: ALTURA, hexpand: true, css_classes: ['atlas-previa']});
    let ponteiro = null; // [x, y] em px do widget, ou null com o mouse fora
    let escalas = ITENS.map(() => 1);
    let tick = 0;

    const lerConfig = () => ({
        tema: settings.get_string('tema'),
        icone: settings.get_int('tamanho-icone'),
        forca: settings.get_double('lente-forca'),
        largura: settings.get_int('lente-largura'),
        pos: settings.get_string('posicao'),
        indicador: settings.get_string('estilo-indicador'),
    });

    // Geometria no referencial local: eixo "ao longo" em x (centrado em 0), borda do dock em y = 0, "para fora" = -y.
    const geometria = (c, w, h) => {
        const vertical = c.pos !== 'baixo';
        const ao = vertical ? h : w;
        const prof = vertical ? w : h;
        const larguras = ITENS.map(i => i.tipo === 'sep' ? 1 : c.icone * (i.rel ?? 1));
        const total = larguras.reduce((a, b) => a + b, 0) + GAP * (larguras.length - 1) + 2 * PADDING;
        const alto = c.icone * c.forca + PADDING;
        const k = Math.min(1, (ao - 2 * MARGEM) / total, (prof - 2 * MARGEM) / (c.icone + 2 * PADDING + (alto - c.icone)));
        return {vertical, ao, prof, larguras, total, k};
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
        const alvo = ITENS.map(() => 1);
        if (!ponteiro)
            return alvo;
        const [px, py] = paraLocal(c, g, area.get_width(), area.get_height(), ...ponteiro);
        const alcance = c.icone * c.forca + PADDING;
        const dentro = Math.abs(px) <= g.total / 2 && py <= PADDING + 4 && py >= -(alcance + c.icone);
        if (!dentro)
            return alvo;
        let a = -g.total / 2 + PADDING;
        ITENS.forEach((it, i) => {
            const centro = a + g.larguras[i] / 2;
            a += g.larguras[i] + GAP;
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
        const g = geometria(c, w, h);

        desenharPapelDeParede(cr, w, h, 16);

        cr.save();
        if (c.pos === 'baixo') {
            cr.translate(w / 2, h - MARGEM);
        } else if (c.pos === 'esquerda') {
            cr.translate(MARGEM, h / 2);
            cr.rotate(Math.PI / 2);
        } else {
            cr.translate(w - MARGEM, h / 2);
            cr.rotate(-Math.PI / 2);
            cr.scale(-1, 1); // mesma ordem de cima para baixo da borda esquerda
        }
        cr.scale(g.k, g.k);

        const espessura = c.icone + 2 * PADDING;
        retanguloArredondado(cr, -g.total / 2, -espessura, g.total, espessura, 14);
        cor(cr, t.fundo);
        cr.fillPreserve();
        cor(cr, t.borda);
        cr.setLineWidth(1.5);
        cr.stroke();

        let a = -g.total / 2 + PADDING;
        ITENS.forEach((it, i) => {
            const lar = g.larguras[i];
            const centro = a + lar / 2;
            a += lar + GAP;
            if (it.tipo === 'sep') {
                cor(cr, t.sep);
                cr.rectangle(centro - 0.5, -espessura + PADDING, 1, c.icone);
                cr.fill();
                return;
            }
            const s = escalas[i];
            const lado = lar * s;
            const alto = it.tipo === 'ambiente' ? lado : c.icone * s;
            const base = -PADDING; // base dos itens; crescem para fora (para cima no referencial local)
            const yTopo = base - alto - (it.tipo === 'ambiente' ? (c.icone * s - alto) / 2 : 0);
            if (it.tipo === 'ambiente') {
                cor(cr, it.cor);
                cr.arc(centro, yTopo + alto / 2, lado / 2, 0, 2 * Math.PI);
                cr.fill();
            } else {
                retanguloArredondado(cr, centro - lado / 2, yTopo, lado, alto, alto * 0.22);
                cor(cr, it.cor);
                cr.fill();
            }
            cor(cr, '#ffffff');
            texto(cr, it.t, centro, yTopo + alto / 2, Math.max(9, Math.min(alto, lado) * (it.tipo === 'relogio' ? 0.27 : 0.32)));
            if (it.aberto && c.indicador !== 'nenhum') {
                cor(cr, t.ponto);
                if (c.indicador === 'barra')
                    retanguloArredondado(cr, centro - 7, -4, 14, 3, 1.5);
                else
                    cr.arc(centro, -3, 2.2, 0, 2 * Math.PI);
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

    const ids = CHAVES.map(k => settings.connect(`changed::${k}`, () => area.queue_draw()));
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
