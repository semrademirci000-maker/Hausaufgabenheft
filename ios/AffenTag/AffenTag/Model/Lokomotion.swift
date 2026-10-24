//
//  Lokomotion.swift
//  Die Fortbewegung wie im Original: Du hast keine Beine. Du drückst dich
//  mit den Händen vom Boden, von Wänden und Ästen ab.
//
//  So funktioniert es:
//  • Jede Hand hängt an einem Arm (Schulter + Armlänge). Die Handy-Steuerung
//    (Joystick, Springen, 1–4, E) bewegt die Arme so, wie es ein Spieler mit
//    VR-Brille tun würde – siehe `steuere(...)`.
//  • Will die Hand in etwas hinein (Boden, Wand), bleibt sie stattdessen an
//    der Oberfläche kleben – und der KÖRPER wird um genau diesen Rest
//    verschoben. Hand nach unten-hinten ziehen = Körper nach oben-vorne.
//  • Lässt du los, fliegst du mit dem Schwung weiter (mal Sprungfaktor).
//

import Foundation
import simd

struct Hand {
    /// Armwinkel relativ zum Körper (Bogenmaß).
    var gier: Float
    var neigung: Float
    /// Finger liegt auf dem Bildschirm → Hand kann greifen.
    var aktiv = false
    /// Niemand steuert die Hand → sie schwebt in die Ruhehaltung.
    var frei = true
    /// Wo die Hand gerade ist (Welt).
    var position: V3 = .zero
    var haftet = false
    var haftPunkt: V3 = .zero
    var haftNormale: V3 = V3(0, 1, 0)
    var material: Material = .gras
    /// Zeit seit dem letzten Aufschlag (gegen Klang-Flackern).
    var ruhe: Float = 1
}

struct Aufschlag {
    var hand: Int
    var material: Material
    var staerke: Float
    var ort: V3
}

final class Affenkoerper {
    static let radius: Float = 0.32
    static let armLaenge: Float = 0.92
    static let schulter = V3(0.2, -0.16, 0.05)
    static let ruheGier: Float = grad(16)
    static let ruheNeigung: Float = grad(-30)

    var position: V3
    var geschwindigkeit: V3 = .zero
    /// Körperdrehung (Gier) – Blick links/rechts.
    var gier: Float = 0
    /// Nur die Kamera, die Arme bleiben davon unberührt.
    var blickNeigung: Float = 0
    var haende: [Hand]
    private(set) var aufDemBoden = false
    private var verlauf: [V3] = []
    private var hieltSichFest = false
    // Handy-Steuerung
    private var phase: Float = 0
    private var sprungZeit: Float = 0
    private var hub: Float = 1
    var schlag: [Float] = [0, 0]

    init(position: V3, gier: Float) {
        self.position = position
        self.gier = gier
        haende = [
            Hand(gier: -Affenkoerper.ruheGier, neigung: Affenkoerper.ruheNeigung),
            Hand(gier: Affenkoerper.ruheGier, neigung: Affenkoerper.ruheNeigung),
        ]
        for i in 0..<2 { haende[i].position = handZiel(i) }
    }

    func setzeZurueck(auf p: V3, gier g: Float) {
        position = p
        gier = g
        geschwindigkeit = .zero
        verlauf.removeAll()
        for i in 0..<2 {
            haende[i].haftet = false
            haende[i].frei = true
            haende[i].gier = (i == 0 ? -1 : 1) * Affenkoerper.ruheGier
            haende[i].neigung = Affenkoerper.ruheNeigung
            haende[i].position = handZiel(i)
        }
    }

    /// Wohin die Hand will, wenn nichts im Weg ist.
    func handZiel(_ i: Int, koerper: V3? = nil) -> V3 {
        let h = haende[i]
        var schulter = Affenkoerper.schulter
        if i == 0 { schulter.x = -schulter.x }
        let richtung = V3(sin(h.gier) * cos(h.neigung), sin(h.neigung), -cos(h.gier) * cos(h.neigung))
        let lokal = schulter + richtung * Affenkoerper.armLaenge
        return (koerper ?? position) + drehY(lokal, gier)
    }

    /// Ein Physik-Schritt. Gibt Aufschläge für Klang und Vibration zurück.
    func schritt(dt: Float, welt: Welt, sprungFaktor: Float, maxTempo: Float, eingefroren: Bool) -> [Aufschlag] {
        var aufschlaege: [Aufschlag] = []
        var korrektur = V3.zero
        var anzahl: Float = 0

        for i in 0..<2 {
            haende[i].ruhe += dt
            // Lose Hände schweben langsam zurück in die Ruhehaltung.
            if !haende[i].aktiv && haende[i].frei {
                let zielGier = (i == 0 ? -1 : 1) * Affenkoerper.ruheGier
                let k = min(1, dt * 6)
                haende[i].gier += (zielGier - haende[i].gier) * k
                haende[i].neigung += (Affenkoerper.ruheNeigung - haende[i].neigung) * k
            }
            let ziel = handZiel(i)

            if !haende[i].aktiv || eingefroren {
                haende[i].haftet = false
                // Nur fürs Bild: nicht durch Wände greifen.
                if let t = welt.punktInnen(ziel) {
                    haende[i].position = ziel + t.normale * t.tiefe
                } else {
                    haende[i].position = ziel
                }
                continue
            }

            if haende[i].haftet {
                let h = haende[i]
                let druck = simd_dot(ziel - h.haftPunkt, h.haftNormale)
                if druck < 0.015 || welt.punktInnen(ziel) != nil {
                    // Hand drückt weiter gegen die Fläche → sie bleibt, der Körper wandert.
                    var punkt = h.haftPunkt
                    let rutsch = h.material.rutschig
                    if rutsch > 0 {
                        var tangential = ziel - punkt
                        tangential -= h.haftNormale * simd_dot(tangential, h.haftNormale)
                        punkt += tangential * rutsch
                    }
                    haende[i].haftPunkt = punkt
                    haende[i].position = punkt
                    korrektur += punkt - ziel
                    anzahl += 1
                    continue
                }
                haende[i].haftet = false
            }

            if let t = welt.punktInnen(ziel) {
                let punkt = ziel + t.normale * t.tiefe
                haende[i].haftet = true
                haende[i].haftPunkt = punkt
                haende[i].haftNormale = t.normale
                haende[i].material = t.material
                haende[i].position = punkt
                korrektur += punkt - ziel
                anzahl += 1
                let staerke = min(1, simd_length(ziel - haende[i].position) * 8 + simd_length(geschwindigkeit) * 0.15)
                if haende[i].ruhe > 0.12 {
                    aufschlaege.append(Aufschlag(hand: i, material: t.material, staerke: max(0.25, staerke), ort: punkt))
                    haende[i].ruhe = 0
                }
            } else {
                haende[i].position = ziel
            }
        }

        let haelt = anzahl > 0
        if haelt {
            let vorher = position
            var k = korrektur / anzahl
            if k.y > 0 { k.y *= hub }
            position += k
            var dummy = V3.zero
            welt.loese(position: &position, geschwindigkeit: &dummy, radius: Affenkoerper.radius)
            verlauf.append((position - vorher) / max(dt, 1e-3))
            if verlauf.count > 5 { verlauf.removeFirst() }
            geschwindigkeit = verlauf.reduce(.zero, +) / Float(verlauf.count)
            aufDemBoden = false
        } else {
            if hieltSichFest {
                // Losgelassen: Schwung mitnehmen.
                var v = geschwindigkeit * sprungFaktor
                let l = simd_length(v)
                if l > maxTempo { v *= maxTempo / l }
                geschwindigkeit = v
            }
            verlauf.removeAll()
            geschwindigkeit.y -= welt.schwerkraft * dt
            position += geschwindigkeit * dt
            let ergebnis = welt.loese(position: &position, geschwindigkeit: &geschwindigkeit, radius: Affenkoerper.radius)
            aufDemBoden = ergebnis.steht
            if ergebnis.steht {
                let reibung = 1 - (ergebnis.material?.rutschig ?? 0)
                let k = max(0, 1 - dt * 7 * reibung)
                geschwindigkeit.x *= k
                geschwindigkeit.z *= k
            }
        }
        hieltSichFest = haelt
        return aufschlaege
    }

    var haeltSichFest: Bool { hieltSichFest }

    // MARK: - Handy-Steuerung

    /// Arm in eine Richtung (im Körper-Raum: x rechts, y oben, −z vorne) zeigen lassen.
    private func zeige(_ i: Int, _ d: V3, aktiv: Bool) {
        let n = d.normiert
        haende[i].neigung = asin(klemm(n.y, -1, 1))
        haende[i].gier = atan2(n.x, -n.z)
        haende[i].aktiv = aktiv
        haende[i].frei = false
    }

    func springe() {
        if sprungZeit <= 0 { sprungZeit = 0.16 }
    }

    /// Bewegt die Arme wie ein VR-Spieler:
    /// Laufen = abwechselnd Hand vorne aufsetzen und nach hinten durchziehen,
    /// Wand vor dir = Hände oben anlegen und nach unten ziehen (klettern),
    /// Springen = beide Hände kräftig nach unten stoßen.
    func steuere(dt: Float, eingabe e: SteuerEingabe, welt: Welt, eingefroren: Bool) {
        hub = 1
        if eingefroren {
            for i in 0..<2 { haende[i].aktiv = false; haende[i].frei = true }
            return
        }
        let staerke = min(1, simd_length(SIMD2<Float>(e.lx, e.ly)))
        let m = staerke > 0.15 ? V3(e.lx, 0, -e.ly).normiert : V3(0, 0, -1)
        let runter = V3(0, -1, 0), hoch = V3(0, 1, 0)

        if sprungZeit > 0 {
            sprungZeit -= dt
            let t = klemm(1 - sprungZeit / 0.16, 0, 1)
            let th = grad(78 - 105 * t)
            for i in 0..<2 {
                var d = m * sin(th) + runter * cos(th)
                d.x += i == 0 ? -0.18 : 0.18
                zeige(i, d, aktiv: true)
            }
            return
        }
        for i in 0..<2 { schlag[i] = max(0, schlag[i] - dt) }

        let mWelt = drehY(m, gier)
        var wand = false
        if staerke > 0.15 {
            let vorn = position + mWelt * 0.78
            wand = welt.punktInnen(vorn + V3(0, 0.1, 0)) != nil || welt.punktInnen(vorn + V3(0, 0.7, 0)) != nil
            phase += dt * (1.15 + 1.35 * staerke) * (e.sprint ? 1.4 : 1)
        }
        for i in 0..<2 {
            let seite: Float = i == 0 ? -0.22 : 0.22
            if schlag[i] > 0 { zeige(i, V3(seite * 0.3, 0.05, -1), aktiv: false); continue }
            if e.greifen { haende[i].aktiv = true; haende[i].frei = false; continue }
            if e.hoch { zeige(i, V3(seite, 1.6, -0.6), aktiv: true); continue }
            if e.runter { zeige(i, V3(seite * 1.5, -1, -0.15), aktiv: true); continue }
            if staerke <= 0.15 { haende[i].aktiv = false; haende[i].frei = true; continue }

            let p = (phase + Float(i) * 0.5).truncatingRemainder(dividingBy: 1)
            let zug = p < 0.55
            let t = zug ? p / 0.55 : (p - 0.55) / 0.45
            var d: V3
            if wand {
                let a = zug ? grad(65 - 115 * t) : grad(-50 + 115 * t)
                d = m * (cos(a) + 0.15) + hoch * sin(a)
            } else {
                // Beim Laufen hebt der Zug dich nur wenig an – sonst wäre jeder Schritt ein Riesensprung.
                hub = e.sprint ? 0.45 : 0.3
                let th = zug ? grad(72 - 98 * t) : grad(-26 + 98 * t)
                let tief = cos(th) * (zug ? 1 : 1 - 0.55 * sin(.pi * t))
                d = m * sin(th) + runter * tief
            }
            d.x += seite
            zeige(i, d, aktiv: zug)
        }
    }
}

/// Was die Knöpfe und Joysticks gerade melden.
struct SteuerEingabe {
    var lx: Float = 0
    var ly: Float = 0
    var rx: Float = 0
    var ry: Float = 0
    var sprint = false
    var greifen = false
    var hoch = false
    var runter = false
}
