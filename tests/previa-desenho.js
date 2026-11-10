// Gera um PNG com os desenhos de desenho.js para conferir a olho, sem abrir o Shell:
//   gjs -m tests/previa-desenho.js /caminho/saida.png
import cairo from 'gi://cairo';
import System from 'system';
import {anel, barra, cor, grafico, relogioAnalogico} from '../atlas@joaovitor12j.dev/nucleo/desenho.js';

const saida = System.programArgs[0] ?? '/tmp/atlas-previa.png';
const T = 96;                 // lado de um tile
const W = T * 8 + 9 * 12, H = T * 2 + 3 * 12;
const sup = new cairo.ImageSurface(cairo.Format.ARGB32, W, H);
const cr = new cairo.Context(sup);

const tile = (i, linha, fundo, desenhar) => {
    const x = 12 + i * (T + 12), y = 12 + linha * (T + 12);
    cr.save();
    cr.translate(x, y);
    cr.rectangle(0, 0, T, T);
    cr.clip();
    cr.setSourceRGBA(...fundo);
    cr.paint();
    desenhar(T / 2, T / 2);
    cr.restore();
};

cr.setSourceRGBA(0.11, 0.13, 0.19, 1);
cr.paint();

const escuro = [1, 1, 1, 0.08];
const claro = [0.24, 0.2, 0.12, 0.1];
const fgEscuro = [0.95, 0.95, 0.97];
const fgClaro = [0.18, 0.18, 0.16];

// linha 0: fundo escuro
tile(0, 0, escuro, (cx, cy) => anel(cr, cx, cy, 38, 6, 0.64, cor('#e0654f')));
tile(1, 0, escuro, (cx, cy) => anel(cr, cx, cy, 38, 6, 0.87, cor('#3fb8a8')));
tile(2, 0, escuro, (cx, cy) => {
    anel(cr, cx, cy, 38, 5, 0.42, cor('#4a90d9'));
    anel(cr, cx, cy, 29, 5, 0.67, cor('#e8a93a'));
});
tile(3, 0, escuro, (cx, cy) => {
    [['#e0654f', 0.5], ['#e8a93a', 0.35], ['#3fb8a8', 0.6], ['#4a90d9', 0.8]]
        .forEach(([c, f], i) => anel(cr, cx, cy, 40 - i * 8, 4, f, cor(c)));
});
tile(4, 0, escuro, (cx, cy) => relogioAnalogico(cr, cx, cy, 38, 10, 8, 42, fgEscuro, cor('#e0654f')));
tile(5, 0, escuro, (cx, cy) => {
    const cpu = Array.from({length: 40}, (_, i) => 30 + 25 * Math.sin(i / 4) + (i % 7) * 2);
    const ram = Array.from({length: 40}, () => 55);
    grafico(cr, 8, 14, 80, 60, [
        {valores: ram, cor: cor('#4a90d9')},
        {valores: cpu, cor: cor('#e8a93a'), preencher: true},
    ], {pontos: 40});
});
tile(6, 0, escuro, (cx, cy) => {
    barra(cr, 10, 20, 76, 7, 0.4, cor('#e0654f'));
    barra(cr, 10, 38, 76, 7, 0.8, cor('#e8a93a'));
    barra(cr, 10, 56, 76, 7, 0.05, cor('#3fb8a8'));
    barra(cr, 10, 74, 76, 7, 1, cor('#4a90d9'));
});
tile(7, 0, escuro, (cx, cy) => {
    anel(cr, cx, cy, 38, 6, 0.12, cor('#e24b4a'));
});

// linha 1: fundo claro (tema Papel)
const papel = [0.96, 0.945, 0.898, 1];
tile(0, 1, papel, (cx, cy) => anel(cr, cx, cy, 38, 6, 0.64, cor('#e0654f')));
tile(1, 1, papel, (cx, cy) => relogioAnalogico(cr, cx, cy, 38, 3, 30, 10, fgClaro, cor('#b8741a')));
tile(2, 1, papel, (cx, cy) => {
    anel(cr, cx, cy, 38, 5, 0.42, cor('#4a90d9'));
    anel(cr, cx, cy, 29, 5, 0.67, cor('#e8a93a'));
});
tile(3, 1, papel, (cx, cy) => {
    grafico(cr, 8, 14, 80, 60, [{valores: Array.from({length: 40}, (_, i) => 20 + i), cor: cor('#3fb8a8'), preencher: true}], {pontos: 40});
});
tile(4, 1, escuro, (cx, cy) => anel(cr, cx, cy, 38, 6, 1, cor('#e8a93a')));
tile(5, 1, escuro, (cx, cy) => anel(cr, cx, cy, 38, 6, 0, cor('#e8a93a')));
tile(6, 1, escuro, (cx, cy) => anel(cr, cx, cy, 38, 6, NaN, cor('#e8a93a')));
tile(7, 1, claro, (cx, cy) => barra(cr, 10, 44, 76, 8, 0.5, cor('#b8741a')));

sup.writeToPNG(saida);
print(`PNG gravado em ${saida} (${W}x${H})`);
