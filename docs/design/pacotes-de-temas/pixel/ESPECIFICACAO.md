# Pacote Pixel

Protótipo: `index.html`. Quadro 36×26 px, até 12 cores por mascote, sem anti-aliasing, contorno escuro automático, escala só inteira.

## Temas
| Tema | Material | Indicador | Widget | Mascote |
|---|---|---|---|---|
| Vila | madeira, grama, flores | coração | pergaminho | Gato |
| Floresta | pedra com musgo, cipós, vagalumes | folha | cartão de musgo | Folhinha |
| Noite de lua | céu pontilhado, estrelas, telhados | estrela | cartão azul-noite | Coruja |
| Praia | areia, mar com ondas, conchas | estrela-do-mar | cartão azul-claro | Caranguejo |

## Mascotes e estados
| Mascote | Estados (quadros · fps · velocidade) |
|---|---|
| Gato | sentado 3, parado 4, andando 8·10·15 px/s, correndo 6·12·40, pulo 6, dormindo 4 |
| Folhinha | parada 5, andando 4·8·14, pulando 6, dormindo 4 |
| Coruja | parada 5, gingando 4·8·16, voando 4·8·26 (voa 9 px acima do chão), dormindo 4 |
| Caranguejo | parado 5, de lado 4·10·22 (sem virar), pinças 4·6, enterrado 4 |

Folha de sprites: botão "Baixar folha PNG" no protótipo (uma linha por estado, 36×26 por quadro).

## Critérios de aceitação
1. Cada mascote com 4 a 6 estados, todos com ciclo próprio.
2. Nenhum pé desliza mais de 1 px no andar e no correr.
3. Paleta de até 12 cores por mascote, sem anti-aliasing, escala inteira.
4. Cada tema muda material, borda, indicador e tile de widget.
5. Contraste do texto dos widgets de pelo menos 4,5:1 (WCAG AA).
6. Com "reduzir movimento" ligado, o mascote fica em pose estática.
7. Custo medido com `perf.js` não maior que o atual.
