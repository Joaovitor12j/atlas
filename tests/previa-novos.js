// Gera um PNG com os mascotes coruja, pilha, satélite e tomate (desenho.js) em alguns instantes de cada um:
//   gjs -m tests/previa-novos.js /caminho/saida.png
import cairo from 'gi://cairo';
import System from 'system';
import {coruja, pilha, satelite, tomate} from '../atlas@joaovitor12j.dev/desenho.js';
import {
    duracaoCoruja, duracaoPilha, duracaoSatelite, duracaoTomate,
    quadroCoruja, quadroPilha, quadroSatelite, quadroTomate,
} from '../atlas@joaovitor12j.dev/logica.js';

const saida = System.programArgs[0] ?? '/tmp/atlas-novos.png';
const ICONE = 64;
const LINHAS = [
    [coruja, quadroCoruja, duracaoCoruja, 1.2, 1.6],
    [pilha, quadroPilha, duracaoPilha, 1, 1.7],
    [satelite, quadroSatelite, duracaoSatelite, 1.6, 1.8],
    [tomate, quadroTomate, duracaoTomate, 1.6, 1.7],
];
const N = 8, M = 10;
const larg = Math.round(ICONE * 1.7), alt = Math.round(ICONE * 1.9);
const W = M + N * (larg + M), H = M + LINHAS.length * (alt + M);
const sup = new cairo.ImageSurface(cairo.Format.ARGB32, W, H);
const cr = new cairo.Context(sup);
cr.setSourceRGBA(0.11, 0.13, 0.19, 1);
cr.paint();
LINHAS.forEach(([desenhar, quadro, duracao], linha) => {
    for (let i = 0; i < N; i++) {
        const t = Math.round((duracao() - 1) * ((i + 0.5) / N) * 0.9 + (i === 3 ? 400 : 0));
        const x0 = M + i * (larg + M), y0 = M + linha * (alt + M);
        const q = quadro(t);
        cr.save();
        cr.translate(x0, y0);
        cr.rectangle(0, 0, larg, alt);
        cr.clip();
        if (q)
            desenhar(cr, larg, alt, q);
        cr.restore();
        cr.setSourceRGBA(0.5, 0.5, 0.5, 0.6);
        cr.rectangle(x0, y0 + alt, larg, 2);
        cr.fill();
    }
});
sup.writeToPNG(saida);
print(`PNG gravado em ${saida} (${W}x${H})`);
