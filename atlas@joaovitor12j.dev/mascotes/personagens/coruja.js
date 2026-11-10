// Mascote Coruja: desenho em Cairo e linha do tempo.

// Coruja marrom. `q` vem de quadroCoruja: {sobe, sono, olhos, cabeca}. Dormindo, os olhos viram traços e sobem "z".
import {limitar01, rampa, VOLTA} from '../../nucleo/matematica.js';
import {olhar} from '../desenho.js';
import {piscada, quadroSobeDesce} from '../movimento.js';

export function coruja(cr, w, h, q) {
    const gw = Math.min(w * 0.7, h * 0.75);
    const pe = h + (1 - q.sobe) * h;
    const marrom = [0.55, 0.38, 0.22, 1], claro = [0.86, 0.72, 0.5, 1], contorno = [0.2, 0.12, 0.06, 1];
    cr.save();
    cr.translate(w / 2, pe);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    cr.rotate(q.cabeca * 0.08);
    // corpo
    cr.save();
    cr.translate(0, -gw * 0.42);
    cr.scale(1, 1.15);
    cr.arc(0, 0, gw * 0.4, 0, VOLTA);
    cr.restore();
    cr.setSourceRGBA(...marrom);
    cr.fillPreserve();
    cr.setLineWidth(1.5);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    // barriga com penas
    cr.save();
    cr.translate(0, -gw * 0.32);
    cr.scale(1, 1.15);
    cr.arc(0, 0, gw * 0.24, 0, VOLTA);
    cr.restore();
    cr.setSourceRGBA(...claro);
    cr.fill();
    cr.setSourceRGBA(...marrom);
    cr.setLineWidth(1);
    for (let i = 0; i < 6; i++) {
        const x = ((i % 3) - 1) * gw * 0.12, y = -gw * (0.45 - 0.1 * Math.floor(i / 3) - (i % 2) * 0.05);
        cr.arc(x, y, gw * 0.05, 0, Math.PI);
        cr.stroke();
    }
    // asas
    for (const lado of [-1, 1]) {
        cr.save();
        cr.translate(lado * gw * 0.36, -gw * 0.45);
        cr.rotate(lado * (0.15 + q.sono * 0.1));
        cr.scale(0.55, 1.3);
        cr.arc(0, 0, gw * 0.16, 0, VOLTA);
        cr.restore();
        cr.setSourceRGBA(0.45, 0.3, 0.16, 1);
        cr.fillPreserve();
        cr.setLineWidth(1.2);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
    }
    // pés
    cr.setSourceRGBA(0.95, 0.65, 0.2, 1);
    for (const lado of [-1, 1]) {
        cr.arc(lado * gw * 0.14, -gw * 0.02, gw * 0.07, Math.PI, 0);
        cr.fill();
    }
    // cabeça: tufos, olhões, bico
    cr.save();
    cr.translate(q.cabeca * gw * 0.04, -gw * 0.85);
    for (const lado of [-1, 1]) {
        cr.moveTo(lado * gw * 0.3, gw * 0.02);
        cr.lineTo(lado * gw * 0.28, -gw * 0.3);
        cr.lineTo(lado * gw * 0.08, -gw * 0.12);
        cr.closePath();
        cr.setSourceRGBA(...marrom);
        cr.fillPreserve();
        cr.setLineWidth(1.3);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
    }
    const o = olhar(q);
    for (const lado of [-1, 1]) {
        cr.save();
        cr.translate(lado * gw * 0.18, 0);
        cr.arc(0, 0, gw * 0.17, 0, VOLTA);
        cr.setSourceRGBA(...claro);
        cr.fillPreserve();
        cr.setLineWidth(1.2);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
        if (q.olhos > 0.1) {
            cr.save();
            cr.scale(1, q.olhos);
            cr.arc(o.x * gw * 0.04, o.y * gw * 0.03, gw * 0.085, 0, VOLTA);
            cr.setSourceRGBA(0.98, 0.8, 0.15, 1);
            cr.fill();
            cr.arc(o.x * gw * 0.05, o.y * gw * 0.04, gw * 0.045, 0, VOLTA);
            cr.setSourceRGBA(0.05, 0.05, 0.05, 1);
            cr.fill();
            cr.restore();
        } else { // dormindo: pálpebra
            cr.setLineWidth(1.6);
            cr.setSourceRGBA(...contorno);
            cr.arc(0, -gw * 0.04, gw * 0.09, 0.15 * Math.PI, 0.85 * Math.PI);
            cr.stroke();
        }
        cr.restore();
    }
    cr.moveTo(-gw * 0.06, gw * 0.1);
    cr.lineTo(gw * 0.06, gw * 0.1);
    cr.lineTo(0, gw * 0.22);
    cr.closePath();
    cr.setSourceRGBA(0.95, 0.65, 0.2, 1);
    cr.fillPreserve();
    cr.setLineWidth(1);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    cr.restore();
    // "z" subindo enquanto dorme
    if (q.sono > 0.3) {
        cr.setSourceRGBA(0.75, 0.85, 1, q.sono * 0.9);
        cr.selectFontFace('sans-serif', 0, 1);
        for (let i = 0; i < 2; i++) {
            cr.setFontSize(gw * (0.16 + 0.08 * i));
            cr.moveTo(gw * (0.38 + 0.12 * i), -gw * (1.0 + 0.2 * i));
            cr.showText('z');
        }
    }
    cr.restore();
}

const CORUJA = {sobe: 450, fica: 3600, desce: 400};

export const duracaoCoruja = () => CORUJA.sobe + CORUJA.fica + CORUJA.desce;

// Estado da coruja em `t` ms: {sobe, esmaga, alfa, sono, olhos, cabeca}. Sobe dormindo (`sono` 1, olhos fechados),
// acorda, pisca e olha em volta (`cabeca` de -1 a 1) e volta a dormir antes de descer. null depois do fim.
export function quadroCoruja(t, saida = 'cai') {
    const q = quadroSobeDesce(t, CORUJA, saida);
    if (!q)
        return null;
    const fimFica = CORUJA.sobe + CORUJA.fica;
    const sono = 1 - rampa(t, CORUJA.sobe + 400, CORUJA.sobe + 900) + rampa(t, fimFica - 900, fimFica - 300);
    const sonoOk = limitar01(sono);
    return {...q, sono: sonoOk, olhos: (1 - sonoOk) * piscada(t, 1700), cabeca: Math.sin(t / 650) * (1 - sonoOk)};
}
