//
//  HomeworkEditorView.swift
//  Hausaufgabe eintippen – oder „keine Hausaufgaben“.
//

import SwiftUI

struct HomeworkEditorView: View {
    let date: Date
    let period: Int
    let subjectName: String
    let hours: String

    @EnvironmentObject private var planner: Planner
    @Environment(\.dismiss) private var dismiss

    @State private var text: String = ""
    @FocusState private var focused: Bool

    private var existing: HomeworkEntry? { planner.entry(date: date, period: period) }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 14) {
                Text("\(SchoolDay.name(date)), \(SchoolDay.longDate(date)) · \(hours) Stunde")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.inkSoft)

                TextEditor(text: $text)
                    .font(Handwriting.font(24))
                    .foregroundStyle(Color.pencil)
                    .focused($focused)
                    .frame(minHeight: 140)
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(Color.ink.opacity(0.15), lineWidth: 2)
                            )
                    )
                    .overlay(alignment: .topLeading) {
                        if text.isEmpty {
                            Text("z. B. Arbeitsheft Seite 15, Nr. 3")
                                .font(Handwriting.font(24))
                                .foregroundStyle(Color.inkSoft.opacity(0.6))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 16)
                                .allowsHitTesting(false)
                        }
                    }

                HStack(spacing: 10) {
                    Button("Keine Hausaufgaben") {
                        planner.setEntry(HomeworkEntry(text: "", none: true, done: false),
                                         date: date, period: period)
                        dismiss()
                    }
                    .buttonStyle(SoftButtonStyle())

                    Button("Speichern") { saveEntry() }
                        .buttonStyle(SoftButtonStyle(tint: .planBlue, textColor: .white))
                }

                if existing != nil {
                    Button("Eintrag löschen", role: .destructive) {
                        planner.setEntry(nil, date: date, period: period)
                        dismiss()
                    }
                    .frame(maxWidth: .infinity)
                }

                Spacer()
            }
            .padding(20)
            .background(Color.deskLight.ignoresSafeArea())
            .navigationTitle(subjectName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") { saveEntry() }
                }
            }
            .onAppear {
                if let e = existing, !e.none { text = e.text }
                focused = true
            }
        }
    }

    private func saveEntry() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        var entry = existing ?? HomeworkEntry()
        if trimmed.isEmpty {
            entry.text = ""
            entry.none = true
        } else {
            entry.text = trimmed
            entry.none = false
        }
        planner.setEntry(entry, date: date, period: period)
        dismiss()
    }
}
