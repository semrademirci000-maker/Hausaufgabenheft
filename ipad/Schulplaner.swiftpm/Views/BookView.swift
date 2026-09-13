import SwiftUI

/// Das Hausaufgabenheft – eine Seite pro Schultag, Wischen blättert um.
struct BookView: View {
    @EnvironmentObject private var store: PlannerStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var days: [Date] = SchoolCalendar.schoolDays()
    @State private var pageIndex: Int = 0
    @State private var didOpen = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            BookFrame {
                PageCurlPager(pageCount: days.count, index: $pageIndex) { index in
                    HomeworkPageView(date: days[min(max(index, 0), days.count - 1)])
                        .environmentObject(store)
                }
            }
            .padding(.horizontal, horizontalSizeClass == .compact ? 12 : 22)
            .padding(.top, 8)
            .padding(.bottom, 14)
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
                    .disabled(isOnToday)
            }
        }
        .onAppear {
            guard !didOpen else { return }
            didOpen = true
            goToToday()
        }
    }

    private var currentDate: Date {
        days.indices.contains(pageIndex) ? days[pageIndex] : Date()
    }

    private var title: String {
        SchoolCalendar.longDateFormatter.string(from: currentDate)
    }

    private var isOnToday: Bool {
        SchoolCalendar.isToday(currentDate)
    }

    private func goToToday() {
        let target = SchoolCalendar.nextSchoolDay(onOrAfter: Date())
        guard let index = days.firstIndex(where: {
            SchoolCalendar.key(for: $0) == SchoolCalendar.key(for: target)
        }) else { return }
        pageIndex = index
    }
}

/// Schmaler Einband um die Seiten.
struct BookFrame<Content: View>: View {
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .background(Theme.paper)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .padding(5)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Theme.cover)
            )
            .shadow(color: .black.opacity(0.16), radius: 14, x: 0, y: 6)
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
