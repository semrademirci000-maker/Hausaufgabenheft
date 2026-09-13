import SwiftUI

/// Hausaufgabe eintippen – oder „Keine Hausaufgaben“ wählen.
struct HomeworkEditorView: View {
    let date: Date
    let block: LessonBlock

    @EnvironmentObject private var store: PlannerStore
    @Environment(\.dismiss) private var dismiss

    @State private var text = ""
    @State private var done = false
    @State private var noHomework = false
    @State private var loaded = false
    @FocusState private var writing: Bool

    private let suggestions = ["Arbeitsheft Seite ", "Buch Seite ", "Nr. ", "üben", "auswendig lernen"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    subjectHeader
                    editor
                    suggestionChips
                    noHomeworkButton
                    doneToggle
                    if store.entry(date: date, period: block.firstPeriod) != nil {
                        Button("Eintrag löschen", role: .destructive) {
                            store.setEntry(nil, date: date, period: block.firstPeriod)
                            dismiss()
                        }
                        .font(Theme.font(15, .semibold))
                        .frame(maxWidth: .infinity, alignment: .center)
                    }
                }
                .padding(20)
            }
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle("Hausaufgabe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") {
                        save()
                        dismiss()
                    }
                    .font(Theme.font(16, .bold))
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear(perform: load)
    }

    private var subjectHeader: some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(block.subject.color)
                .frame(width: 34, height: 34)
            VStack(alignment: .leading, spacing: 2) {
                Text(block.subject.name)
                    .font(Theme.font(22, .bold))
                    .foregroundStyle(Theme.ink)
                Text("\(block.longPeriodLabel) · \(SchoolCalendar.longDateFormatter.string(from: date))")
                    .font(Theme.font(13, .medium))
                    .foregroundStyle(Theme.softInk)
            }
            Spacer(minLength: 0)
        }
    }

    private var editor: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Was ist auf?")
                .font(Theme.font(14, .semibold))
                .foregroundStyle(Theme.softInk)

            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .strokeBorder(Color.black.opacity(0.12), lineWidth: 1)
                    )
                TextEditor(text: $text)
                    .font(Theme.font(17, .medium))
                    .foregroundStyle(Theme.ink)
                    .scrollContentBackground(.hidden)
                    .padding(10)
                    .focused($writing)
                if text.isEmpty {
                    Text("z. B. Arbeitsheft Seite 15, Nr. 3")
                        .font(Theme.font(16, .regular))
                        .foregroundStyle(Theme.softInk.opacity(0.6))
                        .padding(.horizontal, 15)
                        .padding(.vertical, 18)
                        .allowsHitTesting(false)
                }
            }
            .frame(minHeight: 130)
        }
    }

    private var suggestionChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(suggestions, id: \.self) { suggestion in
                    Button {
                        if !text.isEmpty, !text.hasSuffix(" ") { text += " " }
                        text += suggestion
                        noHomework = false
                        writing = true
                    } label: {
                        Text(suggestion.trimmingCharacters(in: .whitespaces))
                            .font(Theme.font(14, .semibold))
                            .foregroundStyle(Theme.ink)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(Color.black.opacity(0.06)))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var noHomeworkButton: some View {
        Button {
            noHomework = true
            text = ""
            done = false
            save()
            dismiss()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                Text("Keine Hausaufgaben")
            }
            .font(Theme.font(17, .bold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Theme.blue)
            )
        }
        .buttonStyle(.plain)
    }

    private var doneToggle: some View {
        Toggle(isOn: $done) {
            Text("Schon erledigt")
                .font(Theme.font(16, .semibold))
                .foregroundStyle(Theme.ink)
        }
        .tint(Color(hex: "#2AA66B"))
        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    }

    private func load() {
        guard !loaded else { return }
        loaded = true
        let entry = store.entry(date: date, period: block.firstPeriod)
        text = entry?.text ?? ""
        done = entry?.done ?? false
        noHomework = entry?.noHomework ?? false
        if text.isEmpty && !noHomework {
            writing = true
        }
    }

    private func save() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty && !noHomework {
            store.setEntry(nil, date: date, period: block.firstPeriod)
            return
        }
        let entry = HomeworkEntry(
            text: trimmed,
            noHomework: trimmed.isEmpty ? noHomework : false,
            done: trimmed.isEmpty ? false : done
        )
        store.setEntry(entry, date: date, period: block.firstPeriod)
    }
}
