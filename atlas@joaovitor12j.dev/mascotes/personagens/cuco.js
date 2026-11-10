// Mascote Cuco (a cada hora; casinha, passeio e voo): desenho em Cairo e linha do tempo.
import {arco, cor, poligono} from '../../nucleo/desenho.js';
import {easeInCubic, easeInOut, easeOutBack, easeOutCubic, limitar01, VOLTA} from '../../nucleo/matematica.js';
import {TOPO} from '../desenho.js';

const MADEIRA = {
    telhado: '#5b3417', telha: '#7a4a24', friso: '#b88a52', corpo: '#b9773f', tabua: '#96602f',
    porta: '#8a5528', vao: '#241409', folha: '#5a8a3f', folhaEscura: '#3f6b2c', mostrador: '#f1e6c8', ouro: '#e8a93a',
};

const CONTORNO = [0, 0, 0, 0.4];

// Folha de carvalho: elipse pontuda girada em `ang`, com a nervura central; a base fica em (x, y).
function folha(cr, x, y, comp, ang, escura) {
    cr.save();
    cr.translate(x, y);
    cr.rotate(ang);
    cr.moveTo(0, 0);
    cr.curveTo(comp * 0.25, -comp * 0.32, comp * 0.75, -comp * 0.3, comp, 0);
    cr.curveTo(comp * 0.75, comp * 0.3, comp * 0.25, comp * 0.32, 0, 0);
    cr.closePath();
    cr.setSourceRGBA(...cor(escura ? MADEIRA.folhaEscura : MADEIRA.folha));
    cr.fill();
    cr.moveTo(0, 0);
    cr.lineTo(comp * 0.9, 0);
    cr.setLineWidth(0.8);
    cr.setSourceRGBA(0, 0, 0, 0.3);
    cr.stroke();
    cr.restore();
}

// Pássaro de perfil, olhando para a direita. `L` é a largura do vão; a base do pássaro fica em (0, 0).
function passaro(cr, L, bico) {
    const y = v => v * L;
    cr.setSourceRGBA(...cor('#2f6fb0'));                       // cauda
    poligono(cr, [[y(-0.2), y(-0.3)], [y(-0.46), y(-0.18)], [y(-0.4), y(-0.4)], [y(-0.18), y(-0.4)]]);
    cr.fill();
    cr.setSourceRGBA(...cor('#e8a93a'));                       // corpo
    cr.save();
    cr.translate(0, y(-0.3));
    cr.scale(1, 0.9);
    cr.arc(0, 0, y(0.27), 0, VOLTA);
    cr.restore();
    cr.fill();
    cr.setSourceRGBA(...cor('#2f6fb0'));                       // asa
    cr.save();
    cr.translate(y(-0.06), y(-0.28));
    cr.rotate(-0.4);
    cr.scale(1, 0.55);
    cr.arc(0, 0, y(0.17), 0, VOLTA);
    cr.restore();
    cr.fill();
    cr.setSourceRGBA(...cor('#e8a93a'));                       // cabeça
    cr.arc(y(0.13), y(-0.6), y(0.14), 0, VOLTA);
    cr.fill();
    cr.setSourceRGBA(...cor('#e0654f'));                       // bico, aberto por `bico`
    poligono(cr, [[y(0.23), y(-0.65)], [y(0.4), y(-0.6 - 0.07 * bico)], [y(0.23), y(-0.6)]]);
    cr.fill();
    poligono(cr, [[y(0.23), y(-0.6)], [y(0.4), y(-0.58 + 0.07 * bico)], [y(0.23), y(-0.55)]]);
    cr.fill();
    cr.setSourceRGBA(0.1, 0.07, 0.05, 1);                      // olho
    cr.arc(y(0.17), y(-0.64), y(0.025), 0, VOLTA);
    cr.fill();
}

function mostrador(cr, cx, cy, r, hora, minuto) {
    cr.arc(cx, cy, r, 0, VOLTA);
    cr.setSourceRGBA(...cor(MADEIRA.mostrador));
    cr.fillPreserve();
    cr.setLineWidth(Math.max(1.4, r * 0.14));
    cr.setSourceRGBA(...cor(MADEIRA.telhado));
    cr.stroke();
    cr.setSourceRGBA(...cor(MADEIRA.telhado));
    cr.setLineWidth(1);
    for (let i = 0; i < 12; i++) {
        const a = TOPO + (VOLTA * i) / 12;
        const r0 = r * (i % 3 === 0 ? 0.62 : 0.74);
        cr.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        cr.lineTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
    }
    cr.stroke();
    const ponteiro = (frac, comp, larg) => {
        const a = TOPO + VOLTA * frac;
        cr.moveTo(cx, cy);
        cr.lineTo(cx + Math.cos(a) * r * comp, cy + Math.sin(a) * r * comp);
        cr.setLineWidth(larg);
        cr.setLineCap(1);
        cr.stroke();
    };
    ponteiro(((hora % 12) + minuto / 60) / 12, 0.5, Math.max(1.4, r * 0.13));
    ponteiro(minuto / 60, 0.78, Math.max(1, r * 0.09));
    cr.arc(cx, cy, Math.max(1.2, r * 0.1), 0, VOLTA);
    cr.setSourceRGBA(...cor(MADEIRA.ouro));
    cr.fill();
}

// Relógio de cuco no retângulo (0, 0, w, h); o fundo da casa encosta em y = h quando `q.casa` é 1.
// `q` vem de quadroCuco (logica.js): {casa, porta, passaro, bico, inclina}. `hora` e `minuto` são os do mostrador.
// Quem chama recorta no retângulo.
export function cuco(cr, w, h, q, {hora = 10, minuto = 10} = {}) {
    cr.save();
    cr.translate(0, (1 - q.casa) * h);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    cr.setLineWidth(1.2);

    // folhas nas laterais, atrás do corpo
    for (const lado of [0, 1]) {
        const x = lado ? w * 0.84 : w * 0.16;
        const sinal = lado ? 1 : -1;
        folha(cr, x, h * 0.66, w * 0.2, sinal > 0 ? -0.35 : Math.PI + 0.35, false);
        folha(cr, x, h * 0.66, w * 0.2, sinal > 0 ? 0.35 : Math.PI - 0.35, true);
        folha(cr, x, h * 0.66, w * 0.17, sinal > 0 ? -1.05 : Math.PI + 1.05, true);
    }

    // corpo, com tábuas
    cr.rectangle(w * 0.14, h * 0.3, w * 0.72, h * 0.7);
    cr.setSourceRGBA(...cor(MADEIRA.corpo));
    cr.fillPreserve();
    cr.setSourceRGBA(...CONTORNO);
    cr.stroke();
    cr.setSourceRGBA(...cor(MADEIRA.tabua));
    cr.setLineWidth(0.8);
    for (let i = 1; i < 6; i++) {
        cr.moveTo(w * (0.14 + 0.72 * (i / 6)), h * 0.3);
        cr.lineTo(w * (0.14 + 0.72 * (i / 6)), h);
    }
    cr.stroke();
    cr.setLineWidth(1.2);

    // vão da porta em arco e o que há dentro
    const vw = w * 0.32, vx = (w - vw) / 2, vy = h * 0.34, vh = h * 0.24;
    arco(cr, vx, vy, vw, vh);
    cr.setSourceRGBA(...cor(MADEIRA.vao));
    cr.fill();
    if (q.passaro > 0) {
        cr.save();
        arco(cr, vx, vy, vw, vh);
        cr.clip();
        cr.translate(vx + vw / 2, vy + vh + (1 - Math.min(q.passaro, 1.15)) * vh * 0.9);
        cr.rotate(q.inclina * 0.28);
        passaro(cr, vw, q.bico);
        cr.restore();
    }
    // folha da porta: gira na dobradiça da esquerda, então só encolhe de largura
    const fx = 1 - q.porta * 0.88;
    cr.save();
    cr.translate(vx, vy);
    cr.scale(fx, 1);
    arco(cr, 0, 0, vw, vh);
    cr.restore();
    cr.setSourceRGBA(...cor(MADEIRA.porta));
    cr.fillPreserve();
    cr.setSourceRGBA(...CONTORNO);
    cr.stroke();
    if (q.porta < 0.6) {
        cr.arc(vx + vw * fx - 4, vy + vh * 0.62, 1.6, 0, VOLTA);
        cr.setSourceRGBA(...cor(MADEIRA.ouro));
        cr.fill();
    }

    // mostrador com a hora do disparo
    mostrador(cr, w / 2, h * 0.8, w * 0.2, hora, minuto);

    // telhado de duas águas, com fileiras de telhas e friso entalhado
    const beiral = h * 0.3;
    cr.save();
    poligono(cr, [[w / 2, h * 0.02], [w * 1.04, beiral], [-w * 0.04, beiral]]);
    cr.setSourceRGBA(...cor(MADEIRA.telhado));
    cr.fillPreserve();
    cr.clip();
    cr.setSourceRGBA(...cor(MADEIRA.telha));
    cr.setLineWidth(1);
    for (let fila = 0; fila < 5; fila++) {
        const yf = h * (0.07 + fila * 0.047);
        const passo = w * 0.1;
        for (let x = -w * 0.04 + ((fila % 2) * passo) / 2; x < w * 1.04; x += passo) {
            cr.newSubPath();
            cr.arc(x, yf - h * 0.012, passo * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
            cr.stroke();
        }
    }
    cr.restore();
    poligono(cr, [[w / 2, h * 0.02], [w * 1.04, beiral], [-w * 0.04, beiral]]);
    cr.setSourceRGBA(...CONTORNO);
    cr.stroke();
    // friso: faixa clara com recortes em arco, pendurada no beiral
    const n = 9;
    const larg = (w * 1.08) / n;
    cr.rectangle(-w * 0.04, beiral, w * 1.08, h * 0.012);
    cr.setSourceRGBA(...cor(MADEIRA.friso));
    cr.fill();
    for (let i = 0; i < n; i++) {
        cr.newSubPath();
        cr.arc(-w * 0.04 + larg * (i + 0.5), beiral + h * 0.012, larg * 0.5, 0, Math.PI);
        cr.closePath();
        cr.setSourceRGBA(...cor(MADEIRA.friso));
        cr.fillPreserve();
        cr.setSourceRGBA(...CONTORNO);
        cr.setLineWidth(0.8);
        cr.stroke();
    }
    cr.arc(w / 2, h * 0.02, Math.max(1.6, w * 0.028), 0, VOLTA);
    cr.setSourceRGBA(...cor(MADEIRA.ouro));
    cr.fill();
    cr.restore();
}

// Pássaro do cuco voando pela doca: sai da casinha e bate as asas. `q` vem de quadroCucoVoa (logica.js).
export function cucoVoa(cr, w, h, q, {base, icone}) {
    const L = icone * 1.1;
    cr.save();
    cr.translate(q.x * w, base - q.alt * icone);
    cr.rotate(-0.12 * q.dir * Math.cos(q.asa * 1.2));
    cr.scale(q.dir, 1); // o pássaro olha para a direita no desenho
    cr.translate(0, L * 0.4);
    // asa de trás e asa da frente, batendo em oposição
    cr.setSourceRGBA(...cor('#2f6fb0'));
    for (const [sinal, alfa] of [[-1, 0.7], [1, 1]]) {
        cr.save();
        cr.translate(-L * 0.04, -L * 0.36);
        cr.rotate(-0.5 - q.asa * 0.9 * sinal);
        cr.scale(1, 0.4);
        cr.arc(0, -L * 0.18, L * 0.3, 0, VOLTA);
        cr.setSourceRGBA(0.18, 0.44, 0.69, alfa);
        cr.fill();
        cr.restore();
    }
    passaro(cr, L, q.bico);
    cr.restore();
}

// Cuco: quantas vezes canta. `hora` (0..23) vira 1..12, limitado por `max`; na meia hora é uma só.
export function batidasDoDisparo(hora, minuto, max = 3) {
    if (minuto === 30)
        return 1;
    return Math.min(hora % 12 || 12, max);
}

export const CUCO = {sobe: 300, porta: 200, batida: 700, saida: 200, canto: 300, fecha: 200, desce: 300};

export const duracaoCuco = batidas => CUCO.inicio + CUCO.batida * batidas + CUCO.fecha + CUCO.desce;

// Estado do cuco em `t` ms: {casa, porta, passaro, bico, inclina}, todos de 0 a 1 (o pássaro passa um pouco de 1
// no overshoot da saída). null depois do fim.
export function quadroCuco(t, batidas) {
    t = Math.max(0, t);
    const fimBatidas = CUCO.inicio + CUCO.batida * batidas;
    if (t >= duracaoCuco(batidas))
        return null;
    const q = {casa: 1, porta: 1, passaro: 0, bico: 0, inclina: 0};
    if (t < CUCO.sobe) {
        q.casa = easeOutCubic(t / CUCO.sobe);
        q.porta = 0;
    } else if (t < CUCO.inicio) {
        q.porta = easeInOut((t - CUCO.sobe) / CUCO.porta);
    } else if (t < fimBatidas) {
        const s = (t - CUCO.inicio) % CUCO.batida;
        if (s < CUCO.saida) {
            q.passaro = easeOutBack(s / CUCO.saida);
        } else if (s < CUCO.saida + CUCO.canto) {
            const x = (s - CUCO.saida) / CUCO.canto;
            q.passaro = 1;
            q.bico = Math.abs(Math.sin(x * 2 * Math.PI));
            q.inclina = Math.sin(x * Math.PI);
        } else {
            q.passaro = 1 - easeInOut((s - CUCO.saida - CUCO.canto) / (CUCO.batida - CUCO.saida - CUCO.canto));
        }
    } else if (t < fimBatidas + CUCO.fecha) {
        q.porta = 1 - easeInOut((t - fimBatidas) / CUCO.fecha);
    } else {
        q.porta = 0;
        q.casa = 1 - easeInCubic(limitar01((t - fimBatidas - CUCO.fecha) / CUCO.desce));
    }
    return q;
}

// Cuco voando: o pássaro sai da casinha e cruza a doca batendo asas e cantando.
const CUCO_VOA = 4800;

export const duracaoCucoVoa = () => CUCO_VOA;

// {x, alt, asa, bico, dir}: `x` de 0 a 1 ao longo da doca (fora nas pontas), `alt` altura do voo em ícones, `asa` de -1
// a 1 (batida), `bico` de 0 a 1. null depois do fim.
export function quadroCucoVoa(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= CUCO_VOA)
        return null;
    const p = t / CUCO_VOA;
    const x = -0.1 + 1.2 * p;
    return {
        x: dir < 0 ? 1 - x : x,
        alt: 0.9 + 0.35 * Math.sin(p * Math.PI * 3),
        asa: Math.sin(t / 55),
        bico: Math.abs(Math.sin(t / 210)),
        dir: dir < 0 ? -1 : 1,
    };
}
