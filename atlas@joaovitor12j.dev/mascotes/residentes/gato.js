// Mascote residente: Gato ilustrado (tema Jardim). Mora na doca do tema e nunca sai; desenho, linha do tempo e estados num lugar só.

// Gato ilustrado (mascote residente do tema Jardim): corpo, cabeça, orelhas, rabo e pernas articuladas.
import {VOLTA} from '../../nucleo/matematica.js';

export function gatoIlustrado(cr, w, h, q) {
    const gw = w * 0.52, gh = h * 0.4;
    cr.save();
    cr.translate(w / 2, h * 0.68);
    const corDormindo = q.dormindo ? 0.75 : 1;

    // rabo
    cr.setLineWidth(gw * 0.12);
    cr.setLineCap(1);
    cr.setSourceRGBA(0.95, 0.58, 0.22, corDormindo);
    cr.newPath();
    cr.moveTo(-gw * 0.4, -gh * 0.1);
    cr.curveTo(-gw * 0.7, -gh * 0.2, -gw * 0.75, -gh * 0.6 - q.rabo * 0.6, -gw * 0.55 + q.rabo * 0.2, -gh * 0.75);
    cr.stroke();

    // pernas
    cr.setLineWidth(gw * 0.1);
    for (const [lado, dx] of [[-1, -0.18], [1, 0.18]]) {
        cr.save();
        cr.translate(dx * gw, gh * 0.15);
        cr.rotate(q.dormindo ? Math.PI / 2 : (lado * q.perna) * Math.PI / 180);
        cr.moveTo(0, 0);
        cr.lineTo(0, gh * 0.4);
        cr.stroke();
        cr.restore();
    }

    // corpo
    cr.setSourceRGBA(0.97, 0.63, 0.26, corDormindo);
    cr.save();
    cr.translate(0, -gh * 0.15);
    cr.scale(1, 0.7);
    cr.arc(0, 0, gw * 0.42, 0, VOLTA);
    cr.restore();
    cr.fill();

    // cabeça
    cr.newPath();
    cr.arc(gw * 0.3, -gh * 0.55, gw * 0.24, 0, VOLTA);
    cr.fill();

    // orelhas (com tremor)
    for (const lado of [-1, 1]) {
        cr.save();
        cr.translate(gw * 0.3 + lado * gw * 0.14, -gh * 0.72);
        cr.rotate((lado * (6 + q.orelha)) * Math.PI / 180);
        cr.moveTo(0, 0);
        cr.lineTo(-gw * 0.06, -gw * 0.14);
        cr.lineTo(gw * 0.06, -gw * 0.14);
        cr.closePath();
        cr.fill();
        cr.restore();
    }

    // olhos
    cr.setSourceRGBA(0.12, 0.08, 0.06, 1);
    for (const lado of [-1, 1]) {
        const cx = gw * 0.3 + lado * gw * 0.08;
        if (q.dormindo || q.piscada) {
            cr.setLineWidth(1.4);
            cr.moveTo(cx - gw * 0.03, -gh * 0.56);
            cr.lineTo(cx + gw * 0.03, -gh * 0.56);
            cr.stroke();
        } else {
            cr.newPath();
            cr.arc(cx, -gh * 0.56, gw * 0.025, 0, VOLTA);
            cr.fill();
        }
    }
    cr.restore();
}

// Gato ilustrado (tema Jardim): pernas ±22° em 0,8 s (±38° em 0,5 s correndo); rabo e orelha com fase própria.
export function quadroGatoIlustrado(t, estado) {
    const dormindo = estado === 'dormindo';
    const correndo = estado === 'correndo';
    const periodo = correndo ? 500 : 800;
    const amp = correndo ? 38 : 22;
    const perna = (estado === 'andando' || correndo) ? Math.sin(t / periodo * Math.PI * 2) * amp : 0;
    const rabo = dormindo ? 0 : Math.sin(t / 600 * Math.PI * 2) * (correndo ? 10 : 16);
    const orelha = Math.sin(t / 900 * Math.PI * 2) * 2;
    const piscada = !dormindo && (t % 2600) < 120;
    return {perna, rabo, orelha, piscada, dormindo, correndo};
}

// `estados` é [[id, peso]] (sorteio em proximoEstadoResidente); `duracaoMs` dá a faixa [min, max] de cada estado.
export const residente = {
    tema: 'jardim',
    id: 'gato',
    estados: [['parado', 5], ['andando', 3], ['correndo', 1], ['dormindo', 1]],
    duracaoMs: {parado: [3000, 6000], andando: [2500, 4500], correndo: [1500, 2500], dormindo: [5000, 9000]},
    tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.1)}),
    desenhar: gatoIlustrado,
    quadro: quadroGatoIlustrado,
};
