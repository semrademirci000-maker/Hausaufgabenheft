import SwiftUI

/// Farben, Schriften und die Fach-Farbpalette der App.
enum Theme {
    /// Papierweiß der Heftseiten.
    static let paper = Color(red: 0.996, green: 0.992, blue: 0.976)
    /// Hintergrund: Schreibtisch.
    static let deskTop = Color(red: 0.945, green: 0.914, blue: 0.859)
    static let deskBottom = Color(red: 0.859, green: 0.816, blue: 0.761)
    /// Bucheinband.
    static let cover = Color(red: 0.208, green: 0.298, blue: 0.541)
    /// Schriftfarbe.
    static let ink = Color(red: 0.106, green: 0.114, blue: 0.133)
    static let softInk = Color(red: 0.392, green: 0.400, blue: 0.435)
    /// Die schwarzen Linien auf dem Papier.
    static let rule = Color.black.opacity(0.45)
    /// Roter Rand links auf der Seite.
    static let margin = Color(red: 0.839, green: 0.353, blue: 0.322).opacity(0.55)
    /// Blau für den Plus-Knopf.
    static let blue = Color(red: 0.118, green: 0.435, blue: 0.933)

    static var desk: LinearGradient {
        LinearGradient(colors: [deskTop, deskBottom], startPoint: .top, endPoint: .bottom)
    }

    /// Freundliche, runde Schrift – kindgerecht, aber nicht albern.
    static func font(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }

    /// Auswahlfarben für die Fächer.
    static let palette: [String] = [
        "#2F6FED", "#E0483F", "#2AA66B", "#F29D1B",
        "#A05AD4", "#12A3B4", "#E4529F", "#7A8B2F",
        "#C2601C", "#3F5AA6", "#0F8E8E", "#B07A12",
        "#8B5E3C", "#5A5A6E", "#D93E6F", "#1F9A5B"
    ]
}

extension Color {
    /// Erzeugt eine Farbe aus einem Hex-String wie "#2F6FED".
    init(hex: String) {
        var string = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if string.hasPrefix("#") { string.removeFirst() }
        let value = Scanner(string: string).scanUInt64(representation: .hexadecimal) ?? 0

        let red, green, blue, alpha: Double
        if string.count == 8 {
            red = Double((value >> 24) & 0xFF) / 255
            green = Double((value >> 16) & 0xFF) / 255
            blue = Double((value >> 8) & 0xFF) / 255
            alpha = Double(value & 0xFF) / 255
        } else {
            red = Double((value >> 16) & 0xFF) / 255
            green = Double((value >> 8) & 0xFF) / 255
            blue = Double(value & 0xFF) / 255
            alpha = 1
        }
        self.init(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
    }
}
