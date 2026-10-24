//
//  SzeneAnsicht.swift
//  Die 3D-Ansicht. Wischen irgendwo auf der Welt = umschauen.
//  Laufen, Springen und Greifen kommen von der Steuerung darüber (SteuerungView).
//

import SceneKit
import SwiftUI
import UIKit

struct SzeneAnsicht: UIViewRepresentable {
    let spiel: Spiel

    func makeUIView(context: Context) -> BeruehrungsSzene {
        let v = BeruehrungsSzene(frame: .zero, options: nil)
        v.spiel = spiel
        v.scene = spiel.szene.szene
        v.pointOfView = spiel.szene.kamera
        v.rendersContinuously = true
        v.preferredFramesPerSecond = 60
        v.antialiasingMode = .multisampling2X
        v.backgroundColor = .black
        v.isJitteringEnabled = false
        return v
    }

    func updateUIView(_ uiView: BeruehrungsSzene, context: Context) {}
}

final class BeruehrungsSzene: SCNView {
    weak var spiel: Spiel?
    private var letzte: [ObjectIdentifier: CGPoint] = [:]

    override init(frame: CGRect, options: [String: Any]? = nil) {
        super.init(frame: frame, options: options)
        isMultipleTouchEnabled = true
    }

    required init?(coder: NSCoder) { fatalError("nicht benutzt") }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches { letzte[ObjectIdentifier(t)] = t.location(in: self) }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        let h = max(1, bounds.height)
        for t in touches {
            let id = ObjectIdentifier(t)
            guard let alt = letzte[id] else { continue }
            let p = t.location(in: self)
            letzte[id] = p
            spiel?.blick(dx: Float((p.x - alt.x) / h), dy: Float((p.y - alt.y) / h))
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) { beende(touches) }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) { beende(touches) }

    private func beende(_ touches: Set<UITouch>) {
        for t in touches { letzte[ObjectIdentifier(t)] = nil }
        spiel?.blickEnde()
    }
}
