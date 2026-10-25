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
    /// Beim Klettern: wo die Hand an der Wand hält bzw. wohin sie gerade nachgreift.
    var griff: V3?
    var luft: V3?
}

struct Aufschlag {
    var hand: Int
    var material: Material
    var staerke: Float
    var ort: V3
}

final class Affenkoerper {
    /// Größe des Gorillas (am Computer einstellbar). Alle Maße wachsen mit.
    static var groesse: Float = 2.6
    static var radius: Float { 0.32 * groesse }
    static var armLaenge: Float { 0.92 * groesse }
    static var schulter: V3 { V3(0.13, -0.16, 0.05) * groesse }
    static let ruheGier: Float = grad(15)
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
    /// Laufen am Boden: feste Zielgeschwindigkeit statt Armschwung-Physik (kein Wegfliegen)
    private var laeuft = false
    private var laufZiel = V3.zero
    var schlag: [Float] = [0, 0]
    private(set) var klettert = false
    private var sprungStoss = false
    private var kletterPhase: Float = 0
    private var kletterTempo: V3?
    private var kletterSperre: Float = 0
    private var kletterRichtung = V3(0, 0, -1)
    private var wandWeg: Float = 0.5

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
        hieltSichFest = false
        phase = 0
        kletterPhase = 0
        kletterTempo = nil
        klettert = false
        sprungZeit = 0
        sprungStoss = false
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

        if klettert, let tempo = kletterTempo, !eingefroren {
            // Beim Klettern bewegt sich der Körper ruhig mit – kein Fallen, kein Wegstoßen.
            for i in 0..<2 {
                haende[i].ruhe += dt
                if let g = haende[i].griff {
                    if !haende[i].haftet {
                        let mat = welt.punktInnen(g + kletterRichtung * 0.02)?.material ?? .holz
                        aufschlaege.append(Aufschlag(hand: i, material: mat, staerke: 0.45, ort: g))
                    }
                    haende[i].haftet = true
                    haende[i].haftPunkt = g
                    haende[i].haftNormale = -kletterRichtung
                    haende[i].position = g
                } else {
                    haende[i].haftet = false
                    haende[i].position = haende[i].luft ?? handZiel(i)
                }
            }
            geschwindigkeit = tempo
            position += geschwindigkeit * dt
            let e = welt.loese(position: &position, geschwindigkeit: &geschwindigkeit, radius: Affenkoerper.radius)
            aufDemBoden = false
            hieltSichFest = false
            verlauf.removeAll()
            // Oben auf einer Plattform angekommen: stehen bleiben
            if e.steht && tempo.y > 0.1 {
                loslassen(mit: .zero)
                kletterSperre = 0.7
                aufDemBoden = true
            }
            return aufschlaege
        }

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
            if klettert {
                // Beim Klettern drückt das Zugreifen dich nicht von der Wand weg
                let weg = k.x * kletterRichtung.x + k.z * kletterRichtung.z
                if weg < 0 { k.x -= kletterRichtung.x * weg; k.z -= kletterRichtung.z * weg }
            }
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
                var v = geschwindigkeit * (klettert ? 0.4 : sprungFaktor)
                let l = simd_length(v)
                if l > maxTempo { v *= maxTempo / l }
                geschwindigkeit = v
            }
            if sprungStoss && sprungZeit <= 0 {
                // Sprung wie in Gorilla Tag: Schwung nach vorne mitnehmen und verstärken, dazu kräftig nach oben
                var hor = V3(geschwindigkeit.x, 0, geschwindigkeit.z)
                if laeuft && simd_length(laufZiel) > simd_length(hor) { hor = V3(laufZiel.x, 0, laufZiel.z) }
                hor *= 1.3
                if simd_length(hor) > 12 { hor *= 12 / simd_length(hor) }
                geschwindigkeit.x = hor.x
                geschwindigkeit.z = hor.z
                geschwindigkeit.y = max(geschwindigkeit.y * 1.2, 5.6 * sqrt(Affenkoerper.groesse))
                sprungStoss = false
            }
            if laeuft {
                let k = min(1, dt * (aufDemBoden ? 12 : 2))
                geschwindigkeit.x += (laufZiel.x - geschwindigkeit.x) * k
                geschwindigkeit.z += (laufZiel.z - geschwindigkeit.z) * k
            }
            verlauf.removeAll()
            geschwindigkeit.y -= welt.schwerkraft * dt
            position += geschwindigkeit * dt
            let ergebnis = welt.loese(position: &position, geschwindigkeit: &geschwindigkeit, radius: Affenkoerper.radius)
            aufDemBoden = ergebnis.steht
            if ergebnis.steht && !laeuft {
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

    /// Wie weit ist vor mir (Richtung m, Welt) etwas zum Festhalten? Sucht auf mehreren Höhen.
    private func wandAbstand(_ m: V3, welt: Welt, nurOben: Bool = false) -> Float? {
        var bester: Float?
        let g = Affenkoerper.groesse
        for hh: Float in nurOben ? [0.75 * g] : [0.75 * g, 0.35 * g, 0] {
            var d: Float = 0.3 * g
            while d <= 0.84 * g {
                if welt.punktInnen(position + m * d + V3(0, hh, 0), fest: true) != nil {
                    if bester == nil || d < bester! { bester = d }
                    break
                }
                d += 0.04 * g
            }
        }
        return bester
    }

    func springe() {
        // Von der Wand abstoßen
        if klettert {
            loslassen(mit: kletterRichtung * -3 + V3(0, 5.5, 0))
            return
        }
        if sprungZeit <= 0 {
            sprungZeit = 0.16
            if aufDemBoden || hieltSichFest { sprungStoss = true }
        }
    }

    /// Klettern: Stick nach vorne gegen einen Stamm oder eine Wand → du hängst fest und ziehst dich
    /// Hand über Hand hoch. Stick loslassen = du bleibst hängen. Stick nach hinten oder Springen = loslassen.
    /// Oben angekommen ziehst du dich über die Kante.
    private func kletterSteuern(dt: Float, eingabe e: SteuerEingabe, staerke: Float, mWelt: V3, welt: Welt) -> Bool {
        let g = Affenkoerper.groesse
        let vorwaerts = staerke > 0.15 && e.ly > -0.2
        if !klettert {
            // Oben angekommen: kurz stehen bleiben (Stick loslassen = sofort wieder frei)
            kletterSperre = staerke <= 0.15 ? 0 : max(0, kletterSperre - dt)
            if !vorwaerts || sprungZeit > 0 || kletterSperre > 0 { return false }
            // Nur an echten Wänden (auch in Kopfhöhe) – nicht an Stufen oder Brettkanten
            if wandAbstand(mWelt, welt: welt, nurOben: true) == nil { return false }
            guard let w = wandAbstand(mWelt, welt: welt), !(aufDemBoden && e.ly < 0.3) else { return false }
            klettert = true
            kletterRichtung = mWelt
            wandWeg = w
            kletterPhase = 0
            for i in 0..<2 { haende[i].griff = nil }
        }
        // Lenken: zeigt der Stick auf eine andere Wand in der Nähe, folgt die Richtung langsam
        if vorwaerts && wandAbstand(mWelt, welt: welt) != nil {
            kletterRichtung = (kletterRichtung + (mWelt - kletterRichtung) * min(1, dt * 3)).normiert
        }
        let n = kletterRichtung
        if e.ly < -0.2 && staerke > 0.15 { loslassen(mit: n * -2); return false }
        guard let w = wandAbstand(n, welt: welt) else {
            // Oben angekommen: über die Kante ziehen
            loslassen(mit: vorwaerts ? n * 3.4 + V3(0, 3.6, 0) : .zero)
            return false
        }
        wandWeg = w
        let steigen: Float = vorwaerts ? 4.2 * min(1, staerke * 1.2) * sqrt(g / 2.6) : 0
        kletterTempo = V3(0, steigen, 0) + n * ((w - 0.5 * g) * 5)
        // Arme: eine Hand hält und zieht nach unten, die andere greift oben neu – passend zum Tempo
        if steigen > 0 { kletterPhase += dt * steigen * 0.62 / (1.25 * g) }
        for i in 0..<2 {
            let seite = drehY(V3(i == 0 ? -0.3 * g : 0.3 * g, 0, 0), gier)
            let p = (kletterPhase + Float(i) * 0.5).truncatingRemainder(dividingBy: 1)
            let zug = steigen == 0 || p < 0.62
            let t = (p - 0.62) / 0.38
            haende[i].aktiv = true
            haende[i].frei = false
            if zug {
                if let griff = haende[i].griff, simd_length(griff - (position + seite)) > Affenkoerper.armLaenge * 1.15 { haende[i].griff = nil }
                if haende[i].griff == nil {
                    haende[i].griff = griffSuchen(von: position + seite + V3(0, (steigen > 0 ? 0.7 : 0.35) * g, 0), richtung: n, welt: welt)
                }
                haende[i].luft = nil
            } else {
                haende[i].griff = nil
                let hoehe = -0.4 + 1.15 * sin(t * .pi / 2)
                haende[i].luft = position + seite + n * (w - 0.2 * g) + V3(0, hoehe * g, 0)
            }
        }
        return true
    }

    /// Von einem Punkt aus in Richtung Wand tasten, bis die Hand etwas berührt.
    private func griffSuchen(von start: V3, richtung n: V3, welt: Welt) -> V3? {
        var d: Float = 0
        while d <= Affenkoerper.armLaenge {
            let q = start + n * d
            if let t = welt.punktInnen(q, fest: true) { return q + t.normale * t.tiefe }
            d += 0.03 * Affenkoerper.groesse
        }
        return nil
    }

    private func loslassen(mit tempo: V3) {
        klettert = false
        kletterTempo = nil
        geschwindigkeit = tempo
        for i in 0..<2 {
            haende[i].griff = nil
            haende[i].luft = nil
            haende[i].aktiv = false
            haende[i].frei = true
            haende[i].haftet = false
        }
    }

    /// Bewegt die Arme wie ein VR-Spieler:
    /// Laufen = abwechselnd Hand vorne aufsetzen und nach hinten durchziehen,
    /// Wand vor dir = Hände oben anlegen und nach unten ziehen (klettern),
    /// Springen = beide Hände kräftig nach unten stoßen.
    func steuere(dt: Float, eingabe e: SteuerEingabe, welt: Welt, eingefroren: Bool) {
        hub = 1
        laeuft = false
        if eingefroren {
            for i in 0..<2 { haende[i].aktiv = false; haende[i].frei = true }
            return
        }
        let staerke = min(1, simd_length(SIMD2<Float>(e.lx, e.ly)))
        let m = staerke > 0.15 ? V3(e.lx, 0, -e.ly).normiert : V3(0, 0, -1)
        let runter = V3(0, -1, 0)

        if sprungZeit > 0 {
            sprungZeit -= dt
            // Beim Absprung den Lauf-Schwung behalten
            if staerke > 0.15 {
                laeuft = true
                laufZiel = drehY(m, gier) * ((e.sprint ? 10 : 7) * staerke)
            }
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
        if kletterSteuern(dt: dt, eingabe: e, staerke: staerke, mWelt: mWelt, welt: welt) { return }
        if staerke > 0.15 {
            // Schnelle Armzüge: zügig laufen, Sprinten noch schneller
            phase += dt * (1.4 + 0.8 * staerke) * (e.sprint ? 1.3 : 1)
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
            do {
                // Laufen: kontrolliert am Boden, die Arme schwingen nur sichtbar mit
                laeuft = true
                laufZiel = mWelt * ((e.sprint ? 10 : 7) * staerke)
                let th = zug ? grad(38 - 70 * t) : grad(-32 + 70 * t)
                let tief = cos(th) * (zug ? 1 : 1 - 0.5 * sin(.pi * t))
                d = m * sin(th) + runter * tief
            }
            d.x += seite
            zeige(i, d, aktiv: false)
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
