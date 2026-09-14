# Oakblade – native SwiftUI-App

Dasselbe Spiel wie im Ordner [`spiel/`](../../spiel/), aber **nativ in SwiftUI**
für iPad und iPhone. Die Grafik ist nicht geladen, sondern wird beim Start
Pixel für Pixel im Code gemalt – genau wie in der Web-Fassung.

> **Wichtig:** Dieser Code wurde auf einem Linux-Rechner geschrieben – dort gibt es
> kein Xcode. Er ist deshalb **nicht kompiliert getestet**. Beim ersten Öffnen in
> Xcode können einzelne Kleinigkeiten auftauchen, die Xcode dir direkt anzeigt.
> Die Spiel-Logik selbst ist eine 1:1-Übertragung der Web-Fassung, die im Browser
> vollständig durchgespielt wurde.

## Öffnen und starten

1. Ordner `ios/Oakblade` auf einen Mac kopieren.
2. `Oakblade.xcodeproj` doppelklicken (Xcode 16 oder neuer).
3. Oben links ein **iPad** auswählen (Simulator oder eigenes Gerät).
4. Auf ▶ drücken.

Für das eigene iPad einmalig: *Xcode → Einstellungen → Accounts → Apple-ID*,
danach im Projekt unter **Signing & Capabilities** dein Team auswählen. Die
Bundle-ID `de.oakblade.game` darfst du auf etwas Eigenes ändern.

Falls die Projektdatei nicht passt: `brew install xcodegen`, dann in diesem
Ordner `xcodegen generate`.

Mindestversion: **iOS 17**. Die App läuft im **Querformat** (das Bild ist 320 × 240
Pixel groß und wird passend hochskaliert).

## Steuerung

| | auf dem Bildschirm | mit Tastatur (iPad) |
|---|---|---|
| Laufen | Steuerkreuz unten links | WASD oder Pfeiltasten |
| Schlagen | großer roter Knopf ⚔ | Leertaste (oder X / J) |
| Reden / Weiter | Knopf **E** oder auf die Textbox tippen | E, Enter oder Z |
| Antwort wählen | Antwort antippen | ↑ ↓ und Enter |
| Musik an/aus | ♪ oben rechts | – |

## Aufbau des Codes

| Datei | Inhalt |
|---|---|
| `OakbladeApp.swift` | Einstieg der App |
| `Engine/PixelImage.swift` | Kleines Malprogramm: Bilder Pixel für Pixel, dazu der immer gleiche Zufall |
| `Engine/SpriteRows.swift` | Die Pixel-Vorlagen als Textzeilen (Ritter, Leute, Zombie, Schwert) |
| `Engine/Art.swift` | Baut daraus alle Bilder: Figuren, Bäume, Auto, Kacheln, Dächer, Bosse |
| `World/Maps.swift` | Die drei Welten: Wald, Haus, Stadt (Wald und Stadt werden gewürfelt – aber immer gleich) |
| `World/People.swift` | Familie, Freunde und alle Fragen und Antworten |
| `World/Entity.swift` | Alles, was auf der Karte steht oder läuft |
| `World/DialogState.swift` | Textbox: Buchstaben tippen sich einzeln, Antworten auswählen |
| `World/GameWorld.swift` | Der Ablauf: laufen, Wände, Kampf, Begleiter, Türen, Autofahrt |
| `Views/GameView.swift` | Zeichnet alles in eine `Canvas`-Fläche (Karte, Figuren, Schwertbogen, Herzen) |
| `Views/Controls.swift` | Steuerkreuz und Knöpfe zum Antippen |
| `Audio/ChipEngine.swift` | 8-Bit-Musik und Geräusche, Ton für Ton berechnet (AVAudioEngine) |

### Wie das Bild entsteht

`GameView` steckt eine `Canvas` in eine `TimelineView(.animation)`. Bei jedem Bild
rechnet `GameWorld.advance(to:)` erst das Spiel weiter und danach wird gezeichnet:

1. Die **ganze Karte** liegt als ein einziges großes Bild vor (beim Betreten
   einmal aus den Kacheln zusammengesetzt) und wird um die Kameraposition
   verschoben gezeichnet.
2. Alle Figuren und Bäume werden **nach ihrer Fußhöhe sortiert** gezeichnet –
   so läuft der Ritter richtig hinter oder vor einem Baum.
3. Das **Schwert** ist ein eigenes kleines Bild. Es wird um die Hand gedreht:
   im Stehen leicht erhoben, beim Schlagen in einem Bogen von hinten nach vorne,
   dazu ein weißer Bogen als Schwung.
4. Zum Schluss Herzen, Zähler und die Textbox.

### Bosse und Herzen

Die Herzen bestehen aus zwei Hälften: ein Zombietreffer kostet eine Hälfte, ein
Bosstreffer ein ganzes Herz. Nach sechs erledigten Zombies kommt ein Boss –
`GameWorld.spawnBoss()` nimmt den nächsten aus einer gemischten Liste
(`Chat.bosse`), damit jeder Kampf ein anderer ist. Jeder Boss hat in
`updateBoss(_:_:)` seine eigene Masche: Verstärkung rufen, im Sprint angreifen,
wütend werden oder Wurzeln aus dem Boden schießen lassen. Wer gewinnt, bekommt
ein Herz mehr (bis zu sieben) und volle Herzen.

### Wie die Fragen funktionieren

In `Chat.fragen` liegen Fragen für jeden Ort (Wald, Haus, Stadt, Kampf). `GameWorld`
zählt einen Zeitgeber herunter; läuft er ab und ist kein Zombie in der Nähe, stellt
ein zufälliger Begleiter eine Frage. Jede Antwort hat einen festen Satz, den er
darauf erwidert. Solange die Textbox offen ist, bleiben die Zombies stehen.
