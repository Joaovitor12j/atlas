#!/usr/bin/env bash
# Abre o app de configuração do ATLAS direto (não depende do Shell nem de relogin).
exec gjs -m "$(cd "$(dirname "$0")" && pwd)/atlas@joaovitor12j.dev/app/main.js" "$@"
