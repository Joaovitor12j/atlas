// Temas de pixel art (Vila, Floresta, Noite de lua, Praia, Noite de neve em pixel): o vidro é uma grade de pixels.

// Altura da arte da doca pixel e quantas linhas ela pode passar do vidro (grama, telhados, neve).
import {fonte, rgba, rng} from './cairo.js';
import {CORES_LUZ} from './material.js';

export const ALTURA = 36;

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

export function px(cr, p, x, y, w = 1, h = 1) {
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

export function pontos(cr, p, lista, css) {
    fonte(cr, css);
    for (const [x, y, w = 1, h = 1] of lista)
        px(cr, p, x, y, w, h);
    cr.fill();
}

// Cada tema pixel: `grade(g, W)` desenha a parte que só depende da posição a partir da esquerda (cacheada) e
// `ponta(cr, p, W)` o que depende da largura atual (borda da direita, lua). `tile`/`borda` do tile de app.
export const PIXEL = {
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
export const fioPixel = x => Math.round(2.2 * Math.abs(Math.sin(Math.PI * (x - 4) / 66)));

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

export function docaPixel(cr, id, w, esp, p) {
    const W = Math.max(8, Math.round(w / p));
    cr.save();
    cr.scale(w / (W * p), esp / (ALTURA * p)); // a arte cobre o vidro inteiro mesmo com arredondamento
    pintarGrade(cr, gradeDe(id, W), p, W);
    PIXEL[id].ponta(cr, p, W);
    cr.restore();
}
