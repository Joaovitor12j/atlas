#!/usr/bin/env bash
# Liga a extensão ao GNOME Shell por symlink (alterações no código valem sem reinstalar).
set -euo pipefail
UUID="doca@ixcsoft.dev"
SRC="$(cd "$(dirname "$0")" && pwd)/$UUID"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"
mkdir -p "$(dirname "$DEST")"
ln -sfn "$SRC" "$DEST"
glib-compile-schemas "$SRC/schemas"
echo "Instalado: $DEST"
echo "No Wayland, faça logout/login e depois: gnome-extensions enable $UUID"
