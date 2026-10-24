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
    ['claude', 'Claude Code', 'Limites do plano: anel da sessão de 5 h e, por dentro, o da semana; o painel mostra quando cada um reinicia'],
    ['nota', 'Nota', 'Um recado fixo na doca; edite pelo clique ou nas opções gerais'],
];

// Grupos da aba Mascotes: [id, título]. Grupo sem mascote não aparece.
export const CATEGORIAS_MASCOTE = [
    ['hora', 'Hora do dia'],
    ['datas', 'Datas e temas'],
    ['eventos', 'Eventos do sistema'],
];

// [id, nome, descrição, categoria]
export const MASCOTES = [
    ['noel', 'Papai Noel', 'De 1 a 25 de dezembro, o Papai Noel sobe da doca, acena e ri com a barriga', 'datas'],
    ['boneco', 'Boneco de neve', 'De 1 a 25 de dezembro, um boneco de neve sobe da doca e balança ao vento', 'datas'],
    ['chama', 'Chama', 'Aparece em apuros quando o uso de memória passa do limite', 'eventos'],
    ['cuco', 'Cuco', 'Uma casinha sobe da doca e o cuco canta a hora', 'hora'],
    ['fantasma', 'Fantasma', 'De 24 a 31 de outubro, um fantasminha sobe da doca e dá um "bu!"', 'datas'],
    ['esqueleto', 'Esqueleto', 'De 24 a 31 de outubro, um esqueleto sobe da doca, acena e bate o queixo', 'datas'],
];
