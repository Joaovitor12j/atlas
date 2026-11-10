// Lente de ampliação da doca (conta pura).

// Escala de um ícone a `distancia` px do ponteiro: gaussiana entre 1 (longe) e `forca` (embaixo do ponteiro).
export function escalaLente(distancia, forca, largura) {
    return 1 + (forca - 1) * Math.exp(-(distancia * distancia) / (2 * largura * largura));
}
