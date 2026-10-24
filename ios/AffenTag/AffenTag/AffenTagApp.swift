//
//  AffenTagApp.swift
//  Affen-Tag – ein Kletter-Fangspiel, bei dem du dich nur mit den Armen
//  bewegst. Für iPhone und iPad, mit Computer-Affen und Mehrspieler.
//

import SwiftUI

@main
struct AffenTagApp: App {
    @StateObject private var spiel = Spiel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(spiel)
                .environmentObject(spiel.hud)
                .statusBarHidden()
                .persistentSystemOverlays(.hidden)
                .defersSystemGestures(on: .all)
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var spiel: Spiel

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch spiel.bildschirm {
            case .titel:
                TitelView().transition(.opacity)
            case .spiel:
                SpielView().transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: spiel.bildschirm)
        .onAppear { spiel.klang.start() }
    }
}
