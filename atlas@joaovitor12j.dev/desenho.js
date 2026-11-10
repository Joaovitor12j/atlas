// Desenho dos widgets com Cairo. Só recebe o contexto `cr`, sem St nem Clutter, para poder ser
// visto fora do Shell (ver tests/previa-desenho.js) e para o parser de cor ser testado com node.

// Para onde o mascote olha: {x, y} de -1 a 1 (o motor passa o ponteiro suavizado; sem ele, olha em frente).

// ----- Ícones do tempo (widget Clima) -----

// ----- Cuco -----
// Relógio de cuco da Floresta Negra: telhado de telhas com friso entalhado, porta em arco, mostrador com a hora do
// disparo e folhas de carvalho nas laterais. Tudo em formas simples do Cairo, sem imagem.

// ----- Mascotes do clima (frio e calor) -----
// Todos recebem `ctx` com `base` (a linha do topo da doca dentro do actor; o que fica abaixo dela é desenhado sobre a
// doca) e `icone` (o tamanho dos ícones, a unidade dos desenhos). Os quadros vêm de logica.js.

// ----- Mascotes novos: coruja, pilha, satélite e tomate -----
// Todos no retângulo (0, 0, w, h), de pé na borda de baixo, com `q.sobe` (0 a 1) subindo de trás dela, como os outros.

