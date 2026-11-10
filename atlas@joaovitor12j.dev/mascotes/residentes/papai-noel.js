// Mascote residente: Papai Noel (tema Natal brasileiro). Mora na doca do tema e nunca sai; desenho, linha do tempo e estados num lugar só.

import {VOLTA} from '../../nucleo/matematica.js';

// Papai Noel (mascote residente do tema Natal brasileiro): casaco vermelho, barba, braço que acena e barriga que ri.
export function papaiNoel(cr, w, h, q) {
    const gw = w * 0.5, gh = h * 0.72;
    cr.save();
    cr.translate(w / 2, h * 0.85);
    cr.rotate(q.gingado * Math.PI / 180);

    // pernas
    cr.setLineWidth(gw * 0.14);
    cr.setSourceRGBA(0.15, 0.13, 0.15, 1);
    for (const [lado, dx] of [[-1, -0.15], [1, 0.15]]) {
        cr.save();
        cr.translate(dx * gw, -gh * 0.1);
        cr.rotate((lado * q.perna) * Math.PI / 180);
        cr.moveTo(0, 0);
        cr.lineTo(0, gh * 0.22);
        cr.stroke();
        cr.restore();
    }

    // braço que acena (atrás do corpo do lado que ergue)
    cr.setLineWidth(gw * 0.16);
    cr.setSourceRGBA(0.75, 0.1, 0.1, 1);
    cr.save();
    cr.translate(gw * 0.34, -gh * 0.45);
    cr.rotate(q.braco * Math.PI / 180);
    cr.moveTo(0, 0);
    cr.lineTo(0, -gh * 0.32);
    cr.stroke();
    cr.restore();

    // corpo: casaco vermelho com barriga que chacoalha
    cr.save();
    cr.scale(q.barriga, q.barriga);
    cr.setSourceRGBA(0.75, 0.1, 0.1, 1);
    cr.newPath();
    cr.arc(0, -gh * 0.3, gw * 0.4, 0, VOLTA);
    cr.fill();
    cr.restore();

    // cinto
    cr.setSourceRGBA(0.1, 0.1, 0.1, 1);
    cr.rectangle(-gw * 0.4, -gh * 0.32, gw * 0.8, gh * 0.06);
    cr.fill();

    // cabeça, barba e gorro
    cr.setSourceRGBA(0.93, 0.78, 0.62, 1);
    cr.newPath();
    cr.arc(0, -gh * 0.68, gw * 0.24, 0, VOLTA);
    cr.fill();
    cr.setSourceRGBA(0.97, 0.97, 0.97, 1);
    cr.newPath();
    cr.arc(0, -gh * 0.6, gw * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
    cr.fill();
    cr.setSourceRGBA(0.75, 0.1, 0.1, 1);
    cr.newPath();
    cr.moveTo(-gw * 0.24, -gh * 0.78);
    cr.curveTo(-gw * 0.1, -gh * 1.05, gw * 0.15, -gh * 1.05, gw * 0.2, -gh * 0.85);
    cr.curveTo(gw * 0.05, -gh * 0.92, -gw * 0.15, -gh * 0.9, -gw * 0.24, -gh * 0.78);
    cr.closePath();
    cr.fill();
    cr.setSourceRGBA(0.97, 0.97, 0.97, 1);
    cr.newPath();
    cr.arc(gw * 0.2, -gh * 0.85, gw * 0.045, 0, VOLTA);
    cr.fill();
    cr.restore();
}

// Papai Noel (tema Natal brasileiro): pernas ±20° em 0,9 s passeando; braço acena; barriga chacoalha ao rir.
export function quadroPapaiNoel(t, estado) {
    const dormindo = estado === 'dormindo';
    const passeando = estado === 'passeando';
    const perna = passeando ? Math.sin(t / 900 * Math.PI * 2) * 20 : 0;
    const gingado = passeando ? Math.sin(t / 900 * Math.PI * 2) * 5 : 0;
    const braco = estado === 'acenando' ? -10 - 55 * (0.5 + 0.5 * Math.sin(t / 480 * Math.PI * 2)) : -6;
    const barriga = estado === 'rindo' ? 1 + 0.08 * Math.sin(t / 220 * Math.PI * 2) : 1;
    return {perna, gingado, braco, barriga, dormindo};
}

// `estados` é [[id, peso]] (sorteio em proximoEstadoResidente); `duracaoMs` dá a faixa [min, max] de cada estado.
export const residente = {
    tema: 'brasileiro',
    id: 'papai-noel',
    estados: [['parado', 4], ['passeando', 3], ['rindo', 2], ['dormindo', 1]],
    duracaoMs: {parado: [3000, 5500], passeando: [2500, 4500], rindo: [2000, 3500], dormindo: [5000, 9000]},
    tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.9)}),
    desenhar: papaiNoel,
    quadro: quadroPapaiNoel,
};
