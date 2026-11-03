#!/usr/bin/env bash
# Gera dist/atlas@joaovitor12j.dev.zip para instalar com `gnome-extensions install` ou enviar ao extensions.gnome.org.
# Por padrão o zip leva o schema compilado (instala em qualquer lugar); com --ego sai sem ele, como o EGO exige.
# O zip leva o app de configuração (app/) e um extension.js de produção, sem a pasta .run-* do loader de desenvolvimento.
set -euo pipefail
UUID="atlas@joaovitor12j.dev"
RAIZ="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/$UUID" "$RAIZ/dist"
cp -r "$RAIZ/$UUID/." "$TMP/$UUID/"
cp "$RAIZ/empacotar/extension.js" "$TMP/$UUID/extension.js"
rm -rf "$TMP/$UUID"/.run-* "$TMP/$UUID"/.dock-*.js "$TMP/$UUID/schemas/gschemas.compiled"
find "$TMP/$UUID" -name '__pycache__' -prune -exec rm -rf {} +

for f in "$TMP/$UUID"/*.js "$TMP/$UUID"/app/*.js; do
    node --check --input-type=module < "$f" || { echo "erro de sintaxe em $f" >&2; exit 1; }
done
glib-compile-schemas --strict --dry-run "$TMP/$UUID/schemas"
[[ "${1:-}" == "--ego" ]] || glib-compile-schemas "$TMP/$UUID/schemas"

ZIP="$RAIZ/dist/$UUID.zip"
rm -f "$ZIP"
(cd "$TMP/$UUID" && zip -qr "$ZIP" .)
echo "Gerado: $ZIP"
unzip -l "$ZIP" | tail -1
