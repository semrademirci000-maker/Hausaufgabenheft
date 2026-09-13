# Mein Schulplaner – native iOS-App für iPhone und iPad

Eine **echte native App** (SwiftUI, kein Web-Kram): Beim Start wählst du
**Stundenplan** oder **Hausaufgabenheft**. Das Heft sieht aus wie ein Buch mit
weißen Seiten und schwarzen Linien – und mit einem Wisch dreht sich die Seite
in 3-D um zum nächsten Schultag.

Die Oberfläche ist bewusst ruhig gehalten: Systemschrift, viel Weißraum, dünne
Linien statt bunter Kästen, Farbe nur dort, wo sie etwas bedeutet (die Fächer).

Das Projekt liegt in `ios/` und lässt sich in Xcode öffnen, auf dem iPad/iPhone
starten und später über den App Store veröffentlichen.

## Was die App kann

**Startseite**
- Zwei große Karten: *Stundenplan* und *Hausaufgabenheft*.

**Stundenplan**
- Montag bis Freitag nebeneinander, die Stunden untereinander.
- Tippe auf ein Feld → Fach auswählen. Jedes Fach hat seine eigene Farbe.
- Farben und Namen jederzeit ändern (Knopf **Fächer**): umbenennen, neue Fächer
  anlegen, Farbe aus der Palette wählen, zum Löschen nach links wischen.
- Mehr oder weniger Stunden am Tag: **− Stunde** / **+ Stunde** (1 bis 12).
- Zwei gleiche Stunden hintereinander (z. B. 1. und 2. Stunde Deutsch) werden
  automatisch zu einem Block – angetippt wird trotzdem jede Stunde einzeln.
- Der heutige Wochentag ist blau hervorgehoben.

**Hausaufgabenheft**
- Auf der Seite steht genau der Stundenplan von diesem Tag, untereinander auf
  den Linien – z. B. `1.–2. Deutsch`, `4.–5. Mathe`, jedes Fach in seiner Farbe.
- Neben jedem Fach ist der **blaue Knopf mit dem Plus**. Tippst du drauf, kannst
  du die Hausaufgabe eintippen (z. B. „Arbeitsheft Seite 15, Nr. 3“).
- Hast du nichts auf, tippst du auf **Keine Hausaufgaben** – dann steht das da.
- Erledigt? Kreis antippen, dann wird die Aufgabe durchgestrichen.
- **Blättern:** einfach wischen → die Seite dreht sich in 3-D um (echte
  iOS-Buchanimation, `UIPageViewController` mit `pageCurl`) und der nächste
  Schultag steht da. Wochenenden werden übersprungen, `Heute` springt zurück.
- Auf dem iPad ist rechts die zweite Buchseite für **Notizen**, auf dem iPhone
  gibt es dafür den Knopf *Notizen*.

**Fokus-Musik**
- Der kleine Notenknopf oben rechts (und die Taste auf der Startseite) öffnet die
  Musik: abspielen, anhalten, Lautstärke.
- Ruhige Musik zum Lernen: warme Akkordfläche, sparsame Melodie, weicher Beat,
  ein Hauch Vinyl-Rauschen und Hallraum.
- Die Musik wird **live in der App berechnet** (`AVAudioEngine` +
  eigener Synthesizer) – keine Audiodateien, kein Internet, kein Download,
  und sie wiederholt sich nie exakt.

Alles wird automatisch auf dem Gerät gespeichert (JSON-Datei im
Dokumente-Ordner der App) – ohne Internet, ohne Konto.

## Testen ohne Mac (Cloud-Build)

Für eine native iOS-App braucht man normalerweise einen Mac. Es geht aber auch
in der Cloud – GitHub stellt Mac-Rechner bereit:

**Was automatisch passiert**

Bei jedem Push baut GitHub Actions die App (`.github/workflows/ios.yml`),
startet sie im iPhone- und im iPad-Simulator und legt Screenshots von
Startseite, Stundenplan und Heft im Ordner `screenshots/` ab. Die kannst du
direkt auf github.com anschauen – auch vom iPad aus.

Läuft etwas nicht, steht der genaue Fehler im Build-Protokoll unter
*Actions* → letzter Lauf.

**App im Browser ausprobieren (kostenlos, ohne Apple-Konto)**

1. Auf github.com unter *Actions* den letzten Lauf öffnen.
2. Unten bei *Artifacts* `Schulplaner-Simulator-App` herunterladen (ZIP).
3. Auf [appetize.io](https://appetize.io) hochladen (kostenloses Kontingent).
4. Dort öffnet sich ein iPhone oder iPad im Browser, das du antippen und
   bedienen kannst – die echte App, nur eben ferngesteuert.

**Auf dem eigenen iPhone/iPad (TestFlight)**

Dafür braucht es das Apple Developer Program (99 $/Jahr). Danach lässt sich der
Cloud-Build so erweitern, dass er die App signiert und direkt zu TestFlight
hochlädt – ebenfalls ohne eigenen Mac. Nötig sind dann ein eigener Bundle
Identifier (statt `com.beispiel.schulplaner`), ein App-Store-Connect-API-Schlüssel
und ein Verteilungszertifikat, alles als GitHub-Secrets hinterlegt.

**Auf dem iPad selbst programmieren (Swift Playgrounds)**

Im Ordner `ipad/Schulplaner.swiftpm` liegt dieselbe App als Projekt für die
Gratis-App **Swift Playgrounds** (iPadOS 16 oder neuer). Repo als ZIP laden, in
der Dateien-App entpacken, `Schulplaner.swiftpm` antippen – Playgrounds baut und
startet die App direkt auf dem iPad. (Falls Playgrounds das App-Icon bemängelt:
in `Package.swift` `appIcon: .asset("AppIcon")` durch
`appIcon: .placeholder(icon: .book)` ersetzen.)

## Öffnen und starten

1. Ordner auf einen Mac kopieren (Xcode 15 oder neuer).
2. `ios/Schulplaner.xcodeproj` doppelklicken.
3. Oben Gerät auswählen (z. B. „iPad Pro“-Simulator oder das eigene iPad) und
   auf ▶ drücken.

Mindestens iOS 17, läuft auf iPhone und iPad (Hoch- und Querformat).

## Auf dem eigenen iPad/iPhone installieren

1. In Xcode links auf **Schulplaner** → Reiter **Signing & Capabilities**.
2. Bei **Team** den eigenen Apple-Account auswählen
   (Xcode → Settings → Accounts → Apple-ID hinzufügen).
3. **Bundle Identifier** auf etwas Eigenes ändern, z. B.
   `de.deinname.schulplaner` (der Standard `com.beispiel.schulplaner` ist nur
   ein Platzhalter und im App Store nicht erlaubt).
4. iPad per Kabel anstecken, in Xcode als Ziel auswählen und ▶ drücken.
   Auf dem iPad danach: Einstellungen → Allgemein → VPN & Geräteverwaltung →
   Entwickler-App vertrauen.

Mit einem kostenlosen Apple-Account läuft die App 7 Tage, mit dem kostenpflichtigen
Apple Developer Program (99 $/Jahr) dauerhaft.

## In den App Store bringen

1. Apple Developer Program-Mitgliedschaft abschließen.
2. In App Store Connect eine neue App mit dem eigenen Bundle Identifier anlegen.
3. In Xcode: Ziel „Any iOS Device“ wählen → **Product → Archive** →
   **Distribute App** → App Store Connect.
4. In App Store Connect Screenshots (iPhone und iPad), Beschreibung und
   Alterseinstufung ergänzen und zur Prüfung einreichen.

Das App-Icon (1024 × 1024, ohne Alpha-Kanal, wie von Apple verlangt) ist bereits
dabei: `ios/Schulplaner/Assets.xcassets/AppIcon.appiconset/AppIcon.png`.

## Aufbau des Projekts

| Datei / Ordner | Inhalt |
|---|---|
| `ios/Schulplaner/SchulplanerApp.swift` | App-Start und Navigation |
| `ios/Schulplaner/Model/` | Fach, Wochentag, Stundenplan, Hausaufgabe, Schulkalender |
| `ios/Schulplaner/Store/PlannerStore.swift` | Daten halten und speichern |
| `ios/Schulplaner/Views/StartView.swift` | Startseite mit den zwei Karten |
| `ios/Schulplaner/Views/TimetableView.swift` | Stundenplan Mo–Fr mit Farben |
| `ios/Schulplaner/Views/SubjectsManagerView.swift` | Fächer und Farben ändern |
| `ios/Schulplaner/Views/BookView.swift` | Das Buch mit den Seiten |
| `ios/Schulplaner/Views/HomeworkPageView.swift` | Eine Heftseite mit Linien und Plus-Knopf |
| `ios/Schulplaner/Views/HomeworkEditorView.swift` | Hausaufgabe eintippen |
| `ios/Schulplaner/Views/PageCurlPager.swift` | Das 3-D-Blättern |
| `ios/Schulplaner/Audio/Synth.swift` | Der Musik-Synthesizer (Sample für Sample) |
| `ios/Schulplaner/Audio/MusicEngine.swift` | Abspielen, Lautstärke, Audio-Session |
| `ios/Schulplaner/Views/MusicControl.swift` | Knopf und Regler für die Musik |
| `ios/Tools/` | Hilfsskripte: App-Icon, Xcode-Projekt und iPad-Fassung erzeugen |
| `ipad/Schulplaner.swiftpm` | dieselbe App für Swift Playgrounds auf dem iPad |
| `.github/workflows/ios.yml` | Cloud-Build mit Screenshots |
| `screenshots/` | automatisch erzeugte Bilder aus dem letzten Cloud-Build |
| `web-legacy/` | die alte Web-Version (wird nicht mehr weiterentwickelt) |

Neue Swift-Dateien fügst du am einfachsten direkt in Xcode hinzu. Alternativ
legst du sie im Ordner ab und führst `python3 ios/Tools/make_xcodeproj.py` aus –
das Skript baut die Projektdatei neu.

## Gestaltung

- Systemschrift (San Francisco) in wenigen, klaren Abstufungen.
- Ruhiger heller Hintergrund, weiße Flächen mit 1-Pixel-Rand statt schweren Schatten.
- Fachfarben gedeckt und nur als schmaler Balken bzw. Punkt – nicht als bunte Kacheln.
- Nur ein Akzentblau: der Plus-Knopf, die Auswahl, der heutige Tag.
