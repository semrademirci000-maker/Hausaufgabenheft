# STITCHED – SwiftUI-App (iPad & iPhone)

Native SwiftUI-App für das Spiel aus [`stitched/`](../../stitched/README.md).
Die App zeigt einen Startbildschirm (SwiftUI) und startet dann das 3D-Spiel im Vollbild.
Das Spiel liegt **im App-Bundle** und läuft komplett offline.

> **Wichtig:** Geschrieben auf einem Linux-Rechner ohne Xcode, also **nicht kompiliert getestet**.
> Das Spiel selbst wurde im Browser getestet.

## Öffnen und starten

1. Ordner `ios/Stitched` auf einen Mac kopieren (am besten das ganze Repo).
2. `Stitched.xcodeproj` doppelklicken (Xcode 16 oder neuer).
3. Oben ein **iPad** auswählen (Simulator oder dein Gerät) und ▶ drücken.
4. Fürs echte iPad: *Signing & Capabilities* → dein Team auswählen.

Alternativ mit XcodeGen: `brew install xcodegen && xcodegen generate`.

## Spiel geändert?

Nach Änderungen in `stitched/` einmal `./sync-game.sh` ausführen. Das kopiert das Spiel
nach `Stitched/Game`.

## Aufbau

| Datei | Inhalt |
|---|---|
| `StitchedApp.swift` | App-Einstieg, Audio-Einstellung, Vollbild, Startbild darüber |
| `SplashView.swift` | Startbildschirm „STITCHED – Kapitel 1: Das Tiefe Werk“ mit Gripper-Händen |
| `GameView.swift` | `WKWebView` + eigenes URL-Schema `stitched://`, das die Spieldateien aus dem Bundle liefert |
| `Game/` | Kopie des Web-Spiels (Three.js) |
