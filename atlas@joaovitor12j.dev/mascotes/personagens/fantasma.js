// Mascote Fantasma (Halloween): desenho em Cairo e linha do tempo.

import {limitar01} from '../../nucleo/matematica.js';
import {olhar} from '../desenho.js';
import {faseSobeDesce, passeio} from '../movimento.js';

// Fantasma no retângulo (0, 0, w, h): sobe de trás da borda de baixo (y = h) e dá um "bu!".
// `q` vem de quadroFantasma (logica.js): {sobe, balanco, susto, fase}. Quem chama recorta no retângulo.
export function fantasma(cr, w, h, q) {
    const gw = w * 0.62, gh = h * 0.84, r = gw / 2;
    const d = gw * 0.07;
    cr.save();
    // a barra ondulada fica um pouco acima de y = h quando sobe = 1, para a ondulação aparecer inteira
    cr.translate(w / 2 + q.balanco * w * 0.05, h - (gh + d) * q.sobe);
    cr.rotate(q.balanco * 0.1);
    cr.setLineJoin(1);
    cr.setLineCap(1);

    const corpo = [0.96, 0.96, 1, 0.94];
    const borda = [0.15, 0.12, 0.3, 0.55];

    // braços, atrás do corpo
    cr.setLineWidth(gw * 0.15);
    for (const lado of [-1, 1]) {
        cr.moveTo(lado * r * 0.85, gh * 0.55);
        cr.lineTo(lado * (r * 1.2), gh * 0.55 - q.susto * gh * 0.28);
        cr.setSourceRGBA(...borda);
        cr.strokePreserve();
        cr.setLineWidth(gw * 0.11);
        cr.setSourceRGBA(...corpo);
        cr.stroke();
        cr.setLineWidth(gw * 0.15);
    }

    // corpo: cabeça redonda, laterais retas e barra ondulada
    cr.newPath();
    cr.arc(0, r, r, Math.PI, 0);
    cr.lineTo(r, gh - d);
    const ondas = 4;
    for (let i = 0; i < ondas; i++) {
        const x0 = r - (gw / ondas) * i;
        const x1 = x0 - gw / ondas;
        const s = (i % 2 ? -1 : 1) * d * (1 + 0.5 * Math.sin(q.fase + i * 1.3));
        cr.curveTo(x0, gh - d + s * 2, x1, gh - d + s * 2, x1, gh - d);
    }
    cr.closePath();
    cr.setSourceRGBA(...corpo);
    cr.fillPreserve();
    cr.setLineWidth(1.2);
    cr.setSourceRGBA(...borda);
    cr.stroke();

    // olhos e boca; no susto os olhos arregalam e a boca vira um "o"
    cr.setSourceRGBA(0.1, 0.08, 0.2, 1);
    for (const lado of [-1, 1]) {
        cr.save();
        cr.translate(lado * gw * 0.17 + olhar(q).x * gw * 0.05, r * 0.95 + olhar(q).y * gw * 0.035);
        cr.scale(1, 1 + 0.5 * q.susto);
        cr.arc(0, 0, gw * 0.075, 0, Math.PI * 2);
        cr.restore();
        cr.fill();
    }
    cr.save();
    cr.translate(0, r * 1.5);
    cr.scale(1, 0.6 + 1.2 * q.susto);
    cr.arc(0, 0, gw * (0.05 + 0.05 * q.susto), 0, Math.PI * 2);
    cr.restore();
    cr.fill();
    // bochechas
    cr.setSourceRGBA(1, 0.55, 0.45, 0.35);
    for (const lado of [-1, 1]) {
        cr.arc(lado * gw * 0.3, r * 1.3, gw * 0.06, 0, Math.PI * 2);
        cr.fill();
    }
    cr.restore();
}

const FANTASMA = {sobe: 450, fica: 2000, desce: 400, susto: 300};

export const duracaoFantasma = () => FANTASMA.sobe + FANTASMA.fica + FANTASMA.desce;

// Estado do fantasma em `t` ms: {sobe, balanco, susto, fase}. `sobe` e `susto` de 0 a 1 (sobe passa um pouco de 1 no
// overshoot), `balanco` de -1 a 1, `fase` cresce sempre (ondulação da barra). null depois do fim.
export function quadroFantasma(t, saida = 'cai') {
    t = Math.max(0, t);
    if (t >= duracaoFantasma())
        return null;
    const fimFica = FANTASMA.sobe + FANTASMA.fica;
    const q = {...faseSobeDesce(t, FANTASMA, saida), balanco: Math.sin(t / 260), susto: 0, fase: t / 160};
    // o "bu!": abre a boca e levanta os braços logo depois de subir, e relaxa antes de descer
    const ini = FANTASMA.sobe + 300;
    q.susto = limitar01((t - ini) / FANTASMA.susto) * limitar01((fimFica - 200 - t) / FANTASMA.susto);
    return q;
}

// Passeios (atravessar a doca): `dur` em ms, `fig` [largura, altura] da figura em múltiplos do ícone, `cabeca` (folga
// acima da figura), `modo` (`flutua`, `anda` ou `salta`), `passoMs`, `altura`, `bob`, `inclina` e `pausa` opcional.
export const PASSEIOS = {
    'fantasma-flutua': {dur: 6200, fig: [1.4, 1.8], cabeca: 0.3, modo: 'flutua', passoMs: 1500, altura: 0.12, bob: 0.07, inclina: 0.1, pausa: {dur: 1500}},
    'fantasma-zigue': {dur: 4600, fig: [1.4, 1.8], cabeca: 0.5, modo: 'flutua', passoMs: 900, altura: 0.3, bob: 0.22, inclina: 0.22},
};

// Como o motor (index.js) usa o mascote: `prefixo` das chaves do schema, `gatilho` (sem ele, dispara por horário), `temporada`,
// e `variantes` (movimentos) com tamanho, contexto, duração, quadro e desenho.
export const personagem = {
    prefixo: 'fantasma',
    temporada: {ini: [9, 24], fim: [9, 31]}, // 24 a 31 de outubro
    variantes: {
        'sobe': {
            tamanho: icone => ({w: Math.round(icone * 1.4), h: Math.round(icone * 1.8)}),
            contexto: () => ({}),
            duracao: () => duracaoFantasma(),
            finais: ['cai', 'some', 'espia'],
            quadro: (t, ctx) => quadroFantasma(t, ctx.saida),
            desenhar: (cr, w, h, q) => fantasma(cr, w, h, q),
        },
        'flutua': passeio(PASSEIOS['fantasma-flutua'], fantasma, q => ({
            sobe: 1, balanco: Math.sin(q.t / 260), susto: q.parado, fase: q.t / 160, olhar: q.olhar,
        })),
        'zigue': passeio(PASSEIOS['fantasma-zigue'], fantasma, q => ({
            sobe: 1, balanco: Math.sin(q.t / 200), susto: 0.4 + 0.4 * Math.sin(q.t / 350), fase: q.t / 120, olhar: q.olhar,
        })),
    },
};
