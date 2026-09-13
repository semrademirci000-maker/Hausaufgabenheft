import SwiftUI

@main
struct SchulplanerApp: App {
    @StateObject private var store = PlannerStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .tint(Theme.blue)
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
