# DESIGN.md: página do ATLAS (v3, "o dock vira um lugar")

Substitui o `DESIGN.md` anterior (carta náutica). Sem capturas de tela e sem mockups em imagem: tudo é desenho vivo em HTML, CSS e SVG, extraído de `docs/design/pacotes-de-temas/{materiais,natal}/index.html` (`cenas.css`, `cenas-data.js`, `mascotes-svg.js`).

## Conceito
O produto é o dock, e cada tema é uma cena inteira com mascote. O hero é a cena: a página toma as cores do tema escolhido (troca sozinha a cada 8 s até a pessoa mexer). Uma única coisa memorável (a cena viva), o resto quieto.

## Identidade
- Cores: tinta `#0a171c`, painel `#10242b`, névoa `#e3ece8` (seções claras), texto `#e9f3f1`, coral `#ff6b4a` (ação, igual ao app), menta `#5fd6a8`.
- Tipos: Sora 700 (títulos, -0.035em) e Hanken Grotesk (texto), os mesmos do app.
- Ritmo: cena do tema, névoa (temas), tinta (mascotes), névoa (ambientes), tinta (widgets), tinta-teal (app), névoa (compatibilidade).
- Prefixo `s-` em todas as classes do site para não colidir com as classes dos protótipos (`.dock`, `.tile`, `.cena`...).

## Estrutura
1. Hero: "Seu dock vira um lugar." + cena viva (7 temas) + seletor de tema.
2. Temas: 4 pacotes em lista tipográfica; os 7 desenhados têm botão e levam à cena do topo.
3. Mascotes: 7 moradores animados com os estados de cada um.
4. Ambientes: dock na ordem real (seletor de ambiente, apps, widgets, botão Mostrar aplicativos) com ícones reais do sistema, roda do mouse, setas e botões; apps e widgets por ambiente são amostra, só com itens reais do produto.
5. Widgets: 14 (6 desenhados + chips dos outros 8), conforme `WIDGETS` do `catalogo.js`.
6. App: janela "Palco" desenhada na identidade do app (`app/estilo.css`), com prévia ao vivo que reage ao tema, tamanho, margem e lente, e 4 abas funcionais. A janela é desenhada a 1120 px e escala para caber.
7. Compatibilidade e desempenho. Rodapé.

## Movimento
Cena do hero (crossfade de 0,7 s ao trocar), mascotes e efeitos dos temas (CSS). `prefers-reduced-motion`: sem troca automática, sem animações.

## Pendências
- Logos do Firefox e do Brave aparecem na página pública; trocar por ícones neutros se for problema de marca.
- Quais apps/widgets cada ambiente mostra é amostra; a prévia da janela é um esqueleto genérico.
- Pixel e Clássico não estão desenhados (viram chips tracejados, sem ação). Pixel depende do motor de canvas do protótipo e da arte de mascotes, que o produto ainda não tem.
- Aba Mascotes do app mostra só 3 dos 13 mascotes reais (os que têm desenho aqui).
- O app real tem os 4 pacotes no seletor de tema; o desenho tem só Materiais e Natal.
- Posição esquerda/direita só move a miniatura da tela; a prévia fica embaixo.
- E-mail do rodapé provisório (`contato@email.com`).
- Fontes via Google Fonts; para produção, embutir.

## Critérios de aceite
- Sem rolagem horizontal em 360 px; foco visível; abas e seletores navegáveis por teclado.
- Sem capturas de tela nem mockups em imagem. Únicas imagens raster: os 8 ícones reais do sistema em `img/apps/` (128 px), usados nas docks.
- Textos conferem com o produto (14 widgets, 7 temas e mascotes residentes desenhados).
