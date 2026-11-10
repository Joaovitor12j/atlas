// Gera um PNG com quadros do boneco (de desenho.js) para conferir a olho, sem abrir o Shell:
//   gjs -m tests/previa-boneco.js /caminho/saida.png
import cairo from 'gi://cairo';
import System from 'system';
import {boneco, duracaoBoneco, quadroBoneco} from '../atlas@joaovitor12j.dev/mascotes/personagens/boneco.js';

const saida = System.programArgs[0] ?? '/tmp/atlas-boneco.png';
const ICONE = 64;
const w = Math.round(ICONE * 1.2), h = Math.round(ICONE * 1.8);
const N = 12, M = 12;
const tempos = Array.from({length: N}, (_, i) => Math.round((duracaoBoneco() - 1) * (i / (N - 1))));
const fundos = [[0.11, 0.13, 0.19], [0.96, 0.945, 0.898]];
const W = M + N * (w + M), H = M + fundos.length * (h + M * 2);
const sup = new cairo.ImageSurface(cairo.Format.ARGB32, W, H);
const cr = new cairo.Context(sup);

fundos.forEach((f, linha) => {
    const y0 = M + linha * (h + M * 2);
    cr.setSourceRGBA(...f, 1);
    cr.rectangle(0, y0 - M / 2, W, h + M * 2);
    cr.fill();
    tempos.forEach((t, i) => {
        cr.save();
        cr.translate(M + i * (w + M), y0);
        cr.rectangle(0, 0, w, h);
        cr.clip();
        const q = quadroBoneco(t);
        if (q)
            boneco(cr, w, h, q);
        cr.restore();
    });
});
sup.writeToPNG(saida);
print(`PNG gravado em ${saida} (${W}x${H})`);
