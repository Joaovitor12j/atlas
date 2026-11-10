// Primitivas de desenho Cairo usadas por mais de uma funcionalidade (anéis, barras, gráficos, relógio de ponteiros).
// Sem dependência do Shell: roda no dock, no app de configuração e nas prévias PNG.

import {limitar, TOPO, VOLTA} from './matematica.js';

// "#e0654f" -> [r, g, b, alfa] com canais de 0 a 1.
export function cor(hex, alfa = 1) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alfa];
}

export const FUNDO_TRILHA = [0.5, 0.5, 0.5, 0.28];

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

export function retanguloArredondado(cr, x, y, w, h, r) {
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

export function poligono(cr, pontos) {
    cr.moveTo(...pontos[0]);
    for (const p of pontos.slice(1))
        cr.lineTo(...p);
    cr.closePath();
}

// Contorno de porta em arco: retângulo (x, y, w, h) com o topo em meia-volta.
export function arco(cr, x, y, w, h) {
    const r = w / 2;
    cr.newSubPath();
    cr.moveTo(x, y + h);
    cr.lineTo(x, y + r);
    cr.arc(x + r, y + r, r, Math.PI, VOLTA);
    cr.lineTo(x + w, y + h);
    cr.closePath();
}
