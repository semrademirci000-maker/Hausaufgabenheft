//
//  VisionWatcher.swift
//  Emos „Augen“ in echt: die Frontkamera. Erkennt dein Gesicht (damit Emo
//  dich anschaut) und Handzeichen wie die Finger-Pistole.
//

import AVFoundation
import Vision
import UIKit
import CoreImage

/// Handzeichen, die Emo erkennt.
enum HandSign: String {
    case gun        // Finger-Pistole: Zeigefinger vor, Daumen hoch
    case openPalm   // Offene Hand (Winken)
    case thumbsUp   // Daumen hoch
    case peace      // Peace-Zeichen
    case fist       // Faust
}

final class VisionWatcher: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {

    /// Gesicht gefunden: Mitte in -1…1 (x nach rechts, y nach unten) und Größe 0…1.
    /// `nil`, wenn kein Gesicht zu sehen ist.
    var onFace: ((CGPoint?, CGFloat) -> Void)?
    /// Handzeichen (stabil über mehrere Bilder) und die Position der Zeigefingerspitze (0…1, y nach oben).
    var onHand: ((HandSign?, CGPoint?) -> Void)?

    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "emo.vision")
    private let output = AVCaptureVideoDataOutput()
    private var rotation: AVCaptureDevice.RotationCoordinator?
    private var rotationObservation: NSKeyValueObservation?
    private var configured = false
    private var frame = 0
    private var lastBuffer: CVPixelBuffer?
    private let ciContext = CIContext()

    private let faceRequest = VNDetectFaceRectanglesRequest()
    private let handRequest: VNDetectHumanHandPoseRequest = {
        let r = VNDetectHumanHandPoseRequest()
        r.maximumHandCount = 1
        return r
    }()

    // Damit ein Zeichen nicht flackert, muss es ein paar Bilder lang gleich bleiben.
    private var candidate: HandSign?
    private var candidateCount = 0
    private var stableSign: HandSign?
    private var missingCount = 0

    func start() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            queue.async { self.run() }
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { ok in
                if ok { self.queue.async { self.run() } }
            }
        default:
            break
        }
    }

    func stop() {
        queue.async {
            if self.session.isRunning { self.session.stopRunning() }
        }
    }

    /// Macht ein Foto aus dem aktuellen Kamerabild.
    func snapshot() async -> UIImage? {
        await withCheckedContinuation { (c: CheckedContinuation<UIImage?, Never>) in
            queue.async {
                guard let buffer = self.lastBuffer else { c.resume(returning: nil); return }
                let image = CIImage(cvPixelBuffer: buffer)
                guard let cg = self.ciContext.createCGImage(image, from: image.extent) else {
                    c.resume(returning: nil)
                    return
                }
                c.resume(returning: UIImage(cgImage: cg))
            }
        }
    }

    private func run() {
        if !configured { configure() }
        if configured && !session.isRunning { session.startRunning() }
    }

    private func configure() {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let input = try? AVCaptureDeviceInput(device: device) else { return }
        session.beginConfiguration()
        session.sessionPreset = .vga640x480
        guard session.canAddInput(input), session.canAddOutput(output) else {
            session.commitConfiguration()
            return
        }
        session.addInput(input)
        output.alwaysDiscardsLateVideoFrames = true
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
        output.setSampleBufferDelegate(self, queue: queue)
        session.addOutput(output)

        if let connection = output.connection(with: .video) {
            // Wie ein Spiegel: Wenn du links stehst, bist du auch im Bild links.
            if connection.isVideoMirroringSupported {
                connection.automaticallyAdjustsVideoMirroring = false
                connection.isVideoMirrored = true
            }
        }
        session.commitConfiguration()

        // Bild immer aufrecht drehen – egal wie das Handy gehalten wird.
        let coordinator = AVCaptureDevice.RotationCoordinator(device: device, previewLayer: nil)
        rotation = coordinator
        rotationObservation = coordinator.observe(\.videoRotationAngleForHorizonLevelCapture,
                                                  options: [.initial, .new]) { [weak self] c, _ in
            let angle = c.videoRotationAngleForHorizonLevelCapture
            self?.queue.async {
                guard let conn = self?.output.connection(with: .video),
                      conn.isVideoRotationAngleSupported(angle) else { return }
                conn.videoRotationAngle = angle
            }
        }
        configured = true
    }

    // MARK: Bilder auswerten

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer,
                       from connection: AVCaptureConnection) {
        frame += 1
        guard let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        // Für Fotos nur alle paar Bilder merken – so bleibt der Kamera-Speicher frei.
        if frame % 6 == 0 { lastBuffer = pixels }
        guard frame % 2 == 0 else { return }

        let handler = VNImageRequestHandler(cvPixelBuffer: pixels, orientation: .up, options: [:])
        do {
            try handler.perform([faceRequest, handRequest])
        } catch {
            return
        }

        // Gesicht: das größte nehmen.
        let faces = faceRequest.results ?? []
        if let face = faces.max(by: { $0.boundingBox.width < $1.boundingBox.width }) {
            let b = face.boundingBox
            let center = CGPoint(x: (b.midX - 0.5) * 2, y: (0.5 - b.midY) * 2)
            let size = b.width
            DispatchQueue.main.async { self.onFace?(center, size) }
        } else {
            DispatchQueue.main.async { self.onFace?(nil, 0) }
        }

        // Hand
        var sign: HandSign?
        var tip: CGPoint?
        if let hand = handRequest.results?.first {
            (sign, tip) = HandClassifier.classify(hand)
        }
        let stable = stabilize(sign)
        DispatchQueue.main.async { self.onHand?(stable, tip) }
    }

    private func stabilize(_ sign: HandSign?) -> HandSign? {
        if let sign {
            missingCount = 0
            if sign == candidate {
                candidateCount += 1
            } else {
                candidate = sign
                candidateCount = 1
            }
            if candidateCount >= 3 { stableSign = sign }
        } else {
            missingCount += 1
            if missingCount >= 4 {
                stableSign = nil
                candidate = nil
                candidateCount = 0
            }
        }
        return stableSign
    }
}

/// Erkennt aus den 21 Handpunkten von Vision, welches Zeichen du machst.
enum HandClassifier {

    static func classify(_ obs: VNHumanHandPoseObservation) -> (HandSign?, CGPoint?) {
        guard let pts = try? obs.recognizedPoints(.all) else { return (nil, nil) }
        func p(_ j: VNHumanHandPoseObservation.JointName) -> CGPoint? {
            guard let r = pts[j], r.confidence > 0.3 else { return nil }
            return r.location
        }
        guard let wrist = p(.wrist),
              let thumbTip = p(.thumbTip), let thumbIP = p(.thumbIP),
              let indexTip = p(.indexTip), let indexPIP = p(.indexPIP), let indexMCP = p(.indexMCP),
              let middleTip = p(.middleTip), let middlePIP = p(.middlePIP), let middleMCP = p(.middleMCP),
              let ringTip = p(.ringTip), let ringPIP = p(.ringPIP),
              let littleTip = p(.littleTip), let littlePIP = p(.littlePIP)
        else { return (nil, nil) }

        let handSize = dist(wrist, middleMCP)
        guard handSize > 0.03 else { return (nil, nil) }

        /// Verhältnis: Wie weit ist die Fingerspitze vom Handgelenk weg – im Vergleich zum Mittelgelenk?
        /// Gestreckt ≈ 1.3+, eingerollt < 1.0
        func reach(_ tip: CGPoint, _ pip: CGPoint) -> CGFloat { dist(wrist, tip) / max(dist(wrist, pip), 0.001) }

        let index = reach(indexTip, indexPIP)
        let middle = reach(middleTip, middlePIP)
        let ring = reach(ringTip, ringPIP)
        let little = reach(littleTip, littlePIP)
        // Daumen steht ab, wenn die Spitze weit vom Zeigefinger-Ansatz weg ist.
        let thumbOut = dist(thumbTip, indexMCP) / handSize > 0.55 && dist(thumbTip, wrist) > dist(thumbIP, wrist)

        let indexStraight = index > 1.18
        let middleStraight = middle > 1.18
        let ringCurled = ring < 1.02
        let littleCurled = little < 1.02
        let middleCurled = middle < 1.02
        let indexCurled = index < 1.0

        // Offene Hand: alle Finger gestreckt
        if indexStraight && middleStraight && ring > 1.18 && little > 1.12 && thumbOut {
            return (.openPalm, indexTip)
        }
        // Finger-Pistole: Zeigefinger (evtl. auch Mittelfinger) zeigt, Rest eingerollt, Daumen hoch.
        // Zeigt der Finger direkt in die Kamera, wirkt er kürzer – deshalb reicht „nicht eingerollt“.
        if thumbOut && ringCurled && littleCurled && index > 1.05 && (middleCurled || middleStraight) {
            return (.gun, indexTip)
        }
        // Peace: Zeige- und Mittelfinger gestreckt, Daumen angelegt
        if indexStraight && middleStraight && ringCurled && littleCurled && !thumbOut {
            return (.peace, indexTip)
        }
        // Daumen hoch: alles eingerollt, Daumen zeigt nach oben
        if thumbOut && indexCurled && middleCurled && ringCurled && littleCurled
            && thumbTip.y > indexMCP.y + handSize * 0.3 {
            return (.thumbsUp, indexTip)
        }
        if indexCurled && middleCurled && ringCurled && littleCurled && !thumbOut {
            return (.fist, indexTip)
        }
        return (nil, indexTip)
    }

    private static func dist(_ a: CGPoint, _ b: CGPoint) -> CGFloat {
        hypot(a.x - b.x, a.y - b.y)
    }
}
