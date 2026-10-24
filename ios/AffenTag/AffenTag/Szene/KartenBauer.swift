//
//  KartenBauer.swift
//  Baut gleichzeitig das Bild (SceneKit-Knoten) und die Welt zum Festhalten.
//  Alles bewusst kantig und einfarbig – der typische Low-Poly-Look.
//

import SceneKit
import UIKit

func farbe(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> UIColor {
    UIColor(red: r, green: g, blue: b, alpha: a)
}

extension UIColor {
    /// Zufällig etwas heller/dunkler, damit nicht alles gleich aussieht.
    func variiert(_ w: inout Wuerfel, _ staerke: Float = 0.08) -> UIColor {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        getRed(&r, green: &g, blue: &b, alpha: &a)
        let f = CGFloat(w.zahl(1 - staerke, 1 + staerke))
        return UIColor(red: min(1, r * f), green: min(1, g * f), blue: min(1, b * f), alpha: a)
    }
}

final class KartenBauer {
    let welt = Welt()
    /// Unbewegliche Teile – werden am Ende zu einem einzigen Knoten verschmolzen.
    let statisch = SCNNode()
    /// Lichter, Schilder, Teilchen – bleiben einzeln.
    let lebendig = SCNNode()
    var w: Wuerfel

    init(saat: UInt64) { w = Wuerfel(saat) }

    private var cache: [String: SCNMaterial] = [:]

    func material(_ f: UIColor, leuchten: Bool = false) -> SCNMaterial {
        let schluessel = "\(f.description)|\(leuchten)"
        if let m = cache[schluessel] { return m }
        let m = SCNMaterial()
        m.lightingModel = .lambert
        m.diffuse.contents = f
        if leuchten { m.emission.contents = f }
        var a: CGFloat = 1
        f.getRed(nil, green: nil, blue: nil, alpha: &a)
        if a < 1 {
            m.transparency = a
            m.blendMode = .alpha
            m.writesToDepthBuffer = false
        }
        cache[schluessel] = m
        return m
    }

    /// Material mit Oberfläche (Holz, Rinde, Gras …). `su`/`sv` = wie oft die Textur
    /// sich wiederholt – so ist sie überall etwa gleich groß (eine Kachel ≈ 2 m).
    func material(_ f: UIColor, art: TexturArt?, su: Float, sv: Float) -> SCNMaterial {
        guard let art else { return material(f) }
        let u = max(1, (su * 2).rounded() / 2), v = max(1, (sv * 2).rounded() / 2)
        let schluessel = "\(f.description)|\(art.rawValue)|\(u)|\(v)"
        if let m = cache[schluessel] { return m }
        let m = SCNMaterial()
        m.lightingModel = .lambert
        m.diffuse.contents = Texturen.bild(art)
        m.diffuse.wrapS = .repeat
        m.diffuse.wrapT = .repeat
        m.diffuse.mipFilter = .linear
        m.diffuse.contentsTransform = SCNMatrix4MakeScale(u, v, 1)
        m.multiply.contents = f
        cache[schluessel] = m
        return m
    }

    // MARK: Grundformen

    @discardableResult
    func kiste(_ mitte: V3, _ groesse: V3, _ f: UIColor, _ mat: Material,
               gier: Float = 0, fest: Bool = true, leuchten: Bool = false) -> SCNNode {
        let g = SCNBox(width: CGFloat(groesse.x), height: CGFloat(groesse.y), length: CGFloat(groesse.z), chamferRadius: 0)
        var a: CGFloat = 1
        f.getRed(nil, green: nil, blue: nil, alpha: &a)
        if !leuchten, a >= 1, let art = TexturArt.fuer(mat) {
            // vorne, rechts, hinten, links, oben, unten
            let (x, y, z) = (groesse.x / 2, groesse.y / 2, groesse.z / 2)
            g.materials = [(x, y), (z, y), (x, y), (z, y), (x, z), (x, z)].map { material(f, art: art, su: $0.0, sv: $0.1) }
        } else {
            g.materials = [material(f, leuchten: leuchten)]
        }
        let n = SCNNode(geometry: g)
        n.simdPosition = mitte
        n.simdEulerAngles = V3(0, gier, 0)
        statisch.addChildNode(n)
        if fest { welt.dazu(Koerper(mitte: mitte, form: .kiste(halb: groesse / 2, gier: gier), material: mat)) }
        return n
    }

    /// Senkrechter Zylinder, `fuss` ist die Mitte der Unterseite.
    @discardableResult
    func zylinder(_ fuss: V3, radius: Float, hoehe: Float, _ f: UIColor, _ mat: Material,
                  seiten: Int = 7, fest: Bool = true, textur: TexturArt? = nil) -> SCNNode {
        let g = SCNCylinder(radius: CGFloat(radius), height: CGFloat(hoehe))
        g.radialSegmentCount = max(seiten, 10)
        let art: TexturArt? = textur ?? (mat == .holz ? (hoehe > radius * 2.5 ? TexturArt.rinde : TexturArt.holz) : TexturArt.fuer(mat))
        if art == .ringe {
            g.materials = [material(f, art: .holz, su: .pi * radius, sv: hoehe / 2), material(f, art: .ringe, su: 1, sv: 1),
                           material(f, art: .ringe, su: 1, sv: 1)]
        } else {
            g.materials = [material(f, art: art, su: .pi * radius, sv: hoehe / 2), material(f, art: art, su: radius, sv: radius),
                           material(f, art: art, su: radius, sv: radius)]
        }
        let n = SCNNode(geometry: g)
        let mitte = fuss + V3(0, hoehe / 2, 0)
        n.simdPosition = mitte
        statisch.addChildNode(n)
        if fest { welt.dazu(Koerper(mitte: mitte, form: .zylinder(radius: radius, halbeHoehe: hoehe / 2), material: mat)) }
        return n
    }

    @discardableResult
    func kugel(_ mitte: V3, radius: Float, _ f: UIColor, _ mat: Material,
               fest: Bool = true, stauchung: V3 = V3(1, 1, 1), leuchten: Bool = false) -> SCNNode {
        let g = SCNSphere(radius: CGFloat(radius))
        g.segmentCount = 12
        g.materials = [leuchten ? material(f, leuchten: true) : material(f, art: TexturArt.fuer(mat), su: .pi * radius, sv: radius)]
        let n = SCNNode(geometry: g)
        n.simdPosition = mitte
        n.simdScale = stauchung
        statisch.addChildNode(n)
        if fest {
            let r = radius * min(stauchung.x, min(stauchung.y, stauchung.z))
            if stauchung == V3(1, 1, 1) {
                welt.dazu(Koerper(mitte: mitte, form: .kugel(radius: r), material: mat))
            } else {
                // Abgeflachte Kugel (Baumkrone, Wolke) als flacher Zylinder fühlen.
                welt.dazu(Koerper(mitte: mitte, form: .zylinder(radius: radius * min(stauchung.x, stauchung.z) * 0.92,
                                                                halbeHoehe: radius * stauchung.y * 0.8), material: mat))
            }
        }
        return n
    }

    /// Kegel (Tannen, Tropfsteine). Festhalten kann man sich am inneren Kern.
    @discardableResult
    func kegel(_ fuss: V3, radius: Float, hoehe: Float, _ f: UIColor, _ mat: Material,
               fest: Bool = true, seiten: Int = 7, kopfueber: Bool = false) -> SCNNode {
        let g = SCNCone(topRadius: 0, bottomRadius: CGFloat(radius), height: CGFloat(hoehe))
        g.radialSegmentCount = max(seiten, 8)
        g.materials = [material(f, art: TexturArt.fuer(mat), su: .pi * radius, sv: hoehe / 2)]
        let n = SCNNode(geometry: g)
        let mitte = fuss + V3(0, kopfueber ? -hoehe / 2 : hoehe / 2, 0)
        n.simdPosition = mitte
        if kopfueber { n.simdEulerAngles = V3(.pi, 0, 0) }
        statisch.addChildNode(n)
        if fest {
            let kern = V3(mitte.x, fuss.y + (kopfueber ? -hoehe * 0.3 : hoehe * 0.3), mitte.z)
            welt.dazu(Koerper(mitte: kern, form: .zylinder(radius: radius * 0.55, halbeHoehe: hoehe * 0.3), material: mat))
        }
        return n
    }

    /// Ein Brett / eine Brücke von a nach b.
    func bruecke(_ a: V3, _ b: V3, breite: Float = 1.0, dicke: Float = 0.2, _ f: UIColor, _ mat: Material = .holz) {
        let weg = b - a
        let flach = weg.flach
        let mitte = (a + b) / 2
        // Schräge Brücken als kleine Stufen, weil Kisten nur um y gedreht werden.
        let stufen = max(1, Int(abs(weg.y) / 0.35))
        let g = gierZu(flach)
        let laenge = simd_length(flach) / Float(stufen)
        for i in 0..<stufen {
            let t = (Float(i) + 0.5) / Float(stufen)
            let p = stufen == 1 ? mitte : a + weg * t
            kiste(p, V3(breite, dicke, laenge + 0.05), f.variiert(&w, 0.05), mat, gier: g)
        }
    }

    // MARK: Licht, Schrift, Tore

    func licht(_ p: V3, _ f: UIColor, staerke: CGFloat = 600, reichweite: CGFloat = 12) {
        let l = SCNLight()
        l.type = .omni
        l.color = f
        l.intensity = staerke
        l.attenuationStartDistance = 0
        l.attenuationEndDistance = reichweite
        let n = SCNNode()
        n.light = l
        n.simdPosition = p
        lebendig.addChildNode(n)
    }

    @discardableResult
    func schild(_ text: String, _ p: V3, gier: Float = 0, groesse: CGFloat = 0.6, _ f: UIColor = .white) -> SCNNode {
        let t = SCNText(string: text, extrusionDepth: 0.04)
        t.font = UIFont.systemFont(ofSize: 10, weight: .heavy)
        t.flatness = 0.3
        t.materials = [material(f, leuchten: true)]
        let n = SCNNode(geometry: t)
        let (lo, hi) = n.boundingBox
        n.pivot = SCNMatrix4MakeTranslation((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, 0)
        n.scale = SCNVector3(groesse / 10, groesse / 10, groesse / 10)
        n.simdPosition = p
        n.simdEulerAngles = V3(0, gier, 0)
        lebendig.addChildNode(n)
        return n
    }

    /// Ein leuchtender Durchgang zu einer anderen Karte.
    func tor(_ mitte: V3, gier g: Float, ziel: KartenID) {
        let holz = farbe(0.35, 0.22, 0.12)
        let rechts = drehY(V3(1, 0, 0), g)
        kiste(mitte + rechts * 1.05 + V3(0, 0.3, 0), V3(0.3, 3.0, 0.5), holz, .holz, gier: g)
        kiste(mitte - rechts * 1.05 + V3(0, 0.3, 0), V3(0.3, 3.0, 0.5), holz, .holz, gier: g)
        kiste(mitte + V3(0, 1.95, 0), V3(2.4, 0.35, 0.5), holz, .holz, gier: g)
        kiste(mitte + V3(0, 0.3, 0), V3(1.8, 2.9, 0.08), ziel.torFarbe.withAlphaComponent(0.55), .holz,
              gier: g, fest: false, leuchten: true)
        // Schrift zeigt dorthin, woher man kommt (SCNText schaut nach +z).
        let davor = -vorne(g)
        schild(ziel.name.uppercased(), mitte + V3(0, 2.5, 0) + davor * 0.3, gier: g, groesse: 0.42, ziel.torFarbe)
        welt.tore.append(Tor(mitte: mitte + V3(0, 0.3, 0), halb: V3(1.0, 1.5, 1.0), ziel: ziel))
    }

    /// Fallende Teilchen (Schnee, Blätter, Glühwürmchen).
    func teilchen(_ f: UIColor, menge: CGFloat, groesse: CGFloat, fallen: CGFloat, hoehe: Float, breite: Float) {
        let s = SCNParticleSystem()
        s.birthRate = menge
        s.particleLifeSpan = 9
        s.particleSize = groesse
        s.particleColor = f
        s.particleVelocity = fallen
        s.emittingDirection = SCNVector3(0, -1, 0)
        s.spreadingAngle = 25
        s.emitterShape = SCNBox(width: CGFloat(breite), height: 0.1, length: CGFloat(breite), chamferRadius: 0)
        s.birthLocation = .volume
        s.blendMode = .alpha
        s.isAffectedByGravity = false
        let n = SCNNode()
        n.simdPosition = V3(0, hoehe, 0)
        n.addParticleSystem(s)
        lebendig.addChildNode(n)
    }

    // MARK: Fertig

    func fertig() -> SCNNode {
        let wurzel = SCNNode()
        wurzel.addChildNode(statisch.flattenedClone())
        wurzel.addChildNode(lebendig)
        return wurzel
    }
}
