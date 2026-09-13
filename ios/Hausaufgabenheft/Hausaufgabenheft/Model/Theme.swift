//
//  Theme.swift
//  Farben, Schriften und kleine Bausteine für das Papier-Aussehen.
//

import Foundation
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

extension Color {
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        var value: UInt64 = 0
        Scanner(string: s).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }

    static let paper     = Color(hex: "#FFFDF8")
    static let ink       = Color(hex: "#1C1A17")
    static let inkSoft   = Color(hex: "#5D5648")
    static let ruleLine  = Color(hex: "#14120F")
    static let planBlue  = Color(hex: "#2F6FED")
    static let deskLight = Color(hex: "#F6EFE3")
    static let deskDark  = Color(hex: "#E8DCC8")
    static let coverTop  = Color(hex: "#3C6B9E")
    static let coverBot  = Color(hex: "#2A4E77")
    static let pencil    = Color(hex: "#1B2F7A")   // Schreibfarbe der Hausaufgaben
}

enum Palette {
    static let colors = ["#2F6FED", "#E0483F", "#2AA66B", "#F29D1B", "#A05AD4", "#E4529F",
                         "#12A3B4", "#8A6A4F", "#6B7A2F", "#D96A2B", "#5C5CE0", "#3C8A8A"]
}

enum Handwriting {
    /// Handschrift-Schrift des Systems, fällt automatisch auf die Systemschrift zurück.
    static let name = "Bradley Hand"

    static func font(_ size: CGFloat) -> Font {
        .custom(name, size: size)
    }

    /// Zeilenabstand, damit geschriebener Text genau auf den Linien sitzt.
    static func lineSpacing(fontSize: CGFloat, lineHeight: CGFloat) -> CGFloat {
        let uiFont = UIFont(name: name, size: fontSize) ?? UIFont.systemFont(ofSize: fontSize)
        return max(0, lineHeight - uiFont.lineHeight)
    }
}

/// Der Schreibtisch-Hintergrund hinter allen Bildschirmen.
struct DeskBackground: View {
    var body: some View {
        LinearGradient(colors: [.deskLight, .deskDark], startPoint: .top, endPoint: .bottom)
            .ignoresSafeArea()
    }
}

/// Weiße Seite mit schwarzen Linien.
struct LinedPaper: View {
    var lineHeight: CGFloat

    var body: some View {
        Canvas { context, size in
            var y = lineHeight
            while y <= size.height {
                var path = Path()
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: size.width, y: y))
                context.stroke(path, with: .color(Color.ruleLine.opacity(0.75)), lineWidth: 1.4)
                y += lineHeight
            }
        }
        .allowsHitTesting(false)
    }
}

/// Heller Knopf im Papier-Look.
struct SoftButtonStyle: ButtonStyle {
    var tint: Color = .paper
    var textColor: Color = .ink

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(textColor)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(tint)
                    .shadow(color: .black.opacity(0.10), radius: 3, y: 2)
            )
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}
