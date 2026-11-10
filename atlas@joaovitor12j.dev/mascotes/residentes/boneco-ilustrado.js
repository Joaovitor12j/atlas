// Mascote residente: Boneco de neve ilustrado (tema Noite de neve, materiais). Mora na doca do tema e nunca sai; desenho, linha do tempo e estados num lugar só.

import {VOLTA} from '../../nucleo/matematica.js';

// Boneco de neve ilustrado (mascote residente dos temas de neve): três bolas, braços, cachecol e cenoura.
export function bonecoIlustrado(cr, w, h, q) {
    const gw = w * 0.5, gh = h * 0.78;
    cr.save();
    cr.translate(w / 2, h * 0.85 - q.salto * gh * 0.12);
    cr.rotate(q.gingado * Math.PI / 180);
    cr.setSourceRGBA(0.97, 0.98, 1, 1);

    // braços
    cr.setLineWidth(gw * 0.06);
    cr.setSourceRGBA(0.4, 0.28, 0.16, 1);
    for (const lado of [-1, 1]) {
        cr.save();
        cr.translate(lado * gw * 0.32, -gh * 0.45);
        cr.rotate(lado * -q.braco * Math.PI / 180 * (lado === 1 ? 1 : -0.3));
        cr.moveTo(0, 0);
        cr.lineTo(lado * gw * 0.35, -gw * 0.05);
        cr.stroke();
        cr.restore();
    }

    // corpo: bola de baixo e de cima
    cr.setSourceRGBA(0.97, 0.98, 1, 1);
    cr.newPath();
    cr.arc(0, -gh * 0.2, gw * 0.42, 0, VOLTA);
    cr.fill();
    cr.newPath();
    cr.arc(0, -gh * 0.62, gw * 0.28, 0, VOLTA);
    cr.fill();

    // cachecol
    cr.save();
    cr.translate(0, -gh * 0.48);
    cr.rotate(q.cachecol * Math.PI / 180 * 0.1);
    cr.setSourceRGBA(0.8, 0.2, 0.2, 1);
    cr.newPath();
    cr.rectangle(-gw * 0.3, -gw * 0.06, gw * 0.6, gw * 0.12);
    cr.fill();
    cr.save();
    cr.translate(gw * 0.26, 0);
    cr.rotate(q.cachecol * Math.PI / 180);
    cr.rectangle(0, 0, gw * 0.08, gh * 0.22);
    cr.fill();
    cr.restore();
    cr.restore();

    // cenoura e olhos de carvão
    cr.setSourceRGBA(0.95, 0.5, 0.15, 1);
    cr.newPath();
    cr.moveTo(gw * 0.1, -gh * 0.63);
    cr.lineTo(gw * 0.32, -gh * 0.6);
    cr.lineTo(gw * 0.1, -gh * 0.57);
    cr.closePath();
    cr.fill();
    cr.setSourceRGBA(0.08, 0.08, 0.1, 1);
    for (const lado of [-1, 1]) {
        if (q.dormindo) {
            cr.setLineWidth(1.4);
            cr.moveTo(lado * gw * 0.08 - gw * 0.1, -gh * 0.68);
            cr.lineTo(lado * gw * 0.08 - gw * 0.04, -gh * 0.68);
            cr.stroke();
        } else {
            cr.newPath();
            cr.arc(lado * gw * 0.08 - gw * 0.07, -gh * 0.68, gw * 0.025, 0, VOLTA);
            cr.fill();
        }
    }
    cr.restore();
}

// Boneco de neve ilustrado (tema Noite de neve/materiais): salto com gingado, braço acena, cachecol balança.
export function quadroBonecoIlustrado(t, estado) {
    const dormindo = estado === 'dormindo';
    const saltitando = estado === 'saltitando';
    const salto = saltitando ? Math.abs(Math.sin(t / 700 * Math.PI * 2)) : 0;
    const gingado = saltitando ? Math.sin(t / 700 * Math.PI * 2) * 6 : 0;
    const braco = estado === 'acenando' ? -10 - 52 * (0.5 + 0.5 * Math.sin(t / 500 * Math.PI * 2)) : -4;
    const cachecol = dormindo ? 0 : Math.sin(t / 650 * Math.PI * 2) * 8;
    return {salto, gingado, braco, cachecol, dormindo};
}

// `estados` é [[id, peso]] (sorteio em proximoEstadoResidente); `duracaoMs` dá a faixa [min, max] de cada estado.
export const residente = {
    tema: 'nevemat',
    id: 'boneco-ilustrado',
    estados: [['parado', 5], ['saltitando', 3], ['acenando', 2], ['dormindo', 1]],
    duracaoMs: {parado: [3000, 6000], saltitando: [2000, 3500], acenando: [2000, 3500], dormindo: [5000, 9000]},
    tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.8)}),
    desenhar: bonecoIlustrado,
    quadro: quadroBonecoIlustrado,
};
