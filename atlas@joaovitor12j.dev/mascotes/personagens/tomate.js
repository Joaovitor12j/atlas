// Mascote Tomate (fim do foco do Pomodoro): desenho em Cairo e linha do tempo.

import {VOLTA} from '../../nucleo/matematica.js';
import {olhar} from '../desenho.js';
import {passeio, quadroSobeDesce} from '../movimento.js';

// Tomate do pomodoro, comemorando com confete. `q` vem de quadroTomate: {sobe, pulo, confete}; `confete(i, n, s)` (logica.js).
export function tomate(cr, w, h, q) {
    const r = Math.min(w * 0.3, h * 0.28);
    const pe = h + (1 - q.sobe) * h;
    const y0 = pe - r * 0.95 - q.pulo * r * 0.6;
    const contorno = [0.45, 0.08, 0.06, 1];
    cr.save();
    cr.translate(w / 2, y0);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    // corpo achatado
    cr.save();
    cr.scale(1.1, 0.95);
    cr.arc(0, 0, r, 0, VOLTA);
    cr.restore();
    cr.setSourceRGBA(0.9, 0.2, 0.15, 1);
    cr.fillPreserve();
    cr.setLineWidth(1.6);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    // brilho
    cr.arc(-r * 0.45, -r * 0.35, r * 0.18, 0, VOLTA);
    cr.setSourceRGBA(1, 1, 1, 0.35);
    cr.fill();
    // folhas
    cr.setSourceRGBA(0.3, 0.65, 0.25, 1);
    for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.55;
        cr.save();
        cr.translate(0, -r * 0.9);
        cr.rotate(a + Math.PI / 2);
        cr.moveTo(0, 0);
        cr.curveTo(r * 0.12, -r * 0.1, r * 0.1, -r * 0.3, 0, -r * 0.36);
        cr.curveTo(-r * 0.1, -r * 0.3, -r * 0.12, -r * 0.1, 0, 0);
        cr.fill();
        cr.restore();
    }
    // rosto feliz
    const o = olhar(q);
    cr.setSourceRGBA(0.12, 0.05, 0.05, 1);
    for (const lado of [-1, 1]) {
        cr.arc(lado * r * 0.36 + o.x * r * 0.05, -r * 0.1 + o.y * r * 0.04, r * 0.09, 0, VOLTA);
        cr.fill();
    }
    cr.arc(0, r * 0.1, r * (0.2 + 0.1 * q.pulo), 0, Math.PI);
    cr.closePath();
    cr.setSourceRGBA(0.5, 0.05, 0.08, 1);
    cr.fill();
    cr.setSourceRGBA(1, 0.6, 0.5, 0.5);
    for (const lado of [-1, 1]) {
        cr.arc(lado * r * 0.6, r * 0.12, r * 0.1, 0, VOLTA);
        cr.fill();
    }
    cr.restore();
    // confete: 18 pedaços que estouram do tomate, sobem em arco e caem
    if (q.confete > 0 && q.confete < 2.2) {
        const cores = [[1, 0.8, 0.2], [0.3, 0.7, 1], [0.4, 0.9, 0.4], [1, 0.45, 0.7], [1, 1, 1]];
        const n = 18;
        for (let i = 0; i < n; i++) {
            const c = confete(i, n, q.confete);
            cr.save();
            cr.translate(w / 2 + c.x * h * 0.55, y0 - r * 0.6 + c.y * h * 0.55);
            cr.rotate(c.giro);
            cr.rectangle(-r * 0.07, -r * 0.04, r * 0.14, r * 0.08);
            cr.setSourceRGBA(...cores[i % cores.length], Math.max(0, Math.min(1, (2.2 - q.confete) * 1.5)));
            cr.fill();
            cr.restore();
        }
    }
}

const TOMATE = {sobe: 400, fica: 3000, desce: 400};

export const duracaoTomate = () => TOMATE.sobe + TOMATE.fica + TOMATE.desce;

// Estado do tomate em `t` ms: {sobe, esmaga, alfa, pulo, confete}. `pulo` (0 a 1) é a altura do pulinho de alegria e
// `confete` o tempo, em segundos, desde o estouro (0 antes de subir). null depois do fim.
export function quadroTomate(t, saida = 'cai') {
    const q = quadroSobeDesce(t, TOMATE, saida);
    if (!q)
        return null;
    return {...q, pulo: q.ativo * Math.abs(Math.sin(t / 240)), confete: Math.max(0, t - TOMATE.sobe * 0.6) / 1000};
}

// Posição (0 a 1 de cada eixo, relativa ao ponto de origem) de cada pedaço de confete `i` de `n`, `s` segundos depois
// do estouro: sobe em arco, cai com a gravidade e gira. Determinístico (sem sorteio) para a prévia bater com o Shell.
export function confete(i, n, s) {
    const ang = -Math.PI / 2 + ((i / n) - 0.5) * 2.4 + Math.sin(i * 12.9898) * 0.25;
    const vel = 0.9 + 0.5 * Math.abs(Math.sin(i * 78.233));
    return {x: Math.cos(ang) * vel * s, y: Math.sin(ang) * vel * s + 1.6 * s * s, giro: s * (4 + (i % 5)) * (i % 2 ? 1 : -1)};
}

// Passeios (atravessar a doca): `dur` em ms, `fig` [largura, altura] da figura em múltiplos do ícone, `cabeca` (folga
// acima da figura), `modo` (`flutua`, `anda` ou `salta`), `passoMs`, `altura`, `bob`, `inclina` e `pausa` opcional.
export const PASSEIOS = {
    'tomate-pula': {dur: 4800, fig: [1.1, 1.1], cabeca: 0.5, modo: 'salta', passoMs: 600, bob: 0.25, inclina: 0.08},
};

// Como o motor (index.js) usa o mascote: `prefixo` das chaves do schema, `gatilho` (sem ele, dispara por horário), `temporada`,
// e `variantes` (movimentos) com tamanho, contexto, duração, quadro e desenho.
export const personagem = {
    gatilho: 'pomodoro',
    variantes: {
        'sobe': {
            tamanho: icone => ({w: Math.round(icone * 1.8), h: Math.round(icone * 1.9)}),
            contexto: () => ({}),
            duracao: () => duracaoTomate(),
            finais: ['cai', 'afunda', 'some'],
            quadro: (t, ctx) => quadroTomate(t, ctx.saida),
            desenhar: (cr, w, h, q) => tomate(cr, w, h, q),
        },
        'pula': passeio(PASSEIOS['tomate-pula'], tomate, q => ({sobe: 1, pulo: 0, confete: q.t / 1000 % 2.4, olhar: q.olhar})),
    },
};
