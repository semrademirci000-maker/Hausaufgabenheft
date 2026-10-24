# Affen-Tag – native iOS-App (SwiftUI + SceneKit)

Ein Kletter-Fangspiel im Stil von Gorilla Tag – für **iPhone und iPad**, mit
**Computer-Affen (Bots)** und **Mehrspieler**. Du hast keine Beine: Du bewegst
dich nur, indem du dich mit den Händen vom Boden, von Wänden und Bäumen abstößt.

> **Wichtig:** Dieser Code wurde auf einem Linux-Rechner geschrieben – dort gibt es
> kein Xcode. Er ist deshalb **nicht kompiliert getestet**. Beim ersten Öffnen in
> Xcode können einzelne Kleinigkeiten auftauchen, die Xcode dir direkt anzeigt.
>
> Name, Grafiken und Sounds des Originals gehören den Entwicklern von Gorilla Tag
> und dürfen nicht kopiert werden. Deshalb ist hier alles selbst gebaut: eigene
> Low-Poly-Welten, eigene Affen, selbst berechnete Klänge – das Spielgefühl ist
> aber dasselbe.

## Öffnen und starten

1. Ordner `ios/AffenTag` auf einen Mac kopieren.
2. `AffenTag.xcodeproj` doppelklicken (Xcode 16 oder neuer).
3. Oben das Ziel auf ein **iPhone** oder **iPad** stellen.
4. Auf ▶ drücken.

Fürs eigene Gerät: *Xcode → Einstellungen → Accounts → Apple-ID hinzufügen*,
dann unter **Signing & Capabilities** dein Team auswählen. Die Bundle-ID
`de.schulplaner.affentag` darfst du auf etwas Eigenes ändern.

Falls Xcode die Projektdatei nicht öffnen kann: `brew install xcodegen`, dann im
Ordner `ios/AffenTag` `xcodegen generate` ausführen.

Mindestversion: **iOS 17**. Das Spiel läuft nur **quer**.

## So spielst du

| Finger | Wirkung |
|---|---|
| linke Bildschirmhälfte | **linke Hand** |
| rechte Bildschirmhälfte | **rechte Hand** |
| oberer Streifen | **umschauen** (oder am Computer „Gyro“ an: Gerät drehen) |

* Ein Finger, der auf dem Bildschirm liegt, ist eine Hand, die **greifen** kann.
  Finger nach unten = Arm nach unten, nach oben = Arm nach oben, seitlich = seitlich.
* Berührt die Hand den Boden und du ziehst weiter nach unten, **schiebt sich dein
  Körper nach vorne-oben** – ein Sprung. Abwechselnd links/rechts = rennen.
* An Wände, Bäume und Äste greifen und runterziehen = **klettern**.
* Loslassen mitten im Schwung = **fliegen**. Lava-Affen springen weiter (×1,3 statt ×1,1).
* Der Finger-Kreis wird **grün**, solange deine Hand sich irgendwo festhält.
* Jede Oberfläche klingt anders (Holz, Stein, Blätter, Eis …), dazu Vibration.

## Alles drin

**Orte**
- **Stumpf** – der Treffpunkt im hohlen Baumstumpf: Computer, Kletter-Vorsprünge
  und leuchtende **Tore** zu jeder Karte (einfach durchlaufen).
- **Wald** – Riesenbäume, Baumhaus mit zwei Etagen, Hängebrücken, Äste.
- **Höhlen** – dunkel, Tropfsteine, leuchtende Kristalle, Laternen, Lorengleis.
- **Canyon** – rote Felstürme mit Brücken, Felsbogen, Kakteen.
- **Berge** – Stufenberg mit Gipfelfahne, **rutschige Eisschollen**, Tannen, Schneefall.
- **Strand** – Palmen, Steg, Rettungsturm, Strandhütten.
- **Wolken** – Wolkeninseln, Tempel, **wenig Schwerkraft**.

**Spielmodi**
- **Infektion** – einer ist Lava; wen er berührt, wird auch Lava. Alle Lava → neue Runde.
- **Fangen** – einer ist es; berührt → du bist es (3 s eingefroren, kein Zurückfangen).
- **Jagd** – jeder hat ein Ziel (Farbe am Handgelenk + Kompass oben). Fang dein Ziel, übernimm seins. Der Letzte gewinnt.
- **Farbschlacht** – je 3 Ballons, Schleuder-Knopf schießt Farbkugeln. Alle Ballons weg = raus.
- **Locker** – nur klettern und abhängen.

**Der Computer** (im Stumpf hinlaufen → Knopf „COMPUTER“, oder im Menü)
- RAUM: privaten Raum-Code eintippen → Freunde mit demselben Code landen bei dir
- NAME, FARBE (Rot/Grün/Blau 0–9), DREHEN (sanft/ruck/aus, Tempo, Arm-Empfindlichkeit, Gyro)
- MODUS, WARTESCHLANGE (Standard/Minispiele/Wettkampf), GRUPPE (alle auf eine Karte)
- BOTS (0–9 Computer-Affen, Stärke 1–3), TON (Lautstärke, Vibration), INFO

**Laden** – Hüte und Brillen (Krone, Bananenhut, Propellerkappe, Heiligenschein,
Sonnenbrille …) gegen 💎 Steine. Steine gibt es fürs Fangen, Treffen, Überleben und Gewinnen.

**Computer-Affen** – hüpfen mit Armschwüngen, klettern Wände hoch (ab Stärke 2),
jagen dich als Lava, flüchten vor Lava, zielen in der Farbschlacht.

## Mehrspieler

Am Computer unter **RAUM → VERBINDUNG** wählen:

* **In der Nähe (Standard)** – iPhone und iPad im selben WLAN oder per Bluetooth
  finden sich automatisch (MultipeerConnectivity). Kein Server, kein Konto nötig.
  Beim ersten Start fragt iOS nach „Lokales Netzwerk“ → **Erlauben**.
* **Online (Game Center)** – übers Internet. Dafür in Xcode unter
  *Signing & Capabilities → + Capability → Game Center* einschalten und die App
  in App Store Connect anlegen (Game Center braucht einen bezahlten Entwickler-Account).
* **Offline** – nur du und die Bots.

Wer auf derselben Karte im selben Modus und derselben Warteschlange ist, landet im
selben öffentlichen Raum. Mit einem **Raum-Code** spielt ihr privat. Bots füllen
den Raum bis 10 Affen auf. Das Gerät mit der kleinsten Spieler-ID steuert die Bots
und die Runden für alle; geht es weg, übernimmt automatisch das nächste.

Sprachchat gibt es (noch) nicht.

## Aufbau des Codes

| Datei | Inhalt |
|---|---|
| `AffenTagApp.swift` | Einstieg, Wechsel Titel ↔ Spiel |
| `Model/Lokomotion.swift` | **Die Arm-Fortbewegung**: Hände kleben an Flächen, der Körper wird um den Rest verschoben, Schwung beim Loslassen |
| `Model/Welt.swift` | Kollision: Kisten, Zylinder, Kugeln; Hände-Abfrage und Körper-Herausschieben |
| `Model/Spiel.swift` | 60-Hz-Takt, Fangen, Runden aller Modi, Farbkugeln, Netz-Abgleich, Steine, HUD |
| `Model/BotHirn.swift` | Computer-Affen |
| `Model/Spieler.swift` | Affe, Modi, Rundenzustand, Kosmetik-Liste |
| `Model/Einstellungen.swift` | Alles vom Computer, gespeichert in UserDefaults |
| `Model/Mathe.swift` | Vektoren, Winkel, reproduzierbarer Zufall |
| `Szene/Karten.swift` | Alle sieben Orte |
| `Szene/KartenBauer.swift` | Baut Bild und Kollision gleichzeitig (Low-Poly, zu einem Knoten verschmolzen) |
| `Szene/AffeKnoten.swift` | 3D-Affe mit Armen, Lava-Glühen, Namensschild, Ballons, Hüte/Brillen |
| `Szene/SzeneVerwalter.swift` | Szene, Himmel, Nebel, Licht, Kamera |
| `Netz/*.swift` | Nachrichten, WLAN/Bluetooth (MultipeerConnectivity), Online (GameKit) |
| `Views/SzeneAnsicht.swift` | SceneKit-Ansicht mit Mehrfinger-Steuerung |
| `Views/SpielView.swift` | HUD, Anleitung, Menü |
| `Views/ComputerView.swift` | Der grüne Computer mit Tastatur |
| `Views/LadenView.swift`, `Views/TitelView.swift` | Laden und Startbildschirm |
| `Audio/AffenKlang.swift` | Alle Klänge, Sample für Sample berechnet |

### Wie die Arm-Fortbewegung rechnet

Jede Hand hat zwei Armwinkel (hoch/runter, links/rechts). Daraus ergibt sich, wo
die Hand sein **will**: Schulter + Richtung × Armlänge. Steckt dieser Punkt in
einer Fläche, wird die Hand an die Oberfläche gesetzt und **der Körper um genau
die Differenz verschoben**. Solange die Hand weiter gegen die Fläche drückt,
bleibt sie dort kleben (auf Eis rutscht sie mit). Die Körpergeschwindigkeit der
letzten fünf Bilder wird beim Loslassen mitgenommen – so entstehen Sprünge und
Flüge, genau wie im Original.
