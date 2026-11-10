// Mascote Calor (picolé e sol, quando a temperatura sobe): desenho em Cairo e linha do tempo.

// Sol com rosto. `oculos` põe óculos escuros; `giro` gira os raios.
import {cor, retanguloArredondado} from '../../nucleo/desenho.js';
import {easeInCubic, easeInOut, easeOutBack, easeOutCubic, limitar01, rampa, VOLTA} from '../../nucleo/matematica.js';
import {comAlfa, easeIn, gota, rosto} from '../desenho.js';
import {atravessa, movimento} from '../movimento.js';

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

// Picolé: sobe da doca, pinga pela borda, derrete numa poça e a poça evapora.
const PICOLE = {sobe: 450, pinga: 3000, derrete: 1300, evapora: 900};

export const duracaoPicole = () => PICOLE.sobe + PICOLE.pinga + PICOLE.derrete + PICOLE.evapora;

// {sobe, fase, suor, derrete, vapor, alfa}: `fase` cresce sempre (pingos), `derrete` de 0 (inteiro) a 1 (poça),
// `vapor` e `alfa` cuidam da poça sumindo. null depois do fim.
export function quadroPicole(t) {
    t = Math.max(0, t);
    if (t >= duracaoPicole())
        return null;
    const iDerrete = PICOLE.sobe + PICOLE.pinga;
    const iEvapora = iDerrete + PICOLE.derrete;
    const vapor = limitar01((t - iEvapora) / PICOLE.evapora);
    return {
        sobe: t < PICOLE.sobe ? easeOutBack(t / PICOLE.sobe) : 1,
        fase: t / 1000,
        suor: rampa(t, PICOLE.sobe, PICOLE.sobe + 500),
        derrete: rampa(t, iDerrete, iEvapora),
        vapor,
        alfa: 1 - easeInCubic(vapor),
    };
}

// Sol atravessando: nasce numa ponta da doca, faz um arco por cima e se põe na outra.
const SOL_ARCO = 5200;

export const duracaoSolArco = () => SOL_ARCO;

// {x, altura, giro}: `x` de 0 a 1 ao longo da doca (`dir` -1 vai da direita para a esquerda), `altura` de 0 (atrás
// da doca) a 1 (no alto do arco), `giro` em radianos (raios girando). null depois do fim.
export function quadroSolArco(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= SOL_ARCO)
        return null;
    const p = easeInOut(t / SOL_ARCO);
    return {x: dir < 0 ? 1 - p : p, altura: Math.sin(Math.PI * p), giro: t / 900};
}

// Sol de óculos: entra andando por uma ponta, para no meio, se abana e enxuga a testa, e sai pela outra.
const SOL_LEQUE = {entra: 1800, abana: 2600, sai: 1600};

export const duracaoSolLeque = () => SOL_LEQUE.entra + SOL_LEQUE.abana + SOL_LEQUE.sai;

// {x, anda, passo, leque, enxuga, dir}: `x` de 0 a 1 ao longo da doca (fora dela nas pontas), `anda` 1 enquanto
// caminha, `passo` é a fase das pernas, `leque` de -1 a 1 (abanando), `enxuga` de 0 a 1 (mão na testa). null no fim.
export function quadroSolLeque(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= duracaoSolLeque())
        return null;
    const iSai = SOL_LEQUE.entra + SOL_LEQUE.abana;
    let p;
    if (t < SOL_LEQUE.entra)
        p = -0.1 + 0.6 * easeOutCubic(t / SOL_LEQUE.entra);
    else if (t < iSai)
        p = 0.5;
    else
        p = 0.5 + 0.6 * easeInCubic((t - iSai) / SOL_LEQUE.sai);
    const anda = t < SOL_LEQUE.entra - 150 || t >= iSai + 100 ? 1 : 0;
    const abano = rampa(t, SOL_LEQUE.entra, SOL_LEQUE.entra + 300) * (1 - rampa(t, iSai - 1100, iSai - 800));
    return {
        x: dir < 0 ? 1 - p : p,
        anda,
        passo: t / 110,
        leque: Math.sin(t / 85) * abano,
        enxuga: rampa(t, iSai - 1100, iSai - 800) * (1 - rampa(t, iSai - 250, iSai)),
        dir: dir < 0 ? -1 : 1,
    };
}

// Sol correndo: atravessa a doca sem parar, abanando o leque o tempo todo.
const SOL_CORRE = 3000;

export const duracaoSolCorre = () => SOL_CORRE;

// Mesmo estado do sol de óculos (quadroSolLeque), só que correndo: passos curtos e rápidos e o leque a mil.
export function quadroSolCorre(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= SOL_CORRE)
        return null;
    const p = -0.1 + 1.2 * (t / SOL_CORRE);
    return {x: dir < 0 ? 1 - p : p, anda: 1, passo: t / 70, leque: Math.sin(t / 55), enxuga: 0, dir: dir < 0 ? -1 : 1};
}

// Sol quicando: atravessa a doca pulando, como uma bola.
const SOL_QUICA = 4400;

export const duracaoSolQuica = () => SOL_QUICA;

// Estado do sol no arco (quadroSolArco): `altura` sobe e desce em quicadas.
export function quadroSolQuica(t, dir = 1) {
    t = Math.max(0, t);
    if (t >= SOL_QUICA)
        return null;
    const p = t / SOL_QUICA;
    const x = -0.02 + 1.04 * p;
    return {x: dir < 0 ? 1 - x : x, altura: 0.18 + 0.55 * Math.abs(Math.sin(p * Math.PI * 5)) * (1 - 0.3 * p), giro: t / 600};
}

// Sol nascendo no meio da doca: sobe, brilha e se põe no mesmo lugar.
const SOL_NASCE = {sobe: 1500, brilha: 2600, desce: 1300};

export const duracaoSolNasce = () => SOL_NASCE.sobe + SOL_NASCE.brilha + SOL_NASCE.desce;

export function quadroSolNasce(t) {
    t = Math.max(0, t);
    if (t >= duracaoSolNasce())
        return null;
    const iDesce = SOL_NASCE.sobe + SOL_NASCE.brilha;
    let altura = 1;
    if (t < SOL_NASCE.sobe)
        altura = easeOutCubic(t / SOL_NASCE.sobe);
    else if (t >= iDesce)
        altura = 1 - easeInCubic((t - iDesce) / SOL_NASCE.desce);
    return {x: 0.5, altura, giro: t / 700};
}

// Como o motor (index.js) usa o mascote: `prefixo` das chaves do schema, `gatilho` (sem ele, dispara por horário), `temporada`,
// e `variantes` (movimentos) com tamanho, contexto, duração, quadro e desenho.
export const personagem = {
    gatilho: 'clima',
    variantes: {
        'picole': movimento((a) => ({w: Math.round(a * 1.3), h: Math.round(a * 2.2), abaixo: Math.round(a * 0.7)}), duracaoPicole, t => quadroPicole(t), picole),
        'sol-arco': movimento(atravessa(2), duracaoSolArco, quadroSolArco, solArco),
        'sol-leque': movimento(atravessa(1.7), duracaoSolLeque, quadroSolLeque, solLeque),
        'sol-corre': movimento(atravessa(1.7), duracaoSolCorre, quadroSolCorre, solLeque),
        'sol-quica': movimento(atravessa(2), duracaoSolQuica, quadroSolQuica, solArco),
        'sol-nasce': movimento(atravessa(2), duracaoSolNasce, t => quadroSolNasce(t), solArco),
    },
};
