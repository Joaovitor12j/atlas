// Tile de cada app (o quadrado atrás do ícone) dos temas de pacote.

// Cores do tile de cada app nos temas que variam por posição (como no protótipo, de 5 em 5).
import {VOLTA} from '../../nucleo/matematica.js';
import {aresta, fonte, linear, linearCss, retangulo} from './cairo.js';
import {pixelDe} from './index.js';
import {PIXEL, pontos} from './pixel.js';

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
