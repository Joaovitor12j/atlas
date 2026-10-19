#!/usr/bin/env bash
# Abre a janela de preferências do ATLAS direto (não depende do Shell conhecer prefs.js; útil sem relogin).
export GI_TYPELIB_PATH="/usr/lib/gnome-shell/girepository-1.0${GI_TYPELIB_PATH:+:$GI_TYPELIB_PATH}"
export LD_LIBRARY_PATH="/usr/lib/gnome-shell${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec gjs -m "$(cd "$(dirname "$0")" && pwd)/abrir-prefs.js"
