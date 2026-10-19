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

// [id, nome, descrição]
export const WIDGETS = [
    ['relogio', 'Relógio', 'Hora e data'],
    ['pomodoro', 'Pomodoro', 'Foco e pausas; as durações ficam nas opções gerais'],
    ['bateria', 'Bateria', 'Carga e tempo restante'],
    ['musica', 'Música', 'O que está tocando (qualquer player MPRIS) e os controles'],
    ['progresso', 'Progresso do tempo', 'Quanto do dia, da semana, do mês e do ano já passou'],
    ['cronometro', 'Cronômetro', 'Conta para cima, com voltas'],
    ['timer', 'Timer', 'Contagem regressiva; a duração fica nas opções gerais'],
    ['atividade', 'Atividade', 'Processador e memória em uso'],
    ['rede', 'Rede', 'Velocidade de download e upload'],
    ['contagem', 'Contagem regressiva', 'Quantos dias faltam para uma data; nome e data nas opções gerais'],
    ['nota', 'Nota', 'Um recado fixo na doca; edite pelo clique ou nas opções gerais'],
];
