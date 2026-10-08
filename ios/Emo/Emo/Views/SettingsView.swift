//
//  SettingsView.swift
//  Einstellungen: Augenfarbe, Stimme, Kamera, Mikrofon, KI.
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var brain: RobotBrain
    @EnvironmentObject private var settings: EmoSettings
    @Environment(\.dismiss) private var dismiss
    @State private var keyInput = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Aussehen") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 14) {
                            ForEach(EmoSettings.eyeColors.indices, id: \.self) { i in
                                let entry = EmoSettings.eyeColors[i]
                                Button {
                                    settings.eyeColorIndex = i
                                } label: {
                                    VStack(spacing: 6) {
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(entry.color)
                                            .frame(width: 30, height: 38)
                                            .shadow(color: entry.color.opacity(0.7), radius: 6)
                                            .overlay {
                                                if settings.eyeColorIndex == i {
                                                    RoundedRectangle(cornerRadius: 10)
                                                        .stroke(.primary, lineWidth: 2)
                                                        .padding(-4)
                                                }
                                            }
                                        Text(entry.name).font(.caption2)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                    Toggle("Untertitel anzeigen", isOn: $settings.showSubtitles)
                    Toggle("Sprech-Balken unter den Augen", isOn: $settings.showTalkBars)
                }

                Section("Stimme und Geräusche") {
                    VStack(alignment: .leading) {
                        Text("Stimmhöhe")
                        Slider(value: $settings.voicePitch, in: 0.8...2.0)
                    }
                    VStack(alignment: .leading) {
                        Text("Lautstärke der Geräusche")
                        Slider(value: $settings.volume, in: 0...1)
                    }
                }

                Section {
                    Toggle("Kamera (Gesicht & Handzeichen)", isOn: $settings.useCamera)
                    Toggle("Emo schaut mich an", isOn: $settings.followFace)
                    Toggle("Mikrofon (Sprachbefehle)", isOn: $settings.useMicrophone)
                    Toggle("Fragen nur mit „Emo“ beantworten", isOn: $settings.needsWakeWord)
                } header: {
                    Text("Sinne")
                } footer: {
                    Text("Kamera und Sprache werden direkt auf dem Gerät ausgewertet. Befehle wie „Hände hoch“, „Peng“, „tanz“ oder „erzähl einen Witz“ funktionieren immer.")
                }

                Section {
                    Picker("KI-Gehirn", selection: $settings.aiMode) {
                        ForEach(AIMode.allCases) { Text($0.title).tag($0) }
                    }
                    LabeledContent("Gerade aktiv", value: brain.aiBackendName)
                    LabeledContent("Apple Intelligence",
                                   value: AIAssistant.appleIntelligenceAvailable ? "verfügbar" : "nicht verfügbar")
                    SecureField(settings.hasClaudeKey ? "Claude-Schlüssel ist gespeichert" : "Claude-API-Schlüssel (sk-ant-…)",
                                text: $keyInput)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onSubmit { saveKey() }
                    HStack {
                        Button("Schlüssel speichern") { saveKey() }
                            .disabled(keyInput.isEmpty)
                        Spacer()
                        if settings.hasClaudeKey {
                            Button("Löschen", role: .destructive) { settings.claudeKey = "" }
                        }
                    }
                } header: {
                    Text("KI-Assistent")
                } footer: {
                    Text("Ohne Schlüssel nutzt Emo Apple Intelligence (ab iOS 26 auf passenden Geräten). Mit einem Claude-Schlüssel von console.anthropic.com antwortet Emo über das Internet. Der Schlüssel liegt sicher im Schlüsselbund.")
                }

                Section("Gefühle ausprobieren") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 96))], spacing: 10) {
                        ForEach(demoMoods.indices, id: \.self) { i in
                            Button(demoMoods[i].1) {
                                dismiss()
                                brain.demo(demoMoods[i].0)
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    Button("Hände hoch!") { dismiss(); brain.surrender() }
                    Button("Peng!") { dismiss(); brain.getShot() }
                    Button("Schlafen legen") { dismiss(); brain.goToSleep() }
                }
            }
            .navigationTitle("Emo")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var demoMoods: [(Mood, String)] {
        [(.happy, "Froh"), (.laughing, "Lachen"), (.sad, "Traurig"), (.crying, "Weinen"),
         (.angry, "Wütend"), (.surprised, "Überrascht"), (.scared, "Angst"), (.love, "Verliebt"),
         (.dizzy, "Schwindelig"), (.suspicious, "Misstrauisch"), (.excited, "Aufgeregt"), (.proud, "Cool")]
    }

    private func saveKey() {
        guard !keyInput.isEmpty else { return }
        settings.claudeKey = keyInput
        keyInput = ""
    }
}
