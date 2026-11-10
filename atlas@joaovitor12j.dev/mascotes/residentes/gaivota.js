// Mascote residente: Gaivota (tema Carta). Mora na doca do tema e nunca sai; desenho, linha do tempo e estados num lugar só.

import {VOLTA} from '../../nucleo/matematica.js';

// Gaivota (mascote residente do tema Carta): corpo oval, bico, pernas e asas que batem voando.
export function gaivota(cr, w, h, q) {
    const gw = w * 0.5, gh = h * 0.3;
    cr.save();
    cr.translate(w / 2, h * 0.62 - q.voo);

    // pernas (atrás do corpo), recolhidas enquanto voa
    if (!q.voando) {
        cr.setLineWidth(gw * 0.05);
        cr.setSourceRGBA(0.85, 0.6, 0.2, 1);
        for (const lado of [-1, 1]) {
            cr.save();
            cr.translate(lado * gw * 0.15, gh * 0.4);
            cr.rotate((q.perna * lado) * Math.PI / 180);
            cr.moveTo(0, 0);
            cr.lineTo(0, gh * 0.5);
            cr.stroke();
            cr.restore();
        }
    }

    // asas
    cr.setSourceRGBA(0.88, 0.89, 0.92, 1);
    for (const lado of [-1, 1]) {
        cr.save();
        cr.translate(lado * gw * 0.3, -gh * 0.1);
        cr.rotate(lado * q.asa * Math.PI / 180);
        cr.newPath();
        cr.moveTo(0, 0);
        cr.curveTo(lado * gw * 0.5, -gh * 0.3, lado * gw * 0.7, gh * 0.1, lado * gw * 0.3, gh * 0.2);
        cr.closePath();
        cr.fill();
        cr.restore();
    }

    // corpo
    cr.setSourceRGBA(0.95, 0.96, 0.97, 1);
    cr.newPath();
    cr.save();
    cr.scale(1, 0.62);
    cr.arc(0, 0, gw / 2, 0, VOLTA);
    cr.restore();
    cr.fill();

    // cabeça e bico
    cr.newPath();
    cr.arc(gw * 0.4, -gh * 0.25, gw * 0.18, 0, VOLTA);
    cr.fill();
    cr.setSourceRGBA(0.95, 0.65, 0.15, 1);
    cr.newPath();
    cr.moveTo(gw * 0.55, -gh * 0.25);
    cr.lineTo(gw * 0.75, -gh * 0.2);
    cr.lineTo(gw * 0.55, -gh * 0.15);
    cr.closePath();
    cr.fill();

    // olho (fechado se dormindo)
    cr.setSourceRGBA(0.1, 0.1, 0.12, 1);
    if (q.dormindo) {
        cr.setLineWidth(1.5);
        cr.moveTo(gw * 0.42, -gh * 0.3);
        cr.lineTo(gw * 0.5, -gh * 0.3);
        cr.stroke();
    } else {
        cr.arc(gw * 0.46, -gh * 0.3, gw * 0.025, 0, VOLTA);
        cr.fill();
    }
    cr.restore();
}

// Gaivota (tema Carta): pernas giram no quadril andando (0,8 s, ±24°), asas batem voando (0,45 s, -28° a 42°).
export function quadroGaivota(t, estado) {
    const dormindo = estado === 'dormindo';
    const voando = estado === 'voando';
    const andando = estado === 'andando';
    const perna = andando ? Math.sin(t / 800 * Math.PI * 2) * 24 : 0;
    const asa = voando ? -28 + (42 + 28) * (0.5 + 0.5 * Math.sin(t / 450 * Math.PI * 2)) : dormindo ? -4 : 0;
    const voo = voando ? Math.sin(t / 900 * Math.PI * 2) * 4 : 0;
    return {perna, asa, voo, voando, dormindo};
}

// `estados` é [[id, peso]] (sorteio em proximoEstadoResidente); `duracaoMs` dá a faixa [min, max] de cada estado.
export const residente = {
    tema: 'carta',
    id: 'gaivota',
    estados: [['parada', 5], ['andando', 3], ['voando', 2], ['dormindo', 1]],
    duracaoMs: {parada: [3000, 6000], andando: [2500, 4500], voando: [2500, 4000], dormindo: [5000, 9000]},
    tamanho: icone => ({w: Math.round(icone * 1.4), h: Math.round(icone * 1.1)}),
    desenhar: gaivota,
    quadro: quadroGaivota,
};
