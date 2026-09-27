# NAHT – SwiftUI-App (iPad & iPhone)

Native SwiftUI-App für das Spiel aus [`naht/`](../../naht/README.md).
Die App zeigt einen Startbildschirm (SwiftUI) und startet dann das 3D-Spiel im Vollbild.
Das Spiel liegt **im App-Bundle** und läuft komplett offline.

> **Wichtig:** Geschrieben auf einem Linux-Rechner ohne Xcode, also **nicht kompiliert getestet**.
> Das Spiel selbst wurde im Browser getestet.

## Öffnen und starten

1. Ordner `ios/Naht` auf einen Mac kopieren (am besten das ganze Repo).
2. `Naht.xcodeproj` doppelklicken (Xcode 16 oder neuer).
3. Oben ein **iPad** auswählen (Simulator oder dein Gerät) und ▶ drücken.
4. Fürs echte iPad: *Signing & Capabilities* → dein Team auswählen.

Alternativ mit XcodeGen: `brew install xcodegen && xcodegen generate`.

## Spiel geändert?

Nach Änderungen in `naht/` einmal `./sync-game.sh` ausführen. Das kopiert das Spiel
nach `Naht/Game`.

## Aufbau

| Datei | Inhalt |
|---|---|
| `NahtApp.swift` | App-Einstieg, Audio-Einstellung, Vollbild, Startbild darüber |
| `SplashView.swift` | Startbildschirm „NAHT – Kapitel 1: Das Tiefe Werk“ mit Greifer-Händen |
| `GameView.swift` | `WKWebView` + eigenes URL-Schema `naht://`, das die Spieldateien aus dem Bundle liefert |
| `Game/` | Kopie des Web-Spiels (Three.js) |
