//
//  StartView.swift
//  Startbildschirm: Stundenplan oder Hausaufgabenheft?
//

import SwiftUI

struct StartView: View {
    @Binding var screen: Screen

    private var todayLine: String {
        let now = Date()
        return "Heute ist \(SchoolDay.name(now)), der \(SchoolDay.longDate(now))"
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            Text("Mein Schulplaner")
                .font(Handwriting.font(58))
                .foregroundStyle(Color.ink)
                .minimumScaleFactor(0.5)
                .lineLimit(1)

            Text(todayLine)
                .font(.system(size: 18))
                .foregroundStyle(Color.inkSoft)
                .padding(.top, 4)

            HStack(spacing: 28) {
                ChoiceCard(title: "Stundenplan", hint: "Fächer eintragen & Farben wählen") {
                    MiniTimetable()
                } action: {
                    screen = .timetable
                }

                ChoiceCard(title: "Hausaufgabenheft", hint: "Aufschreiben, was auf ist") {
                    MiniBook()
                } action: {
                    screen = .book
                }
            }
            .padding(.top, 40)
            .frame(maxWidth: 760)

            Spacer()
        }
        .padding(24)
    }
}

private struct ChoiceCard<Art: View>: View {
    var title: String
    var hint: String
    @ViewBuilder var art: () -> Art
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                art()
                    .frame(height: 150)
                    .padding(.bottom, 6)
                Text(title)
                    .font(Handwriting.font(30))
                    .foregroundStyle(Color.ink)
                Text(hint)
                    .font(.system(size: 15))
                    .foregroundStyle(Color.inkSoft)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 28)
            .padding(.horizontal, 20)
            .background(
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .fill(Color.paper)
                    .shadow(color: .black.opacity(0.16), radius: 14, y: 8)
            )
        }
        .buttonStyle(.plain)
    }
}

/// Kleine Stundenplan-Grafik für die Startkarte.
private struct MiniTimetable: View {
    private let colors = ["#2F6FED", "#E0483F", "#2AA66B", "#F29D1B", "#A05AD4",
                          "#2AA66B", "#2F6FED", "#F29D1B", "#E0483F", "#12A3B4",
                          "#E4529F", "#2AA66B", "#2F6FED", "#A05AD4", "#E0483F"]

    var body: some View {
        VStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { row in
                HStack(spacing: 5) {
                    ForEach(0..<5, id: \.self) { col in
                        RoundedRectangle(cornerRadius: 5, style: .continuous)
                            .fill(Color(hex: colors[row * 5 + col]).opacity(0.88))
                            .aspectRatio(0.87, contentMode: .fit)
                    }
                }
            }
        }
        .frame(maxWidth: 190)
    }
}

/// Kleines aufgeschlagenes Buch für die Startkarte.
private struct MiniBook: View {
    var body: some View {
        HStack(spacing: 0) {
            page.overlay(alignment: .trailing) {
                LinearGradient(colors: [.clear, .black.opacity(0.14)], startPoint: .leading, endPoint: .trailing)
                    .frame(width: 14)
            }
            page
                .rotation3DEffect(.degrees(-22), axis: (x: 0, y: 1, z: 0), anchor: .leading, perspective: 0.5)
        }
        .frame(width: 200, height: 132)
    }

    private var page: some View {
        ZStack {
            Rectangle().fill(Color.white)
            LinedPaper(lineHeight: 13)
                .padding(.horizontal, 8)
                .opacity(0.5)
        }
        .overlay(Rectangle().stroke(Color(hex: "#E2D9C8"), lineWidth: 2))
    }
}
