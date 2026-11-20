#!/usr/bin/env python3
"""Pega o cookie do Tamino e o token do Evo de um perfil de navegador dedicado e grava no .env.

  uv run renovar.py login   # 1a vez (ou sessão caiu): abre janela, você loga nos 2 sites
  uv run renovar.py         # headless: abre os sites, deixa o Evo renovar o JWT, grava .env

O app chama o modo headless sozinho quando recebe 401/403.
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
if sys.platform == "win32":
    _BASE = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
else:
    _BASE = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
PERFIL = _BASE / "tamino-atendimento" / "navegador"  # perfil só desta automação, separado do seu navegador
TAMINO_WEB = os.environ.get("TAMINO_WEB", "https://admin.tamino.com.br")
TAMINO_API = os.environ.get("TAMINO_API", "https://api.tamino.com.br")
EVO_WEB = os.environ.get("EVO_WEB", "https://evo.dlip.com.br")
TAMINO = TAMINO_WEB + "/lookup"
EVO = EVO_WEB + "/conversations"


def gravar_env(novos):
    env = AQUI / ".env"
    linhas = env.read_text(encoding="utf-8").splitlines() if env.exists() else []
    linhas = [l for l in linhas if l.split("=", 1)[0].strip() not in novos]
    linhas += [f"{k}={v}" for k, v in novos.items()]
    tmp = env.with_suffix(".tmp")
    tmp.touch(mode=0o600)
    tmp.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    tmp.replace(env)  # atômico: o app nunca lê .env pela metade


def main():
    login = len(sys.argv) > 1 and sys.argv[1] == "login"
    PERFIL.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(str(PERFIL), headless=not login)
        tam, evo = ctx.new_page(), ctx.new_page()
        tam.goto(TAMINO)
        evo.goto(EVO)
        if login:
            input("Faça login no Tamino e no Evo nas abas abertas, depois aperte Enter aqui... ")
            tam.reload()
            evo.reload()
        # o Evo troca o JWT vencido via /auth/refresh ao carregar a lista de conversas
        evo.wait_for_load_state("networkidle", timeout=30000)
        tam.wait_for_load_state("networkidle", timeout=30000)
        token = evo.evaluate("localStorage.getItem('access_token')")
        cookies = {c["name"]: c["value"] for c in ctx.cookies(TAMINO_API)}
        ctx.close()

    faltando = [n for n, ok in [("Evo access_token", token), ("Tamino gw_admin_session", cookies.get("gw_admin_session"))] if not ok]
    if faltando:
        sys.exit(f"Sem sessão: {', '.join(faltando)}. Rode: uv run {Path(__file__).name} login")
    novos = {"EVO_TOKEN": token, "TAMINO_COOKIE": "; ".join(f"{k}={v}" for k, v in cookies.items() if k.startswith("gw_"))}
    gravar_env(novos)
    print("OK: .env atualizado.")


if __name__ == "__main__":
    main()
