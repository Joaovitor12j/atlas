# ATLAS · App de configuração: direção visual "Palco" (issue #17)

Mockup: `app-configuracao.html` (abrir no navegador; abas, lente, tema, indicador, posição e sliders funcionam). Capturas: `atlas-*.png`.
Visual novo, independente do antigo site do projeto (nada de grafite/âmbar/grade de coordenadas).

## Princípios
1. **A doca ao vivo é o herói.** Palco fixo no topo, visível em todas as abas; toda mudança aparece ali na hora.
2. **Escolher vendo, não lendo.** Tema, posição, indicador e widgets são seletores visuais, não ComboRows.
3. **Uma ideia por cartão.** Grade de 12 colunas, cartões com título e uma frase de apoio.
4. **Sem cadastro de opções escondidas**: busca no topo filtra cartões e linhas.

## Tokens (libadwaita 1.5: `@define-color`)
| Token | Valor | Uso |
|---|---|---|
| bg | `#0c1a1f` | fundo da janela |
| surf / surf2 | `#13262d` / `#1a323a` | cartões / itens dentro de cartões |
| line / line2 | `#25424b` / `#31565f` | divisórias / bordas de controle |
| tx / tx2 / tx3 | `#e9f3f1` / `#9bb7b6` / `#6b8a8c` | texto principal / apoio / rótulos |
| acc | `#ff6b4a` (texto sobre ele `#2a0d06`) | seleção, switch ligado, ação primária |
| ok | `#5fd6a8` | estado "ligado/na doca" |
| foco | `#ffd2c6` | anel de foco 2 px |

Contraste: tx sobre bg ≈ 15:1; tx2 sobre surf ≈ 6,6:1; acc-ink sobre acc ≈ 7:1 (todos ≥ AA). tx3 só em rótulos ≥ 10,5 px em caixa-alta, nunca em texto de leitura.
Raios: janela 16, cartão 14, controle 9–12. Fontes: Sora (títulos, rótulos) + Hanken Grotesk (corpo), embutidas no app (GResource), com fallback para a fonte do sistema.

## Estrutura
- Cabeçalho: marca "ATLAS" + `Restaurar padrões` (pede confirmação) + fechar.
- Palco 218 px: papel de parede em degradê, doca real em Cairo, lente segue o mouse, etiqueta "Prévia ao vivo". A doca vai para a borda escolhida (esq./baixo/dir.).
- Abas horizontais com ícone (Aparência, Ambientes, Widgets, Mascotes) + busca. Substitui `Adw.NavigationSplitView`: a barra lateral gastaria largura que o palco precisa.
- **Aparência**: Tema (6 miniaturas), Posição (miniatura da tela + segmentado + margem), Ícones e lente (3 sliders com valor ao lado), Detalhes (indicador, hover, animação), Comportamento (switches e Telas).
- **Ambientes**: lista com pastilha de cor, nome, apps como ícones, selo "Entra com Não perturbe", `Editar` (abre painel lateral/diálogo com nome, cor, tema, coleções, excluir); `Como trocar`; `Atalhos` com teclas desenhadas (clique captura novo atalho).
- **Widgets**: segmentado escolhe o ambiente; grade 4×N de cartões clicáveis (ícone, nome, descrição curta, "Na doca", "Tem versão larga"); opções gerais abaixo.
- **Mascotes**: grupos por categoria; cada item com emoji/ilustração, datas, `Testar` e switch.

## Estados
| Contexto | Estado |
|---|---|
| Ambientes sem itens | "Nenhum ambiente ainda." + `Começar com meus favoritos` (primário) e `Criar do zero` |
| Troca de tema/posição | aplica ao vivo; toast curto "Tema: Neon" (`aria-live=polite`) |
| Clima sem cidade | cartão Clima mostra "Escolha uma cidade" e abre o seletor ao ligar |
| Falha ao buscar cidade | "Não foi possível buscar agora. Verifique a conexão e tente de novo." |
| Restaurar padrões | diálogo: "Restaurar todas as opções? Seus ambientes serão mantidos?" (decidir: ver pendência) |
| Busca sem resultado | "Nada encontrado para “x”. Tente outro termo." |
| Carregando prévia | palco com esqueleto da doca por até 300 ms |

## Acessibilidade
- Alvos ≥ 32 px; todo controle por teclado; Tab percorre abas → busca → cartões; setas movem dentro de segmentados e da grade.
- Seletores visuais expõem `aria-pressed` (Gtk: `GTK_ACCESSIBLE_STATE_PRESSED`/`CHECKED`) e o nome do tema/widget como rótulo; estado nunca só por cor (borda + texto "Na doca").
- Foco visível 2 px; `prefers-reduced-motion` desliga lente animada e transições (no app: `gtk-enable-animations`).

## Critérios de aceite de design
- [ ] As 4 abas existem e cobrem 100% das opções atuais do `prefs.js`.
- [ ] Palco reage a tema, tamanho, indicador, hover, posição, margem e lente sem reabrir.
- [ ] Contrastes e foco conforme tabela acima (verificar com ferramenta).
- [ ] Janela útil a partir de 900×640; abaixo de 960 px de largura a grade 4×N de widgets vira 3×N e os cartões c7/c5 empilham.
- [ ] Textos em pt-BR conforme mockup.

## Pendências para decidir
1. `Restaurar padrões` apaga ambientes? Proposta: não; só opções visuais, com opção separada "Apagar ambientes".
2. Edição de ambiente: painel lateral (recomendado) ou diálogo.
3. Mascotes: emojis do mockup são provisórios; usar as ilustrações Cairo de `desenho.js` na miniatura.
