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

## Der letzte Bus (Gruselgeschichte zum Mitspielen)

In `derletztebus/` steckt eine interaktive Gruselgeschichte:
Du steigst nachts in den Nachtbus N13 – aber die Haltestellen werden immer
seltsamer. An jeder Haltestelle steigt jemand Neues ein. **Einer davon ist kein Mensch.**

- Zwischen zwei Haltestellen kannst du zwei Dinge tun: mit Leuten reden,
  sie heimlich genauer ansehen, ins Spiegelbild der Scheibe schauen oder zum Fahrer gehen.
- Bei jeder Fahrt wird neu ausgelost, wer kein Mensch ist. Auch Menschen wirken
  manchmal komisch – genau hinsehen!
- An der Endstation musst du sagen, wer es ist. Es gibt vier Enden zu finden.
- Ton (Motor, Regen, Gong) wird live im Browser erzeugt.
- Gespielt wird am besten **quer** wie Brawl Stars oder Roblox: links das Busfenster,
  rechts die Geschichte. Hält man das Handy hochkant, erscheint ein Hinweis zum Drehen.
- Das Spiel gibt es auch als **native SwiftUI-App** in [`ios/DerLetzteBus`](ios/DerLetzteBus/README.md).

Öffnen: `derletztebus/index.html`, z. B.
`https://semrademirci000-maker.github.io/Hausaufgabenheft/derletztebus/`.

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
| `derletztebus/` | Gruselgeschichte „Der letzte Bus“ zum Mitspielen |
| `ios/DerLetzteBus/` | „Der letzte Bus“ als native SwiftUI-App |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Betrieb, App-Icon, Home-Bildschirm |
