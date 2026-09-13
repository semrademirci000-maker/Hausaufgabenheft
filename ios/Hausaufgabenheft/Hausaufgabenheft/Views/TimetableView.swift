//
//  TimetableView.swift
//  Stundenplan: Montag bis Freitag, Stunden untereinander.
//

import SwiftUI

struct TimetableView: View {
    @Binding var screen: Screen
    @EnvironmentObject private var planner: Planner

    @State private var picking: CellRef?
    @State private var showSubjects = false

    struct CellRef: Identifiable {
        let day: Int
        let period: Int
        var id: Int { day * 100 + period }
    }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            grid
            footer
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 6)
        .sheet(item: $picking) { cell in
            SubjectPickerView(day: cell.day, period: cell.period)
                .environmentObject(planner)
        }
        .sheet(isPresented: $showSubjects) {
            SubjectManagerView().environmentObject(planner)
        }
    }

    private var topBar: some View {
        HStack(spacing: 10) {
            Button("‹ Zurück") { screen = .start }
                .buttonStyle(SoftButtonStyle(tint: .white.opacity(0.65)))

            Text("Stundenplan")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(Color.ink)

            Spacer()

            Button("Fächer") { showSubjects = true }
                .buttonStyle(SoftButtonStyle(tint: .white.opacity(0.65)))
            Button("Heft ›") { screen = .book }
                .buttonStyle(SoftButtonStyle(tint: .white.opacity(0.65)))
        }
        .padding(.vertical, 10)
    }

    private var grid: some View {
        VStack(spacing: 6) {
            // Kopfzeile mit den Wochentagen
            HStack(spacing: 6) {
                Color.clear.frame(width: 44)
                ForEach(0..<5, id: \.self) { day in
                    Text(SchoolDay.shortNames[day])
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Color.ink)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Color.ink.opacity(0.05))
                        )
                }
            }

            // Stunden
            VStack(spacing: 0) {
                ForEach(Array(0..<planner.periods), id: \.self) { period in
                    HStack(spacing: 6) {
                        Text("\(period + 1).")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(Color.inkSoft)
                            .frame(width: 44)

                        ForEach(0..<5, id: \.self) { day in
                            cell(day: day, period: period)
                        }
                    }
                    .frame(maxHeight: .infinity)
                }
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.paper)
                .shadow(color: .black.opacity(0.14), radius: 12, y: 6)
        )
    }

    @ViewBuilder
    private func cell(day: Int, period: Int) -> some View {
        let id = planner.lessonID(day: day, period: period)
        let subject = planner.subject(id)
        let sameAbove = id != nil && planner.lessonID(day: day, period: period - 1) == id
        let sameBelow = id != nil && planner.lessonID(day: day, period: period + 1) == id
        let title = (subject != nil && !sameAbove) ? subject!.name : ""

        Button {
            picking = CellRef(day: day, period: period)
        } label: {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.18), radius: 1, y: 1)
                .lineLimit(2)
                .minimumScaleFactor(0.6)
                .padding(2)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background {
                    if let subject {
                        UnevenRoundedRectangle(
                            topLeadingRadius: sameAbove ? 0 : 12,
                            bottomLeadingRadius: sameBelow ? 0 : 12,
                            bottomTrailingRadius: sameBelow ? 0 : 12,
                            topTrailingRadius: sameAbove ? 0 : 12,
                            style: .continuous
                        )
                        .fill(subject.color)
                        .padding(EdgeInsets(top: sameAbove ? 0 : 3, leading: 0,
                                            bottom: sameBelow ? 0 : 3, trailing: 0))
                    } else {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(Color.ink.opacity(0.16),
                                          style: StrokeStyle(lineWidth: 2, dash: [6, 5]))
                            .background(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(Color.white.opacity(0.5))
                            )
                            .padding(EdgeInsets(top: 3, leading: 0, bottom: 3, trailing: 0))
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private var footer: some View {
        HStack(spacing: 10) {
            Button("− Stunde") { planner.setPeriods(planner.periods - 1) }
                .buttonStyle(SoftButtonStyle())
            Text("\(planner.periods) Stunden")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color.ink)
            Button("+ Stunde") { planner.setPeriods(planner.periods + 1) }
                .buttonStyle(SoftButtonStyle())

            Spacer()

            Text("Tippe auf ein Feld, um ein Fach zu wählen.")
                .font(.system(size: 14))
                .foregroundStyle(Color.inkSoft)
                .padding(.trailing, 80)
        }
        .padding(.vertical, 10)
    }
}
