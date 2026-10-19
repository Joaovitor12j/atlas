# Changelog

Todas as mudanças relevantes do ATLAS ficam aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o `version-name` do `metadata.json`.

## [Não lançado]

## [0.3.0] - 2026-10-19

### Adicionado
- **Widgets novos:** **Slack** (o ícone com um selo quando há mensagens não lidas, lido do mesmo sinal do ícone da barra superior; fica esmaecido com o app fechado e o clique abre ou foca o Slack) e **Área de transferência** (histórico de texto com até 20 itens e textos fixados, clique para copiar de volta; o histórico fica só na memória, só os fixados ficam salvos, e conteúdo marcado por gerenciadores de senha não entra).
- **Painéis ricos ao clicar**, no lugar das listas: calendário do mês com navegação (Relógio), capa, progresso e controles (Música), gráficos de CPU e rede, anéis grandes (Pomodoro, Timer, Bateria, Cronômetro) e barras (Progresso do tempo).
- **Tiles largos** opcionais (aba Widgets, só com a doca embaixo) para Relógio digital, Atividade e Rede com gráfico; a **Música** larga é uma pílula de vidro com capa arredondada, título, artista, barra de progresso fina e os controles no próprio tile.
- Dica do **Não perturbe** na aba Ambientes e um aviso único, na primeira vez que o modo liga sem nenhum ambiente marcado, explicando onde marcar.
- **Medidor de desempenho** opt-in (`perf.js`, chave `perfil-ativo`, desligada por padrão) e o documento [docs/DESEMPENHO.md](docs/DESEMPENHO.md): quanto o ATLAS consome, como foi medido e o que não foi coberto.
- `desenho.js` (desenho com Cairo separado do Shell) e `tests/previa-desenho.js`, que gera um PNG para conferir os desenhos sem abrir o Shell.

### Alterado
- **Widgets redesenhados:** em vez de blocos de texto, os tiles desenham o estado, com anéis de progresso animados (Pomodoro, Timer, Bateria, Cronômetro), relógio de ponteiros, quatro anéis concêntricos no Progresso do tempo, anéis de CPU e memória e gráfico de rede. O tile pisca quando o timer ou o pomodoro acaba e quando a bateria está baixa.
- **Pele de vidro** nos tiles (gradiente leve, borda de 1px e brilho na aresta de cima) e **tiles pequenos mais legíveis**: fontes maiores, rótulo vazio some, e cada widget mostra só o essencial dentro do anel.
- **Menos consumo:** os widgets pausam o desenho com a doca escondida (auto-ocultar), no Overview e em tela cheia, e só redesenham quando algo mudou; cronômetro, pomodoro e timer parados e a música sem tocar conferem a cada 2 a 10 s em vez de 0,25 a 1 s. Medido: doca visível de ~0,19% para ~0,14% de um núcleo; escondida, de ~0,17% para ~0,03%.

### Corrigido
- O tooltip podia seguir um ícone já destruído depois que a doca era reconstruída (aviso `St.Button ... already disposed` no log).

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

[Não lançado]: https://github.com/Joaovitor12j/atlas/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Joaovitor12j/atlas/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Joaovitor12j/atlas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Joaovitor12j/atlas/releases/tag/v0.1.0
