#!/bin/sh
# Kopiert das Web-Spiel aus ../../poppy6 in die App (Ordner PoppyPlaytime6/Game).
# Nach jeder Änderung am Spiel einmal ausführen.
set -e
cd "$(dirname "$0")"
SRC=../../poppy6
DST=PoppyPlaytime6/Game
rm -rf "$DST"
mkdir -p "$DST/vendor"
cp "$SRC"/index.html "$SRC"/style.css "$SRC"/*.js "$DST"/
cp "$SRC"/vendor/three.module.min.js "$DST"/vendor/
cp -R "$SRC"/vendor/jsm "$DST"/vendor/
echo "Spiel nach $DST kopiert."
