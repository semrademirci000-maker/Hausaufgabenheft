import Foundation

/// Erzeugt die Musik Sample für Sample: warmer Flächenklang, sparsame Melodie,
/// weicher Beat und ein Hauch Vinyl-Rauschen. Läuft im Audio-Thread und
/// kommt ohne Speicheranforderungen aus.
final class Synth {
    /// Lautstärke-Regler (0 … 1).
    var masterVolume: Float = 0.5
    /// 1 = einblenden, 0 = ausblenden.
    var targetGain: Float = 0

    private let sampleRate: Double
    private let beatSamples: Int
    private let barSamples: Int
    private let chordSamples: Int

    /// Vier Akkorde, je vier Stimmen (Fmaj7 – Am7 – Dm7 – B♭maj7).
    private static let voiceCount = 4
    private let chordFrequencies: [Double]
    /// Töne für die Melodie (F-Dur-Pentatonik).
    private let melodyScale: [Double]

    private var frame: Int = 0
    private var gain: Float = 0

    private var padPhaseLeft: [Double]
    private var padPhaseRight: [Double]

    private var melodyPhase: Double = 0
    private var melodyFrequency: Double = 0
    private var melodyEnvelope: Double = 0
    private var melodyIndex: Int = 2

    private var kickPhase: Double = 0
    private var kickEnvelope: Double = 0
    private var kickPitch: Double = 0
    private var hatEnvelope: Double = 0
    private var popEnvelope: Double = 0
    private var noiseState: Double = 0
    private var lowPassLeft: Double = 0
    private var lowPassRight: Double = 0
    private var random: UInt64 = 0x2545F4914F6CDD1D

    init(sampleRate: Double, tempo: Double = 68) {
        self.sampleRate = sampleRate
        beatSamples = Int(sampleRate * 60 / tempo)
        barSamples = beatSamples * 4
        chordSamples = barSamples * 2

        func hertz(_ midi: Double) -> Double { 440 * pow(2, (midi - 69) / 12) }

        let chords: [[Double]] = [
            [53, 57, 60, 64],   // Fmaj7
            [57, 60, 64, 67],   // Am7
            [50, 53, 57, 60],   // Dm7
            [58, 62, 65, 69]    // B♭maj7
        ]
        chordFrequencies = chords.flatMap { $0.map(hertz) }
        melodyScale = [65, 67, 69, 72, 74, 77].map(hertz)

        padPhaseLeft = Array(repeating: 0, count: Synth.voiceCount)
        padPhaseRight = Array(repeating: 0, count: Synth.voiceCount)
    }

    /// Zufallszahl zwischen 0 und 1 (ohne Speicheranforderung, xorshift).
    private func nextRandom() -> Double {
        random ^= random << 13
        random ^= random >> 7
        random ^= random << 17
        return Double(random % 100_000) / 100_000
    }

    /// Füllt einen Audio-Puffer.
    func render(frameCount: Int, left: UnsafeMutablePointer<Float>, right: UnsafeMutablePointer<Float>) {
        let twoPi = 2 * Double.pi
        let fade = 2.2 * sampleRate          // Ein-/Ausblenden der Fläche
        let volume = masterVolume
        let target = targetGain

        for index in 0..<frameCount {
            // --- Takt und Akkord ---
            let chordPosition = frame % chordSamples
            let chordIndex = (frame / chordSamples) % 4

            if frame % beatSamples == 0 {
                let beat = (frame / beatSamples) % 4
                if beat == 0 || beat == 2 {
                    kickEnvelope = 1
                    kickPitch = 1
                }
                // sparsame Melodie: nicht auf jedem Schlag
                if nextRandom() < 0.38 {
                    let step = Int(nextRandom() * 3) - 1
                    melodyIndex = min(max(melodyIndex + step, 0), melodyScale.count - 1)
                    melodyFrequency = melodyScale[melodyIndex]
                    melodyEnvelope = 1
                }
            }
            if frame % (beatSamples / 2) == 0, frame % beatSamples != 0 {
                hatEnvelope = 1
            }

            // --- Fläche (Pad) ---
            var padEnvelope = 1.0
            if chordPosition < Int(fade) {
                padEnvelope = 0.5 - 0.5 * cos(Double.pi * Double(chordPosition) / fade)
            } else if Double(chordSamples - chordPosition) < fade {
                padEnvelope = 0.5 - 0.5 * cos(Double.pi * Double(chordSamples - chordPosition) / fade)
            }

            var padLeft = 0.0
            var padRight = 0.0
            for voice in 0..<Synth.voiceCount {
                let frequency = chordFrequencies[chordIndex * Synth.voiceCount + voice]
                padPhaseLeft[voice] += twoPi * frequency * 0.9994 / sampleRate
                padPhaseRight[voice] += twoPi * frequency * 1.0006 / sampleRate
                if padPhaseLeft[voice] > twoPi { padPhaseLeft[voice] -= twoPi }
                if padPhaseRight[voice] > twoPi { padPhaseRight[voice] -= twoPi }
                let weight = voice == 0 ? 1.0 : 0.7
                padLeft += sin(padPhaseLeft[voice]) * weight
                padRight += sin(padPhaseRight[voice]) * weight
            }
            padLeft *= 0.085 * padEnvelope
            padRight *= 0.085 * padEnvelope

            // --- Melodie ---
            var melody = 0.0
            if melodyEnvelope > 0.0005 {
                melodyPhase += twoPi * melodyFrequency / sampleRate
                if melodyPhase > twoPi { melodyPhase -= twoPi }
                melody = (sin(melodyPhase) + 0.25 * sin(2 * melodyPhase)) * melodyEnvelope * 0.09
                melodyEnvelope *= 0.99993
            } else {
                melodyEnvelope = 0
            }

            // --- Beat ---
            var drums = 0.0
            if kickEnvelope > 0.0005 {
                let frequency = 48 + 46 * kickPitch
                kickPhase += twoPi * frequency / sampleRate
                if kickPhase > twoPi { kickPhase -= twoPi }
                drums += sin(kickPhase) * kickEnvelope * 0.22
                kickEnvelope *= 0.99988
                kickPitch *= 0.9994
            } else {
                kickEnvelope = 0
            }

            let noise = nextRandom() * 2 - 1
            noiseState += 0.35 * (noise - noiseState)
            if hatEnvelope > 0.0005 {
                drums += (noise - noiseState) * hatEnvelope * 0.035
                hatEnvelope *= 0.9992
            } else {
                hatEnvelope = 0
            }

            // --- Vinyl-Knistern ---
            if nextRandom() < 0.00004 { popEnvelope = 1 }
            var texture = noiseState * 0.006
            if popEnvelope > 0.0005 {
                texture += (noise) * popEnvelope * 0.05
                popEnvelope *= 0.9985
            } else {
                popEnvelope = 0
            }

            // --- Summe, Wärme, weiche Begrenzung ---
            var outLeft = padLeft + melody * 0.9 + drums + texture
            var outRight = padRight + melody * 1.0 + drums + texture
            lowPassLeft += 0.35 * (outLeft - lowPassLeft)
            lowPassRight += 0.35 * (outRight - lowPassRight)
            outLeft = tanh(lowPassLeft * 1.6)
            outRight = tanh(lowPassRight * 1.6)

            // sanftes Ein- und Ausblenden
            gain += (target - gain) * 0.00008
            let level = gain * volume

            left[index] = Float(outLeft) * level
            right[index] = Float(outRight) * level
            frame += 1
        }
    }

    /// Ist die Musik komplett ausgeblendet?
    var isSilent: Bool { gain < 0.002 && targetGain == 0 }
}
