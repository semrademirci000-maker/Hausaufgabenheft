//
//  SpeechListener.swift
//  Emos Ohren: hört dauerhaft zu (auf Deutsch) und meldet, was gesagt wurde.
//

import AVFoundation
import Speech

final class SpeechListener {

    /// Zwischenstand, während du noch sprichst (für schnelle Reaktionen wie „Hände hoch“).
    var onPartial: ((String) -> Void)?
    /// Fertiger Satz – nach einer kurzen Sprechpause.
    var onFinal: ((String) -> Void)?
    /// Lautstärke am Mikrofon (0…1).
    var onLevel: ((Float) -> Void)?

    private(set) var isRunning = false
    /// Während Emo selbst spricht, hört er nicht zu (sonst versteht er sich selbst).
    private(set) var isMuted = false

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "de-DE"))
    private let engine = AVAudioEngine()
    private let box = RequestBox()
    private var task: SFSpeechRecognitionTask?
    private var currentRequest: SFSpeechAudioBufferRecognitionRequest?
    private var lastText = ""
    private var silence: DispatchWorkItem?
    private var refresh: DispatchWorkItem?

    /// Fragt nach Mikrofon und Spracherkennung und startet dann.
    func start() {
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else { return }
            AVAudioApplication.requestRecordPermission { granted in
                guard granted else { return }
                DispatchQueue.main.async { self.startEngine() }
            }
        }
    }

    func stop() {
        endTask()
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        isRunning = false
    }

    func setMuted(_ muted: Bool) {
        guard muted != isMuted else { return }
        isMuted = muted
        guard isRunning else { return }
        if muted {
            endTask()
        } else {
            beginTask()
        }
    }

    // MARK: Intern

    private func startEngine() {
        guard !isRunning, let recognizer, recognizer.isAvailable else { return }
        AudioSession.activate()
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else { return }
        input.removeTap(onBus: 0)
        let box = self.box
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            box.append(buffer)
            // Lautstärke für die Anzeige
            guard let data = buffer.floatChannelData?[0] else { return }
            let n = Int(buffer.frameLength)
            var sum: Float = 0
            for i in stride(from: 0, to: n, by: 4) { sum += data[i] * data[i] }
            let rms = sqrt(sum / Float(max(n / 4, 1)))
            let level = min(1, rms * 12)
            DispatchQueue.main.async { self?.onLevel?(level) }
        }
        engine.prepare()
        do {
            try engine.start()
        } catch {
            print("Mikrofon startet nicht: \(error)")
            return
        }
        isRunning = true
        if !isMuted { beginTask() }
    }

    private func beginTask() {
        guard let recognizer, task == nil else { return }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        if recognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
        }
        request.contextualStrings = ["Emo", "Hey Emo", "Hände hoch", "Peng", "tanz", "Witz"]
        currentRequest = request
        box.set(request)
        lastText = ""

        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, self.currentRequest === request else { return }
                if let result {
                    let text = result.bestTranscription.formattedString
                    if text != self.lastText {
                        self.lastText = text
                        self.onPartial?(text)
                        self.scheduleFinish()
                    }
                    if result.isFinal { self.finish() }
                } else if error != nil {
                    // z. B. „keine Sprache erkannt“ – einfach neu anfangen.
                    self.finish()
                }
            }
        }

        // Erkennungen laufen nur ca. 1 Minute – vorher frisch starten.
        refresh?.cancel()
        let r = DispatchWorkItem { [weak self] in
            guard let self, self.currentRequest === request, self.lastText.isEmpty else { return }
            self.endTask()
            self.beginTask()
        }
        refresh = r
        DispatchQueue.main.asyncAfter(deadline: .now() + 45, execute: r)
    }

    private func scheduleFinish() {
        silence?.cancel()
        let w = DispatchWorkItem { [weak self] in self?.finish() }
        silence = w
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.1, execute: w)
    }

    /// Satz ist fertig: weitergeben und neu zuhören.
    private func finish() {
        let text = lastText.trimmingCharacters(in: .whitespacesAndNewlines)
        endTask()
        if !text.isEmpty && !isMuted { onFinal?(text) }
        if isRunning && !isMuted {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                guard let self, self.isRunning, !self.isMuted else { return }
                self.beginTask()
            }
        }
    }

    private func endTask() {
        silence?.cancel()
        refresh?.cancel()
        currentRequest?.endAudio()
        task?.cancel()
        task = nil
        currentRequest = nil
        box.set(nil)
        lastText = ""
    }
}

/// Hält die aktuelle Anfrage threadsicher fest – der Mikrofon-Tap läuft
/// auf einem eigenen Audio-Thread.
private final class RequestBox {
    private let lock = NSLock()
    private var request: SFSpeechAudioBufferRecognitionRequest?

    func set(_ r: SFSpeechAudioBufferRecognitionRequest?) {
        lock.lock(); request = r; lock.unlock()
    }

    func append(_ buffer: AVAudioPCMBuffer) {
        lock.lock(); let r = request; lock.unlock()
        r?.append(buffer)
    }
}
