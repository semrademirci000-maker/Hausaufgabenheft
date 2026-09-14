import SwiftUI

/// Eine Heftseite: ein Tag, der Stundenplan dieses Tages auf den Linien
/// und der blaue Plus-Knopf zum Eintragen der Hausaufgabe.
struct HomeworkPageView: View {
    let date: Date

    @EnvironmentObject private var store: PlannerStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var openSheet: PageSheet?

    /// Zeilenabstand des Linienrasters – alles sitzt auf diesen Linien.
    private let lineHeight: CGFloat = 34

    private var blocks: [LessonBlock] { store.data.blocks(for: date) }
    private var isWeekend: Bool { SchoolCalendar.isWeekendPage(date) }

    var body: some View {
        ZStack(alignment: .topLeading) {
            Theme.paper

            VStack(alignment: .leading, spacing: 0) {
                header
                ZStack(alignment: .topLeading) {
                    RuledLines(spacing: lineHeight)
                    VStack(alignment: .leading, spacing: 0) {
                        if isWeekend {
                            notesLine
                        } else if blocks.isEmpty {
                            Text("Kein Unterricht eingetragen")
                                .font(Theme.font(13))
                                .foregroundStyle(Theme.tertiaryInk)
                                .frame(height: lineHeight, alignment: .leading)
                            notesLine
                        } else {
                            ForEach(blocks) { block in
                                entry(block)
                            }
                            notesLine
                        }
                    }
                }
            }
            .padding(.horizontal, 13)
            .padding(.top, 12)
        }
        .sheet(item: $openSheet) { sheet in
            switch sheet {
            case .homework(let target):
                HomeworkEditorView(date: target.date, block: target.block)
                    .environmentObject(store)
            case .notes:
                NavigationStack {
                    NotesEditor(date: date)
                        .environmentObject(store)
                        .navigationTitle("Notizen")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .confirmationAction) {
                                Button("Fertig") { openSheet = nil }
                            }
                        }
                }
            }
        }
    }

    // MARK: - Kopf der Seite

    private var header: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(headerTitle)
                .font(Theme.font(16, .semibold))
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Text(headerSubtitle)
                .font(Theme.font(11))
                .foregroundStyle(SchoolCalendar.isToday(date) ? Theme.accent : Theme.tertiaryInk)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, 8)
    }

    private var headerTitle: String {
        if isWeekend { return "Wochenende" }
        return SchoolCalendar.shortWeekdayFormatter.string(from: date) + " · "
            + SchoolCalendar.dayMonthFormatter.string(from: date)
    }

    private var headerSubtitle: String {
        if isWeekend { return "Platz für alles andere" }
        let open = store.openCount(for: date)
        if SchoolCalendar.isToday(date) {
            return open > 0 ? "Heute · \(open) offen" : "Heute"
        }
        return open > 0 ? "\(open) offen" : " "
    }

    // MARK: - Eine Stunde auf der Linie

    private func entry(_ block: LessonBlock) -> some View {
        let stored = store.entry(date: date, period: block.firstPeriod)

        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Text(block.periodLabel)
                    .font(Theme.font(10.5))
                    .monospacedDigit()
                    .foregroundStyle(Theme.tertiaryInk)
                Circle()
                    .fill(block.subject.color)
                    .frame(width: 7, height: 7)
                Text(block.subject.name)
                    .font(Theme.font(14, .medium))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Spacer(minLength: 4)

                if stored?.hasContent == true {
                    Button {
                        store.toggleDone(date: date, period: block.firstPeriod)
                    } label: {
                        Image(systemName: (stored?.done ?? false) ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 16))
                            .foregroundStyle((stored?.done ?? false) ? Theme.success : Theme.tertiaryInk)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Text("Erledigt"))
                }

                Button {
                    openSheet = .homework(HomeworkTarget(date: date, block: block))
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 22, height: 22)
                        .background(Circle().fill(Theme.accent))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text("Hausaufgabe für \(block.subject.name) eintragen"))
            }
            .frame(height: lineHeight)

            taskText(stored)
                .frame(maxWidth: .infinity, minHeight: lineHeight, alignment: .topLeading)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            openSheet = .homework(HomeworkTarget(date: date, block: block))
        }
    }

    @ViewBuilder
    private func taskText(_ entry: HomeworkEntry?) -> some View {
        if let entry, entry.noHomework {
            lineText("Keine Hausaufgaben", color: Theme.secondaryInk, strikethrough: false)
        } else if let entry, !entry.text.isEmpty {
            lineText(entry.text,
                     color: entry.done ? Theme.tertiaryInk : Theme.ink,
                     strikethrough: entry.done)
        } else {
            Color.clear.frame(height: lineHeight)
        }
    }

    /// Text, der genau auf dem Linienraster sitzt.
    private func lineText(_ text: String, color: Color, strikethrough: Bool) -> some View {
        Text(text)
            .font(Theme.font(13))
            .foregroundStyle(color)
            .strikethrough(strikethrough, color: Theme.tertiaryInk)
            .lineSpacing(lineHeight - 16)
            .padding(.top, (lineHeight - 16) / 2)
            .padding(.leading, 14)
            .lineLimit(2)
            .fixedSize(horizontal: false, vertical: true)
    }

    // MARK: - Notizen

    private var notesLine: some View {
        Button {
            openSheet = .notes
        } label: {
            HStack(spacing: 6) {
                Text("Notizen")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.secondaryInk)
                Spacer(minLength: 4)
                Text(store.note(for: date))
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.tertiaryInk)
                    .lineLimit(1)
            }
            .frame(height: lineHeight)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// Was gerade über der Seite geöffnet ist.
enum PageSheet: Identifiable {
    case homework(HomeworkTarget)
    case notes

    var id: String {
        switch self {
        case .homework(let target): return "hausaufgabe-" + target.id
        case .notes: return "notizen"
        }
    }
}

/// Welche Hausaufgabe wird gerade bearbeitet?
struct HomeworkTarget: Identifiable {
    let date: Date
    let block: LessonBlock
    var id: String { PlannerData.homeworkKey(date: date, period: block.firstPeriod) }
}

/// Notizen zu einem Tag.
struct NotesEditor: View {
    let date: Date
    @EnvironmentObject private var store: PlannerStore

    var body: some View {
        ZStack(alignment: .topLeading) {
            Theme.paper.ignoresSafeArea()
            RuledLines(spacing: 34)
                .padding(.horizontal, 18)
                .padding(.top, 14)
            TextEditor(text: store.noteBinding(for: date))
                .font(Theme.font(15))
                .foregroundStyle(Theme.ink)
                .lineSpacing(34 - 18)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 13)
                .padding(.top, 12)
            if store.note(for: date).isEmpty {
                Text("Zettel abgeben, Sportzeug mitnehmen …")
                    .font(Theme.font(14))
                    .foregroundStyle(Theme.tertiaryInk)
                    .padding(.horizontal, 18)
                    .padding(.top, 20)
                    .allowsHitTesting(false)
            }
        }
    }
}
