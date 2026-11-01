# Pacote Natal

Protótipo: `index.html`. Mistura os dois estilos: Noite de neve existe em pixel e em materiais; Vitrine e Natal brasileiro são de materiais. Decisões do João em 2026-11-01: temas Noite de neve, Vitrine e Natal brasileiro; efeitos de época ligados por padrão (com chave para desligar); mascotes novos por tema. Lareira ficou de fora desta rodada.

## Briefing
- **Problema do tema antigo:** vinho e verde-pinheiro eram só paleta, sem objeto que dissesse "Natal".
- **Regra:** cada tema carrega pelo menos dois dos quatro objetos do Natal: luzinhas, neve, presentes e laços, guirlanda.
- **Diferencial:** o Natal brasileiro é de calor (verão, praia). A referência de mercado só faz neve.
- **Direitos:** Papai Noel, rena e boneco de neve são domínio comum. Evitar personagens de filme; a rena não tem nariz vermelho de propósito.

## Temas
| Tema | Estilo | Material | Efeito (ligado por padrão) | Indicador | Mascote |
|---|---|---|---|---|---|
| Noite de neve (pixel) | pixel | céu azul-noite, borda de neve com sincelos | neve caindo, fio de luzinhas que piscam devagar | floco de neve | Boneco de neve |
| Noite de neve (materiais) | materiais | vidro de gelo fosco, neve acumulada em cima, sincelos | neve caindo na cena toda, fio de luzinhas que piscam devagar | floco de neve brilhando | Boneco de neve ilustrado |
| Vitrine | materiais | papel de presente vermelho, fita dourada, laço no topo, tiles em caixinhas | brilhos dourados | etiqueta de presente | Rena |
| Natal brasileiro | materiais | vidro cor de areia sobre pôr do sol, palmeiras, mar | guirlanda com pisca-pisca e bolas, mar subindo e descendo | bola de Natal | Papai Noel |

## Mascotes e estados
| Mascote | Estados | Notas de movimento |
|---|---|---|
| Boneco de neve ilustrado (SVG) | parado, saltitando, acenando, dormindo | salto de 0,7 s com gingado; braço acena de −10° a −62°; cachecol balança |
| Boneco de neve (pixel 36×26) | parado 4, andando 4·8 fps·12 px/s, acenando 4·6 fps, dormindo 4 | gingado de lado a lado; gorro cai ao dormir |
| Rena (SVG) | parada, trotando, sininho, dormindo | pernas ±24° em 0,8 s; cabeça balança ±13° tocando o sino, com notas subindo |
| Papai Noel (SVG) | acenando, passeando com a prancha, rindo ("Ho! Ho!"), dormindo | pernas ±20° em 0,9 s e gingado; barriga chacoalha ao rir |

Folha de sprites do boneco de neve: botão "Baixar folha PNG" no protótipo.

## Critérios de aceitação
1. Reconhecível como Natal em 3 segundos, sem ler o nome.
2. Efeitos de época ligados por padrão, com chave para desligar; pausam com a doca escondida e com "reduzir movimento".
3. Nenhum elemento pisca mais de 3 vezes por segundo (no protótipo, no máximo 1).
4. Contraste de texto dos widgets de pelo menos 4,5:1 em todos os temas.
5. Mascotes com 4 estados, pés sem deslizar nos que andam.
6. Custo medido com `perf.js` e não maior que o do pacote Materiais.

## Pendências
- Lareira (pixel, com gato dormindo ao pé do fogo) ficou como possível 4º tema.
- Ativar o tema só em época de Natal (dezembro) ou deixar sempre disponível: decisão de produto.
- Implementação com o desenvolvimento.
