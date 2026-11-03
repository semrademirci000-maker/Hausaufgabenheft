# Mein Schulplaner – Stundenplan & Hausaufgabenheft

Die App gibt es zweimal:

* **Web-App** (dieser Ordner) – läuft sofort in Safari und lässt sich über
  „Zum Home-Bildschirm“ wie eine App aufs iPad legen.
* **Native SwiftUI-App** in [`ios/`](ios/README.md) – zum Öffnen in Xcode auf einem Mac.

> **Neu: Emo, der Roboter** – [`emo/`](emo/) macht dein Handy zu Emos Gesicht
> (wie EMO Go Home). Einfach im Browser öffnen:
> https://semrademirci000-maker.github.io/Hausaufgabenheft/emo/
> Einmal antippen, Kamera und Mikrofon erlauben – danach steuerst du Emo nur mit
> Stimme und Handzeichen. Von oben nach unten wischen öffnet die Einstellungen.

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

## Affen-Tag – Kletter-Fangspiel für iPhone und iPad

In [`ios/AffenTag`](ios/AffenTag/README.md) liegt eine SwiftUI-App im Stil von
Gorilla Tag: Du bewegst dich nur mit den Armen (linke/rechte Bildschirmhälfte =
linke/rechte Hand), kletterst auf Bäume und fängst andere Affen. Mit Stumpf und
Computer, sechs Karten, fünf Modi (Infektion, Fangen, Jagd, Farbschlacht, Locker),
Hüten im Laden und Mehrspieler nur mit echten Spielern (online über Game Center oder
in der Nähe über WLAN/Bluetooth). Mit Freunden: am Computer einen Raum-Code eingeben.

**Vorschau im Browser** (ohne Mehrspieler, gleiche Arm-Physik):
https://semrademirci000-maker.github.io/Hausaufgabenheft/affentag/vorschau.html

## Costa Solera – 3D-Actionspiel an der Küste

In `neonhafen/` (Ordnername bleibt, damit der Link gleich bleibt) steckt ein eigenes
Open-World-Spiel in 3D (three.js): **Port Solera**, eine sonnige Küstenstadt mit Palmen, Strand,
Pier, Glastürmen und pastellfarbenen Häusern mit Balkonen und Markisen.

- **Realistischere Grafik:** Sonnenlicht mit echten Schatten, Tag-Nacht-Wechsel (ein Tag ≈ 16 Minuten,
  nachts Fensterlicht, Laternen, Scheinwerfer und Sterne), spiegelnde Glasfassaden und Autolacke,
  Meer mit Spiegelung und flachem Wasser am Strand.
- **Moduswahl:** **Story** (Jo kommt mit der Fähre an, sieben Kapitel mit Dialogen) oder
  **freies Spiel** mit eigenem Spielstand und Aufträgen an den **M**-Punkten.
- Fahndung bis fünf Sterne, **Lackiererei (L)** löscht sie, am **Autohof (A)** verkaufst du Autos.
- **Belebte Stadt:** bis zu 140 Fußgänger (am Handy etwa 85), auch am Strand; manche bleiben stehen.
  Ampeln an jeder Kreuzung – der Verkehr hält bei Rot. Bänke, Mülleimer, Hydranten, Wolken,
  Wellen auf dem Meer und Fassaden mit plastischen Fenstern.
- **Waffen:** „Waffen“ (oder Q/Tab) öffnet das Waffenmenü: Fäuste, Pistole, Maschinenpistole, Schrotflinte,
  Sturmgewehr und Granaten – die teuren kaufst du mit deinem Geld.
- **Handy:** „Handy“ → **Taxi rufen** (das Taxi kommt zu dir, fährt zur Kartenmarkierung, Fahrpreis nach Strecke;
  „Fahrt überspringen“ geht auch) und **Cheat eingeben**.
- **Cheat-Seite:** [`neonhafen/cheats.html`](neonhafen/cheats.html) listet alle Codes.
- **Figuren:** Gelenke an Hüfte, Knie, Schulter und Ellbogen (echter Gang, Rennen mit Vorlage), Gesicht mit Augen,
  Brauen, Mund, Ohren; Jacken, Röcke, kurze Hosen, Dutt. Wer getroffen wird, kippt nach vorn oder hinten um.
- **Blut:** dunkelrote Spritzer bei Treffern und eine Lache, die sich unter liegenden Figuren ausbreitet.
- **Waffenmodelle** aus vielen Teilen (Lauf, Schlitten, Magazin, Schaft, Zielfernrohr), Vorschau im Waffenmenü;
  lange Waffen werden mit beiden Händen gehalten.
- **Autos:** getönte Scheiben mit Fahrer und Sitzen, Türfugen, Griffe, Nummernschilder, Speichenfelgen, runde Scheinwerfer.
- **Handy** im Smartphone-Look mit Uhrzeit und App-Symbolen (Taxi, Karte, Waffen, Cheats, Menü, Ton).
- **Begehbare Gebäude:** deine **Villa Solera** (H) am Strand – in realistischer Größe mit Polstersofa (hinsetzen),
  Couchtisch, Teppich, Stehlampe, Fernseher mit animierter Eilmeldung („Solera News – Breaking News“), Küche mit
  Marmor, Kühlschrank und Insel, Bett (hinlegen, schlafen, speichern), Kleiderschrank (Outfit wechseln), Bildern,
  Vorhängen und Meerblick; daneben die geschlossene Garage mit Rolltor und **zwei Supersportwagen „Fulmine GT“**;
  **24/7-Märkte** (S) für Snacks und Getränke; Waffenladen **Kimme & Korn** (W).
- **Neue Cheats:** MINIGUN, GEIST (5 Minuten unsichtbar), TITAN (5 Minuten unbesiegbar) mit Restzeit-Anzeige,
  BLITZ (Supersportwagen). Alle Codes stehen in `neonhafen/cheats.html`.
- **Fahrmodus** im Auto wählbar (unten in der Mitte, am PC Tasten 1–4): **Eco**, **Sport**, **Race**, **Speedest** –
  mit Tacho in km/h. Die Garage der Villa betritt nur der Spieler; das Tor öffnet sich nur direkt davor oder beim Hineinfahren.
- **Ladenüberfall:** In jedem 24/7-Markt und im Waffenladen an die Kasse gehen und „Kasse überfallen“ wählen –
  mit Schusswaffe (6 Sekunden, mehr Geld) oder mit Fäusten (9 Sekunden, weniger Geld). Beim Rausgehen gibt es zwei Sterne.
- **Faustkampf:** Taste „Schlag“ (PC: V) trifft automatisch die nächste Person – Kombo aus zwei Geraden und einem
  Aufwärtshaken (K.o. mit Zeitlupe). Getroffene taumeln, die meisten wehren sich mit Deckung und sichtbarem Ausholen.
- **Polizei abhängen:** Die Polizei sucht dort, wo sie dich zuletzt gesehen hat. Bleib außer Sicht, dann verlierst du
  die Sterne schnell. Kleine Vergehen geben nur volle Sterne, wenn Polizei in der Nähe ist.
- **Umschauen:** rechte Bildschirmhälfte wischen – links/rechts drehen, hoch/runter schauen (PC: rechte Maustaste ziehen).
  Die Kamera bleibt so, bis du losläufst oder losfährst.
- **Drift:** „Drift“ (PC: Leertaste) in der Kurve – das Heck bricht aus, mit Gas hältst du den Drift. Reifenqualm,
  Quietschen und Drift-Punkte; lange Drifts bringen bis zu 300 $. In Race und Speedest driftet das Auto auch bei Vollgas in engen Kurven.
- **Viele Läden (rund 50):** 24/7-Märkte (S), Modegeschäfte „Mode Solera“ (K, Outfits kaufen), Imbisse „Solera Grill“ (I,
  Burger und Limo) und Waffenläden (W) – alle betretbar und überfallbar.
- **Flugplatz (✈)** südlich vom Strand mit Startbahn, Hangar und Tower: kleine Propellerflugzeuge selbst fliegen
  (Stick hoch = Gas und abheben, links/rechts lenken, Turbo-Taste), landen, oder in der Luft mit dem **Fallschirm** abspringen.
  Hoch über der Stadt ziehen Passagierflugzeuge vorbei.
- **Karte mit Symbolen:** Jeder Ort hat ein eigenes Symbol (Haus, Flugzeug, Einkaufswagen, T-Shirt, Burger, Pistole,
  Kreuz, Polizeischild, Spraydose, Auto, Ausrufezeichen, Schiff) – auf der großen Karte, der Minikarte und über der Tür.
  Unten auf der großen Karte gibt es eine Legende: Tippe auf ein Symbol, und der nächste Ort dieser Art wird markiert.
- **Karte mit Navi:** „Karte“ (oder Taste M, oder auf die Minikarte tippen) öffnet die große Karte.
  Tippe irgendwo hin – dort erscheint eine lila Markierung, und eine Linie zeigt dir den Weg.
- **Polizei:** Streifenwagen fahren mit Abstand hinter dir statt zu rammen. Hältst du an oder bist zu Fuß,
  steigen die Polizisten aus – bei einem Stern wollen sie dich festnehmen, ab zwei Sternen schießen sie.
- **Cheats:** Taste „Cheats“ öffnet ein Eingabefeld mit ▲▼◀▶ A B. Am PC kannst du das Cheat-Wort auch
  einfach während des Spiels tippen. Die Liste steht im Startmenü unter „Cheats anzeigen“:

  | Wirkung | Wort | Tasten |
  |---|---|---|
  | +250.000 $ | GELDREGEN | ▲ ▲ ▼ ▼ A B A B |
  | Volle Gesundheit | HEILUNG | ◀ ▶ ◀ ▶ A A B B |
  | Fahndung weg | SAUBER | ▼ ▼ ▼ B B B ◀ ▶ |
  | Zwei Sterne mehr | AERGER | ▲ ▲ ▲ A A A ▶ ◀ |
  | Sportwagen | FLITZER | ▶ A ▶ B ▲ ▲ ◀ ▼ |
  | Streifenwagen | STREIFE | B B ▼ ▲ A ▶ ▶ ▶ |
  | Transporter | LASTER | ▼ ▼ ▶ ▶ A A B ▲ |
  | Unverwundbar (an/aus) | PANZERHAUT | A B ▲ ▼ ◀ ▶ A B |
  | Turbo-Autos (an/aus) | TURBO | ▶ ▶ ▶ A ▲ ▲ ▲ B |
  | Polizei ignoriert dich (an/aus) | FRIEDEN | B A ▼ ▼ ◀ ◀ ▶ A |
  | Zeitsprung +6 Stunden | ZEITSPRUNG | ▼ ◀ ▼ ◀ B A B A |
  | Minigun | MINIGUN | B B B A A A ▲ ▼ |
  | 5 Minuten unsichtbar | GEIST | ▼ ▲ ▼ ▲ ◀ ▶ B A |
  | 5 Minuten unbesiegbar | TITAN | ▲ B ▲ B ◀ A ◀ A |
  | Supersportwagen | BLITZ | ▶ ▶ ◀ ◀ A B A ▲ |
  | Alle Waffen | ARSENAL | ▶ ◀ ▶ ◀ ▲ ▲ A B |
  | Panik in der Stadt | PANIK | ◀ ◀ A ▶ ▶ B ▲ ▼ |
- Steuerung: WASD, E, Leertaste/Klick, rechte Maustaste dreht die Kamera – am Handy linker
  Daumen-Stick, rechts wischen für die Kamera, Tasten für Einsteigen, Schuss/Drift und Hupe.

Öffnen: `https://semrademirci000-maker.github.io/Hausaufgabenheft/neonhafen/`.

**Auf allen Handys installieren:**
- **Android (und jedes andere Handy):** Link in Chrome öffnen → Menü ⋮ → *App installieren* bzw.
  *Zum Startbildschirm hinzufügen*. Startet dann im Vollbild, quer, mit eigenem Icon und
  funktioniert offline. Vibration bei Unfällen und Explosionen ist an.
- **iPhone/iPad im Browser:** in Safari *Teilen → Zum Home-Bildschirm*.
- **iPhone/iPad als echte App:** SwiftUI-App in [`ios/Neonhafen`](ios/Neonhafen/README.md).
  GitHub baut sie automatisch, `Neonhafen.ipa` liegt unter *Releases* und wird mit
  Sideloadly oder AltStore installiert.

## Der letzte Bus – Nachtkiosk (3D-Actionspiel)

In `derletztebus/` steckt ein 3D-Spiel (three.js), am besten **quer** gespielt:
Der Bus N13 setzt dich an der Endstation ab, und du übernimmst die Nachtschicht im Kiosk.

- **Kiosk führen:** Kunden steigen aus dem Bus und kommen ans Fenster. Hol die bestellten
  Sachen aus dem Regal, leg sie auf die Theke, kassiere an der Kasse und gib das
  **richtige Wechselgeld** raus (Münzen und Scheine antippen).
- **Monster:** Manche Kunden sind keine Menschen (leuchtende Augen, kein Schatten, Zucken,
  seltsame Wünsche). Dann: **Rollladen runter!** Wer zu spät ist, wird gejagt und muss
  **hinten raus zum Bus rennen** – Ausdauer einteilen!
- **Überwachungskamera:** am PC auf der Theke „KAMERA ANSEHEN“ – vier Kameras gleichzeitig
  (vorne, hinten, links, rechts), rot markiert bei Bewegung. Ab Nacht 2 schleichen manche Monster
  zur **Hintertür** – dann über die Theke durchs Fenster raus!
- **Taser:** hängt an der Wand neben der Hintertür. Bleibt ein Monster vor der Tür stehen: Tür auf und
  SCHOCKEN (3 Schüsse pro Nacht). Bei einer Jagd betäubt der Taser das Monster für ein paar Sekunden.
- **Aufgaben:** Müll rausbringen – Sack aus dem Eimer holen und hinten in den Container werfen.
  Hinter dem Zaun lauern Kreaturen …
- **Stromausfall:** Das Licht flackert und geht aus – Kasse, Rollladen und Kameras sind tot.
  Am Sicherungskasten (linke Wand) die Kabel Farbe zu Farbe verbinden und den Hauptschalter hoch.
- **Spuk:** Zwischen den Kunden passiert Unheimliches – etwas steht plötzlich hinter dir,
  ein Gesicht starrt durchs Fenster, Schritte auf dem Dach, Flüstern, blutige Schrift an der Wand,
  ein Gesicht auf dem Monitor. Das alte Wandtelefon (rechte Wand) klingelt – wer abnimmt, hört Dinge,
  die er nicht hören will. Je später die Nacht, desto öfter.
- **3 Nächte** (22 Uhr bis 6 Uhr), 3 Herzen, jede Nacht mehr Monster. Vorne gibt es eine kurze Geschichte.
- Steuerung am Handy: links Stick, Wischen zum Umsehen, Antippen zum Benutzen.
  Am Rechner: WASD, Maus ziehen, Klick/E, Shift rennen, R Rollladen.
- **Grafik:** echte Schatten, nasse Straße mit Spiegelungen, Regen, Skyline, Bloom und Filmkorn;
  Menschen und Monster mit Gesicht, Händen und Gelenken. Auf langsamen Geräten schaltet das Spiel
  von selbst auf einfachere Grafik (oder unter dem Startknopf „Grafik“ umstellen).
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
| `neonhafen/` | 3D-Actionspiel „Costa Solera“ mit Story und freiem Spiel (installierbar, offline) |
| `ios/Neonhafen/` | „Costa Solera“ als SwiftUI-App für iPhone und iPad |
| `derletztebus/` | 3D-Actionspiel „Der letzte Bus – Nachtkiosk“ |
| `ios/DerLetzteBus/` | „Der letzte Bus“ als SwiftUI-App (noch die Textgeschichte) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Betrieb, App-Icon, Home-Bildschirm |
