#!/bin/bash
# Laedt die gebaute App zu Appetize hoch, damit man sie im Browser antippen kann.
# Laeuft nur, wenn das Secret APPETIZE_TOKEN gesetzt ist.
set -uo pipefail

if [ -z "${APPETIZE_TOKEN:-}" ]; then
  echo "Kein APPETIZE_TOKEN hinterlegt - Schritt wird uebersprungen."
  {
    echo "### App im Browser testen"
    echo ""
    echo "Noch kein Appetize-Token hinterlegt. Die Anleitung steht im README unter 'Testen ohne Mac'."
  } >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi

if [ -n "${APPETIZE_PUBLIC_KEY:-}" ]; then
  ZIEL="https://api.appetize.io/v1/apps/$APPETIZE_PUBLIC_KEY"
else
  ZIEL="https://api.appetize.io/v1/apps"
fi

ANTWORT=$(curl -sS -X POST "$ZIEL" \
  -H "X-API-KEY: $APPETIZE_TOKEN" \
  -F "file=@Schulplaner-Simulator.zip" \
  -F "platform=ios")

printf '%s' "$ANTWORT" | python3 - "$GITHUB_STEP_SUMMARY" <<'PYTHON'
import json
import sys

ziel = sys.argv[1] if len(sys.argv) > 1 else ""
rohdaten = sys.stdin.read()

try:
    daten = json.loads(rohdaten)
except ValueError:
    daten = {}

link = daten.get("publicURL", "")
schluessel = daten.get("publicKey", "")

zeilen = ["### App im Browser testen", ""]
if link:
    zeilen.append("Hier antippen: " + link)
    zeilen.append("")
    zeilen.append("Dauerhafter Schluessel (als Secret APPETIZE_PUBLIC_KEY speichern): " + schluessel)
else:
    zeilen.append("Appetize meldete: " + rohdaten[:400])

text = "\n".join(zeilen) + "\n"
print(text)
if ziel:
    with open(ziel, "a", encoding="utf-8") as datei:
        datei.write(text)
PYTHON
