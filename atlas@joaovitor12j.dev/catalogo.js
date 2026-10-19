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
    ['pomodoro', 'Pomodoro', 'Foco de 25 min, pausas de 5 e 15; clique para iniciar'],
    ['bateria', 'Bateria', 'Carga e tempo restante'],
    ['musica', 'Música', 'O que está tocando (qualquer player MPRIS) e os controles'],
];
