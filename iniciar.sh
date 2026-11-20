#!/usr/bin/env bash
# Linux/macOS: renova sessões, sobe o painel, abre o navegador e o Claude Code.
set -u
DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$DIR" || exit 1
DADOS="${XDG_DATA_HOME:-$HOME/.local/share}/tamino-atendimento"
LOG="$DADOS/painel.log"
mkdir -p "$DADOS"

echo "== Atendimento Tamino =="
echo "-> Renovando sessões..."
if ! uv run -q renovar.py; then
    echo
    echo "Sessão expirada. Vai abrir uma janela: faça login no Tamino e no Evo e volte aqui."
    uv run -q renovar.py login || { echo "Login falhou."; read -rp "Enter para sair"; exit 1; }
fi
uv run -q app.py checar

if curl -s -m 2 -o /dev/null http://127.0.0.1:8765/; then
    echo "-> Painel já estava rodando."
else
    echo "-> Subindo o painel (log: $LOG)..."
    nohup uv run -q app.py painel >>"$LOG" 2>&1 &
    for _ in $(seq 1 30); do curl -s -m 2 -o /dev/null http://127.0.0.1:8765/ && break; sleep 1; done
fi

echo "-> Abrindo o painel e o Evo no navegador..."
xdg-open http://127.0.0.1:8765 >/dev/null 2>&1 &
xdg-open "${EVO_WEB:-https://evo.dlip.com.br}/conversations" >/dev/null 2>&1 &

if command -v claude >/dev/null; then
    echo "-> Abrindo Claude Code... (o painel continua rodando ao fechar)"
    exec claude
fi
