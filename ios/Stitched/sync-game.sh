#!/bin/sh
# Kopiert das Web-Spiel aus ../../stitched in die App (Ordner Stitched/Game).
# Nach jeder Änderung am Spiel einmal ausführen.
set -e
cd "$(dirname "$0")"
SRC=../../stitched
DST=Stitched/Game
rm -rf "$DST"
mkdir -p "$DST/vendor"
cp "$SRC"/index.html "$SRC"/style.css "$SRC"/*.js "$SRC"/icon.png "$DST"/
cp "$SRC"/vendor/three.module.min.js "$DST"/vendor/
cp -R "$SRC"/vendor/jsm "$DST"/vendor/
cp -R "$SRC"/voices "$DST"/   # Stimmen-Paket (echte Sprecher)
echo "Spiel nach $DST kopiert."
