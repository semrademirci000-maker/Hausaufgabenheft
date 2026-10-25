//
//  Einstellungen.swift
//  Alles, was du am Computer im Stumpf einstellst – wird auf dem Gerät gespeichert.
//

import Foundation

enum DrehModus: String, Codable, CaseIterable { case sanft, ruck, aus
    var computerName: String { ["sanft": "SANFT", "ruck": "RUCK", "aus": "AUS"][rawValue] ?? "" }
}

enum Verbindung: String, Codable, CaseIterable { case aus, nah, online
    var computerName: String {
        switch self {
        case .aus: return "OFFLINE (ALLEIN ÜBEN)"
        case .nah: return "IN DER NÄHE (WLAN/BLUETOOTH)"
        case .online: return "ONLINE – ALLE SPIELER (GAME CENTER)"
        }
    }
}

enum Warteschlange: String, Codable, CaseIterable { case standard, minispiele, wettkampf
    var computerName: String { rawValue.uppercased() }
}

struct Einstellungen: Codable, Equatable {
    var name = "AFFE\(Int.random(in: 100...999))"
    var rot = 3, gruen = 2, blau = 1
    var drehModus: DrehModus = .sanft
    var drehTempo = 5
    var gyro = false
    var empfindlichkeit = 5
    var verbindung: Verbindung = .online
    var warteschlange: Warteschlange = .standard
    var modus: Modus = .infektion
    var lautstaerke = 7
    var vibration = true
    var steine = 50
    var besitz: [String] = []
    var hut: String?
    var gesicht: String?
    var anleitungGesehen = false
    /// Größe des Gorillas, 1.0 bis 3.6
    var groesse = 2.6
    /// Mit einem Affen-Namen angemeldet? (optional, damit alte Speicherstände weiter laden)
    var angemeldet: Bool?

    private static let schluessel = "affentag.einstellungen"

    static func laden() -> Einstellungen {
        guard let daten = UserDefaults.standard.data(forKey: schluessel),
              let e = try? JSONDecoder().decode(Einstellungen.self, from: daten) else { return Einstellungen() }
        return e
    }

    func speichern() {
        if let daten = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(daten, forKey: Einstellungen.schluessel)
        }
    }
}
