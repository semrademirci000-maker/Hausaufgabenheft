//
//  BookView.swift
//  Das Hausaufgabenheft als aufgeschlagenes Buch – mit 3-D-Blättern per Wisch.
//

import SwiftUI

struct BookView: View {
    @Binding var screen: Screen
    @EnvironmentObject private var planner: Planner

    @State private var current: Date = SchoolDay.today()
    @State private var flip: Flip?
    @State private var animating = false
    @State private var editing: EditTarget?
    @State private var showHint = true

    /// Eine gerade umschlagende Seite.
    private struct Flip {
        var direction: Int          // 1 = vorwärts (nächster Tag), -1 = zurück
        var target: Date
        var progress: Double        // 0 … 1
    }

    struct EditTarget: Identifiable {
        let period: Int
        let subjectName: String
        let hours: String
        var id: Int { period }
    }

    private let flipDuration = 0.5

    var body: some View {
        VStack(spacing: 0) {
            topBar

            GeometryReader { geo in
                let size = bookSize(in: geo.size)
                book(width: size.width, height: size.height)
                    .frame(width: size.width, height: size.height)
                    .position(x: geo.size.width / 2, y: geo.size.height / 2)
            }

            Text("Wische zum Blättern →")
                .font(.system(size: 14))
                .foregroundStyle(Color.inkSoft)
                .opacity(showHint ? 1 : 0)
                .animation(.easeInOut(duration: 0.4), value: showHint)
                .padding(.top, 6)
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 6)
        .sheet(item: $editing) { target in
            HomeworkEditorView(
                date: current,
                period: target.period,
                subjectName: target.subjectName,
                hours: target.hours
            )
            .environmentObject(planner)
        }
        .task {
            try? await Task.sleep(nanoseconds: 6_000_000_000)
            showHint = false
        }
    }

    // MARK: Kopfzeile

    private var topBar: some View {
        HStack(spacing: 10) {
            Button("‹ Zurück") { screen = .start }
                .buttonStyle(SoftButtonStyle(tint: .white.opacity(0.65)))

            Spacer()

            Button { go(-1) } label: {
                Text("‹").font(.system(size: 24, weight: .semibold)).frame(width: 26, height: 26)
            }
            .buttonStyle(SoftButtonStyle(tint: .white.opacity(0.65)))

            Button("Heute") { jumpToToday() }
                .buttonStyle(SoftButtonStyle(tint: .white.opacity(0.65)))

            Button { go(1) } label: {
                Text("›").font(.system(size: 24, weight: .semibold)).frame(width: 26, height: 26)
            }
            .buttonStyle(SoftButtonStyle(tint: .white.opacity(0.65)))

            Spacer()

            Button("Stundenplan") { screen = .timetable }
                .buttonStyle(SoftButtonStyle(tint: .white.opacity(0.65)))
        }
        .padding(.vertical, 10)
    }

    // MARK: Das Buch

    private func book(width: CGFloat, height: CGFloat) -> some View {
        let pageWidth = (width - 24) / 2
        let pageHeight = height - 24

        return ZStack {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(LinearGradient(colors: [.coverTop, .coverBot],
                                     startPoint: .top, endPoint: .bottom))
                .shadow(color: .black.opacity(0.3), radius: 24, y: 14)

            // Die beiden liegenden Seiten
            HStack(spacing: 0) {
                page(staticLeftDate, side: .left)
                    .frame(width: pageWidth, height: pageHeight)
                page(staticRightDate, side: .right)
                    .frame(width: pageWidth, height: pageHeight)
            }

            // Buchrücken
            LinearGradient(colors: [.black.opacity(0.22), .black.opacity(0.05),
                                    .black.opacity(0.05), .black.opacity(0.22)],
                           startPoint: .leading, endPoint: .trailing)
                .frame(width: 26, height: pageHeight)
                .allowsHitTesting(false)

            // Die umschlagende Seite
            if let flip {
                flippingPage(flip, pageWidth: pageWidth, pageHeight: pageHeight)
            }
        }
        .contentShape(Rectangle())
        .gesture(dragGesture(pageWidth: pageWidth))
    }

    @ViewBuilder
    private func flippingPage(_ flip: Flip, pageWidth: CGFloat, pageHeight: CGFloat) -> some View {
        let angle = flip.direction == 1 ? -180 * flip.progress : 180 * flip.progress
        let showingBack = flip.progress >= 0.5

        Group {
            if showingBack {
                // Rückseite des Blattes: die neue Seite, gespiegelt
                page(flip.target, side: flip.direction == 1 ? .left : .right, interactive: false)
                    .scaleEffect(x: -1, y: 1)
            } else {
                page(current, side: flip.direction == 1 ? .right : .left, interactive: false)
            }
        }
        .frame(width: pageWidth, height: pageHeight)
        .overlay(
            LinearGradient(colors: [.black.opacity(0.0), .black.opacity(0.35)],
                           startPoint: flip.direction == 1 ? .leading : .trailing,
                           endPoint: flip.direction == 1 ? .trailing : .leading)
                .opacity(sin(flip.progress * .pi) * 0.55)
                .allowsHitTesting(false)
        )
        .rotation3DEffect(
            .degrees(angle),
            axis: (x: 0, y: 1, z: 0),
            anchor: flip.direction == 1 ? .leading : .trailing,
            perspective: 0.45
        )
        .offset(x: flip.direction == 1 ? pageWidth / 2 : -pageWidth / 2)
        .allowsHitTesting(false)
    }

    private func page(_ date: Date, side: DayPageView.Side, interactive: Bool = true) -> some View {
        DayPageView(
            date: date,
            side: side,
            interactive: interactive,
            onAddHomework: { period in openEditor(period: period) },
            onOpenTimetable: { screen = .timetable }
        )
        .environmentObject(planner)
    }

    /// Welche Tage liegen gerade fest auf der linken bzw. rechten Seite?
    private var staticLeftDate: Date {
        if let flip, flip.direction == -1 { return flip.target }
        return current
    }

    private var staticRightDate: Date {
        if let flip, flip.direction == 1 { return flip.target }
        return current
    }

    // MARK: Blättern

    private func dragGesture(pageWidth: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 16)
            .onChanged { value in
                guard !animating else { return }
                if flip == nil {
                    let direction = value.translation.width < 0 ? 1 : -1
                    flip = Flip(direction: direction,
                                target: SchoolDay.next(current, direction),
                                progress: 0)
                    showHint = false
                }
                guard var f = flip else { return }
                let travelled = f.direction == 1 ? -value.translation.width : value.translation.width
                f.progress = min(1, max(0, travelled / pageWidth))
                flip = f
            }
            .onEnded { _ in
                guard let f = flip, !animating else { return }
                if f.progress > 0.3 { complete() } else { cancel() }
            }
    }

    private func go(_ direction: Int) {
        guard !animating else { return }
        showHint = false
        flip = Flip(direction: direction, target: SchoolDay.next(current, direction), progress: 0)
        complete()
    }

    private func jumpToToday() {
        guard !animating, flip == nil else { return }
        let today = SchoolDay.today()
        guard !SchoolDay.isSameDay(today, current) else { return }
        let direction = today > current ? 1 : -1
        flip = Flip(direction: direction, target: today, progress: 0)
        complete()
    }

    private func complete() {
        guard let f = flip else { return }
        animating = true
        withAnimation(.easeInOut(duration: flipDuration)) {
            flip?.progress = 1
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + flipDuration) {
            current = f.target
            flip = nil
            animating = false
        }
    }

    private func cancel() {
        animating = true
        withAnimation(.easeInOut(duration: 0.3)) {
            flip?.progress = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            flip = nil
            animating = false
        }
    }

    // MARK: Hausaufgabe bearbeiten

    private func openEditor(period: Int) {
        guard let block = planner.blocks(for: current).first(where: { $0.from == period }) else { return }
        editing = EditTarget(period: period,
                             subjectName: block.subject.name,
                             hours: block.hoursLabel)
    }

    // MARK: Maße

    private func bookSize(in available: CGSize) -> CGSize {
        let ratio: CGFloat = 1.44
        var width = min(available.width, 1280)
        var height = width / ratio
        if height > available.height {
            height = available.height
            width = height * ratio
        }
        return CGSize(width: max(width, 1), height: max(height, 1))
    }
}
