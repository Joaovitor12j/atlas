// A doca de um monitor (DockView) é grande; cada responsabilidade vive num arquivo próprio como uma classe cujos
// métodos são copiados para o protótipo da DockView. Os métodos continuam usando `this` (o estado da doca).
export function misturar(alvo, ...fontes) {
    for (const fonte of fontes) {
        for (const nome of Object.getOwnPropertyNames(fonte.prototype)) {
            if (nome === 'constructor')
                continue;
            if (Object.hasOwn(alvo.prototype, nome))
                throw new Error(`método ${nome} definido duas vezes em ${alvo.name}`);
            Object.defineProperty(alvo.prototype, nome, Object.getOwnPropertyDescriptor(fonte.prototype, nome));
        }
    }
}
