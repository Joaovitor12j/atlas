// Ícones do tempo (sol, lua, nuvem, chuva, raio) desenhados em Cairo.
import {cor, poligono, retanguloArredondado} from '../nucleo/desenho.js';
import {VOLTA} from '../nucleo/matematica.js';

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
