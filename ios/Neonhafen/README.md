# Costa Solera – iOS-App (SwiftUI) für iPhone und iPad

Das 3D-Actionspiel **Costa Solera** (Ordner- und Projektname: Neonhafen) als eigene App – mit **Story-Modus** und
**freiem Spiel**: Autos klauen, Aufträge erledigen, der Polizei entkommen. Läuft auf **iPhone und iPad**, quer und hoch,
komplett **offline**, mit Vibration bei Unfällen, Schüssen und Explosionen.

Die App ist eine SwiftUI-Hülle um das Web-Spiel aus [`neonhafen/`](../../neonhafen/):
`SpielView` zeigt `Spiel/neonhafen.html` in einer WebKit-Ansicht im Vollbild.
So ist das Spiel auf allen Geräten gleich, und jede Verbesserung im Web landet mit
einem Befehl auch in der App.

> Dieser Code wurde auf einem Linux-Rechner geschrieben und dort **nicht mit Xcode
> kompiliert**. Der GitHub-Workflow baut ihn auf einem Mac – dort siehst du, ob alles klappt.

## App bekommen – ohne eigenen Mac

Bei jedem Push baut GitHub die App (`.github/workflows/neonhafen-ios.yml`).
Unter **Releases → „Neonhafen (neueste Version)“** liegt dann `Neonhafen.ipa`.
Die installierst du mit **Sideloadly** oder **AltStore** (signiert mit deiner Apple-ID)
auf iPhone oder iPad.

## Mit Xcode

1. Ordner `ios/Neonhafen` auf einen Mac kopieren, `Neonhafen.xcodeproj` öffnen (Xcode 16+).
2. Unter **Signing & Capabilities** dein Team wählen; die Bundle-ID
   `de.schulplaner.neonhafen` darfst du ändern.
3. iPhone oder iPad auswählen, ▶ drücken.

Falls die Projektdatei nicht passt: `brew install xcodegen && xcodegen generate`.
Mindestversion: **iOS 17**.

## Spiel geändert? So kommt es in die App

```
cd ios/Neonhafen
python3 spiel-einbauen.py
```

Das Skript kopiert `neonhafen/index.html` nach `Neonhafen/Spiel/neonhafen.html` und
bettet die Schriften und die 3D-Engine (three.js) ein. Der Workflow macht das vor jedem Build automatisch.

## Dateien

| Datei | Inhalt |
|---|---|
| `Neonhafen/NeonhafenApp.swift` | Einstieg, Vollbild, Bildschirm bleibt beim Spielen an |
| `Neonhafen/SpielView.swift` | WebKit-Ansicht mit dem Spiel, Vibrations-Brücke, kein Zoomen/Scrollen |
| `Neonhafen/Spiel/neonhafen.html` | Das Spiel (automatisch erzeugt – nicht von Hand bearbeiten) |
| `spiel-einbauen.py` | Erzeugt die Spieldatei aus der Web-Version |
| `Neonhafen/Assets.xcassets` | App-Icon und Akzentfarbe |
