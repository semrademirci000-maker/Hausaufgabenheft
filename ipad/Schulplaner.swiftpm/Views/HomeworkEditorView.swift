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

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    subjectHeader
                    field
                    noHomeworkButton
                    if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        doneToggle
                    }
                    if store.entry(date: date, period: block.firstPeriod) != nil {
                        Button("Eintrag löschen", role: .destructive) {
                            store.setEntry(nil, date: date, period: block.firstPeriod)
                            dismiss()
                        }
                        .font(Theme.font(14))
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, 4)
                    }
                }
                .padding(22)
            }
            .background(Theme.background.ignoresSafeArea())
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
                    .font(Theme.font(16, .semibold))
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear(perform: load)
    }

    private var subjectHeader: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(block.subject.color)
                .frame(width: 10, height: 10)
            VStack(alignment: .leading, spacing: 2) {
                Text(block.subject.name)
                    .font(Theme.font(19, .semibold))
                    .foregroundStyle(Theme.ink)
                Text("\(block.longPeriodLabel) · \(SchoolCalendar.longDateFormatter.string(from: date))")
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.secondaryInk)
            }
            Spacer(minLength: 0)
        }
    }

    private var field: some View {
        TextField("z. B. Arbeitsheft Seite 15, Nr. 3", text: $text, axis: .vertical)
            .font(Theme.font(16))
            .foregroundStyle(Theme.ink)
            .lineLimit(3...8)
            .focused($writing)
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
            .onChange(of: text) { newValue in
                if !newValue.isEmpty { noHomework = false }
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
            Text("Keine Hausaufgaben")
                .font(Theme.font(16, .medium))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Theme.accent)
                )
        }
        .buttonStyle(.plain)
    }

    private var doneToggle: some View {
        Toggle(isOn: $done) {
            Text("Erledigt")
                .font(Theme.font(15))
                .foregroundStyle(Theme.ink)
        }
        .tint(Theme.success)
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
