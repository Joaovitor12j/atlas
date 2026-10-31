// Listas compartilhadas entre o dock (Shell) e a janela de preferências (GTK).
// Não importe nada de gi://St, Clutter ou resource:///org/gnome/shell aqui: o prefs.js roda fora do Shell.

// [id, nome, descrição]
export const TEMAS = [
    ['noite', 'Noite', 'Grafite-azulado, âmbar e verde-água'],
    ['papel', 'Papel', 'Creme com linhas finas'],
    ['cristal', 'Cristal', 'Vidro translúcido com blur'],
    ['neon', 'Neon', 'Preto com contorno ciano e magenta'],
    ['halloween', 'Halloween', 'Roxo escuro e laranja'],
    ['natal', 'Natal', 'Vinho e verde-pinheiro'],
];

// Cores do fundo do dock por tema (as mesmas de temas.css; tests/estrutura.test.js confere). Usadas na prévia das prefs.
export const CORES_TEMA = {
    noite: {fundo: 'rgba(28, 34, 48, 0.92)', borda: 'rgba(255, 255, 255, 0.12)', ponto: '#3fb8a8', sep: 'rgba(255, 255, 255, 0.18)'},
    papel: {fundo: '#f6f1e5', borda: '#bdb298', ponto: '#b8741a', sep: '#bdb298'},
    cristal: {fundo: 'rgba(255, 255, 255, 0.18)', borda: 'rgba(255, 255, 255, 0.5)', ponto: '#ffffff', sep: 'rgba(255, 255, 255, 0.45)'},
    neon: {fundo: 'rgba(8, 6, 18, 0.94)', borda: '#19e6ff', ponto: '#ff2bd6', sep: 'rgba(25, 230, 255, 0.55)'},
    halloween: {fundo: 'rgba(36, 18, 52, 0.94)', borda: '#ff7a1a', ponto: '#ff7a1a', sep: 'rgba(255, 122, 26, 0.5)'},
    natal: {fundo: 'rgba(70, 16, 28, 0.94)', borda: '#2f8f4e', ponto: '#f4d35e', sep: 'rgba(47, 143, 78, 0.8)'},
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
    ['cuco', 'Cuco', 'Uma casinha sobe da doca e o cuco canta a hora', 'hora'],
    ['fantasma', 'Fantasma', 'De 24 a 31 de outubro, um fantasminha sobe da doca e dá um "bu!"', 'datas'],
    ['esqueleto', 'Esqueleto', 'De 24 a 31 de outubro, um esqueleto sobe da doca, acena e bate o queixo', 'datas'],
];
