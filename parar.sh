#!/usr/bin/env bash
# Para o painel/vigia do atendimento.
pkill -f '[a]pp.py painel' && echo "Painel parado." || echo "Painel não estava rodando."
