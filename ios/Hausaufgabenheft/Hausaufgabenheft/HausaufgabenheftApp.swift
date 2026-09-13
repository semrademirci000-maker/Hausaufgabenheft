//
//  HausaufgabenheftApp.swift
//  Mein Schulplaner – Stundenplan & Hausaufgabenheft
//

import SwiftUI

@main
struct HausaufgabenheftApp: App {
    @StateObject private var planner = Planner()
    @StateObject private var music = LofiEngine()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(planner)
                .environmentObject(music)
                .preferredColorScheme(.light)
        }
    }
}

enum Screen {
    case start, timetable, book
}

struct RootView: View {
    @State private var screen: Screen = .start

    var body: some View {
        ZStack {
            DeskBackground()

            switch screen {
            case .start:
                StartView(screen: $screen)
                    .transition(.opacity.combined(with: .scale(scale: 0.97)))
            case .timetable:
                TimetableView(screen: $screen)
                    .transition(.opacity)
            case .book:
                BookView(screen: $screen)
                    .transition(.opacity)
            }

            VStack {
                Spacer()
                HStack {
                    Spacer()
                    MusicControl()
                }
            }
            .padding(16)
        }
        .animation(.easeInOut(duration: 0.3), value: screen)
    }
}
