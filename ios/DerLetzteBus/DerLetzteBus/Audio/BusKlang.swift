//
//  BusKlang.swift
//  Alle Geräusche von „Der letzte Bus“, Sample für Sample berechnet
//  (AVAudioEngine) – keine Sounddateien.
//
//  Dauerhaft: Motorbrummen, Regen auf dem Dach, ein leises, schiefes
//  „Unbehagen“, das mit jeder Haltestelle lauter wird.
//  Einzeln: Haltestellen-Gong, Türzischen, Schreck, Tipp- und Klickgeräusche.
//

import AVFoundation
import Foundation

final class BusKlang {

    // MARK: Bedienung (Haupt-Thread)

    private(set) var stumm: Bool

    init() {
        stumm = UserDefaults.standard.bool(forKey: "derletztebus.stumm")
        masterZiel = stumm ? 0 : 0.9
    }

    func start() {
        aktiviereSitzung()
        if quelle == nil { baueGraph() }
        if !engine.isRunning { try? engine.start() }
    }

    @discardableResult
    func umschalten() -> Bool {
        stumm.toggle()
        UserDefaults.standard.set(stumm, forKey: "derletztebus.stumm")
        masterZiel = stumm ? 0 : 0.9
        return stumm
    }

    /// 0 = Motor aus, 0.3 = Leerlauf, 1 = Vollgas
    func motor(_ stufe: Double, sekunden: Double = 1.5) {
        motorZiel = Float(stufe)
        motorTempo = glaettung(sekunden)
    }

    func regen(_ stufe: Double) { regenZiel = Float(stufe) }
    func unbehagen(_ stufe: Double) { droneZiel = Float(stufe) }

    func gong() {
        spiele(Stimme.ton(frequenz: 1318, form: .sinus, lautst: 0.22, dauer: 1.4))
        spiele(Stimme.ton(frequenz: 988, form: .sinus, lautst: 0.22, dauer: 1.8, verzoegerung: 0.35))
    }

    func tueren() {
        spiele(Stimme.rauschen(lautst: 0.16, dauer: 1.1, tiefpass: 3600, hochpass: 1500, anstieg: 0.05))
        spiele(Stimme.ton(frequenz: 70, form: .sinus, lautst: 0.35, dauer: 0.3, verzoegerung: 0.9))
    }

    func schreck() {
        spiele(Stimme.ton(frequenz: 41, form: .sinus, lautst: 0.6, dauer: 2.2))
        spiele(Stimme.ton(frequenz: 622, form: .saege, lautst: 0.05, dauer: 1.2))
        spiele(Stimme.ton(frequenz: 659, form: .saege, lautst: 0.05, dauer: 1.2))
        spiele(Stimme.ton(frequenz: 698, form: .saege, lautst: 0.04, dauer: 1.4))
    }

    func klick() { spiele(Stimme.ton(frequenz: 1800, form: .rechteck, lautst: 0.03, dauer: 0.04)) }

    func tippen() {
        spiele(Stimme.ton(frequenz: Double.random(in: 2600...3000), form: .rechteck, lautst: 0.008, dauer: 0.015))
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
        #if os(iOS)
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? s.setActive(true)
        #endif
    }

    // MARK: Zielwerte (vom Haupt-Thread gesetzt, im Audio-Thread gelesen)

    private var masterZiel: Float
    private var motorZiel: Float = 0
    private var motorTempo: Float = 0.00003
    private var regenZiel: Float = 0
    private var droneZiel: Float = 0

    // Neue Einzelklänge warten hier, bis der Audio-Thread sie abholt.
    private let schloss = NSLock()
    private var wartend: [Stimme] = []

    private func spiele(_ s: Stimme) {
        schloss.lock()
        if wartend.count < 32 { wartend.append(s) }
        schloss.unlock()
    }

    // MARK: Zustand im Audio-Thread

    private var master: Float = 0
    private var motorPegel: Float = 0
    private var regenPegel: Float = 0
    private var dronePegel: Float = 0

    private var zeit: Double = 0
    private var motorPhase1 = 0.0, motorPhase2 = 0.0, motorPhase3 = 0.0
    private var motorFilter: Float = 0
    private var regenHP: Float = 0, regenLP: Float = 0
    private var dronePhasen = [Double](repeating: 0, count: 4)
    private var droneLP: Float = 0
    private var stimmen = [Stimme](repeating: Stimme(), count: 40)
    private var zufall: UInt64 = 0x2545F4914F6CDD1D

    private static let droneFrequenzen: [Double] = [55, 58.3, 82.4, 116.5]
    private static let droneWabern: [Double] = [0.07, 0.12, 0.17, 0.22]

    private func berechne(frames: Int, buffers: UnsafeMutableAudioBufferListPointer) {
        // Neue Klänge übernehmen – nie warten, falls der Haupt-Thread gerade schreibt.
        if schloss.try() {
            for neu in wartend { lege(neu) }
            wartend.removeAll(keepingCapacity: true)
            schloss.unlock()
        }

        let mZiel = masterZiel, motZiel = motorZiel, motTempo = motorTempo
        let rZiel = regenZiel, dZiel = droneZiel
        let dt = 1 / rate

        let regenHPc = koeff(900), regenLPc = koeff(5200), droneLPc = koeff(700)

        for frame in 0..<frames {
            zeit += dt
            master += (mZiel - master) * 0.0002
            motorPegel += (motZiel - motorPegel) * motTempo
            regenPegel += (rZiel - regenPegel) * 0.00002
            dronePegel += (dZiel - dronePegel) * 0.00001

            let rauschen = weissesRauschen()
            var summe: Float = 0

            // Motor
            if motorPegel > 0.0005 {
                motorPhase1 = (motorPhase1 + 38 * dt).truncatingRemainder(dividingBy: 1)
                motorPhase2 = (motorPhase2 + 38.7 * dt).truncatingRemainder(dividingBy: 1)
                motorPhase3 = (motorPhase3 + 76.2 * dt).truncatingRemainder(dividingBy: 1)
                let saege = Float(motorPhase1 * 2 - 1) * 0.5 + Float(motorPhase2 * 2 - 1) * 0.5
                let rechteck: Float = motorPhase3 < 0.5 ? 0.1 : -0.1
                let grenze = 110 + Double(motorPegel) * 90 + 22 * sin(2 * .pi * 0.35 * zeit)
                motorFilter += koeff(grenze) * (saege + rechteck - motorFilter)
                summe += motorFilter * motorPegel * 0.32 * 2.2
            }

            // Regen
            if regenPegel > 0.0005 {
                regenHP += regenHPc * (rauschen - regenHP)
                let hoch = rauschen - regenHP
                regenLP += regenLPc * (hoch - regenLP)
                summe += regenLP * regenPegel * 0.1 * 1.6
            }

            // Unbehagen
            if dronePegel > 0.0005 {
                var d: Float = 0
                for i in 0..<4 {
                    dronePhasen[i] = (dronePhasen[i] + BusKlang.droneFrequenzen[i] * dt).truncatingRemainder(dividingBy: 1)
                    let wabern = 1 + 0.2 * sin(2 * .pi * BusKlang.droneWabern[i] * zeit)
                    let lautst = (i == 3 ? 0.15 : 0.35) * wabern
                    let welle = i == 2
                        ? 4 * abs(dronePhasen[i] - 0.5) - 1
                        : sin(2 * .pi * dronePhasen[i])
                    d += Float(welle * lautst)
                }
                droneLP += droneLPc * (d - droneLP)
                summe += droneLP * dronePegel * 0.16 * 1.5
            }

            // Einzelklänge
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

    // MARK: Rechenhilfen

    private func koeff(_ hz: Double) -> Float { Float(1 - exp(-2 * .pi * hz / rate)) }

    /// Glättungsfaktor pro Sample, damit ein Übergang etwa `sekunden` dauert.
    private func glaettung(_ sekunden: Double) -> Float {
        Float(1 - exp(-4 / max(1, sekunden * rate)))
    }

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
    var anstieg = 0.01
    var verzoegerung = 0.0
    var tiefpassHz = 0.0
    var hochpassHz = 0.0

    // Laufzeit
    private var phase = 0.0
    private var warten = 0
    private var huelle: Float = 0
    private var anstiegSchritt: Float = 1
    private var abfall: Float = 0.999
    private var steigt = true
    private var lp: Float = 0, lpK: Float = 0
    private var hp: Float = 0, hpK: Float = 0

    static func ton(frequenz: Double, form: Form, lautst: Float, dauer: Double, verzoegerung: Double = 0) -> Stimme {
        var s = Stimme()
        s.art = .ton
        s.form = form
        s.frequenz = frequenz
        s.lautst = lautst
        s.dauer = dauer
        s.verzoegerung = verzoegerung
        return s
    }

    static func rauschen(lautst: Float, dauer: Double, tiefpass: Double, hochpass: Double, anstieg: Double) -> Stimme {
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
