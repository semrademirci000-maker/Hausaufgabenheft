//
//  TitelView.swift
//  Startbildschirm: großer Titel, Spielen, Schnellstart auf eine Karte,
//  Laden und Computer.
//

import SwiftUI

struct TitelView: View {
    @EnvironmentObject private var spiel: Spiel
    @State private var laden = false
    @State private var computer = false
    @State private var wippen = false

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.35, green: 0.65, blue: 1), Color(red: 0.55, green: 0.85, blue: 0.5)],
                           startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
            hintergrund

            VStack(spacing: 14) {
                HStack(spacing: 14) {
                    Text("🦍").font(.system(size: 64))
                        .rotationEffect(.degrees(wippen ? -8 : 8))
                    VStack(alignment: .leading, spacing: 0) {
                        Text("AFFEN-TAG")
                            .font(Stil.dick(58))
                            .foregroundStyle(.white)
                            .umrandet()
                        Text("Klettern nur mit den Armen · Fangen · Mehrspieler")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .umrandet()
                    }
                }

                HStack(spacing: 12) {
                    Button { spiel.spielen(.stumpf) } label: {
                        Label("SPIELEN", systemImage: "play.fill").font(Stil.dick(24))
                    }
                    .buttonStyle(DickerKnopf(farbe: Color(red: 0.95, green: 0.45, blue: 0.1)))

                    Button { laden = true } label: { Label("LADEN", systemImage: "bag.fill") }
                        .buttonStyle(DickerKnopf(farbe: Color(red: 0.85, green: 0.6, blue: 0.1)))

                    Button { computer = true } label: { Label("COMPUTER", systemImage: "desktopcomputer") }
                        .buttonStyle(DickerKnopf(farbe: Color(red: 0.1, green: 0.5, blue: 0.25)))
                }

                Text("SCHNELLSTART – \(spiel.einstellungen.modus.name.uppercased()) MIT \(spiel.einstellungen.botAnzahl) BOTS")
                    .font(Stil.dick(13))
                    .foregroundStyle(.white)
                    .umrandet()

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(KartenID.spielbar) { k in
                            Button { spiel.spielen(k) } label: {
                                VStack(spacing: 3) {
                                    Text(k.symbol).font(.system(size: 30))
                                    Text(k.name.uppercased()).font(Stil.dick(13))
                                    Text(k.beschreibung)
                                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                                        .multilineTextAlignment(.center)
                                        .lineLimit(3)
                                        .frame(width: 130)
                                }
                                .foregroundStyle(.white)
                                .padding(10)
                                .background(RoundedRectangle(cornerRadius: 14).fill(Color(k.torFarbe).opacity(0.9)))
                                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(.black.opacity(0.3), lineWidth: 3))
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                }

                HStack(spacing: 18) {
                    Text("👤 \(spiel.einstellungen.name)")
                    Text("💎 \(spiel.einstellungen.steine)")
                    Text(spiel.einstellungen.verbindung == .aus ? "📴 Offline" : (spiel.einstellungen.verbindung == .nah ? "📶 In der Nähe" : "🌍 Online"))
                }
                .font(Stil.dick(14))
                .foregroundStyle(.white)
                .umrandet()
            }
            .padding(.vertical, 16)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) { wippen = true }
        }
        .sheet(isPresented: $laden) { LadenView().environmentObject(spiel) }
        .sheet(isPresented: $computer) { ComputerView().environmentObject(spiel) }
    }

    /// Ein paar Low-Poly-Bäume als Kulisse.
    private var hintergrund: some View {
        GeometryReader { geo in
            ForEach(0..<9, id: \.self) { i in
                let x = geo.size.width * (CGFloat(i) + 0.5) / 9
                let h = CGFloat(110 + (i * 53) % 90)
                VStack(spacing: 0) {
                    Triangle()
                        .fill(Color(red: 0.15 + Double(i % 3) * 0.04, green: 0.45 + Double(i % 2) * 0.06, blue: 0.2))
                        .frame(width: h * 0.8, height: h)
                    Rectangle().fill(Color(red: 0.4, green: 0.26, blue: 0.15)).frame(width: 16, height: 30)
                }
                .position(x: x, y: geo.size.height - h / 2 - 15)
                .opacity(0.55)
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

struct Triangle: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.midX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}
