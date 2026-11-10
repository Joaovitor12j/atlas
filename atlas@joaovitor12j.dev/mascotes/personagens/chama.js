// Mascote Chama (memória alta): desenho em Cairo e linha do tempo.

// Chama no retângulo (0, 0, w, h): sobe de trás da borda de baixo e dança, com cara de quem não aguenta o calor.
// `q` vem de quadroChama (logica.js): {sobe, fase, aflicao}. Quem chama recorta no retângulo.
import {limitar01} from '../../nucleo/matematica.js';
import {olhar} from '../desenho.js';
import {faseSobeDesce} from '../movimento.js';

export function chama(cr, w, h, q) {
    const gw = w * 0.74, gh = h * 0.88;
    // contorno da chama com a ponta dançando; `k` a encolhe em direção à base
    const forma = (k, atraso) => {
        const f = q.fase + atraso;
        const ponta = Math.sin(f) * gw * 0.16;
        const lingua = Math.sin(f * 1.7 + 1) * gw * 0.06;
        cr.save();
        cr.translate(0, gh);
        cr.scale(k, k);
        cr.translate(0, -gh);
        cr.newPath();
        cr.moveTo(0, gh);
        cr.curveTo(-gw * 0.62, gh * 0.98, -gw * 0.58, gh * 0.55, -gw * 0.42 + lingua, gh * 0.24);
        cr.curveTo(-gw * 0.3, gh * 0.4, -gw * 0.2, gh * 0.45, -gw * 0.14, gh * 0.4);
        cr.curveTo(-gw * 0.05, gh * 0.25, ponta * 0.4, gh * 0.1, ponta, 0);
        cr.curveTo(gw * 0.2 + ponta * 0.3, gh * 0.2, gw * 0.62, gh * 0.5, gw * 0.5, gh * 0.78);
        cr.curveTo(gw * 0.44, gh * 0.95, gw * 0.2, gh, 0, gh);
        cr.closePath();
        cr.restore();
    };
    cr.save();
    cr.translate(w / 2, h - gh * q.sobe);
    cr.setLineJoin(1);
    forma(1, 0);
    cr.setSourceRGBA(0.88, 0.27, 0.16, 1);
    cr.fillPreserve();
    cr.setLineWidth(1.2);
    cr.setSourceRGBA(0.45, 0.1, 0.06, 0.6);
    cr.stroke();
    forma(0.74, 0.8);
    cr.setSourceRGBA(0.96, 0.6, 0.14, 1);
    cr.fill();
    forma(0.46, 1.6);
    cr.setSourceRGBA(1, 0.85, 0.37, 1);
    cr.fill();

    // cara: olhos arregalados e boca em "o" que cresce com a aflição; uma gota de suor
    const ya = gh * 0.66;
    for (const lado of [-1, 1]) {
        cr.arc(lado * gw * 0.15, ya, gw * (0.075 + 0.03 * q.aflicao), 0, Math.PI * 2);
        cr.setSourceRGBA(1, 1, 1, 1);
        cr.fill();
        cr.arc(lado * gw * 0.15 + olhar(q).x * gw * 0.035, ya + gw * 0.015 + olhar(q).y * gw * 0.025, gw * 0.035, 0, Math.PI * 2);
        cr.setSourceRGBA(0.1, 0.05, 0.05, 1);
        cr.fill();
    }
    cr.save();
    cr.translate(0, gh * 0.8);
    cr.scale(1, 0.8 + 0.8 * q.aflicao);
    cr.arc(0, 0, gw * (0.045 + 0.04 * q.aflicao), 0, Math.PI * 2);
    cr.restore();
    cr.setSourceRGBA(0.35, 0.05, 0.05, 1);
    cr.fill();
    cr.save();
    cr.translate(gw * 0.34, gh * 0.55 + q.aflicao * gh * 0.06 + Math.sin(q.fase * 2) * 1.5);
    cr.moveTo(0, -gw * 0.07);
    cr.curveTo(gw * 0.05, -gw * 0.01, gw * 0.05, gw * 0.04, 0, gw * 0.04);
    cr.curveTo(-gw * 0.05, gw * 0.04, -gw * 0.05, -gw * 0.01, 0, -gw * 0.07);
    cr.setSourceRGBA(0.55, 0.8, 1, 0.9 * q.aflicao);
    cr.fill();
    cr.restore();
    cr.restore();
}

const CHAMA = {sobe: 400, fica: 3200, desce: 400};

export const duracaoChama = () => CHAMA.sobe + CHAMA.fica + CHAMA.desce;

// Estado da chama em `t` ms: {sobe, fase, aflicao}. `sobe` de 0 a 1 (um pouco mais no overshoot), `fase` cresce sempre
// (dança da chama) e `aflicao` de 0 a 1 é o quanto ela está assustada com o calor. null depois do fim.
export function quadroChama(t, saida = 'cai') {
    t = Math.max(0, t);
    if (t >= duracaoChama())
        return null;
    const fimFica = CHAMA.sobe + CHAMA.fica;
    const q = {...faseSobeDesce(t, CHAMA, saida), fase: t / 110, aflicao: 0};
    q.aflicao = limitar01((t - CHAMA.sobe) / 600) * limitar01((fimFica - t) / 400);
    return q;
}
