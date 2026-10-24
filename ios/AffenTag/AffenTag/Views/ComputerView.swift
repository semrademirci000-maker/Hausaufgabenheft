//
//  ComputerView.swift
//  Der Computer im Stumpf – grüne Schrift auf schwarzem Bildschirm, darunter
//  eine Tastatur zum Antippen. Hier stellst du alles ein: Raum-Code, Name,
//  Fellfarbe, Drehen, Modus, Warteschlange, Gruppe, Ton.
//

import SwiftUI

struct ComputerView: View {
    @EnvironmentObject private var spiel: Spiel
    @Environment(\.dismiss) private var schliessen

    enum Seite: String, CaseIterable, Identifiable {
        case raum, name, farbe, groesse, drehen, modus, warteschlange, karte, ton, info
        var id: String { rawValue }
        var titel: String {
            switch self {
            case .raum: return "RAUM"
            case .name: return "NAME"
            case .farbe: return "FARBE"
            case .groesse: return "GRÖSSE"
            case .drehen: return "DREHEN"
            case .modus: return "MODUS"
            case .warteschlange: return "WARTESCHLANGE"
            case .karte: return "GRUPPE"
            case .ton: return "TON"
            case .info: return "INFO"
            }
        }
    }

    @State private var seite: Seite = .raum
    @State private var eingabe = ""

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                // Seitenliste
                ScrollView {
                    VStack(alignment: .leading, spacing: 2) {
                        ForEach(Seite.allCases) { s in
                            Button {
                                tipp()
                                seite = s
                                eingabe = s == .name ? spiel.einstellungen.name : ""
                            } label: {
                                Text((seite == s ? "▶ " : "  ") + s.titel)
                                    .font(Stil.terminal(14))
                                    .foregroundStyle(seite == s ? Color.black : Stil.terminalGruen)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.vertical, 5)
                                    .padding(.horizontal, 6)
                                    .background(seite == s ? Stil.terminalGruen : .clear)
                            }
                        }
                    }
                }
                .frame(width: 170)

                Rectangle().fill(Stil.terminalGruen.opacity(0.4)).frame(width: 2)

                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        inhalt
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                }
            }
            .frame(maxHeight: .infinity)

            if seite == .raum || seite == .name {
                Tastatur(
                    taste: { t in
                        tipp()
                        if eingabe.count < 12 { eingabe.append(t) }
                    },
                    loeschen: {
                        tipp()
                        if !eingabe.isEmpty { eingabe.removeLast() }
                    }
                )
            }

            HStack {
                Text("AFFEN-OS v1.0  ·  \(spiel.einstellungen.steine) STEINE")
                    .font(Stil.terminal(11))
                    .foregroundStyle(Stil.terminalGruen.opacity(0.7))
                Spacer()
                Button("SCHLIESSEN") { schliessen() }
                    .font(Stil.terminal(14))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Stil.terminalGruen)
            }
            .padding(10)
        }
        .background(Stil.terminalDunkel.ignoresSafeArea())
        .presentationDetents([.large])
        .onAppear { if seite == .name { eingabe = spiel.einstellungen.name } }
    }

    private func tipp() { spiel.klang.klick() }

    // MARK: Inhalt pro Seite

    @ViewBuilder private var inhalt: some View {
        let e = spiel.einstellungen
        switch seite {
        case .raum:
            zeile("AKTUELLER RAUM: \(spiel.raumCode ?? "ÖFFENTLICH")")
            zeile("ÖFFENTLICH = DU TRIFFST ALLE, DIE GERADE SPIELEN.\nPRIVAT MIT FREUNDEN: AUSGEDACHTEN CODE TIPPEN (Z. B. AFFEN7),\nBETRETEN DRÜCKEN – DEINE FREUNDE TIPPEN DENSELBEN CODE.\nIST GERADE KEINER DA, KLETTERST DU ALLEIN.")
            zeile("CODE: \(eingabe)_", gross: true)
            HStack {
                knopf("BETRETEN") { spiel.raumBetreten(eingabe); eingabe = "" }
                knopf("VERLASSEN") { spiel.raumBetreten(nil) }
            }
            zeile("VERBINDUNG:")
            ForEach(Verbindung.allCases, id: \.self) { v in
                wahl(v.computerName, e.verbindung == v) {
                    spiel.einstellungen.verbindung = v
                    spiel.verbinde()
                }
            }
            zeile("\"IN DER NÄHE\" = IPHONE + IPAD IM SELBEN WLAN ODER PER BLUETOOTH.\n\"ONLINE\" BRAUCHT GAME CENTER.")
        case .name:
            zeile("DEIN NAME: \(e.name)")
            zeile("NEU: \(eingabe)_", gross: true)
            knopf("SPEICHERN") {
                let n = eingabe.trimmingCharacters(in: .whitespaces)
                if !n.isEmpty { spiel.einstellungen.name = n }
            }
        case .farbe:
            zeile("FELLFARBE – STUFEN 0 BIS 9")
            stufe("ROT", e.rot, 0...9) { spiel.einstellungen.rot = $0 }
            stufe("GRÜN", e.gruen, 0...9) { spiel.einstellungen.gruen = $0 }
            stufe("BLAU", e.blau, 0...9) { spiel.einstellungen.blau = $0 }
            HStack(spacing: 12) {
                Circle().fill(Color(spiel.meineFarbe)).frame(width: 60, height: 60)
                    .overlay(Circle().strokeBorder(Stil.terminalGruen, lineWidth: 2))
                Text("SO SIEHST DU AUS").font(Stil.terminal(13)).foregroundStyle(Stil.terminalGruen)
            }
        case .groesse:
            zeile("WIE GROSS IST DEIN GORILLA? (10 BIS 36)")
            stufe("GRÖSSE", Int((e.groesse * 10).rounded()), 10...36) { spiel.einstellungen.groesse = Double($0) / 10 }
            zeile("GRÖSSER = LÄNGERE ARME, WEITERE SCHRITTE, HÖHER SPRINGEN.")
        case .drehen:
            zeile("UMSCHAUEN DURCH WISCHEN ÜBER DIE WELT:")
            ForEach(DrehModus.allCases, id: \.self) { d in
                wahl(d.computerName, e.drehModus == d) { spiel.einstellungen.drehModus = d }
            }
            stufe("TEMPO", e.drehTempo, 1...9) { spiel.einstellungen.drehTempo = $0 }
            stufe("STICK", e.empfindlichkeit, 1...9) { spiel.einstellungen.empfindlichkeit = $0 }
            wahl("GYRO (GERÄT DREHEN = UMSCHAUEN): \(e.gyro ? "AN" : "AUS")", e.gyro) { spiel.einstellungen.gyro.toggle() }
        case .modus:
            zeile("SPIELMODUS (GILT AUF ALLEN KARTEN AUSSER DEM STUMPF):")
            ForEach(Modus.allCases) { m in
                wahl(m.computerName, e.modus == m) {
                    spiel.einstellungen.modus = m
                    if spiel.bildschirm == .spiel && spiel.karte != .stumpf { spiel.lade(spiel.karte) }
                }
            }
            zeile(e.modus.erklaerung.uppercased())
        case .warteschlange:
            zeile("WARTESCHLANGE FÜR ÖFFENTLICHE RÄUME:")
            ForEach(Warteschlange.allCases, id: \.self) { w in
                wahl(w.computerName, e.warteschlange == w) {
                    spiel.einstellungen.warteschlange = w
                    spiel.verbinde()
                }
            }
            zeile("NUR SPIELER IN DERSELBEN WARTESCHLANGE TREFFEN SICH.")
        case .karte:
            zeile(spiel.raumCode == nil
                  ? "GRUPPE: ERST UNTER RAUM EINEN CODE BETRETEN.\nDANN NIMMST DU HIER ALLE FREUNDE IM RAUM MIT AUF EINE KARTE."
                  : "GRUPPE \(spiel.raumCode ?? ""): KARTE WÄHLEN – ALLE IM RAUM KOMMEN MIT!")
            ForEach(KartenID.allCases) { k in
                wahl(k.name.uppercased(), spiel.karte == k) {
                    schliessen()
                    spiel.gruppeNach(k)
                }
            }
        case .ton:
            stufe("LAUTSTÄRKE", e.lautstaerke, 0...10) { spiel.einstellungen.lautstaerke = $0 }
            wahl("VIBRATION: \(e.vibration ? "AN" : "AUS")", e.vibration) { spiel.einstellungen.vibration.toggle() }
        case .info:
            zeile("AFFEN-TAG – KLETTERN NUR MIT DEN ARMEN.")
            zeile("LINKER STICK (W A S D) = LAUFEN – DEINE HÄNDE STOSSEN SICH VOM BODEN AB\nWISCHEN = UMSCHAUEN · ⎵ = SPRINGEN · ⇧ = SPRINTEN")
            zeile("GEGEN EINE WAND LAUFEN = HOCHKLETTERN · E = FESTHALTEN\n1 = HÄNDE HOCH · 3 = RUNTER · 4/2 = LINKE/RECHTE HAND\nR = ZURÜCK ZUM START · F = TASCHENLAMPE · TAB = SPIELER")
            zeile("LAVA-AFFEN SIND SCHNELLER UND SPRINGEN WEITER.")
            zeile("STEINE GIBT ES FÜRS FANGEN, ÜBERLEBEN UND GEWINNEN.")
            knopf("ANLEITUNG NOCHMAL ZEIGEN") {
                spiel.einstellungen.anleitungGesehen = false
                schliessen()
            }
        }
    }

    // MARK: Bausteine

    private func zeile(_ t: String, gross: Bool = false) -> some View {
        Text(t)
            .font(Stil.terminal(gross ? 22 : 13))
            .foregroundStyle(Stil.terminalGruen)
            .fixedSize(horizontal: false, vertical: true)
    }

    private func knopf(_ t: String, _ aktion: @escaping () -> Void) -> some View {
        Button {
            tipp()
            aktion()
        } label: {
            Text(t)
                .font(Stil.terminal(14))
                .foregroundStyle(.black)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Stil.terminalGruen)
        }
    }

    private func wahl(_ t: String, _ an: Bool, _ aktion: @escaping () -> Void) -> some View {
        Button {
            tipp()
            aktion()
        } label: {
            Text((an ? "[X] " : "[ ] ") + t)
                .font(Stil.terminal(14))
                .foregroundStyle(an ? Color.black : Stil.terminalGruen)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(an ? Stil.terminalGruen : .clear)
        }
    }

    private func stufe(_ t: String, _ wert: Int, _ bereich: ClosedRange<Int>, _ setze: @escaping (Int) -> Void) -> some View {
        HStack(spacing: 10) {
            Text(t.padding(toLength: 15, withPad: " ", startingAt: 0))
                .font(Stil.terminal(14))
                .foregroundStyle(Stil.terminalGruen)
            knopf("−") { if wert > bereich.lowerBound { setze(wert - 1) } }
            Text("\(wert)")
                .font(Stil.terminal(20))
                .foregroundStyle(Stil.terminalGruen)
                .frame(width: 34)
            knopf("+") { if wert < bereich.upperBound { setze(wert + 1) } }
        }
    }
}

/// Tasten wie am Computer im Stumpf.
struct Tastatur: View {
    let taste: (String) -> Void
    let loeschen: () -> Void

    private let reihen = ["1234567890", "QWERTZUIOP", "ASDFGHJKL", "YXCVBNM"]

    var body: some View {
        VStack(spacing: 5) {
            ForEach(reihen, id: \.self) { reihe in
                HStack(spacing: 5) {
                    ForEach(Array(reihe), id: \.self) { z in
                        Button { taste(String(z)) } label: {
                            Text(String(z))
                                .font(Stil.terminal(15))
                                .foregroundStyle(Stil.terminalGruen)
                                .frame(minWidth: 26, maxWidth: 46, minHeight: 32)
                                .background(RoundedRectangle(cornerRadius: 4).fill(Color.white.opacity(0.06)))
                                .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Stil.terminalGruen.opacity(0.5)))
                        }
                    }
                    if reihe == reihen.last {
                        Button(action: loeschen) {
                            Image(systemName: "delete.left")
                                .foregroundStyle(Stil.terminalGruen)
                                .frame(width: 56, height: 32)
                                .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Stil.terminalGruen.opacity(0.5)))
                        }
                    }
                }
            }
        }
        .padding(8)
        .background(Color.black)
    }
}
