// Mascote Esqueleto (Halloween): desenho em Cairo e linha do tempo.

// Esqueleto no retângulo (0, 0, w, h): sobe de trás da borda de baixo, acena e bate o queixo.
// `q` vem de quadroEsqueleto (logica.js): {sobe, balanco, aceno, mandibula}. Quem chama recorta no retângulo.
import {limitar01} from '../../nucleo/matematica.js';
import {olhar} from '../desenho.js';
import {faseSobeDesce} from '../movimento.js';

export function esqueleto(cr, w, h, q) {
    const alt = h * 0.9;
    const r = Math.min(w * 0.28, alt / 5.6);
    const osso = [0.95, 0.93, 0.85, 1];
    const sombra = [0.2, 0.17, 0.12, 0.8];
    const vazio = [0.08, 0.06, 0.1, 1];
    // um osso: contorno escuro por baixo, miolo claro por cima
    const haste = (x0, y0, x1, y1, esp) => {
        cr.setLineWidth(esp + 2);
        cr.setSourceRGBA(...sombra);
        cr.moveTo(x0, y0);
        cr.lineTo(x1, y1);
        cr.stroke();
        cr.setLineWidth(esp);
        cr.setSourceRGBA(...osso);
        cr.moveTo(x0, y0);
        cr.lineTo(x1, y1);
        cr.stroke();
    };
    cr.save();
    cr.translate(w / 2 + q.balanco * w * 0.03, h - alt * q.sobe);
    cr.setLineJoin(1);
    cr.setLineCap(1);

    const ombro = r * 2.7;
    const espinha = r * 2.3;
    // coluna, costelas e bacia
    haste(0, espinha, 0, alt - r * 0.5, r * 0.28);
    for (let i = 0; i < 3; i++) {
        const y = ombro + i * r * 0.62;
        const largura = r * (1.15 - i * 0.12);
        haste(-largura, y, largura, y, r * 0.22);
        haste(-largura, y, -largura * 0.9, y + r * 0.35, r * 0.2);
        haste(largura, y, largura * 0.9, y + r * 0.35, r * 0.2);
    }
    cr.save();
    cr.translate(0, alt - r * 0.45);
    cr.scale(1.3, 0.55);
    cr.arc(0, 0, r * 0.75, 0, Math.PI * 2);
    cr.restore();
    cr.setSourceRGBA(...osso);
    cr.fillPreserve();
    cr.setLineWidth(1.2);
    cr.setSourceRGBA(...sombra);
    cr.stroke();

    // braço esquerdo caído e braço direito acenando
    haste(-r * 1.15, ombro, -r * 1.6, ombro + r * 1.9, r * 0.24);
    const mao = {x: r * 1.9 + q.aceno * r * 0.5, y: ombro - r * 1.5};
    haste(r * 1.15, ombro, r * 1.7, ombro - r * 0.5, r * 0.24);
    haste(r * 1.7, ombro - r * 0.5, mao.x, mao.y, r * 0.22);
    cr.arc(mao.x, mao.y, r * 0.2, 0, Math.PI * 2);
    cr.setSourceRGBA(...osso);
    cr.fill();

    // caveira: crânio, olhos, nariz e mandíbula que desce ao bater o queixo
    const queixo = q.mandibula * r * 0.35;
    cr.rectangle(-r * 0.62, r * 1.55 + queixo, r * 1.24, r * 0.5);
    cr.setSourceRGBA(...osso);
    cr.fillPreserve();
    cr.setLineWidth(1.2);
    cr.setSourceRGBA(...sombra);
    cr.stroke();
    for (let i = -1; i <= 1; i++) {
        cr.moveTo(i * r * 0.31, r * 1.55 + queixo);
        cr.lineTo(i * r * 0.31, r * 2.05 + queixo);
    }
    cr.stroke();
    cr.arc(0, r, r, 0, Math.PI * 2);
    cr.setSourceRGBA(...osso);
    cr.fillPreserve();
    cr.setSourceRGBA(...sombra);
    cr.stroke();
    cr.setSourceRGBA(...vazio);
    for (const lado of [-1, 1]) {
        cr.arc(lado * r * 0.4, r * 0.95, r * 0.26, 0, Math.PI * 2);
        cr.fill();
    }
    // brilho no fundo de cada órbita, que acompanha o ponteiro
    cr.setSourceRGBA(1, 0.85, 0.37, 0.95);
    for (const lado of [-1, 1]) {
        cr.arc(lado * r * 0.4 + olhar(q).x * r * 0.11, r * 0.95 + olhar(q).y * r * 0.08, r * 0.07, 0, Math.PI * 2);
        cr.fill();
    }
    cr.setSourceRGBA(...vazio);
    cr.moveTo(0, r * 1.2);
    cr.lineTo(-r * 0.12, r * 1.45);
    cr.lineTo(r * 0.12, r * 1.45);
    cr.closePath();
    cr.fill();
    cr.restore();
}

const ESQUELETO = {sobe: 450, fica: 2400, desce: 400};

export const duracaoEsqueleto = () => ESQUELETO.sobe + ESQUELETO.fica + ESQUELETO.desce;

// Estado do esqueleto em `t` ms: {sobe, balanco, aceno, mandibula}. `sobe` de 0 a 1 (um pouco mais no overshoot),
// `balanco` e `aceno` de -1 a 1, `mandibula` de 0 a 1 (bate o queixo enquanto acena). null depois do fim.
export function quadroEsqueleto(t, saida = 'cai') {
    t = Math.max(0, t);
    if (t >= duracaoEsqueleto())
        return null;
    const fimFica = ESQUELETO.sobe + ESQUELETO.fica;
    const q = {...faseSobeDesce(t, ESQUELETO, saida), balanco: Math.sin(t / 320) * 0.6, aceno: 0, mandibula: 0};
    // acena e bate o queixo no meio da permanência, com entrada e saída suaves
    const rampa = limitar01((t - ESQUELETO.sobe - 150) / 250) * limitar01((fimFica - 150 - t) / 250);
    q.aceno = Math.sin(t / 130) * rampa;
    q.mandibula = Math.abs(Math.sin(t / 95)) * rampa;
    return q;
}
