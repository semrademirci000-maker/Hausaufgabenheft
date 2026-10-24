//
//  BotHirn.swift
//  Die Computer-Affen. Sie hüpfen wie echte Spieler mit kräftigen
//  Armschwüngen, klettern Wände hoch, jagen dich als Lava-Affe oder
//  flüchten, wenn die Lava kommt.
//

import Foundation
import simd

/// Was der Bot gerade von der Runde weiß (berechnet im Spiel).
struct BotLage {
    var jagen: V3?
    var fliehen: V3?
    var lava: Bool
    var raus: Bool
    /// Farbschlacht: Abstand halten und zielen
    var zielenAuf: V3?
}

final class BotHirn {
    let staerke: Int
    private var schwungTakt: Float
    private var wanderZiel: V3
    private var wanderZeit: Float = 0
    private var ausweichen: Float = 0
    private var ausweichRichtung = V3(1, 0, 0)
    private var pruefOrt: V3
    private var pruefZeit: Float = 0
    private var armPhase: Float = 1
    private var steht = false
    private var wand: V3?
    private var seite: Float = 1
    var schussTakt: Float
    private var w: Wuerfel

    static let namen = ["BANANE", "KOKOS", "MANGO", "KIWI", "PEANUT", "BOBO", "GORILLO", "ZIPPY",
                        "KLETTERMAX", "MONKI", "SNOOKER", "LAVAKING", "FLINK", "AFFI", "TARZAN", "PIXEL"]

    init(start: V3, staerke: Int, saat: UInt64) {
        self.staerke = staerke
        w = Wuerfel(saat)
        schwungTakt = w.zahl(0, 0.5)
        wanderZiel = start
        pruefOrt = start
        schussTakt = w.zahl(1, 3)
    }

    func schritt(_ a: inout Affe, dt: Float, welt: Welt, lage: BotLage, eingefroren: Bool) {
        // 1. Wohin?
        var richtung = V3.zero
        if eingefroren {
            richtung = .zero
        } else if ausweichen > 0 {
            ausweichen -= dt
            richtung = ausweichRichtung
        } else if let ziel = lage.jagen {
            richtung = (ziel - a.position).flach.normiert
        } else if let gefahr = lage.fliehen {
            var weg = (a.position - gefahr).flach.normiert
            // Nicht in die Kartenwand rennen: zur Mitte hin abbiegen
            let rand = (a.position - welt.grenzMitte).flach
            if simd_length(rand) > welt.grenzRadius * 0.75 {
                weg = (weg - rand.normiert * 1.2).normiert
            }
            richtung = weg
        } else if let ziel = lage.zielenAuf {
            let d = (ziel - a.position).flach
            let l = simd_length(d)
            if w.zahl(0, 1) < dt * 0.4 { seite = -seite }
            if l > 14 {
                richtung = d.normiert
            } else if l < 7 {
                richtung = -d.normiert
            } else {
                richtung = drehY(d.normiert, .pi / 2) * seite
            }
        } else {
            wanderZeit -= dt
            if wanderZeit <= 0 || simd_length((wanderZiel - a.position).flach) < 2 {
                let r = welt.grenzRadius * 0.8
                wanderZiel = welt.grenzMitte + V3(w.zahl(-r, r), 0, w.zahl(-r, r))
                wanderZeit = w.zahl(3, 7)
            }
            richtung = (wanderZiel - a.position).flach.normiert
            if lage.raus || w.zahl(0, 1) < 0.002 { richtung *= 0.5 }
        }

        // Steckt fest? Dann kurz in eine andere Richtung.
        pruefZeit += dt
        if pruefZeit > 2 {
            if simd_length(richtung) > 0.1 && simd_length((a.position - pruefOrt).flach) < 0.8 {
                ausweichen = w.zahl(0.8, 1.6)
                ausweichRichtung = drehY(richtung, w.zahl(1.2, 2.4) * (w.zahl(0, 1) > 0.5 ? 1 : -1))
            }
            pruefOrt = a.position
            pruefZeit = 0
        }

        // 2. Bewegen: Armschwung, wenn Boden oder Wand unter den Händen ist.
        let grundTempo: [Float] = [3.4, 4.5, 5.6]
        var tempo = grundTempo[klemm(staerke, 1, 3) - 1]
        if lage.lava { tempo *= 1.15 }
        if lage.raus { tempo *= 0.7 }
        schwungTakt -= dt
        armPhase += dt * 3
        if (steht || wand != nil) && schwungTakt <= 0 && simd_length(richtung) > 0.1 {
            var v = richtung * tempo
            v.y = w.zahl(2.0, 3.6)
            if let wand, simd_dot(richtung, wand) < -0.2 {
                // Gegen die Wand: hochklettern (schwache Bots schaffen nur kleine Sprünge)
                v.y = staerke >= 2 ? w.zahl(5.5, 6.8) : 4.2
                v.x *= 0.3
                v.z *= 0.3
            }
            a.geschwindigkeit = v
            schwungTakt = w.zahl(0.3, 0.48) * (lage.lava ? 0.85 : 1)
            armPhase = 0
        } else if !steht {
            a.geschwindigkeit += richtung * 2.2 * dt
        }

        a.geschwindigkeit.y -= welt.schwerkraft * dt
        a.position += a.geschwindigkeit * dt
        let ergebnis = welt.loese(position: &a.position, geschwindigkeit: &a.geschwindigkeit, radius: Affenkoerper.radius)
        steht = ergebnis.steht
        wand = ergebnis.wand
        if steht {
            let k = max(0, 1 - dt * 6)
            a.geschwindigkeit.x *= k
            a.geschwindigkeit.z *= k
        }
        if a.position.y < welt.boden {
            a.position = welt.startpunkte.randomElement() ?? V3(0, 2, 0)
            a.geschwindigkeit = .zero
        }

        // 3. Blickrichtung
        let blick = lage.jagen.map { ($0 - a.position).flach } ?? (simd_length(richtung) > 0.1 ? richtung : vorne(a.gier))
        if simd_length(blick) > 0.01 {
            let ziel = gierZu(blick)
            a.gier += winkelDiff(ziel, a.gier) * min(1, dt * 6)
        }

        // 4. Arme fürs Bild: Schwung nach hinten, dann wieder nach vorne greifen
        let s = min(1, armPhase)
        for i in 0..<2 {
            let seite: Float = i == 0 ? -1 : 1
            var lokal = V3(0.36 * seite, -0.35 - 0.25 * (1 - s), -0.55 + 0.75 * (1 - s))
            if let ziel = lage.jagen, simd_length(ziel - a.position) < 2.2 {
                // Lava-Affe greift nach dir
                lokal = V3(0.25 * seite, 0.05, -0.85)
            }
            var p = a.position + drehY(lokal, a.gier)
            if let t = welt.punktInnen(p) { p += t.normale * t.tiefe }
            a.haende[i] = p
        }
    }
}
