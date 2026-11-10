// Lógica pura dos temas: qual tema a doca mostra e as medidas dos temas de pacote (Pixel, Materiais, Natal).

// Tema que a doca mostra: o do ambiente atual, quando definido e válido (`validos` = ids do catálogo); senão o global.
export function temaEfetivo(amb, temaGlobal, validos) {
    return validos.includes(amb?.tema) ? amb.tema : temaGlobal;
}

// Temas pixel: a arte da doca tem 36 px de altura e o tile de app tem 20 px (protótipo em docs/design/pacotes-de-temas).
export const TEMAS_PIXEL = ['vila', 'floresta', 'lua', 'praia', 'nevepixel'];

// Temas de materiais: tile de 58 px, margem de 14 px e 18 px nas pontas.
export const TEMAS_MATERIAIS = ['aurora', 'carta', 'jardim', 'chuva', 'nevemat', 'vitrine', 'brasileiro'];

export const temaDecorado = id => TEMAS_PIXEL.includes(id) || TEMAS_MATERIAIS.includes(id);

// Centro do indicador abaixo do tile, em px do protótipo (materiais) e tamanho [largura, altura] dele.
const INDICADOR_MAT = {
    aurora: [6.5, 14, 14], carta: [7, 0, 0], jardim: [7, 12, 8], chuva: [7.5, 22, 10],
    nevemat: [12, 22, 22], vitrine: [8, 16, 20], brasileiro: [6.5, 20, 20],
};

// Medidas da doca de um tema decorado, proporcionais ao ícone, para bater com o protótipo: margens do vidro,
// espaço entre ícones, onde fica o indicador (distância da borda da tela até o centro dele) e o tamanho dele.
// `pixel` é o tamanho de um pixel da arte (temas pixel). Tema comum devolve null.
export function geometriaTema(id, icone) {
    if (TEMAS_PIXEL.includes(id)) {
        const p = icone / 20;
        return {
            pixel: p, padV: 8 * p, padH: 10 * p, gap: 5 * p, dotArea: 0,
            dotDepth: 4.5 * p, dotW: Math.round(5 * p), dotH: Math.round(5 * p), raio: 0,
        };
    }
    const ind = INDICADOR_MAT[id];
    if (!ind)
        return null;
    const k = icone / 58;
    return {
        pixel: 0, padV: 14 * k, padH: 18 * k, gap: 14 * k, dotArea: 0,
        dotDepth: (14 - ind[0]) * k, dotW: Math.round(ind[1] * k), dotH: Math.round(ind[2] * k),
        raio: {aurora: 28, carta: 6, jardim: 30, chuva: 22, nevemat: 22, vitrine: 16, brasileiro: 24}[id] * k,
    };
}
