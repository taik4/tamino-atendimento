#!/usr/bin/env bash
# Grava os tokens no .env sem mostrar na tela nem passar pelo chat.
set -euo pipefail
cd "$(dirname "$0")"
read -rsp "Cole o cookie do Tamino (valor do header 'cookie') e Enter: " TC; echo
read -rsp "Cole o authorization do Evo (com ou sem 'Bearer ') e Enter: " ET; echo
ET="${ET#Bearer }"; ET="${ET#bearer }"
[[ "$TC" == *gw_admin_session=* ]] || { echo "Cookie do Tamino sem gw_admin_session. Nada gravado."; exit 1; }
[[ "$ET" == eyJ* ]] || { echo "Token do Evo não começa com eyJ. Nada gravado."; exit 1; }
umask 077
printf 'TAMINO_COOKIE=%s\nEVO_TOKEN=%s\n' "$TC" "$ET" > .env
echo "OK: .env gravado (chmod 600)."
