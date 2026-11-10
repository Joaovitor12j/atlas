// Material da doca dos temas de pacote (Pixel, Materiais, Natal), portado dos protótipos em
// docs/design/pacotes-de-temas/*/index.html. Só Cairo: usado pelo dock (Shell) e pela prévia do app (GTK).
//
// Referencial comum (o mesmo de app/previa.js): o vidro vai de x a x + w e de y = -esp a y = 0, com a borda da
// tela em y = 0 e "para fora" em -y. O que passa do vidro (grama, telhados, neve, laço) fica em y < -esp.

import Cairo from 'gi://cairo';
import {VOLTA} from './nucleo/matematica.js';
import {geometriaTema, TEMAS_PIXEL} from './temas/logica.js';

// '#rrggbb' ou 'rgba(r, g, b, a)' -> [r, g, b, a] de 0 a 1.
function rgba(css, alfa = 1) {
    if (css.startsWith('#')) {
        const n = parseInt(css.slice(1), 16);
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alfa];
    }
    const [r, g, b, a = 1] = css.slice(css.indexOf('(') + 1, -1).split(',').map(Number);
    return [r / 255, g / 255, b / 255, a * alfa];
}

const fonte = (cr, css, alfa = 1) => cr.setSourceRGBA(...rgba(css, alfa));

function retangulo(cr, x, y, w, h, r) {
    const raio = Math.max(0, Math.min(r, h / 2, w / 2));
    cr.newSubPath();
    cr.arc(x + w - raio, y + raio, raio, -Math.PI / 2, 0);
    cr.arc(x + w - raio, y + h - raio, raio, 0, Math.PI / 2);
    cr.arc(x + raio, y + h - raio, raio, Math.PI / 2, Math.PI);
    cr.arc(x + raio, y + raio, raio, Math.PI, Math.PI * 1.5);
    cr.closePath();
}

// Gradiente linear com paradas [[pos, css, alfa?], ...].
function linear(x0, y0, x1, y1, paradas) {
    const g = new Cairo.LinearGradient(x0, y0, x1, y1);
    for (const [pos, css, a = 1] of paradas)
        g.addColorStopRGBA(pos, ...rgba(css, a));
    return g;
}

function radial(cx, cy, r, paradas) {
    const g = new Cairo.RadialGradient(cx, cy, 0, cx, cy, r);
    for (const [pos, css, a = 1] of paradas)
        g.addColorStopRGBA(pos, ...rgba(css, a));
    return g;
}

// Ângulo de gradiente do CSS (0deg = para cima, 90deg = para a direita) numa caixa w x h.
function linearCss(w, h, graus, paradas) {
    const a = graus * Math.PI / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const meio = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    return linear(w / 2 - dx * meio, h / 2 - dy * meio, w / 2 + dx * meio, h / 2 + dy * meio, paradas);
}

// Mesmo gerador dos protótipos: o padrão (veios, pedras, estrelas) sai igual em toda abertura.
const rng = semente => () => {
    let s = semente;
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    semente = s;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
};

// Aresta de vidro: linha de 1 px na cor da borda e um realce claro em cima (o "inset 0 1px 0" do CSS).
function aresta(cr, w, h, r, borda, realceTopo = 0, realceBase = 0) {
    if (realceTopo || realceBase) {
        retangulo(cr, 1, 1, w - 2, h - 2, r - 1);
        cr.setSource(linear(0, 0, 0, h, [[0, '#ffffff', realceTopo], [0.12, '#ffffff', 0], [0.88, '#ffffff', 0], [1, '#ffffff', realceBase]]));
        cr.setLineWidth(1);
        cr.stroke();
    }
    if (borda) {
        retangulo(cr, 0.5, 0.5, w - 1, h - 1, r - 0.5);
        fonte(cr, borda);
        cr.setLineWidth(1);
        cr.stroke();
    }
}

// =============================== Pixel ===============================

// Altura da arte da doca pixel e quantas linhas ela pode passar do vidro (grama, telhados, neve).
const ALTURA = 36;
const SOBRA = 12;

// Grade de cores da arte; vira uma lista de retângulos por cor (corridas na mesma linha juntas),
// o que deixa a pintura barata o bastante para repetir a cada quadro da lente.
function novaGrade(W) {
    const linhas = Array.from({length: ALTURA + SOBRA}, () => new Array(W).fill(null));
    return {
        W,
        set(x, y, c) {
            if (x >= 0 && x < W && y >= -SOBRA && y < ALTURA)
                linhas[y + SOBRA][x] = c;
        },
        compilar() {
            const porCor = new Map();
            linhas.forEach((l, j) => {
                for (let x = 0; x < W;) {
                    const c = l[x];
                    if (!c) {
                        x++;
                        continue;
                    }
                    let e = x + 1;
                    while (e < W && l[e] === c)
                        e++;
                    if (!porCor.has(c))
                        porCor.set(c, []);
                    porCor.get(c).push(x, j - SOBRA, e - x);
                    x = e;
                }
            });
            return [...porCor].map(([c, r]) => [rgba(c), r]);
        },
    };
}

// Cantos cortados em 2 px, como o inDock() dos protótipos.
function naDoca(x, y, W) {
    if (x < 0 || y < 0 || x >= W || y >= ALTURA)
        return false;
    return Math.min(x, W - 1 - x) + Math.min(y, ALTURA - 1 - y) >= 2;
}

// Largura útil de cada linha (exclusiva) para a doca de largura W: corta os cantos da direita.
function limite(y, W) {
    if (y < 0)
        return W - 2;
    const cy = Math.min(y, ALTURA - 1 - y);
    return cy === 0 ? W - 2 : cy === 1 ? W - 1 : W;
}

function px(cr, p, x, y, w = 1, h = 1) {
    const x0 = Math.round(x * p), y0 = Math.round(y * p);
    cr.rectangle(x0, y0, Math.round((x + w) * p) - x0, Math.round((y + h) * p) - y0);
}

// Pinta a grade compilada até a largura W (em pixels da arte).
function pintarGrade(cr, comp, p, W) {
    for (const [c, r] of comp) {
        cr.setSourceRGBA(...c);
        for (let i = 0; i < r.length; i += 3) {
            const x = r[i], y = r[i + 1];
            const L = limite(y, W);
            if (x >= L)
                continue;
            px(cr, p, x, y, Math.min(r[i + 2], L - x));
        }
        cr.fill();
    }
}

function pontos(cr, p, lista, css) {
    fonte(cr, css);
    for (const [x, y, w = 1, h = 1] of lista)
        px(cr, p, x, y, w, h);
    cr.fill();
}

// Cada tema pixel: `grade(g, W)` desenha a parte que só depende da posição a partir da esquerda (cacheada) e
// `ponta(cr, p, W)` o que depende da largura atual (borda da direita, lua). `tile`/`borda` do tile de app.
const PIXEL = {
    vila: {
        tile: '#f3e2b3', tileB: '#6b4220', sep: '#6b4220',
        grade(g, W) {
            const r = rng(7);
            for (let y = 0; y < ALTURA; y++) {
                for (let x = 0; x < W; x++) {
                    if (!naDoca(x, y, Infinity))
                        continue;
                    let c = '#b8824a';
                    if (y % 9 === 8)
                        c = '#9a6a38';
                    if ((x + Math.floor(y / 9) * 17) % 33 === 0)
                        c = '#8a5a2d';
                    if (r() < 0.05)
                        c = '#c99660';
                    if (y < 3)
                        c = '#5f9e45';
                    else if (y === 3)
                        c = r() < 0.5 ? '#5f9e45' : c;
                    if ((y >= ALTURA - 2 || x === 0) && y >= 3)
                        c = '#6b4220';
                    g.set(x, y, c);
                }
            }
            const r2 = rng(21);
            for (let x = 2; x < W; x++) {
                g.set(x, 0, r2() < 0.4 ? '#86c261' : '#5f9e45');
                if (r2() < 0.16) {
                    g.set(x, 3, '#4a8636');
                    g.set(x, 4, '#4a8636');
                }
                if (r2() < 0.1)
                    g.set(x, -1, '#86c261');
            }
            const flores = ['#ff8fb0', '#ffe066', '#ffffff', '#ff8fb0'];
            for (let i = 0, x = 34; x < W - 4; i++, x += 46) {
                g.set(x, -2, '#4a8636');
                g.set(x, -1, '#4a8636');
                for (const [a, b] of [[-1, -3], [1, -3], [0, -4], [0, -2]])
                    g.set(x + a, b, flores[i % 4]);
                g.set(x, -3, '#ffd23f');
            }
            g.set(4, ALTURA - 6, '#3a2512');
            g.set(4, ALTURA - 7, '#d8b27a');
        },
        ponta(cr, p, W) {
            pontos(cr, p, [[W - 1, 3, 1, ALTURA - 5]], '#6b4220');
            pontos(cr, p, [[W - 5, ALTURA - 6]], '#3a2512');
            pontos(cr, p, [[W - 5, ALTURA - 7]], '#d8b27a');
        },
    },
    floresta: {
        tile: '#3d5e48', tileB: '#7aa06a', sep: '#1b2b23',
        grade(g, W) {
            const r = rng(33);
            for (let y = 0; y < ALTURA; y++) {
                for (let x = 0; x < W; x++) {
                    if (!naDoca(x, y, Infinity))
                        continue;
                    const off = (Math.floor(y / 6) % 2) * 9;
                    let c = (x + off) % 18 < 17 ? (r() < 0.5 ? '#355443' : '#3a5b49') : '#213629';
                    if (y % 6 === 5)
                        c = '#213629';
                    if (y < 3)
                        c = r() < 0.7 ? '#5f9a4e' : '#4f8a45';
                    if (y >= ALTURA - 2)
                        c = '#1b2b23';
                    // névoa clara de baixo (rgba(255,255,255,.07) por cima da pedra, pontilhada)
                    if (y >= ALTURA - 8 && y < ALTURA - 2 && (x + y) % 2 === 0)
                        c = {'#355443': '#436050', '#3a5b49': '#476655', '#213629': '#2d4538'}[c] ?? c;
                    g.set(x, y, c);
                }
            }
            const r2 = rng(5);
            for (let x = 2; x < W; x++) {
                if (r2() < 0.1) {
                    const L = 2 + Math.floor(r2() * 6);
                    for (let k = 0; k < L; k++)
                        g.set(x, 3 + k, k === L - 1 ? '#7cc25a' : '#4f8a45');
                }
                if (r2() < 0.15)
                    g.set(x, -1, '#7cc25a');
            }
        },
        ponta(cr, p, W) {
            pontos(cr, p, [[W - 1, 3, 1, ALTURA - 5]], '#213629');
        },
    },
    lua: {
        tile: '#1f2655', tileB: '#6b72c4', sep: '#4a53a8',
        grade(g, W) {
            const faixas = ['#141a3a', '#1a2147', '#212957', '#2d3475'];
            for (let y = 0; y < ALTURA; y++) {
                for (let x = 0; x < W; x++) {
                    if (!naDoca(x, y, Infinity))
                        continue;
                    const f = y / ALTURA * 3, i = Math.min(2, Math.floor(f)), mix = f - i;
                    const c = (mix > 0.5 && (x + y) % 2 === 0) || mix > 0.8 ? faixas[i + 1] : faixas[i];
                    g.set(x, y, x === 0 || y === ALTURA - 1 ? '#4a53a8' : c);
                }
            }
            const r = rng(9);
            const n = Math.round(W * 22 / 198);
            for (let i = 0; i < n; i++) {
                const x = 3 + Math.floor(r() * (W - 6)), y = 4 + Math.floor(r() * (ALTURA - 8));
                const acesa = Math.sin(i * 2) > 0.2;
                g.set(x, y, acesa ? '#ffffff' : '#8d93d4');
                if (acesa && i % 5 === 0)
                    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
                        g.set(x + a, y + b, '#ffffff');
            }
            const alturas = [6, 8, 5, 7, 6, 8];
            for (let i = 0, x = 8; x < W - 10; i++, x += 30) {
                const h = alturas[i % alturas.length];
                for (let yy = -h + 2; yy < 2; yy++)
                    for (let k = 0; k < 9; k++)
                        g.set(x + k, yy, '#0e1230');
                for (let k = 1; k < 4; k++)
                    for (let q = 0; q < 9 - 2 * k; q++)
                        g.set(x + k + q, -h + 3 - k, '#0e1230');
                if (i % 2 === 0 || Math.sin(i) > -0.3)
                    for (const [a, b] of [[3, 0], [4, 0], [3, 1], [4, 1]])
                        g.set(x + a, -h + 4 + b, '#ffd36b');
            }
            for (let x = 0; x < W; x++)
                for (let y = 0; y < 3; y++)
                    if (naDoca(x, 1, Infinity))
                        g.set(x, y, '#0e1230');
        },
        ponta(cr, p, W) {
            pontos(cr, p, [[W - 1, 3, 1, ALTURA - 5]], '#4a53a8');
            // lua crescente perto da ponta direita
            const lua = [];
            for (let y = -5; y <= 5; y++)
                for (let x = -5; x <= 5; x++)
                    if (x * x + y * y <= 25 && (x - 2) * (x - 2) + (y - 1) * (y - 1) > 20)
                        lua.push([W - 26 + x, 11 + y]);
            pontos(cr, p, lua, '#ffe9a8');
        },
    },
    praia: {
        tile: '#e6f6fa', tileB: '#4fb8d6', sep: '#c9a45f',
        grade(g, W) {
            const r = rng(3);
            for (let y = 0; y < ALTURA; y++) {
                for (let x = 0; x < W; x++) {
                    if (!naDoca(x, y, Infinity))
                        continue;
                    const borda = 5 + Math.round(1.6 * Math.sin(x * 0.22));
                    let c;
                    if (y < borda - 1)
                        c = y < 2 ? '#4fb8d6' : '#6fcbe4';
                    else if (y === borda - 1 || y === borda)
                        c = '#ffffff';
                    else if (y === borda + 1)
                        c = '#c9eef6';
                    else {
                        c = '#efd7a0';
                        const q = r();
                        if (q < 0.06)
                            c = '#e0c183';
                        else if (q < 0.1)
                            c = '#fbe9bf';
                    }
                    if (y >= ALTURA - 2)
                        c = '#c9a45f';
                    g.set(x, y, c);
                }
            }
            for (let x = 66; x < W - 6; x += 92) {
                for (const [a, b] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]])
                    g.set(x + a, ALTURA - 5 + b, '#f6a6b8');
                g.set(x + 1, ALTURA - 5, '#ffffff');
            }
        },
        ponta() {},
    },
    nevepixel: {
        tile: '#1c3a73', tileB: '#8fb4e8', sep: '#8fb4e8',
        grade(g, W) {
            const r = rng(11);
            for (let y = 0; y < ALTURA; y++) {
                for (let x = 0; x < W; x++) {
                    if (!naDoca(x, y, Infinity))
                        continue;
                    const f = y / ALTURA;
                    const c = f < 0.35 ? '#10234a' : f < 0.7 ? '#15305f' : '#1c3a73';
                    g.set(x, y, x === 0 || y === ALTURA - 1 ? '#8fb4e8' : f > 0.3 && f < 0.42 && (x + y) % 2 === 0 ? '#15305f' : c);
                }
            }
            const n = Math.round(W * 14 / 198);
            for (let i = 0; i < n; i++) {
                const x = 4 + Math.floor(r() * (W - 8)), y = 10 + Math.floor(r() * (ALTURA - 14));
                g.set(x, y, Math.sin(i * 2) > 0.3 ? '#ffffff' : '#7f9bcf');
            }
            // neve acumulada em cima e sincelos
            const r2 = rng(4);
            for (let x = 0; x < W; x++) {
                const h = 2 + Math.round(1.1 * (Math.sin(x * 0.35) + Math.sin(x * 0.11 + 1) + 2) / 2 * 1.4);
                for (let k = 0; k < h; k++) {
                    if (k === 0 && x < 2)
                        continue;
                    g.set(x, -1 + k, k === h - 1 ? '#cfe0f7' : '#f4f8ff');
                }
                if (r2() < 0.1) {
                    const L = 2 + Math.floor(r2() * 3);
                    for (let k = 0; k < L; k++)
                        g.set(x, -1 + h + k, k === L - 1 ? '#a9c4ea' : '#e4efff');
                }
            }
            // fio das luzinhas (as luzes em si piscam no efeito de época)
            for (let x = 4; x < W - 4; x++)
                g.set(x, 4 + fioPixel(x), '#0a1530');
            for (let i = 0, x = 9; x < W - 6; i++, x += 11)
                for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]])
                    g.set(x + a, 5 + fioPixel(x) + b, CORES_LUZ[i % 4]);
        },
        ponta(cr, p, W) {
            pontos(cr, p, [[W - 1, 6, 1, ALTURA - 8]], '#8fb4e8');
        },
    },
};

// Barriga do fio de luzinhas (nevepixel): desce até 2 px entre os pontos de apoio, a cada 66 px.
const fioPixel = x => Math.round(2.2 * Math.abs(Math.sin(Math.PI * (x - 4) / 66)));

const cacheGrade = new Map();
function gradeDe(id, W) {
    // largura arredondada para cima: a lente muda a largura a cada quadro, mas a grade só muda de faixa em faixa
    const Wc = Math.ceil((W + 8) / 128) * 128;
    const chave = `${id}:${Wc}`;
    let comp = cacheGrade.get(chave);
    if (!comp) {
        const g = novaGrade(Wc);
        PIXEL[id].grade(g, Wc);
        comp = g.compilar();
        if (cacheGrade.size > 12)
            cacheGrade.delete(cacheGrade.keys().next().value);
        cacheGrade.set(chave, comp);
    }
    return comp;
}

function docaPixel(cr, id, w, esp, p) {
    const W = Math.max(8, Math.round(w / p));
    cr.save();
    cr.scale(w / (W * p), esp / (ALTURA * p)); // a arte cobre o vidro inteiro mesmo com arredondamento
    pintarGrade(cr, gradeDe(id, W), p, W);
    PIXEL[id].ponta(cr, p, W);
    cr.restore();
}

// =============================== Materiais ===============================

// Cada tema desenha no vidro (0, 0)-(w, h), com k = escala do protótipo (tile de 58 px) e r = raio do vidro.
const MATERIAL = {
    aurora(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        // o vidro mostra a cena de trás (roxo para rosa), já borrada; cores amostradas do protótipo
        cr.setSource(linear(0, 0, w, 0, [[0, '#5247b1'], [0.1, '#5b58b7'], [0.3, '#7d55c8'], [0.49, '#b055d5'],
            [0.58, '#cf5bc6'], [0.65, '#e461bf'], [0.8, '#ff70c1'], [1, '#ff8a9e']]));
        cr.paint();
        // manchas de aurora: ciano à esquerda em cima, magenta à direita embaixo
        cr.setSource(radial(0.08 * w + 130 * k, 10 * k, 170 * k, [[0, '#7be4ff', 0.32], [1, '#7be4ff', 0]]));
        cr.paint();
        cr.setSource(radial(w - 0.06 * w - 130 * k, h + 5 * k, 170 * k, [[0, '#ff7ad9', 0.3], [1, '#ff7ad9', 0]]));
        cr.paint();
        cr.setSource(linear(0, 0, 0, h, [[0, '#ffffff', 0.1], [1, '#ffffff', 0]]));
        cr.paint();
        cr.restore();
        aresta(cr, w, h, r, 'rgba(255, 255, 255, 0.42)', 0.75, 0.14);
    },
    carta(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        fonte(cr, '#f1e7cf');
        cr.paint();
        // papel envelhecido nas bordas (inset 0 0 40px)
        const borda = 40 * k;
        for (const [x0, y0, x1, y1] of [[0, 0, 0, borda], [0, h, 0, h - borda], [0, 0, borda, 0], [w, 0, w - borda, 0]]) {
            cr.setSource(linear(x0, y0, x1, y1, [[0, '#966e32', 0.12], [1, '#966e32', 0]]));
            cr.paint();
        }
        // rosa dos ventos em marca d'água, à direita, antes dos widgets
        rosaDosVentos(cr, w - 210 * k - 75 * k, h / 2, 75 * k);
        // régua: marcas de 1 px a cada 12 px, em faixas de 6 px em cima e embaixo
        fonte(cr, '#27261f');
        for (let x = 0; x < w; x += 12 * k) {
            cr.rectangle(Math.round(x), 6 * k, 1, 6 * k);
            cr.rectangle(Math.round(x), h - 12 * k, 1, 6 * k);
        }
        cr.fill();
        // moldura dupla: papel de 4 px e linha de tinta de 1 px
        retangulo(cr, 4.5 * k, 4.5 * k, w - 9 * k, h - 9 * k, Math.max(0, r - 4 * k));
        cr.setLineWidth(Math.max(1, k));
        cr.stroke();
        cr.restore();
    },
    jardim(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        cr.setSource(linear(0, 0, 0, h, [[0, '#ffd2a6'], [0.15, '#ffcea3'], [0.5, '#ffbb96'], [1, '#fb9b83']]));
        cr.paint();
        // sol no canto de cima, à direita
        cr.setSource(radial(w + 90 * k, 20 * k, 150 * k, [[0, '#ffecaa', 0.9], [1, '#ffc878', 0]]));
        cr.paint();
        // copa de folhas no topo (o recorte de 46 x 22 do protótipo, repetido)
        fonte(cr, '#355f3b');
        const s = k;
        for (let x0 = 0; x0 < w; x0 += 46 * s) {
            cr.save();
            cr.translate(x0, -1 * s);
            cr.scale(s, s);
            cr.moveTo(0, 0);
            cr.lineTo(46, 0);
            cr.lineTo(46, 4);
            cr.curveTo(40, 4, 40, 14, 35, 20);
            cr.curveTo(30, 12, 28, 4, 22, 4);
            cr.curveTo(17, 4, 15, 10, 11, 17);
            cr.curveTo(7, 9, 5, 4, 0, 4);
            cr.closePath();
            cr.restore();
        }
        cr.fill();
        cr.restore();
        aresta(cr, w, h, r, 'rgba(255, 255, 255, 0.6)', 1, 0);
    },
    chuva(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        cr.setSource(linear(0, 0, 0, h, [[0, '#172640'], [1, '#0d172d']]));
        cr.paint();
        // bokeh atrás do vidro: rosa à esquerda, âmbar no meio e ciano à direita
        cr.setSource(radial(0.1 * w, 0.6 * h, 0.22 * w, [[0, '#7a2a6e', 0.75], [1, '#7a2a6e', 0]]));
        cr.paint();
        cr.setSource(radial(0.78 * w, 0.4 * h, 0.3 * w, [[0, '#00566a', 0.6], [1, '#00566a', 0]]));
        cr.paint();
        cr.setSource(radial(0.42 * w, -0.4 * h, 0.2 * w, [[0, '#6a4a20', 0.45], [1, '#6a4a20', 0]]));
        cr.paint();
        // chuva parada no vidro, em diagonal (104deg)
        cr.setSourceRGBA(190 / 255, 215 / 255, 1, 0.16);
        cr.setLineWidth(1);
        const inc = Math.tan(14 * Math.PI / 180) * h;
        for (let x = -inc; x < w + inc; x += 23 * k) {
            cr.moveTo(x + inc, 0);
            cr.lineTo(x, h);
        }
        cr.stroke();
        cr.restore();
        aresta(cr, w, h, r, 'rgba(160, 200, 255, 0.28)', 0.35, 0);
    },
    nevemat(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        cr.setSource(linear(0, 0, 0, h, [[0, '#3d63a3'], [0.4, '#305ba4'], [1, '#2057ab']]));
        cr.paint();
        // sincelos (46 x 14, opacidade .8) logo abaixo da neve
        fonte(cr, '#dcecff', 0.8);
        for (let x0 = 0; x0 < w; x0 += 46 * k) {
            cr.save();
            cr.translate(x0, 10 * k);
            cr.scale(k, k);
            for (const pts of [[[0, 0], [46, 0], [40, 3], [35, 14], [30, 3]], [[0, 0], [10, 0], [7, 2], [4, 9], [1, 2]]]) {
                cr.moveTo(...pts[0]);
                for (const q of pts.slice(1))
                    cr.lineTo(...q);
                cr.closePath();
            }
            cr.restore();
        }
        cr.fill();
        // neve acumulada: montinhos de 9 e 7 px a cada 26 px, 3 px acima do topo
        for (const [cx, cy, raio, css] of [[12, 5, 9, '#ffffff'], [25, 6, 7, '#e6f1ff']]) {
            fonte(cr, css);
            for (let x0 = -2 * k; x0 < w; x0 += 26 * k) {
                cr.newSubPath();
                cr.arc(x0 + cx * k, (cy - 3) * k, raio * k, 0, VOLTA);
            }
            cr.fill();
        }
        luzinhas(cr, w, k, 8 * k, 'neve');
        cr.restore();
        aresta(cr, w, h, r, 'rgba(255, 255, 255, 0.5)', 0.8, 0.12);
    },
    vitrine(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        cr.setSource(linear(0, 0, 0, h, [[0, '#d62839'], [1, '#a31423']]));
        cr.paint();
        // bolinhas brancas e douradas do papel de presente
        const passo = 22 * k;
        for (const [ox, raio, css, a] of [[10, 2.2, '#ffffff', 0.28], [21, 1.6, '#ffe27a', 0.3]]) {
            fonte(cr, css, a);
            for (let y = ox * k; y < h; y += passo) {
                for (let x = ox * k; x < w; x += passo) {
                    cr.newSubPath();
                    cr.arc(x, y, raio * k, 0, VOLTA);
                }
            }
            cr.fill();
        }
        // fita dourada atravessando no meio
        const fx = w / 2 - 15 * k;
        cr.setSource(linear(fx, 0, fx + 30 * k, 0, [[0, '#b8841a'], [0.35, '#ffe27a'], [0.55, '#ffd23f'], [1, '#b8841a']]));
        cr.rectangle(fx, 0, 30 * k, h);
        cr.fill();
        cr.setSourceRGBA(0, 0, 0, 0.15);
        cr.rectangle(fx - 1, 0, 1, h);
        cr.rectangle(fx + 30 * k, 0, 1, h);
        cr.fill();
        // realces: claro em cima, sombra de 2 px embaixo
        cr.setSourceRGBA(1, 1, 1, 0.35);
        cr.rectangle(0, 0, w, 1);
        cr.fill();
        cr.setSourceRGBA(0, 0, 0, 0.25);
        cr.rectangle(0, h - 2, w, 2);
        cr.fill();
        cr.restore();
        laco(cr, w / 2, k);
    },
    brasileiro(cr, w, h, k, r) {
        retangulo(cr, 0, 0, w, h, r);
        cr.save();
        cr.clip();
        // vidro areia sobre o pôr do sol: rosa em cima, laranja embaixo
        cr.setSource(linear(0, 0, 0, h, [[0, '#f8949e'], [0.3, '#ff9490'], [0.6, '#ff9779'], [1, '#ffa161']]));
        cr.paint();
        // guirlanda de pinheiro no topo (três camadas de bolinhas, 3 px acima)
        for (const [cx, cy, raio, css] of [[10, 6, 8, '#2f8f4e'], [20, 5, 7, '#46b36a'], [0, 9, 6, '#276f3d']]) {
            fonte(cr, css);
            for (let x0 = 0; x0 < w + 20 * k; x0 += 20 * k) {
                cr.newSubPath();
                cr.arc(x0 + cx * k, (cy - 3) * k, raio * k, 0, VOLTA);
            }
            cr.fill();
        }
        luzinhas(cr, w, k, 5 * k, 'brasil');
        // bolas de Natal penduradas na guirlanda
        [[0.1, '#e5333f'], [0.33, '#ffd23f'], [0.55, '#3a8bff'], [0.77, '#e5333f'], [0.96, '#ffd23f']].forEach(([f, css]) => {
            const cx = f * w, cy = 18 * k, rb = 6 * k;
            cr.setSourceRGBA(0, 0, 0, 0.3);
            cr.arc(cx, cy + 2 * k, rb, 0, VOLTA);
            cr.fill();
            cr.setSource(new Cairo.RadialGradient(cx - 2 * k, cy - 2.5 * k, 0, cx, cy, rb));
            const g = cr.getSource();
            g.addColorStopRGBA(0, 1, 1, 1, 1);
            g.addColorStopRGBA(0.4, ...rgba(css));
            g.addColorStopRGBA(1, ...rgba(css).slice(0, 3).map(c => c * 0.65), 1);
            cr.arc(cx, cy, rb, 0, VOLTA);
            cr.fill();
        });
        cr.restore();
        aresta(cr, w, h, r, 'rgba(255, 255, 255, 0.6)', 1, 0);
    },
};

// Posições (fração da largura) e cores das luzinhas de cada fio, como no protótipo.
const CORES_LUZ = ['#ff4d4d', '#ffd23f', '#4dd96b', '#4db5ff'];
export const posicoesLuzes = w => {
    const lista = [];
    for (let i = 0, f = 0.05; f < 0.97; i++, f += 0.11)
        lista.push([f * w, CORES_LUZ[i % 4]]);
    return lista;
};

// Luzinhas apagadas (a cor de base); o brilho que pisca vem do efeito de época.
function luzinhas(cr, w, k, y, tipo) {
    for (const [x, css] of posicoesLuzes(w)) {
        if (tipo === 'neve') {
            fonte(cr, '#1b2a4a');
            cr.rectangle(x + 2 * k, y - 4 * k, 2 * k, 4 * k);
            cr.fill();
            fonte(cr, css, 0.8);
            cr.save();
            cr.translate(x + 3 * k, y + 4.5 * k);
            cr.scale(3 * k, 4.5 * k);
            cr.arc(0, 0, 1, 0, VOLTA);
            cr.restore();
            cr.fill();
        } else {
            fonte(cr, css, 0.75);
            cr.arc(x + 3 * k, y + 3 * k, 3 * k, 0, VOLTA);
            cr.fill();
        }
    }
}

// Laço dourado no topo do tema Vitrine (76 x 44, 30 px acima do vidro), centrado em cx.
function laco(cr, cx, k) {
    cr.save();
    cr.translate(cx - 38 * k, -30 * k);
    cr.scale(k, k);
    cr.setSourceRGBA(0, 0, 0, 0.3);
    cr.save();
    cr.translate(0, 4);
    lacoForma(cr, true);
    cr.restore();
    lacoForma(cr, false);
    cr.restore();
}

function lacoForma(cr, sombra) {
    const pinta = css => (sombra ? null : fonte(cr, css));
    pinta('#ffd23f');
    cr.moveTo(38, 26);
    cr.curveTo(28, 4, 4, 0, 4, 14);
    cr.curveTo(4, 28, 24, 28, 38, 26);
    cr.moveTo(38, 26);
    cr.curveTo(48, 4, 72, 0, 72, 14);
    cr.curveTo(72, 28, 52, 28, 38, 26);
    cr.fill();
    pinta('#e0b020');
    for (const pts of [[[34, 28], [22, 44], [32, 44], [38, 30]], [[42, 28], [54, 44], [44, 44], [38, 30]]]) {
        cr.moveTo(...pts[0]);
        for (const q of pts.slice(1))
            cr.lineTo(...q);
        cr.closePath();
    }
    cr.fill();
    if (sombra)
        return;
    fonte(cr, '#b8841a');
    cr.setLineWidth(1.5);
    cr.moveTo(38, 26);
    cr.curveTo(28, 8, 12, 6, 10, 14);
    cr.moveTo(38, 26);
    cr.curveTo(48, 8, 64, 6, 66, 14);
    cr.stroke();
    fonte(cr, '#ffe27a');
    cr.arc(38, 26, 6, 0, VOLTA);
    cr.fill();
}

// Rosa dos ventos em traço fino (marca d'água do tema Carta), raio `r` com centro em (cx, cy).
function rosaDosVentos(cr, cx, cy, r) {
    cr.save();
    cr.translate(cx, cy);
    cr.scale(r / 50, r / 50);
    cr.setSourceRGBA(39 / 255, 38 / 255, 31 / 255, 0.1);
    cr.setLineWidth(0.8);
    for (const raio of [40, 30]) {
        cr.newSubPath();
        cr.arc(0, 0, raio, 0, VOLTA);
    }
    cr.moveTo(-34, -34);
    cr.lineTo(34, 34);
    cr.moveTo(34, -34);
    cr.lineTo(-34, 34);
    cr.stroke();
    const estrela = [[0, -48], [6, -6], [48, 0], [6, 6], [0, 48], [-6, 6], [-48, 0], [-6, -6]];
    cr.moveTo(...estrela[0]);
    for (const q of estrela.slice(1))
        cr.lineTo(...q);
    cr.closePath();
    cr.fill();
    cr.restore();
}

// =============================== API ===============================

const pixelDe = id => TEMAS_PIXEL.includes(id);

// Desenha o vidro do tema `id` no referencial comum (ver o topo do arquivo). `icone` é o tamanho do ícone em
// repouso, de onde saem a escala do protótipo e o tamanho do pixel da arte.
export function desenharDoca(cr, id, x, w, esp, icone) {
    const geo = geometriaTema(id, icone);
    if (!geo)
        return;
    cr.save();
    cr.translate(x, -esp);
    if (pixelDe(id))
        docaPixel(cr, id, w, esp, geo.pixel);
    else
        MATERIAL[id](cr, w, esp, icone / 58, geo.raio);
    cr.restore();
}

// Cor do separador favoritos | abertos (só os temas pixel trocam: os de materiais seguem o CSS).
export const corSeparador = id => PIXEL[id]?.sep ?? null;

// Fração do lado do tile que o ícone do app ocupa (o resto é a moldura do tile).
export function fracaoIcone(id) {
    if (id === 'vitrine')
        return 0.46;
    return pixelDe(id) ? 0.6 : 0.62;
}

// Cores do tile de cada app nos temas que variam por posição (como no protótipo, de 5 em 5).
const CORES_TILE = {
    aurora: [['#4facfe', '#0066ff'], ['#43e97b', '#0bb5a5'], ['#8e5cff', '#4a2fd8'], ['#ff7ab6', '#e03a8f'], ['#ffb347', '#ff6a3d']],
    vitrine: [['#2ecc71', '#1e8449'], ['#4aa3ff', '#1f5fae'], ['#b97ae0', '#8e44ad'], ['#ff8a7a', '#c0392b'], ['#5fe0c4', '#16a085']],
    chuva: ['#5ff0ff', '#ff6ad5', '#a6ff6a', '#ffcf5c', '#8fb4ff'],
    nevemat: ['#ff9a9a', '#ffe27a', '#8affb4', '#9fd4ff', '#ffc0e8'],
};

// Tile de um app (quadrado de lado `s`), o `i`-ésimo da doca. `ativo` destaca o app aberto onde o tema faz
// isso no próprio tile (Carta: moldura vermelha de carimbo).
export function desenharTile(cr, id, s, i = 0, ativo = false) {
    const k = s / 58;
    if (pixelDe(id)) {
        const P = PIXEL[id], p = s / 20;
        pontos(cr, p, [[1, 0, 18, 1], [1, 19, 18, 1], [0, 1, 1, 18], [19, 1, 1, 18]], P.tileB);
        pontos(cr, p, [[1, 1, 18, 18]], P.tile);
        return;
    }
    switch (id) {
    case 'aurora': {
        const [c1, c2] = CORES_TILE.aurora[i % 5];
        retangulo(cr, 0, 0, s, s, 16 * k);
        cr.setSource(linearCss(s, s, 160, [[0, c1], [1, c2]]));
        cr.fill();
        aresta(cr, s, s, 16 * k, null, 0.6, 0);
        break;
    }
    case 'carta':
        retangulo(cr, 3 * k, 3 * k, s - 6 * k, s - 6 * k, 3 * k);
        fonte(cr, ativo ? '#fff6dd' : 'rgba(255, 255, 255, 0.35)');
        cr.fillPreserve();
        fonte(cr, '#27261f');
        cr.setLineWidth(1);
        cr.stroke();
        fonte(cr, '#b8322a');
        if (ativo) {
            retangulo(cr, 0.5, 0.5, s - 1, s - 1, 5 * k);
            cr.stroke();
        } else {
            // cantos de mira em vermelho (em cima à esquerda, embaixo à direita)
            cr.moveTo(0.5, 6 * k);
            cr.lineTo(0.5, 0.5);
            cr.lineTo(6 * k, 0.5);
            cr.moveTo(s - 6 * k, s - 0.5);
            cr.lineTo(s - 0.5, s - 0.5);
            cr.lineTo(s - 0.5, s - 6 * k);
            cr.stroke();
        }
        break;
    case 'jardim':
        retangulo(cr, 0, 0, s, s, 18 * k);
        cr.setSource(linear(0, 0, 0, s, [[0, '#fffaf0'], [1, '#ffe9c9']]));
        cr.fill();
        aresta(cr, s, s, 18 * k, null, 1, 0);
        break;
    case 'chuva': {
        const n = CORES_TILE.chuva[i % 5];
        for (let j = 3; j >= 1; j--) {
            retangulo(cr, -j * 2 * k + 2 * k, -j * 2 * k + 2 * k, s + j * 4 * k - 4 * k, s + j * 4 * k - 4 * k, 16 * k);
            fonte(cr, n, 0.06);
            cr.fill();
        }
        retangulo(cr, 0, 0, s, s, 16 * k);
        fonte(cr, 'rgba(255, 255, 255, 0.06)');
        cr.fill();
        aresta(cr, s, s, 16 * k, 'rgba(160, 200, 255, 0.25)', 0.2, 0);
        retangulo(cr, 1.5, 1.5, s - 3, s - 3, 15 * k);
        fonte(cr, n, 0.35);
        cr.setLineWidth(1);
        cr.stroke();
        break;
    }
    case 'nevemat': {
        const n = CORES_TILE.nevemat[i % 5];
        retangulo(cr, 0, 0, s, s, 16 * k);
        cr.setSource(linearCss(s, s, 160, [[0, '#ffffff', 0.28], [1, '#ffffff', 0.06]]));
        cr.fill();
        retangulo(cr, 2, 2, s - 4, s - 4, 14 * k);
        fonte(cr, n, 0.18);
        cr.setLineWidth(2);
        cr.stroke();
        aresta(cr, s, s, 16 * k, 'rgba(255, 255, 255, 0.45)', 0.6, 0);
        break;
    }
    case 'vitrine': {
        const [c1, c2] = CORES_TILE.vitrine[i % 5];
        retangulo(cr, 0, 0, s, s, 8 * k);
        cr.save();
        cr.clip();
        cr.setSource(linearCss(s, s, 160, [[0, c1], [1, c2]]));
        cr.paint();
        // fita em cruz
        cr.setSource(linear(0, s / 2 - 5 * k, 0, s / 2 + 5 * k, [[0, '#ffe27a'], [1, '#c9971f']]));
        cr.rectangle(0, s / 2 - 5 * k, s, 10 * k);
        cr.fill();
        cr.setSource(linear(s / 2 - 5 * k, 0, s / 2 + 5 * k, 0, [[0, '#c9971f'], [0.5, '#ffe27a'], [1, '#c9971f']]));
        cr.rectangle(s / 2 - 5 * k, 0, 10 * k, s);
        cr.fill();
        cr.restore();
        aresta(cr, s, s, 8 * k, null, 0.4, 0);
        // selo creme no centro, onde fica o ícone
        cr.setSourceRGBA(0, 0, 0, 0.3);
        cr.arc(s / 2, s / 2 + 1 * k, 17.5 * k, 0, VOLTA);
        cr.fill();
        fonte(cr, '#fff6e0');
        cr.arc(s / 2, s / 2, 17 * k, 0, VOLTA);
        cr.fill();
        break;
    }
    case 'brasileiro':
        retangulo(cr, 0, 0, s, s, 18 * k);
        cr.setSource(linear(0, 0, 0, s, [[0, '#ffffff', 0.85], [1, '#ffebcd', 0.7]]));
        cr.fill();
        aresta(cr, s, s, 18 * k, null, 1, 0);
        break;
    }
}

// Glifos 5 x 5 dos indicadores pixel.
const GLIFO_IND = {
    vila: [['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'], {r: '#e0314b'}],
    floresta: [['..g..', '.ggg.', 'ggGgg', '.gGg.', '..G..'], {g: '#8fd96a', G: '#4f9a45'}],
    lua: [['..y..', '..y..', 'yyyyy', '.yyy.', '.y.y.'], {y: '#ffd36b'}],
    praia: [['..o..', 'o.o.o', '.ooo.', 'ooooo', 'o...o'], {o: '#e8744b'}],
    nevepixel: [['..w..', '.w.w.', 'w.w.w', '.w.w.', '..w..'], {w: '#ffffff'}],
};

// Indicador de app aberto no tema `id`, centrado na área w x h.
export function desenharIndicador(cr, id, w, h) {
    const cx = w / 2, cy = h / 2;
    if (GLIFO_IND[id]) {
        const [m, cores] = GLIFO_IND[id];
        const p = w / 5;
        m.forEach((linha, j) => [...linha].forEach((ch, i) => {
            if (!cores[ch])
                return;
            fonte(cr, cores[ch]);
            px(cr, p, i, j);
            cr.fill();
        }));
        return;
    }
    switch (id) {
    case 'aurora':
        cr.setSource(radial(cx, cy, w / 2, [[0, '#ffffff', 0.9], [0.18, '#ffffff', 0.9], [0.2, '#ffffff', 0.5], [1, '#ffffff', 0]]));
        cr.paint();
        break;
    case 'jardim':
        // folha: cantos opostos redondos (border-radius 0 100% 0 100%)
        fonte(cr, '#4f8a45');
        cr.moveTo(0, h);
        cr.curveTo(0, h * 0.2, w * 0.35, 0, w, 0);
        cr.curveTo(w, h * 0.8, w * 0.65, h, 0, h);
        cr.fill();
        break;
    case 'chuva': {
        const bw = w * 14 / 22, bh = h * 3 / 10;
        for (let j = 3; j >= 1; j--) {
            retangulo(cr, cx - bw / 2 - j * 1.5, cy - bh / 2 - j * 1.5, bw + j * 3, bh + j * 3, bh);
            fonte(cr, '#55ffff', 0.15);
            cr.fill();
        }
        retangulo(cr, cx - bw / 2, cy - bh / 2, bw, bh, 2);
        fonte(cr, '#55ffff');
        cr.fill();
        break;
    }
    case 'nevemat':
        cr.setSource(radial(cx, cy, w / 2, [[0, '#bfe0ff', 0.6], [1, '#7fb6ff', 0]]));
        cr.paint();
        floco(cr, cx, cy, w * 0.3, '#ffffff');
        break;
    case 'vitrine': {
        // etiqueta de presente creme com furo vermelho
        const tw = 14 * w / 16, th = 18 * h / 20;
        const x0 = cx - tw / 2, y0 = cy - th / 2;
        cr.setSourceRGBA(0, 0, 0, 0.25);
        cr.rectangle(x0 + 1, y0 + th * 0.22 + 1, tw, th * 0.78);
        cr.fill();
        fonte(cr, '#fff6e0');
        cr.moveTo(cx, y0);
        cr.lineTo(x0 + tw, y0 + th * 0.22);
        cr.lineTo(x0 + tw, y0 + th);
        cr.lineTo(x0, y0 + th);
        cr.lineTo(x0, y0 + th * 0.22);
        cr.closePath();
        cr.fill();
        fonte(cr, '#a31423');
        cr.arc(cx, y0 + th * 0.36, Math.max(1, tw * 0.11), 0, VOLTA);
        cr.fill();
        break;
    }
    case 'brasileiro': {
        cr.setSource(radial(cx, cy, w / 2, [[0.4, '#ff505a', 0.55], [1, '#ff505a', 0]]));
        cr.paint();
        const rb = w * 11 / 40;
        cr.setSource(new Cairo.RadialGradient(cx - rb * 0.3, cy - rb * 0.4, 0, cx, cy, rb));
        const g = cr.getSource();
        g.addColorStopRGBA(0, 1, 1, 1, 1);
        g.addColorStopRGBA(0.45, ...rgba('#e5333f'));
        g.addColorStopRGBA(1, ...rgba('#8c1420'));
        cr.arc(cx, cy, rb, 0, VOLTA);
        cr.fill();
        break;
    }
    }
}

// Floco de neve de seis braços com raio r.
function floco(cr, cx, cy, r, css) {
    fonte(cr, css);
    cr.setLineWidth(Math.max(1, r * 0.18));
    cr.setLineCap(Cairo.LineCap.ROUND);
    for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const dx = Math.cos(a), dy = Math.sin(a);
        cr.moveTo(cx, cy);
        cr.lineTo(cx + dx * r, cy + dy * r);
        const bx = cx + dx * r * 0.55, by = cy + dy * r * 0.55;
        for (const s of [-1, 1]) {
            const b = a + s * Math.PI / 4;
            cr.moveTo(bx, by);
            cr.lineTo(bx + Math.cos(b) * r * 0.32, by + Math.sin(b) * r * 0.32);
        }
    }
    cr.stroke();
}

// =============================== Efeitos ===============================
// Partes animadas, desenhadas por cima do vidro (caixa w x h) pelo motor de efeitos de mascotes.js; `t` em ms.
// Tudo é função do relógio, sem estado. Nenhuma luz pisca mais de 1 vez por segundo.

const onda = (t, periodo, fase = 0) => 0.5 + 0.5 * Math.sin((t / periodo) * VOLTA + fase);

function brilhoLuzes(cr, w, h, t, y, raio) {
    const k = h / 86;
    posicoesLuzes(w).forEach(([x, css], i) => {
        const b = onda(t, 2600, -i * 1.2);
        cr.setSource(radial(x + 3 * k, y, raio * k, [[0, css, 0.9 * b], [0.35, css, 0.5 * b], [1, css, 0]]));
        cr.paint();
    });
}

// Flocos caindo pelo vidro (n flocos, tamanho de 3 a 5 px na escala k).
function nevando(cr, w, h, t, k, n) {
    cr.setSourceRGBA(1, 1, 1, 0.85);
    for (let i = 0; i < n; i++) {
        const v = 9000 + (i % 5) * 1000;
        const f = ((t + i * 2311) % v) / v;
        const x = ((i * 0.137 + 0.04) % 1) * w + Math.sin(t / 1500 + i) * 4 * k;
        cr.newSubPath();
        cr.arc(x, -6 + f * (h + 12), (1.5 + (i % 3) * 0.5) * k, 0, VOLTA);
    }
    cr.fill();
}

export const EFEITOS_TEMA = {
    floresta(cr, w, h, t) {
        // vagalumes acendendo devagar
        const p = h / ALTURA;
        [[0.22, 14], [0.52, 10], [0.73, 22], [0.93, 16]].forEach(([fx, y], i) => {
            const a = onda(t, 3100, i * 1.7);
            const x = fx * w;
            cr.setSource(radial(x, y * p, 3 * p, [[0, '#f4ff9a', 0.4 + a * 0.6], [0.4, '#f4ff9a', 0.08 + a * 0.18], [1, '#f4ff9a', 0]]));
            cr.paint();
        });
    },
    lua(cr, w, h, t) {
        // algumas estrelas piscam
        const p = h / ALTURA;
        const r = rng(19);
        for (let i = 0; i < Math.round(w / p / 30); i++) {
            const x = Math.floor((3 + r() * (w / p - 6))), y = 4 + Math.floor(r() * (ALTURA - 8));
            if (Math.sin(t / 450 + i * 2) > 0.2) {
                cr.setSourceRGBA(1, 1, 1, 1);
                px(cr, p, x, y);
                cr.fill();
            }
        }
    },
    nevepixel(cr, w, h, t) {
        const p = h / ALTURA;
        let i = 0;
        for (let x = 9; x < w / p - 6; x += 11, i++) {
            const y = 5 + fioPixel(x), b = onda(t, 4500, i * 1.9);
            fonte(cr, CORES_LUZ[i % 4], 0.4 + 0.6 * b);
            px(cr, p, x, y, 2, 2);
            cr.fill();
            if (b > 0.85) {
                fonte(cr, CORES_LUZ[i % 4], 0.3);
                px(cr, p, x - 1, y, 4, 2);
                px(cr, p, x, y - 1, 2, 4);
                cr.fill();
            }
        }
        cr.setSourceRGBA(1, 1, 1, 0.85);
        for (let j = 0; j < Math.round(w / p / 6); j++) {
            const v = 5 + (j % 5) * 2.4;
            const yy = (((j * 29) % 86) + t / 1000 * v) % (ALTURA + 4) - 2;
            const xx = ((j * 47 + 13) % Math.round(w / p)) + Math.sin(t / 1000 * (0.8 + (j % 4) * 0.4) + j * 1.7) * 3;
            px(cr, p, Math.round(xx), Math.round(yy));
            if (j % 5 === 0) {
                px(cr, p, Math.round(xx) - 1, Math.round(yy), 3, 1);
                px(cr, p, Math.round(xx), Math.round(yy) - 1, 1, 3);
            }
        }
        cr.fill();
    },
    jardim(cr, w, h, t) {
        // pétalas caindo
        const k = h / 86;
        [[0.12, 8000, 0], [0.3, 10000, 3000], [0.52, 8000, 5000], [0.7, 9000, 1500], [0.88, 11000, 6500]].forEach(([fx, v, d]) => {
            const f = ((t + d) % v) / v;
            cr.save();
            cr.translate(fx * w - 40 * k * f, -10 * k + 120 * k * f);
            cr.rotate(f * 300 * Math.PI / 180);
            cr.scale(4 * k, 2.5 * k);
            cr.arc(0, 0, 1, 0, VOLTA);
            cr.restore();
            fonte(cr, '#ffc2d1', 0.9 * (1 - f));
            cr.fill();
        });
    },
    chuva(cr, w, h, t) {
        // gotas escorrendo pelo vidro
        const k = h / 86;
        [[0.14, 6000, 1000], [0.41, 7000, 3400], [0.67, 6000, 2000], [0.9, 8000, 4600]].forEach(([fx, v, d]) => {
            const f = ((t + d) % v) / v;
            const a = f < 0.15 ? f / 0.15 : 1 - 0.8 * (f - 0.15) / 0.85;
            const x = fx * w, y = -10 * k + f * (h + 10 * k);
            cr.save();
            cr.translate(x, y);
            cr.scale(3 * k, 4.5 * k);
            cr.arc(0, 0, 1, 0, VOLTA);
            cr.restore();
            cr.setSource(radial(x - k, y - 1.5 * k, 4 * k, [[0, '#ffffff', 0.85 * a], [1, '#a0c8ff', 0.25 * a]]));
            cr.fill();
        });
    },
    nevemat(cr, w, h, t) {
        brilhoLuzes(cr, w, h, t, 12.5 * h / 86, 9);
        nevando(cr, w, h, t, h / 86, 18);
    },
    vitrine(cr, w, h, t) {
        // brilhos dourados de quatro pontas acendendo em ritmos diferentes
        const k = h / 86;
        [[0.07, 0.22, 0], [0.23, 0.7, 1000], [0.41, 0.18, 2000], [0.63, 0.72, 600], [0.79, 0.2, 1600], [0.93, 0.64, 2400]].forEach(([fx, fy, d]) => {
            const b = Math.max(0, Math.sin(((t + d) % 3000) / 3000 * Math.PI));
            if (b <= 0.02)
                return;
            const x = fx * w, y = fy * h, r = 10.8 * k * b;
            cr.setSource(radial(x, y, r, [[0, '#ffffff', b], [0.35, '#ffe27a', 0.9 * b], [0.7, '#ffe27a', 0]]));
            cr.moveTo(x, y - r);
            cr.lineTo(x + r * 0.2, y - r * 0.2);
            cr.lineTo(x + r, y);
            cr.lineTo(x + r * 0.2, y + r * 0.2);
            cr.lineTo(x, y + r);
            cr.lineTo(x - r * 0.2, y + r * 0.2);
            cr.lineTo(x - r, y);
            cr.lineTo(x - r * 0.2, y - r * 0.2);
            cr.closePath();
            cr.fill();
        });
    },
    brasileiro(cr, w, h, t) {
        brilhoLuzes(cr, w, h, t, 8 * h / 86, 8);
    },
};
