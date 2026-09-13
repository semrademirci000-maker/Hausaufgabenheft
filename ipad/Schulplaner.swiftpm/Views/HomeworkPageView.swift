import SwiftUI

/// Eine Heftseite: der Stundenplan dieses Tages auf den Linien,
/// daneben der blaue Plus-Knopf zum Eintragen der Hausaufgabe.
struct HomeworkPageView: View {
    let date: Date

    @EnvironmentObject private var store: PlannerStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var editing: HomeworkTarget?
    @State private var showNotes = false

    private var isCompact: Bool { horizontalSizeClass == .compact }
    private var lineHeight: CGFloat { isCompact ? 42 : 46 }

    private var blocks: [LessonBlock] { store.data.blocks(for: date) }

    var body: some View {
        Group {
            if isCompact {
                lessonPage
            } else {
                HStack(spacing: 0) {
                    lessonPage
                    spine
                    NotesPage(date: date, lineHeight: lineHeight)
                        .environmentObject(store)
                }
            }
        }
        .background(Theme.paper)
        .sheet(item: $editing) { target in
            HomeworkEditorView(date: target.date, block: target.block)
                .environmentObject(store)
        }
        .sheet(isPresented: $showNotes) {
            NavigationStack {
                NotesPage(date: date, lineHeight: lineHeight)
                    .environmentObject(store)
                    .navigationTitle("Notizen")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Fertig") { showNotes = false }
                        }
                    }
            }
        }
    }

    // MARK: - Seite mit den Stunden

    private var lessonPage: some View {
        PaperPage {
            ScrollView {
                VStack(spacing: 0) {
                    header
                    if blocks.isEmpty {
                        emptyHint
                    } else {
                        ForEach(blocks) { block in
                            HomeworkRow(
                                date: date,
                                block: block,
                                lineHeight: lineHeight,
                                compact: isCompact
                            ) {
                                editing = HomeworkTarget(date: date, block: block)
                            }
                            .environmentObject(store)
                        }
                    }
                    if isCompact {
                        notesRow
                    }
                    RuledLines(spacing: lineHeight)
                        .frame(height: lineHeight * 4)
                }
                .padding(.horizontal, isCompact ? 16 : 22)
                .padding(.top, 16)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(SchoolCalendar.longDateFormatter.string(from: date))
                .font(Theme.font(isCompact ? 19 : 21, .semibold))
                .foregroundStyle(Theme.ink)
            Text(statusText)
                .font(Theme.font(12))
                .foregroundStyle(SchoolCalendar.isToday(date) ? Theme.accent : Theme.tertiaryInk)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, 10)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Theme.rule)
                .frame(height: 1)
        }
        .padding(.bottom, 4)
    }

    private var statusText: String {
        let open = store.openCount(for: date)
        if SchoolCalendar.isToday(date) {
            return open > 0 ? "Heute · \(open) offen" : "Heute"
        }
        return open > 0 ? "\(open) offen" : SchoolCalendar.shortDateFormatter.string(from: date)
    }

    private var emptyHint: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Kein Unterricht eingetragen")
                .font(Theme.font(15, .medium))
                .foregroundStyle(Theme.ink)
            Text("Trage die Stunden im Stundenplan ein – dann stehen sie hier automatisch.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.secondaryInk)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 16)
    }

    private var notesRow: some View {
        Button {
            showNotes = true
        } label: {
            HStack(spacing: 8) {
                Text("Notizen")
                    .font(Theme.font(14, .medium))
                    .foregroundStyle(Theme.secondaryInk)
                Spacer(minLength: 8)
                Text(store.note(for: date))
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.tertiaryInk)
                    .lineLimit(1)
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.tertiaryInk)
            }
            .frame(height: lineHeight)
            .overlay(alignment: .bottom) {
                Rectangle().fill(Theme.rule).frame(height: 0.75)
            }
        }
        .buttonStyle(.plain)
    }

    /// Buchfalz auf dem iPad.
    private var spine: some View {
        LinearGradient(
            colors: [
                Color.black.opacity(0.015),
                Color.black.opacity(0.10),
                Color.black.opacity(0.015)
            ],
            startPoint: .leading,
            endPoint: .trailing
        )
        .frame(width: 18)
    }
}

/// Welche Hausaufgabe wird gerade bearbeitet?
struct HomeworkTarget: Identifiable {
    let date: Date
    let block: LessonBlock
    var id: String { PlannerData.homeworkKey(date: date, period: block.firstPeriod) }
}

/// Eine Zeile auf der Linie: Stunde, Fach, Hausaufgabe, Plus-Knopf.
struct HomeworkRow: View {
    let date: Date
    let block: LessonBlock
    let lineHeight: CGFloat
    let compact: Bool
    var onEdit: () -> Void

    @EnvironmentObject private var store: PlannerStore

    private var entry: HomeworkEntry? {
        store.entry(date: date, period: block.firstPeriod)
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Text(block.periodLabel)
                    .font(Theme.font(11))
                    .monospacedDigit()
                    .foregroundStyle(Theme.tertiaryInk)
                    .frame(width: 34, alignment: .trailing)

                HStack(spacing: 7) {
                    Circle()
                        .fill(block.subject.color)
                        .frame(width: 7, height: 7)
                    Text(block.subject.name)
                        .font(Theme.font(compact ? 15 : 16, .medium))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
                .frame(width: compact ? 100 : 122, alignment: .leading)

                homeworkText
                    .frame(maxWidth: .infinity, alignment: .leading)

                if entry?.hasContent == true {
                    Button {
                        store.toggleDone(date: date, period: block.firstPeriod)
                    } label: {
                        Image(systemName: (entry?.done ?? false) ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 19, weight: .regular))
                            .foregroundStyle((entry?.done ?? false) ? Theme.success : Theme.tertiaryInk)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Text("Erledigt"))
                }

                Button(action: onEdit) {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(Theme.accent))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text("Hausaufgabe für \(block.subject.name) eintragen"))
            }
            .padding(.vertical, 6)
            .frame(minHeight: lineHeight)

            Rectangle()
                .fill(Theme.rule)
                .frame(height: 0.75)
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: onEdit)
    }

    @ViewBuilder
    private var homeworkText: some View {
        if let entry, entry.noHomework {
            Text("Keine Hausaufgaben")
                .font(Theme.font(14))
                .foregroundStyle(Theme.secondaryInk)
        } else if let entry, !entry.text.isEmpty {
            Text(entry.text)
                .font(Theme.font(14))
                .foregroundStyle(entry.done ? Theme.tertiaryInk : Theme.ink)
                .strikethrough(entry.done, color: Theme.tertiaryInk)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)
        } else {
            Color.clear.frame(height: 1)
        }
    }
}

/// Notizen – auf dem iPad die rechte Buchseite.
struct NotesPage: View {
    let date: Date
    let lineHeight: CGFloat

    @EnvironmentObject private var store: PlannerStore

    var body: some View {
        PaperPage {
            VStack(alignment: .leading, spacing: 8) {
                Text("Notizen")
                    .font(Theme.font(14, .medium))
                    .foregroundStyle(Theme.secondaryInk)
                    .padding(.bottom, 8)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(Theme.rule).frame(height: 1)
                    }

                ZStack(alignment: .topLeading) {
                    RuledLines(spacing: lineHeight)
                    TextEditor(text: store.noteBinding(for: date))
                        .font(Theme.font(15))
                        .foregroundStyle(Theme.ink)
                        .scrollContentBackground(.hidden)
                        .background(Color.clear)
                        .padding(.leading, -5)
                    if store.note(for: date).isEmpty {
                        Text("Zettel abgeben, Sportzeug mitnehmen …")
                            .font(Theme.font(14))
                            .foregroundStyle(Theme.tertiaryInk)
                            .padding(.top, 8)
                            .allowsHitTesting(false)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)
        }
    }
}
