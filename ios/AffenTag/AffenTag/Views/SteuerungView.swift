//
//  SteuerungView.swift
//  Die Handy-Steuerung wie beim Mobile-Spielen:
//  links Joystick (W A S D) zum Laufen, darunter 1–4 und ⇧ (Sprinten),
//  oben TAB · 🦍 · ESC, rechts Tastatur, Joystick zum Umschauen, F, R, E und ⎵ (Springen).
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
                // Oben
                TasteView(taste: .computer, form: .eckig, groesse: CGSize(width: 50, height: 40)) { Text("…") }
                    .position(x: 36, y: 26)
                HStack(spacing: max(14, w * 0.04)) {
                    TasteView(taste: .tab, form: .eckig, groesse: CGSize(width: 56, height: 40)) { Text("TAB") }
                    TasteView(taste: .logo, form: .rund, groesse: CGSize(width: 64, height: 64), hell: true) { Text("🦍").font(.system(size: 32)) }
                    TasteView(taste: .esc, form: .eckig, groesse: CGSize(width: 56, height: 40)) { Text("ESC") }
                }
                .position(x: w / 2, y: 34)

                // Links
                Joystick(buchstaben: true) { x, y in
                    spiel.eingabe.lx = x
                    spiel.eingabe.ly = y
                }
                .frame(width: stick, height: stick)
                .position(x: stick / 2 + 8, y: h * 0.2 + stick / 2)

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

                Joystick(buchstaben: false) { x, y in
                    spiel.eingabe.rx = x
                    spiel.eingabe.ry = y
                }
                .frame(width: stick, height: stick)
                .position(x: w - stick / 2 - 80, y: h * 0.22 + stick / 2)

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
                                Text(i < b ? "🎈" : "💥").font(.system(size: 20)).opacity(i < b ? 1 : 0.5)
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

// MARK: - Joystick

struct Joystick: View {
    let buchstaben: Bool
    let melde: (Float, Float) -> Void
    @State private var knauf: CGSize = .zero

    init(buchstaben: Bool, melde: @escaping (Float, Float) -> Void) {
        self.buchstaben = buchstaben
        self.melde = melde
    }

    var body: some View {
        GeometryReader { g in
            let r = g.size.width / 2
            let weg = r * 0.7
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
            .contentShape(Circle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { v in
                        var d = CGSize(width: v.location.x - r, height: v.location.y - r)
                        let l = hypot(d.width, d.height)
                        if l > weg {
                            d.width *= weg / l
                            d.height *= weg / l
                        }
                        knauf = d
                        melde(Float(d.width / weg), Float(-d.height / weg))
                    }
                    .onEnded { _ in
                        knauf = .zero
                        melde(0, 0)
                    }
            )
        }
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
