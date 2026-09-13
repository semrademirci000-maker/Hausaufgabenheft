import SwiftUI

/// Startseite: Stundenplan oder Hausaufgabenheft.
struct StartView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer(minLength: 0)

                VStack(alignment: .leading, spacing: 28) {
                    header
                    choices
                }
                .frame(maxWidth: 640)
                .padding(.horizontal, 24)

                Spacer(minLength: 0)

                MusicPill()
                    .padding(.bottom, 24)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Schulplaner")
                .font(Theme.font(32, .semibold))
                .foregroundStyle(Theme.ink)
            Text(todayText)
                .font(Theme.font(15))
                .foregroundStyle(Theme.secondaryInk)
        }
    }

    private var choices: some View {
        let layout = horizontalSizeClass == .compact
            ? AnyLayout(VStackLayout(spacing: 14))
            : AnyLayout(HStackLayout(spacing: 18))

        return layout {
            NavigationLink {
                TimetableView()
            } label: {
                ChoiceCard(
                    symbol: "calendar",
                    title: "Stundenplan",
                    subtitle: "Fächer und Farben eintragen"
                )
            }
            NavigationLink {
                BookView()
            } label: {
                ChoiceCard(
                    symbol: "book.closed",
                    title: "Hausaufgabenheft",
                    subtitle: "Aufschreiben, was auf ist"
                )
            }
        }
        .buttonStyle(.plain)
    }

    private var todayText: String {
        let today = Date()
        if Weekday(date: today) != nil {
            return SchoolCalendar.longDateFormatter.string(from: today)
        }
        return "Nächster Schultag: \(SchoolCalendar.longDateFormatter.string(from: SchoolCalendar.nextSchoolDay(onOrAfter: today)))"
    }
}

/// Eine der beiden Auswahlkarten.
private struct ChoiceCard: View {
    let symbol: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: symbol)
                .font(.system(size: 20, weight: .regular))
                .foregroundStyle(Theme.accent)
                .frame(width: 44, height: 44)
                .background(
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .fill(Theme.accent.opacity(0.1))
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(Theme.font(17, .semibold))
                    .foregroundStyle(Theme.ink)
                Text(subtitle)
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.secondaryInk)
            }

            Spacer(minLength: 8)

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.tertiaryInk)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct StartView_Previews: PreviewProvider {
    static var previews: some View {
        RootView()
            .environmentObject(PlannerStore())
    }
}
