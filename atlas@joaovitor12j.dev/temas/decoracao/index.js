// Material da doca dos temas de pacote (Pixel, Materiais, Natal), portado dos protótipos em
// docs/design/pacotes-de-temas/*/index.html. Só Cairo: usado pelo dock (Shell) e pela prévia do app (GTK).
//
// Referencial comum (o mesmo de app/previa.js): o vidro vai de x a x + w e de y = -esp a y = 0, com a borda da
// tela em y = 0 e "para fora" em -y. O que passa do vidro (grama, telhados, neve, laço) fica em y < -esp.

import {geometriaTema, TEMAS_PIXEL} from '../logica.js';
import {MATERIAL} from './material.js';
import {docaPixel, PIXEL} from './pixel.js';

// =============================== Pixel ===============================

// =============================== Materiais ===============================

// =============================== API ===============================

export const pixelDe = id => TEMAS_PIXEL.includes(id);

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

// =============================== Efeitos ===============================
// Partes animadas, desenhadas por cima do vidro (caixa w x h) pelo motor de efeitos de mascotes.js; `t` em ms.
// Tudo é função do relógio, sem estado. Nenhuma luz pisca mais de 1 vez por segundo.

