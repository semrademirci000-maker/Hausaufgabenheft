//
//  RobotVoice.swift
//  Emos Stimme: Sprachausgabe mit hoher, niedlicher Roboterstimme.
//

import AVFoundation

final class RobotVoice: NSObject, AVSpeechSynthesizerDelegate {

    /// 0.5 (tief) … 2.0 (sehr hoch).
    var pitch: Float = 1.6
    var rate: Float = 0.52

    private let synth = AVSpeechSynthesizer()
    private var waiting: CheckedContinuation<Void, Never>?
    private var current: AVSpeechUtterance?
    private lazy var voice: AVSpeechSynthesisVoice? = {
        let german = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("de") }
        // Die beste installierte deutsche Stimme nehmen (Premium > Erweitert > Standard).
        return german.max { $0.quality.rawValue < $1.quality.rawValue }
            ?? AVSpeechSynthesisVoice(language: "de-DE")
    }()

    override init() {
        super.init()
        synth.delegate = self
    }

    /// Spricht den Text und kehrt zurück, wenn Emo fertig ist (oder unterbrochen wurde).
    @MainActor
    func speak(_ text: String) async {
        stop()
        let u = AVSpeechUtterance(string: text)
        u.voice = voice
        u.pitchMultiplier = pitch
        u.rate = rate
        u.volume = 1
        u.preUtteranceDelay = 0.02
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
            waiting = c
            current = u
            synth.speak(u)
        }
    }

    @MainActor
    func stop() {
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
        finish()
    }

    @MainActor
    private func finish() {
        current = nil
        let c = waiting
        waiting = nil
        c?.resume()
    }

    func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) {
        Task { @MainActor in if u === self.current { self.finish() } }
    }

    func speechSynthesizer(_ s: AVSpeechSynthesizer, didCancel u: AVSpeechUtterance) {
        Task { @MainActor in if u === self.current { self.finish() } }
    }
}
