//
//  ChipEngine.swift
//  8-Bit-Musik und Geräusche, Ton für Ton selbst berechnet (AVAudioEngine).
//  Keine Musikdateien – so wie in der Web-Fassung.
//

import AVFoundation
import SwiftUI

enum SFX {
    case blip, select, swing, hit, dead, hurt, door, horn, heal, coin
}

final class ChipEngine: ObservableObject {

    @Published private(set) var isOn = false

    private let engine = AVAudioEngine()
    private var source: AVAudioSourceNode?
    private let sampleRate: Double = 44_100

    private var currentSong: SongName = .wald
    private var samplesPerStep = 0
    private var samplesToNextStep = 0
    private var stepIndex = 0
    private var gain: Float = 0
    private var targetGain: Float = 0
    private var noiseState: UInt64 = 0x2545_F491_4F6C_DD1D

    /// Geräusche werden vom Spiel gemeldet und im Audio-Takt abgeholt.
    private let lock = NSLock()
    private var pendingSFX: [SFX] = []

    // MARK: An und aus

    func toggle() {
        isOn ? stop() : start()
    }

    func start() {
        activateSession()
        if source == nil { buildGraph() }
        setSong(currentSong)
        if !engine.isRunning {
            do { try engine.start() } catch { return }
        }
        targetGain = 0.5
        isOn = true
    }

    func stop() {
        targetGain = 0
        isOn = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
            guard let self, !self.isOn else { return }
            self.engine.pause()
        }
    }

    /// Anderes Stück spielen (Wald, Haus, Stadt, Kampf).
    func music(_ song: SongName) {
        guard song != currentSong else { return }
        currentSong = song
        setSong(song)
    }

    func play(_ effect: SFX) {
        guard isOn else { return }
        lock.lock()
        if pendingSFX.count < 8 { pendingSFX.append(effect) }
        lock.unlock()
    }

    private func setSong(_ song: SongName) {
        let bpm = ChipEngine.song(song).bpm
        samplesPerStep = Int(60.0 / bpm / 2.0 * sampleRate)
        samplesToNextStep = 0
        stepIndex = 0
    }

    private func activateSession() {
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)
        #endif
    }

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

    // MARK: Stimmen

    private enum Wave {
        case square, triangle, noise
    }

    private struct Voice {
        var active = false
        var wave: Wave = .square
        var phase = 0.0
        var inc = 0.0
        var env: Float = 0
        var decay: Float = 0.9995
        var amp: Float = 0
        var delay = 0

        mutating func tick(noise: Float) -> Float {
            if delay > 0 { delay -= 1; return 0 }
            var sample: Float = 0
            switch wave {
            case .square:
                phase += inc
                if phase >= 1 { phase -= 1 }
                sample = phase < 0.5 ? 1 : -1
            case .triangle:
                phase += inc
                if phase >= 1 { phase -= 1 }
                sample = Float(4 * abs(phase - 0.5) - 1)
            case .noise:
                sample = noise
            }
            env *= decay
            if env < 0.0015 { active = false }
            return sample * env * amp
        }
    }

    private var voices = [Voice](repeating: Voice(), count: 24)

    private func startVoice(wave: Wave, frequency: Double, amp: Float,
                            seconds: Double, delay: Double = 0) {
        for index in voices.indices where !voices[index].active {
            var voice = Voice()
            voice.active = true
            voice.wave = wave
            voice.inc = frequency / sampleRate
            voice.amp = amp
            voice.env = 1
            // Nach `seconds` soll der Ton fast verklungen sein.
            voice.decay = Float(pow(0.001, 1.0 / max(1.0, seconds * sampleRate)))
            voice.delay = Int(delay * sampleRate)
            voices[index] = voice
            return
        }
    }

    // MARK: Die Stücke

    private struct Song {
        let bpm: Double
        let lead: [Double]
        let bass: [Double]
    }

    private enum N {
        static let rest = 0.0
        static let c3 = 130.8, d3 = 146.8, e3 = 164.8, f3 = 174.6
        static let g3 = 196.0, a3 = 220.0, b3 = 246.9
        static let c4 = 261.6, d4 = 293.7, e4 = 329.6, f4 = 349.2
        static let g4 = 392.0, a4 = 440.0, b4 = 493.9
        static let c5 = 523.3, d5 = 587.3, e5 = 659.3
    }

    private static func song(_ name: SongName) -> Song {
        switch name {
        case .wald:
            return Song(
                bpm: 104,
                lead: [N.e4, N.g4, N.a4, N.g4, N.e4, N.d4, N.e4, N.rest,
                       N.c4, N.e4, N.g4, N.e4, N.d4, N.rest, N.d4, N.rest,
                       N.e4, N.g4, N.a4, N.b4, N.c5, N.b4, N.a4, N.g4,
                       N.e4, N.g4, N.e4, N.d4, N.c4, N.rest, N.rest, N.rest],
                bass: [N.a3, N.rest, N.e3, N.rest, N.a3, N.rest, N.e3, N.rest,
                       N.f3, N.rest, N.c3, N.rest, N.g3, N.rest, N.g3, N.rest,
                       N.a3, N.rest, N.e3, N.rest, N.a3, N.rest, N.e3, N.rest,
                       N.f3, N.rest, N.g3, N.rest, N.a3, N.rest, N.rest, N.rest])
        case .haus:
            return Song(
                bpm: 78,
                lead: [N.c4, N.e4, N.g4, N.e4, N.f4, N.a4, N.g4, N.rest,
                       N.e4, N.g4, N.c5, N.g4, N.f4, N.e4, N.d4, N.rest],
                bass: [N.c3, N.rest, N.g3, N.rest, N.f3, N.rest, N.c3, N.rest,
                       N.c3, N.rest, N.g3, N.rest, N.f3, N.rest, N.g3, N.rest])
        case .stadt:
            return Song(
                bpm: 126,
                lead: [N.g4, N.b4, N.d5, N.b4, N.g4, N.a4, N.b4, N.a4,
                       N.f4, N.a4, N.c5, N.a4, N.f4, N.g4, N.a4, N.rest,
                       N.e4, N.g4, N.b4, N.g4, N.e4, N.f4, N.g4, N.f4,
                       N.d4, N.f4, N.a4, N.f4, N.g4, N.rest, N.b4, N.rest],
                bass: [N.g3, N.g3, N.d3, N.d3, N.g3, N.g3, N.d3, N.d3,
                       N.f3, N.f3, N.c3, N.c3, N.f3, N.f3, N.c3, N.c3,
                       N.e3, N.e3, N.b3, N.b3, N.e3, N.e3, N.b3, N.b3,
                       N.d3, N.d3, N.a3, N.a3, N.g3, N.g3, N.g3, N.rest])
        case .boss:
            return Song(
                bpm: 132,
                lead: [N.a4, N.rest, N.a4, N.g4, N.a4, N.rest, N.c5, N.b4,
                       N.a4, N.rest, N.e4, N.f4, N.g4, N.rest, N.rest, N.rest,
                       N.a4, N.rest, N.c5, N.b4, N.a4, N.g4, N.f4, N.e4,
                       N.d4, N.e4, N.f4, N.g4, N.a4, N.rest, N.rest, N.rest],
                bass: [N.a3, N.a3, N.a3, N.a3, N.f3, N.f3, N.f3, N.f3,
                       N.g3, N.g3, N.g3, N.g3, N.e3, N.e3, N.e3, N.e3,
                       N.a3, N.a3, N.a3, N.a3, N.f3, N.f3, N.f3, N.f3,
                       N.d3, N.d3, N.d3, N.d3, N.e3, N.e3, N.e3, N.e3])
        case .kampf:
            return Song(
                bpm: 150,
                lead: [N.e4, N.e4, N.g4, N.e4, N.a4, N.g4, N.e4, N.d4,
                       N.e4, N.e4, N.c5, N.b4, N.a4, N.g4, N.e4, N.rest],
                bass: [N.e3, N.e3, N.e3, N.e3, N.a3, N.a3, N.a3, N.a3,
                       N.f3, N.f3, N.f3, N.f3, N.g3, N.g3, N.g3, N.g3])
        }
    }

    // MARK: Der Audio-Takt

    private func advanceStep() {
        let song = ChipEngine.song(currentSong)
        samplesToNextStep += max(1, samplesPerStep)

        let lead = song.lead[stepIndex % song.lead.count]
        let bass = song.bass[stepIndex % song.bass.count]
        let stepSeconds = 60.0 / song.bpm / 2.0

        if lead > 0 { startVoice(wave: .square, frequency: lead, amp: 0.16, seconds: stepSeconds * 0.9) }
        if bass > 0 { startVoice(wave: .triangle, frequency: bass, amp: 0.22, seconds: stepSeconds * 1.4) }
        if stepIndex % 4 == 0 { startVoice(wave: .noise, frequency: 0, amp: 0.10, seconds: 0.05) }
        if stepIndex % 4 == 2 { startVoice(wave: .noise, frequency: 0, amp: 0.05, seconds: 0.03) }

        stepIndex += 1
    }

    private func trigger(_ effect: SFX) {
        switch effect {
        case .blip:
            startVoice(wave: .square, frequency: 760 + Double.random(in: 0...90), amp: 0.07, seconds: 0.03)
        case .select:
            startVoice(wave: .square, frequency: 660, amp: 0.14, seconds: 0.06)
            startVoice(wave: .square, frequency: 990, amp: 0.12, seconds: 0.08, delay: 0.05)
        case .swing:
            startVoice(wave: .noise, frequency: 0, amp: 0.18, seconds: 0.14)
            startVoice(wave: .square, frequency: 520, amp: 0.06, seconds: 0.07)
        case .hit:
            startVoice(wave: .square, frequency: 180, amp: 0.24, seconds: 0.09)
            startVoice(wave: .square, frequency: 90, amp: 0.22, seconds: 0.12, delay: 0.04)
            startVoice(wave: .noise, frequency: 0, amp: 0.26, seconds: 0.09)
        case .dead:
            startVoice(wave: .square, frequency: 220, amp: 0.18, seconds: 0.1)
            startVoice(wave: .square, frequency: 160, amp: 0.16, seconds: 0.12, delay: 0.09)
            startVoice(wave: .square, frequency: 100, amp: 0.16, seconds: 0.25, delay: 0.2)
        case .hurt:
            startVoice(wave: .square, frequency: 320, amp: 0.22, seconds: 0.08)
            startVoice(wave: .square, frequency: 150, amp: 0.2, seconds: 0.2, delay: 0.07)
        case .door:
            startVoice(wave: .noise, frequency: 0, amp: 0.14, seconds: 0.18)
            startVoice(wave: .triangle, frequency: 180, amp: 0.12, seconds: 0.15)
        case .horn:
            startVoice(wave: .square, frequency: 392, amp: 0.18, seconds: 0.3)
            startVoice(wave: .square, frequency: 330, amp: 0.16, seconds: 0.3)
        case .coin:
            startVoice(wave: .square, frequency: 1046, amp: 0.13, seconds: 0.05)
            startVoice(wave: .square, frequency: 1568, amp: 0.11, seconds: 0.09, delay: 0.05)
        case .heal:
            startVoice(wave: .triangle, frequency: 523, amp: 0.18, seconds: 0.1)
            startVoice(wave: .triangle, frequency: 659, amp: 0.18, seconds: 0.1, delay: 0.09)
            startVoice(wave: .triangle, frequency: 784, amp: 0.18, seconds: 0.22, delay: 0.18)
        }
    }

    private func nextNoise() -> Float {
        noiseState ^= noiseState << 13
        noiseState ^= noiseState >> 7
        noiseState ^= noiseState << 17
        return Float(Int32(truncatingIfNeeded: noiseState)) / Float(Int32.max)
    }

    private func render(frames: Int, buffers: UnsafeMutableAudioBufferListPointer) {
        // Angemeldete Geräusche abholen.
        lock.lock()
        if !pendingSFX.isEmpty {
            let waiting = pendingSFX
            pendingSFX.removeAll(keepingCapacity: true)
            lock.unlock()
            for effect in waiting { trigger(effect) }
        } else {
            lock.unlock()
        }

        for frame in 0..<frames {
            if samplesPerStep > 0 {
                samplesToNextStep -= 1
                if samplesToNextStep <= 0 { advanceStep() }
            }

            let noise = nextNoise()
            var mix: Float = 0
            for index in voices.indices where voices[index].active {
                mix += voices[index].tick(noise: noise)
            }

            gain += (targetGain - gain) * 0.0004
            var value = mix * gain
            if value > 1 { value = 1 }
            if value < -1 { value = -1 }

            for buffer in buffers {
                if let data = buffer.mData?.assumingMemoryBound(to: Float.self) {
                    data[frame] = value
                }
            }
        }
    }
}
