# Pacote Materiais

Protótipo: `index.html`. Mascotes em SVG com partes articuladas; efeitos em CSS (blur, gradientes, partículas).

## Temas
| Tema | Material e luz | Efeito ambiente | Indicador | Mascote |
|---|---|---|---|---|
| Aurora | vidro líquido, blur forte, borda de luz | manchas de aurora derivando | ponto de luz | Água-viva |
| Carta | papel creme, moldura dupla de tinta, régua, rosa dos ventos | nenhum (calmo) | carimbo vermelho | Gaivota |
| Jardim | vidro damasco, sol no canto, copa de folhas | pétalas caindo, sol pulsando | folha | Gato |
| Chuva | vidro escuro, bokeh rosa/ciano/âmbar | chuva e gotas escorrendo | traço neon | Sapo |

## Mascotes e estados
| Mascote | Estados | Pivôs e ciclos principais |
|---|---|---|
| Água-viva | flutuando, nadando, brilhando, dormindo | sino pulsa em 3,4 s (0,95 s nadando); 5 tentáculos ondulando com atrasos distintos |
| Gaivota | parada, andando, voando, dormindo | pernas giram no quadril em 0,8 s, ±24°; asas batem em 0,45 s, de −28° a 42° |
| Gato | parado, andando, correndo, dormindo | pernas ±22° em 0,8 s (±38° em 0,5 s correndo); rabo, orelha e piscada independentes |
| Sapo | parado, pulando, coaxando, dormindo | salto de 1,1 s com agachar, esticar e pousar; papo infla 1,6× ao coaxar; guarda-chuva balança |

## Critérios de aceitação
1. Cada tema muda material, luz, efeito ambiente e indicador do ativo.
2. Efeitos ambientes pausam com a doca escondida e com "reduzir movimento" ligado.
3. Contraste do texto dos widgets de pelo menos 4,5:1 em todos os temas.
4. Mascotes com 4 estados, partes articuladas e pés sem deslizar nos que andam.
5. Fallback sem blur para máquinas fracas.
6. Custo medido com `perf.js` e aceito antes de entrar na doca real.
