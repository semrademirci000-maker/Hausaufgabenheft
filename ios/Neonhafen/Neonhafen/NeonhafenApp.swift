import SwiftUI

/// Costa Solera – 3D-Actionspiel in einer sonnigen Küstenstadt (Story oder freies Spiel).
/// Das Spiel selbst ist dasselbe wie im Web (Spiel/neonhafen.html) und läuft hier
/// offline in einer WebKit-Ansicht; die App liefert Vollbild, Vibration und Icon.
@main
struct NeonhafenApp: App {
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            SpielView()
                .ignoresSafeArea()
                .background(Color.nacht)
                .statusBarHidden()
                .persistentSystemOverlays(.hidden)
                .preferredColorScheme(.dark)
                .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        }
        .onChange(of: scenePhase) { _, phase in
            // Bildschirm nur während des Spielens wach halten
            UIApplication.shared.isIdleTimerDisabled = (phase == .active)
        }
    }
}

extension Color {
    static let nacht = Color(red: 11 / 255, green: 16 / 255, blue: 24 / 255)
}

extension UIColor {
    static let nacht = UIColor(red: 11 / 255, green: 16 / 255, blue: 24 / 255, alpha: 1)
}
