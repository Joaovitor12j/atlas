#!/usr/bin/env bash
# Abre um GNOME Shell aninhado (janela) com a extensão ativa, sem mexer na sessão real.
set -euo pipefail
UUID="doca@ixcsoft.dev"
GSETTINGS_BACKEND=memory dbus-run-session -- bash -c "gsettings set org.gnome.shell enabled-extensions \"['$UUID']\"; gsettings set org.gnome.shell disable-user-extensions false; gnome-shell --nested --wayland"
