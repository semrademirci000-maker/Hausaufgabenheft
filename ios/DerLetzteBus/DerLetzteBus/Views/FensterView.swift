//
//  FensterView.swift
//  Der Blick aus dem Busfenster: Häuser, kahle Bäume, Grabsteine, Laternen,
//  Nebel und Regen. Alles wird mit `Canvas` gezeichnet und zieht vorbei,
//  solange der Bus fährt.
//

import SwiftUI

struct FensterView: View {
    @EnvironmentObject private var spiel: Spiel
    @State private var weg = Fahrtweg()

    var body: some View {
        TimelineView(.animation) { zeitachse in
            Canvas { ctx, groesse in
                let t = zeitachse.date.timeIntervalSinceReferenceDate
                let strecke = weg.weiter(zeit: t, ziel: spiel.faehrt ? (spiel.schnell ? 4 : 1) : 0)
                let maler = Szenenmaler(
                    szene: spiel.szene,
                    laternen: spiel.laternen,
                    regen: spiel.regen,
                    strecke: strecke,
                    zeit: t,
                    faehrt: weg.tempo > 0.05
                )
                maler.male(&ctx, groesse)
            }
        }
        .overlay(alignment: .bottomTrailing) {
            if let name = spiel.schild {
                HaltestellenSchild(name: name)
                    .padding(.trailing, 40)
                    .padding(.bottom, 4)
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(Color(red: 0.106, green: 0.118, blue: 0.153), lineWidth: 6)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(RadialGradient(colors: [.clear, .black.opacity(0.55)], center: .center, startRadius: 60, endRadius: 320))
                .allowsHitTesting(false)
        )
        .accessibilityHidden(true)
    }
}

/// Merkt sich, wie weit der Bus schon gefahren ist – mit sanftem Anfahren und Bremsen.
final class Fahrtweg {
    private(set) var strecke: Double = 0
    private(set) var tempo: Double = 0
    private var letzte: Double?

    func weiter(zeit: Double, ziel: Double) -> Double {
        let dt = min(0.1, max(0, zeit - (letzte ?? zeit)))
        letzte = zeit
        tempo += (ziel - tempo) * min(1, dt * 1.6)
        strecke += tempo * dt
        return strecke
    }
}

// MARK: - Haltestellenschild

private struct HaltestellenSchild: View {
    let name: String

    var body: some View {
        VStack(spacing: 0) {
            Text("H")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Color(red: 0.18, green: 0.48, blue: 0.24))
                .frame(width: 32, height: 32)
                .background(Circle().fill(Color(red: 0.91, green: 0.76, blue: 0.16)))
                .overlay(Circle().strokeBorder(Color(red: 0.18, green: 0.48, blue: 0.24), lineWidth: 3))
            Text(name.isEmpty ? " " : name)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(white: 0.07))
                .lineLimit(1)
                .padding(.horizontal, 9).padding(.vertical, 3)
                .frame(minWidth: 80, minHeight: 22)
                .background(RoundedRectangle(cornerRadius: 3).fill(Color(red: 0.953, green: 0.937, blue: 0.886)))
                .shadow(color: .black.opacity(0.6), radius: 4, y: 2)
                .padding(.top, 4)
            Rectangle()
                .fill(Color(white: 0.33))
                .frame(width: 4, height: 50)
        }
    }
}

// MARK: - Zeichnen

/// Kleiner Zufallsgenerator mit festem Startwert, damit Häuser und Bäume
/// in jedem Bild an derselben Stelle stehen.
private struct Wuerfel {
    var zustand: UInt64
    init(_ start: UInt64) { zustand = start &* 0x9E3779B97F4A7C15 | 1 }
    mutating func zahl(_ a: Double, _ b: Double) -> Double {
        zustand ^= zustand << 13
        zustand ^= zustand >> 7
        zustand ^= zustand << 17
        return a + Double(zustand % 10_000) / 10_000 * (b - a)
    }
}

private struct Szenenmaler {
    let szene: Szene
    let laternen: Laternen
    let regen: Double
    let strecke: Double
    let zeit: Double
    let faehrt: Bool

    // Alle Formen werden in einem 600 × 200 großen Streifen gedacht
    // und auf die echte Fenstergröße gestreckt.
    let breite = 600.0, hoehe = 200.0

    func male(_ ctx: inout GraphicsContext, _ g: CGSize) {
        himmel(&ctx, g)

        let sx = g.width / breite, sy = g.height / hoehe

        // Hintergrund zieht langsam vorbei, Laternen und Zaun schnell.
        let fern = (strecke * 0.05).truncatingRemainder(dividingBy: 1)
        let nah = (strecke * 0.25).truncatingRemainder(dividingBy: 1)
        for kachel in 0..<2 {
            var c = ctx
            c.translateBy(x: (Double(kachel) - fern) * g.width, y: 0)
            c.scaleBy(x: sx, y: sy)
            fernerStreifen(&c)
        }
        if laternen == .eine {
            var c = ctx
            c.scaleBy(x: sx, y: sy)
            eineLaterne(&c)
        } else {
            for kachel in 0..<2 {
                var c = ctx
                c.translateBy(x: (Double(kachel) - nah) * g.width, y: 0)
                c.scaleBy(x: sx, y: sy)
                naherStreifen(&c)
            }
        }

        nebel(&ctx, g)
        regenTropfen(&ctx, g)
    }

    // MARK: Himmel und Nebel

    private func himmel(_ ctx: inout GraphicsContext, _ g: CGSize) {
        let rechteck = Path(CGRect(origin: .zero, size: g))
        func farbe(_ r: Double, _ gr: Double, _ b: Double) -> Color { Color(red: r, green: gr, blue: b) }
        let start = CGPoint(x: 0, y: 0), ende = CGPoint(x: 0, y: g.height)
        let farben: [Color]
        switch szene {
        case .stadt:    farben = [farbe(0.043, 0.063, 0.125), farbe(0.114, 0.137, 0.22), farbe(0.169, 0.165, 0.165)]
        case .bahnhof:  farben = [farbe(0.039, 0.059, 0.114), farbe(0.102, 0.133, 0.212), farbe(0.165, 0.165, 0.18)]
        case .linden:   farben = [farbe(0.027, 0.035, 0.059), farbe(0.078, 0.102, 0.149), farbe(0.11, 0.114, 0.133)]
        case .friedhof: farben = [farbe(0.051, 0.063, 0.071), farbe(0.165, 0.188, 0.2), farbe(0.227, 0.247, 0.251)]
        case .namenlos: farben = [farbe(0.17, 0.14, 0.07), farbe(0.02, 0.02, 0.02), farbe(0.02, 0.02, 0.02)]
        case .schule:   farben = [farbe(0.024, 0.031, 0.07), farbe(0.063, 0.086, 0.165), farbe(0.098, 0.106, 0.141)]
        case .zuhause:  farben = [farbe(0.035, 0.047, 0.094), farbe(0.094, 0.125, 0.227), farbe(0.137, 0.145, 0.188)]
        case .ende:     farben = [farbe(0.85, 0.86, 0.875), farbe(0.85, 0.86, 0.875)]
        }
        ctx.fill(rechteck, with: .linearGradient(Gradient(colors: farben), startPoint: start, endPoint: ende))
    }

    private func nebel(_ ctx: inout GraphicsContext, _ g: CGSize) {
        let rechteck = Path(CGRect(origin: .zero, size: g))
        switch szene {
        case .friedhof:
            let wogen = 0.08 * sin(zeit * 0.5)
            ctx.fill(rechteck, with: .linearGradient(
                Gradient(colors: [Color(red: 0.75, green: 0.77, blue: 0.8).opacity(0.7 + wogen), .clear]),
                startPoint: CGPoint(x: 0, y: g.height), endPoint: CGPoint(x: 0, y: g.height * 0.2)))
        case .ende:
            ctx.fill(rechteck, with: .color(Color(red: 0.9, green: 0.91, blue: 0.92).opacity(0.9)))
        default:
            break
        }
    }

    // MARK: Hintergrund

    private func fernerStreifen(_ c: inout GraphicsContext) {
        var w = Wuerfel(seed)
        let H = hoehe
        switch szene {
        case .stadt, .bahnhof, .zuhause, .schule:
            let dunkel = Color(red: 0.043, green: 0.051, blue: 0.078)
            let fensterFarbe = szene == .schule ? Color(red: 0.87, green: 0.91, blue: 1) : Color(red: 0.95, green: 0.77, blue: 0.42)
            var x = 0.0
            while x < breite {
                let b = w.zahl(40, 90)
                let h = szene == .zuhause ? w.zahl(50, 80) : w.zahl(70, 150)
                c.fill(Path(CGRect(x: x, y: H - h, width: b - 4, height: h)), with: .color(dunkel))
                if szene == .zuhause {
                    var dach = Path()
                    dach.move(to: CGPoint(x: x - 4, y: H - h))
                    dach.addLine(to: CGPoint(x: x + b / 2, y: H - h - 26))
                    dach.addLine(to: CGPoint(x: x + b, y: H - h))
                    dach.closeSubpath()
                    c.fill(dach, with: .color(dunkel))
                }
                var fy = H - h + 10
                while fy < H - 20 {
                    var fx = x + 8
                    while fx < x + b - 14 {
                        let wurf = w.zahl(0, 1)
                        let hell = w.zahl(0.5, 0.95)
                        let an = szene == .schule || wurf < (szene == .zuhause ? 0.08 : 0.3)
                        if an {
                            c.fill(Path(CGRect(x: fx, y: fy, width: 7, height: 9)), with: .color(fensterFarbe.opacity(hell)))
                        }
                        fx += 14
                    }
                    fy += 18
                }
                x += b
            }
        case .linden:
            var x = 10.0
            while x < breite {
                let h = w.zahl(110, 160), oben = H - h
                var baum = Path()
                baum.move(to: CGPoint(x: x, y: H))
                baum.addLine(to: CGPoint(x: x, y: oben + 40))
                c.stroke(baum, with: .color(Color(red: 0.02, green: 0.024, blue: 0.03)), style: StrokeStyle(lineWidth: 5, lineCap: .round))
                for _ in 0..<6 {
                    let ax = x + w.zahl(-40, 40), ay = oben + w.zahl(-10, 50)
                    let ansatz = oben + w.zahl(40, 80)
                    var ast = Path()
                    ast.move(to: CGPoint(x: x, y: ansatz))
                    ast.addQuadCurve(to: CGPoint(x: ax, y: ay), control: CGPoint(x: x + (ax - x) / 2, y: ay + 20))
                    c.stroke(ast, with: .color(Color(red: 0.02, green: 0.024, blue: 0.03)),
                             style: StrokeStyle(lineWidth: w.zahl(1.5, 3), lineCap: .round))
                }
                x += w.zahl(50, 80)
            }
        case .friedhof:
            let stein = Color(red: 0.063, green: 0.078, blue: 0.082)
            c.fill(Path(CGRect(x: 0, y: H - 30, width: breite, height: 30)), with: .color(Color(red: 0.08, green: 0.1, blue: 0.11)))
            var x = 10.0
            while x < breite {
                let h = w.zahl(18, 34)
                if w.zahl(0, 1) < 0.4 {
                    var kreuz = Path()
                    kreuz.move(to: CGPoint(x: x + 6, y: H - 28 - h))
                    kreuz.addLine(to: CGPoint(x: x + 6, y: H - 24))
                    kreuz.move(to: CGPoint(x: x, y: H - 18 - h))
                    kreuz.addLine(to: CGPoint(x: x + 12, y: H - 18 - h))
                    c.stroke(kreuz, with: .color(stein), lineWidth: 4)
                } else {
                    var grab = Path()
                    grab.move(to: CGPoint(x: x, y: H - 26))
                    grab.addLine(to: CGPoint(x: x, y: H - 26 - (h - 8)))
                    grab.addArc(center: CGPoint(x: x + 8, y: H - 26 - (h - 8)), radius: 8,
                                startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
                    grab.addLine(to: CGPoint(x: x + 16, y: H - 26))
                    grab.closeSubpath()
                    c.fill(grab, with: .color(stein))
                }
                x += w.zahl(28, 50)
            }
        case .namenlos, .ende:
            break
        }
    }

    // MARK: Vordergrund

    private func naherStreifen(_ c: inout GraphicsContext) {
        let H = hoehe
        if szene == .friedhof {
            let zaun = Color(red: 0.027, green: 0.035, blue: 0.04)
            var x = 0.0
            while x < breite {
                c.fill(Path(CGRect(x: x, y: H - 70, width: 3, height: 70)), with: .color(zaun))
                x += 9
            }
            c.fill(Path(CGRect(x: 0, y: H - 64, width: breite, height: 3)), with: .color(zaun))
            c.fill(Path(CGRect(x: 0, y: H - 22, width: breite, height: 3)), with: .color(zaun))
        }
        guard laternen == .an || laternen == .flackern else { return }

        // Flackernde Laternen gehen in unregelmäßigen Abständen kurz aus.
        var hell = 1.0
        if laternen == .flackern, sin(zeit * 13) + sin(zeit * 7.3 + 1) > 1.25 { hell = 0.12 }

        for x in [60.0, 360.0] {
            laterne(&c, x: x, oben: 40, hell: hell)
        }
    }

    private func eineLaterne(_ c: inout GraphicsContext) {
        laterne(&c, x: 295, oben: 30, hell: 1)
    }

    private func laterne(_ c: inout GraphicsContext, x: Double, oben: Double, hell: Double) {
        let H = hoehe
        let mast = Color(red: 0.03, green: 0.035, blue: 0.047)
        let licht = Color(red: 1, green: 0.82, blue: 0.48)
        c.fill(Path(CGRect(x: x, y: oben, width: 5, height: H - oben)), with: .color(mast))
        c.fill(Path(CGRect(x: x - 12, y: oben - 4, width: 30, height: 6)), with: .color(mast))
        c.fill(Path(ellipseIn: CGRect(x: x - 19, y: oben, width: 44, height: 12)), with: .color(licht.opacity(0.85 * hell)))
        var kegel = Path()
        kegel.move(to: CGPoint(x: x - 10, y: oben + 6))
        kegel.addLine(to: CGPoint(x: x - 50, y: H))
        kegel.addLine(to: CGPoint(x: x + 56, y: H))
        kegel.addLine(to: CGPoint(x: x + 16, y: oben + 6))
        kegel.closeSubpath()
        c.fill(kegel, with: .color(licht.opacity(0.08 * hell)))
    }

    // MARK: Regen auf der Scheibe

    private func regenTropfen(_ ctx: inout GraphicsContext, _ g: CGSize) {
        let anzahl = Int(regen * 90)
        guard anzahl > 0 else { return }
        let schraeg = faehrt ? -0.35 : -0.05
        var w = Wuerfel(4242)
        var striche = Path()
        let hoeheMitRand = Double(g.height) + 40
        for _ in 0..<anzahl {
            let x0 = w.zahl(0, 1), y0 = w.zahl(0, 1)
            let tempo = w.zahl(240, 600), laenge = w.zahl(8, 22)
            let y = (y0 * hoeheMitRand + zeit * tempo).truncatingRemainder(dividingBy: hoeheMitRand) - 20
            var x = (x0 * (Double(g.width) + 60) + y * schraeg).truncatingRemainder(dividingBy: Double(g.width) + 60)
            if x < -30 { x += Double(g.width) + 60 }
            striche.move(to: CGPoint(x: x, y: y))
            striche.addLine(to: CGPoint(x: x + laenge * schraeg, y: y + laenge))
        }
        ctx.stroke(striche, with: .color(Color(red: 0.7, green: 0.78, blue: 0.9).opacity(0.35)), lineWidth: 1)
    }

    private var seed: UInt64 {
        switch szene {
        case .stadt: return 1
        case .bahnhof: return 2
        case .linden: return 3
        case .friedhof: return 4
        case .namenlos: return 5
        case .schule: return 6
        case .zuhause: return 7
        case .ende: return 8
        }
    }
}
