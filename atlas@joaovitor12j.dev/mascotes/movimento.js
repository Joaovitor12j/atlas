// Movimentos dos mascotes: subir da doca (mola, esticada, finais sorteados) e atravessar a doca (passeios). Puro.

import {easeInCubic, easeInOut, limitar01, molaAmortecida, rampa} from '../nucleo/matematica.js';
import {passear} from './desenho.js';
import {quadroSprite, sprite, SPRITES} from './sprites.js';

// Sobe de trás da borda, fica e desce, com os princípios de animação aplicados num lugar só (os mascotes que sobem da
// doca usam): subida em mola com esticada (rápido = alto e fino), assentada com esmagada, respiração enquanto fica e,
// antes de descer, uma preparação (sobe um pouco, encolhe) seguida da queda esticada.
// Devolve {sobe, esmaga: {sx, sy}}: `sobe` de 0 a 1 (passa um pouco no overshoot) e `esmaga` é a escala em torno da
// borda da doca. `t` fora de [0, duração) devolve o estado escondido.
const FRAC_PREPARO = 0.22;

export const FINAIS = ['cai', 'afunda', 'espia', 'some'];

export function faseSobeDesce(t, {sobe, fica, desce}, saida = 'cai') {
    t = Math.max(0, t);
    let alfa = 1;
    const fimFica = sobe + fica;
    let s = 0;
    let sx = 1;
    let sy = 1;
    if (t < sobe) {
        const x = t / sobe;
        s = molaAmortecida(x);
        const v = molaAmortecida(Math.min(1, x + 0.04)) - s; // velocidade: quanto mais rápido, mais esticado
        sy += Math.min(0.14, v * 3.2);
        sx -= Math.min(0.08, v * 1.8);
    } else if (t < fimFica) {
        s = 1;
        const a = (t - sobe) / 260; // assentada: esmaga e volta oscilando
        const pouso = Math.exp(-5 * a) * Math.cos(a * 11);
        const respira = Math.sin(t / 430) * 0.012;
        sy += respira - 0.07 * pouso * Math.min(1, a * 6);
        sx += -respira * 0.6 + 0.045 * pouso * Math.min(1, a * 6);
    } else if (t < fimFica + desce) {
        const x = (t - fimFica) / desce;
        if (saida === 'afunda') {
            // some de vergonha: afunda devagar, sem preparação
            s = 1 - easeInOut(x);
            sy -= 0.04 * Math.sin(x * Math.PI);
        } else if (saida === 'espia') {
            // esconde, espia de volta e some de vez
            const ponto = (a, b, y) => a + (b - a) * easeInOut(limitar01(y));
            if (x < 0.3)
                s = ponto(1, 0.4, x / 0.3);
            else if (x < 0.5)
                s = 0.4;
            else if (x < 0.72)
                s = ponto(0.4, 0.85, (x - 0.5) / 0.22);
            else
                s = ponto(0.85, 0, (x - 0.72) / 0.28);
        } else if (saida === 'some') {
            // puf: desbota e encolhe no lugar
            s = 1;
            alfa = 1 - easeInOut(x);
            sx -= 0.18 * x;
            sy -= 0.18 * x;
        } else if (x < FRAC_PREPARO) {
            const p = Math.sin((x / FRAC_PREPARO) * Math.PI);
            s = 1 + 0.05 * p;
            sy -= 0.06 * p;
            sx += 0.04 * p;
        } else {
            const y = (x - FRAC_PREPARO) / (1 - FRAC_PREPARO);
            s = 1 - easeInCubic(y);
            sy += 0.1 * y;
            sx -= 0.05 * y;
        }
    }
    return {sobe: s, esmaga: {sx, sy}, alfa};
}

// Sobe, fica e desce: {sobe, ativo} em `t` ms ou null depois do fim. `sobe` passa um pouco de 1 no overshoot e `ativo`
// (0 a 1) é a rampa da parte animada, que entra logo depois de subir e sai um pouco antes de descer.
export function quadroSobeDesce(t, {sobe, fica, desce}, saida = 'cai') {
    t = Math.max(0, t);
    if (t >= sobe + fica + desce)
        return null;
    const fimFica = sobe + fica;
    return {...faseSobeDesce(t, {sobe, fica, desce}, saida), ativo: limitar01((t - sobe) / 250) * limitar01((fimFica - 150 - t) / 250)};
}

// `c` é a configuração do passeio (PASSEIOS de cada personagem). Tamanho do actor de um passeio: a largura da doca inteira e a altura da figura mais a folga para pulos e voo.
export function tamanhoPasseio(c, icone, larguraDoca) {
    return {w: Math.round(larguraDoca), h: Math.round(icone * c.fig[1] * (1 + c.cabeca + (c.altura ?? 0) + c.bob)), abaixo: 0};
}

// Estado do passeio em `t` ms: {x, dy, rot, sx, sy, parado, acena, t, dir}. `x` de 0 a 1 ao longo da doca (um pouco
// fora nas pontas; `dir` -1 vai da direita para a esquerda), `dy` é a altura do chão em alturas da figura, `rot` a
// inclinação em rad e `sx`/`sy` o esticar e esmagar. `parado` (0 a 1) vale 1 enquanto para no meio e `acena` oscila
// de -1 a 1 nessa hora. null depois do fim.
export function quadroPasseio(t, dir, c) {
    t = Math.max(0, t);
    if (t >= c.dur)
        return null;
    const margem = 0.14;
    const lerp = (a, b, x) => a + (b - a) * limitar01(x);
    let p;
    let parado = 0;
    if (c.pausa) {
        const a = (c.dur - c.pausa.dur) / 2;
        if (t < a) {
            p = lerp(-margem, 0.5, t / a);
        } else if (t < a + c.pausa.dur) {
            p = 0.5;
            parado = rampa(t, a, a + 250) * (1 - rampa(t, a + c.pausa.dur - 250, a + c.pausa.dur));
        } else {
            p = lerp(0.5, 1 + margem, (t - a - c.pausa.dur) / a);
        }
    } else {
        p = lerp(-margem, 1 + margem, t / c.dur);
    }
    const andando = 1 - parado;
    const ciclo = (t % c.passoMs) / c.passoMs;
    let dy = 0;
    let rot = 0;
    let sx = 1;
    let sy = 1;
    if (c.modo === 'flutua') {
        dy = c.altura + Math.sin(ciclo * 2 * Math.PI) * c.bob;
        rot = Math.sin(ciclo * 2 * Math.PI + 1) * c.inclina * 0.6 + (dir < 0 ? -1 : 1) * c.inclina * 0.5 * andando;
    } else if (c.modo === 'anda') {
        dy = Math.abs(Math.sin(ciclo * Math.PI)) * c.bob * andando;
        rot = Math.sin(ciclo * 2 * Math.PI) * c.inclina * andando;
    } else {
        const s = Math.sin(ciclo * Math.PI);
        dy = s * c.bob;
        const chao = 1 - Math.min(1, s * 4); // perto do chão: agacha e alarga
        sy = 1 - 0.12 * chao + 0.06 * (1 - chao);
        sx = 1 + 0.08 * chao - 0.03 * (1 - chao);
        rot = Math.sin(ciclo * 2 * Math.PI) * c.inclina;
    }
    return {
        x: dir < 0 ? 1 - p : p, dy, rot, sx, sy, parado, t, dir: dir < 0 ? -1 : 1,
        acena: Math.sin(t / 150) * parado,
    };
}

// Olho aberto de 0 a 1: fecha por ~150 ms a cada `periodo` ms (piscada).
export const piscada = (t, periodo = 2100) => {
    const f = t % periodo;
    return f < 150 ? 1 - Math.sin((f / 150) * Math.PI) : 1;
};

// Construtores dos movimentos que os personagens declaram em `variantes` (ver personagens/): o motor (palco.js) usa
// `tamanho`, `contexto`, `duracao`, `quadro` e `desenhar`; o desenho recebe `ctx.base` e `ctx.icone`.
// Um movimento que atravessa a doca (calor, frio, cuco voando): `tamanho(icone, larguraDoca)`; `dir` sorteia o lado de onde vem.
export const movimento = (tamanho, duracao, quadro, desenhar) => ({
    tamanho: (icone, caixa) => tamanho(icone, caixa.w),
    contexto: () => ({dir: Math.random() < 0.5 ? -1 : 1}),
    duracao,
    quadro: (t, ctx) => quadro(t, ctx.dir),
    desenhar: (cr, w, h, q, ctx) => desenhar(cr, w, h, q, ctx),
});

// Um passeio (`cfg` vem do PASSEIOS do personagem): o mascote atravessa a doca. `quadroFig` converte o estado do passeio no estado do
// desenho que sobe da doca (o mesmo desenho do mascote, só que andando, voando ou pulando).
export const passeio = (cfg, desenhar, quadroFig, contexto = () => ({})) => ({
    tamanho: (icone, caixa) => tamanhoPasseio(cfg, icone, caixa.w),
    contexto: (settings, alvo) => ({dir: Math.random() < 0.5 ? -1 : 1, ...contexto(settings, alvo)}),
    duracao: () => cfg.dur,
    quadro: (t, ctx) => quadroPasseio(t, ctx.dir, cfg),
    desenhar: (cr, w, h, q, ctx) => passear(cr, w, h, q, ctx, cfg.fig, desenhar, quadroFig),
});

// Um sprite que atravessa a doca (SPRITES, sprites.js): o actor tem a largura da doca e a altura do mascote. A imagem
// é carregada pelo motor (`impl.sprite`) e chega ao desenho em `ctx.imagem`.
export const andarSprite = (id, {velocidade, passo}) => ({
    sprite: id,
    tamanho: (icone, caixa) => ({w: Math.round(caixa.w), h: Math.round(icone * (SPRITES[id].altura * 1.05 + 0.25)), abaixo: Math.round(icone * 0.25)}),
    contexto: () => ({dir: Math.random() < 0.5 ? -1 : 1, spec: SPRITES[id]}),
    duracao: () => 0,
    quadro: (t, ctx) => quadroSprite(t, ctx.dir, ctx.spec, {largura: ctx.largura, icone: ctx.icone, velocidade, passo}),
    desenhar: (cr, w, h, q, ctx) => sprite(cr, w, h, q, ctx),
});

// Tamanho de um movimento que atravessa a doca: a largura dela e `altura` ícones de altura.
export const atravessa = altura => (icone, larguraDoca) => ({w: Math.round(larguraDoca), h: Math.round(icone * altura), abaixo: 0});
