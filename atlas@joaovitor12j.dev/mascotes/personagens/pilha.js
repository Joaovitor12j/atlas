// Mascote Pilha (bateria baixa): desenho em Cairo e linha do tempo.

// Pilha cansada pedindo tomada. `q` vem de quadroPilha: {sobe, nivel, cansaco, suspiro}.
import {VOLTA} from '../../nucleo/matematica.js';
import {olhar} from '../desenho.js';
import {quadroSobeDesce} from '../movimento.js';

export function pilha(cr, w, h, q) {
    const pw = Math.min(w * 0.55, h * 0.5), ph = pw * 1.55;
    const pe = h + (1 - q.sobe) * h;
    const vermelho = [0.9, 0.25, 0.2, 1], contorno = [0.2, 0.2, 0.25, 1];
    cr.save();
    cr.translate(w / 2, pe);
    cr.rotate(q.cansaco * 0.08);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    // polo
    cr.rectangle(-pw * 0.2, -ph - pw * 0.12, pw * 0.4, pw * 0.14);
    cr.setSourceRGBA(0.7, 0.72, 0.78, 1);
    cr.fill();
    // corpo
    const r = pw * 0.18;
    cr.newPath();
    cr.arc(-pw / 2 + r, -ph + r, r, Math.PI, 1.5 * Math.PI);
    cr.arc(pw / 2 - r, -ph + r, r, 1.5 * Math.PI, 0);
    cr.arc(pw / 2 - r, -r, r, 0, 0.5 * Math.PI);
    cr.arc(-pw / 2 + r, -r, r, 0.5 * Math.PI, Math.PI);
    cr.closePath();
    cr.setSourceRGBA(0.93, 0.94, 0.97, 1);
    cr.fillPreserve();
    cr.setLineWidth(2);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    // carga: um fiapo vermelho no fundo
    const cargaH = (ph - pw * 0.2) * q.nivel;
    cr.rectangle(-pw * 0.38, -pw * 0.1 - cargaH, pw * 0.76, cargaH);
    cr.setSourceRGBA(...vermelho);
    cr.fill();
    // rosto cansado: olhos meio fechados com olheiras, boca torta
    const o = olhar(q);
    const ey = -ph * 0.68;
    for (const lado of [-1, 1]) {
        cr.arc(lado * pw * 0.2, ey, pw * 0.1, 0, VOLTA);
        cr.setSourceRGBA(1, 1, 1, 1);
        cr.fillPreserve();
        cr.setLineWidth(1.2);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
        cr.arc(lado * pw * 0.2 + o.x * pw * 0.03, ey + pw * 0.025 + o.y * pw * 0.02, pw * 0.045, 0, VOLTA);
        cr.fill();
        // pálpebra pesada
        cr.rectangle(lado * pw * 0.2 - pw * 0.11, ey - pw * 0.11, pw * 0.22, pw * (0.11 + 0.05 * q.suspiro));
        cr.setSourceRGBA(0.93, 0.94, 0.97, 1);
        cr.fillPreserve();
        cr.setSourceRGBA(...contorno);
        cr.setLineWidth(1.4);
        cr.moveTo(lado * pw * 0.2 - pw * 0.11, ey + pw * 0.05 * q.suspiro);
        cr.lineTo(lado * pw * 0.2 + pw * 0.11, ey + pw * 0.05 * q.suspiro);
        cr.stroke();
        cr.newPath();
    }
    cr.setLineWidth(1.6);
    cr.moveTo(-pw * 0.14, ey + pw * 0.3);
    cr.curveTo(-pw * 0.05, ey + pw * 0.24, pw * 0.05, ey + pw * 0.34, pw * 0.14, ey + pw * 0.28);
    cr.stroke();
    // gota de suor
    cr.arc(pw * 0.38, ey - pw * 0.05 + q.suspiro * pw * 0.05, pw * 0.05, 0, VOLTA);
    cr.setSourceRGBA(0.5, 0.75, 1, 0.9);
    cr.fill();
    cr.restore();
}

const PILHA = {sobe: 500, fica: 3200, desce: 450};

export const duracaoPilha = () => PILHA.sobe + PILHA.fica + PILHA.desce;

// Estado da pilha em `t` ms: {sobe, esmaga, alfa, nivel, cansaco, suspiro}. `nivel` (0 a 1) é a carga, sempre baixa e
// piscando; `cansaco` de -1 a 1 é o balanço de sono em pé e `suspiro` de 0 a 1 a pausa pesada. null depois do fim.
export function quadroPilha(t, saida = 'cai') {
    const q = quadroSobeDesce(t, PILHA, saida);
    if (!q)
        return null;
    return {
        ...q,
        nivel: 0.1 + 0.05 * Math.abs(Math.sin(t / 420)),
        cansaco: Math.sin(t / 700) * 0.8,
        suspiro: 0.5 + 0.5 * Math.sin(t / 900),
    };
}
