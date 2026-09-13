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
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        MusicEngine.shared.resumeIfNeeded()
                    }
                }
        }
    }
}

struct RootView: View {
    var body: some View {
        NavigationStack {
            StartView()
        }
    }
}
