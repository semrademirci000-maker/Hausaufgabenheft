//
//  Nachrichten.swift
//  Was die Geräte sich gegenseitig schicken.
//
//  Jedes Gerät steuert seinen eigenen Affen. Das Gerät mit der kleinsten ID
//  ist der „Meister“: Es steuert die Computer-Affen und bestimmt die Runde.
//

import Foundation

struct AffenDaten: Codable {
    var id: String
    var name: String
    var farbe: V3
    var hut: String?
    var gesicht: String?
    var p: V3
    var g: Float
    var h: [V3]
    var v: V3
}

enum Inhalt: Codable {
    case affe(AffenDaten)
    case bots([AffenDaten])
    case runde(Runde)
    case markiert(taeger: String, opfer: String)
    case schuss(Farbkugel)
    case treffer(schuetze: String, opfer: String)
    case tschuess(String)
}

struct Paket: Codable {
    var von: String
    var karte: KartenID
    var inhalt: Inhalt
}

enum NetzStatus: Equatable {
    case aus
    case suche
    case verbunden(Int)
    case fehler(String)

    var text: String {
        switch self {
        case .aus: return "Offline"
        case .suche: return "Suche Spieler …"
        case .verbunden(let n): return n == 0 ? "Warte auf Spieler …" : "\(n + 1) Spieler verbunden"
        case .fehler(let f): return f
        }
    }
}

protocol NetzTransport: AnyObject {
    var beimEmpfang: ((Data) -> Void)? { get set }
    var beiStatus: ((NetzStatus) -> Void)? { get set }
    func starte(raum: String)
    func sende(_ daten: Data, zuverlaessig: Bool)
    func stoppe()
}
