# Poppy Playtime – Kapitel 6: Das Tiefe Werk (Fan-Edition)

Ein inoffizielles 3D-Fan-Horrorspiel im Browser (Three.js). Alle Grafiken, das Monster
und alle Töne werden live im Code erzeugt – es gibt keine Bild- oder Audiodateien.

## Starten

Über einen Webserver öffnen (ES-Module funktionieren nicht per Doppelklick als Datei):

```bash
cd Hausaufgabenheft
python3 -m http.server 8000
# dann im Browser / auf dem iPad: http://<Computer-IP>:8000/poppy6/
```

## Worum geht's?

Nach dem Absturz des Aufzugs steckst du tief unter der Playtime-Co.-Fabrik fest.
Poppy meldet sich über Funk: Das Ausgangstor braucht Strom. Finde **3 Batterien**, bring sie
zum **Generator** – und pass auf **Langbein** auf, der hier unten schläft.

- **GrabPack**: blaue und rote Hand schießen, Batterien greifen, Hebel ziehen
- **Farbige Türen** öffnen sich mit dem Hebel der gleichen Farbe
- **Langbein** wacht auf, sobald du die erste Batterie nimmst. Er hört Rennen, sieht Licht,
  jagt dich und verliert dich, wenn du die Sichtlinie brichst oder dich in einem **Spind** versteckst
  (aber nicht, wenn er dich hineinklettern sieht!)
- **Notizen** an den Wänden verraten Tipps
- **Finale**: Wenn der Generator läuft, geht der Alarm los – renn zum Ausgang!

## Steuerung

| Tastatur/Maus | iPad/Touch |
|---|---|
| WASD laufen, Maus umsehen | linker Stick, rechts wischen |
| Linke / rechte Maustaste: blaue / rote Hand | ✋ blau / ✋ rot |
| Shift rennen, C ducken | RENNEN / DUCKEN |
| E benutzen / verstecken, F Taschenlampe | E, 🔦 |

## Dateien

- `game.js` – Welt, Spieler, GrabPack, Monster-KI, Story, Menüs
- `monster.js` – Langbein-Modell und Animation
- `textures.js` – alle Texturen (auf Canvas gemalt)
- `audio.js` – alle Geräusche und Musik (Web Audio)
- `map.js` – die Karte als Textraster (leicht selbst umzubauen!)
- `vendor/` – Three.js r160 (MIT-Lizenz)

Poppy Playtime © Mob Entertainment. Dies ist ein nicht-kommerzielles Fan-Projekt.
