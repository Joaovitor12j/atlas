#!/usr/bin/env bash
# Troca o tema do ATLAS ao vivo: ./tema.sh noite|papel|cristal
set -euo pipefail
SCHEMAS="$(cd "$(dirname "$0")" && pwd)/atlas@ixcsoft.dev/schemas"
gsettings --schemadir "$SCHEMAS" set org.gnome.shell.extensions.atlas tema "${1:?uso: $0 noite|papel|cristal}"
