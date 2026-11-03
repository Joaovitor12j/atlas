#!/usr/bin/env bash
# Troca o tema do ATLAS ao vivo: ./tema.sh <id> (ex.: noite, papel, cristal, neon, vila, aurora, brasileiro)
set -euo pipefail
SCHEMAS="$(cd "$(dirname "$0")" && pwd)/atlas@joaovitor12j.dev/schemas"
gsettings --schemadir "$SCHEMAS" set org.gnome.shell.extensions.atlas tema "${1:?uso: $0 <id do tema>}"
