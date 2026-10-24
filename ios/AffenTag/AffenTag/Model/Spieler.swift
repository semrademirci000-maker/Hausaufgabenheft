//
//  Spieler.swift
//  Ein Affe (du oder ein anderer Spieler übers Netz),
//  die Spielmodi und der Zustand einer Runde.
//

import Foundation
import simd

struct Affe: Identifiable {
    let id: String
    var name: String
    /// Fellfarbe 0…1 (im Computer als Stufen 0…9 einstellbar).
    var farbe: V3
    var hut: String?
    var gesicht: String?
    var istLokal: Bool

    var position: V3
    var gier: Float = 0
    var haende: [V3]
    var geschwindigkeit: V3 = .zero

    /// Bis wann der Affe nach dem Fangen eingefroren ist (Spielzeit).
    var eingefrorenBis: Double = 0
    /// Wann zuletzt etwas von ihm übers Netz kam.
    var zuletztGehoert: Double = 0

    // Netz-Glättung: wohin der Affe gezogen wird
    var zielPosition: V3 = .zero
    var zielGier: Float = 0
    var zielHaende: [V3] = []

    init(id: String, name: String, farbe: V3, istLokal: Bool, position: V3) {
        self.id = id
        self.name = name
        self.farbe = farbe
        self.istLokal = istLokal
        self.position = position
        self.haende = [position + V3(-0.4, -0.3, -0.5), position + V3(0.4, -0.3, -0.5)]
        self.zielPosition = position
        self.zielHaende = haende
    }
}

enum Modus: String, CaseIterable, Codable, Identifiable {
    case infektion, fangen, jagd, farbschlacht, locker
    var id: String { rawValue }

    var name: String {
        switch self {
        case .infektion: return "Infektion"
        case .fangen: return "Fangen"
        case .jagd: return "Jagd"
        case .farbschlacht: return "Farbschlacht"
        case .locker: return "Locker"
        }
    }

    var computerName: String { name.uppercased() }

    var erklaerung: String {
        switch self {
        case .infektion: return "Einer ist Lava. Wen er berührt, wird auch Lava. Sind alle Lava, beginnt eine neue Runde."
        case .fangen: return "Einer ist es. Berührt er dich, bist du es. Kein Zurückfangen für 3 Sekunden."
        case .jagd: return "Jeder hat ein Ziel (Farbe am Handgelenk). Fang dein Ziel – aber pass auf, wer dich jagt!"
        case .farbschlacht: return "Jeder hat 3 Ballons und eine Schleuder. Platzen alle deine Ballons, bist du raus."
        case .locker: return "Kein Fangen – einfach rumklettern, quatschen und Freunde treffen."
        }
    }
}

struct Runde: Codable, Equatable {
    var modus: Modus = .infektion
    var nummer = 0
    /// Infektion: alle Lava-Affen. Fangen: genau einer („es“).
    var lava: Set<String> = []
    /// Jagd: Jäger → Ziel
    var ziele: [String: String] = [:]
    /// Jagd/Farbschlacht: wer raus ist
    var raus: Set<String> = []
    var ballons: [String: Int] = [:]
    /// Runde ist vorbei, kurze Pause bis zur nächsten.
    var vorbei = false
    var sieger: String?
    /// Weniger als zwei Spieler im Raum: niemand ist Lava, alle klettern frei.
    var wartet = true
}

// MARK: - Kosmetik

enum KosmetikArt: String, Codable { case hut, gesicht }

struct Kosmetik: Identifiable {
    let id: String
    let name: String
    let preis: Int
    let art: KosmetikArt

    static let alle: [Kosmetik] = [
        Kosmetik(id: "banane", name: "Bananenhut", preis: 25, art: .hut),
        Kosmetik(id: "party", name: "Partyhut", preis: 30, art: .hut),
        Kosmetik(id: "krone", name: "Krone", preis: 120, art: .hut),
        Kosmetik(id: "cowboy", name: "Cowboyhut", preis: 60, art: .hut),
        Kosmetik(id: "muetze", name: "Weihnachtsmütze", preis: 45, art: .hut),
        Kosmetik(id: "pilz", name: "Pilzhut", preis: 50, art: .hut),
        Kosmetik(id: "propeller", name: "Propellerkappe", preis: 80, art: .hut),
        Kosmetik(id: "heiligenschein", name: "Heiligenschein", preis: 150, art: .hut),
        Kosmetik(id: "blumen", name: "Blumenkranz", preis: 35, art: .hut),
        Kosmetik(id: "zylinder", name: "Zylinder", preis: 90, art: .hut),
        Kosmetik(id: "sonnenbrille", name: "Sonnenbrille", preis: 40, art: .gesicht),
        Kosmetik(id: "nerdbrille", name: "Nerdbrille", preis: 30, art: .gesicht),
        Kosmetik(id: "schnurrbart", name: "Schnurrbart", preis: 20, art: .gesicht),
        Kosmetik(id: "maske", name: "Taucherbrille", preis: 55, art: .gesicht),
    ]

    static func mit(_ id: String?) -> Kosmetik? { alle.first { $0.id == id } }
}

/// Fellfarbe aus den drei Stufen 0…9 wie am Computer.
func fellFarbe(_ r: Int, _ g: Int, _ b: Int) -> V3 {
    V3(Float(r) / 9, Float(g) / 9, Float(b) / 9)
}
