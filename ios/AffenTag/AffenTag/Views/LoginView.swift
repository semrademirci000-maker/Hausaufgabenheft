//
//  LoginView.swift
//  Anmelden mit deinem Affen-Namen (oder als Gast). Der Name steht über deinem Kopf.
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var spiel: Spiel
    @State private var name = ""
    @State private var fehler = ""
    @FocusState private var feldAktiv: Bool

    var body: some View {
        ZStack {
            RadialGradient(colors: [Color(red: 0.12, green: 0.09, blue: 0.06), .black], center: .center, startRadius: 40, endRadius: 600)
                .ignoresSafeArea()
            VStack(spacing: 14) {
                Image("GorillaLogo").resizable().interpolation(.high).frame(width: 96, height: 96)
                Text("AFFEN-TAG").font(Stil.dick(40)).foregroundStyle(Stil.gold)
                Text("Melde dich mit deinem Affen-Namen an. Andere Spieler sehen ihn über deinem Kopf.")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                VStack(alignment: .leading, spacing: 6) {
                    Text("AFFEN-NAME").font(.system(size: 12, weight: .heavy, design: .rounded)).foregroundStyle(Stil.gold)
                    TextField("Z. B. BANANE", text: $name)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .font(.system(size: 20, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(12)
                        .background(Color.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(feldAktiv ? Stil.gold : .white.opacity(0.25), lineWidth: 2))
                        .focused($feldAktiv)
                        .submitLabel(.go)
                        .onSubmit(einloggen)
                        .onChange(of: name) { _, neu in if neu.count > 12 { name = String(neu.prefix(12)) } }
                    Text(fehler).font(.system(size: 13, weight: .semibold)).foregroundStyle(Color(red: 1, green: 0.6, blue: 0.48))
                        .frame(minHeight: 16)
                }
                Button(action: einloggen) {
                    Text("EINLOGGEN").font(Stil.dick(18)).frame(maxWidth: .infinity)
                }
                .buttonStyle(DickerKnopf(farbe: Color(red: 0.95, green: 0.6, blue: 0.2)))
                Button {
                    anmelden("GAST\(Int.random(in: 100...999))")
                } label: {
                    Text("ALS GAST SPIELEN").font(Stil.dick(16)).frame(maxWidth: .infinity)
                }
                .buttonStyle(DickerKnopf(farbe: Color.white.opacity(0.15)))
            }
            .padding(24)
            .frame(maxWidth: 420)
            .background(Color(red: 0.11, green: 0.08, blue: 0.06).opacity(0.92), in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Stil.gold.opacity(0.35), lineWidth: 2))
            .padding(16)
        }
    }

    private func einloggen() {
        let erlaubt = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789 ")
        let n = String(name.uppercased().filter { erlaubt.contains($0) }).trimmingCharacters(in: .whitespaces)
        guard n.count >= 2 else { fehler = "Der Name braucht mindestens 2 Zeichen."; return }
        anmelden(n)
    }

    private func anmelden(_ n: String) {
        spiel.einstellungen.name = n
        spiel.einstellungen.angemeldet = true
    }
}
