# Poppy Playtime Kapitel 6 – SwiftUI-App (iPad & iPhone)

Native SwiftUI-App für das Fan-Spiel aus [`poppy6/`](../../poppy6/README.md).
Die App zeigt einen Startbildschirm (SwiftUI) und startet dann das 3D-Spiel im Vollbild.
Das Spiel liegt **im App-Bundle** und läuft komplett offline.

> **Wichtig:** Geschrieben auf einem Linux-Rechner ohne Xcode, also **nicht kompiliert getestet**.
> Das Spiel selbst wurde im Browser getestet.

## Öffnen und starten

1. Ordner `ios/PoppyPlaytime6` auf einen Mac kopieren (am besten das ganze Repo).
2. `PoppyPlaytime6.xcodeproj` doppelklicken (Xcode 16 oder neuer).
3. Oben ein **iPad** auswählen (Simulator oder dein Gerät) und ▶ drücken.
4. Fürs echte iPad: *Signing & Capabilities* → dein Team auswählen.

Alternativ mit XcodeGen: `brew install xcodegen && xcodegen generate`.

Die **SwiftUI-Vorschau** (Canvas in Xcode) funktioniert für `SplashView.swift` und `ContentView`.

## Spiel geändert?

Nach Änderungen in `poppy6/` einmal `./sync-game.sh` ausführen. Das kopiert das Spiel
nach `PoppyPlaytime6/Game`.

## Aufbau

| Datei | Inhalt |
|---|---|
| `PoppyPlaytime6App.swift` | App-Einstieg, Audio-Einstellung, Vollbild, Startbild darüber |
| `SplashView.swift` | Startbildschirm mit flackerndem Logo und GrabPack-Händen |
| `GameView.swift` | `WKWebView` + eigenes URL-Schema `poppy://`, das die Spieldateien aus dem Bundle liefert |
| `Game/` | Kopie des Web-Spiels (Three.js) |
