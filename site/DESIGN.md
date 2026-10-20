# DESIGN.md: página de apresentação do ATLAS

Fonte de verdade visual da página. Se o código e este arquivo divergirem, vale este arquivo (ou corrige-se o arquivo antes). Método: uma referência, um estilo travado, no máximo duas animações de página.

## Propósito
Vitrine pública do ATLAS (dock para GNOME Shell 46) hospedada na Vercel. **Não é página de venda**: o código é fechado, não há download, preço, teste nem contador. O trabalho da página é mostrar o produto funcionando e dizer com franqueza onde ele roda.

Público: quem usa Linux/GNOME e gosta de personalizar a área de trabalho, mais recrutadores e curiosos que chegam pelo perfil do autor.

## Conceito
**Carta náutica noturna.** O nome Atlas é mapa: grade de coordenadas, curvas de nível e a legenda de uma carta. O fundo é o mesmo papel de parede em que o dock foi capturado (`site/img/carta.png`, copiado de `~/Imagens/wallpapers/atlas-carta.png`), então as capturas "pousam" na página sem emenda.

Referências de comportamento (não de visual): Primodock (`dock.oprimo.dev`, mockups reais e seção de temas) e Doca (`doca.racoelho.com.br`, demo da lente e troca de ambiente). Referências de visual vêm do vault: `Ideia - Dock ATLAS` (traço fino estilo hairline, grade de coordenadas, vidro, grafite-azulado e âmbar).

Não copiar de nenhum dos dois: preço, ofertas, comparação de planos, estética de terminal (`TIER_01`, `[ 01 ]`), capturas de Mac e Windows.

## Cores
| Token | Valor | Uso |
|---|---|---|
| `--grafite` | `#0F1B28` | fundo da página |
| `--grafite-2` | `#16283A` | superfícies elevadas, cartões de captura |
| `--linha` | `#7899B8` a 22% | graticule e divisores de 1 px |
| `--texto` | `#DCE7EE` | texto principal |
| `--texto-2` | `#93A9B9` | texto secundário, legendas |
| `--ambar` | `#E8A33D` | acento principal: links, foco, barras de desempenho |
| `--agua` | `#3FB8A8` | acento secundário (ambiente Estudo) |
| `--azul` | `#6C8CF5` | acento terciário (ambiente Lazer) |

- Âmbar, verde-água e azul são as cores reais dos três ambientes de demonstração. Usar cada uma onde o conteúdo for daquele ambiente, não como enfeite.
- Contraste: texto sobre grafite passa de 7:1; âmbar sobre grafite passa de 8:1. Não usar `--texto-2` em corpo de texto menor que 16 px.
- Só tema escuro. Declarar `color-scheme: dark`.

## Tipografia
- **Títulos:** Bricolage Grotesque, `font-stretch` 80% a 85%, peso 700, espaçamento -0.03em, entrelinha 1.02.
- **Texto:** Instrument Sans 400/500, entrelinha 1.6, linha com no máximo 68 caracteres.
- **Mono:** Spline Sans Mono 400, só para atalhos de teclado (`kbd`) e valores numéricos do gráfico de desempenho.
- Escala: h1 `clamp(2.8rem, 7.4vw, 5.4rem)`; h2 `clamp(1.9rem, 4.6vw, 3rem)`; corpo 1.0625rem; legendas 0.92rem.
- Frases e títulos em sentença normal, sem caixa alta, sem rótulos "eyebrow" acima dos títulos, sem destacar uma única palavra do título em outra cor.

## Traço e layout
- Traços de **1 px** (`--linha`) para divisores, bordas de captura e a legenda. Sem sombras suaves padrão, sem gradientes decorativos.
- Cantos: 12 px nas capturas, 0 nos divisores. Não aplicar o mesmo raio em tudo.
- Alinhamento à esquerda. Coluna de leitura 1080 px, margens laterais `clamp(16px, 4vw, 40px)`.
- Mobile primeiro: nada de rolagem horizontal; vídeos e capturas com `width: 100%` e proporção fixa (sem salto de layout).
- A grade de fundo (`120px` principal, `24px` fina) é parte da identidade; fica fixa atrás de tudo.

## Estrutura da página
1. **Topo.** Marca ATLAS (`img/atlas.svg`) e links âncora: Ambientes, Widgets, Configuração, Mascotes, Desempenho, Compatibilidade.
2. **Hero.** Título "Um dock. Vários ambientes.", uma frase de apoio, o selo "GNOME 46, Wayland e X11" em texto simples, e o vídeo da lente (`media/lente`) em loop, mudo. Único link de ação: "Ver os ambientes" (âncora).
3. **Legenda A·T·L·A·S.** Cinco linhas, como a legenda de uma carta: Ambientes, Tarefas, Lançadores, Aplicativos, Sistema, cada uma com uma frase.
4. **Ambientes.** Vídeo da troca pela roda do mouse (`media/ambientes`), atalhos em `kbd`, a frase sobre Não perturbe e o **dock interativo**: um dock em HTML com lente, troca de ambiente pela roda do mouse (ou pelos botões Trabalho, Estudo e Lazer) e os seis temas. Usa os ícones reais do tema Yaru (`img/apps/`), só de apps do GNOME (sem logos de terceiros), tiles de relógio e atividade em SVG, borda na cor do ambiente e um aviso com o nome ao trocar. Em tela estreita os tiles somem. É a segunda animação de página, junto com o vídeo da lente.
5. **Widgets.** Lista dos **7 com imagem**: Música, Pomodoro, Relógio, Atividade, Progresso do tempo, Contagem regressiva e Nota. Selecionar um item mostra o painel real (`img/widgets/painel-*.png`). Uma frase informa que existem outros widgets, sem listá-los.
6. **Prévia de janelas.** `img/widgets/previa-janelas.png` e uma frase sobre o menu de clique direito.
7. **Temas.** As seis capturas `dock-a1-{noite,papel,cristal,neon,halloween,natal}`, empilhadas, com o nome de cada tema.
8. **Configuração.** Mensagem central: todo comportamento tem opção na janela de preferências, sem editar arquivo. Quatro abas reais, com a captura de cada uma (`img/prefs/{geral,ambientes,widgets,mascotes}.png`): Geral (tema, efeito, indicador, animação, tamanho, lente, prévia), Ambientes (seletor, roda, atalhos, Não perturbe, janelas seguem o ambiente), Widgets (ligar, ordem, posição, versão larga) e Mascotes (ligar cada um, janela de horas, "Testar agora"). Fecha com: as opções são GSettings e o dock reage ao vivo, sem reiniciar.
9. **Mascotes.** Seis vídeos curtos (`media/mascote-*`), cada um com legenda de quando aparece: cuco na hora cheia ou meia hora; Papai Noel e boneco de neve de 1 a 25 de dezembro; fantasma e esqueleto de 24 a 31 de outubro; chama quando a memória está alta. Nota: desligados por padrão, custo quase zero parados, não aparecem com o dock escondido, no Overview ou com Não perturbe.
10. **Desempenho.** Barras horizontais: sem widgets 0%, dock escondido 0,03%, dock visível 0,14%, todos os widgets 0,37% (porcentagem de um núcleo, duas telas). Memória própria de 2 a 5 MB, dita como estimativa. Referência: `docs/DESEMPENHO.md`.
11. **Compatibilidade.** Testado no GNOME Shell 46, Wayland e X11. Outras versões do GNOME e outras distribuições não foram testadas. Explicar em uma frase por que é um projeto pessoal e não um produto.
12. **Rodapé.** "ATLAS, versão 0.3.0. Projeto pessoal, código fechado." E-mail `contato@email.com` (provisório, o autor troca) e link para `https://github.com/Joaovitor12j`.

## Movimento
Regra do vault: no máximo **duas animações de página**.
1. O vídeo da lente no hero.
2. O vídeo da troca de ambiente.

Os vídeos dos mascotes são conteúdo, não decoração: tocam só quando entram na tela (`IntersectionObserver`), mudos, em loop. Nada de entradas "fade e sobe" por seção, nem hover animado em cartões. Respeitar `prefers-reduced-motion`: sem autoplay, mostrando o primeiro quadro como pôster.

## Mídia
- Vídeos em `.webm` (VP9) com `.mp4` (H.264) de reserva; `muted`, `loop`, `playsinline`, `preload="metadata"` e pôster.
- Imagens com `width` e `height` explícitos e `loading="lazy"` abaixo da dobra; texto alternativo descrevendo o que se vê (por exemplo, "Dock com ambiente Trabalho, widget de música e relógio").
- As capturas mostram apps abertos reais (Claude, Brave, PhpStorm, Spotify, Obsidian) depois do separador do dock. Não há dados pessoais nelas; manter assim ao refazer capturas.

## Texto
- Português do Brasil, sentença normal, voz ativa, frases curtas.
- Dizer o que o recurso faz, não vender. Nada de "revolucionário" ou "incrível".
- Honestidade sobre limites (compatibilidade, memória estimada, widgets sem imagem) faz parte do tom.
- Nomes consistentes com a interface: Ambientes, Widgets, Mascotes, Geral, "Testar agora".

## Acessibilidade
- Foco visível (contorno de 3 px âmbar), navegação por teclado completa, seletor de widgets com `role="tablist"` e setas.
- `lang="pt-BR"`, hierarquia de títulos sem saltos, vídeos decorativos com `aria-hidden` e legenda textual ao lado.
- Alvos de toque de pelo menos 44 px.

## Hospedagem
Vercel, projeto estático, **Root Directory = `site`**, sem build. `vercel.json` com `cleanUrls` e cabeçalhos `X-Content-Type-Options` e `Referrer-Policy`. O domínio próprio é adicionado depois nas configurações do projeto. Metadados: título, descrição e `og:*`; imagem social a gerar de uma captura do hero.

## Fora do escopo
Download, preço, cadastro, formulário, analytics, i18n (só pt-BR), modo claro, blog.
