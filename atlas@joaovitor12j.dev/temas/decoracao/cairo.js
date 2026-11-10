// Peças de Cairo dos temas de pacote: cores CSS, retângulo arredondado, gradientes e a aresta do vidro.

// '#rrggbb' ou 'rgba(r, g, b, a)' -> [r, g, b, a] de 0 a 1.
import Cairo from 'gi://cairo';

export function rgba(css, alfa = 1) {
    if (css.startsWith('#')) {
        const n = parseInt(css.slice(1), 16);
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alfa];
    }
    const [r, g, b, a = 1] = css.slice(css.indexOf('(') + 1, -1).split(',').map(Number);
    return [r / 255, g / 255, b / 255, a * alfa];
}

export const fonte = (cr, css, alfa = 1) => cr.setSourceRGBA(...rgba(css, alfa));

export function retangulo(cr, x, y, w, h, r) {
    const raio = Math.max(0, Math.min(r, h / 2, w / 2));
    cr.newSubPath();
    cr.arc(x + w - raio, y + raio, raio, -Math.PI / 2, 0);
    cr.arc(x + w - raio, y + h - raio, raio, 0, Math.PI / 2);
    cr.arc(x + raio, y + h - raio, raio, Math.PI / 2, Math.PI);
    cr.arc(x + raio, y + raio, raio, Math.PI, Math.PI * 1.5);
    cr.closePath();
}

// Gradiente linear com paradas [[pos, css, alfa?], ...].
export function linear(x0, y0, x1, y1, paradas) {
    const g = new Cairo.LinearGradient(x0, y0, x1, y1);
    for (const [pos, css, a = 1] of paradas)
        g.addColorStopRGBA(pos, ...rgba(css, a));
    return g;
}

export function radial(cx, cy, r, paradas) {
    const g = new Cairo.RadialGradient(cx, cy, 0, cx, cy, r);
    for (const [pos, css, a = 1] of paradas)
        g.addColorStopRGBA(pos, ...rgba(css, a));
    return g;
}

// Ângulo de gradiente do CSS (0deg = para cima, 90deg = para a direita) numa caixa w x h.
export function linearCss(w, h, graus, paradas) {
    const a = graus * Math.PI / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const meio = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    return linear(w / 2 - dx * meio, h / 2 - dy * meio, w / 2 + dx * meio, h / 2 + dy * meio, paradas);
}

// Mesmo gerador dos protótipos: o padrão (veios, pedras, estrelas) sai igual em toda abertura.
export const rng = semente => () => {
    let s = semente;
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    semente = s;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
};

// Aresta de vidro: linha de 1 px na cor da borda e um realce claro em cima (o "inset 0 1px 0" do CSS).
export function aresta(cr, w, h, r, borda, realceTopo = 0, realceBase = 0) {
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
