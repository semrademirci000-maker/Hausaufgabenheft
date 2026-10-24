//
//  Texturen.swift
//  Selbst gemalte Oberflächen (keine Bilddateien): Holzbretter, Baumrinde,
//  Jahresringe für den Stumpf-Boden, Gras, Blätter, Stein, Sand, Schnee, Fell.
//  Alle sind hellgrau – die eigentliche Farbe kommt vom Material dazu.
//

import UIKit

enum TexturArt: String {
    case holz, rinde, ringe, gras, blaetter, stein, sand, schnee, fell

    /// Welche Textur gehört zu welchem Untergrund.
    static func fuer(_ m: Material) -> TexturArt? {
        switch m {
        case .gras: return .gras
        case .holz: return .holz
        case .blaetter: return .blaetter
        case .stein: return .stein
        case .sand: return .sand
        case .schnee: return .schnee
        default: return nil
        }
    }
}

enum Texturen {
    private static var cache: [TexturArt: UIImage] = [:]

    static func bild(_ art: TexturArt) -> UIImage {
        if let b = cache[art] { return b }
        let b = male(art)
        cache[art] = b
        return b
    }

    private static func male(_ art: TexturArt) -> UIImage {
        var w = Wuerfel(UInt64(art.rawValue.count * 977 + 13))
        func z() -> CGFloat { CGFloat(w.zahl(0, 1)) }
        func grau(_ l: CGFloat, _ a: CGFloat = 1) -> UIColor { UIColor(white: l / 255, alpha: a) }
        let g: CGFloat = 256
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: CGSize(width: g, height: g), format: format).image { ctx in
            let c = ctx.cgContext
            c.setLineCap(.round)
            switch art {
            case .holz:
                grau(215).setFill(); c.fill(CGRect(x: 0, y: 0, width: g, height: g))
                for i in 0..<4 {
                    grau(195 + z() * 40).setFill()
                    c.fill(CGRect(x: 0, y: CGFloat(i) * 64 + 2, width: g, height: 60))
                }
                for _ in 0..<160 {
                    c.setStrokeColor(grau(120 + z() * 60, 0.35).cgColor)
                    c.setLineWidth(1 + z() * 1.5)
                    let y = z() * g
                    c.move(to: CGPoint(x: 0, y: y))
                    c.addCurve(to: CGPoint(x: g, y: y), control1: CGPoint(x: 80, y: y + z() * 6 - 3), control2: CGPoint(x: 170, y: y + z() * 6 - 3))
                    c.strokePath()
                }
                grau(70).setFill()
                for i in 0...4 { c.fill(CGRect(x: 0, y: CGFloat(i) * 64 - 2, width: g, height: 3)) }
            case .rinde:
                grau(185).setFill(); c.fill(CGRect(x: 0, y: 0, width: g, height: g))
                for _ in 0..<90 {
                    c.setStrokeColor((z() < 0.5 ? grau(90 + z() * 40, 0.7) : grau(215 + z() * 30, 0.7)).cgColor)
                    c.setLineWidth(2 + z() * 5)
                    var x = z() * g
                    c.move(to: CGPoint(x: x, y: 0))
                    for y in stride(from: CGFloat(32), through: g, by: 32) {
                        x += z() * 10 - 5
                        c.addLine(to: CGPoint(x: x, y: y))
                    }
                    c.strokePath()
                }
            case .ringe:
                grau(205).setFill(); c.fill(CGRect(x: 0, y: 0, width: g, height: g))
                var r: CGFloat = 3
                while r < 130 {
                    c.setStrokeColor(grau(110 + z() * 50, 0.8).cgColor)
                    c.setLineWidth(1.5 + z() * 2.5)
                    c.strokeEllipse(in: CGRect(x: 128 - r, y: 128 - r * (0.97 + z() * 0.06), width: 2 * r, height: 2 * r))
                    r += 4 + z() * 5
                }
                for _ in 0..<7 {
                    c.setStrokeColor(grau(60, 0.7).cgColor)
                    c.setLineWidth(1.5)
                    let a = z() * 7, l = 30 + z() * 90
                    c.move(to: CGPoint(x: 128 + cos(a) * 20, y: 128 + sin(a) * 20))
                    c.addLine(to: CGPoint(x: 128 + cos(a) * l, y: 128 + sin(a) * l))
                    c.strokePath()
                }
            case .gras:
                grau(200).setFill(); c.fill(CGRect(x: 0, y: 0, width: g, height: g))
                c.setLineWidth(1)
                for _ in 0..<5000 {
                    c.setStrokeColor(grau(150 + z() * 105, 0.6).cgColor)
                    let a = z() * g, b = z() * g
                    c.move(to: CGPoint(x: a, y: b))
                    c.addLine(to: CGPoint(x: a + z() * 3 - 1.5, y: b - 3 - z() * 5))
                    c.strokePath()
                }
            case .blaetter:
                grau(170).setFill(); c.fill(CGRect(x: 0, y: 0, width: g, height: g))
                for _ in 0..<420 {
                    grau(120 + z() * 135, 0.8).setFill()
                    c.fillEllipse(in: CGRect(x: z() * g, y: z() * g, width: 8 + z() * 14, height: 4 + z() * 8))
                }
            case .stein:
                grau(190).setFill(); c.fill(CGRect(x: 0, y: 0, width: g, height: g))
                for _ in 0..<900 {
                    grau(140 + z() * 100, 0.5).setFill()
                    let s = 2 + z() * 8
                    c.fill(CGRect(x: z() * g, y: z() * g, width: s, height: s))
                }
            case .sand, .schnee:
                let basis: CGFloat = art == .sand ? 215 : 245
                grau(basis).setFill(); c.fill(CGRect(x: 0, y: 0, width: g, height: g))
                for _ in 0..<6000 {
                    grau(basis - 40 + z() * 50, 0.5).setFill()
                    c.fill(CGRect(x: z() * g, y: z() * g, width: 1.5, height: 1.5))
                }
            case .fell:
                grau(200).setFill(); c.fill(CGRect(x: 0, y: 0, width: g, height: g))
                for _ in 0..<2600 {
                    c.setStrokeColor((z() < 0.5 ? grau(120 + z() * 50, 0.55) : grau(230 + z() * 25, 0.55)).cgColor)
                    c.setLineWidth(1 + z())
                    let a = z() * g, b = z() * g
                    c.move(to: CGPoint(x: a, y: b))
                    c.addQuadCurve(to: CGPoint(x: a + z() * 4 - 2, y: b + 9 + z() * 6), control: CGPoint(x: a + 2, y: b + 5))
                    c.strokePath()
                }
            }
        }
    }
}
