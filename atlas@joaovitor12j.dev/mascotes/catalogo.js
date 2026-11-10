// Catálogo dos mascotes, para o dock (Shell) e para o app de configuração (GTK).
// Não importe nada de gi://St, Clutter ou resource:///org/gnome/shell aqui: o app de configuração roda fora do Shell.

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
