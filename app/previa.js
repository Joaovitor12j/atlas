// Prévia ao vivo do dock: desenha o dock com o tema, tamanho, indicador, posição e lente escolhidos
// e deixa a lente seguir o mouse. Ícones são placeholders coloridos; o que importa é a forma.
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import {CORES_TEMA} from '../atlas@joaovitor12j.dev/catalogo.js';
import {escalaLente} from '../atlas@joaovitor12j.dev/logica.js';

const ALTURA = 190;
const PADDING = 8;
const GAP = 8;
const MARGEM = 14;
const ICONES = ['#E8604C', '#5B9BD5', '#8E6BBF', '#E8A33D', null, '#3FB8A8', '#D96BA0']; // null = separador
const ABERTOS = new Set([0, 3, 5]);
const CHAVES = ['tema', 'tamanho-icone', 'lente-forca', 'lente-largura', 'posicao', 'estilo-indicador', 'margem'];

function cor(cr, css, alfa = 1) {
    const c = new Gdk.RGBA();
    c.parse(css);
    cr.setSourceRGBA(c.red, c.green, c.blue, c.alpha * alfa);
}

function retanguloArredondado(cr, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    cr.newSubPath();
    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    cr.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI);
    cr.closePath();
}

export function criarPrevia(settings) {
    const area = new Gtk.DrawingArea({content_height: ALTURA, hexpand: true, css_classes: ['atlas-previa']});
    let ponteiro = null; // [x, y] em px do widget, ou null com o mouse fora
    let escalas = ICONES.map(() => 1);
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
        const larguras = ICONES.map(i => i === null ? 1 : c.icone);
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
        const alvo = ICONES.map(() => 1);
        if (!ponteiro)
            return alvo;
        const [px, py] = paraLocal(c, g, area.get_width(), area.get_height(), ...ponteiro);
        const alcance = c.icone * c.forca + PADDING;
        const dentro = Math.abs(px) <= g.total / 2 && py <= PADDING + 4 && py >= -(alcance + c.icone);
        if (!dentro)
            return alvo;
        let a = -g.total / 2 + PADDING;
        ICONES.forEach((ic, i) => {
            const centro = a + g.larguras[i] / 2;
            a += g.larguras[i] + GAP;
            if (ic !== null)
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

        // "papel de parede" para os temas translúcidos terem o que desfocar
        const fundo = new (imports.cairo.LinearGradient)(0, 0, w, h);
        fundo.addColorStopRGB(0, 0.13, 0.19, 0.30);
        fundo.addColorStopRGB(1, 0.30, 0.38, 0.52);
        cr.setSource(fundo);
        retanguloArredondado(cr, 0, 0, w, h, 12);
        cr.fill();

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
        ICONES.forEach((ic, i) => {
            const lar = g.larguras[i];
            const centro = a + lar / 2;
            a += lar + GAP;
            if (ic === null) {
                cor(cr, t.sep);
                cr.rectangle(centro - 0.5, -espessura + PADDING, 1, c.icone);
                cr.fill();
                return;
            }
            const s = escalas[i];
            const lado = c.icone * s;
            const base = -PADDING; // base dos ícones; crescem para fora (para cima no referencial local)
            retanguloArredondado(cr, centro - lado / 2, base - lado, lado, lado, lado * 0.22);
            cor(cr, ic);
            cr.fill();
            if (ABERTOS.has(i) && c.indicador !== 'nenhum') {
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
