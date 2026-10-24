#!/usr/bin/env bash
# Statusline do Claude Code para o widget Claude Code do ATLAS.
# Grava o JSON que o Claude Code manda no stdin (com os limites reais do plano: 5 h e semana) em
# ~/.cache/atlas/claude/<session_id>.json e repassa o mesmo stdin para a statusline que já existia
# (caveman, se instalada), então a barra do Claude Code continua igual.
# Instalar: ./install.sh copia para ~/.claude/atlas-statusline.sh; no settings.json:
#   "statusLine": {"type": "command", "command": "bash ~/.claude/atlas-statusline.sh"}
entrada="$(cat)"
dir="${XDG_CACHE_HOME:-$HOME/.cache}/atlas/claude"
id="$(jq -r '.session_id // empty' <<<"$entrada" 2>/dev/null)"
if [[ "$id" =~ ^[A-Za-z0-9_-]+$ ]]; then
    mkdir -p "$dir"
    tmp="$(mktemp "$dir/.tmp.XXXXXX")"
    printf '%s' "$entrada" >"$tmp" && mv -f "$tmp" "$dir/$id.json"
fi
# a statusline anterior: variável ATLAS_STATUSLINE_NEXT, ou a do caveman (a pasta tem hash de versão)
proxima="${ATLAS_STATUSLINE_NEXT:-}"
if [[ -z "$proxima" ]]; then
    for f in "$HOME"/.claude/plugins/cache/caveman/caveman/*/src/hooks/caveman-statusline.sh; do
        [[ -f "$f" ]] && proxima="bash $f"
    done
fi
[[ -n "$proxima" ]] && printf '%s' "$entrada" | eval "$proxima"
exit 0
