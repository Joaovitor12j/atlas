# ATLAS

**A**mbientes, **T**arefas, **L**ançadores, **A**plicativos e **S**istema. Dock com lente de ampliação para GNOME Shell 46 (Wayland/X11), inspirado no [Doca](https://doca.racoelho.com.br/) do Windows.

> O UUID da extensão continua `doca@ixcsoft.dev` (nome da pasta `doca@ixcsoft.dev/`). Trocar para `atlas@ixcsoft.dev` exige novo login, então fica para o próximo.

## Recursos
- Favoritos do GNOME + apps abertos (separados por uma linha) e botão de grade de apps
- Lente de ampliação suave, indicador de app aberto, tooltip com o nome
- Clique: ativa/abre; botão do meio ou Ctrl+clique: nova janela
- Temas: **Noite** (padrão), **Papel** e **Cristal** (blur do fundo)
- Posição: embaixo, esquerda ou direita, com margem; auto-ocultar (zona de 2px na borda traz a doca de volta)
- Telas: só na principal, em todas, ou só em uma tela específica (lista montada com seus monitores)
- Menu de clique direito: ações do app, nova janela, fixar/desafixar, fechar janelas
- Esconde no Overview e em tela cheia

## Configurar
```bash
./prefs.sh                 # janela de preferências (tema, ícones, lente, posição)
./tema.sh noite|papel|cristal   # troca de tema pelo terminal
```
As opções são GSettings (`org.gnome.shell.extensions.atlas`); o dock reage ao vivo.
Depois de um novo login, `gnome-extensions prefs doca@ixcsoft.dev` também abre a janela.

## Instalar
```bash
./install.sh                         # symlink em ~/.local/share/gnome-shell/extensions
gnome-extensions enable doca@ixcsoft.dev   # após relogin (Wayland)
gnome-extensions disable dash-to-dock@micxgx.gmail.com ubuntu-dock@ubuntu.com   # evita dois docks
```

## Desenvolvimento sem relogin
`extension.js` copia `dock.js` para um nome único a cada enable (o GJS ignora `?query` no import). Edite `dock.js`, `temas.css` ou `prefs.js` e rode:
```bash
gnome-extensions disable doca@ixcsoft.dev && gnome-extensions enable doca@ixcsoft.dev
```
Mudanças em `extension.js` e `metadata.json` só valem após novo login.

Logs: `journalctl -f -o cat /usr/bin/gnome-shell`

## Próximos passos
Prévia de janelas, ambientes, widgets (relógio, pomodoro).
