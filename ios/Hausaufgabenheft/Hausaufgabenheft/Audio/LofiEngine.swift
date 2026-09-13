//
//  LofiEngine.swift
//  Ruhige Lo-Fi-Musik, die die App selbst erzeugt (AVAudioEngine).
//  Keine Musikdateien – alles wird Ton für Ton berechnet.
//

import AVFoundation
import SwiftUI

final class LofiEngine: ObservableObject {

    // MARK: Bedienung

    @Published private(set) var isPlaying = false

    @Published var volume: Double {
        didSet {
            UserDefaults.standard.set(volume, forKey: "music.volume")
            if isPlaying { targetGain = Float(volume) * 0.9 }
        }
    }

    init() {
        let stored = UserDefaults.standard.object(forKey: "music.volume") as? Double
        volume = stored ?? 0.45
        registerForInterruptions()
    }

    func toggle() { isPlaying ? stop() : start() }

    func start() {
        activateSession()
        if source == nil { buildGraph() }
        samplesPerStep = Int(60.0 / bpm / 2.0 * sampleRate)
        if !engine.isRunning {
            do { try engine.start() } catch { return }
        }
        targetGain = Float(volume) * 0.9
        isPlaying = true
    }

    func stop() {
        targetGain = 0
        isPlaying = false
        // Erst ausblenden lassen, dann die Engine anhalten.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self, !self.isPlaying else { return }
            self.engine.pause()
        }
    }

    // MARK: Musikalische Vorgaben

    private let bpm: Double = 72
    private let swing: Double = 0.17
    private let sampleRate: Double = 44_100

    private struct Chord {
        let pad: [Int]
        let bass: Int
    }

    /// Vier ruhige Takte, die sich wiederholen.
    private static let chords: [Chord] = [
        Chord(pad: [50, 57, 60, 65, 69], bass: 38),   // Dm9
        Chord(pad: [43, 53, 59, 64, 69], bass: 31),   // G13
        Chord(pad: [48, 55, 59, 64, 67], bass: 36),   // Cmaj9
        Chord(pad: [45, 52, 55, 62, 67], bass: 33),   // Am11
    ]

    /// d-Moll-Pentatonik für die sparsame Melodie
    private static let melody = [74, 72, 69, 67, 65, 69, 72, 77]

    // MARK: Audio-Graph

    private let engine = AVAudioEngine()
    private var source: AVAudioSourceNode?

    private func buildGraph() {
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2) else { return }
        let node = AVAudioSourceNode(format: format) { [weak self] _, _, frameCount, audioBufferList -> OSStatus in
            guard let self else { return noErr }
            let buffers = UnsafeMutableAudioBufferListPointer(audioBufferList)
            self.render(frames: Int(frameCount), buffers: buffers)
            return noErr
        }
        source = node
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: format)
        engine.prepare()
    }

    private func activateSession() {
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)
        #endif
    }

    private func registerForInterruptions() {
        #if os(iOS)
        NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil, queue: .main
        ) { [weak self] note in
            guard let self,
                  let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
            switch type {
            case .began:
                self.engine.pause()
            case .ended:
                if self.isPlaying {
                    self.activateSession()
                    try? self.engine.start()
                }
            @unknown default:
                break
            }
        }
        #endif
    }

    // MARK: Stimmen

    private struct Voice {
        enum Kind { case tone, noise, kick }

        var active = false
        var kind: Kind = .tone
        var delaySamples = 0

        var phase = 0.0
        var inc = 0.0
        var phase2 = 0.0
        var inc2 = 0.0
        var triangleMix: Float = 0
        var pitchDecay = 1.0          // für die fallende Bassdrum

        var env: Float = 0
        var attackStep: Float = 1
        var decayFactor: Float = 0.999
        var attacking = true
        var amp: Float = 0

        var lp: Float = 0
        var lpCoeff: Float = 0
        var hp: Float = 0
        var hpCoeff: Float = 0

        mutating func tick(noise: Float) -> Float {
            if delaySamples > 0 { delaySamples -= 1; return 0 }

            var sample: Float = 0
            switch kind {
            case .tone:
                phase += inc;  if phase  >= 1 { phase  -= 1 }
                phase2 += inc2; if phase2 >= 1 { phase2 -= 1 }
                let sine = Float(sin(phase * 2 * Double.pi))
                let triangle = Float(4 * abs(phase2 - 0.5) - 1)
                sample = sine * (1 - triangleMix) + triangle * triangleMix
            case .noise:
                sample = noise
            case .kick:
                inc *= pitchDecay
                phase += inc; if phase >= 1 { phase -= 1 }
                sample = Float(sin(phase * 2 * Double.pi))
            }

            if lpCoeff > 0 { lp += lpCoeff * (sample - lp); sample = lp }
            if hpCoeff > 0 { hp += hpCoeff * (sample - hp); sample -= hp }

            if attacking {
                env += attackStep
                if env >= 1 { env = 1; attacking = false }
            } else {
                env *= decayFactor
                if env < 0.0008 { active = false }
            }
            return sample * env * amp
        }
    }

    private var voices = [Voice](repeating: Voice(), count: 48)

    // MARK: Ablauf

    private var samplesPerStep = 0
    private var samplesToNextStep = 0
    private var stepIndex = 0
    private var gain: Float = 0
    private var targetGain: Float = 0
    private var rngState: UInt64 = 0x9E3779B97F4A7C15

    private func render(frames: Int, buffers: UnsafeMutableAudioBufferListPointer) {
        guard samplesPerStep > 0 else { return }

        for frame in 0..<frames {
            if samplesToNextStep <= 0 { advanceStep() }
            samplesToNextStep -= 1

            let noise = whiteNoise()
            var sample: Float = 0
            for index in voices.indices where voices[index].active {
                sample += voices[index].tick(noise: noise)
            }

            // Vinyl-Knistern
            sample += noise * 0.012
            if randomUnit() < 0.0004 { sample += noise * 0.45 }

            gain += (targetGain - gain) * 0.00004
            let out = tanhf(sample * 1.15) * 0.85 * gain

            for buffer in buffers {
                let channel = UnsafeMutableBufferPointer<Float>(buffer)
                if frame < channel.count { channel[frame] = out }
            }
        }
    }

    private func advanceStep() {
        let inBar = stepIndex % 8
        let bar = (stepIndex / 8) % LofiEngine.chords.count
        let chord = LofiEngine.chords[bar]

        if inBar == 0 {
            for (i, note) in chord.pad.enumerated() {
                playPad(note, delay: Double(i) * 0.035)
            }
            playBass(chord.bass, amp: 0.16, seconds: 1.4)
            playKick()
        }
        if inBar == 3 { playKick() }
        if inBar == 5 {
            playBass(chord.bass + 7, amp: 0.12, seconds: 0.8)
            playKick()
        }
        if inBar == 2 || inBar == 6 { playSnare() }
        playHat(soft: inBar % 2 == 1)

        if (inBar == 4 || inBar == 7), randomUnit() < 0.45 {
            let note = LofiEngine.melody[Int(randomUnit() * Double(LofiEngine.melody.count)) % LofiEngine.melody.count]
            playKeys(note)
        }

        // Swing: gerade Achtel dauern etwas länger als ungerade
        let factor = stepIndex % 2 == 0 ? 1 + swing : 1 - swing
        samplesToNextStep = max(1, Int(Double(samplesPerStep) * factor))
        stepIndex += 1
    }

    // MARK: Einzelne Klänge

    private func playPad(_ note: Int, delay: Double) {
        var v = Voice()
        v.kind = .tone
        v.active = true
        v.delaySamples = Int(delay * sampleRate)
        v.inc = frequency(note) / sampleRate
        v.inc2 = frequency(note) * 1.004 / sampleRate
        v.triangleMix = 0.55
        v.amp = 0.075
        v.attackStep = attackStep(seconds: 0.7)
        v.decayFactor = decayFactor(seconds: 3.4)
        v.lpCoeff = lowpassCoeff(hz: 850)
        place(v)
    }

    private func playBass(_ note: Int, amp: Float, seconds: Double) {
        var v = Voice()
        v.kind = .tone
        v.active = true
        v.inc = frequency(note) / sampleRate
        v.inc2 = frequency(note) / sampleRate
        v.triangleMix = 0
        v.amp = amp
        v.attackStep = attackStep(seconds: 0.05)
        v.decayFactor = decayFactor(seconds: seconds)
        v.lpCoeff = lowpassCoeff(hz: 400)
        place(v)
    }

    private func playKeys(_ note: Int) {
        var v = Voice()
        v.kind = .tone
        v.active = true
        v.inc = frequency(note) / sampleRate
        v.inc2 = frequency(note + 12) / sampleRate
        v.triangleMix = 0.25
        v.amp = 0.09
        v.attackStep = attackStep(seconds: 0.02)
        v.decayFactor = decayFactor(seconds: 1.6)
        v.lpCoeff = lowpassCoeff(hz: 2200)
        place(v)
    }

    private func playKick() {
        var v = Voice()
        v.kind = .kick
        v.active = true
        v.inc = 120.0 / sampleRate
        v.pitchDecay = pow(45.0 / 120.0, 1.0 / (0.12 * sampleRate))
        v.amp = 0.34
        v.attackStep = attackStep(seconds: 0.005)
        v.decayFactor = decayFactor(seconds: 0.3)
        place(v)
    }

    private func playSnare() {
        var v = Voice()
        v.kind = .noise
        v.active = true
        v.amp = 0.11
        v.attackStep = attackStep(seconds: 0.002)
        v.decayFactor = decayFactor(seconds: 0.18)
        v.lpCoeff = lowpassCoeff(hz: 3000)
        v.hpCoeff = lowpassCoeff(hz: 900)      // als Hochpass benutzt
        place(v)
    }

    private func playHat(soft: Bool) {
        var v = Voice()
        v.kind = .noise
        v.active = true
        v.amp = soft ? 0.022 : 0.045
        v.attackStep = attackStep(seconds: 0.001)
        v.decayFactor = decayFactor(seconds: 0.045)
        v.hpCoeff = lowpassCoeff(hz: 6500)
        place(v)
    }

    /// Stimme in einen freien Platz legen (notfalls die erste überschreiben).
    private func place(_ voice: Voice) {
        for index in voices.indices where !voices[index].active {
            voices[index] = voice
            return
        }
        voices[0] = voice
    }

    // MARK: Rechenhilfen

    private func frequency(_ midi: Int) -> Double {
        440 * pow(2, (Double(midi) - 69) / 12)
    }

    /// Anstieg pro Sample, damit die Hüllkurve in `seconds` auf 1 kommt.
    private func attackStep(seconds: Double) -> Float {
        Float(1 / max(1, seconds * sampleRate))
    }

    /// Faktor pro Sample, damit der Ton nach `seconds` praktisch verklungen ist.
    private func decayFactor(seconds: Double) -> Float {
        Float(pow(0.001, 1 / max(1, seconds * sampleRate)))
    }

    private func lowpassCoeff(hz: Double) -> Float {
        Float(1 - exp(-2 * Double.pi * hz / sampleRate))
    }

    private func randomUnit() -> Double {
        rngState ^= rngState << 13
        rngState ^= rngState >> 7
        rngState ^= rngState << 17
        return Double(rngState % 1_000_000) / 1_000_000
    }

    private func whiteNoise() -> Float {
        Float(randomUnit() * 2 - 1)
    }
}
