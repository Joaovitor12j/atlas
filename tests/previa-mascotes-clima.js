// Gera um PNG com quadros dos seis movimentos dos mascotes de frio e calor, sem abrir o Shell:
//   gjs -m tests/previa-mascotes-clima.js /caminho/saida.png
// Cada linha é um movimento; a faixa escura embaixo de cada quadro é a doca.
import cairo from 'gi://cairo';
import {PERSONAGENS} from '../atlas@joaovitor12j.dev/mascotes/personagens/index.js';
import System from 'system';
import {
    duracaoPicole, duracaoSolArco, duracaoSolLeque, picole, quadroPicole, quadroSolArco, quadroSolLeque, solArco, solLeque,
} from '../atlas@joaovitor12j.dev/mascotes/personagens/calor.js';
import {
    duracaoNeve, duracaoPendurado, duracaoPinguim, flocosDeNeve, neve, pendurado, pinguim, quadroNeve, quadroPendurado, quadroPinguim,
} from '../atlas@joaovitor12j.dev/mascotes/personagens/frio.js';

const saida = System.programArgs[0] ?? '/tmp/atlas-mascotes-clima.png';
const ICONE = 48;
const DOCA = ICONE * 7;   // largura da doca dos que a atravessam
const N = 7;              // quadros por linha
const M = 10;
const LINHAS = [
    ['picole', duracaoPicole(), t => quadroPicole(t), picole],
    ['sol-arco', duracaoSolArco(), t => quadroSolArco(t, 1), solArco],
    ['sol-leque', duracaoSolLeque(), t => quadroSolLeque(t, 1), solLeque],
    ['pinguim', duracaoPinguim(), t => quadroPinguim(t, 1), pinguim],
    ['neve', duracaoNeve(), t => quadroNeve(t), neve],
    ['pendurado', duracaoPendurado(), t => quadroPendurado(t), pendurado],
];
const tams = LINHAS.map(([v]) => (PERSONAGENS[v.startsWith('sol') || v === 'picole' ? 'calor' : 'frio'].variantes[v]).tamanho(ICONE, {w: DOCA}));
const colunas = Math.max(...tams.map(t => t.w));
const alturas = tams.map(t => Math.max(t.h, t.h - t.abaixo + ICONE * 1.3));
const W = M + N * (colunas + M), H = M + alturas.reduce((s, h) => s + h + M, 0);
const sup = new cairo.ImageSurface(cairo.Format.ARGB32, W, H);
const cr = new cairo.Context(sup);
cr.setSourceRGBA(0.11, 0.13, 0.19, 1);
cr.paint();

let y = M;
LINHAS.forEach(([v, dur, quadro, desenhar], l) => {
    const tam = tams[l];
    const base = tam.h - tam.abaixo;
    for (let i = 0; i < N; i++) {
        const t = Math.round((dur - 1) * (i / (N - 1)));
        const q = quadro(t);
        cr.save();
        cr.translate(M + i * (colunas + M), y);
        cr.rectangle(0, 0, tam.w, alturas[l]);
        cr.clip();
        cr.setSourceRGBA(0.2, 0.24, 0.32, 1);
        cr.paint();
        cr.setSourceRGBA(0.07, 0.08, 0.12, 1); // a doca
        cr.rectangle(0, base, tam.w, ICONE * 1.3);
        cr.fill();
        cr.rectangle(0, 0, tam.w, tam.h);
        cr.clip();
        desenhar(cr, tam.w, tam.h, q, {base, icone: ICONE, flocos: flocosDeNeve(q.t ?? 0)});
        cr.restore();
    }
    y += alturas[l] + M;
});

sup.writeToPNG(saida);
print(`previa: ${saida}`);
