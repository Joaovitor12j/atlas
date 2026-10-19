<div align="center">

<img src="atlas@joaovitor12j.dev/icons/atlas-128.png" width="96" alt="ATLAS">

# A·T·L·A·S

**A**mbientes, **T**arefas, **L**ançadores, **A**plicativos e **S**istema

Dock com lente de ampliação para GNOME Shell 46 (Wayland/X11).

</div>

## Recursos
- Favoritos do GNOME + apps abertos (separados por uma linha) e botão de grade de apps
- Lente de ampliação suave, indicador de app aberto, tooltip com o nome
- Clique: ativa/abre; botão do meio ou Ctrl+clique: nova janela
- Temas: **Noite** (padrão), **Papel**, **Cristal** (blur do fundo), **Neon**, **Halloween** e **Natal**; cada ambiente pode ter o seu
- Posição: embaixo, esquerda ou direita, com margem; auto-ocultar (zona de 2px na borda traz a doca de volta)
- Telas: só na principal, em todas, ou só em uma tela específica (lista montada com seus monitores)
- Prévia de janelas: miniaturas ao vivo ao parar o mouse num app aberto (clique traz, X ou clique do meio fecha)
- Ambientes: conjuntos de apps com nome e cor, criados na janela de preferências. Seletor redondo na doca, roda do mouse sobre a doca e atalhos de teclado (Super+Alt+←/→, ou Ctrl+Alt+1 a 9 para ir direto ao N-ésimo) trocam de ambiente; cada forma pode ser desligada
- Widgets por ambiente (tiles desenhados com anéis, gráficos e relógio de ponteiros, que abrem um painel rico ao clicar; alguns têm versão larga): **Relógio**, **Pomodoro**, **Bateria** (UPower), **Música** (qualquer player MPRIS), **Progresso do tempo**, **Cronômetro**, **Timer**, **Atividade** (CPU/RAM), **Rede**, **Contagem regressiva** (dias até uma data), **Nota** (recado editável pelo clique) e **Área de transferência** (histórico de texto e fixados) e **Slack** (selo de mensagens não lidas); ordem e posição (antes ou depois dos apps) configuráveis na aba Widgets
- Coleções: um ícone com mosaico que guarda um grupo de apps e abre a lista ao clicar
- Não perturbe: um ambiente pode ser marcado para entrar sozinho quando o Não perturbe do GNOME liga (e voltar ao anterior ao desligar)
- Janelas seguem o ambiente (opcional, desligado por padrão): ao trocar, minimiza as janelas dos apps de outros ambientes e as traz de volta ao retornar
- Ícone do ATLAS no painel superior (menu com ambientes, temas, auto-ocultar e Configurações; pode ser ocultado)
- Menu de clique direito nos ícones: ações do app, nova janela, fixar/desafixar, fechar janelas; no vidro ou no seletor: menu geral com Configurações
- Aparência ajustável: efeito ao passar o mouse (brilho ou ícone que sobe), indicador (ponto, barra ou nenhum) e animação de abertura (deslizar ou surgir)
- Esconde no Overview e em tela cheia

## Configurar
```bash
./prefs.sh                 # janela de preferências (tema, ícones, lente, posição)
./tema.sh noite|papel|cristal   # troca de tema pelo terminal
```
As opções são GSettings (`org.gnome.shell.extensions.atlas`); o dock reage ao vivo.
Depois de um novo login, a engrenagem no app Extensões e `gnome-extensions prefs atlas@joaovitor12j.dev` também abrem a janela.

## Instalar
```bash
./install.sh                         # symlink em ~/.local/share/gnome-shell/extensions
gnome-extensions enable atlas@joaovitor12j.dev   # após relogin (Wayland)
gnome-extensions disable dash-to-dock@micxgx.gmail.com ubuntu-dock@ubuntu.com   # evita dois docks
```

## Desenvolvimento sem relogin
`extension.js` copia `dock.js`, `widgets.js` e `catalogo.js` para uma pasta temporária a cada enable (o GJS ignora `?query` no import e guarda os módulos em cache). Edite esses arquivos, `temas.css` ou `prefs.js` e rode:
```bash
gnome-extensions disable atlas@joaovitor12j.dev && gnome-extensions enable atlas@joaovitor12j.dev
```
Mudanças em `extension.js` e `metadata.json` só valem após novo login.

Testes (lógica pura em `logica.js` e consistência do catálogo, schema e temas):
```bash
npm test
```
O CI (GitHub Actions) roda a checagem de sintaxe, o schema em modo estrito e os testes a cada PR.

Logs: `journalctl -f -o cat /usr/bin/gnome-shell`

## Versões
O histórico de mudanças está no [CHANGELOG](CHANGELOG.md).

## Próximos passos
Prateleira de arquivos, clima e calendário.
