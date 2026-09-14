import SwiftUI

@main
struct SchulplanerApp: App {
    @StateObject private var store = PlannerStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .tint(Theme.accent)
                .onChange(of: scenePhase) { phase in
                    if phase == .active {
                        MusicEngine.shared.resumeIfNeeded()
                    }
                }
        }
    }
}

struct RootView: View {
    /// Erlaubt dem Cloud-Build, direkt einen bestimmten Bildschirm
    /// zu öffnen (für die automatischen Screenshots).
    private var startScreen: String? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "-startScreen"),
              index + 1 < arguments.count else { return nil }
        return arguments[index + 1]
    }

    var body: some View {
        NavigationStack {
            switch startScreen {
            case "plan":
                TimetableView()
            case "buch":
                BookView()
            default:
                StartView()
            }
        }
    }
}
