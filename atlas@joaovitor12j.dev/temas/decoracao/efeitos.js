// Efeitos de época dos temas de pacote (neve, luzinhas, brilhos, mar): partes animadas dentro do vidro da doca.
import {VOLTA} from '../../nucleo/matematica.js';
import {fonte, radial, rng} from './cairo.js';
import {CORES_LUZ, posicoesLuzes} from './material.js';
import {ALTURA, fioPixel, px} from './pixel.js';

const onda = (t, periodo, fase = 0) => 0.5 + 0.5 * Math.sin((t / periodo) * VOLTA + fase);

function brilhoLuzes(cr, w, h, t, y, raio) {
    const k = h / 86;
    posicoesLuzes(w).forEach(([x, css], i) => {
        const b = onda(t, 2600, -i * 1.2);
        cr.setSource(radial(x + 3 * k, y, raio * k, [[0, css, 0.9 * b], [0.35, css, 0.5 * b], [1, css, 0]]));
        cr.paint();
    });
}

// Flocos caindo pelo vidro (n flocos, tamanho de 3 a 5 px na escala k).
function nevando(cr, w, h, t, k, n) {
    cr.setSourceRGBA(1, 1, 1, 0.85);
    for (let i = 0; i < n; i++) {
        const v = 9000 + (i % 5) * 1000;
        const f = ((t + i * 2311) % v) / v;
        const x = ((i * 0.137 + 0.04) % 1) * w + Math.sin(t / 1500 + i) * 4 * k;
        cr.newSubPath();
        cr.arc(x, -6 + f * (h + 12), (1.5 + (i % 3) * 0.5) * k, 0, VOLTA);
    }
    cr.fill();
}

export const EFEITOS_TEMA = {
    floresta(cr, w, h, t) {
        // vagalumes acendendo devagar
        const p = h / ALTURA;
        [[0.22, 14], [0.52, 10], [0.73, 22], [0.93, 16]].forEach(([fx, y], i) => {
            const a = onda(t, 3100, i * 1.7);
            const x = fx * w;
            cr.setSource(radial(x, y * p, 3 * p, [[0, '#f4ff9a', 0.4 + a * 0.6], [0.4, '#f4ff9a', 0.08 + a * 0.18], [1, '#f4ff9a', 0]]));
            cr.paint();
        });
    },
    lua(cr, w, h, t) {
        // algumas estrelas piscam
        const p = h / ALTURA;
        const r = rng(19);
        for (let i = 0; i < Math.round(w / p / 30); i++) {
            const x = Math.floor((3 + r() * (w / p - 6))), y = 4 + Math.floor(r() * (ALTURA - 8));
            if (Math.sin(t / 450 + i * 2) > 0.2) {
                cr.setSourceRGBA(1, 1, 1, 1);
                px(cr, p, x, y);
                cr.fill();
            }
        }
    },
    nevepixel(cr, w, h, t) {
        const p = h / ALTURA;
        let i = 0;
        for (let x = 9; x < w / p - 6; x += 11, i++) {
            const y = 5 + fioPixel(x), b = onda(t, 4500, i * 1.9);
            fonte(cr, CORES_LUZ[i % 4], 0.4 + 0.6 * b);
            px(cr, p, x, y, 2, 2);
            cr.fill();
            if (b > 0.85) {
                fonte(cr, CORES_LUZ[i % 4], 0.3);
                px(cr, p, x - 1, y, 4, 2);
                px(cr, p, x, y - 1, 2, 4);
                cr.fill();
            }
        }
        cr.setSourceRGBA(1, 1, 1, 0.85);
        for (let j = 0; j < Math.round(w / p / 6); j++) {
            const v = 5 + (j % 5) * 2.4;
            const yy = (((j * 29) % 86) + t / 1000 * v) % (ALTURA + 4) - 2;
            const xx = ((j * 47 + 13) % Math.round(w / p)) + Math.sin(t / 1000 * (0.8 + (j % 4) * 0.4) + j * 1.7) * 3;
            px(cr, p, Math.round(xx), Math.round(yy));
            if (j % 5 === 0) {
                px(cr, p, Math.round(xx) - 1, Math.round(yy), 3, 1);
                px(cr, p, Math.round(xx), Math.round(yy) - 1, 1, 3);
            }
        }
        cr.fill();
    },
    jardim(cr, w, h, t) {
        // pétalas caindo
        const k = h / 86;
        [[0.12, 8000, 0], [0.3, 10000, 3000], [0.52, 8000, 5000], [0.7, 9000, 1500], [0.88, 11000, 6500]].forEach(([fx, v, d]) => {
            const f = ((t + d) % v) / v;
            cr.save();
            cr.translate(fx * w - 40 * k * f, -10 * k + 120 * k * f);
            cr.rotate(f * 300 * Math.PI / 180);
            cr.scale(4 * k, 2.5 * k);
            cr.arc(0, 0, 1, 0, VOLTA);
            cr.restore();
            fonte(cr, '#ffc2d1', 0.9 * (1 - f));
            cr.fill();
        });
    },
    chuva(cr, w, h, t) {
        // gotas escorrendo pelo vidro
        const k = h / 86;
        [[0.14, 6000, 1000], [0.41, 7000, 3400], [0.67, 6000, 2000], [0.9, 8000, 4600]].forEach(([fx, v, d]) => {
            const f = ((t + d) % v) / v;
            const a = f < 0.15 ? f / 0.15 : 1 - 0.8 * (f - 0.15) / 0.85;
            const x = fx * w, y = -10 * k + f * (h + 10 * k);
            cr.save();
            cr.translate(x, y);
            cr.scale(3 * k, 4.5 * k);
            cr.arc(0, 0, 1, 0, VOLTA);
            cr.restore();
            cr.setSource(radial(x - k, y - 1.5 * k, 4 * k, [[0, '#ffffff', 0.85 * a], [1, '#a0c8ff', 0.25 * a]]));
            cr.fill();
        });
    },
    nevemat(cr, w, h, t) {
        brilhoLuzes(cr, w, h, t, 12.5 * h / 86, 9);
        nevando(cr, w, h, t, h / 86, 18);
    },
    vitrine(cr, w, h, t) {
        // brilhos dourados de quatro pontas acendendo em ritmos diferentes
        const k = h / 86;
        [[0.07, 0.22, 0], [0.23, 0.7, 1000], [0.41, 0.18, 2000], [0.63, 0.72, 600], [0.79, 0.2, 1600], [0.93, 0.64, 2400]].forEach(([fx, fy, d]) => {
            const b = Math.max(0, Math.sin(((t + d) % 3000) / 3000 * Math.PI));
            if (b <= 0.02)
                return;
            const x = fx * w, y = fy * h, r = 10.8 * k * b;
            cr.setSource(radial(x, y, r, [[0, '#ffffff', b], [0.35, '#ffe27a', 0.9 * b], [0.7, '#ffe27a', 0]]));
            cr.moveTo(x, y - r);
            cr.lineTo(x + r * 0.2, y - r * 0.2);
            cr.lineTo(x + r, y);
            cr.lineTo(x + r * 0.2, y + r * 0.2);
            cr.lineTo(x, y + r);
            cr.lineTo(x - r * 0.2, y + r * 0.2);
            cr.lineTo(x - r, y);
            cr.lineTo(x - r * 0.2, y - r * 0.2);
            cr.closePath();
            cr.fill();
        });
    },
    brasileiro(cr, w, h, t) {
        brilhoLuzes(cr, w, h, t, 8 * h / 86, 8);
    },
};
