//
//  DayPageView.swift
//  Eine einzelne Heftseite: links die Fächer des Tages, rechts Notizen
//  (oder die restlichen Fächer, wenn es viele sind).
//

import SwiftUI

struct DayPageView: View {

    enum Side { case left, right }

    let date: Date
    let side: Side
    /// false = nur Ansicht (z. B. während des Blätterns)
    var interactive: Bool = true
    var onAddHomework: ((Int) -> Void)? = nil
    var onOpenTimetable: (() -> Void)? = nil

    @EnvironmentObject private var planner: Planner

    /// Ab wie vielen Fächern wird auf beide Seiten verteilt?
    private let maxRowsLeft = 5

    var body: some View {
        GeometryReader { geo in
            let lineHeight = max(24, min(44, geo.size.height / 16))
            let blocks = planner.blocks(for: date)
            let split = blocks.count > maxRowsLeft
            let mid = split ? Int(ceil(Double(blocks.count) / 2)) : blocks.count
            let mine = side == .left ? Array(blocks.prefix(mid)) : Array(blocks.suffix(from: mid))

            VStack(alignment: .leading, spacing: 0) {
                header(lineHeight: lineHeight, split: split, blocks: blocks)

                ZStack(alignment: .topLeading) {
                    LinedPaper(lineHeight: lineHeight)

                    if side == .left && blocks.isEmpty {
                        emptyHint(lineHeight: lineHeight)
                    } else if side == .right && !split {
                        notes(lineHeight: lineHeight)
                    } else {
                        VStack(alignment: .leading, spacing: 0) {
                            ForEach(mine) { block in
                                row(block, lineHeight: lineHeight)
                            }
                            Spacer(minLength: 0)
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .clipped()

                if side == .left && !blocks.isEmpty {
                    footer(blocks: blocks)
                }
            }
            .padding(.horizontal, max(14, geo.size.width * 0.055))
            .padding(.vertical, 16)
        }
        .background(Color.paper)
    }

    // MARK: Kopf

    @ViewBuilder
    private func header(lineHeight: CGFloat, split: Bool, blocks: [LessonBlock]) -> some View {
        HStack(alignment: .lastTextBaseline) {
            if side == .left {
                Text(SchoolDay.name(date))
                    .font(Handwriting.font(lineHeight * 0.82))
                    .foregroundStyle(Color.ink)
                Spacer()
                Text(SchoolDay.shortDate(date))
                    .font(.system(size: 14))
                    .foregroundStyle(Color.inkSoft)
            } else {
                Text(split ? "HAUSAUFGABEN" : "NOTIZEN")
                    .font(.system(size: 14, weight: .bold))
                    .kerning(1.5)
                    .foregroundStyle(Color.inkSoft)
                Spacer()
                Text(SchoolDay.name(date))
                    .font(.system(size: 14))
                    .foregroundStyle(Color.inkSoft)
            }
        }
        .padding(.bottom, 6)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.ruleLine).frame(height: 2.5)
        }
        .padding(.bottom, 6)
    }

    // MARK: Eine Zeile (Fach + Hausaufgabe)

    @ViewBuilder
    private func row(_ block: LessonBlock, lineHeight: CGFloat) -> some View {
        let entry = planner.entry(date: date, period: block.from)
        let done = entry?.done ?? false

        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text(block.hoursLabel)
                    .font(.system(size: lineHeight * 0.36, weight: .bold))
                    .foregroundStyle(Color.inkSoft)
                    .frame(width: lineHeight * 2.0, alignment: .leading)

                Circle()
                    .fill(block.subject.color)
                    .frame(width: lineHeight * 0.30, height: lineHeight * 0.30)

                Text(block.subject.name)
                    .font(Handwriting.font(lineHeight * 0.62))
                    .foregroundStyle(block.subject.color)
                    .opacity(done ? 0.55 : 1)
                    .lineLimit(1)

                Spacer(minLength: 4)

                if entry == nil {
                    Button {
                        onAddHomework?(block.from)
                    } label: {
                        ZStack {
                            Circle().fill(Color.planBlue)
                            Text("+")
                                .font(.system(size: lineHeight * 0.46, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        .frame(width: lineHeight * 0.72, height: lineHeight * 0.72)
                    }
                    .buttonStyle(.plain)
                    .disabled(!interactive)
                } else {
                    Button {
                        planner.toggleDone(date: date, period: block.from)
                    } label: {
                        ZStack {
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .strokeBorder(Color.inkSoft, lineWidth: 2.5)
                                .background(
                                    RoundedRectangle(cornerRadius: 6, style: .continuous).fill(.white)
                                )
                            if done {
                                Text("✓")
                                    .font(.system(size: lineHeight * 0.42, weight: .heavy))
                                    .foregroundStyle(Color.planBlue)
                            }
                        }
                        .frame(width: lineHeight * 0.62, height: lineHeight * 0.62)
                    }
                    .buttonStyle(.plain)
                    .disabled(!interactive)
                }
            }
            .frame(height: lineHeight)

            if let entry, entry.hasContent {
                Button {
                    onAddHomework?(block.from)
                } label: {
                    Text(entry.none ? "keine Hausaufgaben ✓" : entry.text)
                        .font(Handwriting.font(lineHeight * 0.55))
                        .italic(entry.none)
                        .foregroundStyle(entry.none ? Color.inkSoft : Color.pencil)
                        .strikethrough(done)
                        .opacity(done ? 0.5 : 1)
                        .lineSpacing(Handwriting.lineSpacing(fontSize: lineHeight * 0.55,
                                                             lineHeight: lineHeight))
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.leading, lineHeight * 2.4)
                        .frame(minHeight: lineHeight, alignment: .topLeading)
                }
                .buttonStyle(.plain)
                .disabled(!interactive)
            }
        }
    }

    // MARK: Notizen

    @ViewBuilder
    private func notes(lineHeight: CGFloat) -> some View {
        if interactive {
            TextEditor(text: planner.noteBinding(for: date))
                .font(Handwriting.font(lineHeight * 0.55))
                .lineSpacing(Handwriting.lineSpacing(fontSize: lineHeight * 0.55, lineHeight: lineHeight))
                .foregroundStyle(Color.pencil)
                .scrollContentBackground(.hidden)
                .background(Color.clear)
                .padding(.leading, -5)      // TextEditor hat eine kleine Eigenspur
        } else {
            Text(planner.notes[SchoolDay.key(date)] ?? "")
                .font(Handwriting.font(lineHeight * 0.55))
                .lineSpacing(Handwriting.lineSpacing(fontSize: lineHeight * 0.55, lineHeight: lineHeight))
                .foregroundStyle(Color.pencil)
                .frame(maxWidth: .infinity, alignment: .topLeading)
        }
    }

    // MARK: Hinweis, wenn der Tag leer ist

    @ViewBuilder
    private func emptyHint(lineHeight: CGFloat) -> some View {
        HStack(spacing: 4) {
            Text("Für \(SchoolDay.name(date)) ist noch kein Stundenplan da –")
            Button("hier eintragen") { onOpenTimetable?() }
                .buttonStyle(.plain)
                .foregroundStyle(Color.planBlue)
                .disabled(!interactive)
        }
        .font(.system(size: lineHeight * 0.42))
        .foregroundStyle(Color.inkSoft)
        .frame(height: lineHeight * 3, alignment: .center)
    }

    // MARK: Fuß

    @ViewBuilder
    private func footer(blocks: [LessonBlock]) -> some View {
        HStack {
            Text("\(blocks.count) Fächer")
            Spacer()
            Text("\(planner.doneCount(for: date)) von \(blocks.count) erledigt")
        }
        .font(.system(size: 12))
        .foregroundStyle(Color.inkSoft)
        .padding(.top, 6)
        .overlay(alignment: .top) {
            Rectangle().fill(Color.ruleLine.opacity(0.25)).frame(height: 1.5)
        }
    }
}
