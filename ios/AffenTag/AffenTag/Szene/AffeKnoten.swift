//
//  AffeKnoten.swift
//  So sieht ein Affe aus: runder Körper, Kopf mit hellem Gesicht, lange Arme.
//  Lava-Affen glühen orange, ausgeschiedene sind durchsichtig.
//

import SceneKit
import UIKit
import simd

final class AffeKnoten {
    let wurzel = SCNNode()
    private let koerper = SCNNode()
    private let kopf = SCNNode()
    private let kopfSchmuck = SCNNode()
    private let namensSchild = SCNNode()
    private var oberarme: [SCNNode] = []
    private var arme: [SCNNode] = []
    private var ellbogen: [SCNNode] = []
    private var haende: [SCNNode] = []
    private var finger: [[(SCNNode, SCNNode)]] = [[], []]
    private let haut = SCNMaterial()
    private var ballons: [SCNNode] = []
    private let zielBand = SCNNode()

    private let fell = SCNMaterial()
    private let lava = SCNMaterial()
    private let gesichtMat = SCNMaterial()

    private var name = ""
    private var hutID: String?
    private var gesichtID: String?
    private var istLava = false
    private var istRaus = false
    private var fellFarbe = V3(-1, -1, -1)

    init(lokal: Bool) {
        for m in [fell, lava, gesichtMat, haut] { m.lightingModel = .lambert }
        fell.diffuse.contents = Texturen.bild(.fell)
        fell.diffuse.wrapS = .repeat
        fell.diffuse.wrapT = .repeat
        haut.diffuse.contents = farbe(0.15, 0.14, 0.13)
        lava.diffuse.contents = farbe(1, 0.42, 0.08)
        lava.emission.contents = farbe(0.9, 0.25, 0.02)
        gesichtMat.diffuse.contents = farbe(0.85, 0.72, 0.58)

        // Körper und Kopf (nur bei den anderen sichtbar – du bist ja die Kamera)
        let bauch = SCNSphere(radius: 0.3)
        bauch.segmentCount = 10
        bauch.materials = [fell]
        let bauchKnoten = SCNNode(geometry: bauch)
        bauchKnoten.simdScale = V3(1, 1.1, 0.9)
        bauchKnoten.simdPosition = V3(0, -0.12, 0.02)
        koerper.addChildNode(bauchKnoten)

        let kopfKugel = SCNSphere(radius: 0.2)
        kopfKugel.segmentCount = 10
        kopfKugel.materials = [fell]
        kopf.geometry = kopfKugel
        kopf.simdPosition = V3(0, 0.26, -0.03)
        koerper.addChildNode(kopf)

        let gesicht = SCNSphere(radius: 0.15)
        gesicht.segmentCount = 10
        gesicht.materials = [gesichtMat]
        let gesichtKnoten = SCNNode(geometry: gesicht)
        gesichtKnoten.simdPosition = V3(0, -0.03, -0.1)
        gesichtKnoten.simdScale = V3(1, 0.8, 0.6)
        kopf.addChildNode(gesichtKnoten)

        let schwarz = SCNMaterial()
        schwarz.diffuse.contents = UIColor.black
        for x in [-0.065, 0.065] as [Float] {
            let auge = SCNSphere(radius: 0.032)
            auge.segmentCount = 6
            auge.materials = [schwarz]
            let a = SCNNode(geometry: auge)
            a.simdPosition = V3(x, 0.04, -0.17)
            kopf.addChildNode(a)
            let ohr = SCNSphere(radius: 0.06)
            ohr.segmentCount = 6
            ohr.materials = [fell]
            let o = SCNNode(geometry: ohr)
            o.simdPosition = V3(x * 3, 0.0, 0)
            o.simdScale = V3(0.6, 1, 1)
            kopf.addChildNode(o)
        }
        kopf.addChildNode(kopfSchmuck)

        if lokal { koerper.isHidden = true }
        wurzel.addChildNode(koerper)

        for i in 0..<2 {
            // Oberarm und Unterarm (leicht konisch), dazwischen der Ellbogen
            let ober = SCNCone(topRadius: 0.07, bottomRadius: 0.085, height: 1)
            ober.radialSegmentCount = 10
            ober.materials = [fell]
            let o = SCNNode(geometry: ober)
            wurzel.addChildNode(o)
            oberarme.append(o)

            let unter = SCNCone(topRadius: 0.05, bottomRadius: 0.072, height: 1)
            unter.radialSegmentCount = 10
            unter.materials = [fell]
            let a = SCNNode(geometry: unter)
            wurzel.addChildNode(a)
            arme.append(a)

            let e = SCNSphere(radius: 0.072)
            e.segmentCount = 10
            e.materials = [fell]
            let en = SCNNode(geometry: e)
            wurzel.addChildNode(en)
            ellbogen.append(en)

            let h = gorillaHand(links: i == 0, index: i)
            wurzel.addChildNode(h)
            haende.append(h)
        }
        for n in oberarme + arme + ellbogen + haende {
            n.castsShadow = true
            // Die eigenen Arme nicht in der Kamera abschneiden lassen
            if lokal { n.renderingOrder = 10 }
        }

        let band = SCNTorus(ringRadius: 0.085, pipeRadius: 0.025)
        band.materials = [SCNMaterial()]
        band.firstMaterial?.lightingModel = .constant
        zielBand.geometry = band
        zielBand.isHidden = true
        haende[0].addChildNode(zielBand)

        for i in 0..<3 {
            let ballon = SCNSphere(radius: 0.16)
            ballon.segmentCount = 8
            let m = SCNMaterial()
            m.lightingModel = .lambert
            ballon.materials = [m]
            let n = SCNNode(geometry: ballon)
            n.simdScale = V3(1, 1.2, 1)
            n.simdPosition = V3(Float(i - 1) * 0.25, 0.85, 0.15)
            n.isHidden = true
            if lokal { n.isHidden = true }
            koerper.addChildNode(n)
            ballons.append(n)
        }

        namensSchild.constraints = [SCNBillboardConstraint()]
        namensSchild.simdPosition = V3(0, 0.75, 0)
        if !lokal { wurzel.addChildNode(namensSchild) }
    }

    /// Wie fest jede Hand zugreift (0 = offen, 1 = Faust) und woran sie sich hält.
    var griff: [Float] = []
    var haftNormalen: [V3] = [V3(0, 1, 0), V3(0, 1, 0)]

    private func setzeGlied(_ n: SCNNode, von a: V3, bis b: V3) {
        let weg = b - a
        let l = max(0.02, simd_length(weg))
        n.simdPosition = a + weg / 2
        n.simdScale = V3(1, l, 1)
        // Kegel: oben (+y) ist das schmale Ende → zeigt zur Hand
        n.simdOrientation = simd_quatf(from: V3(0, 1, 0), to: weg / l)
    }

    /// Gorilla-Hand: Handrücken mit Fell, dunkle Handfläche, vier Finger mit Gelenk, Daumen.
    private func gorillaHand(links: Bool, index: Int) -> SCNNode {
        let g = SCNNode()
        let s: Float = links ? -1 : 1
        func block(_ b: V3, _ m: SCNMaterial) -> SCNNode {
            let geo = SCNBox(width: CGFloat(b.x), height: CGFloat(b.y), length: CGFloat(b.z), chamferRadius: CGFloat(min(b.x, b.y) * 0.35))
            geo.materials = [m]
            return SCNNode(geometry: geo)
        }
        let ruecken = block(V3(0.12, 0.05, 0.13), fell)
        ruecken.simdPosition = V3(0, 0.006, 0)
        g.addChildNode(ruecken)
        let ballen = block(V3(0.112, 0.03, 0.12), haut)
        ballen.simdPosition = V3(0, -0.025, 0)
        g.addChildNode(ballen)
        for k in 0..<4 {
            let f = SCNNode()
            f.simdPosition = V3((-0.045 + Float(k) * 0.03) * s, -0.004, -0.064)
            let glied1 = block(V3(0.027, 0.032, 0.06), fell)
            glied1.simdPosition = V3(0, 0, -0.03)
            f.addChildNode(glied1)
            let gelenk = SCNNode()
            gelenk.simdPosition = V3(0, 0, -0.058)
            let glied2 = block(V3(0.025, 0.028, 0.05), haut)
            glied2.simdPosition = V3(0, 0, -0.024)
            gelenk.addChildNode(glied2)
            f.addChildNode(gelenk)
            g.addChildNode(f)
            finger[index].append((f, gelenk))
        }
        let daumen = SCNNode()
        daumen.simdPosition = V3(-0.065 * s, -0.01, -0.01)
        daumen.simdEulerAngles = V3(0, 0.35 * s, 0)
        let d = block(V3(0.03, 0.03, 0.06), haut)
        d.simdPosition = V3(0, 0, -0.03)
        daumen.addChildNode(d)
        g.addChildNode(daumen)
        g.simdScale = V3(repeating: 1.35)
        return g
    }

    func aktualisiere(_ a: Affe, lava istJetztLava: Bool, raus: Bool, ballonAnzahl: Int?, zielFarbe: V3?, zeit: Double) {
        wurzel.simdPosition = a.position
        koerper.simdEulerAngles = V3(0, a.gier, 0)

        if fellFarbe != a.farbe {
            fellFarbe = a.farbe
            fell.multiply.contents = farbe(CGFloat(0.06 + a.farbe.x * 0.9), CGFloat(0.06 + a.farbe.y * 0.9), CGFloat(0.06 + a.farbe.z * 0.9))
        }
        if istJetztLava != istLava {
            istLava = istJetztLava
            let m = istLava ? lava : fell
            for n in [kopf] + oberarme + arme + ellbogen { n.geometry?.materials = [m] }
            for h in haende { h.childNodes.first?.geometry?.materials = [m] }
            koerper.childNodes.first?.geometry?.materials = [m]
        }
        if istLava {
            let puls = 0.7 + 0.3 * sin(zeit * 6)
            lava.emission.intensity = CGFloat(puls)
        }
        if raus != istRaus {
            istRaus = raus
            wurzel.opacity = raus ? 0.3 : 1
        }
        if a.name != name {
            name = a.name
            baueNamen()
        }
        if a.hut != hutID || a.gesicht != gesichtID {
            hutID = a.hut
            gesichtID = a.gesicht
            kopfSchmuck.childNodes.forEach { $0.removeFromParentNode() }
            if let h = Kosmetik.mit(a.hut) { kopfSchmuck.addChildNode(KosmetikBauer.knoten(h)) }
            if let g = Kosmetik.mit(a.gesicht) { kopfSchmuck.addChildNode(KosmetikBauer.knoten(g)) }
        }

        // Arme: Schulter → Ellbogen → Hand
        for i in 0..<2 {
            var schulter = Affenkoerper.schulter
            if i == 0 { schulter.x = -schulter.x }
            let s = drehY(schulter, a.gier)
            let h = a.haende[i] - a.position
            let weg = h - s
            let l = max(0.05, simd_length(weg))
            let richtung = weg / l
            // Ellbogen leicht nach außen-unten geknickt – je näher die Hand, desto mehr
            let knick = drehY(V3(i == 0 ? -0.12 : 0.12, -0.1, 0), a.gier) * (max(0, 1 - l / Affenkoerper.armLaenge) * 2 + 0.25)
            let e = s + weg * 0.5 + knick
            ellbogen[i].simdPosition = e
            setzeGlied(oberarme[i], von: s, bis: e)
            setzeGlied(arme[i], von: e, bis: h)

            let hand = haende[i]
            hand.simdPosition = h + richtung * 0.04
            var oben = griff.indices.contains(i) && griff[i] > 0.9 ? haftNormalen[i] : V3(0, 1, 0)
            if abs(simd_dot(oben, richtung)) > 0.92 { oben = vorne(a.gier) }
            hand.simdLook(at: a.position + h + richtung, up: oben, localFront: V3(0, 0, -1))
            let krumm = griff.indices.contains(i) ? griff[i] : 0.4
            for (f, g) in finger[i] {
                f.eulerAngles.x += (Float(-krumm * 0.7) - f.eulerAngles.x) * 0.3
                g.eulerAngles.x += (Float(-krumm * 1.1) - g.eulerAngles.x) * 0.3
            }
        }

        if let b = ballonAnzahl {
            for (i, n) in ballons.enumerated() {
                n.isHidden = i >= b
                n.geometry?.firstMaterial?.diffuse.contents = farbe(CGFloat(a.farbe.x), CGFloat(a.farbe.y), CGFloat(a.farbe.z))
                n.simdPosition.y = 0.85 + Float(sin(zeit * 2 + Double(i))) * 0.04
            }
        } else {
            ballons.forEach { $0.isHidden = true }
        }

        if let z = zielFarbe {
            zielBand.isHidden = false
            zielBand.geometry?.firstMaterial?.diffuse.contents = farbe(CGFloat(z.x), CGFloat(z.y), CGFloat(z.z))
        } else {
            zielBand.isHidden = true
        }
    }

    private func baueNamen() {
        namensSchild.childNodes.forEach { $0.removeFromParentNode() }
        let t = SCNText(string: name, extrusionDepth: 0)
        t.font = UIFont.systemFont(ofSize: 10, weight: .bold)
        t.flatness = 0.4
        let m = SCNMaterial()
        m.lightingModel = .constant
        m.diffuse.contents = UIColor.white
        t.materials = [m]
        let n = SCNNode(geometry: t)
        let (lo, hi) = n.boundingBox
        n.pivot = SCNMatrix4MakeTranslation((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, 0)
        n.scale = SCNVector3(0.016, 0.016, 0.016)
        namensSchild.addChildNode(n)
    }
}

// MARK: - Hüte und Brillen

enum KosmetikBauer {
    private static func mat(_ f: UIColor, leuchten: Bool = false) -> SCNMaterial {
        let m = SCNMaterial()
        m.lightingModel = .lambert
        m.diffuse.contents = f
        if leuchten { m.emission.contents = f }
        return m
    }

    private static func teil(_ g: SCNGeometry, _ f: UIColor, _ p: V3, drehung: V3 = .zero, skala: V3 = V3(1, 1, 1), leuchten: Bool = false) -> SCNNode {
        g.materials = [mat(f, leuchten: leuchten)]
        let n = SCNNode(geometry: g)
        n.simdPosition = p
        n.simdEulerAngles = drehung
        n.simdScale = skala
        return n
    }

    static func knoten(_ k: Kosmetik) -> SCNNode {
        let n = SCNNode()
        let oben: Float = 0.18
        switch k.id {
        case "banane":
            let gelb = farbe(1, 0.88, 0.2)
            n.addChildNode(teil(SCNCapsule(capRadius: 0.05, height: 0.36), gelb, V3(0, oben + 0.05, 0), drehung: V3(0, 0, 1.2)))
            n.addChildNode(teil(SCNCylinder(radius: 0.015, height: 0.05), farbe(0.4, 0.3, 0.1), V3(0.17, oben + 0.12, 0)))
        case "party":
            n.addChildNode(teil(SCNCone(topRadius: 0, bottomRadius: 0.1, height: 0.28), farbe(0.95, 0.3, 0.7), V3(0, oben + 0.13, 0)))
            n.addChildNode(teil(SCNSphere(radius: 0.03), farbe(1, 0.9, 0.2), V3(0, oben + 0.28, 0)))
        case "krone":
            let gold = farbe(1, 0.8, 0.2)
            n.addChildNode(teil(SCNCylinder(radius: 0.12, height: 0.08), gold, V3(0, oben + 0.02, 0)))
            for i in 0..<5 {
                let a = Float(i) * 2 * .pi / 5
                n.addChildNode(teil(SCNCone(topRadius: 0, bottomRadius: 0.035, height: 0.09), gold, V3(sin(a) * 0.1, oben + 0.1, cos(a) * 0.1)))
            }
            n.addChildNode(teil(SCNSphere(radius: 0.025), farbe(0.9, 0.1, 0.2), V3(0, oben + 0.03, -0.12), leuchten: true))
        case "cowboy":
            let braun = farbe(0.55, 0.35, 0.18)
            n.addChildNode(teil(SCNCylinder(radius: 0.24, height: 0.02), braun, V3(0, oben, 0)))
            n.addChildNode(teil(SCNCylinder(radius: 0.12, height: 0.14), braun, V3(0, oben + 0.07, 0)))
        case "muetze":
            n.addChildNode(teil(SCNCone(topRadius: 0.02, bottomRadius: 0.15, height: 0.25), farbe(0.85, 0.1, 0.1), V3(0.03, oben + 0.1, 0), drehung: V3(0, 0, -0.4)))
            n.addChildNode(teil(SCNTorus(ringRadius: 0.15, pipeRadius: 0.035), .white, V3(0, oben - 0.02, 0)))
            n.addChildNode(teil(SCNSphere(radius: 0.04), .white, V3(0.13, oben + 0.18, 0)))
        case "pilz":
            n.addChildNode(teil(SCNSphere(radius: 0.2), farbe(0.85, 0.12, 0.1), V3(0, oben + 0.02, 0), skala: V3(1, 0.5, 1)))
            for p in [V3(0.08, oben + 0.1, 0.05), V3(-0.1, oben + 0.08, -0.04), V3(0, oben + 0.11, -0.1)] {
                n.addChildNode(teil(SCNSphere(radius: 0.03), .white, p))
            }
        case "propeller":
            let bunt = [farbe(1, 0.2, 0.2), farbe(0.2, 0.5, 1), farbe(1, 0.85, 0.2)]
            n.addChildNode(teil(SCNSphere(radius: 0.17), bunt[1], V3(0, oben - 0.04, 0), skala: V3(1, 0.5, 1)))
            let prop = SCNNode()
            prop.simdPosition = V3(0, oben + 0.08, 0)
            prop.addChildNode(teil(SCNBox(width: 0.34, height: 0.01, length: 0.05, chamferRadius: 0), bunt[0], .zero))
            prop.addChildNode(teil(SCNBox(width: 0.05, height: 0.01, length: 0.34, chamferRadius: 0), bunt[2], .zero))
            prop.runAction(.repeatForever(.rotateBy(x: 0, y: .pi * 2, z: 0, duration: 0.4)))
            n.addChildNode(prop)
        case "heiligenschein":
            n.addChildNode(teil(SCNTorus(ringRadius: 0.13, pipeRadius: 0.02), farbe(1, 0.95, 0.5), V3(0, oben + 0.15, 0), leuchten: true))
        case "blumen":
            let f = [farbe(1, 0.95, 0.3), farbe(1, 0.5, 0.7), farbe(0.6, 0.6, 1), .white]
            for i in 0..<8 {
                let a = Float(i) * 2 * .pi / 8
                n.addChildNode(teil(SCNSphere(radius: 0.035), f[i % 4], V3(sin(a) * 0.16, oben - 0.02, cos(a) * 0.16)))
            }
        case "zylinder":
            n.addChildNode(teil(SCNCylinder(radius: 0.2, height: 0.015), .black, V3(0, oben, 0)))
            n.addChildNode(teil(SCNCylinder(radius: 0.12, height: 0.24), .black, V3(0, oben + 0.12, 0)))
            n.addChildNode(teil(SCNCylinder(radius: 0.122, height: 0.04), farbe(0.8, 0.1, 0.1), V3(0, oben + 0.04, 0)))
        case "sonnenbrille", "nerdbrille", "maske":
            let f: UIColor = k.id == "sonnenbrille" ? .black : (k.id == "maske" ? farbe(0.2, 0.7, 0.9, 0.7) : farbe(0.1, 0.1, 0.1))
            for x in [-0.065, 0.065] as [Float] {
                let glas = k.id == "nerdbrille" ? SCNTorus(ringRadius: 0.045, pipeRadius: 0.01) as SCNGeometry
                                                 : SCNBox(width: 0.09, height: 0.06, length: 0.02, chamferRadius: 0.01)
                n.addChildNode(teil(glas, f, V3(x, 0.04, -0.2), drehung: k.id == "nerdbrille" ? V3(.pi / 2, 0, 0) : .zero))
            }
            n.addChildNode(teil(SCNBox(width: 0.06, height: 0.012, length: 0.012, chamferRadius: 0), f, V3(0, 0.05, -0.2)))
            if k.id == "maske" {
                n.addChildNode(teil(SCNTorus(ringRadius: 0.19, pipeRadius: 0.012), .black, V3(0, 0.04, 0)))
            }
        case "schnurrbart":
            for x in [-0.045, 0.045] as [Float] {
                n.addChildNode(teil(SCNCapsule(capRadius: 0.018, height: 0.09), farbe(0.2, 0.12, 0.05), V3(x, -0.07, -0.19), drehung: V3(0, 0, x > 0 ? 1.2 : -1.2)))
            }
        default:
            break
        }
        return n
    }
}
