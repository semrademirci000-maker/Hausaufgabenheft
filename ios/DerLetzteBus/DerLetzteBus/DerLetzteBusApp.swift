//
//  DerLetzteBusApp.swift
//  „Der letzte Bus“ – eine interaktive Gruselgeschichte.
//  Du steigst nachts in einen Bus. Die Haltestellen werden immer seltsamer.
//  An jeder steigt jemand Neues ein. Einer davon ist kein Mensch.
//

import SwiftUI

@main
struct DerLetzteBusApp: App {
    @StateObject private var spiel = Spiel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(spiel)
                .preferredColorScheme(.dark)
                .statusBarHidden()
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var spiel: Spiel
    @State private var stumm = UserDefaults.standard.bool(forKey: "derletztebus.stumm")

    var body: some View {
        ZStack {
            Farbe.nacht.ignoresSafeArea()

            switch spiel.bildschirm {
            case .titel:
                TitelView()
                    .transition(.opacity)
            case .bus:
                BusView()
                    .transition(.opacity)
            }

            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button {
                        spiel.klang.start()
                        stumm = spiel.klang.umschalten()
                    } label: {
                        Image(systemName: stumm ? "speaker.slash.fill" : "speaker.wave.2.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(stumm ? Color.gray : Farbe.led)
                            .frame(width: 42, height: 42)
                            .background(Circle().fill(Color(white: 0.09).opacity(0.9)))
                            .overlay(Circle().strokeBorder(Farbe.rand))
                    }
                    .accessibilityLabel(stumm ? "Ton an" : "Ton aus")
                }
            }
            .padding(16)
        }
    }
}
