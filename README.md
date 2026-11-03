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
- Temas: **Noite** (padrão), **Papel**, **Cristal** (blur do fundo), **Neon**, **Oceano**, **Sakura**, **Ônix**, **Halloween** e **Natal**; cada ambiente pode ter o seu
- Posição: embaixo, esquerda ou direita, com margem; auto-ocultar (zona de 2px na borda traz a doca de volta)
- Telas: só na principal, em todas, ou só em uma tela específica (lista montada com seus monitores)
- Prévia de janelas: miniaturas ao vivo ao parar o mouse num app aberto (clique traz, X ou clique do meio fecha)
- Ambientes: conjuntos de apps com nome e cor, criados na janela de preferências. Seletor redondo na doca, roda do mouse sobre a doca e atalhos de teclado (Super+Alt+←/→, ou Ctrl+Alt+1 a 9 para ir direto ao N-ésimo) trocam de ambiente; cada forma pode ser desligada
- Widgets por ambiente (tiles desenhados com anéis, gráficos e relógio de ponteiros, que abrem um painel rico ao clicar; alguns têm versão larga): **Relógio**, **Pomodoro**, **Bateria** (UPower), **Música** (qualquer player MPRIS), **Progresso do tempo**, **Cronômetro**, **Timer**, **Atividade** (CPU/RAM), **Rede**, **Contagem regressiva** (dias até uma data), **Nota** (recado editável pelo clique) e **Área de transferência** (histórico de texto e fixados), **Slack** (selo de mensagens não lidas) e **Clima** (Open-Meteo: tempo agora, próximas 24 h e 5 dias, com a cidade escolhida por busca); ordem e posição (antes ou depois dos apps) configuráveis na aba Widgets
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

## Compatibilidade
| Sistema | GNOME Shell | Situação |
|---|---|---|
| Ubuntu 24.04 LTS | 46 | **Testado** (uso diário) |
| Ubuntu 24.10, 25.04, 25.10, 26.04 | 47 a 50 | Declarado: as APIs usadas foram conferidas no código do GNOME Shell e do mutter, mas ainda **não testado** em sessão real |
| Fedora 40+, Debian 13, Arch, openSUSE Tumbleweed (com GNOME) | 46 a 50 | Mesmo caso: deve funcionar, não testado |
| Ubuntu 22.04, Debian 12 | 42 e 43 | **Não suportado** (sem módulos ESM nem libadwaita 1.5) |

Requisitos: GNOME Shell 46 a 50 (Wayland ou X11), `gjs`, libadwaita 1.5+ e GTK 4 para o app de configuração, `libsoup3` (clima) e UPower (widget de bateria). KDE, XFCE e outros desktops não são suportados: a dock é uma extensão do GNOME Shell.
Se algo falhar na sua versão, abra uma issue com a saída de `journalctl -f -o cat /usr/bin/gnome-shell`.

## Instalar
Pelo zip (qualquer usuário):
```bash
./pack.sh                                                 # gera dist/atlas@joaovitor12j.dev.zip
gnome-extensions install --force dist/atlas@joaovitor12j.dev.zip
# faça logout/login (Wayland) e depois:
gnome-extensions enable atlas@joaovitor12j.dev
gnome-extensions disable dash-to-dock@micxgx.gmail.com ubuntu-dock@ubuntu.com   # evita dois docks
```
O zip leva a extensão e o app de configuração (`app/`), que abre pela engrenagem do app Extensões, pelo menu do painel ou pelo clique direito na dock.

Para desenvolver (symlink, alterações valem sem reinstalar):
```bash
./install.sh                         # symlink em ~/.local/share/gnome-shell/extensions
gnome-extensions enable atlas@joaovitor12j.dev   # após relogin (Wayland)
```
O `extension.js` do repositório é o carregador de desenvolvimento; o `pack.sh` o troca por `empacotar/extension.js` (import direto) no zip. `./pack.sh --ego` gera o zip sem o schema compilado, no formato do extensions.gnome.org.

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

## Desempenho
O ATLAS é leve: cerca de **0,14% de um núcleo** em uso normal (**~0,03%** com a doca escondida, **zero** sem widgets) e na faixa de **2 a 5 MB** de memória, dentro do `gnome-shell`. Os números, o método e o que ficou sem medir estão em [docs/DESEMPENHO.md](docs/DESEMPENHO.md).

## Versões
O histórico de mudanças está no [CHANGELOG](CHANGELOG.md).

## Próximos passos
Prateleira de arquivos e calendário.
