//
//  Farbe.swift
//  Farben und Schriften für den nächtlichen Bus.
//

import SwiftUI

enum Farbe {
    static let nacht = Color(red: 0.027, green: 0.031, blue: 0.047)
    static let bus = Color(red: 0.07, green: 0.078, blue: 0.106)
    static let text = Color(red: 0.867, green: 0.843, blue: 0.784)
    static let leise = Color(red: 0.545, green: 0.525, blue: 0.47)
    static let led = Color(red: 1.0, green: 0.667, blue: 0.169)
    static let blut = Color(red: 0.824, green: 0.29, blue: 0.263)
    static let rand = Color(red: 0.149, green: 0.165, blue: 0.208)
    static let knopf = Color(red: 0.102, green: 0.114, blue: 0.153)
}

enum Schrift {
    /// Schreibmaschine – für gesprochene Sätze und Unheimliches
    static func maschine(_ groesse: CGFloat) -> Font { .custom("American Typewriter", size: groesse) }
    /// Leuchtanzeige im Bus
    static func led(_ groesse: CGFloat) -> Font { .system(size: groesse, weight: .bold, design: .monospaced) }
}
