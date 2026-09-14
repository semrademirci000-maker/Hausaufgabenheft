//
//  OakbladeApp.swift
//  Oakblade – ein Pixel-Abenteuer für iPad und iPhone.
//

import SwiftUI

@main
struct OakbladeApp: App {
    var body: some Scene {
        WindowGroup {
            GameView()
                .preferredColorScheme(.dark)
        }
    }
}
