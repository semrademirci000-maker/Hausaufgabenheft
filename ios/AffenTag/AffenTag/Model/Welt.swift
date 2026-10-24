//
//  Welt.swift
//  Alles, woran man sich festhalten kann: Kisten, Baumstämme, Felsen.
//  Reine Geometrie ohne SceneKit – die Hände und Körper fragen hier nach,
//  ob sie gerade in etwas hineinstecken.
//

import Foundation
import simd

enum Material: Int, Codable, CaseIterable {
    case gras, holz, stein, blaetter, eis, sand, schnee, metall, kristall, wolke

    /// 0 = Hand klebt fest, 1 = rutscht wie auf Glatteis.
    var rutschig: Float {
        switch self {
        case .eis: return 0.88
        case .schnee: return 0.25
        case .wolke: return 0.15
        case .metall: return 0.2
        default: return 0
        }
    }
}

enum Form {
    /// Quader mit halben Kantenlängen, um die y-Achse gedreht.
    case kiste(halb: V3, gier: Float)
    /// Senkrechter Zylinder (Baumstamm, Säule).
    case zylinder(radius: Float, halbeHoehe: Float)
    case kugel(radius: Float)
}

struct Koerper {
    var mitte: V3
    var form: Form
    var material: Material
    /// Grober Umkreis für die schnelle Vorauswahl.
    let reichweite: Float

    init(mitte: V3, form: Form, material: Material) {
        self.mitte = mitte
        self.form = form
        self.material = material
        switch form {
        case .kiste(let h, _): reichweite = simd_length(h)
        case .zylinder(let r, let hh): reichweite = sqrt(r * r + hh * hh)
        case .kugel(let r): reichweite = r
        }
    }
}

struct Treffer {
    /// Zeigt aus dem Körper heraus.
    var normale: V3
    /// Wie tief man drinsteckt.
    var tiefe: Float
    var material: Material
}

/// Ein Bereich, der beim Betreten etwas auslöst (Tunnel zu einer anderen Karte).
struct Tor {
    var mitte: V3
    var halb: V3
    var ziel: KartenID
    func enthaelt(_ p: V3) -> Bool {
        let d = simd_abs(p - mitte)
        return d.x < halb.x && d.y < halb.y && d.z < halb.z
    }
}

final class Welt {
    private(set) var koerper: [Koerper] = []
    var tore: [Tor] = []
    var startpunkte: [V3] = [V3(0, 1, 0)]
    /// Wer tiefer fällt, wird zurückgesetzt.
    var boden: Float = -25
    /// Unsichtbare runde Mauer um die Karte.
    var grenzRadius: Float = 60
    var grenzMitte: V3 = .zero
    /// Wo der Computer steht (nur im Stumpf).
    var computer: V3?
    var schwerkraft: Float = 9.81

    func dazu(_ k: Koerper) { koerper.append(k) }

    // MARK: Punkt-Abfrage (für Hände)

    /// Steckt der Punkt in etwas? Dann: auf welchem kürzesten Weg kommt man raus.
    func punktInnen(_ p: V3, rand: Float = 0) -> Treffer? {
        var bester: Treffer?
        for k in koerper {
            let d = p - k.mitte
            if simd_length_squared(d) > (k.reichweite + rand) * (k.reichweite + rand) { continue }
            if let t = Welt.kugelTest(p, radius: rand, gegen: k), t.tiefe > (bester?.tiefe ?? 0) {
                bester = t
            }
        }
        return bester
    }

    // MARK: Kugel-Abfrage (für Körper)

    func kugel(_ c: V3, radius r: Float) -> [Treffer] {
        var alle: [Treffer] = []
        for k in koerper {
            let d = c - k.mitte
            let grenze = k.reichweite + r
            if simd_length_squared(d) > grenze * grenze { continue }
            if let t = Welt.kugelTest(c, radius: r, gegen: k) { alle.append(t) }
        }
        return alle
    }

    /// Ist zwischen a und b freie Sicht? (grob, in kleinen Schritten)
    func freieSicht(_ a: V3, _ b: V3) -> Bool {
        let weg = b - a
        let n = max(2, Int(simd_length(weg) / 0.6))
        for i in 1..<n {
            let p = a + weg * (Float(i) / Float(n))
            if punktInnen(p) != nil { return false }
        }
        return true
    }

    private static func kugelTest(_ c: V3, radius r: Float, gegen k: Koerper) -> Treffer? {
        switch k.form {
        case .kugel(let kr):
            let d = c - k.mitte
            let l = simd_length(d)
            if l >= kr + r { return nil }
            let n = l > 1e-5 ? d / l : V3(0, 1, 0)
            return Treffer(normale: n, tiefe: kr + r - l, material: k.material)

        case .kiste(let h, let g):
            let lokal = drehY(c - k.mitte, -g)
            let nah = simd_clamp(lokal, -h, h)
            let weg = lokal - nah
            let l = simd_length(weg)
            if l > 1e-5 {
                if l >= r { return nil }
                return Treffer(normale: drehY(weg / l, g), tiefe: r - l, material: k.material)
            }
            // Mittelpunkt steckt im Quader: über die nächste Seite raus.
            let pen = h - simd_abs(lokal)
            var n = V3(0, lokal.y >= 0 ? 1 : -1, 0)
            var tiefe = pen.y
            if pen.x < tiefe { tiefe = pen.x; n = V3(lokal.x >= 0 ? 1 : -1, 0, 0) }
            if pen.z < tiefe { tiefe = pen.z; n = V3(0, 0, lokal.z >= 0 ? 1 : -1) }
            return Treffer(normale: drehY(n, g), tiefe: tiefe + r, material: k.material)

        case .zylinder(let zr, let hh):
            let d = c - k.mitte
            let radial = V3(d.x, 0, d.z)
            let rl = simd_length(radial)
            let ry = klemm(d.y, -hh, hh)
            let rn = rl > zr ? radial / rl * zr : radial
            let nah = V3(rn.x, ry, rn.z)
            let weg = d - nah
            let l = simd_length(weg)
            if l > 1e-5 {
                if l >= r { return nil }
                return Treffer(normale: weg / l, tiefe: r - l, material: k.material)
            }
            let seite = zr - rl
            let oben = hh - d.y
            let unten = hh + d.y
            if seite <= oben && seite <= unten {
                let n = rl > 1e-5 ? radial / rl : V3(1, 0, 0)
                return Treffer(normale: n, tiefe: seite + r, material: k.material)
            }
            return oben <= unten
                ? Treffer(normale: V3(0, 1, 0), tiefe: oben + r, material: k.material)
                : Treffer(normale: V3(0, -1, 0), tiefe: unten + r, material: k.material)
        }
    }

    // MARK: Körper bewegen

    /// Schiebt eine Körper-Kugel aus allem heraus, nimmt die Geschwindigkeit
    /// in die Wand weg und meldet, ob man auf etwas steht bzw. an eine Wand stößt.
    @discardableResult
    func loese(position: inout V3, geschwindigkeit: inout V3, radius: Float) -> (steht: Bool, wand: V3?, material: Material?) {
        var steht = false
        var wand: V3?
        var material: Material?
        for _ in 0..<3 {
            let treffer = kugel(position, radius: radius)
            if treffer.isEmpty { break }
            for t in treffer {
                position += t.normale * t.tiefe
                let gegen = simd_dot(geschwindigkeit, t.normale)
                if gegen < 0 { geschwindigkeit -= t.normale * gegen }
                if t.normale.y > 0.55 { steht = true; material = t.material }
                else if abs(t.normale.y) < 0.5 { wand = t.normale; material = material ?? t.material }
            }
        }
        // Unsichtbare Mauer am Kartenrand
        let flach = (position - grenzMitte).flach
        let l = simd_length(flach)
        if l > grenzRadius {
            let n = flach / l
            position -= n * (l - grenzRadius)
            let raus = simd_dot(geschwindigkeit, n)
            if raus > 0 { geschwindigkeit -= n * raus }
            wand = -n
        }
        return (steht, wand, material)
    }
}
