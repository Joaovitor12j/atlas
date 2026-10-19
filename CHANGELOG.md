# Changelog

Todas as mudanças relevantes do ATLAS ficam aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o `version-name` do `metadata.json`.

## [Não lançado]

## [0.2.0] - 2026-10-19

### Adicionado
- **Widgets** na doca, ligados por ambiente na aba Widgets das preferências: Relógio, Pomodoro, Bateria, Música (qualquer player MPRIS), Progresso do tempo, Cronômetro, Timer, Atividade (CPU e memória), Rede, Contagem regressiva e Nota. O clique abre um painel; posição (antes ou depois dos apps) e ordem são configuráveis, e há opções gerais (durações do pomodoro e do timer, relógio de 12 ou 24 horas, nome e data da contagem).
- **Coleções de apps**: um ícone em mosaico que guarda um grupo de apps e abre a lista ao clicar.
- **Tema, widgets e coleções por ambiente.**
- **Janelas seguem o ambiente** (opcional, desligado por padrão): ao trocar de ambiente, minimiza as janelas dos apps de outros ambientes e as devolve na volta.
- **Ambiente automático com Não perturbe**: o ambiente marcado entra sozinho quando o Não perturbe do GNOME liga e volta ao anterior ao desligar.
- **Ctrl+Alt+1 a 9** vai direto ao N-ésimo ambiente.
- Temas **Neon**, **Halloween** e **Natal**.
- Opções de aparência: efeito ao passar o mouse (brilho ou ícone que sobe), indicador de app aberto (ponto, barra ou nenhum) e animação de abertura (deslizar ou surgir).
- Testes (`npm test`) e CI no GitHub Actions: sintaxe, schema em modo estrito e testes unitários.

### Alterado
- O botão de aplicativos ganhou um tile com cor própria em cada tema; no tema Papel ele ficava quase invisível.
- O loader copia todos os módulos `.js` a cada enable, então `dock.js`, `widgets.js`, `logica.js` e `catalogo.js` recarregam com disable/enable, sem novo login.
- A lógica pura (formatação, contas de tempo, ambientes) saiu para `logica.js`, separada do Shell para poder ser testada.

### Corrigido
- Um widget que falha ao ser criado não derruba mais a doca inteira.

## [0.1.0] - 2026-10-19

Primeira versão.

### Adicionado
- Dock com lente de ampliação para GNOME Shell 46 (Wayland e X11), com indicador de app aberto e dica com o nome.
- Favoritos do GNOME e apps abertos, separados por uma linha, e botão de grade de aplicativos.
- Temas Noite, Papel e Cristal (com desfoque do fundo).
- Janela de preferências: tema, tamanho dos ícones, lente, posição (embaixo, esquerda ou direita) e margem.
- Auto-ocultar e uma doca por tela (só na principal, em todas ou em uma específica).
- Menu de clique direito nos ícones, com ações do app, nova janela, fixar e fechar janelas.
- Prévia de janelas com miniaturas ao vivo.
- Ambientes (conjuntos de apps com nome e cor), seletor na doca, troca pela roda do mouse e por atalhos (Super+Alt+←/→).
- Ícone do ATLAS no painel superior, com menu.
- ATLAS visível no Overview e reserva de espaço para janelas maximizadas.

### Corrigido
- A reserva de espaço liga e desliga de verdade junto com o auto-ocultar.

[Não lançado]: https://github.com/Joaovitor12j/atlas/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Joaovitor12j/atlas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Joaovitor12j/atlas/releases/tag/v0.1.0
