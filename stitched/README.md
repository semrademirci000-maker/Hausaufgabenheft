# STITCHED – Kapitel 1: Das Tiefe Werk

Das erste Spiel von **Muaz**: ein 3D-Horrorspiel im Browser (Three.js).
Alle Grafiken, Figuren und Töne werden live im Code erzeugt – nur die Stimmen kann man selbst aufnehmen.

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

- Startraum → Flur → große Halle mit dem Generator. Zwei Batterien liegen nebeneinander im Startraum,
  die dritte auf einer Kommode mit Puppe neben dem Käfig von The Tailor (rechter Raum).
- **Gripper**: grüne und orange Hand schießen, Batterien greifen, Hebel ziehen.
  Jede Tür hat ihren Hebel direkt daneben.
- **Zipper** wartet in der Halle und greift an, sobald er dich sieht. Er hört Rennen und sieht Licht.
  **Geduckt** (C) schleichst du fast so schnell wie beim Gehen und er bemerkt dich nur ganz aus der Nähe.
  Brich die Sichtlinie ab oder versteck dich in einem **Spind** (nicht, wenn er dich hineinklettern sieht!).
- **Speicherpunkte**: Das Spiel speichert automatisch (am Start, bei jeder Batterie, jedem Hebel).
  Erwischt dich Zipper, geht es mit „Nochmal“ am letzten Speicherpunkt weiter. Im Menü gibt es „Fortsetzen“.
- **Flucht**: Wenn der Generator läuft, geht der Alarm los – renn durch das Ausgangstor!
- **Die Nähstube** (zweiter Bereich von Kapitel 1): Das Tor kracht hinter dir zu. Zieh den lila Hebel, hol die
  **Schlüsselkarte** – dann kriecht Zipper aus der Lüftung. Öffne mit der Karte die gelbe
  Sicherheitstür.
- **Die Montagehalle**: Die Tür knallt zu. Der Aufzug braucht **2 Sicherungen** –
  eine liegt hinter einer **Grube** (nur mit dem Greifer erreichbar), die andere hinter der türkisen Tür.
  Doch das Aufzugseil ist gerissen! Die Sicherungen öffnen das **Lagertor** in **20 Sekunden** – und Zipper
  bricht aus der zweiten Lüftung. Durchhalten, dann rein ins Lager.
- **Das Spielzeuglager**: ein Labyrinth aus hohen Regalen. Finde die **4 Zahlenwürfel** (rot, gelb, grün, blau)
  und gib den Code am **Zahlenschloss** ein. Nach einer Weile kriecht Zipper durch die Lüftung herein –
  duck dich zwischen den Regalen. Ein falscher Code piept laut!
- **Das Spielzimmer**: Schieß eine Hand auf die **Stromspule** – die Hand ist dann ein paar Sekunden geladen.
  Schieß sie schnell auf einen **Empfänger**. Zwei Empfänger öffnen die Strom-Tür. Nach dem ersten kommt Zipper.
- **Der Förderband-Tunnel** (Finale): Zipper bricht direkt hinter dir durch. **Renn** durch den langen Tunnel
  (hier geht dir die Puste nicht aus) bis in den **Lastenaufzug**: Kapitel 1 geschafft.
- **Stimmen – echte Sprecher**: Im **Sprecher-Studio** (Einstellungen) kann man jeden Satz selbst aufnehmen
  (Mikrofon oder Audiodatei, z. B. aus Sprachmemos). Im Spiel hört man dann die Aufnahmen mit Effekt:
  Mila über Funk, The Tailor tief und hallend, Zipper verzerrt. Ohne Aufnahme gibt es Untertitel
  (die Computerstimme lässt sich in den Einstellungen wieder einschalten). „Alle sichern“ speichert alle
  Aufnahmen in eine Datei. Legt man diese Datei als `voices/pack.json` in den Spielordner, hören alle
  Spieler die Stimmen.
- **Helligkeit** lässt sich in den Einstellungen leicht anpassen.
- **Flüssig auf dem iPad**: Unbewegliche Teile werden zu wenigen großen Objekten zusammengefasst, und wenn das
  Gerät nicht hinterherkommt, senkt das Spiel automatisch ein wenig die Auflösung.

## Steuerung

| Tastatur/Maus | iPad/Touch |
|---|---|
| WASD laufen, Maus umsehen | linker Stick, rechts wischen |
| Linke / rechte Maustaste: grüne / orange Hand | LINKS / RECHTS |
| Shift rennen, C ducken | RENNEN / DUCKEN |
| E benutzen / verstecken, F Taschenlampe | E, LICHT |

## Dateien

- `game.js` – Welt, Spieler, Gripper, Monster-KI, Story, Menüs
- `monster.js` – Zipper (Modell und Animation)
- `characters.js` – The Tailor, Mila, Zipper-Plüschtiere, Klauenhand
- `menuStage.js` – das 3D-Bild im Hauptmenü (Teeparty)
- `textures.js` – alle Texturen (auf Canvas gemalt)
- `audio.js` – alle Geräusche, Musik und Stimm-Effekte
- `voices.js`, `voicelines.js` – Sprecher-Studio: Aufnahmen und Liste aller gesprochenen Sätze
- `merge.js` – fasst viele kleine Teile zusammen (für flüssiges Spielen)
- `map.js` – die Karte als Textraster (leicht selbst umzubauen!)
- `vendor/` – Three.js r160 und einige Three.js-Erweiterungen (MIT-Lizenz)
