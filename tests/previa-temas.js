// Gera um PNG por tema decorado (decoracao.js) na escala do protótipo, para comparar com
// docs/design/pacotes-de-temas/*/previa.png sem abrir o Shell:
//   gjs -m tests/previa-temas.js /pasta/de/saida
import cairo from 'gi://cairo';
import System from 'system';
import {desenharDoca, desenharIndicador, desenharTile, fracaoIcone} from '../atlas@joaovitor12j.dev/temas/decoracao.js';
import {geometriaTema, TEMAS_MATERIAIS, TEMAS_PIXEL} from '../atlas@joaovitor12j.dev/temas/logica.js';

const pasta = System.programArgs[0] ?? '/tmp';
// tile do protótipo: 58 px nos materiais; nos pixel, 20 px da arte numa tela de 1000 px para 210 de arte
const ICONE = {pixel: 20 * 1000 / 210, materiais: 58};

for (const id of [...TEMAS_PIXEL, ...TEMAS_MATERIAIS]) {
    const icone = ICONE[TEMAS_PIXEL.includes(id) ? 'pixel' : 'materiais'];
    const g = geometriaTema(id, icone);
    const n = 5, larguraWidget = icone * 2.6;
    const largura = 2 * g.padH + n * icone + n * g.gap + 14 + g.gap + larguraWidget;
    const esp = g.padV * 2 + g.dotArea + icone;
    const W = Math.ceil(largura + 80), H = Math.ceil(esp + 100);
    const sup = new cairo.ImageSurface(cairo.Format.ARGB32, W, H);
    const cr = new cairo.Context(sup);
    cr.setSourceRGBA(0.12, 0.1, 0.17, 1);
    cr.paint();
    cr.translate(40, H - 30);
    desenharDoca(cr, id, 0, largura, esp, icone);
    let a = g.padH;
    for (let i = 0; i < n; i++) {
        cr.save();
        cr.translate(a, -g.padV - g.dotArea - icone);
        desenharTile(cr, id, icone, i, i === 0);
        // ícone de exemplo: quadrado claro na fração do tile que o app ocupa
        const f = fracaoIcone(id) * icone;
        cr.setSourceRGBA(0.3, 0.55, 0.9, 1);
        cr.rectangle((icone - f) / 2, (icone - f) / 2, f, f);
        cr.fill();
        cr.restore();
        if (i === 0 && g.dotW) {
            cr.save();
            cr.translate(a + icone / 2 - g.dotW / 2, -g.dotDepth - g.dotH / 2);
            desenharIndicador(cr, id, g.dotW, g.dotH);
            cr.restore();
        }
        a += icone + g.gap;
    }
    cr.setSourceRGBA(1, 1, 1, 0.3);
    cr.rectangle(a + 6, -g.padV - icone * 0.85, 2, icone * 0.7);
    cr.fill();
    sup.writeToPNG(`${pasta}/${id}.png`);
    cr.$dispose();
}
