//
//  RitterApp.swift
//  Ritter von Eichenwald – ein Pixel-Abenteuer für iPad und iPhone.
//

import SwiftUI

@main
struct RitterApp: App {
    var body: some Scene {
        WindowGroup {
            GameView()
                .preferredColorScheme(.dark)
        }
    }
}
