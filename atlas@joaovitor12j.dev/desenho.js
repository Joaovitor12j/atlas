// Desenho dos widgets com Cairo. Só recebe o contexto `cr`, sem St nem Clutter, para poder ser
// visto fora do Shell (ver tests/previa-desenho.js) e para o parser de cor ser testado com node.

const VOLTA = Math.PI * 2;
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
        cr.translate(lado * gw * 0.17, r * 0.95);
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
        cr.arc(lado * gw * 0.15, ya + gw * 0.015, gw * 0.035, 0, Math.PI * 2);
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
        cr.arc(lado * a * 0.32, ya - a * 0.22, a * 0.07, 0, Math.PI * 2);
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
        cr.arc(lado * r1 * 0.38, y1 - r1 * 0.22, a * 0.09, 0, Math.PI * 2);
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
