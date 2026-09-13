import SwiftUI

/// Farben, Schriften und Fach-Palette – ruhig, klar, zurückhaltend.
enum Theme {
    /// Hintergrund der App.
    static let background = Color(red: 0.957, green: 0.953, blue: 0.945)
    /// Weiße Flächen: Karten, Tabelle.
    static let surface = Color.white
    /// Papier der Heftseiten.
    static let paper = Color(red: 0.996, green: 0.996, blue: 0.988)
    /// Buchrücken und Einband – neutrales Dunkelgrau.
    static let cover = Color(red: 0.157, green: 0.176, blue: 0.208)
    /// Schrift.
    static let ink = Color(red: 0.098, green: 0.102, blue: 0.118)
    static let secondaryInk = Color(red: 0.408, green: 0.416, blue: 0.443)
    static let tertiaryInk = Color(red: 0.596, green: 0.604, blue: 0.627)
    /// Linien auf dem Papier – schwarz, aber fein.
    static let rule = Color.black.opacity(0.28)
    /// Trennlinien und Ränder.
    static let hairline = Color.black.opacity(0.09)
    /// Akzentfarbe (Plus-Knopf, Auswahl).
    static let accent = Color(red: 0.153, green: 0.412, blue: 0.831)
    /// Erledigt-Haken.
    static let success = Color(red: 0.153, green: 0.514, blue: 0.376)

    /// Systemschrift – klar und unaufgeregt.
    static func font(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight)
    }

    /// Gedeckte Farben für die Fächer.
    static let palette: [String] = [
        "#3B6FD1", "#C0453C", "#2E8B62", "#C2801F",
        "#7A5AA8", "#2A8A99", "#B05576", "#5C7A3F",
        "#9A6A3C", "#4A5568", "#1F7A6B", "#8A6D1F",
        "#7B4B3A", "#5A5F7A", "#A34E5E", "#3C7A5A"
    ]
}

extension Color {
    /// Erzeugt eine Farbe aus einem Hex-String wie "#3B6FD1".
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

/// Karte mit dünnem Rand statt kräftigem Schatten.
struct CardBackground: ViewModifier {
    var cornerRadius: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
}

extension View {
    func card(cornerRadius: CGFloat = 16) -> some View {
        modifier(CardBackground(cornerRadius: cornerRadius))
    }
}
