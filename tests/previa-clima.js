// Gera um PNG com os ícones do tempo (de desenho.js) para conferir a olho, sem abrir o Shell:
//   gjs -m tests/previa-clima.js /caminho/saida.png
// Linhas: dia em fundo escuro, noite em fundo escuro, dia em fundo claro (tema Papel).
import cairo from 'gi://cairo';
import System from 'system';
import {iconeTempo} from '../atlas@joaovitor12j.dev/clima/desenho.js';

const saida = System.programArgs[0] ?? '/tmp/atlas-clima.png';
const ICONES = ['limpo', 'poucas-nuvens', 'nublado', 'nevoeiro', 'garoa', 'chuva', 'neve', 'trovoada'];
const T = 96;
const LINHAS = [
    {fundo: [1, 1, 1, 0.08], fg: [0.95, 0.95, 0.97], dia: true},
    {fundo: [1, 1, 1, 0.08], fg: [0.95, 0.95, 0.97], dia: false},
    {fundo: [0.96, 0.93, 0.86, 1], fg: [0.18, 0.18, 0.16], dia: true},
];
const W = ICONES.length * (T + 12) + 12, H = LINHAS.length * (T + 12) + 12;
const sup = new cairo.ImageSurface(cairo.Format.ARGB32, W, H);
const cr = new cairo.Context(sup);
cr.setSourceRGBA(0.11, 0.13, 0.19, 1);
cr.paint();

LINHAS.forEach(({fundo, fg, dia}, l) => ICONES.forEach((icone, i) => {
    cr.save();
    cr.translate(12 + i * (T + 12), 12 + l * (T + 12));
    cr.rectangle(0, 0, T, T);
    cr.clip();
    cr.setSourceRGBA(...fundo);
    cr.paint();
    iconeTempo(cr, T / 2, T / 2, T * 0.8, icone, fg, dia);
    cr.restore();
}));

sup.writeToPNG(saida);
print(`previa: ${saida}`);
