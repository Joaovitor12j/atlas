// Mascote Boneco de neve (Natal): desenho em Cairo e linha do tempo.

import {olhar} from '../desenho.js';
import {passeio, quadroSobeDesce} from '../movimento.js';

// Boneco de neve no retângulo (0, 0, w, h): sobe de trás da borda de baixo e balança ao vento.
// `q` vem de quadroBoneco (logica.js): {sobe, balanco, vento}. Quem chama recorta no retângulo.
export function boneco(cr, w, h, q) {
    const alt = h * 0.92;
    const a = alt / 7.2;
    const neve = [0.97, 0.98, 1, 1];
    const contorno = [0.35, 0.42, 0.55, 0.8];
    const r1 = a, r2 = a * 1.3, r3 = a * 1.65;
    const y1 = r1 + a * 0.9;                 // abaixo do chapéu
    const y2 = y1 + r1 * 0.75 + r2 * 0.85;
    const y3 = alt - r3 * 0.95;

    cr.save();
    cr.translate(w / 2 + q.balanco * w * 0.02, h - alt * q.sobe);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    // galhos dos braços, atrás do corpo
    cr.setSourceRGBA(0.35, 0.22, 0.12, 1);
    cr.setLineWidth(a * 0.16);
    for (const lado of [-1, 1]) {
        cr.moveTo(lado * r2 * 0.8, y2);
        cr.lineTo(lado * (r2 * 1.9), y2 - a * 0.7 + q.vento * lado * a * 0.35);
        cr.moveTo(lado * r2 * 1.4, y2 - a * 0.35);
        cr.lineTo(lado * (r2 * 1.65), y2 - a * 1.2 + q.vento * lado * a * 0.35);
        cr.stroke();
    }
    cr.setLineWidth(1.2);
    for (const [y, r] of [[y3, r3], [y2, r2], [y1, r1]]) {
        cr.arc(0, y, r, 0, Math.PI * 2);
        cr.setSourceRGBA(...neve);
        cr.fillPreserve();
        cr.setSourceRGBA(...contorno);
        cr.stroke();
    }
    // botões, olhos de carvão e nariz de cenoura
    cr.setSourceRGBA(0.12, 0.12, 0.16, 1);
    for (const dy of [-0.35, 0.25]) {
        cr.arc(0, y2 + r2 * dy, a * 0.1, 0, Math.PI * 2);
        cr.fill();
    }
    for (const lado of [-1, 1]) {
        cr.arc(lado * r1 * 0.38 + olhar(q).x * r1 * 0.07, y1 - r1 * 0.22 + olhar(q).y * r1 * 0.05, a * 0.09, 0, Math.PI * 2);
        cr.fill();
    }
    for (let i = -2; i <= 2; i++) {
        cr.arc(i * r1 * 0.2, y1 + r1 * (0.42 + 0.06 * Math.abs(i) * Math.abs(i) * 0.3) - 0.5, a * 0.045, 0, Math.PI * 2);
        cr.fill();
    }
    cr.moveTo(0, y1 - a * 0.02);
    cr.lineTo(r1 * 0.95 + q.vento * 1, y1 + a * 0.12);
    cr.lineTo(0, y1 + a * 0.22);
    cr.closePath();
    cr.setSourceRGBA(0.95, 0.5, 0.12, 1);
    cr.fill();
    // cachecol vermelho e a ponta que balança
    const pescoco = y1 + r1 * 0.85;
    cr.rectangle(-r1 * 0.95, pescoco - a * 0.2, r1 * 1.9, a * 0.42);
    cr.setSourceRGBA(0.8, 0.15, 0.17, 1);
    cr.fillPreserve();
    cr.setLineWidth(1);
    cr.setSourceRGBA(0.3, 0.05, 0.07, 0.7);
    cr.stroke();
    cr.moveTo(r1 * 0.5, pescoco + a * 0.2);
    cr.curveTo(r1 * 0.6 + q.vento * a * 0.5, pescoco + a * 0.7, r1 * 0.9 + q.vento * a * 0.7, pescoco + a * 1.1, r1 * 0.55 + q.vento * a * 0.9, pescoco + a * 1.5);
    cr.lineTo(r1 * 0.25 + q.vento * a * 0.9, pescoco + a * 1.4);
    cr.curveTo(r1 * 0.3 + q.vento * a * 0.4, pescoco + a * 0.9, r1 * 0.25, pescoco + a * 0.6, r1 * 0.2, pescoco + a * 0.2);
    cr.closePath();
    cr.setSourceRGBA(0.8, 0.15, 0.17, 1);
    cr.fillPreserve();
    cr.stroke();
    // cartola
    cr.rectangle(-r1 * 1.1, y1 - r1 * 0.95, r1 * 2.2, a * 0.2);
    cr.setSourceRGBA(0.1, 0.1, 0.14, 1);
    cr.fill();
    cr.rectangle(-r1 * 0.68, y1 - r1 * 0.95 - a * 0.95, r1 * 1.36, a * 0.95);
    cr.fill();
    cr.rectangle(-r1 * 0.68, y1 - r1 * 0.95 - a * 0.3, r1 * 1.36, a * 0.16);
    cr.setSourceRGBA(0.8, 0.15, 0.17, 1);
    cr.fill();
    cr.restore();
}

const BONECO = {sobe: 450, fica: 2600, desce: 400};

export const duracaoBoneco = () => BONECO.sobe + BONECO.fica + BONECO.desce;

// Boneco de neve em `t` ms: {sobe, balanco, vento}. `vento` de -1 a 1 balança o cachecol e os galhos. null depois do fim.
export function quadroBoneco(t, saida = 'cai') {
    const b = quadroSobeDesce(t, BONECO, saida);
    if (!b)
        return null;
    return {sobe: b.sobe, esmaga: b.esmaga, alfa: b.alfa, balanco: Math.sin(t / 420) * 0.5, vento: Math.sin(t / 230) * (0.4 + 0.6 * b.ativo)};
}

// Passeios (atravessar a doca): `dur` em ms, `fig` [largura, altura] da figura em múltiplos do ícone, `cabeca` (folga
// acima da figura), `modo` (`flutua`, `anda` ou `salta`), `passoMs`, `altura`, `bob`, `inclina` e `pausa` opcional.
export const PASSEIOS = {
    'boneco-desliza': {dur: 5200, fig: [1.2, 1.8], cabeca: 0.1, modo: 'flutua', passoMs: 700, altura: 0.012, bob: 0.012, inclina: 0.16},
    'boneco-pula': {dur: 5400, fig: [1.2, 1.8], cabeca: 0.4, modo: 'salta', passoMs: 700, bob: 0.2, inclina: 0.05},
};

// Como o motor (index.js) usa o mascote: `prefixo` das chaves do schema, `gatilho` (sem ele, dispara por horário), `temporada`,
// e `variantes` (movimentos) com tamanho, contexto, duração, quadro e desenho.
export const personagem = {
    prefixo: 'boneco',
    temporada: {ini: [11, 1], fim: [11, 25]},
    variantes: {
        'sobe': {
            tamanho: icone => ({w: Math.round(icone * 1.2), h: Math.round(icone * 1.8)}),
            contexto: () => ({}),
            duracao: () => duracaoBoneco(),
            finais: ['cai', 'afunda'],
            quadro: (t, ctx) => quadroBoneco(t, ctx.saida),
            desenhar: (cr, w, h, q) => boneco(cr, w, h, q),
        },
        'desliza': passeio(PASSEIOS['boneco-desliza'], boneco, q => ({
            sobe: 1, balanco: Math.sin(q.t / 350) * 0.4, vento: Math.sin(q.t / 150), olhar: q.olhar,
        })),
        'pula': passeio(PASSEIOS['boneco-pula'], boneco, q => ({
            sobe: 1, balanco: Math.sin(q.t / 350) * 0.5, vento: Math.sin(q.t / 230), olhar: q.olhar,
        })),
    },
};
