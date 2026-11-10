// Mascote Satélite (sem rede): desenho em Cairo e linha do tempo.

// Satélite perdido procurando sinal. `q` vem de quadroSatelite: {sobe, giro, sinal, perdido}.
import {VOLTA} from '../../nucleo/matematica.js';
import {olhar} from '../desenho.js';
import {quadroSobeDesce} from '../movimento.js';

export function satelite(cr, w, h, q) {
    const s = Math.min(w * 0.45, h * 0.4);
    const corpoY = h - s * 0.9 * q.sobe + (1 - q.sobe) * s;
    cr.save();
    cr.translate(w / 2, corpoY);
    cr.rotate(q.giro * 0.4);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    const contorno = [0.15, 0.2, 0.35, 1];
    // painéis solares
    for (const lado of [-1, 1]) {
        cr.rectangle(lado > 0 ? s * 0.38 : -s * 0.98, -s * 0.2, s * 0.6, s * 0.4);
        cr.setSourceRGBA(0.2, 0.4, 0.8, 1);
        cr.fillPreserve();
        cr.setLineWidth(1.4);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
        cr.setLineWidth(0.8);
        for (let i = 1; i < 3; i++) {
            const x = (lado > 0 ? s * 0.38 : -s * 0.98) + s * 0.2 * i;
            cr.moveTo(x, -s * 0.2);
            cr.lineTo(x, s * 0.2);
            cr.stroke();
        }
    }
    // corpo
    cr.rectangle(-s * 0.38, -s * 0.3, s * 0.76, s * 0.6);
    cr.setSourceRGBA(0.85, 0.87, 0.92, 1);
    cr.fillPreserve();
    cr.setLineWidth(1.8);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    // carinha confusa
    const o = olhar(q);
    for (const lado of [-1, 1]) {
        cr.arc(lado * s * 0.16 + o.x * s * 0.03, -s * 0.05 + o.y * s * 0.03, s * 0.07, 0, VOLTA);
        cr.setSourceRGBA(...contorno);
        cr.fill();
    }
    cr.setLineWidth(1.4);
    cr.moveTo(-s * 0.12, s * 0.15);
    cr.curveTo(-s * 0.04, s * 0.1, s * 0.04, s * 0.2, s * 0.12, s * 0.14);
    cr.stroke();
    // antena parabólica no topo, girando
    cr.moveTo(0, -s * 0.3);
    cr.lineTo(0, -s * 0.5);
    cr.stroke();
    cr.arc(0, -s * 0.55, s * 0.17, Math.PI, 0);
    cr.closePath();
    cr.setSourceRGBA(0.95, 0.95, 1, 1);
    cr.fillPreserve();
    cr.stroke();
    // arcos de sinal que pulsam e esmaecem, e um "?" no fim
    cr.setLineWidth(2);
    for (let i = 0; i < 3; i++) {
        const f = (q.sinal + i / 3) % 1;
        cr.arc(0, -s * 0.6, s * (0.3 + 0.6 * f), -Math.PI * 0.8, -Math.PI * 0.2);
        cr.setSourceRGBA(1, 0.55, 0.3, (1 - f) * 0.8 * q.perdido);
        cr.stroke();
    }
    cr.setSourceRGBA(1, 0.55, 0.3, 0.95 * q.perdido);
    cr.selectFontFace('sans-serif', 0, 1);
    cr.setFontSize(s * 0.5);
    cr.moveTo(s * 0.6, -s * 0.7);
    cr.showText('?');
    cr.restore();
}

const SATELITE = {sobe: 500, fica: 3400, desce: 450};

export const duracaoSatelite = () => SATELITE.sobe + SATELITE.fica + SATELITE.desce;

// Estado do satélite em `t` ms: {sobe, esmaga, alfa, giro, sinal, perdido}. `giro` (rad) é o balanço da antena
// procurando o sinal e `sinal` (0 a 1) o pulso do arco que nunca chega; `perdido` vale 1 durante a permanência. null
// depois do fim.
export function quadroSatelite(t, saida = 'cai') {
    const q = quadroSobeDesce(t, SATELITE, saida);
    if (!q)
        return null;
    return {...q, giro: Math.sin(t / 520) * 0.5, sinal: (t % 1300) / 1300, perdido: q.ativo};
}
