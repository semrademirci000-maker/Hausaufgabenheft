//
//  SpielView.swift
//  Die 3D-Welt plus alles, was darüber liegt: Meldungen, Spielerliste,
//  Lava-Rand, Jagd-Kompass, Schleuder-Knopf, Computer-Knopf und Menü.
//

import SwiftUI

struct SpielView: View {
    @EnvironmentObject private var spiel: Spiel
    @EnvironmentObject private var hud: HUD
    @State private var menue = false
    @State private var zeigeListe = true

    var body: some View {
        ZStack {
            SzeneAnsicht(spiel: spiel)
                .ignoresSafeArea()

            // Lava-Rand und Eis-Schleier
            if hud.istLava {
                RoundedRectangle(cornerRadius: 0)
                    .strokeBorder(Stil.lava.opacity(0.75), lineWidth: 14)
                    .blur(radius: 10)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
            }
            if hud.eingefroren {
                Color.cyan.opacity(0.18).ignoresSafeArea().allowsHitTesting(false)
            }

            oben
            unten

            if !spiel.einstellungen.anleitungGesehen {
                AnleitungView { spiel.einstellungen.anleitungGesehen = true }
            }
        }
        .sheet(isPresented: $spiel.zeigeComputer) {
            ComputerView().environmentObject(spiel)
        }
        .sheet(isPresented: $spiel.zeigeLaden) {
            LadenView().environmentObject(spiel)
        }
        .sheet(isPresented: $menue) {
            MenueView(schliessen: { menue = false }).environmentObject(spiel)
        }
    }

    // MARK: Oben

    private var oben: some View {
        VStack(spacing: 6) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(hud.unterzeile)
                        .font(Stil.dick(14))
                        .foregroundStyle(.white)
                        .umrandet()
                    Text(hud.netz)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.85))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Capsule().fill(.black.opacity(0.35)))
                }
                .allowsHitTesting(false)

                Spacer()

                // Wischstreifen-Hinweis
                Text("↔︎  hier wischen zum Umschauen")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.55))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 5)
                    .background(Capsule().fill(.white.opacity(0.08)))
                    .allowsHitTesting(false)

                Spacer()

                HStack(spacing: 10) {
                    Text("💎 \(hud.steine)")
                        .font(Stil.dick(16))
                        .foregroundStyle(.white)
                        .umrandet()
                    Button { zeigeListe.toggle() } label: {
                        Image(systemName: "person.3.fill")
                            .font(.system(size: 15, weight: .bold))
                            .frame(width: 40, height: 40)
                            .background(Circle().fill(.black.opacity(0.4)))
                            .foregroundStyle(.white)
                    }
                    Button { menue = true } label: {
                        Image(systemName: "line.3.horizontal")
                            .font(.system(size: 17, weight: .bold))
                            .frame(width: 40, height: 40)
                            .background(Circle().fill(.black.opacity(0.4)))
                            .foregroundStyle(.white)
                    }
                }
            }

            HStack(alignment: .top) {
                Spacer()
                if zeigeListe { spielerListe }
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .overlay(alignment: .top) {
            VStack(spacing: 10) {
                if let m = hud.meldung {
                    Text(m)
                        .font(Stil.dick(26))
                        .foregroundStyle(hud.istLava ? Stil.lava : .white)
                        .multilineTextAlignment(.center)
                        .umrandet()
                        .transition(.scale.combined(with: .opacity))
                }
                if let ziel = hud.zielName, let f = hud.zielFarbe {
                    jagdKompass(ziel, f)
                }
                if hud.raus {
                    Text("DU BIST RAUS – SCHAU ZU BIS ZUR NÄCHSTEN RUNDE")
                        .font(Stil.dick(13))
                        .foregroundStyle(.white.opacity(0.85))
                        .umrandet()
                }
            }
            .padding(.top, 70)
            .animation(.spring(duration: 0.3), value: hud.meldung)
            .allowsHitTesting(false)
        }
    }

    private var spielerListe: some View {
        VStack(alignment: .leading, spacing: 3) {
            ForEach(hud.spieler) { s in
                HStack(spacing: 6) {
                    Circle()
                        .fill(s.lava ? Stil.lava : Color(s.farbe))
                        .frame(width: 11, height: 11)
                        .overlay(Circle().strokeBorder(.black.opacity(0.4)))
                    Text(s.name)
                        .font(.system(size: 11, weight: s.ich ? .heavy : .semibold, design: .monospaced))
                        .foregroundStyle(s.raus ? .white.opacity(0.4) : .white)
                        .strikethrough(s.raus)
                    if s.bot {
                        Text("BOT").font(.system(size: 8, weight: .bold)).foregroundStyle(.white.opacity(0.5))
                    }
                    if s.lava { Text("🔥").font(.system(size: 10)) }
                }
            }
        }
        .padding(8)
        .background(RoundedRectangle(cornerRadius: 10).fill(.black.opacity(0.35)))
        .allowsHitTesting(false)
    }

    private func jagdKompass(_ name: String, _ f: V3) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "location.north.fill")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Color(f))
                .rotationEffect(.radians(hud.zielWinkel))
                .umrandet()
            Text("DEIN ZIEL: \(name)")
                .font(Stil.dick(15))
                .foregroundStyle(.white)
                .umrandet()
            Circle().fill(Color(f)).frame(width: 16, height: 16)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Capsule().fill(.black.opacity(0.35)))
    }

    // MARK: Unten

    private var unten: some View {
        VStack {
            Spacer()
            HStack(alignment: .bottom) {
                Text("LINKE HAND")
                    .font(.system(size: 10, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white.opacity(0.35))
                    .allowsHitTesting(false)
                Spacer()
                VStack(spacing: 10) {
                    if let b = hud.ballons {
                        HStack(spacing: 4) {
                            ForEach(0..<3, id: \.self) { i in
                                Text(i < b ? "🎈" : "💥").font(.system(size: 20)).opacity(i < b ? 1 : 0.5)
                            }
                        }
                        .allowsHitTesting(false)
                        if !hud.raus {
                            Button { spiel.schiessen() } label: {
                                Label("SCHLEUDER", systemImage: "scope")
                            }
                            .buttonStyle(DickerKnopf(farbe: Color(red: 0.85, green: 0.25, blue: 0.5)))
                        }
                    }
                    if hud.amComputer {
                        Button { spiel.zeigeComputer = true } label: {
                            Label("COMPUTER", systemImage: "desktopcomputer")
                        }
                        .buttonStyle(DickerKnopf(farbe: Color(red: 0.1, green: 0.55, blue: 0.25)))
                    }
                }
                Spacer()
                Text("RECHTE HAND")
                    .font(.system(size: 10, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white.opacity(0.35))
                    .allowsHitTesting(false)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 14)
        }
    }
}

// MARK: - Anleitung beim ersten Start

struct AnleitungView: View {
    let fertig: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
            VStack(spacing: 14) {
                Text("SO BEWEGST DU DICH").font(Stil.dick(24)).foregroundStyle(.white)
                HStack(alignment: .top, spacing: 18) {
                    schritt("✋", "Finger links = linke Hand, rechts = rechte Hand. Ein liegender Finger ist eine greifende Hand.")
                    schritt("⬇️", "Zieh den Finger nach UNTEN, während die Hand den Boden berührt → du springst nach vorne-oben.")
                    schritt("🧗", "An Wände und Bäume greifen und nach unten ziehen = klettern. Loslassen mit Schwung = fliegen!")
                    schritt("👀", "Im oberen Streifen wischen = umschauen. Oder am Computer „Gyro“ einschalten.")
                }
                Text("Grüner Kreis = deine Hand hält sich gerade fest.")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.green)
                Button("LOS GEHT'S!", action: fertig)
                    .buttonStyle(DickerKnopf())
            }
            .padding(24)
            .frame(maxWidth: 760)
            .background(RoundedRectangle(cornerRadius: 24).fill(Stil.holz))
            .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(.black.opacity(0.4), lineWidth: 4))
            .padding(20)
        }
    }

    private func schritt(_ symbol: String, _ text: String) -> some View {
        VStack(spacing: 6) {
            Text(symbol).font(.system(size: 34))
            Text(text)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Menü im Spiel

struct MenueView: View {
    @EnvironmentObject private var spiel: Spiel
    let schliessen: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                Text("MENÜ").font(Stil.dick(26))
                HStack(spacing: 12) {
                    Button { schliessen(); spiel.zeigeComputer = true } label: { Label("COMPUTER", systemImage: "desktopcomputer") }
                        .buttonStyle(DickerKnopf(farbe: Color(red: 0.1, green: 0.55, blue: 0.25)))
                    Button { schliessen(); spiel.zeigeLaden = true } label: { Label("LADEN", systemImage: "bag.fill") }
                        .buttonStyle(DickerKnopf(farbe: Color(red: 0.85, green: 0.55, blue: 0.1)))
                    if spiel.karte != .stumpf {
                        Button { schliessen(); spiel.lade(.stumpf) } label: { Label("ZUM STUMPF", systemImage: "house.fill") }
                            .buttonStyle(DickerKnopf(farbe: Stil.holz))
                    }
                }
                Text("KARTE WECHSELN").font(Stil.dick(15)).foregroundStyle(.secondary)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 130))], spacing: 10) {
                    ForEach(KartenID.spielbar) { k in
                        Button { schliessen(); spiel.lade(k) } label: {
                            VStack(spacing: 2) {
                                Text(k.symbol).font(.system(size: 28))
                                Text(k.name.uppercased()).font(Stil.dick(13))
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(DickerKnopf(farbe: Color(k.torFarbe).opacity(0.85)))
                    }
                }
                Button(role: .destructive) { schliessen(); spiel.zumTitel() } label: {
                    Label("ZUM TITELBILDSCHIRM", systemImage: "rectangle.portrait.and.arrow.right")
                }
                .buttonStyle(DickerKnopf(farbe: .red.opacity(0.8)))
            }
            .padding(24)
        }
        .presentationDetents([.large])
    }
}
