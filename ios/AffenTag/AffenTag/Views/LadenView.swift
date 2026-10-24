//
//  LadenView.swift
//  Hüte und Brillen gegen Steine (💎), die du beim Spielen verdienst.
//

import SwiftUI

struct LadenView: View {
    @EnvironmentObject private var spiel: Spiel
    @Environment(\.dismiss) private var schliessen
    @State private var zuTeuer: String?

    var body: some View {
        VStack(spacing: 14) {
            HStack {
                Text("🛍️ LADEN").font(Stil.dick(26))
                Spacer()
                Text("💎 \(spiel.einstellungen.steine)").font(Stil.dick(22))
                Button("FERTIG") { schliessen() }
                    .buttonStyle(DickerKnopf())
            }
            if let z = zuTeuer {
                Text("Noch zu teuer: \(z). Spiel weiter, um Steine zu sammeln!")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(.orange)
            }
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                    ForEach(Kosmetik.alle) { k in karte(k) }
                }
            }
        }
        .padding(20)
        .background(Color(red: 0.95, green: 0.9, blue: 0.8).ignoresSafeArea())
        .presentationDetents([.large])
    }

    private func karte(_ k: Kosmetik) -> some View {
        let e = spiel.einstellungen
        let besitzt = e.besitz.contains(k.id)
        let traegt = e.hut == k.id || e.gesicht == k.id
        return VStack(spacing: 6) {
            Text(k.symbol).font(.system(size: 44))
            Text(k.name).font(Stil.dick(14)).foregroundStyle(.black)
            Text(k.art == .hut ? "Kopf" : "Gesicht").font(.system(size: 11)).foregroundStyle(.gray)
            Button {
                spiel.klang.klick()
                if besitzt {
                    spiel.trage(k)
                } else if spiel.kaufe(k) {
                    zuTeuer = nil
                    spiel.trage(k)
                } else {
                    zuTeuer = k.name
                }
            } label: {
                Text(besitzt ? (traegt ? "ABLEGEN" : "ANZIEHEN") : "💎 \(k.preis)")
                    .font(Stil.dick(14))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(DickerKnopf(farbe: besitzt ? (traegt ? Color.gray : Stil.blatt) : Color(red: 0.2, green: 0.5, blue: 0.95)))
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 16).fill(.white))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(traegt ? Stil.blatt : Color.black.opacity(0.1), lineWidth: 3))
    }
}
