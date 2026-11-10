// Temas de materiais (Aurora, Carta, Jardim, Chuva, Noite de neve, Vitrine, Natal brasileiro): vidro, papel e adornos em Cairo.

// Cada tema desenha no vidro (0, 0)-(w, h), com k = escala do protótipo (tile de 58 px) e r = raio do vidro.
import Cairo from 'gi://cairo';
import {VOLTA} from '../../nucleo/matematica.js';
import {aresta, fonte, linear, radial, retangulo, rgba} from './cairo.js';

export const MATERIAL = {
    aurora(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        // o vidro mostra a cena de trás (roxo para rosa), já borrada; cores amostradas do protótipo
        cr.setSource(linear(0, 0, w, 0, [[0, '#5247b1'], [0.1, '#5b58b7'], [0.3, '#7d55c8'], [0.49, '#b055d5'],
            [0.58, '#cf5bc6'], [0.65, '#e461bf'], [0.8, '#ff70c1'], [1, '#ff8a9e']]));
        cr.paint();
        // manchas de aurora: ciano à esquerda em cima, magenta à direita embaixo
        cr.setSource(radial(0.08 * w + 130 * k, 10 * k, 170 * k, [[0, '#7be4ff', 0.32], [1, '#7be4ff', 0]]));
        cr.paint();
        cr.setSource(radial(w - 0.06 * w - 130 * k, h + 5 * k, 170 * k, [[0, '#ff7ad9', 0.3], [1, '#ff7ad9', 0]]));
        cr.paint();
        cr.setSource(linear(0, 0, 0, h, [[0, '#ffffff', 0.1], [1, '#ffffff', 0]]));
        cr.paint();
        cr.restore();
        aresta(cr, w, h, r, 'rgba(255, 255, 255, 0.42)', 0.75, 0.14);
    },
    carta(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        fonte(cr, '#f1e7cf');
        cr.paint();
        // papel envelhecido nas bordas (inset 0 0 40px)
        const borda = 40 * k;
        for (const [x0, y0, x1, y1] of [[0, 0, 0, borda], [0, h, 0, h - borda], [0, 0, borda, 0], [w, 0, w - borda, 0]]) {
            cr.setSource(linear(x0, y0, x1, y1, [[0, '#966e32', 0.12], [1, '#966e32', 0]]));
            cr.paint();
        }
        // rosa dos ventos em marca d'água, à direita, antes dos widgets
        rosaDosVentos(cr, w - 210 * k - 75 * k, h / 2, 75 * k);
        // régua: marcas de 1 px a cada 12 px, em faixas de 6 px em cima e embaixo
        fonte(cr, '#27261f');
        for (let x = 0; x < w; x += 12 * k) {
            cr.rectangle(Math.round(x), 6 * k, 1, 6 * k);
            cr.rectangle(Math.round(x), h - 12 * k, 1, 6 * k);
        }
        cr.fill();
        // moldura dupla: papel de 4 px e linha de tinta de 1 px
        retangulo(cr, 4.5 * k, 4.5 * k, w - 9 * k, h - 9 * k, Math.max(0, r - 4 * k));
        cr.setLineWidth(Math.max(1, k));
        cr.stroke();
        cr.restore();
    },
    jardim(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        cr.setSource(linear(0, 0, 0, h, [[0, '#ffd2a6'], [0.15, '#ffcea3'], [0.5, '#ffbb96'], [1, '#fb9b83']]));
        cr.paint();
        // sol no canto de cima, à direita
        cr.setSource(radial(w + 90 * k, 20 * k, 150 * k, [[0, '#ffecaa', 0.9], [1, '#ffc878', 0]]));
        cr.paint();
        // copa de folhas no topo (o recorte de 46 x 22 do protótipo, repetido)
        fonte(cr, '#355f3b');
        const s = k;
        for (let x0 = 0; x0 < w; x0 += 46 * s) {
            cr.save();
            cr.translate(x0, -1 * s);
            cr.scale(s, s);
            cr.moveTo(0, 0);
            cr.lineTo(46, 0);
            cr.lineTo(46, 4);
            cr.curveTo(40, 4, 40, 14, 35, 20);
            cr.curveTo(30, 12, 28, 4, 22, 4);
            cr.curveTo(17, 4, 15, 10, 11, 17);
            cr.curveTo(7, 9, 5, 4, 0, 4);
            cr.closePath();
            cr.restore();
        }
        cr.fill();
        cr.restore();
        aresta(cr, w, h, r, 'rgba(255, 255, 255, 0.6)', 1, 0);
    },
    chuva(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        cr.setSource(linear(0, 0, 0, h, [[0, '#172640'], [1, '#0d172d']]));
        cr.paint();
        // bokeh atrás do vidro: rosa à esquerda, âmbar no meio e ciano à direita
        cr.setSource(radial(0.1 * w, 0.6 * h, 0.22 * w, [[0, '#7a2a6e', 0.75], [1, '#7a2a6e', 0]]));
        cr.paint();
        cr.setSource(radial(0.78 * w, 0.4 * h, 0.3 * w, [[0, '#00566a', 0.6], [1, '#00566a', 0]]));
        cr.paint();
        cr.setSource(radial(0.42 * w, -0.4 * h, 0.2 * w, [[0, '#6a4a20', 0.45], [1, '#6a4a20', 0]]));
        cr.paint();
        // chuva parada no vidro, em diagonal (104deg)
        cr.setSourceRGBA(190 / 255, 215 / 255, 1, 0.16);
        cr.setLineWidth(1);
        const inc = Math.tan(14 * Math.PI / 180) * h;
        for (let x = -inc; x < w + inc; x += 23 * k) {
            cr.moveTo(x + inc, 0);
            cr.lineTo(x, h);
        }
        cr.stroke();
        cr.restore();
        aresta(cr, w, h, r, 'rgba(160, 200, 255, 0.28)', 0.35, 0);
    },
    nevemat(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        cr.setSource(linear(0, 0, 0, h, [[0, '#3d63a3'], [0.4, '#305ba4'], [1, '#2057ab']]));
        cr.paint();
        // sincelos (46 x 14, opacidade .8) logo abaixo da neve
        fonte(cr, '#dcecff', 0.8);
        for (let x0 = 0; x0 < w; x0 += 46 * k) {
            cr.save();
            cr.translate(x0, 10 * k);
            cr.scale(k, k);
            for (const pts of [[[0, 0], [46, 0], [40, 3], [35, 14], [30, 3]], [[0, 0], [10, 0], [7, 2], [4, 9], [1, 2]]]) {
                cr.moveTo(...pts[0]);
                for (const q of pts.slice(1))
                    cr.lineTo(...q);
                cr.closePath();
            }
            cr.restore();
        }
        cr.fill();
        // neve acumulada: montinhos de 9 e 7 px a cada 26 px, 3 px acima do topo
        for (const [cx, cy, raio, css] of [[12, 5, 9, '#ffffff'], [25, 6, 7, '#e6f1ff']]) {
            fonte(cr, css);
            for (let x0 = -2 * k; x0 < w; x0 += 26 * k) {
                cr.newSubPath();
                cr.arc(x0 + cx * k, (cy - 3) * k, raio * k, 0, VOLTA);
            }
            cr.fill();
        }
        luzinhas(cr, w, k, 8 * k, 'neve');
        cr.restore();
        aresta(cr, w, h, r, 'rgba(255, 255, 255, 0.5)', 0.8, 0.12);
    },
    vitrine(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        cr.setSource(linear(0, 0, 0, h, [[0, '#d62839'], [1, '#a31423']]));
        cr.paint();
        // bolinhas brancas e douradas do papel de presente
        const passo = 22 * k;
        for (const [ox, raio, css, a] of [[10, 2.2, '#ffffff', 0.28], [21, 1.6, '#ffe27a', 0.3]]) {
            fonte(cr, css, a);
            for (let y = ox * k; y < h; y += passo) {
                for (let x = ox * k; x < w; x += passo) {
                    cr.newSubPath();
                    cr.arc(x, y, raio * k, 0, VOLTA);
                }
            }
            cr.fill();
        }
        // fita dourada atravessando no meio
        const fx = w / 2 - 15 * k;
        cr.setSource(linear(fx, 0, fx + 30 * k, 0, [[0, '#b8841a'], [0.35, '#ffe27a'], [0.55, '#ffd23f'], [1, '#b8841a']]));
        cr.rectangle(fx, 0, 30 * k, h);
        cr.fill();
        cr.setSourceRGBA(0, 0, 0, 0.15);
        cr.rectangle(fx - 1, 0, 1, h);
        cr.rectangle(fx + 30 * k, 0, 1, h);
        cr.fill();
        // realces: claro em cima, sombra de 2 px embaixo
        cr.setSourceRGBA(1, 1, 1, 0.35);
        cr.rectangle(0, 0, w, 1);
        cr.fill();
        cr.setSourceRGBA(0, 0, 0, 0.25);
        cr.rectangle(0, h - 2, w, 2);
        cr.fill();
        cr.restore();
        laco(cr, w / 2, k);
    },
    brasileiro(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        // vidro areia sobre o pôr do sol: rosa em cima, laranja embaixo
        cr.setSource(linear(0, 0, 0, h, [[0, '#f8949e'], [0.3, '#ff9490'], [0.6, '#ff9779'], [1, '#ffa161']]));
        cr.paint();
        // guirlanda de pinheiro no topo (três camadas de bolinhas, 3 px acima)
        for (const [cx, cy, raio, css] of [[10, 6, 8, '#2f8f4e'], [20, 5, 7, '#46b36a'], [0, 9, 6, '#276f3d']]) {
            fonte(cr, css);
            for (let x0 = 0; x0 < w + 20 * k; x0 += 20 * k) {
                cr.newSubPath();
                cr.arc(x0 + cx * k, (cy - 3) * k, raio * k, 0, VOLTA);
            }
            cr.fill();
        }
        luzinhas(cr, w, k, 5 * k, 'brasil');
        // bolas de Natal penduradas na guirlanda
        [[0.1, '#e5333f'], [0.33, '#ffd23f'], [0.55, '#3a8bff'], [0.77, '#e5333f'], [0.96, '#ffd23f']].forEach(([f, css]) => {
            const cx = f * w, cy = 18 * k, rb = 6 * k;
            cr.setSourceRGBA(0, 0, 0, 0.3);
            cr.arc(cx, cy + 2 * k, rb, 0, VOLTA);
            cr.fill();
            cr.setSource(new Cairo.RadialGradient(cx - 2 * k, cy - 2.5 * k, 0, cx, cy, rb));
            const g = cr.getSource();
            g.addColorStopRGBA(0, 1, 1, 1, 1);
            g.addColorStopRGBA(0.4, ...rgba(css));
            g.addColorStopRGBA(1, ...rgba(css).slice(0, 3).map(c => c * 0.65), 1);
            cr.arc(cx, cy, rb, 0, VOLTA);
            cr.fill();
        });
        cr.restore();
        aresta(cr, w, h, r, 'rgba(255, 255, 255, 0.6)', 1, 0);
    },
};

// Posições (fração da largura) e cores das luzinhas de cada fio, como no protótipo.
export const CORES_LUZ = ['#ff4d4d', '#ffd23f', '#4dd96b', '#4db5ff'];

export const posicoesLuzes = w => {
    const lista = [];
    for (let i = 0, f = 0.05; f < 0.97; i++, f += 0.11)
        lista.push([f * w, CORES_LUZ[i % 4]]);
    return lista;
};

// Luzinhas apagadas (a cor de base); o brilho que pisca vem do efeito de época.
function luzinhas(cr, w, k, y, tipo) {
    for (const [x, css] of posicoesLuzes(w)) {
        if (tipo === 'neve') {
            fonte(cr, '#1b2a4a');
            cr.rectangle(x + 2 * k, y - 4 * k, 2 * k, 4 * k);
            cr.fill();
            fonte(cr, css, 0.8);
            cr.save();
            cr.translate(x + 3 * k, y + 4.5 * k);
            cr.scale(3 * k, 4.5 * k);
            cr.arc(0, 0, 1, 0, VOLTA);
            cr.restore();
            cr.fill();
        } else {
            fonte(cr, css, 0.75);
            cr.arc(x + 3 * k, y + 3 * k, 3 * k, 0, VOLTA);
            cr.fill();
        }
    }
}

// Laço dourado no topo do tema Vitrine (76 x 44, 30 px acima do vidro), centrado em cx.
function laco(cr, cx, k) {
    cr.save();
    cr.translate(cx - 38 * k, -30 * k);
    cr.scale(k, k);
    cr.setSourceRGBA(0, 0, 0, 0.3);
    cr.save();
    cr.translate(0, 4);
    lacoForma(cr, true);
    cr.restore();
    lacoForma(cr, false);
    cr.restore();
}

function lacoForma(cr, sombra) {
    const pinta = css => (sombra ? null : fonte(cr, css));
    pinta('#ffd23f');
    cr.moveTo(38, 26);
    cr.curveTo(28, 4, 4, 0, 4, 14);
    cr.curveTo(4, 28, 24, 28, 38, 26);
    cr.moveTo(38, 26);
    cr.curveTo(48, 4, 72, 0, 72, 14);
    cr.curveTo(72, 28, 52, 28, 38, 26);
    cr.fill();
    pinta('#e0b020');
    for (const pts of [[[34, 28], [22, 44], [32, 44], [38, 30]], [[42, 28], [54, 44], [44, 44], [38, 30]]]) {
        cr.moveTo(...pts[0]);
        for (const q of pts.slice(1))
            cr.lineTo(...q);
        cr.closePath();
    }
    cr.fill();
    if (sombra)
        return;
    fonte(cr, '#b8841a');
    cr.setLineWidth(1.5);
    cr.moveTo(38, 26);
    cr.curveTo(28, 8, 12, 6, 10, 14);
    cr.moveTo(38, 26);
    cr.curveTo(48, 8, 64, 6, 66, 14);
    cr.stroke();
    fonte(cr, '#ffe27a');
    cr.arc(38, 26, 6, 0, VOLTA);
    cr.fill();
}

// Rosa dos ventos em traço fino (marca d'água do tema Carta), raio `r` com centro em (cx, cy).
function rosaDosVentos(cr, cx, cy, r) {
    cr.save();
    cr.translate(cx, cy);
    cr.scale(r / 50, r / 50);
    cr.setSourceRGBA(39 / 255, 38 / 255, 31 / 255, 0.1);
    cr.setLineWidth(0.8);
    for (const raio of [40, 30]) {
        cr.newSubPath();
        cr.arc(0, 0, raio, 0, VOLTA);
    }
    cr.moveTo(-34, -34);
    cr.lineTo(34, 34);
    cr.moveTo(34, -34);
    cr.lineTo(-34, 34);
    cr.stroke();
    const estrela = [[0, -48], [6, -6], [48, 0], [6, 6], [0, 48], [-6, 6], [-48, 0], [-6, -6]];
    cr.moveTo(...estrela[0]);
    for (const q of estrela.slice(1))
        cr.lineTo(...q);
    cr.closePath();
    cr.fill();
    cr.restore();
}
