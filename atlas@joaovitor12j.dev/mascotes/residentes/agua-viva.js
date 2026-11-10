// Mascote residente: Água-viva (tema Aurora). Mora na doca do tema e nunca sai; desenho, linha do tempo e estados num lugar só.

import {VOLTA} from '../../nucleo/matematica.js';

// Água-viva (mascote residente do tema Aurora): sino translúcido pulsando e 5 tentáculos ondulando. `q` vem de
// quadroAguaViva (logica.js): {sino, tentaculos, dormindo, brilho}. Flutua centrada no actor, sem tocar o chão.
export function aguaViva(cr, w, h, q) {
    const gw = w * 0.56, gh = h * 0.42;
    cr.save();
    cr.translate(w / 2, h * 0.42);

    // brilho (estado "brilhando"): halo atrás do sino
    if (q.brilho > 0) {
        cr.save();
        cr.setSourceRGBA(0.78, 0.98, 1, 0.35 * q.brilho);
        cr.arc(0, 0, gw * 0.75, 0, VOLTA);
        cr.fill();
        cr.restore();
    }

    // tentáculos: atrás do sino, cada um balançando numa fase diferente
    cr.setLineCap(1);
    cr.setLineWidth(gw * 0.05);
    q.tentaculos.forEach((desvio, i) => {
        const x0 = (i - 2) * gw * 0.16;
        cr.newPath();
        cr.moveTo(x0, gh * 0.3);
        cr.curveTo(x0 + desvio * 0.3, gh * 0.9, x0 + desvio, gh * 1.5, x0 + desvio * 0.6, gh * 2.1);
        cr.setSourceRGBA(0.6, 0.85, 0.95, 0.55);
        cr.stroke();
    });

    // sino: cúpula achatada, altura pulsa com q.sino (0 a 1)
    const altura = gh * (0.55 + 0.35 * q.sino);
    cr.newPath();
    cr.moveTo(-gw / 2, 0);
    cr.curveTo(-gw / 2, -altura, gw / 2, -altura, gw / 2, 0);
    cr.curveTo(gw * 0.3, gh * 0.18, -gw * 0.3, gh * 0.18, -gw / 2, 0);
    cr.closePath();
    cr.setSourceRGBA(0.74, 0.93, 0.96, q.dormindo ? 0.45 : 0.75);
    cr.fillPreserve();
    cr.setSourceRGBA(0.5, 0.78, 0.86, 0.6);
    cr.setLineWidth(gw * 0.025);
    cr.stroke();

    // olhinhos fechados ao dormir, abertos nos demais estados
    cr.setSourceRGBA(0.2, 0.35, 0.4, 0.8);
    for (const lado of [-1, 1]) {
        if (q.dormindo) {
            cr.setLineWidth(gw * 0.02);
            cr.moveTo(lado * gw * 0.14 - gw * 0.03, -altura * 0.45);
            cr.lineTo(lado * gw * 0.14 + gw * 0.03, -altura * 0.45);
            cr.stroke();
        } else {
            cr.newPath();
            cr.arc(lado * gw * 0.14, -altura * 0.45, gw * 0.025, 0, VOLTA);
            cr.fill();
        }
    }
    cr.restore();
}

// Água-viva (tema Aurora): sino pulsando (mais rápido nadando) e 5 tentáculos ondulando com atraso entre eles.
// `t` em ms desde que o estado atual começou.
export function quadroAguaViva(t, estado) {
    const dormindo = estado === 'dormindo';
    const periodo = estado === 'nadando' ? 950 : 3400;
    const sino = dormindo ? 0.15 : 0.5 + 0.5 * Math.sin((t / periodo) * Math.PI * 2);
    const tentaculos = Array.from({length: 5}, (_, i) => {
        if (dormindo)
            return 0;
        const fase = (t - i * 120) / (periodo * 0.6) * Math.PI * 2;
        return Math.sin(fase) * (estado === 'nadando' ? 18 : 10);
    });
    return {sino, tentaculos, dormindo, brilho: estado === 'brilhando' ? 0.5 + 0.5 * Math.sin(t / 260) : 0};
}

// `estados` é [[id, peso]] (sorteio em proximoEstadoResidente); `duracaoMs` dá a faixa [min, max] de cada estado.
export const residente = {
    tema: 'aurora',
    id: 'agua-viva',
    estados: [['flutuando', 6], ['nadando', 3], ['brilhando', 2], ['dormindo', 1]],
    duracaoMs: {flutuando: [4000, 7000], nadando: [3000, 5000], brilhando: [2000, 3000], dormindo: [5000, 9000]},
    tamanho: icone => ({w: Math.round(icone * 1.5), h: Math.round(icone * 1.5)}),
    desenhar: aguaViva,
    quadro: quadroAguaViva,
};
