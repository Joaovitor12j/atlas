// Mascotes de folha de sprites (PNG em tira horizontal): especificação, linha do tempo e desenho do quadro.

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

// Folhas de sprites (sprites/<id>.png, quadros lado a lado): `quadros`, tamanho de cada um (`fw` x `fh`, em px da
// imagem), `chao` (a linha dos pés, em px a partir do topo do quadro) e `altura`, a do mascote em múltiplos do ícone.
// quanto o sprite afunda na doca, em ícones: os pés pousam no vidro, não na linha do topo
const PE_NA_DOCA = 0.25;

export const SPRITES = {
    gato: {arquivo: 'gato.png', quadros: 6, fw: 212, fh: 131, chao: 123, altura: 1.25},
};

// Gato (ou outro sprite que anda) atravessando a doca de ponta a ponta. A posição avança em velocidade quase constante
// (`velocidade` em ícones por segundo, com uma leve respirada) e o quadro é amarrado à distância percorrida
// (`passo` = comprimento do ciclo de quadros em larguras do sprite), então os pés não escorregam.
// Devolve {x, quadro, dir, escala, pe}: `x` em px dentro do actor de largura `largura` e `pe` quanto os pés afundam
// abaixo da linha do topo da doca (o vidro da doca tem uma folga em cima). null depois do fim.
export function quadroSprite(t, dir, spec, {largura, icone, velocidade, passo}) {
    t = Math.max(0, t);
    const escala = (icone * spec.altura) / spec.fh;
    const fw = spec.fw * escala;
    const dist = icone * velocidade * (t / 1000 + 0.12 * Math.sin(t / 900));
    if (dist >= largura + fw)
        return null;
    const ciclo = dist / (fw * passo);
    const quadro = Math.floor((ciclo % 1) * spec.quadros) % spec.quadros;
    const x = dir < 0 ? largura + fw / 2 - dist : -fw / 2 + dist;
    return {x, quadro, dir: dir < 0 ? -1 : 1, escala, pe: icone * PE_NA_DOCA};
}
