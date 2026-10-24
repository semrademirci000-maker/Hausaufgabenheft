//
//  AffenKlang.swift
//  Alle Geräusche – Sample für Sample berechnet (AVAudioEngine), keine Sounddateien.
//  Jede Oberfläche klingt anders, wenn du mit der Hand draufschlägst:
//  Holz klopft, Stein klackt, Blätter rascheln, Eis klingelt.
//

import AVFoundation
import Foundation

final class AffenKlang {

    // MARK: Bedienung (Haupt-Thread)

    func start() {
        aktiviereSitzung()
        if quelle == nil { baueGraph() }
        if !engine.isRunning { try? engine.start() }
    }

    /// 0…10 wie am Computer
    func lautstaerke(_ stufe: Int) { masterZiel = Float(klemm(stufe, 0, 10)) / 10 }

    /// Leises Rauschen im Hintergrund (Wind, Höhle).
    func wind(_ stufe: Float) { windZiel = stufe }

    func aufschlag(_ m: Material, staerke: Float) {
        let l = 0.25 + 0.75 * min(1, staerke)
        switch m {
        case .holz:
            spiele(.ton(frequenz: Double.random(in: 210...260), form: .sinus, lautst: 0.5 * l, dauer: 0.12, gleiten: 0.5))
            spiele(.rauschen(lautst: 0.25 * l, dauer: 0.05, tiefpass: 1800, hochpass: 300))
        case .gras, .sand:
            spiele(.rauschen(lautst: 0.45 * l, dauer: 0.09, tiefpass: m == .sand ? 1400 : 900, hochpass: 120))
            spiele(.ton(frequenz: 110, form: .sinus, lautst: 0.25 * l, dauer: 0.08, gleiten: 0.6))
        case .stein:
            spiele(.ton(frequenz: Double.random(in: 650...800), form: .sinus, lautst: 0.25 * l, dauer: 0.06))
            spiele(.rauschen(lautst: 0.35 * l, dauer: 0.04, tiefpass: 5000, hochpass: 1200))
        case .blaetter:
            spiele(.rauschen(lautst: 0.3 * l, dauer: 0.22, tiefpass: 6000, hochpass: 2200, anstieg: 0.02))
        case .eis:
            spiele(.ton(frequenz: Double.random(in: 1700...2100), form: .sinus, lautst: 0.18 * l, dauer: 0.35))
            spiele(.rauschen(lautst: 0.15 * l, dauer: 0.04, tiefpass: 8000, hochpass: 3000))
        case .schnee:
            spiele(.rauschen(lautst: 0.4 * l, dauer: 0.12, tiefpass: 3000, hochpass: 600))
        case .metall:
            spiele(.ton(frequenz: 1180, form: .rechteck, lautst: 0.06 * l, dauer: 0.2))
            spiele(.ton(frequenz: 1770, form: .sinus, lautst: 0.15 * l, dauer: 0.3))
        case .kristall:
            spiele(.ton(frequenz: 2093, form: .sinus, lautst: 0.15 * l, dauer: 0.6))
            spiele(.ton(frequenz: 3136, form: .sinus, lautst: 0.08 * l, dauer: 0.5))
        case .wolke:
            spiele(.rauschen(lautst: 0.25 * l, dauer: 0.25, tiefpass: 700, hochpass: 80, anstieg: 0.04))
        }
    }

    /// Du hast jemanden gefangen.
    func fangen() {
        spiele(.ton(frequenz: 520, form: .rechteck, lautst: 0.1, dauer: 0.12))
        spiele(.ton(frequenz: 780, form: .rechteck, lautst: 0.1, dauer: 0.18, verzoegerung: 0.09))
    }

    /// Dich hat es erwischt – Lava!
    func gefangen() {
        spiele(.ton(frequenz: 180, form: .saege, lautst: 0.2, dauer: 0.7, gleiten: 0.4))
        spiele(.rauschen(lautst: 0.25, dauer: 0.8, tiefpass: 2500, hochpass: 400, anstieg: 0.05))
    }

    /// Jemand anderes wurde in der Nähe gefangen.
    func fernFangen() { spiele(.ton(frequenz: 330, form: .sinus, lautst: 0.12, dauer: 0.2, gleiten: 0.7)) }

    func rundeStart() {
        for (i, f) in [523.0, 659.0, 784.0].enumerated() {
            spiele(.ton(frequenz: f, form: .rechteck, lautst: 0.07, dauer: 0.18, verzoegerung: Double(i) * 0.14))
        }
    }

    func rundeEnde() {
        for (i, f) in [784.0, 659.0, 784.0, 1047.0].enumerated() {
            spiele(.ton(frequenz: f, form: .rechteck, lautst: 0.07, dauer: 0.25, verzoegerung: Double(i) * 0.16))
        }
    }

    func platzen() {
        spiele(.rauschen(lautst: 0.6, dauer: 0.06, tiefpass: 9000, hochpass: 500))
        spiele(.ton(frequenz: 90, form: .sinus, lautst: 0.3, dauer: 0.1))
    }

    func schuss() { spiele(.rauschen(lautst: 0.2, dauer: 0.15, tiefpass: 3000, hochpass: 900, anstieg: 0.01)) }

    func tor() {
        spiele(.ton(frequenz: 300, form: .sinus, lautst: 0.2, dauer: 0.8, gleiten: 3))
        spiele(.rauschen(lautst: 0.15, dauer: 0.6, tiefpass: 4000, hochpass: 600, anstieg: 0.2))
    }

    func klick() { spiele(.ton(frequenz: 1500, form: .rechteck, lautst: 0.04, dauer: 0.03)) }

    func beitreten() {
        spiele(.ton(frequenz: 660, form: .sinus, lautst: 0.15, dauer: 0.2))
        spiele(.ton(frequenz: 990, form: .sinus, lautst: 0.15, dauer: 0.3, verzoegerung: 0.12))
    }

    func vogel() {
        let grund = Double.random(in: 2400...3400)
        for i in 0..<Int.random(in: 2...4) {
            spiele(.ton(frequenz: grund * Double.random(in: 0.9...1.1), form: .sinus, lautst: 0.035,
                        dauer: 0.07, verzoegerung: Double(i) * 0.11, gleiten: 1.8))
        }
    }

    // MARK: Audio-Graph

    private let rate: Double = 44_100
    private let engine = AVAudioEngine()
    private var quelle: AVAudioSourceNode?

    private func baueGraph() {
        guard let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 2) else { return }
        let node = AVAudioSourceNode(format: format) { [weak self] _, _, frameCount, audioBufferList -> OSStatus in
            guard let self else { return noErr }
            let buffers = UnsafeMutableAudioBufferListPointer(audioBufferList)
            self.berechne(frames: Int(frameCount), buffers: buffers)
            return noErr
        }
        quelle = node
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: format)
        engine.prepare()
    }

    private func aktiviereSitzung() {
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        try? s.setActive(true)
    }

    // MARK: Zielwerte (Haupt-Thread schreibt, Audio-Thread liest)

    private var masterZiel: Float = 0.7
    private var windZiel: Float = 0

    private let schloss = NSLock()
    private var wartend: [Stimme] = []

    private func spiele(_ s: Stimme) {
        schloss.lock()
        if wartend.count < 32 { wartend.append(s) }
        schloss.unlock()
    }

    // MARK: Zustand im Audio-Thread

    private var master: Float = 0
    private var windPegel: Float = 0
    private var windLP: Float = 0
    private var zeit: Double = 0
    private var stimmen = [Stimme](repeating: Stimme(), count: 40)
    private var zufall: UInt64 = 0x2545F4914F6CDD1D

    private func berechne(frames: Int, buffers: UnsafeMutableAudioBufferListPointer) {
        if schloss.try() {
            for neu in wartend { lege(neu) }
            wartend.removeAll(keepingCapacity: true)
            schloss.unlock()
        }
        let mZiel = masterZiel, wZiel = windZiel
        let dt = 1 / rate
        for frame in 0..<frames {
            zeit += dt
            master += (mZiel - master) * 0.0005
            windPegel += (wZiel - windPegel) * 0.00002
            let rauschen = weissesRauschen()
            var summe: Float = 0
            if windPegel > 0.0005 {
                let grenze = 260 + 160 * sin(2 * .pi * 0.08 * zeit)
                windLP += koeff(grenze) * (rauschen - windLP)
                summe += windLP * windPegel * 0.5
            }
            for i in stimmen.indices where stimmen[i].aktiv {
                summe += stimmen[i].schritt(rauschen: rauschen, dt: dt)
            }
            let aus = tanhf(summe) * master
            for buffer in buffers {
                let kanal = UnsafeMutableBufferPointer<Float>(buffer)
                if frame < kanal.count { kanal[frame] = aus }
            }
        }
    }

    private func lege(_ s: Stimme) {
        var neu = s
        neu.vorbereiten(rate: rate)
        for i in stimmen.indices where !stimmen[i].aktiv {
            stimmen[i] = neu
            return
        }
        stimmen[0] = neu
    }

    private func koeff(_ hz: Double) -> Float { Float(1 - exp(-2 * .pi * hz / rate)) }

    private func weissesRauschen() -> Float {
        zufall ^= zufall << 13
        zufall ^= zufall >> 7
        zufall ^= zufall << 17
        return Float(Double(zufall % 2_000_001) / 1_000_000 - 1)
    }
}

// MARK: - Einzelne Stimme

private struct Stimme {
    enum Art { case ton, rauschen }
    enum Form { case sinus, saege, rechteck }

    var aktiv = false
    var art: Art = .ton
    var form: Form = .sinus
    var frequenz = 440.0
    var lautst: Float = 0
    var dauer = 1.0
    var anstieg = 0.003
    var verzoegerung = 0.0
    var tiefpassHz = 0.0
    var hochpassHz = 0.0
    /// Tonhöhe am Ende relativ zum Anfang (1 = gleich, 2 = Oktave hoch)
    var gleiten = 1.0

    private var phase = 0.0
    private var warten = 0
    private var huelle: Float = 0
    private var anstiegSchritt: Float = 1
    private var abfall: Float = 0.999
    private var steigt = true
    private var gleitFaktor = 1.0
    private var lp: Float = 0, lpK: Float = 0
    private var hp: Float = 0, hpK: Float = 0

    static func ton(frequenz: Double, form: Form, lautst: Float, dauer: Double,
                    verzoegerung: Double = 0, gleiten: Double = 1) -> Stimme {
        var s = Stimme()
        s.art = .ton
        s.form = form
        s.frequenz = frequenz
        s.lautst = lautst
        s.dauer = dauer
        s.verzoegerung = verzoegerung
        s.gleiten = gleiten
        return s
    }

    static func rauschen(lautst: Float, dauer: Double, tiefpass: Double, hochpass: Double, anstieg: Double = 0.003) -> Stimme {
        var s = Stimme()
        s.art = .rauschen
        s.lautst = lautst
        s.dauer = dauer
        s.tiefpassHz = tiefpass
        s.hochpassHz = hochpass
        s.anstieg = anstieg
        return s
    }

    mutating func vorbereiten(rate: Double) {
        aktiv = true
        warten = Int(verzoegerung * rate)
        anstiegSchritt = Float(1 / max(1, anstieg * rate))
        abfall = Float(pow(0.001, 1 / max(1, dauer * rate)))
        gleitFaktor = pow(gleiten, 1 / max(1, (dauer + anstieg) * rate))
        lpK = tiefpassHz > 0 ? Float(1 - exp(-2 * .pi * tiefpassHz / rate)) : 0
        hpK = hochpassHz > 0 ? Float(1 - exp(-2 * .pi * hochpassHz / rate)) : 0
    }

    mutating func schritt(rauschen: Float, dt: Double) -> Float {
        if warten > 0 { warten -= 1; return 0 }
        var x: Float
        switch art {
        case .rauschen:
            x = rauschen
        case .ton:
            frequenz *= gleitFaktor
            phase += frequenz * dt
            if phase >= 1 { phase -= 1 }
            switch form {
            case .sinus: x = Float(sin(2 * .pi * phase))
            case .saege: x = Float(phase * 2 - 1)
            case .rechteck: x = phase < 0.5 ? 1 : -1
            }
        }
        if lpK > 0 { lp += lpK * (x - lp); x = lp }
        if hpK > 0 { hp += hpK * (x - hp); x -= hp }
        if steigt {
            huelle += anstiegSchritt
            if huelle >= 1 { huelle = 1; steigt = false }
        } else {
            huelle *= abfall
            if huelle < 0.0008 { aktiv = false }
        }
        return x * huelle * lautst
    }
}
