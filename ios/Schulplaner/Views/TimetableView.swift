import SwiftUI

/// Der Stundenplan: Montag bis Freitag nebeneinander, die Stunden untereinander.
struct TimetableView: View {
    @EnvironmentObject private var store: PlannerStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var selectedSlot: SlotSelection?
    @State private var showSubjects = false
    @State private var askClear = false

    private let rowSpacing: CGFloat = 6
    private let columnSpacing: CGFloat = 6
    private let periodColumnWidth: CGFloat = 30

    private var rowHeight: CGFloat { horizontalSizeClass == .compact ? 48 : 60 }
    private var periodCount: Int { store.data.timetable.periodCount }

    var body: some View {
        ZStack {
            Theme.desk.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    grid
                    controls
                }
                .padding(.horizontal, horizontalSizeClass == .compact ? 12 : 24)
                .padding(.vertical, 18)
                .frame(maxWidth: 1100)
                .frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("Stundenplan")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showSubjects = true
                } label: {
                    Label("Fächer", systemImage: "paintpalette")
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    BookView()
                } label: {
                    Label("Heft", systemImage: "book")
                }
            }
        }
        .sheet(item: $selectedSlot) { slot in
            NavigationStack {
                SubjectPickerView(day: slot.day, period: slot.period)
            }
        }
        .sheet(isPresented: $showSubjects) {
            NavigationStack {
                SubjectsManagerView()
                    .navigationTitle("Fächer")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Fertig") { showSubjects = false }
                        }
                    }
            }
        }
    }

    // MARK: - Tabelle

    private var grid: some View {
        VStack(spacing: 10) {
            headerRow
            HStack(alignment: .top, spacing: columnSpacing) {
                periodColumn
                ForEach(Weekday.allCases) { day in
                    dayColumn(day)
                }
            }
        }
        .padding(horizontalSizeClass == .compact ? 12 : 18)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.white.opacity(0.9))
                .shadow(color: .black.opacity(0.12), radius: 12, x: 0, y: 6)
        )
    }

    private var headerRow: some View {
        HStack(alignment: .bottom, spacing: columnSpacing) {
            Spacer().frame(width: periodColumnWidth)
            ForEach(Weekday.allCases) { day in
                let isToday = Weekday(date: Date()) == day
                Text(horizontalSizeClass == .compact ? day.shortName : day.longName)
                    .font(Theme.font(horizontalSizeClass == .compact ? 14 : 17, .bold))
                    .foregroundStyle(isToday ? Color.white : Theme.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .padding(.vertical, 7)
                    .frame(maxWidth: .infinity)
                    .background(
                        Capsule(style: .continuous)
                            .fill(isToday ? Theme.blue : Color.black.opacity(0.05))
                    )
            }
        }
    }

    private var periodColumn: some View {
        VStack(spacing: rowSpacing) {
            ForEach(1...max(periodCount, 1), id: \.self) { period in
                Text("\(period).")
                    .font(Theme.font(13, .semibold))
                    .foregroundStyle(Theme.softInk)
                    .frame(width: periodColumnWidth, height: rowHeight)
            }
        }
    }

    private func dayColumn(_ day: Weekday) -> some View {
        ZStack(alignment: .topLeading) {
            // leere Stunden
            ForEach(emptyPeriods(day), id: \.self) { period in
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.black.opacity(0.03))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                            .foregroundStyle(Color.black.opacity(0.12))
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: rowHeight)
                    .offset(y: offset(for: period))
            }

            // Fach-Blöcke
            ForEach(store.data.blocks(for: day)) { block in
                blockCell(block)
                    .frame(maxWidth: .infinity)
                    .frame(height: height(for: block.periodCount))
                    .offset(y: offset(for: block.firstPeriod))
            }

            // Tippfläche: jede Stunde einzeln antippbar
            VStack(spacing: rowSpacing) {
                ForEach(1...max(periodCount, 1), id: \.self) { period in
                    Rectangle()
                        .fill(Color.clear)
                        .contentShape(Rectangle())
                        .frame(height: rowHeight)
                        .onTapGesture {
                            selectedSlot = SlotSelection(day: day, period: period)
                        }
                }
            }
        }
        .frame(height: totalHeight)
        .frame(maxWidth: .infinity)
    }

    private func blockCell(_ block: LessonBlock) -> some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(block.subject.color)
            .overlay(
                VStack(spacing: 2) {
                    Text(block.subject.name)
                        .font(Theme.font(horizontalSizeClass == .compact ? 13 : 16, .bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .minimumScaleFactor(0.6)
                        .multilineTextAlignment(.center)
                    if block.periodCount > 1 {
                        Text(block.periodLabel)
                            .font(Theme.font(11, .semibold))
                            .foregroundStyle(.white.opacity(0.85))
                    }
                }
                .padding(4)
            )
            .shadow(color: block.subject.color.opacity(0.35), radius: 4, x: 0, y: 2)
    }

    // MARK: - Bedienung unten

    private var controls: some View {
        VStack(spacing: 12) {
            HStack(spacing: 14) {
                Button {
                    store.setPeriodCount(periodCount - 1)
                } label: {
                    Label("Stunde", systemImage: "minus.circle.fill")
                }
                .disabled(periodCount <= 1)

                Text("\(periodCount) Stunden am Tag")
                    .font(Theme.font(15, .semibold))
                    .foregroundStyle(Theme.ink)
                    .frame(minWidth: 150)

                Button {
                    store.setPeriodCount(periodCount + 1)
                } label: {
                    Label("Stunde", systemImage: "plus.circle.fill")
                }
                .disabled(periodCount >= 12)
            }
            .font(Theme.font(15, .semibold))
            .buttonStyle(.bordered)

            Text("Tippe auf ein Feld, um ein Fach einzutragen. Zwei gleiche Stunden hintereinander werden zu einem Block.")
                .font(Theme.font(13, .medium))
                .foregroundStyle(Theme.softInk)
                .multilineTextAlignment(.center)

            Button("Stundenplan leeren", role: .destructive) {
                askClear = true
            }
            .font(Theme.font(14, .semibold))
            .confirmationDialog("Wirklich alle Stunden löschen?", isPresented: $askClear, titleVisibility: .visible) {
                Button("Ja, leeren", role: .destructive) { store.clearTimetable() }
                Button("Abbrechen", role: .cancel) {}
            }
        }
        .padding(.top, 4)
    }

    // MARK: - Rechnen

    private func offset(for period: Int) -> CGFloat {
        CGFloat(period - 1) * (rowHeight + rowSpacing)
    }

    private func height(for periods: Int) -> CGFloat {
        CGFloat(periods) * rowHeight + CGFloat(periods - 1) * rowSpacing
    }

    private var totalHeight: CGFloat {
        height(for: max(periodCount, 1))
    }

    private func emptyPeriods(_ day: Weekday) -> [Int] {
        (1...max(periodCount, 1)).filter { store.data.timetable.subjectID(day, $0) == nil }
    }
}

/// Welche Stunde wird gerade bearbeitet?
struct SlotSelection: Identifiable {
    let day: Weekday
    let period: Int
    var id: String { "\(day.rawValue)-\(period)" }
}

#Preview {
    NavigationStack {
        TimetableView()
    }
    .environmentObject(PlannerStore())
}
