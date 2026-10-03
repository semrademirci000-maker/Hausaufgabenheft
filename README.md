# Mein Schulplaner – Stundenplan & Hausaufgabenheft

Die App gibt es zweimal:

* **Web-App** (dieser Ordner) – läuft sofort in Safari und lässt sich über
  „Zum Home-Bildschirm“ wie eine App aufs iPad legen.
* **Native SwiftUI-App** in [`ios/`](ios/README.md) – zum Öffnen in Xcode auf einem Mac.

Eine App fürs iPad: Erst wählst du **Stundenplan** oder **Hausaufgabenheft**.
Das Heft öffnet sich wie ein echtes Buch mit weißen Seiten und schwarzen Linien –
und du blätterst mit einem Wisch in 3-D zum nächsten Tag.

## Was die App kann

**Startseite**
- Zwei große Karten: *Stundenplan* und *Hausaufgabenheft*.

**Stundenplan**
- Montag bis Freitag nebeneinander, die Stunden untereinander.
- Tippe auf ein Feld → Fach auswählen. Jedes Fach hat seine eigene Farbe.
- Farben und Namen jederzeit ändern: Knopf **Fächer** (auch neue Fächer anlegen oder löschen).
- Mehr oder weniger Stunden am Tag: **+ Stunde** / **− Stunde** (1 bis 12).
- Zwei gleiche Stunden hintereinander (z. B. 1. und 2. Stunde Deutsch) werden
  automatisch zu einem Block zusammengefasst.

**Hausaufgabenheft**
- Auf der linken Seite steht genau der Stundenplan von diesem Tag, untereinander
  auf den Linien – z. B. `1.–2. Deutsch`, `4.–5. Mathe`.
- Neben jedem Fach ist ein **blauer Knopf mit Plus**. Tippst du drauf, kannst du
  die Hausaufgabe eintippen (z. B. „Arbeitsheft Seite 15, Nr. 3“).
- Hast du nichts auf, tippst du auf **Keine Hausaufgaben** – dann steht das da.
- Erledigt? Häkchen antippen, dann wird die Aufgabe durchgestrichen.
- Rechte Seite: Platz für **Notizen** (bei vielen Fächern läuft der Stundenplan
  dort weiter).
- **Blättern:** einfach nach links wischen → die Seite dreht sich in 3-D um und
  der nächste Schultag steht da. Nach rechts wischen geht zurück.
  (Wochenenden werden übersprungen; die Pfeile oben und `Heute` gehen auch.)

**Entspannungsmusik (Lo-Fi)**
- Der runde Knopf unten rechts (♪) schaltet ruhige Lo-Fi-Musik an: weiche Akkorde,
  langsamer Beat, leises Vinyl-Knistern. Der Regler daneben stellt die Lautstärke ein.
- Die Musik wird direkt in der App erzeugt (Web Audio) – keine Musikdateien,
  kein Internet nötig.

Alles wird automatisch auf dem Gerät gespeichert (localStorage) – auch ohne Internet.

## Spieler-Statistik (nur für dich)

Wenn die App über GitHub Pages läuft, zählt sie anonym mit, wie viele Leute sie
benutzen – nur „+1“, keine Namen und keine Hausaufgaben (Zähldienst: abacus).
Die Zahlen siehst du auf `statistik.html`, z. B.
`https://semrademirci000-maker.github.io/Hausaufgabenheft/statistik.html`.
Die Seite ist nirgends in der App verlinkt. Mit **Mein Gerät nicht mitzählen**
zählen deine eigenen Starts nicht mit.

## Der letzte Bus – Nachtkiosk (3D-Actionspiel)

In `derletztebus/` steckt ein 3D-Spiel (three.js), am besten **quer** gespielt:
Der Bus N13 setzt dich an der Endstation ab, und du übernimmst die Nachtschicht im Kiosk.

- **Kiosk führen:** Kunden steigen aus dem Bus und kommen ans Fenster. Hol die bestellten
  Sachen aus dem Regal, leg sie auf die Theke, kassiere an der Kasse und gib das
  **richtige Wechselgeld** raus (Münzen und Scheine antippen).
- **Monster:** Manche Kunden sind keine Menschen (leuchtende Augen, kein Schatten, Zucken,
  seltsame Wünsche). Dann: **Rollladen runter!** Wer zu spät ist, wird gejagt und muss
  **hinten raus zum Bus rennen** – Ausdauer einteilen!
- **3 Nächte** (22 Uhr bis 6 Uhr), 3 Herzen, jede Nacht mehr Monster. Vorne gibt es eine kurze Geschichte.
- Steuerung am Handy: links Stick, Wischen zum Umsehen, Antippen zum Benutzen.
  Am Rechner: WASD, Maus ziehen, Klick/E, Shift rennen, R Rollladen.
- Ton (Regen, Kasse, Schreie, Herzschlag) wird live im Browser erzeugt.

Öffnen: `https://semrademirci000-maker.github.io/Hausaufgabenheft/derletztebus/`.

> Die SwiftUI-App in `ios/DerLetzteBus` enthält noch die erste, reine Textgeschichte.

## Auf dem iPad benutzen

Die App ist eine Web-App (HTML/CSS/JavaScript), **keine native SwiftUI-App**.
Auf dem iPad fühlt sie sich trotzdem wie eine App an:

1. Dateien auf den Rechner laden und einen kleinen Server starten
   (im Ordner der App):
   ```bash
   python3 -m http.server 8000
   ```
2. Auf dem iPad im selben WLAN in Safari öffnen:
   `http://<IP-des-Rechners>:8000`
3. In Safari auf **Teilen → Zum Home-Bildschirm**.
   Danach startet die App im Vollbild mit eigenem Icon und funktioniert offline.

Zum schnellen Ausprobieren am Rechner reicht es, `index.html` im Browser zu öffnen
(dann ohne Offline-Modus).

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Aufbau der drei Screens und der Dialoge |
| `styles.css` | Gestaltung: Papier, Buch, 3-D-Blättern, Stundenplan |
| `app.js` | Daten, Stundenplan, Hausaufgaben, Blätter-Animation |
| `music.js` | Lo-Fi-Musik, im Browser erzeugt |
| `statistik.html` | Deine private Spieler-Statistik |
| `stitched/` | Das Spiel STITCHED von Muaz, mit anonymem Zähler |
| `stitched/board.html` | Privates Board: wer STITCHED gespielt hat |
| `derletztebus/` | 3D-Actionspiel „Der letzte Bus – Nachtkiosk“ |
| `ios/DerLetzteBus/` | „Der letzte Bus“ als SwiftUI-App (noch die Textgeschichte) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Betrieb, App-Icon, Home-Bildschirm |
