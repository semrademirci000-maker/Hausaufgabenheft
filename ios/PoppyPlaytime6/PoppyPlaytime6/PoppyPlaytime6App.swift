import SwiftUI
import AVFoundation

@main
struct PoppyPlaytime6App: App {
    init() {
        // Ton auch dann abspielen, wenn der Stumm-Schalter an ist
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @State private var showSplash = true

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            GameView()
                .ignoresSafeArea()
            if showSplash {
                SplashView()
                    .transition(.opacity)
            }
        }
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
        .preferredColorScheme(.dark)
        .task {
            try? await Task.sleep(for: .seconds(2.2))
            withAnimation(.easeOut(duration: 0.9)) { showSplash = false }
        }
    }
}

#Preview(traits: .landscapeLeft) {
    ContentView()
}
