import SwiftUI

/// Ein Schulfach mit eigener Farbe.
struct Subject: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var colorHex: String

    init(id: UUID = UUID(), name: String, colorHex: String) {
        self.id = id
        self.name = name
        self.colorHex = colorHex
    }

    var color: Color { Color(hex: colorHex) }
}
