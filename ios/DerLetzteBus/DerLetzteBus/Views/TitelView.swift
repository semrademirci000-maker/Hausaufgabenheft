//
//  TitelView.swift
//  Titelbild: Name eingeben, einsteigen, gefundene Enden sehen.
//

import SwiftUI

struct TitelView: View {
    @EnvironmentObject private var spiel: Spiel
    @State private var name = ""
    @State private var flackern = false
    @FocusState private var tippt: Bool

    var body: some View {
        GeometryReader { geo in
            ScrollView {
                if geo.size.width > geo.size.height {
                    // Querformat: links der Titel, rechts Name und Einsteigen
                    HStack(alignment: .center, spacing: 48) {
                        VStack(spacing: 14) { kopf }
                            .frame(maxWidth: 420)
                        VStack(spacing: 14) { bedienung }
                            .frame(maxWidth: 420)
                    }
                    .padding(.horizontal, 16)
                    .frame(maxWidth: .infinity, minHeight: geo.size.height)
                } else {
                    VStack(spacing: 22) {
                        kopf
                        bedienung
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 40)
                    .frame(maxWidth: .infinity, minHeight: geo.size.height)
                }
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(
            ZStack {
                RadialGradient(colors: [Color(red: 0.16, green: 0.11, blue: 0.06), .clear],
                               center: .bottom, startRadius: 0, endRadius: 500)
                RadialGradient(colors: [Color(red: 0.055, green: 0.08, blue: 0.14), .clear],
                               center: .top, startRadius: 0, endRadius: 500)
            }
            .ignoresSafeArea()
        )
        .onAppear { name = spiel.name }
        .task { await ledFlackern() }
    }

    @ViewBuilder private var kopf: some View {
        HStack(spacing: 22) {
            Text("N13")
            Text("ENDSTATION")
        }
        .font(Schrift.led(26))
        .foregroundStyle(Farbe.led)
        .shadow(color: Farbe.led.opacity(0.7), radius: 8)
        .padding(.horizontal, 16).padding(.vertical, 6)
        .background(RoundedRectangle(cornerRadius: 6).fill(Color(red: 0.08, green: 0.05, blue: 0.01)))
        .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color(red: 0.17, green: 0.11, blue: 0.03), lineWidth: 2))
        .opacity(flackern ? 0.35 : 1)

        Text("Der letzte Bus")
            .font(Schrift.maschine(54))
            .foregroundStyle(Color(red: 0.94, green: 0.91, blue: 0.85))
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.5)
            .lineLimit(1)
            .shadow(color: .black, radius: 0, x: 3, y: 3)

        VStack(spacing: 4) {
            Text("Jede Haltestelle ist seltsamer als die davor.")
            Text("An jeder steigt jemand Neues ein.")
            Text("Einer davon ist kein Mensch.").foregroundStyle(Farbe.blut)
        }
        .foregroundStyle(Farbe.leise)
        .multilineTextAlignment(.center)
    }

    @ViewBuilder private var bedienung: some View {
        VStack(spacing: 6) {
            Text("Wie heißt du?")
                .font(.footnote)
                .foregroundStyle(Farbe.leise)
            TextField("Sam", text: $name)
                .font(Schrift.maschine(20))
                .multilineTextAlignment(.center)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .focused($tippt)
                .submitLabel(.go)
                .onSubmit(los)
                .padding(.vertical, 9)
                .frame(maxWidth: 230)
                .background(RoundedRectangle(cornerRadius: 8).fill(Color(red: 0.06, green: 0.067, blue: 0.09)))
                .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(tippt ? Farbe.led : Farbe.rand))
        }

        Button(action: los) {
            Text("Einsteigen")
                .font(.system(size: 19, weight: .semibold))
                .foregroundStyle(Color(red: 0.1, green: 0.06, blue: 0.01))
                .padding(.horizontal, 44).padding(.vertical, 14)
                .background(Capsule().fill(Farbe.led))
                .shadow(color: Farbe.led.opacity(0.35), radius: 20)
        }

        if !spiel.gefundeneEnden.isEmpty { endenListe }

        Text("Tippe auf den Text, um ihn schneller zu lesen. Ton an für Gänsehaut.")
            .font(.footnote)
            .foregroundStyle(Color(white: 0.36))
            .multilineTextAlignment(.center)
    }

    private var endenListe: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], spacing: 8) {
            ForEach(Ende.allCases, id: \.self) { e in
                let gefunden = spiel.gefundeneEnden.contains(e)
                Text(gefunden ? "★ " + e.titel : "? ? ?")
                    .font(.footnote)
                    .foregroundStyle(gefunden ? Farbe.led : Farbe.leise)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .overlay(Capsule().strokeBorder(gefunden ? Farbe.led : Farbe.rand))
            }
        }
        .frame(maxWidth: 300)
        .overlay(alignment: .bottom) {
            Text("\(spiel.gefundeneEnden.count) von \(Ende.allCases.count) Enden")
                .font(.caption)
                .foregroundStyle(Farbe.leise)
                .offset(y: 22)
        }
        .padding(.bottom, 16)
    }

    private func los() {
        tippt = false
        spiel.einsteigen(name: name)
    }

    /// Die Leuchtanzeige zuckt ab und zu kurz.
    private func ledFlackern() async {
        while !Task.isCancelled {
            try? await Task.sleep(nanoseconds: UInt64(Double.random(in: 3...7) * 1_000_000_000))
            for _ in 0..<2 {
                flackern = true
                try? await Task.sleep(nanoseconds: 70_000_000)
                flackern = false
                try? await Task.sleep(nanoseconds: 90_000_000)
            }
        }
    }
}
