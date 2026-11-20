#!/usr/bin/env python3
"""Renderiza a aba Insights em PDF ou JPEG (chamado pelo painel).

  uv run exportar.py <url> <saida.pdf|saida.jpg>
"""
import sys

from playwright.sync_api import sync_playwright

url, saida = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1100, "height": 900}, device_scale_factor=2)
    pg.goto(url, wait_until="networkidle")
    if saida.endswith(".pdf"):
        pg.emulate_media(media="screen")  # mantém o tema escuro do painel
        pg.pdf(path=saida, format="A4", print_background=True, margin={"top": "12mm", "bottom": "12mm", "left": "10mm", "right": "10mm"})
    else:
        pg.screenshot(path=saida, full_page=True, type="jpeg", quality=92)
    b.close()
