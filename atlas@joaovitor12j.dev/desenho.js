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
