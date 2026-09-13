import AVFoundation
import SwiftUI

/// Ruhige Fokus-Musik, direkt in der App erzeugt – keine Audiodateien,
/// kein Internet, kein Download.
final class MusicEngine: ObservableObject {
    static let shared = MusicEngine()

    @Published private(set) var isPlaying = false
    @Published var volume: Double {
        didSet {
            synth?.masterVolume = Float(volume)
            UserDefaults.standard.set(volume, forKey: MusicEngine.volumeKey)
        }
    }

    private static let volumeKey = "fokusmusik.lautstaerke"

    private let engine = AVAudioEngine()
    private var synth: Synth?
    private var sourceNode: AVAudioSourceNode?
    private var stopWork: DispatchWorkItem?

    private init() {
        let stored = UserDefaults.standard.object(forKey: MusicEngine.volumeKey) as? Double
        volume = stored ?? 0.5

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    func toggle() {
        isPlaying ? pause() : play()
    }

    func play() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            prepareEngine(sampleRate: session.sampleRate)
            if !engine.isRunning {
                try engine.start()
            }
            stopWork?.cancel()
            synth?.targetGain = 1
            isPlaying = true
        } catch {
            print("Musik konnte nicht starten: \(error.localizedDescription)")
            isPlaying = false
        }
    }

    func pause() {
        synth?.targetGain = 0
        isPlaying = false

        // erst ausblenden lassen, dann die Audio-Engine anhalten
        let work = DispatchWorkItem { [weak self] in
            guard let self, !self.isPlaying else { return }
            self.engine.pause()
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
        stopWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5, execute: work)
    }

    /// Beim Zurückkehren in die App weiterspielen.
    func resumeIfNeeded() {
        guard isPlaying, !engine.isRunning else { return }
        play()
    }

    private func prepareEngine(sampleRate: Double) {
        if let synth, sourceNode != nil {
            synth.masterVolume = Float(volume)
            return
        }
        let rate = sampleRate > 0 ? sampleRate : 44_100
        guard let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 2) else { return }

        let newSynth = Synth(sampleRate: rate)
        newSynth.masterVolume = Float(volume)

        let node = AVAudioSourceNode(format: format) { [newSynth] _, _, frameCount, audioBufferList in
            let buffers = UnsafeMutableAudioBufferListPointer(audioBufferList)
            guard buffers.count >= 2,
                  let leftData = buffers[0].mData,
                  let rightData = buffers[1].mData else { return noErr }
            newSynth.render(
                frameCount: Int(frameCount),
                left: leftData.assumingMemoryBound(to: Float.self),
                right: rightData.assumingMemoryBound(to: Float.self)
            )
            return noErr
        }

        let reverb = AVAudioUnitReverb()
        reverb.loadFactoryPreset(.mediumHall)
        reverb.wetDryMix = 24

        engine.attach(node)
        engine.attach(reverb)
        engine.connect(node, to: reverb, format: format)
        engine.connect(reverb, to: engine.mainMixerNode, format: format)
        engine.prepare()

        synth = newSynth
        sourceNode = node
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            switch type {
            case .began:
                self.synth?.targetGain = 0
                self.isPlaying = false
            case .ended:
                if let optionsRaw = info[AVAudioSessionInterruptionOptionKey] as? UInt,
                   AVAudioSession.InterruptionOptions(rawValue: optionsRaw).contains(.shouldResume) {
                    self.play()
                }
            @unknown default:
                break
            }
        }
    }
}
