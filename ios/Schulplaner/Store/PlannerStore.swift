import Foundation
import SwiftUI

/// Hält alle Daten und speichert sie automatisch als JSON-Datei auf dem Gerät.
final class PlannerStore: ObservableObject {
    @Published var data: PlannerData {
        didSet { save() }
    }

    private let fileURL: URL
    private let encoder = JSONEncoder()

    init() {
        let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSTemporaryDirectory())
        fileURL = folder.appendingPathComponent("schulplaner.json")
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        if let raw = try? Data(contentsOf: fileURL),
           let loaded = try? JSONDecoder().decode(PlannerData.self, from: raw) {
            data = loaded
        } else {
            data = .starter
        }
    }

    private func save() {
        do {
            try encoder.encode(data).write(to: fileURL, options: .atomic)
        } catch {
            print("Konnte nicht speichern: \(error.localizedDescription)")
        }
    }

    // MARK: - Fächer

    /// Erste Farbe der Palette, die noch kein Fach benutzt.
    var suggestedColorHex: String {
        let used = Set(data.subjects.map(\.colorHex))
        return Theme.palette.first { !used.contains($0) } ?? Theme.palette.randomElement() ?? "#2F6FED"
    }

    func addSubject(name: String, colorHex: String? = nil) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        data.subjects.append(Subject(name: trimmed, colorHex: colorHex ?? suggestedColorHex))
    }

    func deleteSubjects(at offsets: IndexSet) {
        let removed = offsets.map { data.subjects[$0] }
        var copy = data
        copy.subjects.remove(atOffsets: offsets)
        for subject in removed {
            copy.timetable.removeAll(of: subject.id)
        }
        data = copy
    }

    // MARK: - Stundenplan

    func setLesson(_ subjectID: UUID?, day: Weekday, period: Int) {
        data.timetable.set(subjectID, day: day, period: period)
    }

    func setPeriodCount(_ count: Int) {
        data.timetable.periodCount = min(max(count, 1), 12)
    }

    func clearTimetable() {
        data.timetable.entries.removeAll()
    }

    // MARK: - Hausaufgaben

    func entry(date: Date, period: Int) -> HomeworkEntry? {
        data.homework[PlannerData.homeworkKey(date: date, period: period)]
    }

    func setEntry(_ entry: HomeworkEntry?, date: Date, period: Int) {
        let key = PlannerData.homeworkKey(date: date, period: period)
        if let entry, entry.hasContent {
            data.homework[key] = entry
        } else {
            data.homework.removeValue(forKey: key)
        }
    }

    func toggleDone(date: Date, period: Int) {
        let key = PlannerData.homeworkKey(date: date, period: period)
        guard var entry = data.homework[key] else { return }
        entry.done.toggle()
        data.homework[key] = entry
    }

    /// Wie viele Aufgaben an diesem Tag noch offen sind.
    func openCount(for date: Date) -> Int {
        data.blocks(for: date).reduce(into: 0) { result, block in
            if let entry = entry(date: date, period: block.firstPeriod),
               !entry.noHomework, !entry.done, !entry.text.isEmpty {
                result += 1
            }
        }
    }

    // MARK: - Notizen

    func note(for date: Date) -> String {
        data.notes[SchoolCalendar.key(for: date)] ?? ""
    }

    func setNote(_ text: String, for date: Date) {
        let key = SchoolCalendar.key(for: date)
        if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            data.notes.removeValue(forKey: key)
        } else {
            data.notes[key] = text
        }
    }

    func noteBinding(for date: Date) -> Binding<String> {
        Binding(
            get: { [weak self] in self?.note(for: date) ?? "" },
            set: { [weak self] newValue in self?.setNote(newValue, for: date) }
        )
    }
}
