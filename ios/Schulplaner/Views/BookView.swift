import SwiftUI

/// Das Hausaufgabenheft: immer zwei Seiten wie in einem echten Buch.
struct BookView: View {
    @EnvironmentObject private var store: PlannerStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var pages: [Date] = SchoolCalendar.bookPages()
    @State private var leftIndex: Int = 0
    @State private var didOpen = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                HStack(spacing: 2) {
                    turnButton(forward: false)
                    BookFrame {
                        BookPager(pageCount: pages.count, leftIndex: $leftIndex) { index in
                            HomeworkPageView(date: pages[min(max(index, 0), pages.count - 1)])
                                .environmentObject(store)
                        }
                    }
                    turnButton(forward: true)
                }
                .padding(.horizontal, horizontalSizeClass == .compact ? 2 : 10)
                .padding(.top, 6)

                dayStrip
                    .padding(.top, 8)
                    .padding(.bottom, 6)
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                MusicToolbarButton()
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Heute") { goToToday() }
                    .font(Theme.font(15, .medium))
                    .disabled(spreadShowsToday)
            }
        }
        .onAppear {
            guard !didOpen else { return }
            didOpen = true
            goToToday()
        }
    }

    // MARK: - Blättern

    private func turnButton(forward: Bool) -> some View {
        Button {
            withAnimation { turn(forward: forward) }
        } label: {
            Image(systemName: forward ? "chevron.right" : "chevron.left")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Theme.tertiaryInk)
                .frame(width: horizontalSizeClass == .compact ? 26 : 38)
                .frame(maxHeight: .infinity)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(forward ? leftIndex + 2 >= pages.count : leftIndex <= 0)
        .opacity((forward ? leftIndex + 2 >= pages.count : leftIndex <= 0) ? 0.25 : 1)
        .accessibilityLabel(Text(forward ? "Weiterblättern" : "Zurückblättern"))
    }

    private func turn(forward: Bool) {
        let target = forward ? leftIndex + 2 : leftIndex - 2
        leftIndex = min(max(target, 0), maxLeftIndex)
    }

    private var maxLeftIndex: Int {
        let last = max(pages.count - 1, 0)
        return last - (last % 2)
    }

    // MARK: - Tagesleiste

    private var dayStrip: some View {
        HStack(spacing: 5) {
            weekButton(forward: false)
            ForEach(weekPages, id: \.self) { index in
                dayButton(index)
            }
            weekButton(forward: true)
        }
        .padding(.horizontal, 8)
    }

    /// Die Tage der Woche, in der die aufgeschlagene Doppelseite liegt.
    private var weekPages: [Int] {
        let start = leftIndex - (leftIndex % 6)
        return (0..<5).map { start + $0 }.filter { $0 < pages.count }
    }

    private func dayButton(_ index: Int) -> some View {
        let date = pages[index]
        let isOpen = index == leftIndex || index == leftIndex + 1
        let isToday = SchoolCalendar.isToday(date)

        return Button {
            leftIndex = index - (index % 2)
        } label: {
            VStack(spacing: 1) {
                Text(SchoolCalendar.shortWeekdayFormatter.string(from: date))
                    .font(Theme.font(12, .semibold))
                    .foregroundStyle(isOpen ? Color.white : Theme.ink)
                Text(SchoolCalendar.dayMonthFormatter.string(from: date))
                    .font(Theme.font(10.5))
                    .foregroundStyle(isOpen ? Color.white.opacity(0.85) : Theme.secondaryInk)
                Circle()
                    .fill(isToday ? (isOpen ? Color.white : Theme.accent) : .clear)
                    .frame(width: 4, height: 4)
            }
            .padding(.vertical, 6)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(isOpen ? Theme.accent : Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .strokeBorder(isOpen ? Color.clear : Theme.hairline, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func weekButton(forward: Bool) -> some View {
        Button {
            let start = leftIndex - (leftIndex % 6)
            let target = forward ? start + 6 : start - 6
            leftIndex = min(max(target, 0), maxLeftIndex)
        } label: {
            Image(systemName: forward ? "chevron.right" : "chevron.left")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.tertiaryInk)
                .frame(width: 22, height: 34)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(forward ? "Nächste Woche" : "Vorige Woche"))
    }

    // MARK: - Titel

    private var title: String {
        guard pages.indices.contains(leftIndex) else { return "Hausaufgaben" }
        let left = pages[leftIndex]
        guard pages.indices.contains(leftIndex + 1) else {
            return SchoolCalendar.longDateFormatter.string(from: left)
        }
        let right = pages[leftIndex + 1]
        return SchoolCalendar.shortWeekdayFormatter.string(from: left) + " "
            + SchoolCalendar.dayMonthFormatter.string(from: left) + " – "
            + SchoolCalendar.shortWeekdayFormatter.string(from: right) + " "
            + SchoolCalendar.dayMonthFormatter.string(from: right)
    }

    private var spreadShowsToday: Bool {
        [leftIndex, leftIndex + 1]
            .filter { pages.indices.contains($0) }
            .contains { SchoolCalendar.isToday(pages[$0]) }
    }

    private func goToToday() {
        let target = SchoolCalendar.nextSchoolDay(onOrAfter: Date())
        let wanted = SchoolCalendar.key(for: target)
        guard let index = pages.firstIndex(where: { SchoolCalendar.key(for: $0) == wanted }) else { return }
        leftIndex = index - (index % 2)
    }
}

/// Schmaler Einband um die beiden Seiten.
struct BookFrame<Content: View>: View {
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .background(Theme.paper)
            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            .padding(4)
            .background(
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .fill(Theme.cover)
            )
            .shadow(color: .black.opacity(0.18), radius: 14, x: 0, y: 6)
    }
}

struct BookView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            BookView()
        }
        .environmentObject(PlannerStore())
    }
}
