//
//  SpielView.swift
//  Die 3D-Welt plus alles, was darüber liegt: die Handy-Steuerung
//  (Joysticks und Tasten wie beim Mobile-Spielen), Meldungen, Spielerliste,
//  Lava-Rand, Jagd-Kompass, Schleuder und Menü.
//

import SwiftUI

struct SpielView: View {
    @EnvironmentObject private var spiel: Spiel
    @EnvironmentObject private var hud: HUD

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

            anzeigen
            SteuerungView()

            if spiel.zeigeListe { spielerListe }

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
        .sheet(isPresented: $spiel.zeigeMenue) {
            MenueView(schliessen: { spiel.zeigeMenue = false }).environmentObject(spiel)
        }
    }

    // MARK: Anzeigen (nicht antippbar)

    private var anzeigen: some View {
        VStack(spacing: 8) {
            Text(hud.unterzeile)
                .font(Stil.dick(13))
                .foregroundStyle(.white)
                .umrandet()
            Text("\(hud.steine) STEINE  ·  \(hud.netz)")
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.9))
                .padding(.horizontal, 10)
                .padding(.vertical, 3)
                .background(Capsule().fill(.black.opacity(0.35)))
            if let m = hud.meldung {
                Text(m)
                    .font(Stil.dick(26))
                    .foregroundStyle(hud.istLava ? Stil.lava : .white)
                    .multilineTextAlignment(.center)
                    .umrandet()
                    .padding(.top, 30)
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
            Spacer()
        }
        .padding(.top, 84)
        .frame(maxWidth: 520)
        .animation(.spring(duration: 0.3), value: hud.meldung)
        .allowsHitTesting(false)
    }

    private var spielerListe: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("SPIELER IM RAUM").font(Stil.dick(18)).foregroundStyle(.white)
            ForEach(hud.spieler) { s in
                HStack(spacing: 8) {
                    Circle()
                        .fill(s.lava ? Stil.lava : Color(s.farbe))
                        .frame(width: 13, height: 13)
                        .overlay(Circle().strokeBorder(.black.opacity(0.4)))
                    Text(s.name)
                        .font(.system(size: 14, weight: s.ich ? .heavy : .semibold, design: .monospaced))
                        .foregroundStyle(s.raus ? .white.opacity(0.4) : .white)
                        .strikethrough(s.raus)
                }
            }
            if hud.spieler.count < 2 {
                Text("Gerade ist keiner da – du kletterst allein.\nFreunde: Computer → RAUM → Code eingeben.")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.75))
            }
        }
        .padding(18)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color(red: 0.04, green: 0.08, blue: 0.05).opacity(0.88)))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(.white.opacity(0.9), lineWidth: 3))
        .onTapGesture { spiel.zeigeListe = false }
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
}

// MARK: - Anleitung beim ersten Start

struct AnleitungView: View {
    let fertig: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
            VStack(spacing: 14) {
                Text("SO STEUERST DU DEINEN GORILLA").font(Stil.dick(24)).foregroundStyle(.white)
                HStack(alignment: .top, spacing: 18) {
                    schritt("gamecontroller.fill", "Linker Stick (W A S D): laufen. Deine Hände drücken sich dabei wirklich vom Boden ab.")
                    schritt("eye.fill", "Rechter Stick: umschauen. Oder einfach irgendwo über die Welt wischen.")
                    schritt("arrow.up.circle.fill", "Springen. ⇧ = sprinten. Gegen eine Wand laufen = hochklettern.")
                    schritt("hand.raised.fill", "E festhalten · 1 Hände hoch · 3 runter · 4/2 linke/rechte Hand · R zurück · F Lampe · TAB Spieler")
                }
                Button("LOS GEHT'S!", action: fertig)
                    .buttonStyle(DickerKnopf())
            }
            .padding(24)
            .frame(maxWidth: 780)
            .background(RoundedRectangle(cornerRadius: 24).fill(Stil.holz))
            .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(.black.opacity(0.4), lineWidth: 4))
            .padding(20)
        }
    }

    private func schritt(_ symbol: String, _ text: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: symbol).font(.system(size: 30, weight: .bold)).foregroundStyle(Stil.lava)
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

    init(schliessen: @escaping () -> Void) {
        self.schliessen = schliessen
    }

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
