//
//  EmoApp.swift
//  Emo – ein kleiner Roboter, dessen Gesicht dein iPhone oder iPad ist.
//

import SwiftUI

@main
struct EmoApp: App {
    @StateObject private var brain = RobotBrain()

    var body: some Scene {
        WindowGroup {
            RobotScreen()
                .environmentObject(brain)
                .environmentObject(brain.settings)
                .preferredColorScheme(.dark)
        }
    }
}
