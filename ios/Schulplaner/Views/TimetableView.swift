import SwiftUI

/// Stundenplan: Montag bis Freitag nebeneinander, Stunden untereinander.
struct TimetableView: View {
    @EnvironmentObject private var store: PlannerStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var selectedSlot: SlotSelection?
    @State private var showSubjects = false
    @State private var askClear = false

    private let rowSpacing: CGFloat = 4
    private let columnSpacing: CGFloat = 4
    private let periodColumnWidth: CGFloat = 26

    private var rowHeight: CGFloat { horizontalSizeClass == .compact ? 46 : 56 }
    private var periodCount: Int { store.data.timetable.periodCount }

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 14) {
                    grid
                    Text("Tippe auf eine Stunde, um ein Fach einzutragen.")
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.tertiaryInk)
                }
                .padding(.horizontal, horizontalSizeClass == .compact ? 14 : 24)
                .padding(.vertical, 16)
                .frame(maxWidth: 1000)
                .frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("Stundenplan")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                MusicToolbarButton()
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        showSubjects = true
                    } label: {
                        Label("Fächer und Farben", systemImage: "paintpalette")
                    }
                    Section("Stunden pro Tag") {
                        Button {
                            store.setPeriodCount(periodCount + 1)
                        } label: {
                            Label("Eine Stunde mehr", systemImage: "plus")
                        }
                        .disabled(periodCount >= 12)
                        Button {
                            store.setPeriodCount(periodCount - 1)
                        } label: {
                            Label("Eine Stunde weniger", systemImage: "minus")
                        }
                        .disabled(periodCount <= 1)
                    }
                    Divider()
                    Button(role: .destructive) {
                        askClear = true
                    } label: {
                        Label("Stundenplan leeren", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.system(size: 16, weight: .medium))
                }
            }
        }
        .confirmationDialog("Alle Stunden löschen?", isPresented: $askClear, titleVisibility: .visible) {
            Button("Stundenplan leeren", role: .destructive) { store.clearTimetable() }
            Button("Abbrechen", role: .cancel) {}
        }
        .sheet(item: $selectedSlot) { slot in
            NavigationStack {
                SubjectPickerView(day: slot.day, period: slot.period)
            }
            .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $showSubjects) {
            NavigationStack {
                SubjectsManagerView()
                    .navigationTitle("Fächer")
                    .navigationBarTitleDisplayMode(.inline)
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
        VStack(spacing: 12) {
            headerRow
            HStack(alignment: .top, spacing: columnSpacing) {
                periodColumn
                ForEach(Weekday.allCases) { day in
                    dayColumn(day)
                }
            }
        }
        .padding(horizontalSizeClass == .compact ? 14 : 20)
        .card(cornerRadius: 18)
    }

    private var headerRow: some View {
        HStack(spacing: columnSpacing) {
            Spacer().frame(width: periodColumnWidth)
            ForEach(Weekday.allCases) { day in
                let isToday = Weekday(date: Date()) == day
                VStack(spacing: 5) {
                    Text(horizontalSizeClass == .compact ? day.shortName : day.longName)
                        .font(Theme.font(horizontalSizeClass == .compact ? 13 : 14, isToday ? .semibold : .medium))
                        .foregroundStyle(isToday ? Theme.accent : Theme.secondaryInk)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Rectangle()
                        .fill(isToday ? Theme.accent : Color.clear)
                        .frame(height: 2)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private var periodColumn: some View {
        VStack(spacing: rowSpacing) {
            ForEach(1...max(periodCount, 1), id: \.self) { period in
                Text("\(period)")
                    .font(Theme.font(12))
                    .monospacedDigit()
                    .foregroundStyle(Theme.tertiaryInk)
                    .frame(width: periodColumnWidth, height: rowHeight)
            }
        }
    }

    private func dayColumn(_ day: Weekday) -> some View {
        ZStack(alignment: .topLeading) {
            ForEach(emptyPeriods(day), id: \.self) { period in
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color.black.opacity(0.035))
                    .frame(maxWidth: .infinity)
                    .frame(height: rowHeight)
                    .offset(y: offset(for: period))
            }

            ForEach(store.data.blocks(for: day)) { block in
                blockCell(block)
                    .frame(maxWidth: .infinity)
                    .frame(height: height(for: block.periodCount))
                    .offset(y: offset(for: block.firstPeriod))
            }

            // jede Stunde bleibt einzeln antippbar
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
        HStack(spacing: 0) {
            Rectangle()
                .fill(block.subject.color)
                .frame(width: 3)
            VStack(spacing: 2) {
                Text(block.subject.name)
                    .font(Theme.font(horizontalSizeClass == .compact ? 13 : 14, .medium))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2)
                    .minimumScaleFactor(0.65)
                    .multilineTextAlignment(.center)
                if block.periodCount > 1 {
                    Text(block.periodLabel)
                        .font(Theme.font(10))
                        .foregroundStyle(Theme.tertiaryInk)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 4)
        }
        .background(block.subject.color.opacity(0.11))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
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
