// Mascote residente: Rena (tema Vitrine). Mora na doca do tema e nunca sai; desenho, linha do tempo e estados num lugar só.

// Rena (mascote residente do tema Vitrine): corpo, chifres, pernas trotando e sino balançando no pescoço.
import {VOLTA} from '../../nucleo/matematica.js';

export function rena(cr, w, h, q) {
    const gw = w * 0.56, gh = h * 0.34;
    cr.save();
    cr.translate(w / 2, h * 0.68);

    // pernas
    cr.setLineWidth(gw * 0.07);
    cr.setSourceRGBA(0.42, 0.26, 0.14, 1);
    for (const [lado, dx] of [[-1, -0.3], [1, 0.3]]) {
        cr.save();
        cr.translate(dx * gw, gh * 0.3);
        cr.rotate((lado * q.perna) * Math.PI / 180);
        cr.moveTo(0, 0);
        cr.lineTo(0, gh * 0.55);
        cr.stroke();
        cr.restore();
    }

    // corpo
    cr.setSourceRGBA(0.55, 0.35, 0.18, q.dormindo ? 0.75 : 1);
    cr.save();
    cr.scale(1, 0.6);
    cr.arc(0, 0, gw * 0.46, 0, VOLTA);
    cr.restore();
    cr.fill();

    // cabeça (balança com q.cabeca), chifres e sino
    cr.save();
    cr.translate(gw * 0.42, -gh * 0.35);
    cr.rotate(q.cabeca * Math.PI / 180);
    cr.setSourceRGBA(0.55, 0.35, 0.18, 1);
    cr.newPath();
    cr.arc(0, 0, gw * 0.2, 0, VOLTA);
    cr.fill();
    cr.setLineWidth(gw * 0.025);
    cr.setSourceRGBA(0.4, 0.26, 0.14, 1);
    for (const lado of [-1, 1]) {
        cr.moveTo(lado * gw * 0.1, -gw * 0.15);
        cr.lineTo(lado * gw * 0.22, -gw * 0.35);
        cr.lineTo(lado * gw * 0.3, -gw * 0.3);
        cr.stroke();
    }
    cr.setSourceRGBA(0.85, 0.65, 0.15, 1);
    cr.newPath();
    cr.arc(0, gw * 0.18, gw * 0.045, 0, VOLTA);
    cr.fill();
    cr.restore();
    cr.restore();
}

// Rena (tema Vitrine): pernas ±24° em 0,8 s trotando; cabeça balança ±13° tocando o sino.
export function quadroRena(t, estado) {
    const dormindo = estado === 'dormindo';
    const trotando = estado === 'trotando';
    const perna = trotando ? Math.sin(t / 800 * Math.PI * 2) * 24 : 0;
    const sininho = estado === 'sininho';
    const cabeca = sininho ? Math.sin(t / 800 * Math.PI * 2) * 13 : 0;
    return {perna, cabeca, sininho, dormindo};
}

// `estados` é [[id, peso]] (sorteio em proximoEstadoResidente); `duracaoMs` dá a faixa [min, max] de cada estado.
export const residente = {
    tema: 'vitrine',
    id: 'rena',
    estados: [['parada', 5], ['trotando', 3], ['sininho', 2], ['dormindo', 1]],
    duracaoMs: {parada: [3000, 6000], trotando: [2500, 4500], sininho: [2000, 3500], dormindo: [5000, 9000]},
    tamanho: icone => ({w: Math.round(icone * 1.5), h: Math.round(icone * 1.1)}),
    desenhar: rena,
    quadro: quadroRena,
};
