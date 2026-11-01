// Listas compartilhadas entre o dock (Shell) e a janela de preferências (GTK).
// Não importe nada de gi://St, Clutter ou resource:///org/gnome/shell aqui: o prefs.js roda fora do Shell.

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
    // Cores extraídas por amostragem de docs/design/pacotes-de-temas/*/previa.png (pixel real dos protótipos).
    vila: {fundo: '#a9763f', borda: '#5c3a1a', ponto: '#ff8fb0', sep: 'rgba(92, 58, 26, 0.6)', raio: 10,
        txt: '#f6ead0', apps: 'rgba(95, 158, 69, 0.3)', appsIc: '#f6ead0', w0: 'rgba(246, 234, 208, 0.3)', w1: 'rgba(107, 66, 32, 0.2)', wb: '#5c3a1a'},
    floresta: {fundo: '#2b4538', borda: '#5f9a4e', ponto: '#8fd96a', sep: 'rgba(95, 154, 78, 0.5)', raio: 10,
        txt: '#d5e8bd', apps: 'rgba(95, 154, 78, 0.3)', appsIc: '#d5e8bd', w0: 'rgba(213, 232, 189, 0.25)', w1: 'rgba(53, 84, 67, 0.25)', wb: '#5f9a4e'},
    lua: {fundo: '#161b40', borda: '#6b72c4', ponto: '#ffd36b', sep: 'rgba(107, 114, 196, 0.5)', raio: 10,
        txt: '#ffe9a8', apps: 'rgba(107, 114, 196, 0.3)', appsIc: '#ffe9a8', w0: 'rgba(107, 114, 196, 0.25)', w1: 'rgba(22, 27, 64, 0.3)', wb: '#6b72c4'},
    praia: {fundo: '#ecdfb4', borda: '#4fb8d6', ponto: '#ff8a4a', sep: 'rgba(79, 184, 214, 0.5)', raio: 10,
        txt: '#2f2f2a', apps: 'rgba(79, 184, 214, 0.2)', appsIc: '#2f2f2a', w0: 'rgba(255, 255, 255, 0.4)', w1: 'rgba(79, 184, 214, 0.1)', wb: '#4fb8d6'},
    aurora: {fundo: '#4a3e7a', fundo2: '#e6728e', borda: 'rgba(255, 255, 255, 0.4)', ponto: '#ffffff', sep: 'rgba(255, 255, 255, 0.35)',
        txt: '#fff5fa', apps: 'rgba(255, 255, 255, 0.2)', appsIc: '#ffffff', w0: 'rgba(255, 255, 255, 0.3)', w1: 'rgba(255, 255, 255, 0.08)', wb: 'rgba(255, 255, 255, 0.45)'},
    carta: {fundo: '#f3ead2', borda: '#8a6d4a', ponto: '#c23b3b', sep: '#8a6d4a', raio: 10,
        txt: '#3a2c1a', apps: 'rgba(138, 109, 74, 0.14)', appsIc: '#3a2c1a', w0: 'rgba(138, 109, 74, 0.1)', w1: 'rgba(138, 109, 74, 0.03)', wb: 'rgba(194, 59, 59, 0.4)'},
    jardim: {fundo: '#fdcd91', fundo2: '#bc5c5a', borda: '#e0a24a', ponto: '#5fae4e', sep: 'rgba(58, 36, 22, 0.25)', raio: 22,
        txt: '#3a2416', apps: 'rgba(58, 36, 22, 0.14)', appsIc: '#3a2416', w0: 'rgba(255, 255, 255, 0.3)', w1: 'rgba(255, 255, 255, 0.06)', wb: 'rgba(224, 162, 74, 0.5)'},
    chuva: {fundo: '#191328', borda: '#39e0ff', ponto: '#ff6ec7', sep: 'rgba(57, 224, 255, 0.4)', brilho: '#39e0ff',
        txt: '#d8f6ff', apps: 'rgba(57, 224, 255, 0.14)', appsIc: '#d8f6ff', w0: 'rgba(255, 110, 199, 0.16)', w1: 'rgba(57, 224, 255, 0.08)', wb: 'rgba(57, 224, 255, 0.4)'},
    nevepixel: {fundo: '#1c3a73', borda: '#f4f8ff', ponto: '#f4f8ff', sep: 'rgba(244, 248, 255, 0.35)', raio: 10,
        txt: '#f4f8ff', apps: 'rgba(244, 248, 255, 0.15)', appsIc: '#f4f8ff', w0: 'rgba(244, 248, 255, 0.22)', w1: 'rgba(16, 35, 74, 0.3)', wb: 'rgba(244, 248, 255, 0.4)'},
    nevemat: {fundo: '#213866', fundo2: '#2257ab', borda: 'rgba(255, 255, 255, 0.5)', ponto: '#f4f8ff', sep: 'rgba(255, 255, 255, 0.4)',
        txt: '#eaf6ff', apps: 'rgba(255, 255, 255, 0.18)', appsIc: '#eaf6ff', w0: 'rgba(255, 255, 255, 0.22)', w1: 'rgba(255, 255, 255, 0.06)', wb: 'rgba(255, 255, 255, 0.4)'},
    vitrine: {fundo: '#d22d38', borda: '#ffd448', ponto: '#fff6e0', sep: 'rgba(255, 212, 72, 0.55)', raio: 10,
        txt: '#fff6e0', apps: 'rgba(255, 212, 72, 0.3)', appsIc: '#fff6e0', w0: 'rgba(255, 255, 255, 0.2)', w1: 'rgba(255, 255, 255, 0.05)', wb: 'rgba(255, 212, 72, 0.55)'},
    brasileiro: {fundo: '#9d398b', fundo2: '#ffa064', borda: '#269ab0', ponto: '#ffd23f', sep: 'rgba(38, 154, 176, 0.5)',
        txt: '#fff3e0', apps: 'rgba(38, 154, 176, 0.25)', appsIc: '#fff3e0', w0: 'rgba(255, 243, 224, 0.2)', w1: 'rgba(255, 243, 224, 0.06)', wb: 'rgba(38, 154, 176, 0.5)'},
};

// [id, nome, descrição, tem versão larga?]
export const WIDGETS = [
    ['relogio', 'Relógio', 'De ponteiros, ou digital na versão larga; o clique abre o calendário do mês', true],
    ['pomodoro', 'Pomodoro', 'Foco e pausas; as durações ficam nas opções gerais'],
    ['bateria', 'Bateria', 'Anel com a carga e o tempo restante; pisca quando está baixa'],
    ['musica', 'Música', 'Capa e controles de qualquer player (MPRIS); a versão larga mostra título e progresso', true],
    ['progresso', 'Progresso do tempo', 'Quatro anéis: dia, semana, mês e ano'],
    ['cronometro', 'Cronômetro', 'Conta para cima, com voltas'],
    ['timer', 'Timer', 'Contagem regressiva; a duração fica nas opções gerais'],
    ['atividade', 'Atividade', 'Anéis de CPU e memória; a versão larga traz o gráfico dos últimos minutos', true],
    ['rede', 'Rede', 'Download e upload com gráfico; a versão larga dá mais espaço a ele', true],
    ['contagem', 'Contagem regressiva', 'Quantos dias faltam para uma data; nome e data nas opções gerais'],
    ['clipboard', 'Área de transferência', 'Histórico do que você copiou (só texto, só na memória); os fixados ficam salvos'],
    ['slack', 'Slack', 'O ícone do Slack com um selo quando há mensagens não lidas; o clique abre o Slack'],
    ['clima', 'Clima', 'Temperatura e o tempo agora (Open-Meteo); o clique abre as próximas horas e 5 dias. A cidade fica nas opções gerais', true],
    ['nota', 'Nota', 'Um recado fixo na doca; edite pelo clique ou nas opções gerais'],
];

// Grupos da aba Mascotes: [id, título]. Grupo sem mascote não aparece.
export const CATEGORIAS_MASCOTE = [
    ['hora', 'Hora do dia'],
    ['datas', 'Datas e temas'],
    ['eventos', 'Eventos do sistema'],
    ['clima', 'Clima'],
];

// [id, nome, descrição, categoria]
export const MASCOTES = [
    ['noel', 'Papai Noel', 'De 1 a 25 de dezembro, o Papai Noel sobe da doca, acena e ri com a barriga', 'datas'],
    ['boneco', 'Boneco de neve', 'De 1 a 25 de dezembro, um boneco de neve sobe da doca e balança ao vento', 'datas'],
    ['calor', 'Calor', 'Aparece quando a temperatura da cidade do widget Clima passa do limite: picolé derretendo, sol atravessando a doca ou sol de óculos se abanando', 'clima'],
    ['frio', 'Frio', 'Aparece quando a temperatura da cidade do widget Clima cai do limite: pinguim no tobogã, neve acumulando ou boneco pendurado tremendo', 'clima'],
    ['chama', 'Chama', 'Aparece em apuros quando o uso de memória passa do limite', 'eventos'],
    ['gato', 'Gato', 'Um gato laranja (sprite desenhado à mão) atravessa a doca caminhando', 'hora'],
    ['coruja', 'Coruja', 'De madrugada, uma corujinha sobe da doca dormindo, acorda, pisca e volta a dormir', 'hora'],
    ['pilha', 'Pilha cansada', 'Aparece pedindo tomada quando a bateria está descarregando e chega ao limite', 'eventos'],
    ['satelite', 'Satélite perdido', 'Aparece procurando sinal quando a rede cai', 'eventos'],
    ['tomate', 'Tomate', 'Comemora com confete quando um foco do widget Pomodoro termina', 'eventos'],
    ['cuco', 'Cuco', 'Uma casinha sobe da doca e o cuco canta a hora', 'hora'],
    ['fantasma', 'Fantasma', 'De 24 a 31 de outubro, um fantasminha sobe da doca e dá um "bu!"', 'datas'],
    ['esqueleto', 'Esqueleto', 'De 24 a 31 de outubro, um esqueleto sobe da doca, acena e bate o queixo', 'datas'],
];

// Movimentos que cada mascote pode fazer ([id, nome]); o id é o valor da chave `<mascote>-movimento` (ver o schema).
// "sortear" não entra aqui: é o padrão de todos e escolhe um por aparição.
export const MOVIMENTOS = {
    gato: [['caminha', 'Caminha pela doca'], ['corre', 'Corre pela doca']],
    coruja: [['sobe', 'Sobe dormindo'], ['salta', 'Salta pela doca']],
    pilha: [['sobe', 'Sobe da doca'], ['arrasta', 'Se arrasta pela doca']],
    satelite: [['sobe', 'Sobe da doca'], ['deriva', 'Deriva pela doca']],
    tomate: [['sobe', 'Sobe da doca'], ['pula', 'Pula pela doca']],
    cuco: [['casa', 'Casinha que sobe'], ['passeia', 'Casinha passeando'], ['voa', 'Pássaro voando']],
    fantasma: [['sobe', 'Sobe da doca'], ['flutua', 'Flutua pela doca'], ['zigue', 'Zigue-zague']],
    esqueleto: [['sobe', 'Sobe da doca'], ['caminha', 'Caminha pela doca'], ['danca', 'Dança']],
    noel: [['sobe', 'Sobe da doca'], ['passeia', 'Passeia pela doca'], ['pula', 'Pula de alegria']],
    boneco: [['sobe', 'Sobe da doca'], ['desliza', 'Desliza pela doca'], ['pula', 'Pula pela doca']],
    chama: [['sobe', 'Sobe da doca'], ['salta', 'Salta pela doca'], ['corre', 'Corre pela doca']],
    calor: [['picole', 'Picolé derretendo'], ['sol-arco', 'Sol atravessando'], ['sol-leque', 'Sol abanando'], ['sol-corre', 'Sol correndo'], ['sol-quica', 'Sol quicando'], ['sol-nasce', 'Sol nascendo']],
    frio: [['pinguim', 'Pinguim no tobogã'], ['neve', 'Neve acumulando'], ['pendurado', 'Pendurado tremendo'], ['pinguim-pula', 'Pinguim pulando'], ['pinguim-anda', 'Pinguim andando']],
};
