//
//  Stil.swift
//  Farben und Schriften der Oberfläche.
//

import SwiftUI

enum Stil {
    static let terminalGruen = Color(red: 0.2, green: 1, blue: 0.4)
    static let terminalDunkel = Color(red: 0.02, green: 0.07, blue: 0.03)
    static let lava = Color(red: 1, green: 0.42, blue: 0.08)
    static let holz = Color(red: 0.42, green: 0.27, blue: 0.15)
    static let blatt = Color(red: 0.3, green: 0.7, blue: 0.3)
    static let gold = Color(red: 0.95, green: 0.78, blue: 0.48)

    static func dick(_ groesse: CGFloat) -> Font { .system(size: groesse, weight: .black, design: .rounded) }
    static func terminal(_ groesse: CGFloat) -> Font { .system(size: groesse, weight: .bold, design: .monospaced) }
}

extension Color {
    init(_ v: V3) { self.init(red: Double(v.x), green: Double(v.y), blue: Double(v.z)) }
}

/// Dicker, runder Knopf wie im Spielmenü.
struct DickerKnopf: ButtonStyle {
    var farbe: Color = Stil.blatt
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Stil.dick(18))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 11)
            .background(RoundedRectangle(cornerRadius: 14).fill(farbe))
            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(.black.opacity(0.35), lineWidth: 3))
            .shadow(color: .black.opacity(0.35), radius: 0, x: 0, y: configuration.isPressed ? 1 : 4)
            .offset(y: configuration.isPressed ? 3 : 0)
    }
}

/// Text mit dunklem Rand, gut lesbar über der 3D-Welt.
struct Umrandet: ViewModifier {
    func body(content: Content) -> some View {
        content
            .shadow(color: .black, radius: 0, x: 1.5, y: 1.5)
            .shadow(color: .black, radius: 0, x: -1.5, y: -1.5)
            .shadow(color: .black.opacity(0.6), radius: 4)
    }
}

extension View {
    func umrandet() -> some View { modifier(Umrandet()) }
}
