//
//  Planner.swift
//  Daten der App: Fächer, Stundenplan, Hausaufgaben, Notizen.
//  Alles wird als JSON im Dokumente-Ordner des Geräts gespeichert.
//

import Foundation
import SwiftUI

// MARK: - Fach

struct Subject: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var name: String
    var colorHex: String

    var color: Color { Color(hex: colorHex) }
}

// MARK: - Hausaufgabe

struct HomeworkEntry: Codable, Hashable {
    var text: String = ""
    var none: Bool = false          // „keine Hausaufgaben“
    var done: Bool = false

    var hasContent: Bool { none || !text.trimmingCharacters(in: .whitespaces).isEmpty }
}

// MARK: - Block aus zusammenhängenden Stunden (z. B. 1.–2. Deutsch)

struct LessonBlock: Identifiable, Hashable {
    var subject: Subject
    var from: Int
    var to: Int

    var id: Int { from }
    var hoursLabel: String { from == to ? "\(from + 1)." : "\(from + 1).–\(to + 1)." }
}

// MARK: - Speicherformat

private struct Snapshot: Codable {
    var subjects: [Subject]
    var periods: Int
    var plan: [[UUID?]]
    var homework: [String: [String: HomeworkEntry]]
    var notes: [String: String]
}

// MARK: - Store

final class Planner: ObservableObject {

    @Published var subjects: [Subject]
    @Published var periods: Int
    /// plan[Wochentag 0…4][Stunde] = Fach-ID oder nil
    @Published var plan: [[UUID?]]
    /// homework["2026-09-14"]["0"] = Eintrag
    @Published var homework: [String: [String: HomeworkEntry]]
    @Published var notes: [String: String]

    private var saveWork: DispatchWorkItem?

    private static let fileURL: URL = {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent("planner.json")
    }()

    static let defaultSubjects: [Subject] = [
        Subject(name: "Deutsch",        colorHex: "#2F6FED"),
        Subject(name: "Mathe",          colorHex: "#E0483F"),
        Subject(name: "Englisch",       colorHex: "#2AA66B"),
        Subject(name: "Sachunterricht", colorHex: "#12A3B4"),
        Subject(name: "Sport",          colorHex: "#F29D1B"),
        Subject(name: "Kunst",          colorHex: "#A05AD4"),
        Subject(name: "Musik",          colorHex: "#E4529F"),
        Subject(name: "Religion",       colorHex: "#8A6A4F"),
    ]

    init() {
        if let data = try? Data(contentsOf: Planner.fileURL),
           let s = try? JSONDecoder().decode(Snapshot.self, from: data) {
            let periodCount = min(12, max(1, s.periods))
            subjects = s.subjects.isEmpty ? Planner.defaultSubjects : s.subjects
            periods  = periodCount
            homework = s.homework
            notes    = s.notes
            // Stundenplan auf die gespeicherte Stundenzahl bringen
            var columns = s.plan
            while columns.count < 5 { columns.append([]) }
            for day in 0..<5 {
                var column = columns[day]
                while column.count < periodCount { column.append(nil) }
                if column.count > periodCount { column = Array(column.prefix(periodCount)) }
                columns[day] = column
            }
            plan = Array(columns.prefix(5))
        } else {
            subjects = Planner.defaultSubjects
            periods  = 8
            plan     = Array(repeating: Array(repeating: nil, count: 8), count: 5)
            homework = [:]
            notes    = [:]
        }
    }

    // MARK: Speichern

    func save() {
        saveWork?.cancel()
        let snapshot = Snapshot(subjects: subjects, periods: periods, plan: plan,
                                homework: homework, notes: notes)
        let work = DispatchWorkItem {
            guard let data = try? JSONEncoder().encode(snapshot) else { return }
            try? data.write(to: Planner.fileURL, options: .atomic)
        }
        saveWork = work
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 0.4, execute: work)
    }

    // MARK: Fächer

    func subject(_ id: UUID?) -> Subject? {
        guard let id else { return nil }
        return subjects.first { $0.id == id }
    }

    @discardableResult
    func addSubject(name: String = "Neues Fach") -> Subject {
        let color = Palette.colors[subjects.count % Palette.colors.count]
        let s = Subject(name: name, colorHex: color)
        subjects.append(s)
        save()
        return s
    }

    func update(_ subject: Subject) {
        guard let i = subjects.firstIndex(where: { $0.id == subject.id }) else { return }
        subjects[i] = subject
        save()
    }

    func deleteSubject(_ subject: Subject) {
        subjects.removeAll { $0.id == subject.id }
        for day in 0..<plan.count {
            for period in 0..<plan[day].count where plan[day][period] == subject.id {
                plan[day][period] = nil
            }
        }
        save()
    }

    // MARK: Stundenplan

    func lesson(day: Int, period: Int) -> Subject? {
        subject(lessonID(day: day, period: period))
    }

    /// Fach-ID einer Stunde – mit Bereichsprüfung, damit nichts abstürzt.
    func lessonID(day: Int, period: Int) -> UUID? {
        guard plan.indices.contains(day), plan[day].indices.contains(period) else { return nil }
        return plan[day][period]
    }

    func setLesson(day: Int, period: Int, subjectID: UUID?) {
        guard plan.indices.contains(day), plan[day].indices.contains(period) else { return }
        plan[day][period] = subjectID
        save()
    }

    func setPeriods(_ count: Int) {
        let new = min(12, max(1, count))
        guard new != periods else { return }
        for day in 0..<5 {
            if new > plan[day].count {
                plan[day].append(contentsOf: Array(repeating: nil, count: new - plan[day].count))
            } else {
                plan[day] = Array(plan[day].prefix(new))
            }
        }
        periods = new
        save()
    }

    /// Fächer eines Tages, gleiche Fächer hintereinander zu einem Block zusammengefasst.
    func blocks(for date: Date) -> [LessonBlock] {
        let day = SchoolDay.weekdayIndex(date)
        guard day < 5, plan.indices.contains(day) else { return [] }

        var result: [LessonBlock] = []
        for period in plan[day].indices {
            guard let id = plan[day][period], let subject = subject(id) else { continue }
            if var last = result.last, last.subject.id == id, last.to == period - 1 {
                last.to = period
                result[result.count - 1] = last
            } else {
                result.append(LessonBlock(subject: subject, from: period, to: period))
            }
        }
        return result
    }

    // MARK: Hausaufgaben

    func entry(date: Date, period: Int) -> HomeworkEntry? {
        homework[SchoolDay.key(date)]?[String(period)]
    }

    func setEntry(_ entry: HomeworkEntry?, date: Date, period: Int) {
        let day = SchoolDay.key(date)
        var forDay = homework[day] ?? [:]
        if let entry {
            forDay[String(period)] = entry
        } else {
            forDay.removeValue(forKey: String(period))
        }
        homework[day] = forDay.isEmpty ? nil : forDay
        save()
    }

    func toggleDone(date: Date, period: Int) {
        guard var e = entry(date: date, period: period) else { return }
        e.done.toggle()
        setEntry(e, date: date, period: period)
    }

    /// Wie viele Fächer des Tages sind erledigt (oder haben nichts auf)?
    func doneCount(for date: Date) -> Int {
        blocks(for: date).filter { block in
            guard let e = entry(date: date, period: block.from) else { return false }
            return e.done || e.none
        }.count
    }

    // MARK: Notizen

    func noteBinding(for date: Date) -> Binding<String> {
        let key = SchoolDay.key(date)
        return Binding(
            get: { [weak self] in self?.notes[key] ?? "" },
            set: { [weak self] newValue in
                guard let self else { return }
                self.notes[key] = newValue
                self.save()
            }
        )
    }
}

// MARK: - Schultage & Datum

enum SchoolDay {

    static var calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.locale = Locale(identifier: "de_DE")
        c.firstWeekday = 2
        return c
    }()

    static let names = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
    static let shortNames = ["Mo", "Di", "Mi", "Do", "Fr"]

    /// 0 = Montag … 6 = Sonntag
    static func weekdayIndex(_ date: Date) -> Int {
        (calendar.component(.weekday, from: date) + 5) % 7
    }

    static func isSchoolDay(_ date: Date) -> Bool { weekdayIndex(date) < 5 }

    /// Nächster (step = 1) bzw. vorheriger (step = -1) Schultag – Wochenenden werden übersprungen.
    static func next(_ date: Date, _ step: Int) -> Date {
        var d = calendar.date(byAdding: .day, value: step, to: date) ?? date
        var guardCount = 0
        while !isSchoolDay(d), guardCount < 10 {
            d = calendar.date(byAdding: .day, value: step, to: d) ?? d
            guardCount += 1
        }
        return d
    }

    static func today() -> Date {
        let now = calendar.startOfDay(for: Date())
        return isSchoolDay(now) ? now : next(now, 1)
    }

    static func isSameDay(_ a: Date, _ b: Date) -> Bool {
        calendar.isDate(a, inSameDayAs: b)
    }

    static func key(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func name(_ date: Date) -> String { names[weekdayIndex(date)] }

    static func shortDate(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%02d.%02d.%04d", c.day ?? 0, c.month ?? 0, c.year ?? 0)
    }

    static func longDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "de_DE")
        f.dateFormat = "d. MMMM yyyy"
        return f.string(from: date)
    }
}
