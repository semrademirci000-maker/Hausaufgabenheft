#!/usr/bin/env python3
"""Kopiert das Web-Spiel (../../neonhafen/index.html) als EINE Datei in die App.

Die Schriften werden dabei als data:-URIs eingebettet, damit die App ohne Internet
und ohne Unterordner im App-Bundle funktioniert. Nach jeder Änderung am Spiel einmal
ausführen:   python3 spiel-einbauen.py
(Der GitHub-Workflow macht das vor jedem Build automatisch.)
"""
import base64, pathlib, re

hier = pathlib.Path(__file__).resolve().parent
web = hier.parent.parent / "neonhafen"
html = (web / "index.html").read_text(encoding="utf-8")

def schrift(m):
    datei = web / m.group(1)
    b64 = base64.b64encode(datei.read_bytes()).decode()
    return f'url(data:font/woff2;base64,{b64})'

html = re.sub(r'url\((fonts/[^)]+\.woff2)\)', schrift, html)
# Web-Only-Teile, die es in der App nicht braucht
html = re.sub(r'<link rel="(apple-touch-icon|icon|manifest)"[^>]*>\n?', '', html)
ziel = hier / "Neonhafen" / "Spiel" / "neonhafen.html"
ziel.write_text(html, encoding="utf-8")
print(f"{ziel.relative_to(hier)} geschrieben ({len(html)//1024} KB)")
