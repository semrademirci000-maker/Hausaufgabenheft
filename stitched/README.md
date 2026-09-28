# STITCHED – Kapitel 1: Das Tiefe Werk

Das erste Spiel von **Muaz**: ein 3D-Horrorspiel im Browser (Three.js).
Alle Grafiken, Figuren und Töne werden live im Code erzeugt – es gibt keine Bild- oder Audiodateien.

## Starten

Über einen Webserver öffnen (ES-Module funktionieren nicht per Doppelklick als Datei):

```bash
cd Hausaufgabenheft
python3 -m http.server 8000
# dann im Browser / auf dem iPad: http://<Computer-IP>:8000/stitched/
```

## Worum geht's?

Nach dem Absturz des Aufzugs steckst du auf Ebene 9 tief unter der Spielzeugfabrik **Joyworks** fest.
Die Stoffpuppe **Mila** meldet sich über Funk: Das Ausgangstor braucht Strom. Finde **3 Batterien**,
bring sie zum **Generator** – und nimm dich vor **Zipper** in Acht.

## Die Figuren

- **Zipper** – ein riesiges Flicken-Kuscheltier mit Knopfaugen und einem Reißverschluss als Mund,
  hinter dem Zähne aus Nähnadeln stecken. Seine Finger sind Nadeln. Er jagt dich.
- **The Tailor** – ein Skelett aus Spielzeug- und Nähmaschinenteilen mit riesiger Metallklaue
  und einer Garnspule auf dem Kopf. Er sitzt in Zelle 0 und zieht alle Fäden.
- **Mila** – eine Stoffpuppe mit türkisem Wollhaar. Sie hilft dir über Funk.

## So spielt es sich

- Startraum → Flur → große Halle mit dem Generator. Die Batterien liegen schnell erreichbar:
  im Startraum, im Flur und direkt hinter der linken Tür. Links und rechts geht je ein Weg ab.
- **Gripper**: grüne und orange Hand schießen, Batterien greifen, Hebel ziehen.
  Jede Tür hat ihren Hebel direkt daneben.
- **Zipper** wartet in der Halle und greift an, sobald er dich sieht. Er hört Rennen und sieht Licht.
  **Geduckt** (C) schleichst du fast so schnell wie beim Gehen und er bemerkt dich nur ganz aus der Nähe.
  Brich die Sichtlinie ab oder versteck dich in einem **Spind** (nicht, wenn er dich hineinklettern sieht!).
- **Speicherpunkte**: Das Spiel speichert automatisch (am Start, bei jeder Batterie, jedem Hebel).
  Erwischt dich Zipper, geht es mit „Nochmal“ am letzten Speicherpunkt weiter. Im Menü gibt es „Fortsetzen“.
- **Flucht**: Wenn der Generator läuft, geht der Alarm los – renn durch das Ausgangstor!
- **Die Nähstube** (zweiter Teil): Das Tor kracht hinter dir zu. Zieh den lila Hebel, hol die
  **Schlüsselkarte** – dann kriecht Zipper aus der Lüftung. Öffne mit der Karte die gelbe
  Sicherheitstür und fahr mit dem **Aufzug** nach oben: Kapitel 1 geschafft.
- **Stimmen**: Mila, The Tailor, Zipper und die Fabrik-Durchsage sprechen über die Sprachausgabe
  des Geräts. In den Einstellungen gibt es „Stimmen testen“ und ein eigenes Menübild.

## Steuerung

| Tastatur/Maus | iPad/Touch |
|---|---|
| WASD laufen, Maus umsehen | linker Stick, rechts wischen |
| Linke / rechte Maustaste: grüne / orange Hand | ✋ grün / ✋ orange |
| Shift rennen, C ducken | RENNEN / DUCKEN |
| E benutzen / verstecken, F Taschenlampe | E, 🔦 |

## Dateien

- `game.js` – Welt, Spieler, Gripper, Monster-KI, Story, Menüs
- `monster.js` – Zipper (Modell und Animation)
- `characters.js` – The Tailor, Mila, Zipper-Plüschtiere, Klauenhand
- `menuStage.js` – das 3D-Bild im Hauptmenü (Teeparty)
- `textures.js` – alle Texturen (auf Canvas gemalt)
- `audio.js` – alle Geräusche, Musik und Stimmen
- `map.js` – die Karte als Textraster (leicht selbst umzubauen!)
- `vendor/` – Three.js r160 und einige Three.js-Erweiterungen (MIT-Lizenz)
