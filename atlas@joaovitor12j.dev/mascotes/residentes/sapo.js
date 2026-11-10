// Mascote residente: Sapo (tema Chuva). Mora na doca do tema e nunca sai; desenho, linha do tempo e estados num lugar só.

// Sapo (mascote residente do tema Chuva): salto com agachar/esticar, papo que infla ao coaxar e guarda-chuva.
import {VOLTA} from '../../nucleo/matematica.js';

export function sapo(cr, w, h, q) {
    const gw = w * 0.5, gh = h * 0.36;
    cr.save();
    cr.translate(w / 2, h * 0.7 - q.salto * gh * 0.5);
    cr.scale(1 + q.agachar * 0.12, 1 - q.agachar * 0.18);

    // guarda-chuva (atrás, abre pra trás com o vento)
    cr.save();
    cr.translate(gw * 0.35, -gh * 1.3);
    cr.rotate(q.guardaChuva * Math.PI / 180);
    cr.setLineWidth(gw * 0.04);
    cr.setSourceRGBA(0.3, 0.3, 0.35, 1);
    cr.moveTo(0, 0);
    cr.lineTo(0, gh * 0.9);
    cr.stroke();
    cr.setSourceRGBA(0.35, 0.55, 0.75, 1);
    cr.newPath();
    cr.arc(0, 0, gw * 0.3, Math.PI, 0);
    cr.closePath();
    cr.fill();
    cr.restore();

    // corpo
    cr.setSourceRGBA(0.42, 0.72, 0.36, q.dormindo ? 0.75 : 1);
    cr.save();
    cr.scale(1, 0.75);
    cr.arc(0, 0, gw * 0.45, 0, VOLTA);
    cr.restore();
    cr.fill();

    // papo (infla ao coaxar)
    cr.save();
    cr.scale(q.papo, q.papo);
    cr.arc(0, gh * 0.18, gw * 0.18, 0, VOLTA);
    cr.restore();
    cr.fill();

    // olhos no topo da cabeça
    cr.setSourceRGBA(0.42, 0.72, 0.36, 1);
    for (const lado of [-1, 1]) {
        cr.arc(lado * gw * 0.18, -gh * 0.42, gw * 0.12, 0, VOLTA);
        cr.fill();
    }
    cr.setSourceRGBA(0.08, 0.08, 0.08, 1);
    for (const lado of [-1, 1]) {
        if (q.dormindo) {
            cr.setLineWidth(1.4);
            cr.moveTo(lado * gw * 0.18 - 3, -gh * 0.42);
            cr.lineTo(lado * gw * 0.18 + 3, -gh * 0.42);
            cr.stroke();
        } else {
            cr.newPath();
            cr.arc(lado * gw * 0.18, -gh * 0.42, gw * 0.04, 0, VOLTA);
            cr.fill();
        }
    }
    cr.restore();
}

// Sapo (tema Chuva): salto de 1,1 s (agachar/esticar/pousar), papo infla ao coaxar, guarda-chuva balança no vento.
export function quadroSapo(t, estado) {
    const dormindo = estado === 'dormindo';
    const pulando = estado === 'pulando';
    const ciclo = (t % 1100) / 1100;
    const salto = pulando ? Math.sin(ciclo * Math.PI) : 0;
    const agachar = pulando && ciclo < 0.15 ? (0.15 - ciclo) / 0.15 : 0;
    const papo = estado === 'coaxando' ? 1 + 0.6 * Math.abs(Math.sin(t / 300 * Math.PI * 2)) : 1;
    const guardaChuva = Math.sin(t / 700 * Math.PI * 2) * 6;
    return {salto, agachar, papo, guardaChuva, dormindo};
}

// `estados` é [[id, peso]] (sorteio em proximoEstadoResidente); `duracaoMs` dá a faixa [min, max] de cada estado.
export const residente = {
    tema: 'chuva',
    id: 'sapo',
    estados: [['parado', 5], ['pulando', 3], ['coaxando', 2], ['dormindo', 1]],
    duracaoMs: {parado: [3000, 5500], pulando: [1500, 2500], coaxando: [2000, 3500], dormindo: [5000, 9000]},
    tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.7)}),
    desenhar: sapo,
    quadro: quadroSapo,
};
