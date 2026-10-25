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
    /// Pro Hand: drei Finger (zwei vorne, ein Daumen), jeweils die Gelenke von innen nach außen
    private var finger: [[(gelenke: [SCNNode], daumen: Bool)]] = [[], []]
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
    private let handMat = SCNMaterial()

    init(lokal: Bool) {
        for m in [fell, lava, gesichtMat] { m.lightingModel = .lambert }
        // Gorilla-Tag-Stil: einfarbig und matt, Hände in derselben Farbe, nur dunkler
        handMat.lightingModel = .lambert
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

        wurzel.addChildNode(koerper)

        for i in 0..<2 {
            // Oberarm und Unterarm (leicht konisch), dazwischen der Ellbogen
            let ober = SCNCone(topRadius: 0.054, bottomRadius: 0.068, height: 1)
            ober.radialSegmentCount = 7
            ober.materials = [fell]
            let o = SCNNode(geometry: ober)
            wurzel.addChildNode(o)
            oberarme.append(o)

            let unter = SCNCone(topRadius: 0.062, bottomRadius: 0.055, height: 1)
            unter.radialSegmentCount = 7
            unter.materials = [fell]
            let a = SCNNode(geometry: unter)
            wurzel.addChildNode(a)
            arme.append(a)

            let e = SCNSphere(radius: 0.058)
            e.segmentCount = 6
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
        if lokal {
            // Den eigenen Körper sieht die Kamera nicht – nur der Spiegel zeigt ihn.
            koerper.enumerateHierarchy { n, _ in
                n.categoryBitMask = AffeKnoten.nurImSpiegel
                n.castsShadow = false
            }
        }
    }

    /// Kategorie für Knoten, die nur in Spiegeln erscheinen.
    static let nurImSpiegel = 1 << 4

    /// Wie fest jede Hand zugreift (0 = offen, 1 = Faust) und woran sie sich hält.
    var griff: [Float] = []
    var haftNormalen: [V3] = [V3(0, 1, 0), V3(0, 1, 0)]

    private func setzeGlied(_ n: SCNNode, von a: V3, bis b: V3) {
        let weg = b - a
        let l = max(0.02, simd_length(weg))
        n.simdPosition = a + weg / 2
        let g = Affenkoerper.groesse * 0.85
        n.simdScale = V3(g, l, g)
        // Kegel: oben (+y) ist das schmale Ende → zeigt zur Hand
        n.simdOrientation = simd_quatf(from: V3(0, 1, 0), to: weg / l)
    }

    /// Gorilla-Hand: kantige, flache Handfläche (kein Kreis), drei lange Finger – zwei vorne, ein abgespreizter Daumen.
    private func gorillaHand(links: Bool, index: Int) -> SCNNode {
        // Kompakte Gorilla-Hand: breite Handfläche, zwei kurze dicke Finger dicht beieinander, Daumen an der Seite
        let g = SCNNode()
        let sf: Float = links ? -1 : 1
        func kasten(_ b: CGFloat, _ h: CGFloat, _ t: CGFloat, _ r: CGFloat) -> SCNBox {
            let k = SCNBox(width: b, height: h, length: t, chamferRadius: r)
            k.chamferSegmentCount = 1
            k.materials = [handMat]
            return k
        }
        let flaeche = SCNNode(geometry: kasten(0.13, 0.058, 0.12, 0.02))
        flaeche.simdPosition = V3(0, 0, -0.058)
        g.addChildNode(flaeche)

        func baueFinger(_ start: V3, _ drehung: Float, _ laengen: [Float], breite: CGFloat, hoehe: CGFloat, daumen: Bool) {
            let wurzel = SCNNode()
            wurzel.simdPosition = start
            wurzel.simdEulerAngles = V3(0, drehung, 0)
            var eltern = wurzel
            var gelenke: [SCNNode] = []
            for (k, l) in laengen.enumerated() {
                let gelenk = SCNNode()
                let schmaler = 1 - CGFloat(k) * 0.06
                let teil = SCNNode(geometry: kasten(breite * schmaler, hoehe * schmaler, CGFloat(l) + 0.012, 0.014))
                teil.simdPosition = V3(0, 0, -l / 2)
                gelenk.addChildNode(teil)
                if k > 0 { gelenk.simdPosition = V3(0, 0, -laengen[k - 1]) }
                eltern.addChildNode(gelenk)
                eltern = gelenk
                gelenke.append(gelenk)
            }
            g.addChildNode(wurzel)
            finger[index].append((gelenke: gelenke, daumen: daumen))
        }
        baueFinger(V3(-0.031 * sf, -0.002, -0.112), 0.03 * sf, [0.046, 0.038, 0.03], breite: 0.054, hoehe: 0.048, daumen: false)
        baueFinger(V3(0.031 * sf, -0.002, -0.112), -0.03 * sf, [0.044, 0.036, 0.028], breite: 0.052, hoehe: 0.047, daumen: false)
        baueFinger(V3(-0.066 * sf, -0.006, -0.045), 0.75 * sf, [0.04, 0.032], breite: 0.044, hoehe: 0.042, daumen: true)
        g.simdScale = V3(repeating: 1.55)
        return g
    }

    func aktualisiere(_ a: Affe, lava istJetztLava: Bool, raus: Bool, ballonAnzahl: Int?, zielFarbe: V3?, zeit: Double) {
        wurzel.simdPosition = a.position
        koerper.simdEulerAngles = V3(0, a.gier, 0)

        if fellFarbe != a.farbe {
            fellFarbe = a.farbe
            let fr = CGFloat(0.03 + a.farbe.x * 0.55), fg = CGFloat(0.03 + a.farbe.y * 0.55), fb = CGFloat(0.03 + a.farbe.z * 0.55)
            fell.diffuse.contents = farbe(fr, fg, fb)
            handMat.diffuse.contents = farbe(fr * 0.6, fg * 0.6, fb * 0.6)
        }
        if istJetztLava != istLava {
            istLava = istJetztLava
            let m = istLava ? lava : fell
            for n in [kopf] + oberarme + arme + ellbogen { n.geometry?.materials = [m] }
            for h in haende { h.enumerateHierarchy { n, _ in n.geometry?.materials = [istLava ? lava : handMat] } }
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
            let knick = drehY(V3(i == 0 ? -0.12 : 0.12, -0.1, 0), a.gier) * ((max(0, 1 - l / Affenkoerper.armLaenge) * 2 + 0.25) * Affenkoerper.groesse)
            let e = s + weg * 0.5 + knick
            ellbogen[i].simdPosition = e
            setzeGlied(oberarme[i], von: s, bis: e)
            setzeGlied(arme[i], von: e, bis: h)

            // Handfläche liegt flach auf der Fläche, Finger zeigen nach vorne – so sieht man sie
            let haelt = griff.indices.contains(i) && griff[i] > 0.9
            let oben = haelt ? haftNormalen[i] : V3(0, 1, 0)
            var vor = richtung - oben * simd_dot(richtung, oben)
            if simd_length(vor) < 0.1 { vor = vorne(a.gier) - oben * simd_dot(vorne(a.gier), oben) }
            vor = simd_normalize(vor)
            if !haelt { vor = simd_normalize(vor * 0.75 + richtung * 0.25) }
            let hand = haende[i]
            let gr = Affenkoerper.groesse
            hand.simdScale = V3(repeating: 1.6 * gr)
            ellbogen[i].simdScale = V3(repeating: gr * 0.85)
            hand.simdPosition = h + oben * (0.06 * gr) - vor * (0.04 * gr)
            hand.simdLook(at: a.position + hand.simdPosition + vor, up: oben, localFront: V3(0, 0, -1))
            // Am Boden liegen die Finger flach; an Ästen und Wänden greifen sie zu
            let krumm: Float = haelt ? (oben.y > 0.7 ? 0.05 : 1.0) : (griff.indices.contains(i) && griff[i] > 0.5 ? 0.3 : -0.12)
            for f in finger[i] {
                for (j, gelenk) in f.gelenke.enumerated() {
                    let ziel = f.daumen ? -krumm * (j > 0 ? 0.9 : 0.5) : -krumm * [0.55, 0.8, 0.7][min(j, 2)]
                    gelenk.eulerAngles.x += (ziel - gelenk.eulerAngles.x) * 0.3
                }
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
