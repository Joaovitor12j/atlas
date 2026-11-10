// Lógica pura da Área de transferência: histórico sem repetição e resumo do texto.

// Histórico da área de transferência: o texto mais recente primeiro, sem repetir, no máximo `max` itens.
// Texto vazio ou maior que `maxChars` não entra (cortar mudaria o que o usuário copiou).
export function registrarCopia(historico, texto, {max = 20, maxChars = 5000} = {}) {
    if (typeof texto !== 'string' || !texto.trim() || texto.length > maxChars)
        return historico;
    return [texto, ...historico.filter(t => t !== texto)].slice(0, max);
}

// Primeira linha, sem espaços repetidos, cortada em `max` caracteres com reticências.
export function resumirTexto(texto, max = 50) {
    const linha = (texto ?? '').trim().split(/\r?\n/)[0].replace(/\s+/g, ' ').trim();
    return linha.length > max ? `${linha.slice(0, max - 1)}…` : linha;
}
