# Der letzte Bus – native iOS-App (SwiftUI)

Die Gruselgeschichte aus [`derletztebus/`](../../derletztebus/) als eigene
App für iPhone und iPad, komplett in **SwiftUI**.

Du steigst nachts in den Bus N13. Die Haltestellen werden immer seltsamer,
an jeder steigt jemand Neues ein – und **einer davon ist kein Mensch**.
Bei jeder Fahrt wird neu ausgelost, wer. An der Endstation musst du es sagen.

> **Wichtig:** Dieser Code wurde auf einem Linux-Rechner geschrieben – dort gibt es
> kein Xcode. Er ist deshalb **nicht kompiliert getestet**. Beim ersten Öffnen in
> Xcode können einzelne Kleinigkeiten auftauchen, die Xcode dir direkt anzeigt.

## Öffnen und starten

1. Ordner `ios/DerLetzteBus` auf einen Mac kopieren.
2. `DerLetzteBus.xcodeproj` doppelklicken (Xcode 16 oder neuer).
3. Oben das Ziel auf ein **iPhone** oder **iPad** stellen.
4. Auf ▶ drücken.

Fürs eigene Gerät: *Xcode → Einstellungen → Accounts → Apple-ID hinzufügen*,
dann unter **Signing & Capabilities** dein Team auswählen. Die Bundle-ID
`de.schulplaner.derletztebus` darfst du auf etwas Eigenes ändern.

Falls Xcode die Projektdatei nicht öffnen kann: `brew install xcodegen`, dann im
Ordner `ios/DerLetzteBus` `xcodegen generate` ausführen.

Mindestversion: **iOS 17**.

Die App läuft nur **im Querformat** (wie Brawl Stars oder Roblox): links das
Busfenster mit Sitzreihe, rechts die Geschichte. Auf flachen Handys stehen die
Antwort-Knöpfe in zwei Spalten.

## Aufbau des Codes

| Datei | Inhalt |
|---|---|
| `DerLetzteBusApp.swift` | Einstieg, Wechsel Titel ↔ Bus, Ton-Knopf |
| `Model/Geschichte.swift` | Alle Texte: die fünf Fahrgäste (je Mensch- und Ding-Fassung), Haltestellen, Fahrer |
| `Model/Spiel.swift` | Der Ablauf als eine async-Funktion: Schreibmaschinen-Text, Entscheidungen, Spiegelbild, Enden |
| `Views/TitelView.swift` | Titelbild mit Namenseingabe und gefundenen Enden |
| `Views/BusView.swift` | Leuchtanzeige, Sitzreihe, Text und Antwort-Knöpfe |
| `Views/FensterView.swift` | Blick aus dem Fenster mit `Canvas`: Häuser, Bäume, Friedhof, Laternen, Nebel, Regen |
| `Views/Farbe.swift` | Farben und Schriften |
| `Audio/BusKlang.swift` | Motor, Regen, Unbehagen, Gong, Türen, Schreck – Sample für Sample berechnet |

### Wie die Geschichte läuft

`Spiel.spielen()` erzählt die Geschichte von oben nach unten. `sag(...)` hängt
einen Absatz an und füllt ihn Buchstabe für Buchstabe (Tippen auf den Text zeigt
alles sofort). `waehle(...)` zeigt Knöpfe und wartet mit einer
`CheckedContinuation`, bis einer gedrückt wird. Die Views beobachten nur die
`@Published`-Werte und zeichnen sie.

### Wie der Ton funktioniert

Wie die Lo-Fi-Musik im Hausaufgabenheft: Ein `AVAudioSourceNode` berechnet jedes
Sample selbst. Neue Einzelklänge (Gong, Türen …) landen in einer kleinen
Warteliste, die der Audio-Thread abholt, ohne je zu warten.
