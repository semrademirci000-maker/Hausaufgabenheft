//
//  SteuerungView.swift
//  Die Handy-Steuerung wie beim Mobile-Spielen:
//  Beide Joysticks sind unsichtbar und erscheinen erst unter dem Finger:
//  linke Bildschirmhälfte = Laufen (W A S D), rechte Hälfte = Umschauen.
//  Dazu 1–4 und ⇧ (Sprinten), oben TAB · Menü · ESC, rechts Tastatur, F, R, E und ⎵ (Springen).
//  Jede Taste ist eine eigene Ansicht – so gehen mehrere Finger gleichzeitig.
//

import SwiftUI

struct SteuerungView: View {
    @EnvironmentObject private var spiel: Spiel
    @EnvironmentObject private var hud: HUD

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            let stick = min(190, max(130, w * 0.17))
            let zelle = min(54, max(38, w * 0.045))
            let rund = min(68, max(46, w * 0.064))

            ZStack {
                // Unsichtbare Joystick-Flächen ganz unten, damit die Tasten darüber liegen
                HStack(spacing: 0) {
                    SchwebeStick(buchstaben: true, groesse: stick) { x, y in
                        spiel.eingabe.lx = x
                        spiel.eingabe.ly = y
                    }
                    SchwebeStick(buchstaben: false, groesse: stick) { x, y in
                        spiel.eingabe.rx = x
                        spiel.eingabe.ry = y
                    }
                }

                // Oben
                TasteView(taste: .computer, form: .eckig, groesse: CGSize(width: 50, height: 40)) { Text("…") }
                    .position(x: 36, y: 26)
                HStack(spacing: max(14, w * 0.04)) {
                    TasteView(taste: .tab, form: .eckig, groesse: CGSize(width: 56, height: 40)) { Text("TAB") }
                    TasteView(taste: .logo, form: .rund, groesse: CGSize(width: 64, height: 64), hell: true) { GorillaKopf().fill(Color.black, style: FillStyle(eoFill: true)).frame(width: 40, height: 40) }
                    TasteView(taste: .esc, form: .eckig, groesse: CGSize(width: 56, height: 40)) { Text("ESC") }
                }
                .position(x: w / 2, y: 34)

                ZStack {
                    TasteView(taste: .eins, form: .eckig, groesse: CGSize(width: zelle, height: zelle)) { Text("1") }
                        .offset(y: -zelle)
                    TasteView(taste: .vier, form: .eckig, groesse: CGSize(width: zelle, height: zelle)) { Text("4") }
                        .offset(x: -zelle)
                    TasteView(taste: .zwei, form: .eckig, groesse: CGSize(width: zelle, height: zelle)) { Text("2") }
                        .offset(x: zelle)
                    TasteView(taste: .drei, form: .eckig, groesse: CGSize(width: zelle, height: zelle)) { Text("3") }
                        .offset(y: zelle)
                }
                .position(x: 1.5 * zelle + 24, y: h - 1.5 * zelle - 6)

                TasteView(taste: .shift, form: .rund, groesse: CGSize(width: rund, height: rund)) { Image(systemName: "shift") }
                    .position(x: 3 * zelle + 24 + rund, y: h - rund / 2 - 10)

                // Rechts
                TasteView(taste: .computer, form: .eckig, groesse: CGSize(width: 70, height: 60)) { Image(systemName: "keyboard") }
                    .position(x: w - 42, y: h * 0.16 + 30)

                TasteView(taste: .f, form: .rund, groesse: CGSize(width: rund, height: rund)) { Text("F") }
                    .position(x: w - 120, y: h * 0.64)
                TasteView(taste: .r, form: .rund, groesse: CGSize(width: rund, height: rund)) { Text("R") }
                    .position(x: w - 230, y: h * 0.8)
                TasteView(taste: .e, form: .rund, groesse: CGSize(width: rund, height: rund)) { Text("E") }
                    .position(x: w - rund / 2 - 8, y: h * 0.8)
                TasteView(taste: .leer, form: .rund, groesse: CGSize(width: rund, height: rund)) { Image(systemName: "space") }
                    .position(x: w - 140, y: h - rund / 2 - 6)

                // Mitte unten: Farbschlacht und Computer
                VStack(spacing: 8) {
                    if let b = hud.ballons {
                        HStack(spacing: 4) {
                            ForEach(0..<3, id: \.self) { i in
                                Circle().fill(i < b ? Color.red : Color.white.opacity(0.25)).frame(width: 18, height: 22)
                            }
                        }
                        .allowsHitTesting(false)
                        if !hud.raus {
                            Button { spiel.schiessen() } label: { Label("SCHLEUDER", systemImage: "scope") }
                                .buttonStyle(DickerKnopf(farbe: Color(red: 0.85, green: 0.25, blue: 0.5)))
                        }
                    }
                    if hud.amComputer {
                        Button { spiel.zeigeComputer = true } label: { Label("COMPUTER", systemImage: "desktopcomputer") }
                            .buttonStyle(DickerKnopf(farbe: Color(red: 0.1, green: 0.55, blue: 0.25)))
                    }
                }
                .position(x: w / 2, y: h - 70)
            }
        }
    }
}

// MARK: - Schwebender Joystick (erscheint unter dem Finger)

struct SchwebeStick: View {
    let buchstaben: Bool
    let groesse: CGFloat
    let melde: (Float, Float) -> Void
    @State private var mitte: CGPoint?
    @State private var knauf: CGSize = .zero

    var body: some View {
        GeometryReader { _ in
            ZStack(alignment: .topLeading) {
                Color.clear.contentShape(Rectangle())
                if let m = mitte {
                    StickBild(buchstaben: buchstaben, knauf: knauf)
                        .frame(width: groesse, height: groesse)
                        .position(m)
                        .allowsHitTesting(false)
                }
            }
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { v in
                        let m = mitte ?? v.startLocation
                        if mitte == nil { mitte = m }
                        let weg = groesse * 0.35
                        var d = CGSize(width: v.location.x - m.x, height: v.location.y - m.y)
                        let l = hypot(d.width, d.height)
                        if l > weg {
                            d.width *= weg / l
                            d.height *= weg / l
                        }
                        knauf = d
                        melde(Float(d.width / weg), Float(-d.height / weg))
                    }
                    .onEnded { _ in
                        mitte = nil
                        knauf = .zero
                        melde(0, 0)
                    }
            )
        }
    }
}

struct StickBild: View {
    let buchstaben: Bool
    let knauf: CGSize

    var body: some View {
        GeometryReader { g in
            let r = g.size.width / 2
            ZStack {
                Circle().fill(.black.opacity(0.18))
                Circle().strokeBorder(.white.opacity(0.92), lineWidth: 3)
                if buchstaben {
                    Text("W").offset(y: -r * 0.72)
                    Text("S").offset(y: r * 0.72)
                    Text("A").offset(x: -r * 0.72)
                    Text("D").offset(x: r * 0.72)
                }
                Circle()
                    .fill(.white.opacity(0.95))
                    .frame(width: r * 0.6, height: r * 0.6)
                    .shadow(color: .black.opacity(0.4), radius: 4, y: 2)
                    .offset(knauf)
            }
            .font(.system(size: max(16, r * 0.24), weight: .heavy, design: .rounded))
            .foregroundStyle(.white.opacity(0.92))
        }
    }
}

// MARK: - Gorilla-Kopf (selbst gezeichnet, statt Menü-Symbol)

struct GorillaKopf: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * w, y: rect.minY + y * h) }
        var k = Path()
        // Kopf mit Scheitelkamm
        k.move(to: p(0.5, 0.04))
        k.addCurve(to: p(0.9, 0.42), control1: p(0.74, 0.06), control2: p(0.92, 0.2))
        k.addCurve(to: p(0.78, 0.9), control1: p(0.9, 0.62), control2: p(0.9, 0.8))
        k.addCurve(to: p(0.22, 0.9), control1: p(0.62, 1.0), control2: p(0.38, 1.0))
        k.addCurve(to: p(0.1, 0.42), control1: p(0.1, 0.8), control2: p(0.08, 0.62))
        k.addCurve(to: p(0.5, 0.04), control1: p(0.08, 0.2), control2: p(0.26, 0.06))
        k.closeSubpath()
        // Ohren
        k.addEllipse(in: CGRect(origin: p(0.0, 0.38), size: CGSize(width: 0.16 * w, height: 0.2 * h)))
        k.addEllipse(in: CGRect(origin: p(0.84, 0.38), size: CGSize(width: 0.16 * w, height: 0.2 * h)))
        // Gesicht ausgespart (gerade Füllregel)
        var g = Path()
        g.move(to: p(0.5, 0.36))
        g.addCurve(to: p(0.78, 0.5), control1: p(0.66, 0.3), control2: p(0.8, 0.36))
        g.addCurve(to: p(0.5, 0.86), control1: p(0.78, 0.72), control2: p(0.66, 0.86))
        g.addCurve(to: p(0.22, 0.5), control1: p(0.34, 0.86), control2: p(0.22, 0.72))
        g.addCurve(to: p(0.5, 0.36), control1: p(0.2, 0.36), control2: p(0.34, 0.3))
        g.closeSubpath()
        k.addPath(g)
        // Augen und Nasenlöcher wieder gefüllt
        k.addEllipse(in: CGRect(origin: p(0.33, 0.46), size: CGSize(width: 0.1 * w, height: 0.08 * h)))
        k.addEllipse(in: CGRect(origin: p(0.57, 0.46), size: CGSize(width: 0.1 * w, height: 0.08 * h)))
        k.addEllipse(in: CGRect(origin: p(0.41, 0.62), size: CGSize(width: 0.07 * w, height: 0.06 * h)))
        k.addEllipse(in: CGRect(origin: p(0.52, 0.62), size: CGSize(width: 0.07 * w, height: 0.06 * h)))
        return k
    }
}

// MARK: - Taste (gedrückt halten möglich)

struct TasteView<Inhalt: View>: View {
    enum Form { case rund, eckig }

    @EnvironmentObject private var spiel: Spiel
    let taste: Spiel.Taste
    let form: Form
    let groesse: CGSize
    var hell = false
    let inhalt: () -> Inhalt
    @State private var gedrueckt = false

    init(taste: Spiel.Taste, form: Form, groesse: CGSize, hell: Bool = false, @ViewBuilder inhalt: @escaping () -> Inhalt) {
        self.taste = taste
        self.form = form
        self.groesse = groesse
        self.hell = hell
        self.inhalt = inhalt
    }

    var body: some View {
        let umriss: AnyShape = form == .rund ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: 12))
        inhalt()
            .font(.system(size: min(26, groesse.height * 0.42), weight: .bold, design: .rounded))
            .foregroundStyle(hell ? Color.black : Color.white.opacity(0.95))
            .frame(width: groesse.width, height: groesse.height)
            .background(umriss.fill(hell ? Color.white.opacity(0.9) : (gedrueckt ? Color.white.opacity(0.35) : Color.black.opacity(0.18))))
            .overlay(umriss.stroke(Color.white.opacity(hell ? 0 : 0.92), lineWidth: 3))
            .contentShape(umriss)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        guard !gedrueckt else { return }
                        gedrueckt = true
                        spiel.taste(taste, true)
                    }
                    .onEnded { _ in
                        gedrueckt = false
                        spiel.taste(taste, false)
                    }
            )
            .accessibilityAddTraits(.isButton)
    }
}
