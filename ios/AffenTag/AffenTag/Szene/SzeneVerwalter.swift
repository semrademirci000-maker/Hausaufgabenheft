//
//  SzeneVerwalter.swift
//  Hält die SceneKit-Szene: Karte, Himmel, Licht, Kamera, alle Affen und Farbkugeln.
//

import SceneKit
import UIKit
import simd

final class SzeneVerwalter {
    let szene = SCNScene()
    /// Trägt die Kamera; der Halter dreht links/rechts, die Kamera selbst nur hoch/runter.
    let kamera = SCNNode()
    private let kameraHalter = SCNNode()
    private let sonne = SCNNode()
    private let umgebung = SCNNode()
    private var karte: SCNNode?
    private var affen: [String: AffeKnoten] = [:]
    private var kugeln: [Int: SCNNode] = [:]
    private let kugelMaterial = SCNMaterial()

    init() {
        let cam = SCNCamera()
        cam.fieldOfView = 78
        cam.zNear = 0.05
        cam.zFar = 250
        kamera.camera = cam
        kameraHalter.addChildNode(kamera)
        szene.rootNode.addChildNode(kameraHalter)

        let s = SCNLight()
        s.type = .directional
        sonne.light = s
        sonne.simdEulerAngles = V3(grad(-55), grad(35), 0)
        szene.rootNode.addChildNode(sonne)

        let u = SCNLight()
        u.type = .ambient
        umgebung.light = u
        szene.rootNode.addChildNode(umgebung)

        kugelMaterial.lightingModel = .lambert
    }

    func zeige(_ k: GebauteKarte) {
        karte?.removeFromParentNode()
        affen.values.forEach { $0.wurzel.removeFromParentNode() }
        affen.removeAll()
        kugeln.values.forEach { $0.removeFromParentNode() }
        kugeln.removeAll()

        karte = k.knoten
        szene.rootNode.addChildNode(k.knoten)
        let st = k.stimmung
        szene.background.contents = SzeneVerwalter.himmel(st.himmelOben, st.himmelUnten)
        szene.fogColor = st.nebel
        szene.fogStartDistance = st.nebelStart
        szene.fogEndDistance = st.nebelEnde
        umgebung.light?.intensity = st.umgebung
        umgebung.light?.color = farbe(0.85, 0.9, 1)
        sonne.light?.intensity = st.sonnenStaerke
        sonne.light?.color = st.sonne
    }

    /// Senkrechter Farbverlauf als Himmel (wird als Rundum-Bild verwendet).
    private static func himmel(_ oben: UIColor, _ unten: UIColor) -> UIImage {
        let groesse = CGSize(width: 16, height: 256)
        return UIGraphicsImageRenderer(size: groesse).image { ctx in
            let farben = [oben.cgColor, unten.cgColor, unten.cgColor] as CFArray
            if let verlauf = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: farben, locations: [0, 0.5, 1]) {
                ctx.cgContext.drawLinearGradient(verlauf, start: .zero, end: CGPoint(x: 0, y: groesse.height), options: [])
            }
        }
    }

    // MARK: Jedes Bild

    struct AffenBild {
        var affe: Affe
        var lava: Bool
        var raus: Bool
        var ballons: Int?
        var zielFarbe: V3?
    }

    func aktualisiere(affen liste: [AffenBild], kameraPosition: V3, gier: Float, neigung: Float,
                      kugeln farbkugeln: [Farbkugel], zeit: Double) {
        kameraHalter.simdPosition = kameraPosition
        kameraHalter.simdEulerAngles = V3(0, gier, 0)
        kamera.simdEulerAngles = V3(neigung, 0, 0)

        var gesehen = Set<String>()
        for bild in liste {
            gesehen.insert(bild.affe.id)
            let knoten: AffeKnoten
            if let k = affen[bild.affe.id] {
                knoten = k
            } else {
                knoten = AffeKnoten(lokal: bild.affe.istLokal)
                affen[bild.affe.id] = knoten
                szene.rootNode.addChildNode(knoten.wurzel)
            }
            knoten.aktualisiere(bild.affe, lava: bild.lava, raus: bild.raus, ballonAnzahl: bild.ballons,
                                zielFarbe: bild.zielFarbe, zeit: zeit)
        }
        for (id, k) in affen where !gesehen.contains(id) {
            k.wurzel.removeFromParentNode()
            affen[id] = nil
        }

        var kugelIDs = Set<Int>()
        for k in farbkugeln {
            kugelIDs.insert(k.id)
            let n: SCNNode
            if let vorhanden = kugeln[k.id] {
                n = vorhanden
            } else {
                let g = SCNSphere(radius: 0.09)
                g.segmentCount = 6
                let m = SCNMaterial()
                m.lightingModel = .constant
                m.diffuse.contents = farbe(CGFloat(k.farbe.x), CGFloat(k.farbe.y), CGFloat(k.farbe.z))
                g.materials = [m]
                n = SCNNode(geometry: g)
                szene.rootNode.addChildNode(n)
                kugeln[k.id] = n
            }
            n.simdPosition = k.position
        }
        for (id, n) in kugeln where !kugelIDs.contains(id) {
            n.removeFromParentNode()
            kugeln[id] = nil
        }
    }

    /// Ein kurzer Farbklecks, wenn eine Kugel trifft.
    func klecks(_ p: V3, _ f: V3) {
        let g = SCNSphere(radius: 0.25)
        g.segmentCount = 6
        let m = SCNMaterial()
        m.lightingModel = .constant
        m.diffuse.contents = farbe(CGFloat(f.x), CGFloat(f.y), CGFloat(f.z))
        g.materials = [m]
        let n = SCNNode(geometry: g)
        n.simdPosition = p
        n.simdScale = V3(1, 0.3, 1)
        szene.rootNode.addChildNode(n)
        n.runAction(.sequence([.wait(duration: 3), .fadeOut(duration: 1), .removeFromParentNode()]))
    }
}
