//
//  SzeneAnsicht.swift
//  Die 3D-Ansicht mit Mehrfinger-Steuerung:
//  • linke Bildschirmhälfte = linke Hand, rechte Hälfte = rechte Hand
//  • oberer Streifen = umschauen
//  Ein Finger, der liegt, ist eine Hand, die greifen kann. Zieh ihn nach
//  unten, während die Hand den Boden berührt – und du springst nach vorne.
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

    enum Rolle: Hashable { case hand(Int), blick }

    private var rollen: [ObjectIdentifier: Rolle] = [:]
    private var letzte: [ObjectIdentifier: CGPoint] = [:]
    private var kreise: [UIView] = []
    private var anzeige: CADisplayLink?

    override init(frame: CGRect, options: [String: Any]? = nil) {
        super.init(frame: frame, options: options)
        isMultipleTouchEnabled = true
        for _ in 0..<2 {
            let k = UIView(frame: CGRect(x: 0, y: 0, width: 74, height: 74))
            k.layer.cornerRadius = 37
            k.layer.borderWidth = 3
            k.layer.borderColor = UIColor.white.withAlphaComponent(0.7).cgColor
            k.backgroundColor = UIColor.white.withAlphaComponent(0.12)
            k.isUserInteractionEnabled = false
            k.isHidden = true
            addSubview(k)
            kreise.append(k)
        }
    }

    required init?(coder: NSCoder) { fatalError("nicht benutzt") }

    /// Finger-Kreise grün färben, solange die Hand irgendwo klebt.
    override func didMoveToWindow() {
        super.didMoveToWindow()
        anzeige?.invalidate()
        guard window != nil else { return }
        let l = CADisplayLink(target: self, selector: #selector(faerbeKreise))
        l.preferredFrameRateRange = CAFrameRateRange(minimum: 10, maximum: 30, preferred: 20)
        l.add(to: .main, forMode: .common)
        anzeige = l
    }

    override func removeFromSuperview() {
        anzeige?.invalidate()
        anzeige = nil
        super.removeFromSuperview()
    }

    @objc private func faerbeKreise() {
        guard let spiel else { return }
        for i in 0..<2 where !kreise[i].isHidden {
            let haftet = spiel.lokal.haende[i].haftet
            kreise[i].layer.borderColor = (haftet ? UIColor.systemGreen : UIColor.white.withAlphaComponent(0.7)).cgColor
            kreise[i].backgroundColor = (haftet ? UIColor.systemGreen.withAlphaComponent(0.25) : UIColor.white.withAlphaComponent(0.12))
        }
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let spiel else { return }
        for t in touches {
            let p = t.location(in: self)
            let id = ObjectIdentifier(t)
            let belegt = Set(rollen.values)
            var rolle: Rolle
            if p.y < bounds.height * 0.2 {
                rolle = .blick
            } else {
                rolle = .hand(p.x < bounds.midX ? 0 : 1)
                if belegt.contains(rolle) { rolle = .hand(p.x < bounds.midX ? 1 : 0) }
                if belegt.contains(rolle) { rolle = .blick }
            }
            rollen[id] = rolle
            letzte[id] = p
            if case .hand(let i) = rolle {
                spiel.handAktiv(i, true)
                kreise[i].center = p
                kreise[i].isHidden = false
            }
        }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let spiel else { return }
        let h = max(1, bounds.height)
        for t in touches {
            let id = ObjectIdentifier(t)
            guard let rolle = rollen[id], let alt = letzte[id] else { continue }
            let p = t.location(in: self)
            letzte[id] = p
            let dx = Float((p.x - alt.x) / h)
            let dy = Float((p.y - alt.y) / h)
            switch rolle {
            case .hand(let i):
                spiel.arm(i, dx: dx, dy: dy)
                kreise[i].center = p
            case .blick:
                spiel.blick(dx: dx, dy: dy)
            }
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) { beende(touches) }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) { beende(touches) }

    private func beende(_ touches: Set<UITouch>) {
        for t in touches {
            let id = ObjectIdentifier(t)
            if let rolle = rollen[id] {
                switch rolle {
                case .hand(let i):
                    spiel?.handAktiv(i, false)
                    kreise[i].isHidden = true
                case .blick:
                    spiel?.blickEnde()
                }
            }
            rollen[id] = nil
            letzte[id] = nil
        }
    }
}
