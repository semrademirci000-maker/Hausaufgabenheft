import SwiftUI

/// Das Hausaufgabenheft: öffnet sich wie ein Buch, eine Seite pro Schultag.
struct BookView: View {
    @EnvironmentObject private var store: PlannerStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var days: [Date] = SchoolCalendar.schoolDays()
    @State private var pageIndex: Int = 0
    @State private var didOpen = false

    var body: some View {
        ZStack {
            Theme.desk.ignoresSafeArea()

            BookFrame {
                PageCurlPager(pageCount: days.count, index: $pageIndex) { index in
                    HomeworkPageView(date: days[min(max(index, 0), days.count - 1)])
                        .environmentObject(store)
                }
            }
            .padding(.horizontal, horizontalSizeClass == .compact ? 10 : 20)
            .padding(.top, 6)
            .padding(.bottom, 10)
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Heute") { goToToday(animated: true) }
                    .font(Theme.font(16, .semibold))
                    .disabled(isOnToday)
            }
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    TimetableView()
                } label: {
                    Label("Stundenplan", systemImage: "calendar")
                }
            }
        }
        .onAppear {
            guard !didOpen else { return }
            didOpen = true
            goToToday(animated: false)
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

    private func goToToday(animated: Bool) {
        let target = SchoolCalendar.startOfDay(SchoolCalendar.nextSchoolDay(onOrAfter: Date()))
        guard let index = days.firstIndex(where: { SchoolCalendar.key(for: $0) == SchoolCalendar.key(for: target) }) else { return }
        if animated {
            withAnimation { pageIndex = index }
        } else {
            pageIndex = index
        }
    }
}

/// Der Bucheinband rund um die Seiten.
struct BookFrame<Content: View>: View {
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .background(Theme.paper)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Color.black.opacity(0.08), lineWidth: 1)
            )
            .padding(9)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Theme.cover, Theme.cover.opacity(0.82)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .shadow(color: .black.opacity(0.28), radius: 16, x: 0, y: 8)
            )
    }
}

#Preview {
    NavigationStack {
        BookView()
    }
    .environmentObject(PlannerStore())
}
