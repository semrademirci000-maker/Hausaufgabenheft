import SwiftUI

/// Startseite: „Stundenplan“ oder „Hausaufgabenheft“ auswählen.
struct StartView: View {
    @EnvironmentObject private var store: PlannerStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        ZStack {
            Theme.desk.ignoresSafeArea()

            GeometryReader { proxy in
                ScrollView {
                    VStack(spacing: 32) {
                        header
                        cards
                        hint
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 32)
                    .frame(minHeight: proxy.size.height)
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private var header: some View {
        VStack(spacing: 8) {
            Text("Mein Schulplaner")
                .font(Theme.font(horizontalSizeClass == .compact ? 34 : 46, .bold))
                .foregroundStyle(Theme.ink)
            Text(todayText)
                .font(Theme.font(17, .medium))
                .foregroundStyle(Theme.softInk)
        }
        .multilineTextAlignment(.center)
    }

    private var cards: some View {
        let layout = horizontalSizeClass == .compact
            ? AnyLayout(VStackLayout(spacing: 20))
            : AnyLayout(HStackLayout(spacing: 28))

        return layout {
            NavigationLink {
                TimetableView()
            } label: {
                StartCard(title: "Stundenplan", subtitle: "Fächer eintragen und Farben wählen") {
                    TimetableArt()
                }
            }
            NavigationLink {
                BookView()
            } label: {
                StartCard(title: "Hausaufgabenheft", subtitle: "Aufschreiben, was auf ist") {
                    BookArt()
                }
            }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: 900)
    }

    private var hint: some View {
        Text("Tipp: Im Heft einfach wischen – dann blättert die Seite um zum nächsten Tag.")
            .font(Theme.font(14, .medium))
            .foregroundStyle(Theme.softInk)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 20)
    }

    private var todayText: String {
        let today = Date()
        if Weekday(date: today) != nil {
            return "Heute ist \(SchoolCalendar.longDateFormatter.string(from: today))"
        }
        let next = SchoolCalendar.nextSchoolDay(onOrAfter: today)
        return "Wochenende – nächster Schultag: \(SchoolCalendar.longDateFormatter.string(from: next))"
    }
}

/// Große Auswahlkarte auf der Startseite.
struct StartCard<Art: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder var art: () -> Art

    var body: some View {
        VStack(spacing: 14) {
            art()
                .frame(height: 150)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.white.opacity(0.55))
                )
            VStack(spacing: 4) {
                Text(title)
                    .font(Theme.font(24, .bold))
                    .foregroundStyle(Theme.ink)
                Text(subtitle)
                    .font(Theme.font(14, .medium))
                    .foregroundStyle(Theme.softInk)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.15), radius: 14, x: 0, y: 8)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .strokeBorder(Color.black.opacity(0.06), lineWidth: 1)
        )
        .contentShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
    }
}

/// Mini-Stundenplan als Bildchen auf der Startkarte.
private struct TimetableArt: View {
    private let colors = ["#2F6FED", "#E0483F", "#2AA66B", "#F29D1B", "#A05AD4", "#12A3B4", "#E4529F"]

    var body: some View {
        VStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { row in
                HStack(spacing: 6) {
                    ForEach(0..<5, id: \.self) { column in
                        RoundedRectangle(cornerRadius: 5, style: .continuous)
                            .fill(Color(hex: colors[(row * 5 + column * 2) % colors.count]).opacity(0.85))
                            .frame(height: 24)
                    }
                }
            }
        }
        .padding(18)
    }
}

/// Mini-Buch als Bildchen auf der Startkarte.
private struct BookArt: View {
    var body: some View {
        HStack(spacing: 2) {
            page.rotation3DEffect(.degrees(16), axis: (x: 0, y: 1, z: 0), anchor: .trailing)
            page.rotation3DEffect(.degrees(-16), axis: (x: 0, y: 1, z: 0), anchor: .leading)
        }
        .padding(22)
        .shadow(color: .black.opacity(0.12), radius: 6, x: 0, y: 4)
    }

    private var page: some View {
        ZStack(alignment: .top) {
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(Theme.paper)
            VStack(spacing: 9) {
                ForEach(0..<6, id: \.self) { _ in
                    Rectangle()
                        .fill(Theme.rule)
                        .frame(height: 1)
                }
            }
            .padding(.horizontal, 8)
            .padding(.top, 16)
        }
        .overlay(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .strokeBorder(Color.black.opacity(0.1), lineWidth: 1)
        )
    }
}

#Preview {
    RootView()
        .environmentObject(PlannerStore())
}
