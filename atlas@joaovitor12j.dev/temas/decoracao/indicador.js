// Indicador de app aberto dos temas de pacote (coração, folha, estrela-do-mar, floco...).

// Glifos 5 x 5 dos indicadores pixel.
import Cairo from 'gi://cairo';
import {VOLTA} from '../../nucleo/matematica.js';
import {fonte, radial, retangulo, rgba} from './cairo.js';
import {px} from './pixel.js';

const GLIFO_IND = {
    vila: [['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'], {r: '#e0314b'}],
    floresta: [['..g..', '.ggg.', 'ggGgg', '.gGg.', '..G..'], {g: '#8fd96a', G: '#4f9a45'}],
    lua: [['..y..', '..y..', 'yyyyy', '.yyy.', '.y.y.'], {y: '#ffd36b'}],
    praia: [['..o..', 'o.o.o', '.ooo.', 'ooooo', 'o...o'], {o: '#e8744b'}],
    nevepixel: [['..w..', '.w.w.', 'w.w.w', '.w.w.', '..w..'], {w: '#ffffff'}],
};

// Indicador de app aberto no tema `id`, centrado na área w x h.
export function desenharIndicador(cr, id, w, h) {
    const cx = w / 2, cy = h / 2;
    if (GLIFO_IND[id]) {
        const [m, cores] = GLIFO_IND[id];
        const p = w / 5;
        m.forEach((linha, j) => [...linha].forEach((ch, i) => {
            if (!cores[ch])
                return;
            fonte(cr, cores[ch]);
            px(cr, p, i, j);
            cr.fill();
        }));
        return;
    }
    switch (id) {
    case 'aurora':
        cr.setSource(radial(cx, cy, w / 2, [[0, '#ffffff', 0.9], [0.18, '#ffffff', 0.9], [0.2, '#ffffff', 0.5], [1, '#ffffff', 0]]));
        cr.paint();
        break;
    case 'jardim':
        // folha: cantos opostos redondos (border-radius 0 100% 0 100%)
        fonte(cr, '#4f8a45');
        cr.moveTo(0, h);
        cr.curveTo(0, h * 0.2, w * 0.35, 0, w, 0);
        cr.curveTo(w, h * 0.8, w * 0.65, h, 0, h);
        cr.fill();
        break;
    case 'chuva': {
        const bw = w * 14 / 22, bh = h * 3 / 10;
        for (let j = 3; j >= 1; j--) {
            retangulo(cr, cx - bw / 2 - j * 1.5, cy - bh / 2 - j * 1.5, bw + j * 3, bh + j * 3, bh);
            fonte(cr, '#55ffff', 0.15);
            cr.fill();
        }
        retangulo(cr, cx - bw / 2, cy - bh / 2, bw, bh, 2);
        fonte(cr, '#55ffff');
        cr.fill();
        break;
    }
    case 'nevemat':
        cr.setSource(radial(cx, cy, w / 2, [[0, '#bfe0ff', 0.6], [1, '#7fb6ff', 0]]));
        cr.paint();
        floco(cr, cx, cy, w * 0.3, '#ffffff');
        break;
    case 'vitrine': {
        // etiqueta de presente creme com furo vermelho
        const tw = 14 * w / 16, th = 18 * h / 20;
        const x0 = cx - tw / 2, y0 = cy - th / 2;
        cr.setSourceRGBA(0, 0, 0, 0.25);
        cr.rectangle(x0 + 1, y0 + th * 0.22 + 1, tw, th * 0.78);
        cr.fill();
        fonte(cr, '#fff6e0');
        cr.moveTo(cx, y0);
        cr.lineTo(x0 + tw, y0 + th * 0.22);
        cr.lineTo(x0 + tw, y0 + th);
        cr.lineTo(x0, y0 + th);
        cr.lineTo(x0, y0 + th * 0.22);
        cr.closePath();
        cr.fill();
        fonte(cr, '#a31423');
        cr.arc(cx, y0 + th * 0.36, Math.max(1, tw * 0.11), 0, VOLTA);
        cr.fill();
        break;
    }
    case 'brasileiro': {
        cr.setSource(radial(cx, cy, w / 2, [[0.4, '#ff505a', 0.55], [1, '#ff505a', 0]]));
        cr.paint();
        const rb = w * 11 / 40;
        cr.setSource(new Cairo.RadialGradient(cx - rb * 0.3, cy - rb * 0.4, 0, cx, cy, rb));
        const g = cr.getSource();
        g.addColorStopRGBA(0, 1, 1, 1, 1);
        g.addColorStopRGBA(0.45, ...rgba('#e5333f'));
        g.addColorStopRGBA(1, ...rgba('#8c1420'));
        cr.arc(cx, cy, rb, 0, VOLTA);
        cr.fill();
        break;
    }
    }
}

// Floco de neve de seis braços com raio r.
function floco(cr, cx, cy, r, css) {
    fonte(cr, css);
    cr.setLineWidth(Math.max(1, r * 0.18));
    cr.setLineCap(Cairo.LineCap.ROUND);
    for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const dx = Math.cos(a), dy = Math.sin(a);
        cr.moveTo(cx, cy);
        cr.lineTo(cx + dx * r, cy + dy * r);
        const bx = cx + dx * r * 0.55, by = cy + dy * r * 0.55;
        for (const s of [-1, 1]) {
            const b = a + s * Math.PI / 4;
            cr.moveTo(bx, by);
            cr.lineTo(bx + Math.cos(b) * r * 0.32, by + Math.sin(b) * r * 0.32);
        }
    }
    cr.stroke();
}
