//
//  SoundFX.swift
//  Emos Piep-, Zwitscher- und Quietschgeräusche. Alles wird – wie bei der
//  Lo-Fi-Musik im Hausaufgabenheft – Ton für Ton berechnet, ohne Sounddateien.
//

import AVFoundation

/// Gemeinsame Audio-Einstellung für Mikrofon + Lautsprecher.
enum AudioSession {
    static func activate() {
        let s = AVAudioSession.sharedInstance()
        do {
            try s.setCategory(.playAndRecord, mode: .default,
                              options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
            try s.setActive(true)
        } catch {
            print("Audio-Session: \(error)")
        }
    }
}

final class SoundFX {

    enum Sound: CaseIterable {
        case hello, happy, laugh, sad, surprised, scared, angry, love, dizzy
        case shot, dying, revive, snore, yawn, think, listen, tap, notice, purr, ok, dance, hum
    }

    var volume: Float = 0.8 { didSet { player.volume = volume } }

    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let sampleRate: Double = 44_100
    private lazy var format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
    private var cache: [Sound: AVAudioPCMBuffer] = [:]

    init() {
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
        NotificationCenter.default.addObserver(forName: .AVAudioEngineConfigurationChange,
                                               object: engine, queue: .main) { [weak self] _ in
            self?.restart()
        }
    }

    func play(_ sound: Sound) {
        guard ensureRunning() else { return }
        let buffer = cache[sound] ?? render(sound)
        cache[sound] = buffer
        player.scheduleBuffer(buffer, at: nil, options: .interrupts, completionHandler: nil)
        if !player.isPlaying { player.play() }
    }

    func stop() { player.stop() }

    @discardableResult
    private func ensureRunning() -> Bool {
        if engine.isRunning { return true }
        do { try engine.start(); return true } catch { return false }
    }

    private func restart() {
        player.stop()
        engine.stop()
        ensureRunning()
    }

    // MARK: Klangbausteine

    private enum Wave { case sine, soft, square, triangle, noise, rumble }

    /// Ein Stück Ton: gleitet in `duration` Sekunden von `from` nach `to` Hz.
    private struct Seg {
        var duration: Double
        var from: Double
        var to: Double
        var wave: Wave = .soft
        var gain: Double = 0.5
        var vibRate: Double = 0
        var vibDepth: Double = 0
        /// Lautstärke fällt im Verlauf ab (Perkussion).
        var decay: Bool = false
    }

    private static func pause(_ d: Double) -> Seg { Seg(duration: d, from: 0, to: 0, gain: 0) }

    private func recipe(_ sound: Sound) -> [Seg] {
        let p = SoundFX.pause
        switch sound {
        case .hello:
            return [Seg(duration: 0.09, from: 700, to: 1000), p(0.03),
                    Seg(duration: 0.16, from: 1000, to: 1550)]
        case .happy:
            return [Seg(duration: 0.07, from: 900, to: 1300), p(0.02),
                    Seg(duration: 0.07, from: 1100, to: 1600), p(0.02),
                    Seg(duration: 0.14, from: 1300, to: 1950, vibRate: 18, vibDepth: 0.02)]
        case .laugh:
            var s: [Seg] = []
            for i in 0..<7 {
                let f = 1250.0 - Double(i) * 40
                s += [Seg(duration: 0.06, from: f, to: f - 300, wave: .square, gain: 0.32), p(0.045)]
            }
            return s
        case .sad:
            return [Seg(duration: 0.35, from: 760, to: 620, wave: .sine, vibRate: 6, vibDepth: 0.03), p(0.05),
                    Seg(duration: 0.6, from: 640, to: 330, wave: .sine, vibRate: 6, vibDepth: 0.04)]
        case .surprised:
            return [Seg(duration: 0.2, from: 380, to: 1900, wave: .soft)]
        case .scared:
            return [Seg(duration: 0.7, from: 1400, to: 1150, wave: .triangle, gain: 0.45, vibRate: 15, vibDepth: 0.07)]
        case .angry:
            return [Seg(duration: 0.28, from: 170, to: 140, wave: .square, gain: 0.35, vibRate: 30, vibDepth: 0.05), p(0.05),
                    Seg(duration: 0.3, from: 180, to: 110, wave: .square, gain: 0.35, vibRate: 30, vibDepth: 0.06)]
        case .love:
            return [Seg(duration: 0.22, from: 820, to: 1000, wave: .sine, vibRate: 7, vibDepth: 0.03), p(0.04),
                    Seg(duration: 0.4, from: 1000, to: 1350, wave: .sine, vibRate: 7, vibDepth: 0.04)]
        case .dizzy:
            return [Seg(duration: 1.2, from: 700, to: 700, wave: .triangle, gain: 0.4, vibRate: 3, vibDepth: 0.35)]
        case .shot:
            return [Seg(duration: 0.25, from: 0, to: 0, wave: .noise, gain: 0.9, decay: true)]
        case .dying:
            return [Seg(duration: 1.3, from: 950, to: 80, wave: .triangle, gain: 0.5, vibRate: 5, vibDepth: 0.05)]
        case .revive:
            return [Seg(duration: 0.35, from: 200, to: 1400, wave: .soft), p(0.04),
                    Seg(duration: 0.1, from: 1400, to: 1800)]
        case .snore:
            return [Seg(duration: 1.0, from: 0, to: 0, wave: .rumble, gain: 0.5), p(0.15),
                    Seg(duration: 0.6, from: 1500, to: 1750, wave: .sine, gain: 0.12)]
        case .yawn:
            return [Seg(duration: 0.45, from: 450, to: 820, wave: .sine, gain: 0.4),
                    Seg(duration: 0.55, from: 820, to: 380, wave: .sine, gain: 0.4, vibRate: 5, vibDepth: 0.02)]
        case .think:
            return [Seg(duration: 0.07, from: 620, to: 620), p(0.08),
                    Seg(duration: 0.07, from: 680, to: 680), p(0.08),
                    Seg(duration: 0.1, from: 740, to: 780)]
        case .listen:
            return [Seg(duration: 0.07, from: 1200, to: 1550, wave: .sine, gain: 0.4)]
        case .tap:
            return [Seg(duration: 0.06, from: 950, to: 600, wave: .sine, gain: 0.45)]
        case .notice:
            return [Seg(duration: 0.05, from: 1000, to: 1000), p(0.03),
                    Seg(duration: 0.09, from: 1400, to: 1650)]
        case .purr:
            return [Seg(duration: 0.9, from: 230, to: 260, wave: .square, gain: 0.18, vibRate: 24, vibDepth: 0.12)]
        case .ok:
            return [Seg(duration: 0.06, from: 800, to: 800), p(0.02), Seg(duration: 0.1, from: 1200, to: 1250)]
        case .hum:
            return [Seg(duration: 0.18, from: 520, to: 600, wave: .sine, gain: 0.25),
                    Seg(duration: 0.22, from: 600, to: 560, wave: .sine, gain: 0.25)]
        case .dance:
            // Ein kleines, fröhliches 8-Bit-Liedchen.
            let melody: [Double] = [523, 659, 784, 659, 880, 784, 659, 523,
                                    587, 698, 880, 698, 988, 880, 784, 0,
                                    523, 659, 784, 1047, 988, 784, 659, 587,
                                    523, 659, 523, 392, 523, 0, 1047, 0]
            var s: [Seg] = []
            for f in melody {
                if f == 0 { s.append(p(0.2)); continue }
                s.append(Seg(duration: 0.17, from: f, to: f, wave: .square, gain: 0.22))
                s.append(p(0.03))
            }
            return s
        }
    }

    private func render(_ sound: Sound) -> AVAudioPCMBuffer {
        let segs = recipe(sound)
        let total = segs.reduce(0) { $0 + Int($1.duration * sampleRate) } + 256
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(total))!
        buffer.frameLength = AVAudioFrameCount(total)
        let out = buffer.floatChannelData![0]
        var phase = 0.0
        var low = 0.0
        var idx = 0
        for seg in segs {
            let n = Int(seg.duration * sampleRate)
            let attack = min(Double(n) * 0.15, 0.006 * sampleRate)
            let release = min(Double(n) * 0.3, 0.025 * sampleRate)
            for i in 0..<n {
                let t = Double(i) / Double(max(n, 1))
                var env = 1.0
                if Double(i) < attack { env = Double(i) / attack }
                if Double(n - i) < release { env = min(env, Double(n - i) / release) }
                if seg.decay { env *= exp(-t * 6) }
                var f = seg.from + (seg.to - seg.from) * t
                if seg.vibRate > 0 {
                    f *= 1 + seg.vibDepth * sin(2 * .pi * seg.vibRate * Double(i) / sampleRate)
                }
                phase += 2 * .pi * f / sampleRate
                if phase > 2 * .pi { phase -= 2 * .pi }
                let v: Double
                switch seg.wave {
                case .sine:     v = sin(phase)
                case .soft:     v = tanh(2.2 * sin(phase)) * 0.8 + 0.2 * sin(2 * phase)
                case .square:   v = tanh(6 * sin(phase)) * 0.7
                case .triangle: v = 2 / .pi * asin(sin(phase))
                case .noise:
                    let r = Double.random(in: -1...1)
                    low += (r - low) * 0.35
                    v = low * 1.4
                case .rumble:
                    // Tiefes Schnarchen: gefiltertes Rauschen, das an- und abschwillt.
                    let r = Double.random(in: -1...1)
                    low += (r - low) * 0.04
                    v = low * 4 * (0.4 + 0.6 * sin(.pi * t))
                }
                out[idx] = Float(v * seg.gain * env)
                idx += 1
            }
        }
        while idx < total { out[idx] = 0; idx += 1 }
        return buffer
    }
}
