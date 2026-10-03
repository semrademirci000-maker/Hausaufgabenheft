//
//  BusView.swift
//  Im Bus: Leuchtanzeige, Fenster nach draußen, Sitzreihe und die Geschichte.
//

import SwiftUI

struct BusView: View {
    @EnvironmentObject private var spiel: Spiel

    var body: some View {
        GeometryReader { geo in
            let quer = geo.size.width > geo.size.height
            Group {
                if quer {
                    // Querformat wie bei einem Handyspiel: links der Bus, rechts die Geschichte
                    HStack(spacing: 0) {
                        VStack(spacing: 0) {
                            LEDAnzeige()
                            FensterView()
                                .frame(maxHeight: .infinity)
                                .padding(.leading, 16)
                                .padding(.trailing, 12)
                                .padding(.top, 10)
                            SitzReihe()
                        }
                        .overlay { dunkel }
                        .frame(width: geo.size.width * 0.55)

                        Rectangle().fill(Farbe.rand).frame(width: 1)
                        GeschichteView(zweiSpalten: geo.size.height < 500)
                            .background(Color(red: 0.05, green: 0.06, blue: 0.08))
                    }
                } else {
                    VStack(spacing: 0) {
                        VStack(spacing: 0) {
                            LEDAnzeige()
                            FensterView()
                                .frame(height: min(280, max(160, geo.size.height * 0.28)))
                                .padding(.horizontal, 16)
                                .padding(.top, 10)
                            SitzReihe()
                        }
                        .overlay { dunkel }

                        Rectangle().fill(Farbe.rand).frame(height: 1)
                        GeschichteView(zweiSpalten: false)
                    }
                    .frame(maxWidth: 780)
                    .frame(maxWidth: .infinity)
                }
            }
            .background((spiel.licht == .aus ? Color.black : Farbe.bus).ignoresSafeArea())
        }
    }

    /// Licht aus im Bus – die Geschichte bleibt lesbar.
    private var dunkel: some View {
        Color.black
            .opacity(spiel.licht == .aus ? 1 : 0)
            .allowsHitTesting(false)
    }
}

// MARK: - Leuchtanzeige

private struct LEDAnzeige: View {
    @EnvironmentObject private var spiel: Spiel
    @State private var zucken = false

    var body: some View {
        HStack(spacing: 14) {
            Text("N13")
            Text("ENDSTATION")
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(spiel.uhr)
                .contentTransition(.numericText())
                .animation(.default, value: spiel.uhr)
        }
        .font(Schrift.led(22))
        .foregroundStyle(Farbe.led)
        .shadow(color: Farbe.led.opacity(0.6), radius: 6)
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
        .background(Color(red: 0.047, green: 0.031, blue: 0.008))
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color(red: 0.11, green: 0.08, blue: 0.02)).frame(height: 3)
        }
        .opacity(spiel.ledStoerung && zucken ? 0.3 : 1)
        .task(id: spiel.ledStoerung) {
            while spiel.ledStoerung && !Task.isCancelled {
                zucken.toggle()
                try? await Task.sleep(nanoseconds: 80_000_000)
            }
            zucken = false
        }
    }
}

// MARK: - Sitzreihe

private struct SitzReihe: View {
    @EnvironmentObject private var spiel: Spiel

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 6) {
                Platz(kurz: "DU", name: spiel.name, du: true)
                ForEach(spiel.fahrgaeste, id: \.self) { id in
                    if let p = Geschichte.leute[id] {
                        Platz(kurz: p.kurz, name: p.name, du: false)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 8)
        }
    }
}

private struct Platz: View {
    let kurz: String
    let name: String
    let du: Bool

    var body: some View {
        VStack(spacing: 3) {
            Text(kurz)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(du ? Farbe.led : Farbe.text)
                .frame(width: 38, height: 38)
                .background(Circle().fill(du ? Color(red: 0.16, green: 0.125, blue: 0.06) : Color(red: 0.133, green: 0.149, blue: 0.204)))
                .overlay(Circle().strokeBorder(du ? Farbe.led : Color(red: 0.2, green: 0.227, blue: 0.3), lineWidth: 2))
            Text(name)
                .font(.system(size: 10))
                .foregroundStyle(Farbe.leise)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(width: 58)
    }
}

// MARK: - Die Geschichte

private struct GeschichteView: View {
    @EnvironmentObject private var spiel: Spiel
    /// Auf flachen Handys im Querformat stehen die Knöpfe nebeneinander.
    let zweiSpalten: Bool

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(spiel.absaetze) { a in
                        AbsatzView(absatz: a)
                    }

                    if let z = spiel.zuege {
                        HStack(spacing: 6) {
                            Text("Bis zur nächsten Haltestelle:")
                                .foregroundStyle(Farbe.leise)
                            Text(String(repeating: "●", count: z) + String(repeating: "○", count: max(0, 2 - z)))
                                .foregroundStyle(Farbe.led)
                                .tracking(3)
                        }
                        .font(.footnote)
                        .padding(.bottom, 8)
                    }

                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6, alignment: .leading),
                                             count: zweiSpalten && spiel.optionen.count > 1 ? 2 : 1),
                              alignment: .leading, spacing: zweiSpalten ? 6 : 8) {
                        ForEach(spiel.optionen) { o in
                            WahlKnopf(option: o, klein: zweiSpalten) { spiel.tippe(o) }
                                .transition(.opacity)
                        }
                    }
                    .animation(.easeIn(duration: 0.3), value: spiel.optionen.map(\.id))

                    Color.clear.frame(height: 70).id("unten")
                }
                .frame(maxWidth: 620, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.top, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .contentShape(Rectangle())
            .onTapGesture { spiel.beeilen() }
            .onChange(of: spiel.absaetze.last?.text) { _, _ in
                proxy.scrollTo("unten", anchor: .bottom)
            }
            .onChange(of: spiel.absaetze.count) { _, _ in
                proxy.scrollTo("unten", anchor: .bottom)
            }
            .onChange(of: spiel.optionen.count) { _, _ in
                withAnimation { proxy.scrollTo("unten", anchor: .bottom) }
            }
        }
    }
}

private struct AbsatzView: View {
    let absatz: Absatz

    var body: some View {
        switch absatz.stil {
        case .trenner:
            Rectangle().fill(Farbe.rand).frame(height: 1).padding(.vertical, 16)
        case .halt:
            Text(absatz.text)
                .font(Schrift.led(22))
                .foregroundStyle(Farbe.led)
                .tracking(2)
                .padding(.top, 8).padding(.bottom, 12)
        case .rede:
            zeile.font(Schrift.maschine(17)).foregroundStyle(Color(red: 0.945, green: 0.918, blue: 0.84))
        case .unheimlich:
            zeile.font(Schrift.maschine(17)).foregroundStyle(Farbe.blut)
        case .leise:
            zeile.font(.system(size: 15).italic()).foregroundStyle(Farbe.leise)
        case .normal:
            zeile.font(.system(size: 17)).foregroundStyle(Farbe.text)
        }
    }

    private var zeile: some View {
        Text(absatz.text)
            .lineSpacing(4)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 12)
    }
}

private struct WahlKnopf: View {
    let option: Option
    var klein = false
    let aktion: () -> Void

    var body: some View {
        Button(action: aktion) {
            Text(option.text)
                .font(.system(size: klein ? 14 : 16))
                .foregroundStyle(vorne)
                .multilineTextAlignment(.leading)
                .padding(.horizontal, klein ? 10 : 14).padding(.vertical, klein ? 8 : 11)
                .frame(maxWidth: option.stil == .weiter ? nil : .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 12).fill(hinten))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(rahmen))
        }
        .buttonStyle(.plain)
    }

    private var vorne: Color {
        switch option.stil {
        case .weiter: return Farbe.led
        case .zurueck: return Farbe.leise
        default: return Farbe.text
        }
    }

    private var hinten: Color {
        switch option.stil {
        case .weiter, .zurueck: return .clear
        default: return Farbe.knopf
        }
    }

    private var rahmen: Color {
        switch option.stil {
        case .weiter: return Color(red: 0.29, green: 0.2, blue: 0.06)
        case .gefahr: return Color(red: 0.36, green: 0.145, blue: 0.133)
        default: return Color(red: 0.18, green: 0.2, blue: 0.263)
        }
    }
}
