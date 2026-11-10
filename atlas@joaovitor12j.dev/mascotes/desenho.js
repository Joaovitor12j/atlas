// Peças de desenho Cairo que mais de um mascote usa (rosto, gota, grupo com transparência, passeio).

// Desenha `fn` num grupo e pinta com `alfa` (sumir de uma vez, sem mexer em cada cor).
import {VOLTA} from '../nucleo/matematica.js';

export function comAlfa(cr, alfa, fn) {
    if (alfa >= 0.999) {
        fn();
        return;
    }
    cr.pushGroup();
    fn();
    cr.popGroupToSource();
    cr.paintWithAlpha(Math.max(0, alfa));
}

// Olhos e boca simples num rosto centrado em (x, y) de raio `r`. `boca`: 'sorriso', 'aflito' ou 'aberta'.
export function rosto(cr, x, y, r, boca = 'sorriso', olhos = true) {
    cr.setSourceRGBA(0.12, 0.1, 0.1, 1);
    if (olhos) {
        for (const lado of [-1, 1]) {
            cr.arc(x + lado * r * 0.36, y - r * 0.12, r * 0.11, 0, VOLTA);
            cr.fill();
        }
    }
    cr.setLineWidth(Math.max(1, r * 0.1));
    cr.setLineCap(1);
    if (boca === 'aberta') {
        cr.save();
        cr.translate(x, y + r * 0.38);
        cr.scale(1, 0.75);
        cr.arc(0, 0, r * 0.22, 0, VOLTA);
        cr.restore();
        cr.fill();
    } else if (boca === 'aflito') {
        cr.arc(x, y + r * 0.62, r * 0.28, Math.PI * 1.15, Math.PI * 1.85);
        cr.stroke();
    } else {
        cr.arc(x, y + r * 0.12, r * 0.38, Math.PI * 0.2, Math.PI * 0.8);
        cr.stroke();
    }
}

// Gota d'água (ponta para cima) com a base redonda em (x, y) e raio `r`.
export function gota(cr, x, y, r, rgba) {
    cr.moveTo(x, y - r * 2.2);
    cr.curveTo(x + r * 0.4, y - r * 1.3, x + r, y - r * 0.6, x + r, y);
    cr.arc(x, y, r, 0, Math.PI);
    cr.curveTo(x - r, y - r * 0.6, x - r * 0.4, y - r * 1.3, x, y - r * 2.2);
    cr.closePath();
    cr.setSourceRGBA(...rgba);
    cr.fill();
}

// Leva um mascote desenhado em (0, 0, w, h) (fantasma, esqueleto, noel, boneco, chama) para passear pela doca. `q` vem de
// quadroPasseio (logica.js); `fig` é o tamanho da figura em múltiplos do ícone ([largura, altura]); `desenhar` é o desenho
// do mascote e `quadroFig` converte o estado do passeio no estado que esse desenho espera.
export function passear(cr, w, h, q, ctx, fig, desenhar, quadroFig) {
    const {base, icone} = ctx;
    const fw = Math.round(icone * fig[0]);
    const fh = Math.round(icone * fig[1]);
    cr.save();
    cr.translate(q.x * w, base - q.dy * fh); // pés da figura, no ponto do passeio
    cr.rotate(q.rot);
    cr.scale(q.sx, q.sy);
    cr.translate(-fw / 2, -fh);
    desenhar(cr, fw, fh, quadroFig(q), ctx);
    cr.restore();
}

export const olhar = q => q.olhar ?? {x: 0, y: 0};

export const TOPO = -Math.PI / 2;

export const limitar = f => Math.max(0, Math.min(1, Number.isFinite(f) ? f : 0));

export const easeIn = x => Math.max(0, Math.min(1, x)) ** 2;
