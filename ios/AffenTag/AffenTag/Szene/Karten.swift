//
//  Karten.swift
//  Alle Orte: der Stumpf (Treffpunkt mit dem Computer) und die sechs Karten.
//  Jede Karte wird mit festem Zufall gebaut – auf jedem Gerät exakt gleich.
//

import SceneKit
import UIKit

enum KartenID: String, CaseIterable, Codable, Identifiable {
    case stumpf, wald, hoehle, canyon, berge, strand, wolken
    var id: String { rawValue }

    var name: String {
        switch self {
        case .stumpf: return "Stumpf"
        case .wald: return "Wald"
        case .hoehle: return "Höhlen"
        case .canyon: return "Canyon"
        case .berge: return "Berge"
        case .strand: return "Strand"
        case .wolken: return "Wolken"
        }
    }

    var torFarbe: UIColor {
        switch self {
        case .stumpf: return farbe(0.9, 0.7, 0.3)
        case .wald: return farbe(0.35, 0.95, 0.35)
        case .hoehle: return farbe(0.55, 0.45, 1.0)
        case .canyon: return farbe(1.0, 0.55, 0.2)
        case .berge: return farbe(0.6, 0.9, 1.0)
        case .strand: return farbe(1.0, 0.9, 0.35)
        case .wolken: return farbe(1.0, 1.0, 1.0)
        }
    }

    var beschreibung: String {
        switch self {
        case .stumpf: return "Treffpunkt mit Computer und Toren zu allen Karten."
        case .wald: return "Riesige Bäume, Baumhaus und Hängebrücken – der Klassiker."
        case .hoehle: return "Dunkle Höhlen mit leuchtenden Kristallen und Laternen."
        case .canyon: return "Rote Felstürme, Holzbrücken und Kakteen in der Wüste."
        case .berge: return "Ein Berg zum Hochklettern – Vorsicht, Eis ist rutschig!"
        case .strand: return "Palmen, Steg und Rettungsturm am Meer."
        case .wolken: return "Wolkeninseln hoch im Himmel – mit wenig Schwerkraft."
        }
    }

    /// Karten, die man über die Tore oder das Menü betreten kann.
    static var spielbar: [KartenID] { allCases.filter { $0 != .stumpf } }
}

struct Stimmung {
    var himmelOben: UIColor
    var himmelUnten: UIColor
    var nebel: UIColor
    var nebelStart: CGFloat
    var nebelEnde: CGFloat
    var umgebung: CGFloat
    var sonne: UIColor
    var sonnenStaerke: CGFloat
}

struct GebauteKarte {
    let id: KartenID
    let welt: Welt
    let knoten: SCNNode
    let stimmung: Stimmung
}

enum Karten {

    static func baue(_ id: KartenID) -> GebauteKarte {
        let b = KartenBauer(saat: UInt64(id.rawValue.unicodeScalars.reduce(7) { $0 &* 31 &+ UInt32($1.value) }))
        let s: Stimmung
        switch id {
        case .stumpf: s = stumpf(b)
        case .wald: s = wald(b)
        case .hoehle: s = hoehle(b)
        case .canyon: s = canyon(b)
        case .berge: s = berge(b)
        case .strand: s = strand(b)
        case .wolken: s = wolken(b)
        }
        return GebauteKarte(id: id, welt: b.welt, knoten: b.fertig(), stimmung: s)
    }

    // MARK: - Farben

    static let gras = farbe(0.36, 0.62, 0.25)
    static let stamm = farbe(0.42, 0.28, 0.17)
    static let brett = farbe(0.64, 0.47, 0.28)
    static let blatt = farbe(0.24, 0.56, 0.22)
    static let stein = farbe(0.5, 0.5, 0.52)

    // MARK: - Stumpf (Treffpunkt)

    static let stumpfTore: [(Int, KartenID)] = [(1, .wald), (4, .hoehle), (7, .canyon), (11, .berge), (14, .strand), (17, .wolken)]

    private static func stumpf(_ b: KartenBauer) -> Stimmung {
        let r: Float = 7
        let wand = farbe(0.47, 0.31, 0.18)
        b.zylinder(V3(0, -1, 0), radius: r + 1.5, hoehe: 1, farbe(0.62, 0.43, 0.26), .holz, seiten: 24, textur: .ringe)
        b.zylinder(V3(0, 7.2, 0), radius: r + 1.5, hoehe: 0.6, wand, .holz, seiten: 18)

        let tore = Dictionary(uniqueKeysWithValues: stumpfTore)
        for i in 0..<18 {
            let a = Float(i) * grad(20)
            let d = V3(sin(a), 0, cos(a))
            let g = gierZu(d)
            if let ziel = tore[i] {
                b.tor(d * r, gier: g, ziel: ziel)
                // Wände neben und hinter dem Tor
                let tangente = drehY(V3(1, 0, 0), g)
                b.kiste(d * r + tangente * 1.25 + V3(0, 3.5, 0), V3(0.2, 7, 0.6), wand, .holz, gier: g)
                b.kiste(d * r - tangente * 1.25 + V3(0, 3.5, 0), V3(0.2, 7, 0.6), wand, .holz, gier: g)
                b.kiste(d * r + V3(0, 4.8, 0), V3(2.5, 4.4, 0.6), wand, .holz, gier: g)
                b.kiste(d * (r + 1.6) + V3(0, 1.5, 0), V3(2.6, 3.6, 0.4), farbe(0.15, 0.1, 0.06), .holz, gier: g)
                b.kiste(d * (r + 0.8) + V3(0, -0.1, 0), V3(2.4, 0.2, 1.8), farbe(0.3, 0.2, 0.1), .holz, gier: g)
            } else {
                b.kiste(d * r + V3(0, 3.5, 0), V3(2.5, 7, 0.6), wand.variiert(&b.w, 0.06), .holz, gier: g)
            }
        }
        // Spiegel an der Wand zwischen Canyon-Tunnel und Computer
        do {
            let a = grad(160), d = V3(sin(a), 0, cos(a))
            b.spiegel(d * (r - 0.35) + V3(0, 1.8, 0), blick: -d, breite: 2.2, hoehe: 2.8)
        }
        // Wendeltreppe aus Brettern an der Wand: vom Boden bis ganz nach oben laufen
        treppe(b, mitte: .zero, radius: r - 1.1, start: grad(192), schritt: grad(11), hoch: 0.4, anzahl: 18, breite: 1.55, tiefe: 1.6)

        // Der Computer
        let pc = V3(0, 0, -(r - 1.3))
        b.kiste(pc + V3(0, 0.45, 0), V3(2.4, 0.9, 1.0), farbe(0.5, 0.35, 0.2), .holz)
        b.kiste(pc + V3(0, 1.55, -0.2), V3(1.5, 1.1, 0.25), farbe(0.2, 0.2, 0.22), .metall)
        b.kiste(pc + V3(0, 1.55, -0.06), V3(1.3, 0.9, 0.02), farbe(0.1, 0.9, 0.35), .metall, fest: false, leuchten: true)
        b.kiste(pc + V3(0, 0.95, 0.15), V3(1.1, 0.06, 0.35), farbe(0.15, 0.15, 0.15), .metall, fest: false)
        b.schild("COMPUTER", pc + V3(0, 2.5, -0.2), gier: 0, groesse: 0.35, farbe(0.2, 1, 0.4))
        b.welt.computer = pc + V3(0, 1, 0.8)
        b.schild("AFFEN-TAG", V3(0, 5.6, -(r - 0.4)), gier: 0, groesse: 0.9, farbe(1, 0.85, 0.3))

        // Baumkrone über dem Stumpf (nur Deko)
        for i in 0..<7 {
            let a = Float(i) * grad(51)
            b.kugel(V3(sin(a) * 5, 9.5 + Float(i % 2), cos(a) * 5), radius: 4, Karten.blatt.variiert(&b.w), .blaetter,
                    fest: false, stauchung: V3(1, 0.5, 1))
        }
        b.licht(V3(0, 5.5, 0), farbe(1, 0.85, 0.6), staerke: 900, reichweite: 16)
        b.licht(pc + V3(0, 1.6, 0.6), farbe(0.3, 1, 0.5), staerke: 300, reichweite: 4)
        b.teilchen(farbe(1, 0.95, 0.5, 0.8), menge: 6, groesse: 0.04, fallen: 0.15, hoehe: 5, breite: 12)

        b.welt.startpunkte = (0..<8).map { i in
            let a = Float(i) * grad(45)
            return V3(sin(a) * 2.5, 0.5, cos(a) * 2.5)
        }
        b.welt.grenzRadius = r + 0.6
        return Stimmung(himmelOben: farbe(0.45, 0.7, 1), himmelUnten: farbe(0.75, 0.9, 1),
                        nebel: farbe(0.3, 0.22, 0.14), nebelStart: 30, nebelEnde: 60,
                        umgebung: 450, sonne: farbe(1, 0.95, 0.85), sonnenStaerke: 500)
    }

    // MARK: - Wald

    /// Wendeltreppe aus einzelnen Brettern (dünnes Holz = von unten durchlässig, oben fest)
    private static func treppe(_ b: KartenBauer, mitte: V3, radius: Float, start: Float, schritt: Float,
                               hoch: Float, anzahl: Int, breite: Float, tiefe: Float) {
        for k in 0..<anzahl {
            let a = start + Float(k) * schritt
            let d = V3(sin(a), 0, cos(a))
            let y = mitte.y + hoch * Float(k + 1)
            b.kiste(mitte + d * radius + V3(0, y - 0.06, 0), V3(breite, 0.12, tiefe), brett.variiert(&b.w), .holz, gier: gierZu(d))
        }
    }

    private static func baum(_ b: KartenBauer, _ p: V3, hoehe h: Float, radius r: Float, plattform: Bool) {
        b.zylinder(p, radius: r, hoehe: h, stamm.variiert(&b.w), .holz)
        let krone = b.w.zahl(3.0, 4.2)
        b.kugel(p + V3(0, h + 0.5, 0), radius: krone, blatt.variiert(&b.w, 0.12), .blaetter, stauchung: V3(1, 0.62, 1))
        b.kugel(p + V3(b.w.zahl(-1.5, 1.5), h + 2.1, b.w.zahl(-1.5, 1.5)), radius: krone * 0.7,
                blatt.variiert(&b.w, 0.12), .blaetter, stauchung: V3(1, 0.65, 1))
        // Äste
        for _ in 0..<b.w.ganz(2, 4) {
            let a = b.w.zahl(0, 2 * .pi)
            let d = V3(sin(a), 0, cos(a))
            let y = b.w.zahl(h * 0.35, h * 0.85)
            let lang = b.w.zahl(1.8, 3.2)
            b.kiste(p + d * (r + lang / 2 - 0.1) + V3(0, y, 0), V3(0.38, 0.38, lang), stamm, .holz, gier: gierZu(d))
        }
        if plattform {
            let y = b.w.zahl(h * 0.4, h * 0.6)
            b.kiste(p + V3(0, y, 0), V3(3.8, 0.3, 3.8), brett.variiert(&b.w), .holz, gier: b.w.zahl(0, 1.5))
        }
    }

    private static func wald(_ b: KartenBauer) -> Stimmung {
        b.kiste(V3(0, -0.5, 0), V3(110, 1, 110), gras, .gras)
        // Baumhaus in der Mitte
        b.zylinder(V3(0, 0, 0), radius: 1.6, hoehe: 15, stamm, .holz, seiten: 9)
        b.kiste(V3(0, 6.5, 0), V3(10, 0.4, 10), brett, .holz)
        for (dx, dz, sx, sz) in [(0, 4.9, 10, 0.25), (0, -4.9, 10, 0.25), (4.9, 0, 0.25, 10), (-4.9, 1.5, 0.25, 7)] as [(Float, Float, Float, Float)] {
            b.kiste(V3(dx, 7.2, dz), V3(sx, 1.0, sz), brett.variiert(&b.w), .holz)
        }
        b.kiste(V3(0, 11, 0), V3(6, 0.35, 6), brett, .holz, gier: grad(45))
        b.kiste(V3(0, 13.4, 0), V3(7, 0.3, 7), farbe(0.55, 0.3, 0.18), .holz)
        b.kugel(V3(0, 16, 0), radius: 5.5, blatt, .blaetter, stauchung: V3(1, 0.55, 1))
        // Wendeltreppe um den Stamm: vom Waldboden hoch bis zum Baumhaus
        treppe(b, mitte: .zero, radius: 2.9, start: grad(90), schritt: grad(29), hoch: 6.7 / 17, anzahl: 17, breite: 1.55, tiefe: 2.1)

        var baeume: [V3] = []
        var versuche = 0
        while baeume.count < 26 && versuche < 400 {
            versuche += 1
            let p = V3(b.w.zahl(-40, 40), 0, b.w.zahl(-40, 40))
            if simd_length(p) < 9 { continue }
            if baeume.contains(where: { simd_length($0 - p) < 8 }) { continue }
            baeume.append(p)
            baum(b, p, hoehe: b.w.zahl(9, 14), radius: b.w.zahl(0.55, 1.0), plattform: baeume.count % 2 == 0)
        }
        // Hängebrücken vom Baumhaus zu den nächsten Bäumen
        let nah = baeume.sorted { simd_length($0) < simd_length($1) }.prefix(4)
        for p in nah {
            let d = p.normiert
            b.bruecke(d * 5 + V3(0, 6.7, 0), p - d * 1.3 + V3(0, 6.7, 0), breite: 1.1, brett)
            b.kiste(p + V3(0, 6.6, 0), V3(3, 0.3, 3), brett, .holz, gier: gierZu(d))
        }
        // Felsen, Büsche, Baumstämme am Boden
        for _ in 0..<18 {
            let p = V3(b.w.zahl(-42, 42), 0, b.w.zahl(-42, 42))
            if simd_length(p) < 6 { continue }
            b.kugel(p + V3(0, 0.2, 0), radius: b.w.zahl(0.6, 1.6), stein.variiert(&b.w), .stein, stauchung: V3(1, 0.7, 1))
        }
        for _ in 0..<30 {
            let p = V3(b.w.zahl(-44, 44), 0.3, b.w.zahl(-44, 44))
            b.kugel(p, radius: b.w.zahl(0.5, 0.9), blatt.variiert(&b.w, 0.15), .blaetter, fest: false, stauchung: V3(1.3, 0.7, 1.3))
        }
        for _ in 0..<5 {
            let p = V3(b.w.zahl(-35, 35), 0.4, b.w.zahl(-35, 35))
            if simd_length(p) < 7 { continue }
            b.kiste(p, V3(0.8, 0.8, b.w.zahl(4, 7)), stamm, .holz, gier: b.w.zahl(0, 3))
        }
        // Dichter Waldrand
        for i in 0..<40 {
            let a = Float(i) * 2 * .pi / 40
            let p = V3(sin(a), 0, cos(a)) * b.w.zahl(47, 52)
            b.zylinder(p, radius: 1, hoehe: 16, stamm, .holz, fest: false)
            b.kugel(p + V3(0, 15, 0), radius: 5, blatt.variiert(&b.w), .blaetter, fest: false, stauchung: V3(1, 0.7, 1))
        }
        b.teilchen(farbe(0.9, 1, 0.5, 0.9), menge: 12, groesse: 0.05, fallen: 0.2, hoehe: 6, breite: 70)
        b.welt.startpunkte = (0..<8).map { i in
            let a = Float(i) * grad(45)
            return V3(sin(a) * 7, 0.5, cos(a) * 7)
        }
        b.welt.grenzRadius = 45
        return Stimmung(himmelOben: farbe(0.35, 0.62, 0.95), himmelUnten: farbe(0.8, 0.92, 0.95),
                        nebel: farbe(0.65, 0.8, 0.75), nebelStart: 25, nebelEnde: 75,
                        umgebung: 380, sonne: farbe(1, 0.96, 0.85), sonnenStaerke: 900)
    }

    // MARK: - Höhlen

    private static func hoehle(_ b: KartenBauer) -> Stimmung {
        let fels = farbe(0.32, 0.3, 0.33)
        b.kiste(V3(0, -0.5, 0), V3(70, 1, 70), farbe(0.28, 0.26, 0.27), .stein)
        b.kiste(V3(0, 15, 0), V3(70, 1, 70), farbe(0.2, 0.19, 0.21), .stein)
        // Außenwände aus großen Brocken
        for i in 0..<28 {
            let a = Float(i) * 2 * .pi / 28
            let d = V3(sin(a), 0, cos(a))
            b.kiste(d * 28 + V3(0, 7, 0), V3(7, 16, 3), fels.variiert(&b.w), .stein, gier: gierZu(d) + b.w.zahl(-0.2, 0.2))
        }
        // Säulen
        for _ in 0..<9 {
            let p = V3(b.w.zahl(-22, 22), 0, b.w.zahl(-22, 22))
            b.zylinder(p, radius: b.w.zahl(1.2, 2.2), hoehe: 15, fels.variiert(&b.w), .stein, seiten: 6)
        }
        // Felsplattformen auf verschiedenen Höhen
        var plattformen: [V3] = []
        for i in 0..<16 {
            let p = V3(b.w.zahl(-22, 22), Float(i % 4) * 2.6 + 2, b.w.zahl(-22, 22))
            plattformen.append(p)
            b.kiste(p, V3(b.w.zahl(3, 6), 0.8, b.w.zahl(3, 6)), fels.variiert(&b.w), .stein, gier: b.w.zahl(0, 3))
        }
        for i in stride(from: 0, to: plattformen.count - 1, by: 3) {
            b.bruecke(plattformen[i] + V3(0, 0.5, 0), plattformen[i + 1] + V3(0, 0.5, 0), breite: 0.9, brett)
        }
        // Tropfsteine
        for _ in 0..<22 {
            let p = V3(b.w.zahl(-25, 25), 0, b.w.zahl(-25, 25))
            b.kegel(p, radius: b.w.zahl(0.5, 1.2), hoehe: b.w.zahl(1.5, 4), fels.variiert(&b.w), .stein, seiten: 5)
            let q = V3(b.w.zahl(-25, 25), 14.5, b.w.zahl(-25, 25))
            b.kegel(q, radius: b.w.zahl(0.4, 1.0), hoehe: b.w.zahl(1.5, 3.5), fels.variiert(&b.w), .stein, fest: false, seiten: 5, kopfueber: true)
        }
        // Leuchtende Kristalle
        let kristallFarben = [farbe(0.4, 0.6, 1), farbe(0.75, 0.4, 1), farbe(0.3, 1, 0.85)]
        for i in 0..<26 {
            let p = V3(b.w.zahl(-25, 25), 0, b.w.zahl(-25, 25))
            let f = kristallFarben[i % 3]
            let n = b.kiste(p + V3(0, 0.6, 0), V3(0.5, b.w.zahl(1, 2.4), 0.5), f, .kristall, gier: b.w.zahl(0, 3), leuchten: true)
            n.simdEulerAngles.x = b.w.zahl(-0.4, 0.4)
            if i % 4 == 0 { b.licht(p + V3(0, 1.2, 0), f, staerke: 350, reichweite: 7) }
        }
        // Laternen und Lorenschienen
        for i in 0..<8 {
            let a = Float(i) * grad(45)
            let p = V3(sin(a) * 14, 3.5, cos(a) * 14)
            b.kugel(p, radius: 0.25, farbe(1, 0.75, 0.3), .metall, fest: false, leuchten: true)
            b.licht(p, farbe(1, 0.7, 0.35), staerke: 500, reichweite: 11)
        }
        for i in 0..<30 {
            let z = Float(i) * 1.6 - 24
            b.kiste(V3(-4, 0.05, z), V3(2.2, 0.1, 0.3), brett, .holz, fest: false)
        }
        b.kiste(V3(-4.6, 0.15, 0), V3(0.12, 0.12, 48), farbe(0.45, 0.45, 0.5), .metall, fest: false)
        b.kiste(V3(-3.4, 0.15, 0), V3(0.12, 0.12, 48), farbe(0.45, 0.45, 0.5), .metall, fest: false)
        b.kiste(V3(-4, 0.8, 6), V3(1.8, 1.1, 2.4), farbe(0.4, 0.3, 0.22), .metall)
        b.welt.startpunkte = (0..<8).map { i in V3(Float(i) * 1.5 - 5, 0.5, 18) }
        b.welt.grenzRadius = 26
        return Stimmung(himmelOben: farbe(0.02, 0.02, 0.04), himmelUnten: farbe(0.05, 0.04, 0.08),
                        nebel: farbe(0.03, 0.03, 0.06), nebelStart: 10, nebelEnde: 40,
                        umgebung: 160, sonne: farbe(0.5, 0.5, 0.7), sonnenStaerke: 60)
    }

    // MARK: - Canyon

    private static func canyon(_ b: KartenBauer) -> Stimmung {
        let sand = farbe(0.87, 0.68, 0.42)
        let schichten = [farbe(0.72, 0.36, 0.2), farbe(0.82, 0.48, 0.26), farbe(0.65, 0.3, 0.18), farbe(0.88, 0.58, 0.32)]
        b.kiste(V3(0, -0.5, 0), V3(120, 1, 120), sand, .sand)
        var gipfel: [V3] = []
        var versuche = 0
        while gipfel.count < 14 && versuche < 300 {
            versuche += 1
            let p = V3(b.w.zahl(-36, 36), 0, b.w.zahl(-36, 36))
            if simd_length(p) < 8 || gipfel.contains(where: { simd_length($0.flach - p) < 11 }) { continue }
            let stufen = b.w.ganz(2, 4)
            var y: Float = 0
            var breite = b.w.zahl(6, 9)
            let g = b.w.zahl(0, 1.5)
            for s in 0..<stufen {
                let h = b.w.zahl(2.5, 4.5)
                b.kiste(p + V3(b.w.zahl(-0.6, 0.6), y + h / 2, b.w.zahl(-0.6, 0.6)), V3(breite, h, breite * b.w.zahl(0.8, 1.1)),
                        schichten[(s + gipfel.count) % 4], .stein, gier: g)
                y += h
                breite *= b.w.zahl(0.65, 0.85)
            }
            gipfel.append(p + V3(0, y, 0))
        }
        // Brücken zwischen nahen Felstürmen
        for (i, a) in gipfel.enumerated() {
            if let ziel = gipfel[(i + 1)...].min(by: { simd_length($0.flach - a.flach) < simd_length($1.flach - a.flach) }),
               simd_length(ziel.flach - a.flach) < 20 {
                b.bruecke(a + V3(0, 0.1, 0), ziel + V3(0, 0.1, 0), breite: 1.0, brett)
            }
        }
        // Felsbogen in der Mitte
        b.kiste(V3(-4, 4, 0), V3(2.5, 8, 3), schichten[0], .stein)
        b.kiste(V3(4, 4, 0), V3(2.5, 8, 3), schichten[0], .stein)
        b.kiste(V3(0, 8.8, 0), V3(11, 1.8, 3.2), schichten[1], .stein)
        // Kakteen
        let kaktus = farbe(0.3, 0.6, 0.3)
        for _ in 0..<22 {
            let p = V3(b.w.zahl(-42, 42), 0, b.w.zahl(-42, 42))
            if simd_length(p) < 6 { continue }
            let h = b.w.zahl(2, 4)
            b.zylinder(p, radius: 0.35, hoehe: h, kaktus, .blaetter, seiten: 6)
            let seite = b.w.zahl(0, 1) > 0.5 ? Float(1) : -1
            b.kiste(p + V3(0.45 * seite, h * 0.55, 0), V3(0.7, 0.3, 0.3), kaktus, .blaetter)
            b.kiste(p + V3(0.7 * seite, h * 0.55 + 0.5, 0), V3(0.3, 1.0, 0.3), kaktus, .blaetter)
        }
        // Steilwände rundherum
        for i in 0..<30 {
            let a = Float(i) * 2 * .pi / 30
            let d = V3(sin(a), 0, cos(a))
            b.kiste(d * 49 + V3(0, 9, 0), V3(11, 18 + b.w.zahl(0, 8), 4), schichten[i % 4], .stein, gier: gierZu(d))
        }
        b.welt.startpunkte = (0..<8).map { i in V3(Float(i) * 1.5 - 5, 0.5, 4) }
        b.welt.grenzRadius = 46
        return Stimmung(himmelOben: farbe(0.35, 0.55, 0.9), himmelUnten: farbe(1, 0.75, 0.5),
                        nebel: farbe(0.95, 0.75, 0.55), nebelStart: 30, nebelEnde: 90,
                        umgebung: 420, sonne: farbe(1, 0.85, 0.65), sonnenStaerke: 1000)
    }

    // MARK: - Berge

    private static func berge(_ b: KartenBauer) -> Stimmung {
        let schnee = farbe(0.93, 0.95, 1)
        let fels = farbe(0.45, 0.47, 0.52)
        let eis = farbe(0.6, 0.85, 1, 0.8)
        b.kiste(V3(0, -0.5, 0), V3(110, 1, 110), schnee, .schnee)
        // Der große Berg: Stufen, die immer kleiner werden
        var breite: Float = 30
        var y: Float = 0
        for i in 0..<11 {
            let h: Float = 1.6
            let versatz = V3(b.w.zahl(-1.5, 1.5), 0, b.w.zahl(-1.5, 1.5))
            b.kiste(V3(0, y + h / 2, -12) + versatz, V3(breite, h, breite), i % 3 == 2 ? fels : schnee.variiert(&b.w, 0.03),
                    i % 3 == 2 ? .stein : .schnee, gier: Float(i) * 0.21)
            y += h
            breite -= 2.4
        }
        b.zylinder(V3(0, y, -12), radius: 0.15, hoehe: 3, stamm, .holz, seiten: 5)
        b.kiste(V3(0.6, y + 2.6, -12), V3(1.1, 0.7, 0.05), farbe(0.9, 0.2, 0.2), .holz, fest: false)
        // Schwebende Eisschollen
        for i in 0..<12 {
            let a = Float(i) * grad(30)
            let p = V3(sin(a) * b.w.zahl(14, 26), b.w.zahl(2, 9), cos(a) * b.w.zahl(14, 26) + 4)
            b.kiste(p, V3(b.w.zahl(2.5, 4.5), 0.5, b.w.zahl(2.5, 4.5)), eis, .eis, gier: b.w.zahl(0, 3))
        }
        // Zugefrorener See
        b.zylinder(V3(18, -0.45, 18), radius: 9, hoehe: 0.5, farbe(0.65, 0.85, 1), .eis, seiten: 12)
        // Tannen
        let tanne = farbe(0.15, 0.4, 0.28)
        for _ in 0..<24 {
            let p = V3(b.w.zahl(-42, 42), 0, b.w.zahl(-42, 42))
            if simd_length(p - V3(0, 0, -12)) < 17 || simd_length(p - V3(18, 0, 18)) < 10 { continue }
            let h = b.w.zahl(5, 9)
            b.zylinder(p, radius: 0.35, hoehe: h * 0.3, stamm, .holz, seiten: 5)
            for s in 0..<3 {
                let r = (1 - Float(s) * 0.28) * h * 0.32
                b.kegel(p + V3(0, h * (0.2 + Float(s) * 0.25), 0), radius: r, hoehe: h * 0.45, tanne.variiert(&b.w), .blaetter, fest: s == 0)
                b.kegel(p + V3(0, h * (0.2 + Float(s) * 0.25) + h * 0.3, 0), radius: r * 0.45, hoehe: h * 0.16, schnee, .schnee, fest: false)
            }
        }
        // Schneemänner
        for i in 0..<3 {
            let p = V3(Float(i) * 6 - 6, 0, 22)
            b.kugel(p + V3(0, 0.8, 0), radius: 0.9, schnee, .schnee)
            b.kugel(p + V3(0, 2.0, 0), radius: 0.62, schnee, .schnee)
            b.kugel(p + V3(0, 2.9, 0), radius: 0.42, schnee, .schnee)
            b.kegel(p + V3(0, 2.95, 0.38), radius: 0.08, hoehe: 0.4, farbe(1, 0.5, 0.1), .holz, fest: false)
        }
        // Hütte
        b.kiste(V3(-18, 1.6, 14), V3(6, 3.2, 5), stamm, .holz)
        b.kiste(V3(-18, 3.6, 14), V3(6.6, 0.8, 5.6), schnee, .schnee)
        b.licht(V3(-18, 2, 17), farbe(1, 0.75, 0.4), staerke: 400, reichweite: 8)
        b.teilchen(farbe(1, 1, 1, 0.9), menge: 140, groesse: 0.07, fallen: 1.3, hoehe: 22, breite: 90)
        b.welt.startpunkte = (0..<8).map { i in V3(Float(i) * 1.5 - 5, 0.5, 30) }
        b.welt.grenzRadius = 46
        return Stimmung(himmelOben: farbe(0.6, 0.72, 0.88), himmelUnten: farbe(0.92, 0.95, 1),
                        nebel: farbe(0.88, 0.92, 0.98), nebelStart: 15, nebelEnde: 65,
                        umgebung: 520, sonne: farbe(0.95, 0.97, 1), sonnenStaerke: 700)
    }

    // MARK: - Strand

    private static func strand(_ b: KartenBauer) -> Stimmung {
        let sand = farbe(0.95, 0.85, 0.6)
        b.kiste(V3(0, -1.5, 0), V3(140, 1, 140), farbe(0.8, 0.72, 0.5), .sand)
        b.zylinder(V3(0, -1.2, 0), radius: 30, hoehe: 1.7, sand, .sand, seiten: 16)
        b.zylinder(V3(0, -1.2, 0), radius: 34, hoehe: 1.2, sand.variiert(&b.w), .sand, seiten: 16)
        b.kiste(V3(0, -0.35, 0), V3(140, 0.1, 140), farbe(0.15, 0.55, 0.85, 0.6), .sand, fest: false)
        // Palmen: schräger Stamm aus Stücken
        let palmBlatt = farbe(0.25, 0.65, 0.25)
        for i in 0..<14 {
            let a = Float(i) * 2 * .pi / 14 + b.w.zahl(-0.2, 0.2)
            var p = V3(sin(a), 0.5, cos(a)) * b.w.zahl(10, 25)
            p.y = 0.5
            let neigung = V3(b.w.zahl(-1, 1), 0, b.w.zahl(-1, 1)).normiert * 0.35
            for s in 0..<7 {
                b.zylinder(p + neigung * Float(s * s) * 0.12 + V3(0, Float(s) * 1.1, 0), radius: 0.38 - Float(s) * 0.025,
                           hoehe: 1.15, farbe(0.55, 0.4, 0.25).variiert(&b.w), .holz, seiten: 6)
            }
            let kopf = p + neigung * 36 * 0.12 + V3(0, 7.7, 0)
            for k in 0..<6 {
                let ka = Float(k) * grad(60)
                let d = V3(sin(ka), 0, cos(ka))
                let blattKnoten = b.kiste(kopf + d * 1.5 + V3(0, -0.3, 0), V3(0.9, 0.12, 3.2), palmBlatt, .blaetter, gier: gierZu(d))
                blattKnoten.simdEulerAngles.x = 0.35
            }
            b.kugel(kopf + V3(0, -0.4, 0), radius: 0.3, farbe(0.4, 0.28, 0.15), .holz, fest: false)
        }
        // Steg ins Meer
        for i in 0..<10 {
            let z = 30 + Float(i) * 2
            b.kiste(V3(0, 0.6, z), V3(2.6, 0.25, 2.05), brett.variiert(&b.w), .holz)
            b.zylinder(V3(-1.2, -1.2, z), radius: 0.15, hoehe: 1.8, stamm, .holz, seiten: 5)
            b.zylinder(V3(1.2, -1.2, z), radius: 0.15, hoehe: 1.8, stamm, .holz, seiten: 5)
        }
        // Rettungsturm
        let turm = V3(-12, 0.5, 6)
        for (dx, dz) in [(-1.2, -1.2), (1.2, -1.2), (-1.2, 1.2), (1.2, 1.2)] as [(Float, Float)] {
            b.zylinder(turm + V3(dx, 0, dz), radius: 0.15, hoehe: 4, farbe(0.95, 0.95, 0.95), .holz, seiten: 5)
        }
        b.kiste(turm + V3(0, 4.1, 0), V3(3.2, 0.3, 3.2), farbe(0.95, 0.3, 0.25), .holz)
        b.kiste(turm + V3(0, 4.8, -1.5), V3(3.2, 1.2, 0.15), farbe(0.95, 0.3, 0.25), .holz)
        b.kiste(turm + V3(0, 6.3, 0), V3(3.6, 0.2, 3.6), farbe(1, 0.85, 0.3), .holz)
        b.bruecke(turm + V3(0, 0, 3), turm + V3(0, 4.0, 1.6), breite: 1.0, brett)
        // Strandhütten, Schirme, Felsen, Sandburg
        let huettenFarben = [farbe(0.3, 0.7, 0.9), farbe(0.95, 0.55, 0.6), farbe(0.95, 0.85, 0.35)]
        for i in 0..<3 {
            let p = V3(10 + Float(i) * 4.5, 1.6, -14)
            b.kiste(p, V3(3.5, 3.2, 3.5), huettenFarben[i], .holz)
            b.kiste(p + V3(0, 1.9, 0), V3(4.2, 0.4, 4.2), farbe(0.6, 0.45, 0.3), .holz)
        }
        for i in 0..<6 {
            let p = V3(b.w.zahl(-20, 20), 0.5, b.w.zahl(-20, 20))
            b.zylinder(p, radius: 0.06, hoehe: 2.5, .white, .holz, seiten: 4, fest: false)
            b.kegel(p + V3(0, 2.2, 0), radius: 1.6, hoehe: 0.7, huettenFarben[i % 3], .holz)
        }
        for _ in 0..<10 {
            let a = b.w.zahl(0, 2 * .pi)
            let p = V3(sin(a), 0, cos(a)) * b.w.zahl(26, 36)
            b.kugel(p, radius: b.w.zahl(1.2, 3), stein.variiert(&b.w), .stein, stauchung: V3(1, 0.75, 1))
        }
        b.kiste(V3(5, 1.0, 8), V3(2.4, 1.0, 2.4), sand.variiert(&b.w), .sand)
        b.zylinder(V3(5, 1.5, 8), radius: 0.7, hoehe: 1.2, sand, .sand, seiten: 6)
        b.welt.startpunkte = (0..<8).map { i in V3(Float(i) * 1.5 - 5, 1, 0) }
        b.welt.grenzRadius = 52
        b.welt.boden = -10
        return Stimmung(himmelOben: farbe(0.25, 0.6, 1), himmelUnten: farbe(0.75, 0.92, 1),
                        nebel: farbe(0.7, 0.88, 1), nebelStart: 40, nebelEnde: 110,
                        umgebung: 480, sonne: farbe(1, 0.97, 0.88), sonnenStaerke: 1100)
    }

    // MARK: - Wolken

    private static func wolken(_ b: KartenBauer) -> Stimmung {
        let weiss = farbe(0.97, 0.97, 1)
        let marmor = farbe(0.92, 0.9, 0.85)
        let gold = farbe(1, 0.82, 0.3)
        func wolke(_ p: V3, _ groesse: Float) {
            for i in 0..<5 {
                let versatz = V3(b.w.zahl(-1, 1), b.w.zahl(-0.2, 0.3), b.w.zahl(-1, 1)) * groesse
                b.kugel(p + versatz, radius: groesse * b.w.zahl(0.6, 1.0) * (i == 0 ? 1.3 : 1), weiss.variiert(&b.w, 0.03),
                        .wolke, stauchung: V3(1, 0.5, 1))
            }
        }
        wolke(V3(0, -1.5, 0), 5)
        wolke(V3(5, -1.5, 4), 4)
        var inseln: [V3] = [.zero]
        for i in 0..<18 {
            let a = Float(i) * grad(47)
            let r = 10 + Float(i) * 1.6
            let p = V3(sin(a) * r, b.w.zahl(-1, 12), cos(a) * r)
            inseln.append(p)
            wolke(p, b.w.zahl(2, 3.6))
        }
        // Tempel mit Säulen auf der Hauptwolke
        for (dx, dz) in [(-3, -3), (3, -3), (-3, 3), (3, 3)] as [(Float, Float)] {
            b.zylinder(V3(dx, 0, dz - 8), radius: 0.45, hoehe: 5, marmor, .stein, seiten: 8)
        }
        b.kiste(V3(0, 5.3, -8), V3(8, 0.6, 8), marmor, .stein)
        b.kegel(V3(0, 5.6, -8), radius: 5.5, hoehe: 2, gold, .metall, seiten: 4)
        b.kiste(V3(0, 0.2, -8), V3(8, 0.4, 8), marmor, .stein)
        // Goldene Ringe zum Durchspringen (Deko)
        for i in 0..<5 {
            let ring = SCNTorus(ringRadius: 1.4, pipeRadius: 0.12)
            ring.materials = [b.material(gold, leuchten: true)]
            let n = SCNNode(geometry: ring)
            let p = inseln[(i * 3 + 2) % inseln.count] + V3(0, 4, 0)
            n.simdPosition = p
            n.simdEulerAngles = V3(.pi / 2, Float(i), 0)
            b.lebendig.addChildNode(n)
            n.runAction(.repeatForever(.rotateBy(x: 0, y: 0, z: .pi * 2, duration: 8)))
        }
        b.welt.startpunkte = (0..<8).map { i in V3(Float(i) * 1.2 - 4, 1.5, 2) }
        b.welt.grenzRadius = 48
        b.welt.boden = -20
        b.welt.schwerkraft = 4.2
        return Stimmung(himmelOben: farbe(0.3, 0.55, 1), himmelUnten: farbe(1, 0.85, 0.95),
                        nebel: farbe(0.95, 0.9, 1), nebelStart: 30, nebelEnde: 100,
                        umgebung: 600, sonne: farbe(1, 0.96, 0.9), sonnenStaerke: 900)
    }
}
