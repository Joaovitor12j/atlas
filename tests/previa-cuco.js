// Gera um PNG com quadros do cuco (de desenho.js) para conferir a olho, sem abrir o Shell:
//   gjs -m tests/previa-cuco.js /caminho/saida.png
import cairo from 'gi://cairo';
import System from 'system';
import {cuco} from '../atlas@joaovitor12j.dev/desenho.js';
import {duracaoCuco, quadroCuco} from '../atlas@joaovitor12j.dev/logica.js';

const saida = System.programArgs[0] ?? '/tmp/atlas-cuco.png';
const ICONE = 64; // maior que o real (42 a 52) para ver os detalhes
const w = Math.round(ICONE * 1.6), h = ICONE * 2;
const N = 12, M = 12;                         // quadros por linha; cada linha é um fundo
const tempos = Array.from({length: N}, (_, i) => Math.round((duracaoCuco(1) - 1) * (i / (N - 1))));
const fundos = [[0.11, 0.13, 0.19], [0.96, 0.945, 0.898]];
const W = M + N * (w + M), H = M + fundos.length * (h + 28 + M);
const sup = new cairo.ImageSurface(cairo.Format.ARGB32, W, H);
const cr = new cairo.Context(sup);

fundos.forEach((f, linha) => {
    const y0 = M + linha * (h + 28 + M);
    cr.setSourceRGBA(...f, 1);
    cr.rectangle(0, y0 - M / 2, W, h + 28 + M);
    cr.fill();
    tempos.forEach((t, i) => {
        const x0 = M + i * (w + M);
        cr.save();
        cr.translate(x0, y0);
        cr.rectangle(0, 0, w, h);
        cr.clip();
        const q = quadroCuco(t, 1);
        if (q)
            cuco(cr, w, h, q, {hora: 3, minuto: 0});
        cr.restore();
        // a "doca": linha onde a casa nasce
        cr.setSourceRGBA(0.5, 0.5, 0.5, 0.6);
        cr.rectangle(x0, y0 + h, w, 3);
        cr.fill();
    });
});
sup.writeToPNG(saida);
print(`PNG gravado em ${saida} (${W}x${H})`);
