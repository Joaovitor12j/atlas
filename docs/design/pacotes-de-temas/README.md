# ATLAS · Pacotes de temas

Dois pacotes visuais que convivem no app. Cada pacote traz **temas** e **mascotes**; cada tema tem um mascote residente (pode ser trocado à parte).

| Pacote | Sensação | Temas | Mascotes | Protótipo |
|---|---|---|---|---|
| Pixel | jogo aconchegante, nostálgico | Vila, Floresta, Noite de lua, Praia | Gato, Folhinha, Coruja, Caranguejo | `pixel/index.html` |
| Materiais | objeto físico, calmo, polido | Aurora, Carta, Jardim, Chuva | Água-viva, Gaivota, Gato ilustrado, Sapo | `materiais/index.html` |
| Natal | festivo, quente | Noite de neve (pixel e materiais), Vitrine, Natal brasileiro | Boneco de neve (pixel e ilustrado), Rena, Papai Noel | `natal/index.html` |

Os 7 temas atuais (Noite, Papel, Cristal, Neon, Oceano, Sakura, Ônix) continuam como pacote "Clássico". O Natal antigo (só paleta) é substituído pelo pacote Natal; Halloween sai.

Abrir os protótipos no navegador. `?t=SEGUNDOS` congela um instante (útil para capturas). Decisões do João em 2026-11-01: pixel art e ilustração convivem; Natal e Halloween saem; gato novo desenhado do zero.

## Anatomia de um tema
Todo tema define cinco coisas, não só a paleta:
1. **Material** da doca (madeira, pedra, céu, areia, vidro, papel, chuva).
2. **Borda** e sombra.
3. **Indicador** do app ativo (coração, folha, estrela, estrela-do-mar, ponto de luz, carimbo, neon).
4. **Tile de widget** (pergaminho, musgo, azul-noite, vidro escuro, cartela de papel).
5. **Mascote residente** e **efeito ambiente** (vagalumes, ondas, estrelas, aurora, pétalas, chuva).

## Sugestão de manifesto (para o desenvolvimento)
```json
{
  "id": "pixel",
  "nome": "Pixel",
  "tipo": "sprites",
  "temas": [{"id": "vila", "nome": "Vila", "mascote": "gato"}],
  "mascotes": [{
    "id": "gato",
    "quadro": [36, 26],
    "estados": [
      {"id": "walk", "fps": 10, "quadros": 8, "velocidade_px_s": 15},
      {"id": "sleep", "fps": 10, "quadros": 4, "velocidade_px_s": 0}
    ],
    "roteiro": [["sit", 3], ["walk", 5], ["sleep", 5]]
  }]
}
```
- Pacote `sprites`: folha PNG por mascote, uma linha por estado (o botão "Baixar folha PNG" do protótipo gera o arquivo), escala só inteira.
- Pacote `ilustrado`: SVG com partes nomeadas (corpo, cabeça, pernas, rabo) animadas por transformação, ou Cairo equivalente. O protótipo mostra os pivôs e as durações.
- O `roteiro` é só o padrão; no produto, sorteie o próximo estado com pesos (parado é o mais comum).

## Pendências
- Custo do pacote Materiais (blur, camadas, partículas): medir com `perf.js` antes de entrar na doca real.
- Aurora e Chuva dependem de blur do compositor; definir fallback sem blur.
- A implementação (`logica.js`, `mascotes.js`, `catalogo.js`) fica com o time de desenvolvimento.
