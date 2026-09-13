# Hausaufgabenheft – native iOS-App (SwiftUI)

Dieselbe App wie die Web-Version, aber nativ in **SwiftUI** für iPad und iPhone:
Startseite, Stundenplan, Hausaufgabenheft mit 3-D-Blättern und Lo-Fi-Musik.

> **Wichtig:** Dieser Code wurde auf einem Linux-Rechner geschrieben – dort gibt es
> kein Xcode. Er ist deshalb **nicht kompiliert getestet**. Beim ersten Öffnen in
> Xcode können einzelne Kleinigkeiten auftauchen, die Xcode dir direkt anzeigt.

## Öffnen und starten

1. Ordner `ios/Hausaufgabenheft` auf einen Mac kopieren.
2. `Hausaufgabenheft.xcodeproj` doppelklicken (Xcode 16 oder neuer).
3. Oben links das Ziel auf ein **iPad** stellen (Simulator oder dein eigenes Gerät).
4. Auf ▶ drücken.

Damit die App auf deinem echten iPad läuft, brauchst du einmalig:
*Xcode → Einstellungen → Accounts → Apple-ID hinzufügen*, danach im Projekt unter
**Signing & Capabilities** dein Team auswählen. Die Bundle-ID
`de.schulplaner.hausaufgabenheft` darfst du dabei auf etwas Eigenes ändern.

Falls deine Xcode-Version die Projektdatei nicht öffnen kann, gibt es zwei Wege:

* **XcodeGen:** `brew install xcodegen`, dann im Ordner `ios/Hausaufgabenheft`
  `xcodegen generate` ausführen – das erzeugt eine frische `.xcodeproj`.
* **Von Hand:** In Xcode ein neues Projekt *iOS → App* (SwiftUI, Sprache Swift)
  anlegen und die Ordner `Model`, `Views`, `Audio`, die Datei
  `HausaufgabenheftApp.swift` sowie `Assets.xcassets` hineinziehen.

Mindestversion: **iOS 17**.

## Aufbau des Codes

| Datei | Inhalt |
|---|---|
| `HausaufgabenheftApp.swift` | Einstieg und Umschalten zwischen den drei Bildschirmen |
| `Model/Planner.swift` | Fächer, Stundenplan, Hausaufgaben, Notizen; speichert als JSON im Dokumente-Ordner. Enthält auch die Schultags-Rechnerei (Wochenenden überspringen) |
| `Model/Theme.swift` | Farben, Handschrift-Schrift, liniertes Papier (`LinedPaper`), Knopf-Stil |
| `Views/StartView.swift` | Startseite mit den zwei großen Karten |
| `Views/TimetableView.swift` | Stundenplan Mo–Fr; gleiche Fächer untereinander werden zu einem Block |
| `Views/SubjectViews.swift` | Fach auswählen und Fächer verwalten (Name, Farbe, löschen) |
| `Views/BookView.swift` | Das Buch: zwei Seiten, Wisch-Geste und die 3-D-Umschlag-Animation |
| `Views/DayPageView.swift` | Eine Heftseite mit Linien, Fächern, Plus-Knopf und Notizen |
| `Views/HomeworkEditorView.swift` | Eingabefeld für die Hausaufgabe |
| `Views/MusicControl.swift` | Knopf und Regler für die Musik |
| `Audio/LofiEngine.swift` | Lo-Fi-Musik, Ton für Ton berechnet (AVAudioEngine, keine Musikdateien) |

### Wie das Blättern funktioniert

`BookView` hält das aktuelle Datum und – während des Blätterns – einen
`Flip`-Zustand mit Richtung, Zieltag und Fortschritt (0 bis 1). Die umschlagende
Seite liegt als eigene Ansicht über der rechten (oder linken) Buchhälfte und wird
mit `rotation3DEffect` um die Mittelachse gedreht. Ab der Hälfte der Drehung wird
auf die gespiegelte Rückseite umgeschaltet – das ist die Seite des neuen Tages.
Der Finger steuert den Fortschritt direkt; beim Loslassen läuft die Drehung
entweder zu Ende oder zurück.

### Wie die Musik funktioniert

`LofiEngine` hängt einen `AVAudioSourceNode` an die Audio-Engine und berechnet
jedes einzelne Audio-Sample selbst. Ein kleiner Taktgeber löst alle Achtelnoten
Klänge aus: weiche Akkorde (Dm9 – G13 – Cmaj9 – Am11), Bass, Bassdrum, Snare,
Hi-Hat, ab und zu eine Melodienote und durchgehendes Vinyl-Knistern. Die
Achtel sind leicht „geswingt“, damit es nicht steif klingt.
