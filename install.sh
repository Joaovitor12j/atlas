#!/usr/bin/env bash
# Liga a extensão ao GNOME Shell por symlink (alterações no código valem sem reinstalar).
set -euo pipefail
UUID="atlas@joaovitor12j.dev"
SRC="$(cd "$(dirname "$0")" && pwd)/$UUID"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"
mkdir -p "$(dirname "$DEST")"
ln -sfn "$SRC" "$DEST"
glib-compile-schemas "$SRC/schemas"
# Ícone e lançador do app de preferências (menu de aplicativos, Alt+Tab, barra de tarefas)
APP_ID="dev.joaovitor12j.Atlas"
ICONS="$HOME/.local/share/icons/hicolor"
mkdir -p "$ICONS/scalable/apps" "$HOME/.local/share/applications"
cp "$SRC/icons/atlas.svg" "$ICONS/scalable/apps/$APP_ID.svg"
cat > "$HOME/.local/share/applications/$APP_ID.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=ATLAS
Comment=Configuração da dock ATLAS
Exec=$(dirname "$SRC")/prefs.sh
Icon=$APP_ID
Terminal=false
Categories=Settings;GNOME;GTK;
StartupWMClass=$APP_ID
DESKTOP
gtk-update-icon-cache -q -t "$ICONS" 2>/dev/null || true
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

echo "Instalado: $DEST"
echo "No Wayland, faça logout/login e depois: gnome-extensions enable $UUID"
