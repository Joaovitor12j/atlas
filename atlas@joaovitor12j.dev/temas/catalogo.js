// Catálogo dos temas, para o dock (Shell) e para o app de configuração (GTK).
// Não importe nada de gi://St, Clutter ou resource:///org/gnome/shell aqui: o app de configuração roda fora do Shell.

// [id, nome, descrição]
export const TEMAS = [
    ['noite', 'Noite', 'Grafite-azulado, âmbar e verde-água'],
    ['papel', 'Papel', 'Creme com linhas finas'],
    ['cristal', 'Cristal', 'Vidro translúcido com blur'],
    ['neon', 'Neon', 'Preto com contorno ciano e magenta'],
    ['oceano', 'Oceano', 'Azul-marinho e azul-céu'],
    ['sakura', 'Sakura', 'Rosa-claro e cereja'],
    ['onix', 'Ônix', 'Preto liso, minimalista'],
    ['vila', 'Vila', 'Madeira clara e grama, indicador em coração'],
    ['floresta', 'Floresta', 'Pedra com musgo e vagalumes, indicador em folha'],
    ['lua', 'Noite de lua', 'Céu noturno pontilhado de estrelas sobre telhados'],
    ['praia', 'Praia', 'Areia e mar com ondas, indicador em estrela-do-mar'],
    ['aurora', 'Aurora', 'Vidro líquido com blur forte e manchas de aurora'],
    ['carta', 'Carta', 'Papel creme com moldura de tinta e carimbo vermelho'],
    ['jardim', 'Jardim', 'Vidro damasco com sol e pétalas caindo'],
    ['chuva', 'Chuva', 'Vidro escuro com bokeh e chuva escorrendo'],
    ['nevepixel', 'Noite de neve (pixel)', 'Céu azul-noite pixelado com neve e sincelos'],
    ['nevemat', 'Noite de neve (materiais)', 'Vidro de gelo fosco com neve acumulada'],
    ['vitrine', 'Vitrine', 'Papel de presente vermelho com fita dourada'],
    ['brasileiro', 'Natal brasileiro', 'Pôr do sol de verão, palmeiras e mar'],
];

// Pacotes de temas: [id, nome, [ids dos temas]]. Agrupa TEMAS na janela de preferências.
export const PACOTES = [
    ['classico', 'Clássico', ['noite', 'papel', 'cristal', 'neon', 'oceano', 'sakura', 'onix']],
    ['pixel', 'Pixel', ['vila', 'floresta', 'lua', 'praia']],
    ['materiais', 'Materiais', ['aurora', 'carta', 'jardim', 'chuva']],
    ['natal', 'Natal', ['nevepixel', 'nevemat', 'vitrine', 'brasileiro']],
];

// Cores por tema (as mesmas de temas.css; tests/estrutura.test.js confere). Usadas na prévia e nas miniaturas do app.
// fundo/borda/ponto/sep: vidro da doca, indicador e separador. txt: texto dos widgets. apps/appsIc: botão de apps.
// w0/w1/wb: gradiente e borda do vidro dos widgets. raio: cantos do vidro (22 se omitido). brilho: halo (Neon).
export const CORES_TEMA = {
    noite: {fundo: 'rgba(28, 34, 48, 0.92)', borda: 'rgba(255, 255, 255, 0.12)', ponto: '#3fb8a8', sep: 'rgba(255, 255, 255, 0.18)',
        txt: '#f2f2f7', apps: 'rgba(255, 255, 255, 0.12)', appsIc: '#f2f2f7', w0: 'rgba(255, 255, 255, 0.15)', w1: 'rgba(255, 255, 255, 0.05)', wb: 'rgba(255, 255, 255, 0.22)'},
    papel: {fundo: '#f6f1e5', borda: '#bdb298', ponto: '#b8741a', sep: '#bdb298', raio: 18,
        txt: '#2f2f2a', apps: 'rgba(60, 50, 30, 0.14)', appsIc: '#2f2f2a', w0: 'rgba(60, 50, 30, 0.12)', w1: 'rgba(60, 50, 30, 0.04)', wb: 'rgba(60, 50, 30, 0.24)'},
    cristal: {fundo: 'rgba(255, 255, 255, 0.18)', borda: 'rgba(255, 255, 255, 0.5)', ponto: '#ffffff', sep: 'rgba(255, 255, 255, 0.45)',
        txt: '#ffffff', apps: 'rgba(255, 255, 255, 0.16)', appsIc: '#ffffff', w0: 'rgba(255, 255, 255, 0.24)', w1: 'rgba(255, 255, 255, 0.08)', wb: 'rgba(255, 255, 255, 0.45)'},
    neon: {fundo: 'rgba(8, 6, 18, 0.94)', borda: '#19e6ff', ponto: '#ff2bd6', sep: 'rgba(25, 230, 255, 0.55)', brilho: '#19e6ff',
        txt: '#19e6ff', apps: 'rgba(25, 230, 255, 0.12)', appsIc: '#19e6ff', w0: 'rgba(255, 255, 255, 0.15)', w1: 'rgba(255, 255, 255, 0.05)', wb: 'rgba(255, 43, 214, 0.55)'},
    oceano: {fundo: 'rgba(8, 34, 62, 0.92)', borda: 'rgba(56, 189, 248, 0.45)', ponto: '#7dd3fc', sep: 'rgba(125, 211, 252, 0.35)',
        txt: '#e0f2fe', apps: 'rgba(56, 189, 248, 0.18)', appsIc: '#bae6fd', w0: 'rgba(125, 211, 252, 0.16)', w1: 'rgba(125, 211, 252, 0.05)', wb: 'rgba(56, 189, 248, 0.35)'},
    sakura: {fundo: '#fbeff0', borda: '#e8b4bc', ponto: '#d6456b', sep: '#e8b4bc', raio: 20,
        txt: '#4a2a33', apps: 'rgba(214, 69, 107, 0.12)', appsIc: '#8a2f48', w0: 'rgba(214, 69, 107, 0.10)', w1: 'rgba(214, 69, 107, 0.03)', wb: 'rgba(214, 69, 107, 0.28)'},
    onix: {fundo: 'rgba(14, 14, 16, 0.96)', borda: 'rgba(255, 255, 255, 0.08)', ponto: '#ffffff', sep: 'rgba(255, 255, 255, 0.14)',
        txt: '#ededed', apps: 'rgba(255, 255, 255, 0.09)', appsIc: '#ededed', w0: 'rgba(255, 255, 255, 0.09)', w1: 'rgba(255, 255, 255, 0.02)', wb: 'rgba(255, 255, 255, 0.14)'},
    // Temas de pacote: o vidro, os tiles e o indicador vêm de decoracao.js (protótipos em docs/design/pacotes-de-temas);
    // aqui ficam a cor de apoio do vidro (sombra), o ponto (miniaturas), o separador, os widgets e o botão de apps.
    vila: {fundo: 'transparent', borda: '#6b4220', ponto: '#e0314b', sep: '#6b4220', raio: 0,
        txt: '#4a2c14', apps: '#f3e2b3', appsIc: '#4a2c14', w0: '#f3e2b3', w1: '#f3e2b3', wb: '#6b4220'},
    floresta: {fundo: 'transparent', borda: '#1b2b23', ponto: '#8fd96a', sep: '#1b2b23', raio: 0,
        txt: '#243a2c', apps: '#3d5e48', appsIc: '#e9f3d2', w0: '#d5e8bd', w1: '#d5e8bd', wb: '#7aa06a'},
    lua: {fundo: 'transparent', borda: '#4a53a8', ponto: '#ffd36b', sep: '#4a53a8', raio: 0,
        txt: '#fff2c9', apps: '#1f2655', appsIc: '#fff2c9', w0: '#161b40', w1: '#161b40', wb: '#6b72c4'},
    praia: {fundo: 'transparent', borda: '#c9a45f', ponto: '#e8744b', sep: '#c9a45f', raio: 0,
        txt: '#14405a', apps: '#e6f6fa', appsIc: '#14405a', w0: '#e6f6fa', w1: '#e6f6fa', wb: '#c9a45f'},
    aurora: {fundo: '#9b5bd0', borda: 'rgba(255, 255, 255, 0.42)', ponto: '#ffffff', sep: 'rgba(255, 255, 255, 0.35)', raio: 28,
        txt: '#ffffff', apps: 'rgba(255, 255, 255, 0.22)', appsIc: '#ffffff', w0: 'rgba(15, 10, 50, 0.32)', w1: 'rgba(15, 10, 50, 0.32)', wb: 'rgba(255, 255, 255, 0.22)'},
    carta: {fundo: '#f1e7cf', borda: '#27261f', ponto: '#b8322a', sep: 'rgba(39, 38, 31, 0.5)', raio: 6,
        txt: '#27261f', apps: 'rgba(255, 255, 255, 0.35)', appsIc: '#27261f', w0: 'rgba(255, 255, 255, 0.35)', w1: 'rgba(255, 255, 255, 0.35)', wb: '#27261f'},
    jardim: {fundo: '#ffc59c', borda: 'rgba(255, 255, 255, 0.6)', ponto: '#4f8a45', sep: 'rgba(120, 50, 40, 0.28)', raio: 30,
        txt: '#4a2c1a', apps: '#fff3e0', appsIc: '#5b3a22', w0: 'rgba(255, 250, 240, 0.7)', w1: 'rgba(255, 250, 240, 0.7)', wb: 'rgba(255, 255, 255, 0.7)'},
    chuva: {fundo: '#121d33', borda: 'rgba(160, 200, 255, 0.28)', ponto: '#55ffff', sep: 'rgba(160, 200, 255, 0.3)',
        txt: '#d9ecff', apps: 'rgba(255, 255, 255, 0.06)', appsIc: '#5ff0ff', w0: 'rgba(255, 255, 255, 0.07)', w1: 'rgba(255, 255, 255, 0.07)', wb: 'rgba(160, 200, 255, 0.25)'},
    nevepixel: {fundo: 'transparent', borda: '#8fb4e8', ponto: '#ffffff', sep: '#8fb4e8', raio: 0,
        txt: '#f4f8ff', apps: '#1c3a73', appsIc: '#f4f8ff', w0: '#0f1f44', w1: '#0f1f44', wb: '#8fb4e8'},
    nevemat: {fundo: '#2d5ba6', borda: 'rgba(255, 255, 255, 0.5)', ponto: '#ffffff', sep: 'rgba(255, 255, 255, 0.35)',
        txt: '#eaf4ff', apps: 'rgba(255, 255, 255, 0.18)', appsIc: '#eaf4ff', w0: 'rgba(10, 30, 80, 0.45)', w1: 'rgba(10, 30, 80, 0.45)', wb: 'rgba(255, 255, 255, 0.35)'},
    vitrine: {fundo: '#bd1e2e', borda: '#c9971f', ponto: '#fff6e0', sep: 'transparent', raio: 16,
        txt: '#7a1220', apps: '#fff4dc', appsIc: '#7a1220', w0: '#fff4dc', w1: '#fff4dc', wb: '#c9971f'},
    brasileiro: {fundo: '#ff9a7c', borda: 'rgba(255, 255, 255, 0.6)', ponto: '#e5333f', sep: 'rgba(90, 40, 50, 0.3)',
        txt: '#5b2a22', apps: 'rgba(255, 255, 255, 0.85)', appsIc: '#5b2a22', w0: 'rgba(255, 248, 235, 0.75)', w1: 'rgba(255, 248, 235, 0.75)', wb: 'rgba(255, 255, 255, 0.8)'},
};
