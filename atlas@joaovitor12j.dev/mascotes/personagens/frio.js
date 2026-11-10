// Mascote Frio (pinguim, neve e pendurado, quando a temperatura cai): desenho em Cairo e linha do tempo.

// Pinguim deslizando de barriga pela doca, com o pulinho no fim.
import {cor, poligono, retanguloArredondado} from '../../nucleo/desenho.js';
import {easeInCubic, easeOutBack, easeOutCubic, limitar01, rampa, sorteioFixo, VOLTA} from '../../nucleo/matematica.js';
import {comAlfa, rosto} from '../desenho.js';

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

// Pinguim no tobogã: desliza de barriga pela doca de ponta a ponta e dá um pulinho antes de sair.
const PINGUIM = 3800;

export const duracaoPinguim = () => PINGUIM;

// {x, pulo, inclina, dir}: `x` de 0 a 1 (fora da doca nas pontas), `pulo` de 0 a 1 (altura do pulinho), `inclina` em
// radianos (o corpo gira no pulo). null depois do fim.
export function quadroPinguim(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= PINGUIM)
        return null;
    const p = t / PINGUIM;
    const x = -0.08 + 1.16 * p;
    const pul = limitar01((p - 0.78) / 0.14);
    const pulo = pul > 0 && pul < 1 ? Math.sin(Math.PI * pul) : 0;
    return {x: dir < 0 ? 1 - x : x, pulo, inclina: -0.5 * pulo * (dir < 0 ? -1 : 1), dir: dir < 0 ? -1 : 1};
}

// Neve acumulando: flocos caem e formam um monte em cima da doca; um boneco espia do monte, treme e afunda.
const NEVE = {cai: 2600, espia: 2000, afunda: 500, derrete: 800, queda: 1100};

export const duracaoNeve = () => NEVE.cai + NEVE.espia + NEVE.afunda + NEVE.derrete;

// {t, monte, cabeca, treme, alfa}: `monte` de 0 a 1 (altura do monte), `cabeca` de 0 (escondida) a 1 (um pouco mais
// no overshoot), `treme` de -1 a 1, `alfa` some no fim. `t` vai para flocosDeNeve. null depois do fim.
export function quadroNeve(t) {
    t = Math.max(0, t);
    if (t >= duracaoNeve())
        return null;
    const iEspia = NEVE.cai;
    const iAfunda = iEspia + NEVE.espia;
    const iDerrete = iAfunda + NEVE.afunda;
    let cabeca = 0;
    if (t >= iEspia + 200 && t < iAfunda)
        cabeca = easeOutBack(limitar01((t - iEspia - 200) / 450));
    else if (t >= iAfunda && t < iDerrete)
        cabeca = 1 - easeInCubic((t - iAfunda) / NEVE.afunda);
    const alfa = 1 - easeInCubic(limitar01((t - iDerrete) / NEVE.derrete));
    return {t, monte: easeOutCubic(limitar01(t / (NEVE.cai + 300))), cabeca, treme: Math.sin(t / 32) * Math.min(1, cabeca), alfa};
}

// Flocos no ar em `t` ms: [{x, y, r}] com `x` de 0 a 1 na largura, `y` de 0 (topo) a 1 (pousou) e `r` de 0.6 a 1
// (tamanho relativo). Os `n` flocos começam a cair espalhados pelo tempo de queda da neve.
export function flocosDeNeve(t, n = 22) {
    const flocos = [];
    for (let i = 0; i < n; i++) {
        const ini = (i / n) * NEVE.cai * 0.8 + sorteioFixo(i + 50) * 250;
        const f = (t - ini) / NEVE.queda;
        if (f < 0 || f >= 1)
            continue;
        const x0 = 0.08 + 0.84 * sorteioFixo(i);
        flocos.push({x: x0 + Math.sin(f * 5 + i) * 0.04, y: f, r: 0.6 + 0.4 * sorteioFixo(i + 100)});
    }
    return flocos;
}

// Pendurado tremendo: cai de cima, se agarra na borda da doca, balança, treme, espirra e cai.
const PENDURADO = {cai: 500, balanca: 2400, espirro: 800, solta: 700};

export const duracaoPendurado = () => PENDURADO.cai + PENDURADO.balanca + PENDURADO.espirro + PENDURADO.solta;

// {queda, balanco, treme, inspira, atchim, solta, alfa}: `queda` de -1 (acima, fora) a 0 (agarrado), `balanco` em
// radianos (pêndulo que amortece), `treme` de -1 a 1, `inspira` e `atchim` de 0 a 1 (o espirro), `solta` de 0
// (agarrado) a 1 (caiu). null depois do fim.
export function quadroPendurado(t) {
    t = Math.max(0, t);
    if (t >= duracaoPendurado())
        return null;
    const iBalanca = PENDURADO.cai;
    const iEspirro = iBalanca + PENDURADO.balanca;
    const iSolta = iEspirro + PENDURADO.espirro;
    const s = limitar01((t - iBalanca) / (PENDURADO.balanca + PENDURADO.espirro));
    const solta = easeInCubic(limitar01((t - iSolta) / PENDURADO.solta));
    return {
        queda: t < iBalanca ? easeOutBack(t / iBalanca) - 1 : 0,
        balanco: t < iBalanca ? 0 : Math.sin((t - iBalanca) / 260) * 0.35 * (1 - 0.6 * s),
        treme: Math.sin(t / 30) * rampa(t, iBalanca, iBalanca + 300) * (1 - rampa(t, iSolta, iSolta + 100)),
        inspira: rampa(t, iEspirro, iEspirro + 500) * (1 - rampa(t, iEspirro + 500, iEspirro + 560)),
        atchim: limitar01((t - iEspirro - 500) / 300) * (1 - limitar01((t - iSolta - 200) / 300)),
        solta,
        alfa: 1 - easeInCubic(limitar01((t - iSolta - PENDURADO.solta * 0.4) / (PENDURADO.solta * 0.6))),
    };
}

// Pinguim pulando: atravessa a doca em pulinhos seguidos.
const PINGUIM_PULA = 4400;

export const duracaoPinguimPula = () => PINGUIM_PULA;

// Mesmo estado do pinguim (quadroPinguim): vários pulos pelo caminho.
export function quadroPinguimPula(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= PINGUIM_PULA)
        return null;
    const p = t / PINGUIM_PULA;
    const x = -0.08 + 1.16 * p;
    const ciclo = (p * 8) % 1;
    const pulo = Math.sin(Math.PI * ciclo);
    return {x: dir < 0 ? 1 - x : x, pulo, inclina: -0.35 * pulo * (dir < 0 ? -1 : 1), dir: dir < 0 ? -1 : 1};
}

// Pinguim andando de lado a lado e parando no meio, balançando como pinguim.
const PINGUIM_ANDA = 5200;

export const duracaoPinguimAnda = () => PINGUIM_ANDA;

export function quadroPinguimAnda(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= PINGUIM_ANDA)
        return null;
    const a = 1800;
    const parado = 1600;
    let x;
    let anda = 1;
    if (t < a) {
        x = -0.08 + 0.58 * easeOutCubic(t / a);
    } else if (t < a + parado) {
        x = 0.5;
        anda = 0;
    } else {
        x = 0.5 + 0.58 * easeInCubic((t - a - parado) / (PINGUIM_ANDA - a - parado));
    }
    const balanco = Math.sin(t / 150);
    return {
        x: dir < 0 ? 1 - x : x,
        pulo: anda ? 0.12 * Math.abs(balanco) : 0.04 * Math.abs(Math.sin(t / 400)),
        inclina: balanco * (anda ? 0.22 : 0.05),
        dir: dir < 0 ? -1 : 1,
    };
}
