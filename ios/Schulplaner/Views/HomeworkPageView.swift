import SwiftUI

/// Eine Seite im Hausaufgabenheft – der Stundenplan von genau diesem Tag,
/// untereinander auf den Linien, mit blauem Plus-Knopf zum Eintragen.
struct HomeworkPageView: View {
    let date: Date

    @EnvironmentObject private var store: PlannerStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var editing: HomeworkTarget?
    @State private var showNotes = false

    private var isCompact: Bool { horizontalSizeClass == .compact }
    private var lineHeight: CGFloat { isCompact ? 44 : 48 }

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

    // MARK: - Linke Seite: Stunden und Hausaufgaben

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
                        notesButton
                    }
                    RuledLines(spacing: lineHeight)
                        .frame(height: lineHeight * 4)
                }
                .padding(.leading, 26)
                .padding(.trailing, 14)
                .padding(.top, 12)
            }
            .scrollBounceBehavior(.basedOnSize)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(SchoolCalendar.longDateFormatter.string(from: date))
                    .font(Theme.font(isCompact ? 22 : 26, .bold))
                    .foregroundStyle(Theme.ink)
                if SchoolCalendar.isToday(date) {
                    Text("heute")
                        .font(Theme.font(12, .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Capsule().fill(Theme.blue))
                }
                Spacer(minLength: 0)
            }
            Text("Hausaufgaben")
                .font(Theme.font(13, .semibold))
                .foregroundStyle(Theme.softInk)
        }
        .padding(.bottom, 8)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Theme.rule)
                .frame(height: 1.5)
        }
        .padding(.bottom, 6)
    }

    private var emptyHint: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("An diesem Tag ist noch kein Unterricht eingetragen.")
                .font(Theme.font(16, .semibold))
                .foregroundStyle(Theme.ink)
            Text("Trage die Stunden erst im Stundenplan ein – dann stehen sie hier automatisch auf den Linien.")
                .font(Theme.font(14, .medium))
                .foregroundStyle(Theme.softInk)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 14)
    }

    private var notesButton: some View {
        Button {
            showNotes = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "square.and.pencil")
                Text(store.note(for: date).isEmpty ? "Notizen" : "Notizen ansehen")
                Spacer()
                if !store.note(for: date).isEmpty {
                    Text(store.note(for: date))
                        .font(Theme.font(13, .regular))
                        .foregroundStyle(Theme.softInk)
                        .lineLimit(1)
                }
            }
            .font(Theme.font(15, .semibold))
            .foregroundStyle(Theme.blue)
            .frame(height: lineHeight)
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.rule).frame(height: 1)
        }
    }

    /// Die Mitte des Buches (Falz) auf dem iPad.
    private var spine: some View {
        LinearGradient(
            colors: [
                Color.black.opacity(0.02),
                Color.black.opacity(0.16),
                Color.black.opacity(0.02)
            ],
            startPoint: .leading,
            endPoint: .trailing
        )
        .frame(width: 22)
    }
}

/// Welche Hausaufgabe wird gerade bearbeitet?
struct HomeworkTarget: Identifiable {
    let date: Date
    let block: LessonBlock
    var id: String { PlannerData.homeworkKey(date: date, period: block.firstPeriod) }
}

/// Eine Zeile auf der Linie: Stunde, Fach, Hausaufgabe und der blaue Plus-Knopf.
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
            HStack(alignment: .center, spacing: 10) {
                Text(block.periodLabel)
                    .font(Theme.font(12, .semibold))
                    .foregroundStyle(Theme.softInk)
                    .frame(width: 38, alignment: .trailing)

                HStack(spacing: 7) {
                    Circle()
                        .fill(block.subject.color)
                        .frame(width: 10, height: 10)
                    Text(block.subject.name)
                        .font(Theme.font(compact ? 16 : 18, .bold))
                        .foregroundStyle(block.subject.color)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .frame(width: compact ? 104 : 128, alignment: .leading)

                homeworkText
                    .frame(maxWidth: .infinity, alignment: .leading)

                if entry?.hasContent == true {
                    Button {
                        store.toggleDone(date: date, period: block.firstPeriod)
                    } label: {
                        Image(systemName: (entry?.done ?? false) ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 21))
                            .foregroundStyle((entry?.done ?? false) ? Color(hex: "#2AA66B") : Theme.softInk.opacity(0.6))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Text("Erledigt"))
                }

                Button(action: onEdit) {
                    Image(systemName: "plus")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 30, height: 30)
                        .background(Circle().fill(Theme.blue))
                        .shadow(color: Theme.blue.opacity(0.35), radius: 3, x: 0, y: 2)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text("Hausaufgabe für \(block.subject.name) eintragen"))
            }
            .padding(.vertical, 6)
            .frame(minHeight: lineHeight)

            Rectangle()
                .fill(Theme.rule)
                .frame(height: 1)
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: onEdit)
    }

    @ViewBuilder
    private var homeworkText: some View {
        if let entry, entry.noHomework {
            HStack(spacing: 5) {
                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .bold))
                Text("Keine Hausaufgaben")
            }
            .font(Theme.font(15, .medium))
            .foregroundStyle(Color(hex: "#2AA66B"))
        } else if let entry, !entry.text.isEmpty {
            Text(entry.text)
                .font(Theme.font(15, .medium))
                .foregroundStyle(entry.done ? Theme.softInk : Theme.ink)
                .strikethrough(entry.done, color: Theme.softInk)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)
        } else {
            Text("Tippe auf +")
                .font(Theme.font(14, .regular))
                .foregroundStyle(Theme.softInk.opacity(0.55))
        }
    }
}

/// Rechte Seite bzw. Notiz-Blatt: freier Platz zum Schreiben.
struct NotesPage: View {
    let date: Date
    let lineHeight: CGFloat

    @EnvironmentObject private var store: PlannerStore

    var body: some View {
        PaperPage(showMargin: false) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Notizen")
                    .font(Theme.font(18, .bold))
                    .foregroundStyle(Theme.ink)
                    .padding(.bottom, 6)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(Theme.rule).frame(height: 1.5)
                    }

                ZStack(alignment: .topLeading) {
                    RuledLines(spacing: lineHeight)
                    TextEditor(text: store.noteBinding(for: date))
                        .font(Theme.font(16, .medium))
                        .foregroundStyle(Theme.ink)
                        .scrollContentBackground(.hidden)
                        .background(Color.clear)
                        .padding(.leading, -5)
                    if store.note(for: date).isEmpty {
                        Text("Platz für alles andere: Zettel abgeben, Sportzeug mitnehmen …")
                            .font(Theme.font(14, .regular))
                            .foregroundStyle(Theme.softInk.opacity(0.55))
                            .padding(.top, 8)
                            .allowsHitTesting(false)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 14)
            .padding(.bottom, 10)
        }
    }
}
