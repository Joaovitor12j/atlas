<div align="center">

# A·T·L·A·S

**A**mbientes, **T**arefas, **L**ançadores, **A**plicativos e **S**istema

Dock com lente de ampliação para GNOME Shell 46 (Wayland/X11).

</div>

## Recursos
- Favoritos do GNOME + apps abertos (separados por uma linha) e botão de grade de apps
- Lente de ampliação suave, indicador de app aberto, tooltip com o nome
- Clique: ativa/abre; botão do meio ou Ctrl+clique: nova janela
- Temas: **Noite** (padrão), **Papel** e **Cristal** (blur do fundo)
- Posição: embaixo, esquerda ou direita, com margem; auto-ocultar (zona de 2px na borda traz a doca de volta)
- Telas: só na principal, em todas, ou só em uma tela específica (lista montada com seus monitores)
- Prévia de janelas: miniaturas ao vivo ao parar o mouse num app aberto (clique traz, X ou clique do meio fecha)
- Ambientes: conjuntos de apps com nome e cor, criados na janela de preferências. Seletor redondo na doca, roda do mouse sobre a doca e atalhos de teclado (Super+Alt+←/→) trocam de ambiente; cada forma pode ser desligada
- Ícone do ATLAS no painel superior (menu com ambientes, temas, auto-ocultar e Configurações; pode ser ocultado)
- Menu de clique direito nos ícones: ações do app, nova janela, fixar/desafixar, fechar janelas; no vidro ou no seletor: menu geral com Configurações
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
`extension.js` copia `dock.js` para um nome único a cada enable (o GJS ignora `?query` no import). Edite `dock.js`, `temas.css` ou `prefs.js` e rode:
```bash
gnome-extensions disable atlas@joaovitor12j.dev && gnome-extensions enable atlas@joaovitor12j.dev
```
Mudanças em `extension.js` e `metadata.json` só valem após novo login.

Logs: `journalctl -f -o cat /usr/bin/gnome-shell`

## Próximos passos
Widgets (relógio, pomodoro, progresso do dia).
