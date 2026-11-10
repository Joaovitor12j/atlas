// Mascote Papai Noel (Natal): desenho em Cairo e linha do tempo.

import {olhar} from '../desenho.js';
import {passeio, quadroSobeDesce} from '../movimento.js';

// Papai Noel no retângulo (0, 0, w, h): sobe de trás da borda de baixo, acena e ri com a barriga.
// `q` vem de quadroNoel (logica.js): {sobe, balanco, aceno, riso}. Quem chama recorta no retângulo.
export function noel(cr, w, h, q) {
    const alt = h * 0.92;
    const a = Math.min(w * 0.2, alt / 7);
    const vermelho = [0.78, 0.13, 0.15, 1];
    const contorno = [0.3, 0.04, 0.06, 0.7];
    const branco = [0.98, 0.97, 0.95, 1];
    const pele = [0.97, 0.78, 0.65, 1];
    const ya = a * 1.75;                       // centro da cabeça
    const ombro = ya + a * 1.15;
    const luva = {x: a * 2.3, y: ombro - a * 1.9 + q.aceno * a * 0.35};

    cr.save();
    cr.translate(w / 2 + q.balanco * w * 0.02, h - alt * q.sobe);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    // braços: manga vermelha, punho e luva brancos
    const manga = (x0, y0, x1, y1) => {
        cr.setLineWidth(a * 0.7);
        cr.setSourceRGBA(...contorno);
        cr.moveTo(x0, y0);
        cr.lineTo(x1, y1);
        cr.stroke();
        cr.setLineWidth(a * 0.7 - 2);
        cr.setSourceRGBA(...vermelho);
        cr.moveTo(x0, y0);
        cr.lineTo(x1, y1);
        cr.stroke();
        cr.arc(x1, y1, a * 0.42, 0, Math.PI * 2);
        cr.setSourceRGBA(...branco);
        cr.fillPreserve();
        cr.setLineWidth(1);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
    };
    manga(-a * 1.05, ombro + a * 0.2, -a * 1.7, ombro + a * 2);
    manga(a * 1.05, ombro + a * 0.2, luva.x, luva.y);

    // casaco, com a barriga sacudindo, faixa preta e fivela
    cr.save();
    cr.translate(0, alt);
    cr.scale(1 + q.riso * 0.05, 1 - q.riso * 0.04);
    cr.translate(0, -alt);
    cr.moveTo(-a * 1.25, ombro);
    cr.curveTo(-a * 1.7, ombro + a * 1.6, -a * 1.7, alt - a * 0.2, -a * 1.2, alt);
    cr.lineTo(a * 1.2, alt);
    cr.curveTo(a * 1.7, alt - a * 0.2, a * 1.7, ombro + a * 1.6, a * 1.25, ombro);
    cr.closePath();
    cr.setSourceRGBA(...vermelho);
    cr.fillPreserve();
    cr.setLineWidth(1.2);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    const cinto = ombro + a * 1.7;
    cr.rectangle(-a * 1.6, cinto, a * 3.2, a * 0.45);
    cr.setSourceRGBA(0.1, 0.08, 0.08, 1);
    cr.fill();
    cr.rectangle(-a * 0.28, cinto - a * 0.04, a * 0.56, a * 0.53);
    cr.setSourceRGBA(0.95, 0.78, 0.2, 1);
    cr.fill();
    cr.restore();

    // cabeça, barba, bigode, nariz e olhos
    cr.arc(0, ya, a * 0.82, 0, Math.PI * 2);
    cr.setSourceRGBA(...pele);
    cr.fill();
    cr.moveTo(-a * 0.95, ya - a * 0.05);
    cr.curveTo(-a * 1.1, ya + a * 1.5, a * 1.1, ya + a * 1.5, a * 0.95, ya - a * 0.05);
    cr.curveTo(a * 0.5, ya + a * 0.35, -a * 0.5, ya + a * 0.35, -a * 0.95, ya - a * 0.05);
    cr.setSourceRGBA(...branco);
    cr.fillPreserve();
    cr.setLineWidth(1);
    cr.setSourceRGBA(0.5, 0.5, 0.55, 0.6);
    cr.stroke();
    cr.arc(0, ya + a * 0.1, a * 0.13, 0, Math.PI * 2);
    cr.setSourceRGBA(0.92, 0.5, 0.45, 1);
    cr.fill();
    cr.setSourceRGBA(0.1, 0.08, 0.08, 1);
    for (const lado of [-1, 1]) {
        cr.arc(lado * a * 0.32 + olhar(q).x * a * 0.07, ya - a * 0.22 + olhar(q).y * a * 0.05, a * 0.07, 0, Math.PI * 2);
        cr.fill();
    }

    // gorro com barra branca e pompom que balança junto com o aceno
    const balanca = q.aceno * a * 0.25;
    cr.moveTo(-a * 0.9, ya - a * 0.35);
    cr.curveTo(-a * 0.8, ya - a * 1.5, a * 0.1 + balanca, ya - a * 1.8, a * 0.6 + balanca * 2, ya - a * 1.45);
    cr.curveTo(a * 0.7, ya - a * 1.2, a * 0.9, ya - a * 0.8, a * 0.9, ya - a * 0.35);
    cr.closePath();
    cr.setSourceRGBA(...vermelho);
    cr.fillPreserve();
    cr.setLineWidth(1.2);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    cr.arc(a * 0.62 + balanca * 2, ya - a * 1.45, a * 0.2, 0, Math.PI * 2);
    cr.setSourceRGBA(...branco);
    cr.fill();
    cr.rectangle(-a * 0.98, ya - a * 0.5, a * 1.96, a * 0.3);
    cr.setSourceRGBA(...branco);
    cr.fillPreserve();
    cr.setLineWidth(1);
    cr.setSourceRGBA(0.5, 0.5, 0.55, 0.6);
    cr.stroke();
    cr.restore();
}

const NOEL = {sobe: 450, fica: 2800, desce: 400};

export const duracaoNoel = () => NOEL.sobe + NOEL.fica + NOEL.desce;

// Papai Noel em `t` ms: {sobe, balanco, aceno, riso}. `aceno` de -1 a 1 (braço direito) e `riso` de 0 a 1 (a barriga
// sacode no "ho ho ho"). null depois do fim.
export function quadroNoel(t, saida = 'cai') {
    const b = quadroSobeDesce(t, NOEL, saida);
    if (!b)
        return null;
    return {
        sobe: b.sobe,
        esmaga: b.esmaga,
        alfa: b.alfa,
        balanco: Math.sin(t / 380) * 0.5,
        aceno: Math.sin(t / 150) * b.ativo,
        riso: Math.abs(Math.sin(t / 210)) * b.ativo,
    };
}

// Passeios (atravessar a doca): `dur` em ms, `fig` [largura, altura] da figura em múltiplos do ícone, `cabeca` (folga
// acima da figura), `modo` (`flutua`, `anda` ou `salta`), `passoMs`, `altura`, `bob`, `inclina` e `pausa` opcional.
export const PASSEIOS = {
    'noel-passeia': {dur: 7000, fig: [1.3, 1.8], cabeca: 0.1, modo: 'anda', passoMs: 420, bob: 0.03, inclina: 0.06, pausa: {dur: 2200}},
    'noel-pula': {dur: 5600, fig: [1.3, 1.8], cabeca: 0.4, modo: 'salta', passoMs: 800, bob: 0.22, inclina: 0.05},
};

// Como o motor (index.js) usa o mascote: `prefixo` das chaves do schema, `gatilho` (sem ele, dispara por horário), `temporada`,
// e `variantes` (movimentos) com tamanho, contexto, duração, quadro e desenho.
export const personagem = {
    prefixo: 'noel',
    temporada: {ini: [11, 1], fim: [11, 25]}, // 1 a 25 de dezembro
    variantes: {
        'sobe': {
            tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.8)}),
            contexto: () => ({}),
            duracao: () => duracaoNoel(),
            finais: ['cai', 'afunda', 'espia'],
            quadro: (t, ctx) => quadroNoel(t, ctx.saida),
            desenhar: (cr, w, h, q) => noel(cr, w, h, q),
        },
        'passeia': passeio(PASSEIOS['noel-passeia'], noel, q => ({
            sobe: 1, balanco: Math.sin(q.t / 210) * 0.7, aceno: q.acena, riso: Math.abs(Math.sin(q.t / 210)) * q.parado, olhar: q.olhar,
        })),
        'pula': passeio(PASSEIOS['noel-pula'], noel, q => ({
            sobe: 1, balanco: Math.sin(q.t / 400) * 0.5, aceno: Math.sin(q.t / 150), riso: Math.abs(Math.sin(q.t / 260)), olhar: q.olhar,
        })),
    },
};
