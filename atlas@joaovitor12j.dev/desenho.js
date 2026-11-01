// Desenho dos widgets com Cairo. Só recebe o contexto `cr`, sem St nem Clutter, para poder ser
// visto fora do Shell (ver tests/previa-desenho.js) e para o parser de cor ser testado com node.

import {confete} from './logica.js';

const VOLTA = Math.PI * 2;

// Para onde o mascote olha: {x, y} de -1 a 1 (o motor passa o ponteiro suavizado; sem ele, olha em frente).
const olhar = q => q.olhar ?? {x: 0, y: 0};
const TOPO = -Math.PI / 2;

// "#e0654f" -> [r, g, b, alfa] com canais de 0 a 1.
export function cor(hex, alfa = 1) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alfa];
}

export const FUNDO_TRILHA = [0.5, 0.5, 0.5, 0.28];

const limitar = f => Math.max(0, Math.min(1, Number.isFinite(f) ? f : 0));

// Anel de progresso que começa no topo e gira no sentido horário.
export function anel(cr, cx, cy, raio, espessura, frac, rgba, trilha = FUNDO_TRILHA) {
    cr.setLineCap(1); // redondo
    cr.setLineWidth(espessura);
    cr.setSourceRGBA(...trilha);
    cr.arc(cx, cy, raio, 0, VOLTA);
    cr.stroke();
    const f = limitar(frac);
    if (f <= 0)
        return;
    cr.setSourceRGBA(...rgba);
    cr.arc(cx, cy, raio, TOPO, TOPO + VOLTA * f);
    cr.stroke();
}

// Escala de carta náutica: marcas de 1px na borda do tile, mais longas a cada quarto de volta.
export function escala(cr, cx, cy, raio, marcas = 12, rgba = [0.6, 0.6, 0.6, 0.65]) {
    cr.setLineCap(0);
    cr.setLineWidth(1);
    cr.setSourceRGBA(...rgba);
    for (let i = 0; i < marcas; i++) {
        const a = TOPO + (VOLTA * i) / marcas;
        const comp = i % (marcas / 4) === 0 ? 3 : 1.6;
        cr.moveTo(cx + Math.cos(a) * raio, cy + Math.sin(a) * raio);
        cr.lineTo(cx + Math.cos(a) * (raio - comp), cy + Math.sin(a) * (raio - comp));
    }
    cr.stroke();
}

// Anel do tile quadrado (pomodoro, bateria, cronômetro, timer): escala fina por fora e o anel por dentro.
export function anelDeTile(cr, w, h, frac, rgba) {
    const cx = w / 2, cy = h / 2, lado = Math.min(w, h);
    escala(cr, cx, cy, lado / 2 - 3);
    anel(cr, cx, cy, lado / 2 - 9, 4.5, frac, rgba);
}

function retanguloArredondado(cr, x, y, w, h, r) {
    const raio = Math.min(r, h / 2, w / 2);
    cr.newSubPath();
    cr.arc(x + w - raio, y + raio, raio, TOPO, 0);
    cr.arc(x + w - raio, y + h - raio, raio, 0, Math.PI / 2);
    cr.arc(x + raio, y + h - raio, raio, Math.PI / 2, Math.PI);
    cr.arc(x + raio, y + raio, raio, Math.PI, Math.PI * 1.5);
    cr.closePath();
}

// Barra horizontal de progresso com cantos redondos.
export function barra(cr, x, y, w, h, frac, rgba, trilha = FUNDO_TRILHA) {
    retanguloArredondado(cr, x, y, w, h, h / 2);
    cr.setSourceRGBA(...trilha);
    cr.fill();
    const f = limitar(frac);
    if (f <= 0)
        return;
    retanguloArredondado(cr, x, y, Math.max(h, w * f), h, h / 2);
    cr.setSourceRGBA(...rgba);
    cr.fill();
}

// Gráfico de linhas: cada série é {valores: [...], cor: rgba, preencher?: bool}. O valor mais recente
// fica à direita; `pontos` é quantas amostras cabem na largura.
export function grafico(cr, x, y, w, h, series, {max = 100, pontos = 60, linha = 1.6} = {}) {
    cr.setLineJoin(1);
    cr.setLineCap(1);
    for (const {valores, cor: rgba, preencher} of series) {
        if (!valores || valores.length < 2)
            continue;
        const passo = w / (pontos - 1);
        const x0 = x + (pontos - valores.length) * passo;
        const py = v => y + h - limitar(v / max) * h;
        cr.moveTo(x0, py(valores[0]));
        valores.forEach((v, i) => cr.lineTo(x0 + i * passo, py(v)));
        cr.setLineWidth(linha);
        cr.setSourceRGBA(...rgba);
        if (preencher) {
            cr.strokePreserve();
            cr.lineTo(x0 + (valores.length - 1) * passo, y + h);
            cr.lineTo(x0, y + h);
            cr.closePath();
            cr.setSourceRGBA(rgba[0], rgba[1], rgba[2], 0.22);
            cr.fill();
        } else {
            cr.stroke();
        }
    }
}

// Relógio de ponteiros. `fg` é [r, g, b] do texto do tema; `acento` é o RGBA do ponteiro dos segundos.
export function relogioAnalogico(cr, cx, cy, raio, hora, minuto, segundo, fg, acento) {
    cr.setLineCap(1);
    cr.setSourceRGBA(fg[0], fg[1], fg[2], 0.35);
    cr.setLineWidth(1.5);
    cr.arc(cx, cy, raio, 0, VOLTA);
    cr.stroke();
    for (let i = 0; i < 12; i++) {
        const a = TOPO + (VOLTA * i) / 12;
        const grande = i % 3 === 0;
        const r0 = raio * (grande ? 0.78 : 0.86);
        cr.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        cr.lineTo(cx + Math.cos(a) * raio * 0.95, cy + Math.sin(a) * raio * 0.95);
        cr.setLineWidth(grande ? 1.8 : 1);
        cr.stroke();
    }
    const ponteiro = (frac, comprimento, largura, rgba) => {
        const a = TOPO + VOLTA * frac;
        cr.moveTo(cx, cy);
        cr.lineTo(cx + Math.cos(a) * raio * comprimento, cy + Math.sin(a) * raio * comprimento);
        cr.setLineWidth(largura);
        cr.setSourceRGBA(...rgba);
        cr.stroke();
    };
    ponteiro(((hora % 12) + minuto / 60) / 12, 0.5, 3, [fg[0], fg[1], fg[2], 0.95]);
    ponteiro((minuto + segundo / 60) / 60, 0.76, 2.2, [fg[0], fg[1], fg[2], 0.95]);
    ponteiro(segundo / 60, 0.86, 1.1, acento);
    cr.arc(cx, cy, 2.4, 0, VOLTA);
    cr.setSourceRGBA(...acento);
    cr.fill();
}

// ----- Ícones do tempo (widget Clima) -----

const TEMPO = {sol: '#e8a93a', lua: '#e6e1cf', chuva: '#4a90d9', raio: '#e8a93a'};

function sol(cr, cx, cy, r) {
    cr.setSourceRGBA(...cor(TEMPO.sol));
    cr.setLineCap(1);
    cr.setLineWidth(Math.max(1.2, r * 0.22));
    for (let i = 0; i < 8; i++) {
        const a = (VOLTA * i) / 8;
        cr.moveTo(cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r * 1.4);
        cr.lineTo(cx + Math.cos(a) * r * 1.8, cy + Math.sin(a) * r * 1.8);
    }
    cr.stroke();
    cr.arc(cx, cy, r, 0, VOLTA);
    cr.fill();
}

// Lua crescente: o disco menos um disco deslocado (par-ímpar dentro do recorte do disco).
function lua(cr, cx, cy, r) {
    cr.save();
    cr.arc(cx, cy, r, 0, VOLTA);
    cr.clip();
    cr.rectangle(cx - r, cy - r, r * 2, r * 2);
    cr.newSubPath();
    cr.arc(cx + r * 0.55, cy - r * 0.35, r * 0.82, 0, VOLTA);
    cr.setFillRule(1); // par-ímpar
    cr.setSourceRGBA(...cor(TEMPO.lua));
    cr.fill();
    cr.restore();
}

// Nuvem de largura `w` centrada em (cx, cy): união de três círculos e uma base arredondada.
function nuvem(cr, cx, cy, w, rgba) {
    cr.newSubPath();
    cr.arc(cx - w * 0.25, cy + w * 0.04, w * 0.2, 0, VOLTA);
    cr.newSubPath();
    cr.arc(cx - w * 0.02, cy - w * 0.08, w * 0.27, 0, VOLTA);
    cr.newSubPath();
    cr.arc(cx + w * 0.25, cy + w * 0.04, w * 0.2, 0, VOLTA);
    retanguloArredondado(cr, cx - w * 0.45, cy + w * 0.02, w * 0.9, w * 0.22, w * 0.11);
    cr.setFillRule(0);
    cr.setSourceRGBA(...rgba);
    cr.fill();
}

// Ícone `icone` (de descreverTempo, logica.js) num quadrado de lado `lado` centrado em (cx, cy). `fg` é a cor do
// texto do tema, usada na nuvem para ela aparecer em fundo claro e escuro; `dia` falso troca o sol pela lua.
export function iconeTempo(cr, cx, cy, lado, icone, fg, dia = true) {
    const u = lado / 100;
    const astro = (x, y, r) => (dia ? sol(cr, x, y, r) : lua(cr, x, y, r * 1.35));
    const corNuvem = (a = 0.92) => [fg[0], fg[1], fg[2], a];
    // nuvem um pouco acima do centro quando há algo caindo dela
    const cai = ['garoa', 'chuva', 'neve', 'trovoada'].includes(icone);
    const ny = cy - (cai ? 14 : 0) * u;
    cr.setLineCap(1);

    if (icone === 'limpo') {
        astro(cx, cy, 22 * u);
        return;
    }
    if (icone === 'poucas-nuvens') {
        astro(cx - 14 * u, cy - 14 * u, 16 * u);
        nuvem(cr, cx + 8 * u, cy + 10 * u, 66 * u, corNuvem());
        return;
    }
    if (icone === 'nevoeiro') {
        nuvem(cr, cx, cy - 12 * u, 70 * u, corNuvem(0.6));
        cr.setSourceRGBA(...corNuvem(0.85));
        cr.setLineWidth(5 * u);
        for (const [y, x0, x1] of [[18, -34, 26], [30, -24, 34]]) {
            cr.moveTo(cx + x0 * u, cy + y * u);
            cr.lineTo(cx + x1 * u, cy + y * u);
        }
        cr.stroke();
        return;
    }
    nuvem(cr, cx, ny, 76 * u, corNuvem(icone === 'nublado' ? 0.92 : 0.85));
    const base = ny + 22 * u; // embaixo da nuvem
    if (icone === 'chuva' || icone === 'garoa') {
        const comp = icone === 'chuva' ? 16 : 7;
        cr.setSourceRGBA(...cor(TEMPO.chuva));
        cr.setLineWidth(5 * u);
        for (const x of [-20, 0, 20]) {
            for (let k = 0; k < (icone === 'garoa' ? 2 : 1); k++) {
                const y0 = base + 6 * u + k * 13 * u;
                cr.moveTo(cx + x * u, y0);
                cr.lineTo(cx + (x - comp * 0.35) * u, y0 + comp * u);
            }
        }
        cr.stroke();
    } else if (icone === 'neve') {
        cr.setSourceRGBA(...corNuvem(0.95));
        for (const [x, y] of [[-20, 10], [0, 20], [20, 10], [-10, 28], [10, 30]]) {
            cr.newSubPath();
            cr.arc(cx + x * u, base + y * u, 4 * u, 0, VOLTA);
        }
        cr.fill();
    } else if (icone === 'trovoada') {
        cr.setSourceRGBA(...cor(TEMPO.raio));
        poligono(cr, [[cx + 4 * u, base], [cx - 12 * u, base + 22 * u], [cx, base + 22 * u],
            [cx - 6 * u, base + 40 * u], [cx + 14 * u, base + 14 * u], [cx + 2 * u, base + 14 * u], [cx + 10 * u, base]]);
        cr.fill();
    }
}

// ----- Cuco -----
// Relógio de cuco da Floresta Negra: telhado de telhas com friso entalhado, porta em arco, mostrador com a hora do
// disparo e folhas de carvalho nas laterais. Tudo em formas simples do Cairo, sem imagem.

const MADEIRA = {
    telhado: '#5b3417', telha: '#7a4a24', friso: '#b88a52', corpo: '#b9773f', tabua: '#96602f',
    porta: '#8a5528', vao: '#241409', folha: '#5a8a3f', folhaEscura: '#3f6b2c', mostrador: '#f1e6c8', ouro: '#e8a93a',
};
const CONTORNO = [0, 0, 0, 0.4];

function poligono(cr, pontos) {
    cr.moveTo(...pontos[0]);
    for (const p of pontos.slice(1))
        cr.lineTo(...p);
    cr.closePath();
}

// Contorno de porta em arco: retângulo (x, y, w, h) com o topo em meia-volta.
function arco(cr, x, y, w, h) {
    const r = w / 2;
    cr.newSubPath();
    cr.moveTo(x, y + h);
    cr.lineTo(x, y + r);
    cr.arc(x + r, y + r, r, Math.PI, VOLTA);
    cr.lineTo(x + w, y + h);
    cr.closePath();
}

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

// Esqueleto no retângulo (0, 0, w, h): sobe de trás da borda de baixo, acena e bate o queixo.
// `q` vem de quadroEsqueleto (logica.js): {sobe, balanco, aceno, mandibula}. Quem chama recorta no retângulo.
export function esqueleto(cr, w, h, q) {
    const alt = h * 0.9;
    const r = Math.min(w * 0.28, alt / 5.6);
    const osso = [0.95, 0.93, 0.85, 1];
    const sombra = [0.2, 0.17, 0.12, 0.8];
    const vazio = [0.08, 0.06, 0.1, 1];
    // um osso: contorno escuro por baixo, miolo claro por cima
    const haste = (x0, y0, x1, y1, esp) => {
        cr.setLineWidth(esp + 2);
        cr.setSourceRGBA(...sombra);
        cr.moveTo(x0, y0);
        cr.lineTo(x1, y1);
        cr.stroke();
        cr.setLineWidth(esp);
        cr.setSourceRGBA(...osso);
        cr.moveTo(x0, y0);
        cr.lineTo(x1, y1);
        cr.stroke();
    };
    cr.save();
    cr.translate(w / 2 + q.balanco * w * 0.03, h - alt * q.sobe);
    cr.setLineJoin(1);
    cr.setLineCap(1);

    const ombro = r * 2.7;
    const espinha = r * 2.3;
    // coluna, costelas e bacia
    haste(0, espinha, 0, alt - r * 0.5, r * 0.28);
    for (let i = 0; i < 3; i++) {
        const y = ombro + i * r * 0.62;
        const largura = r * (1.15 - i * 0.12);
        haste(-largura, y, largura, y, r * 0.22);
        haste(-largura, y, -largura * 0.9, y + r * 0.35, r * 0.2);
        haste(largura, y, largura * 0.9, y + r * 0.35, r * 0.2);
    }
    cr.save();
    cr.translate(0, alt - r * 0.45);
    cr.scale(1.3, 0.55);
    cr.arc(0, 0, r * 0.75, 0, Math.PI * 2);
    cr.restore();
    cr.setSourceRGBA(...osso);
    cr.fillPreserve();
    cr.setLineWidth(1.2);
    cr.setSourceRGBA(...sombra);
    cr.stroke();

    // braço esquerdo caído e braço direito acenando
    haste(-r * 1.15, ombro, -r * 1.6, ombro + r * 1.9, r * 0.24);
    const mao = {x: r * 1.9 + q.aceno * r * 0.5, y: ombro - r * 1.5};
    haste(r * 1.15, ombro, r * 1.7, ombro - r * 0.5, r * 0.24);
    haste(r * 1.7, ombro - r * 0.5, mao.x, mao.y, r * 0.22);
    cr.arc(mao.x, mao.y, r * 0.2, 0, Math.PI * 2);
    cr.setSourceRGBA(...osso);
    cr.fill();

    // caveira: crânio, olhos, nariz e mandíbula que desce ao bater o queixo
    const queixo = q.mandibula * r * 0.35;
    cr.rectangle(-r * 0.62, r * 1.55 + queixo, r * 1.24, r * 0.5);
    cr.setSourceRGBA(...osso);
    cr.fillPreserve();
    cr.setLineWidth(1.2);
    cr.setSourceRGBA(...sombra);
    cr.stroke();
    for (let i = -1; i <= 1; i++) {
        cr.moveTo(i * r * 0.31, r * 1.55 + queixo);
        cr.lineTo(i * r * 0.31, r * 2.05 + queixo);
    }
    cr.stroke();
    cr.arc(0, r, r, 0, Math.PI * 2);
    cr.setSourceRGBA(...osso);
    cr.fillPreserve();
    cr.setSourceRGBA(...sombra);
    cr.stroke();
    cr.setSourceRGBA(...vazio);
    for (const lado of [-1, 1]) {
        cr.arc(lado * r * 0.4, r * 0.95, r * 0.26, 0, Math.PI * 2);
        cr.fill();
    }
    // brilho no fundo de cada órbita, que acompanha o ponteiro
    cr.setSourceRGBA(1, 0.85, 0.37, 0.95);
    for (const lado of [-1, 1]) {
        cr.arc(lado * r * 0.4 + olhar(q).x * r * 0.11, r * 0.95 + olhar(q).y * r * 0.08, r * 0.07, 0, Math.PI * 2);
        cr.fill();
    }
    cr.setSourceRGBA(...vazio);
    cr.moveTo(0, r * 1.2);
    cr.lineTo(-r * 0.12, r * 1.45);
    cr.lineTo(r * 0.12, r * 1.45);
    cr.closePath();
    cr.fill();
    cr.restore();
}

// Chama no retângulo (0, 0, w, h): sobe de trás da borda de baixo e dança, com cara de quem não aguenta o calor.
// `q` vem de quadroChama (logica.js): {sobe, fase, aflicao}. Quem chama recorta no retângulo.
export function chama(cr, w, h, q) {
    const gw = w * 0.74, gh = h * 0.88;
    // contorno da chama com a ponta dançando; `k` a encolhe em direção à base
    const forma = (k, atraso) => {
        const f = q.fase + atraso;
        const ponta = Math.sin(f) * gw * 0.16;
        const lingua = Math.sin(f * 1.7 + 1) * gw * 0.06;
        cr.save();
        cr.translate(0, gh);
        cr.scale(k, k);
        cr.translate(0, -gh);
        cr.newPath();
        cr.moveTo(0, gh);
        cr.curveTo(-gw * 0.62, gh * 0.98, -gw * 0.58, gh * 0.55, -gw * 0.42 + lingua, gh * 0.24);
        cr.curveTo(-gw * 0.3, gh * 0.4, -gw * 0.2, gh * 0.45, -gw * 0.14, gh * 0.4);
        cr.curveTo(-gw * 0.05, gh * 0.25, ponta * 0.4, gh * 0.1, ponta, 0);
        cr.curveTo(gw * 0.2 + ponta * 0.3, gh * 0.2, gw * 0.62, gh * 0.5, gw * 0.5, gh * 0.78);
        cr.curveTo(gw * 0.44, gh * 0.95, gw * 0.2, gh, 0, gh);
        cr.closePath();
        cr.restore();
    };
    cr.save();
    cr.translate(w / 2, h - gh * q.sobe);
    cr.setLineJoin(1);
    forma(1, 0);
    cr.setSourceRGBA(0.88, 0.27, 0.16, 1);
    cr.fillPreserve();
    cr.setLineWidth(1.2);
    cr.setSourceRGBA(0.45, 0.1, 0.06, 0.6);
    cr.stroke();
    forma(0.74, 0.8);
    cr.setSourceRGBA(0.96, 0.6, 0.14, 1);
    cr.fill();
    forma(0.46, 1.6);
    cr.setSourceRGBA(1, 0.85, 0.37, 1);
    cr.fill();

    // cara: olhos arregalados e boca em "o" que cresce com a aflição; uma gota de suor
    const ya = gh * 0.66;
    for (const lado of [-1, 1]) {
        cr.arc(lado * gw * 0.15, ya, gw * (0.075 + 0.03 * q.aflicao), 0, Math.PI * 2);
        cr.setSourceRGBA(1, 1, 1, 1);
        cr.fill();
        cr.arc(lado * gw * 0.15 + olhar(q).x * gw * 0.035, ya + gw * 0.015 + olhar(q).y * gw * 0.025, gw * 0.035, 0, Math.PI * 2);
        cr.setSourceRGBA(0.1, 0.05, 0.05, 1);
        cr.fill();
    }
    cr.save();
    cr.translate(0, gh * 0.8);
    cr.scale(1, 0.8 + 0.8 * q.aflicao);
    cr.arc(0, 0, gw * (0.045 + 0.04 * q.aflicao), 0, Math.PI * 2);
    cr.restore();
    cr.setSourceRGBA(0.35, 0.05, 0.05, 1);
    cr.fill();
    cr.save();
    cr.translate(gw * 0.34, gh * 0.55 + q.aflicao * gh * 0.06 + Math.sin(q.fase * 2) * 1.5);
    cr.moveTo(0, -gw * 0.07);
    cr.curveTo(gw * 0.05, -gw * 0.01, gw * 0.05, gw * 0.04, 0, gw * 0.04);
    cr.curveTo(-gw * 0.05, gw * 0.04, -gw * 0.05, -gw * 0.01, 0, -gw * 0.07);
    cr.setSourceRGBA(0.55, 0.8, 1, 0.9 * q.aflicao);
    cr.fill();
    cr.restore();
    cr.restore();
}

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

// ----- Mascotes do clima (frio e calor) -----
// Todos recebem `ctx` com `base` (a linha do topo da doca dentro do actor; o que fica abaixo dela é desenhado sobre a
// doca) e `icone` (o tamanho dos ícones, a unidade dos desenhos). Os quadros vêm de logica.js.

// Desenha `fn` num grupo e pinta com `alfa` (sumir de uma vez, sem mexer em cada cor).
function comAlfa(cr, alfa, fn) {
    if (alfa >= 0.999) {
        fn();
        return;
    }
    cr.pushGroup();
    fn();
    cr.popGroupToSource();
    cr.paintWithAlpha(Math.max(0, alfa));
}

// Olhos e boca simples num rosto centrado em (x, y) de raio `r`. `boca`: 'sorriso', 'aflito' ou 'aberta'.
function rosto(cr, x, y, r, boca = 'sorriso', olhos = true) {
    cr.setSourceRGBA(0.12, 0.1, 0.1, 1);
    if (olhos) {
        for (const lado of [-1, 1]) {
            cr.arc(x + lado * r * 0.36, y - r * 0.12, r * 0.11, 0, VOLTA);
            cr.fill();
        }
    }
    cr.setLineWidth(Math.max(1, r * 0.1));
    cr.setLineCap(1);
    if (boca === 'aberta') {
        cr.save();
        cr.translate(x, y + r * 0.38);
        cr.scale(1, 0.75);
        cr.arc(0, 0, r * 0.22, 0, VOLTA);
        cr.restore();
        cr.fill();
    } else if (boca === 'aflito') {
        cr.arc(x, y + r * 0.62, r * 0.28, Math.PI * 1.15, Math.PI * 1.85);
        cr.stroke();
    } else {
        cr.arc(x, y + r * 0.12, r * 0.38, Math.PI * 0.2, Math.PI * 0.8);
        cr.stroke();
    }
}

// Gota d'água (ponta para cima) com a base redonda em (x, y) e raio `r`.
function gota(cr, x, y, r, rgba) {
    cr.moveTo(x, y - r * 2.2);
    cr.curveTo(x + r * 0.4, y - r * 1.3, x + r, y - r * 0.6, x + r, y);
    cr.arc(x, y, r, 0, Math.PI);
    cr.curveTo(x - r, y - r * 0.6, x - r * 0.4, y - r * 1.3, x, y - r * 2.2);
    cr.closePath();
    cr.setSourceRGBA(...rgba);
    cr.fill();
}

// Sol com rosto. `oculos` põe óculos escuros; `giro` gira os raios.
function solRosto(cr, cx, cy, r, giro, {oculos = true, boca = 'sorriso'} = {}) {
    cr.save();
    cr.translate(cx, cy);
    cr.setSourceRGBA(...cor('#f2a93b'));
    for (let i = 0; i < 12; i++) {
        const a = giro + (VOLTA * i) / 12;
        const larg = 0.16;
        cr.moveTo(Math.cos(a - larg) * r * 1.08, Math.sin(a - larg) * r * 1.08);
        cr.lineTo(Math.cos(a) * r * (i % 2 ? 1.42 : 1.62), Math.sin(a) * r * (i % 2 ? 1.42 : 1.62));
        cr.lineTo(Math.cos(a + larg) * r * 1.08, Math.sin(a + larg) * r * 1.08);
        cr.closePath();
    }
    cr.fill();
    cr.arc(0, 0, r, 0, VOLTA);
    cr.setSourceRGBA(...cor('#f7c548'));
    cr.fillPreserve();
    cr.setLineWidth(Math.max(1, r * 0.06));
    cr.setSourceRGBA(...cor('#d9822b'));
    cr.stroke();
    rosto(cr, 0, 0, r, boca, !oculos);
    if (oculos) {
        cr.setSourceRGBA(0.1, 0.1, 0.14, 1);
        for (const lado of [-1, 1]) {
            retanguloArredondado(cr, lado * r * 0.08 + (lado < 0 ? -r * 0.62 : 0), -r * 0.32, r * 0.54, r * 0.34, r * 0.14);
            cr.fill();
        }
        cr.setLineWidth(Math.max(1, r * 0.07));
        cr.moveTo(-r * 0.1, -r * 0.24);
        cr.lineTo(r * 0.1, -r * 0.24);
        cr.stroke();
        cr.setSourceRGBA(1, 1, 1, 0.45); // reflexo
        cr.moveTo(-r * 0.46, -r * 0.24);
        cr.lineTo(-r * 0.32, -r * 0.24);
        cr.moveTo(r * 0.24, -r * 0.24);
        cr.lineTo(r * 0.38, -r * 0.24);
        cr.stroke();
    }
    cr.restore();
}

// Picolé derretendo: sobe da doca, pinga pela borda (sobre a doca) e vira uma poça que evapora.
export function picole(cr, w, h, q, {base, icone}) {
    const a = icone;
    const cx = w / 2;
    const bw = a * 0.56, bh = a * 0.82, pw = a * 0.12, ph = a * 0.34;
    const altura = (bh + ph) * (1 - q.derrete * 0.92);
    const sabor = cor('#f0866a');
    comAlfa(cr, q.alfa, () => {
        // poça na linha da doca
        const poca = Math.max(q.derrete, Math.min(0.3, q.fase * 0.08)) * (q.sobe >= 1 ? 1 : 0);
        if (poca > 0) {
            cr.save();
            cr.translate(cx, base);
            cr.scale(1, 0.22);
            cr.arc(0, 0, bw * (0.4 + 0.9 * poca), 0, VOLTA);
            cr.restore();
            cr.setSourceRGBA(...sabor);
            cr.fill();
        }
        // pingos: formam na base do picolé, caem na doca e escorrem pela borda dela
        if (q.sobe >= 1 && q.derrete < 0.9) {
            for (const [dx, atraso] of [[-0.2, 0], [0.18, 0.55]]) {
                const f = ((q.fase + atraso) % 1.1) / 1.1;
                const x = cx + dx * a * (1 + q.derrete * 0.6);
                const topo = base - ph * 0.6;
                const r = a * 0.05;
                if (f < 0.35)
                    gota(cr, x, topo + (base - topo) * (f / 0.35), r, sabor);
                else
                    gota(cr, x, base + (h - base - r * 2) * easeIn((f - 0.35) / 0.65), r * (1 - 0.3 * (f - 0.35)), sabor);
            }
        }
        // o picolé, que sobe de trás da doca e encolhe ao derreter
        cr.save();
        cr.rectangle(0, 0, w, base);
        cr.clip();
        cr.translate(0, (1 - q.sobe) * (bh + ph + a * 0.1));
        const pe = base;
        cr.setSourceRGBA(...cor('#d9b07a'));
        retanguloArredondado(cr, cx - pw / 2, pe - Math.min(ph, altura), pw, Math.min(ph, altura) + pw, pw / 2);
        cr.fill();
        const corpo = Math.max(0, altura - ph * (1 - q.derrete));
        if (corpo > a * 0.05) {
            const larg = bw * (1 + q.derrete * 0.35);
            const topo = pe - ph * (1 - q.derrete) - corpo;
            retanguloArredondado(cr, cx - larg / 2, topo, larg, corpo, Math.min(larg / 2, a * 0.26));
            cr.setSourceRGBA(...sabor);
            cr.fillPreserve();
            cr.setLineWidth(1.2);
            cr.setSourceRGBA(0.55, 0.2, 0.12, 0.6);
            cr.stroke();
            // cobertura que escorre, com ondas na borda de baixo
            cr.moveTo(cx - larg / 2, topo + corpo * 0.35);
            for (let i = 0; i <= 6; i++) {
                const x = cx - larg / 2 + (larg * i) / 6;
                const y = topo + corpo * (0.35 + (i % 2 ? 0.1 : 0)) + Math.sin(q.fase * 3 + i) * a * 0.015;
                cr.lineTo(x, y);
            }
            cr.lineTo(cx + larg / 2, topo + a * 0.2);
            cr.arc(cx + larg / 2 - a * 0.2, topo + a * 0.2, a * 0.2, 0, -Math.PI / 2);
            cr.lineTo(cx - larg / 2 + a * 0.2, topo);
            cr.arc(cx - larg / 2 + a * 0.2, topo + a * 0.2, a * 0.2, -Math.PI / 2, -Math.PI);
            cr.closePath();
            cr.setSourceRGBA(...cor('#f6c2b4'));
            cr.fill();
            if (corpo > a * 0.3)
                rosto(cr, cx, topo + corpo * 0.62, a * 0.2, 'aflito');
            // suor
            if (q.suor > 0 && corpo > a * 0.3)
                gota(cr, cx + larg * 0.55, topo + corpo * 0.35 + Math.sin(q.fase * 4) * a * 0.03, a * 0.045, [0.55, 0.78, 1, q.suor]);
        }
        cr.restore();
        // vapor saindo da poça
        if (q.vapor > 0) {
            cr.setLineWidth(Math.max(1, a * 0.04));
            cr.setLineCap(1);
            for (const dx of [-0.2, 0, 0.2]) {
                const sobe = q.vapor * a * 0.5;
                cr.moveTo(cx + dx * a, base - a * 0.05 - sobe);
                for (let i = 1; i <= 4; i++)
                    cr.lineTo(cx + dx * a + Math.sin(i * 1.6 + q.fase * 6) * a * 0.04, base - a * 0.05 - sobe - i * a * 0.08);
                cr.setSourceRGBA(1, 1, 1, 0.7 * Math.sin(Math.PI * q.vapor));
                cr.stroke();
            }
        }
    });
}

const easeIn = x => Math.max(0, Math.min(1, x)) ** 2;

// Sol atravessando: nasce de trás de uma ponta da doca, faz um arco por cima e se põe na outra.
export function solArco(cr, w, h, q, {base, icone}) {
    const r = icone * 0.4;
    const cx = r * 1.7 + q.x * (w - r * 3.4);
    const baixo = base + r * 1.7;          // escondido atrás da doca
    const alto = r * 1.75;                 // topo do arco, com os raios dentro do actor
    const cy = baixo - q.altura * (baixo - alto);
    cr.save();
    cr.rectangle(0, 0, w, base);
    cr.clip();
    // brilho em volta
    cr.arc(cx, cy, r * 2.2, 0, VOLTA);
    cr.setSourceRGBA(0.97, 0.77, 0.28, 0.12 * q.altura);
    cr.fill();
    solRosto(cr, cx, cy, r, q.giro);
    cr.restore();
}

// Sol de óculos andando: pernas, um leque na mão e a outra mão que enxuga a testa.
export function solLeque(cr, w, h, q, {base, icone}) {
    const a = icone;
    const r = a * 0.36;
    const perna = a * 0.32;
    const cx = q.x * w;
    const pulo = Math.abs(Math.sin(q.passo)) * a * 0.05 * q.anda;
    const cy = base - perna - r - pulo;
    const d = q.dir;
    cr.save();
    cr.setLineCap(1);
    cr.setLineJoin(1);
    // pernas que alternam ao andar
    cr.setSourceRGBA(...cor('#8a4b16'));
    cr.setLineWidth(Math.max(1.5, a * 0.06));
    for (const lado of [-1, 1]) {
        const passo = Math.sin(q.passo + (lado > 0 ? Math.PI : 0)) * a * 0.12 * q.anda;
        cr.moveTo(cx + lado * r * 0.35, cy + r * 0.9);
        cr.lineTo(cx + lado * r * 0.35 + passo, base - a * 0.02);
        cr.lineTo(cx + lado * r * 0.35 + passo + d * a * 0.08, base - a * 0.02);
    }
    cr.stroke();
    // braço de trás com o leque
    const mao = [cx - d * r * 1.25, cy + r * 0.15];
    cr.moveTo(cx - d * r * 0.8, cy + r * 0.3);
    cr.lineTo(...mao);
    cr.stroke();
    cr.save();
    cr.translate(...mao);
    cr.rotate(-d * 0.9 + q.leque * 0.6);
    cr.moveTo(0, 0);
    cr.arc(0, 0, a * 0.34, -Math.PI / 2 - 0.75, -Math.PI / 2 + 0.75);
    cr.closePath();
    cr.setSourceRGBA(...cor('#3fb8a8'));
    cr.fillPreserve();
    cr.setSourceRGBA(0.1, 0.35, 0.32, 0.9);
    cr.setLineWidth(1);
    cr.stroke();
    for (let i = -2; i <= 2; i++) {
        const ang = -Math.PI / 2 + i * 0.32;
        cr.moveTo(0, 0);
        cr.lineTo(Math.cos(ang) * a * 0.32, Math.sin(ang) * a * 0.32);
    }
    cr.stroke();
    cr.restore();
    // corpo
    solRosto(cr, cx, cy, r, q.passo * 0.15, {boca: q.leque !== 0 || q.enxuga > 0 ? 'aflito' : 'sorriso'});
    // braço da frente: solto, ou com a mão na testa
    cr.setSourceRGBA(...cor('#8a4b16'));
    cr.setLineWidth(Math.max(1.5, a * 0.06));
    const solto = [cx + d * r * 1.25, cy + r * 0.8 + Math.sin(q.passo) * a * 0.05 * q.anda];
    const testa = [cx + d * r * 0.25 + Math.sin(q.enxuga * 18) * r * 0.25 * q.enxuga, cy - r * 0.62];
    const m = [solto[0] + (testa[0] - solto[0]) * q.enxuga, solto[1] + (testa[1] - solto[1]) * q.enxuga];
    cr.moveTo(cx + d * r * 0.85, cy + r * 0.35);
    cr.lineTo(...m);
    cr.stroke();
    cr.arc(...m, a * 0.045, 0, VOLTA);
    cr.fill();
    // gotas de suor voando quando enxuga
    if (q.enxuga > 0.5)
        gota(cr, cx - d * r * 0.9, cy - r * 1.05 - (q.enxuga - 0.5) * a * 0.3, a * 0.04, [0.55, 0.78, 1, 1]);
    cr.restore();
}

// Pinguim deslizando de barriga pela doca, com o pulinho no fim.
export function pinguim(cr, w, h, q, {base, icone}) {
    const a = icone;
    const L = a * 0.95, A = a * 0.4;
    const cx = q.x * w;
    const cy = base - A / 2 - q.pulo * a * 0.55;
    const d = q.dir;
    // rastro de vento atrás
    if (q.pulo === 0) {
        cr.setLineCap(1);
        cr.setLineWidth(Math.max(1, a * 0.035));
        cr.setSourceRGBA(0.8, 0.9, 1, 0.7);
        for (const [dy, comp] of [[-0.12, 0.35], [0.02, 0.5], [0.14, 0.3]]) {
            cr.moveTo(cx - d * (L * 0.62), cy + dy * a);
            cr.lineTo(cx - d * (L * 0.62 + comp * a), cy + dy * a);
        }
        cr.stroke();
    }
    cr.save();
    cr.translate(cx, cy);
    cr.rotate(q.inclina);
    cr.scale(d, 1);
    // pés atrás
    cr.setSourceRGBA(...cor('#f0a030'));
    for (const dy of [-0.06, 0.08]) {
        poligono(cr, [[-L * 0.48, dy * a], [-L * 0.66, dy * a - a * 0.06], [-L * 0.66, dy * a + a * 0.06]]);
        cr.fill();
    }
    // corpo deitado: costas pretas por cima, barriga branca por baixo
    cr.save();
    cr.scale(L / 2, A / 2);
    cr.arc(0, 0, 1, 0, VOLTA);
    cr.restore();
    cr.setSourceRGBA(0.1, 0.12, 0.16, 1);
    cr.fill();
    cr.save();
    cr.translate(L * 0.04, A * 0.12);
    cr.scale(L * 0.42, A * 0.34);
    cr.arc(0, 0, 1, 0, Math.PI);
    cr.restore();
    cr.setSourceRGBA(0.97, 0.97, 1, 1);
    cr.fill();
    // asinha para trás
    cr.moveTo(-L * 0.05, -A * 0.1);
    cr.curveTo(-L * 0.2, -A * 0.35, -L * 0.4, -A * 0.3, -L * 0.45, -A * 0.12);
    cr.closePath();
    cr.setSourceRGBA(0.2, 0.22, 0.28, 1);
    cr.fill();
    // cabeça na frente, olho e bico
    const hx = L * 0.5, hy = -A * 0.12, hr = A * 0.48;
    cr.arc(hx, hy, hr, 0, VOLTA);
    cr.setSourceRGBA(0.1, 0.12, 0.16, 1);
    cr.fill();
    cr.arc(hx + hr * 0.2, hy + hr * 0.1, hr * 0.55, 0, VOLTA);
    cr.setSourceRGBA(0.97, 0.97, 1, 1);
    cr.fill();
    cr.arc(hx + hr * 0.3, hy - hr * 0.15, hr * 0.13, 0, VOLTA);
    cr.setSourceRGBA(0.05, 0.05, 0.08, 1);
    cr.fill();
    poligono(cr, [[hx + hr * 0.8, hy - hr * 0.05], [hx + hr * 1.45, hy + hr * 0.15], [hx + hr * 0.8, hy + hr * 0.35]]);
    cr.setSourceRGBA(...cor('#f0a030'));
    cr.fill();
    // cachecol
    cr.rectangle(hx - hr * 0.95, hy + hr * 0.45, hr * 0.5, hr * 0.7);
    cr.setSourceRGBA(...cor('#e24b4a'));
    cr.fill();
    cr.restore();
}

// Boneco agasalhado: cabeça com gorro de pompom, olhos e nariz vermelho de frio, centrada em (x, y) de raio `r`.
function cabecaAgasalhada(cr, x, y, r, boca = 'aflito', olhosFechados = false) {
    cr.arc(x, y, r, 0, VOLTA);
    cr.setSourceRGBA(...cor('#f1c7a0'));
    cr.fill();
    if (olhosFechados) {
        cr.setSourceRGBA(0.12, 0.1, 0.1, 1);
        cr.setLineWidth(Math.max(1, r * 0.1));
        for (const lado of [-1, 1]) {
            cr.moveTo(x + lado * r * 0.48, y - r * 0.12);
            cr.lineTo(x + lado * r * 0.22, y - r * 0.08);
        }
        cr.stroke();
        rosto(cr, x, y, r, boca, false);
    } else {
        rosto(cr, x, y, r, boca);
    }
    cr.arc(x, y + r * 0.12, r * 0.13, 0, VOLTA); // nariz vermelho de frio
    cr.setSourceRGBA(...cor('#e0654f'));
    cr.fill();
    // gorro
    cr.moveTo(x - r * 1.02, y - r * 0.2);
    cr.curveTo(x - r * 1.05, y - r * 1.5, x + r * 1.05, y - r * 1.5, x + r * 1.02, y - r * 0.2);
    cr.closePath();
    cr.setSourceRGBA(...cor('#4a90d9'));
    cr.fill();
    retanguloArredondado(cr, x - r * 1.1, y - r * 0.42, r * 2.2, r * 0.32, r * 0.12);
    cr.setSourceRGBA(...cor('#e8eef7'));
    cr.fill();
    cr.arc(x, y - r * 1.25, r * 0.24, 0, VOLTA);
    cr.fill();
}

// Neve acumulando: flocos caem e formam um monte; o boneco agasalhado espia, treme e afunda.
export function neve(cr, w, h, q, {base, icone, flocos}) {
    const a = icone;
    const monteH = a * 0.62 * q.monte;
    const topoMonte = base - monteH;
    comAlfa(cr, q.alfa, () => {
        // cabeça atrás do monte
        if (q.cabeca > 0) {
            const r = a * 0.27;
            const y = topoMonte + r * 1.3 - q.cabeca * r * 1.9;
            cr.save();
            cr.rectangle(0, 0, w, base);
            cr.clip();
            cabecaAgasalhada(cr, w / 2 + q.treme * a * 0.03, y, r, 'aberta');
            // dentes batendo
            cr.setSourceRGBA(1, 1, 1, 1);
            cr.rectangle(w / 2 + q.treme * a * 0.03 - r * 0.15, y + r * 0.33, r * 0.3, r * 0.08);
            cr.fill();
            cr.restore();
        }
        // o monte
        if (monteH > 0.5) {
            cr.moveTo(w * 0.05, base);
            cr.curveTo(w * 0.2, base - monteH * 0.7, w * 0.3, topoMonte, w * 0.5, topoMonte);
            cr.curveTo(w * 0.7, topoMonte, w * 0.8, base - monteH * 0.7, w * 0.95, base);
            cr.closePath();
            cr.setSourceRGBA(0.96, 0.98, 1, 1);
            cr.fillPreserve();
            cr.setLineWidth(1);
            cr.setSourceRGBA(0.55, 0.65, 0.8, 0.7);
            cr.stroke();
        }
        // flocos caindo, que pousam no monte
        cr.setSourceRGBA(0.97, 0.98, 1, 0.95);
        for (const f of flocos) {
            const y = -a * 0.1 + f.y * (topoMonte + a * 0.1 + a * 0.05);
            cr.newSubPath();
            cr.arc(f.x * w, y, a * 0.055 * f.r, 0, VOLTA);
        }
        cr.fill();
    });
}

// Pendurado tremendo: agarrado na borda de cima da doca pelas mãos, balança, espirra e cai.
export function pendurado(cr, w, h, q, {base, icone}) {
    const a = icone;
    const r = a * 0.24;
    const braco = a * 0.42;
    const corpo = a * 0.5;
    const total = braco + r * 2 + corpo + a * 0.3;
    comAlfa(cr, q.alfa, () => {
        cr.save();
        // de cima para a borda (queda) e da borda para baixo (solta)
        cr.translate(w / 2 + q.treme * a * 0.02, base + q.queda * (base + total) + q.solta * (h - base + a * 0.2));
        cr.rotate(q.balanco);
        cr.setLineCap(1);
        cr.setLineJoin(1);
        // braços erguidos até a borda
        cr.setSourceRGBA(...cor('#2f6fb0'));
        cr.setLineWidth(Math.max(2, a * 0.09));
        const ombro = braco + r * 1.6;
        for (const lado of [-1, 1]) {
            cr.moveTo(lado * r * 0.9, ombro);
            cr.lineTo(lado * r * 0.75 * (1 - q.solta), 0);
        }
        cr.stroke();
        cr.setSourceRGBA(...cor('#f1c7a0'));
        for (const lado of [-1, 1]) {
            cr.arc(lado * r * 0.75 * (1 - q.solta), 0, a * 0.055, 0, VOLTA);
            cr.fill();
        }
        // casaco
        retanguloArredondado(cr, -r * 1.05, ombro - a * 0.04, r * 2.1, corpo, r * 0.5);
        cr.setSourceRGBA(...cor('#2f6fb0'));
        cr.fill();
        // pernas balançando
        cr.setSourceRGBA(0.2, 0.22, 0.3, 1);
        cr.setLineWidth(Math.max(2, a * 0.08));
        for (const lado of [-1, 1]) {
            cr.moveTo(lado * r * 0.45, ombro + corpo - a * 0.06);
            cr.lineTo(lado * r * 0.5 - q.balanco * a * 0.3, ombro + corpo + a * 0.24);
        }
        cr.stroke();
        // cabeça: para trás ao inspirar, para frente no atchim
        const cy = braco + r * 0.55;
        cr.save();
        cr.translate(0, cy);
        cr.rotate(-q.inspira * 0.35 + q.atchim * 0.3);
        cabecaAgasalhada(cr, 0, 0, r, q.atchim > 0.05 ? 'aberta' : q.inspira > 0.2 ? 'aberta' : 'aflito', q.atchim > 0.05);
        cr.restore();
        // cachecol
        cr.rectangle(-r * 0.85, cy + r * 0.85, r * 1.7, r * 0.3);
        cr.setSourceRGBA(...cor('#e24b4a'));
        cr.fill();
        // o espirro: gotinhas para a frente
        if (q.atchim > 0) {
            cr.setSourceRGBA(0.75, 0.88, 1, 1 - q.atchim * 0.6);
            for (let i = 0; i < 6; i++) {
                const ang = -0.4 + i * 0.16;
                const dist = r * (1 + q.atchim * 2.2) * (0.8 + (i % 3) * 0.15);
                cr.newSubPath();
                cr.arc(Math.cos(ang) * dist, cy + r * 0.4 + Math.sin(ang) * dist, a * 0.025, 0, VOLTA);
            }
            cr.fill();
        }
        cr.restore();
        // risquinhos de frio em volta, enquanto treme
        if (Math.abs(q.treme) > 0.3 && q.solta < 0.1) {
            cr.setSourceRGBA(0.75, 0.88, 1, 0.8);
            cr.setLineWidth(1.2);
            for (const lado of [-1, 1]) {
                const x = w / 2 + lado * r * 1.6;
                cr.moveTo(x, base + braco + r * 1.6);
                cr.lineTo(x + lado * a * 0.06, base + braco + r * 1.6 + a * 0.05);
            }
            cr.stroke();
        }
    });
}

// Leva um mascote desenhado em (0, 0, w, h) (fantasma, esqueleto, noel, boneco, chama) para passear pela doca. `q` vem de
// quadroPasseio (logica.js); `fig` é o tamanho da figura em múltiplos do ícone ([largura, altura]); `desenhar` é o desenho
// do mascote e `quadroFig` converte o estado do passeio no estado que esse desenho espera.
export function passear(cr, w, h, q, ctx, fig, desenhar, quadroFig) {
    const {base, icone} = ctx;
    const fw = Math.round(icone * fig[0]);
    const fh = Math.round(icone * fig[1]);
    cr.save();
    cr.translate(q.x * w, base - q.dy * fh); // pés da figura, no ponto do passeio
    cr.rotate(q.rot);
    cr.scale(q.sx, q.sy);
    cr.translate(-fw / 2, -fh);
    desenhar(cr, fw, fh, quadroFig(q), ctx);
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

// ----- Mascotes novos: coruja, pilha, satélite e tomate -----
// Todos no retângulo (0, 0, w, h), de pé na borda de baixo, com `q.sobe` (0 a 1) subindo de trás dela, como os outros.

// Coruja marrom. `q` vem de quadroCoruja: {sobe, sono, olhos, cabeca}. Dormindo, os olhos viram traços e sobem "z".
export function coruja(cr, w, h, q) {
    const gw = Math.min(w * 0.7, h * 0.75);
    const pe = h + (1 - q.sobe) * h;
    const marrom = [0.55, 0.38, 0.22, 1], claro = [0.86, 0.72, 0.5, 1], contorno = [0.2, 0.12, 0.06, 1];
    cr.save();
    cr.translate(w / 2, pe);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    cr.rotate(q.cabeca * 0.08);
    // corpo
    cr.save();
    cr.translate(0, -gw * 0.42);
    cr.scale(1, 1.15);
    cr.arc(0, 0, gw * 0.4, 0, VOLTA);
    cr.restore();
    cr.setSourceRGBA(...marrom);
    cr.fillPreserve();
    cr.setLineWidth(1.5);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    // barriga com penas
    cr.save();
    cr.translate(0, -gw * 0.32);
    cr.scale(1, 1.15);
    cr.arc(0, 0, gw * 0.24, 0, VOLTA);
    cr.restore();
    cr.setSourceRGBA(...claro);
    cr.fill();
    cr.setSourceRGBA(...marrom);
    cr.setLineWidth(1);
    for (let i = 0; i < 6; i++) {
        const x = ((i % 3) - 1) * gw * 0.12, y = -gw * (0.45 - 0.1 * Math.floor(i / 3) - (i % 2) * 0.05);
        cr.arc(x, y, gw * 0.05, 0, Math.PI);
        cr.stroke();
    }
    // asas
    for (const lado of [-1, 1]) {
        cr.save();
        cr.translate(lado * gw * 0.36, -gw * 0.45);
        cr.rotate(lado * (0.15 + q.sono * 0.1));
        cr.scale(0.55, 1.3);
        cr.arc(0, 0, gw * 0.16, 0, VOLTA);
        cr.restore();
        cr.setSourceRGBA(0.45, 0.3, 0.16, 1);
        cr.fillPreserve();
        cr.setLineWidth(1.2);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
    }
    // pés
    cr.setSourceRGBA(0.95, 0.65, 0.2, 1);
    for (const lado of [-1, 1]) {
        cr.arc(lado * gw * 0.14, -gw * 0.02, gw * 0.07, Math.PI, 0);
        cr.fill();
    }
    // cabeça: tufos, olhões, bico
    cr.save();
    cr.translate(q.cabeca * gw * 0.04, -gw * 0.85);
    for (const lado of [-1, 1]) {
        cr.moveTo(lado * gw * 0.3, gw * 0.02);
        cr.lineTo(lado * gw * 0.28, -gw * 0.3);
        cr.lineTo(lado * gw * 0.08, -gw * 0.12);
        cr.closePath();
        cr.setSourceRGBA(...marrom);
        cr.fillPreserve();
        cr.setLineWidth(1.3);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
    }
    const o = olhar(q);
    for (const lado of [-1, 1]) {
        cr.save();
        cr.translate(lado * gw * 0.18, 0);
        cr.arc(0, 0, gw * 0.17, 0, VOLTA);
        cr.setSourceRGBA(...claro);
        cr.fillPreserve();
        cr.setLineWidth(1.2);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
        if (q.olhos > 0.1) {
            cr.save();
            cr.scale(1, q.olhos);
            cr.arc(o.x * gw * 0.04, o.y * gw * 0.03, gw * 0.085, 0, VOLTA);
            cr.setSourceRGBA(0.98, 0.8, 0.15, 1);
            cr.fill();
            cr.arc(o.x * gw * 0.05, o.y * gw * 0.04, gw * 0.045, 0, VOLTA);
            cr.setSourceRGBA(0.05, 0.05, 0.05, 1);
            cr.fill();
            cr.restore();
        } else { // dormindo: pálpebra
            cr.setLineWidth(1.6);
            cr.setSourceRGBA(...contorno);
            cr.arc(0, -gw * 0.04, gw * 0.09, 0.15 * Math.PI, 0.85 * Math.PI);
            cr.stroke();
        }
        cr.restore();
    }
    cr.moveTo(-gw * 0.06, gw * 0.1);
    cr.lineTo(gw * 0.06, gw * 0.1);
    cr.lineTo(0, gw * 0.22);
    cr.closePath();
    cr.setSourceRGBA(0.95, 0.65, 0.2, 1);
    cr.fillPreserve();
    cr.setLineWidth(1);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    cr.restore();
    // "z" subindo enquanto dorme
    if (q.sono > 0.3) {
        cr.setSourceRGBA(0.75, 0.85, 1, q.sono * 0.9);
        cr.selectFontFace('sans-serif', 0, 1);
        for (let i = 0; i < 2; i++) {
            cr.setFontSize(gw * (0.16 + 0.08 * i));
            cr.moveTo(gw * (0.38 + 0.12 * i), -gw * (1.0 + 0.2 * i));
            cr.showText('z');
        }
    }
    cr.restore();
}

// Pilha cansada pedindo tomada. `q` vem de quadroPilha: {sobe, nivel, cansaco, suspiro}.
export function pilha(cr, w, h, q) {
    const pw = Math.min(w * 0.55, h * 0.5), ph = pw * 1.55;
    const pe = h + (1 - q.sobe) * h;
    const vermelho = [0.9, 0.25, 0.2, 1], contorno = [0.2, 0.2, 0.25, 1];
    cr.save();
    cr.translate(w / 2, pe);
    cr.rotate(q.cansaco * 0.08);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    // polo
    cr.rectangle(-pw * 0.2, -ph - pw * 0.12, pw * 0.4, pw * 0.14);
    cr.setSourceRGBA(0.7, 0.72, 0.78, 1);
    cr.fill();
    // corpo
    const r = pw * 0.18;
    cr.newPath();
    cr.arc(-pw / 2 + r, -ph + r, r, Math.PI, 1.5 * Math.PI);
    cr.arc(pw / 2 - r, -ph + r, r, 1.5 * Math.PI, 0);
    cr.arc(pw / 2 - r, -r, r, 0, 0.5 * Math.PI);
    cr.arc(-pw / 2 + r, -r, r, 0.5 * Math.PI, Math.PI);
    cr.closePath();
    cr.setSourceRGBA(0.93, 0.94, 0.97, 1);
    cr.fillPreserve();
    cr.setLineWidth(2);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    // carga: um fiapo vermelho no fundo
    const cargaH = (ph - pw * 0.2) * q.nivel;
    cr.rectangle(-pw * 0.38, -pw * 0.1 - cargaH, pw * 0.76, cargaH);
    cr.setSourceRGBA(...vermelho);
    cr.fill();
    // rosto cansado: olhos meio fechados com olheiras, boca torta
    const o = olhar(q);
    const ey = -ph * 0.68;
    for (const lado of [-1, 1]) {
        cr.arc(lado * pw * 0.2, ey, pw * 0.1, 0, VOLTA);
        cr.setSourceRGBA(1, 1, 1, 1);
        cr.fillPreserve();
        cr.setLineWidth(1.2);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
        cr.arc(lado * pw * 0.2 + o.x * pw * 0.03, ey + pw * 0.025 + o.y * pw * 0.02, pw * 0.045, 0, VOLTA);
        cr.fill();
        // pálpebra pesada
        cr.rectangle(lado * pw * 0.2 - pw * 0.11, ey - pw * 0.11, pw * 0.22, pw * (0.11 + 0.05 * q.suspiro));
        cr.setSourceRGBA(0.93, 0.94, 0.97, 1);
        cr.fillPreserve();
        cr.setSourceRGBA(...contorno);
        cr.setLineWidth(1.4);
        cr.moveTo(lado * pw * 0.2 - pw * 0.11, ey + pw * 0.05 * q.suspiro);
        cr.lineTo(lado * pw * 0.2 + pw * 0.11, ey + pw * 0.05 * q.suspiro);
        cr.stroke();
        cr.newPath();
    }
    cr.setLineWidth(1.6);
    cr.moveTo(-pw * 0.14, ey + pw * 0.3);
    cr.curveTo(-pw * 0.05, ey + pw * 0.24, pw * 0.05, ey + pw * 0.34, pw * 0.14, ey + pw * 0.28);
    cr.stroke();
    // gota de suor
    cr.arc(pw * 0.38, ey - pw * 0.05 + q.suspiro * pw * 0.05, pw * 0.05, 0, VOLTA);
    cr.setSourceRGBA(0.5, 0.75, 1, 0.9);
    cr.fill();
    cr.restore();
}

// Satélite perdido procurando sinal. `q` vem de quadroSatelite: {sobe, giro, sinal, perdido}.
export function satelite(cr, w, h, q) {
    const s = Math.min(w * 0.45, h * 0.4);
    const corpoY = h - s * 0.9 * q.sobe + (1 - q.sobe) * s;
    cr.save();
    cr.translate(w / 2, corpoY);
    cr.rotate(q.giro * 0.4);
    cr.setLineJoin(1);
    cr.setLineCap(1);
    const contorno = [0.15, 0.2, 0.35, 1];
    // painéis solares
    for (const lado of [-1, 1]) {
        cr.rectangle(lado > 0 ? s * 0.38 : -s * 0.98, -s * 0.2, s * 0.6, s * 0.4);
        cr.setSourceRGBA(0.2, 0.4, 0.8, 1);
        cr.fillPreserve();
        cr.setLineWidth(1.4);
        cr.setSourceRGBA(...contorno);
        cr.stroke();
        cr.setLineWidth(0.8);
        for (let i = 1; i < 3; i++) {
            const x = (lado > 0 ? s * 0.38 : -s * 0.98) + s * 0.2 * i;
            cr.moveTo(x, -s * 0.2);
            cr.lineTo(x, s * 0.2);
            cr.stroke();
        }
    }
    // corpo
    cr.rectangle(-s * 0.38, -s * 0.3, s * 0.76, s * 0.6);
    cr.setSourceRGBA(0.85, 0.87, 0.92, 1);
    cr.fillPreserve();
    cr.setLineWidth(1.8);
    cr.setSourceRGBA(...contorno);
    cr.stroke();
    // carinha confusa
    const o = olhar(q);
    for (const lado of [-1, 1]) {
        cr.arc(lado * s * 0.16 + o.x * s * 0.03, -s * 0.05 + o.y * s * 0.03, s * 0.07, 0, VOLTA);
        cr.setSourceRGBA(...contorno);
        cr.fill();
    }
    cr.setLineWidth(1.4);
    cr.moveTo(-s * 0.12, s * 0.15);
    cr.curveTo(-s * 0.04, s * 0.1, s * 0.04, s * 0.2, s * 0.12, s * 0.14);
    cr.stroke();
    // antena parabólica no topo, girando
    cr.moveTo(0, -s * 0.3);
    cr.lineTo(0, -s * 0.5);
    cr.stroke();
    cr.arc(0, -s * 0.55, s * 0.17, Math.PI, 0);
    cr.closePath();
    cr.setSourceRGBA(0.95, 0.95, 1, 1);
    cr.fillPreserve();
    cr.stroke();
    // arcos de sinal que pulsam e esmaecem, e um "?" no fim
    cr.setLineWidth(2);
    for (let i = 0; i < 3; i++) {
        const f = (q.sinal + i / 3) % 1;
        cr.arc(0, -s * 0.6, s * (0.3 + 0.6 * f), -Math.PI * 0.8, -Math.PI * 0.2);
        cr.setSourceRGBA(1, 0.55, 0.3, (1 - f) * 0.8 * q.perdido);
        cr.stroke();
    }
    cr.setSourceRGBA(1, 0.55, 0.3, 0.95 * q.perdido);
    cr.selectFontFace('sans-serif', 0, 1);
    cr.setFontSize(s * 0.5);
    cr.moveTo(s * 0.6, -s * 0.7);
    cr.showText('?');
    cr.restore();
}

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

// Quadro de uma folha de sprites (PNG em tira horizontal): `ctx.imagem` é a ImageSurface e `ctx.spec` vem de SPRITES
// (logica.js). Desenha o quadro `q.quadro` com os pés em (q.x, ctx.base), na escala dada por `q.escala` e virado
// para a esquerda quando `q.dir` é -1 (a arte olha para a direita).
export function sprite(cr, w, h, q, ctx) {
    const s = ctx.spec;
    cr.save();
    cr.translate(q.x, ctx.base + q.pe);
    cr.scale(q.dir * q.escala, q.escala);
    cr.translate(-s.fw / 2, -s.chao);
    cr.rectangle(0, 0, s.fw, s.fh);
    cr.clip();
    cr.setSourceSurface(ctx.imagem, -q.quadro * s.fw, 0);
    try {
        cr.getSource().setFilter(2); // CAIRO_FILTER_BEST: reduz a arte sem serrilhar
    } catch (_e) { /* sem filtro, fica o padrão */ }
    cr.paint();
    cr.restore();
}
