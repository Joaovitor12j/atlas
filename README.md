# ATLAS

**A**mbientes, **T**arefas, **L**ançadores, **A**plicativos e **S**istema. Dock com lente de ampliação para GNOME Shell 46 (Wayland/X11), inspirado no [Doca](https://doca.racoelho.com.br/) do Windows.

> O UUID da extensão continua `doca@ixcsoft.dev` por enquanto: trocar exige novo login, então fica para quando houver outro relogin.

## MVP
- Favoritos do GNOME + apps abertos (separados por uma linha)
- Lente de ampliação suave (força, largura e tamanho em `CONFIG` no `extension.js`)
- Indicador de app aberto, tooltip com o nome
- Clique: ativa/abre; botão do meio ou Ctrl+clique: nova janela
- Botão "Mostrar aplicativos" (grade de apps) no fim
- Esconde no Overview e em tela cheia

## Uso
```bash
./install.sh                         # symlink em ~/.local/share/gnome-shell/extensions
gnome-extensions enable doca@ixcsoft.dev   # após relogin (Wayland)
gnome-extensions disable dash-to-dock@micxgx.gmail.com  # evita dois docks
```

Desenvolvimento sem relogin: `extension.js` copia `dock.js` para um nome único a cada enable (o GJS ignora `?query` no import). Edite `dock.js` e rode
`gnome-extensions disable doca@ixcsoft.dev && gnome-extensions enable doca@ixcsoft.dev`.

Desative também `ubuntu-dock` e `dash-to-dock` para não ter dois docks.

Logs: `journalctl -f -o cat /usr/bin/gnome-shell`

## Próximos passos
Ambientes, widgets (relógio, pomodoro), pilhas de pastas, prévia de janelas, auto-ocultar, prefs.
