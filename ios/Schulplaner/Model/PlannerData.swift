import Foundation

/// Alle Daten der App: Fächer, Stundenplan, Hausaufgaben und Notizen.
struct PlannerData: Codable {
    var subjects: [Subject] = []
    var timetable = Timetable()
    /// Schlüssel: "2026-09-14#1" (Datum + erste Stunde des Blocks).
    var homework: [String: HomeworkEntry] = [:]
    /// Freie Notizen pro Tag, Schlüssel ist das Datum.
    var notes: [String: String] = [:]

    static func homeworkKey(date: Date, period: Int) -> String {
        "\(SchoolCalendar.key(for: date))#\(period)"
    }

    func subject(_ id: UUID?) -> Subject? {
        guard let id else { return nil }
        return subjects.first { $0.id == id }
    }

    /// Die Stunden eines Tages, gleiche Fächer hintereinander zusammengefasst.
    func blocks(for day: Weekday) -> [LessonBlock] {
        var blocks: [LessonBlock] = []
        var period = 1
        while period <= timetable.periodCount {
            guard let id = timetable.subjectID(day, period), let subject = subject(id) else {
                period += 1
                continue
            }
            var last = period
            while last + 1 <= timetable.periodCount, timetable.subjectID(day, last + 1) == id {
                last += 1
            }
            blocks.append(LessonBlock(firstPeriod: period, lastPeriod: last, subject: subject))
            period = last + 1
        }
        return blocks
    }

    /// Die Stunden eines Datums (am Wochenende leer).
    func blocks(for date: Date) -> [LessonBlock] {
        guard let day = Weekday(date: date) else { return [] }
        return blocks(for: day)
    }

    /// Beispiel-Stundenplan beim ersten Start – alles änderbar.
    static var starter: PlannerData {
        let deutsch = Subject(name: "Deutsch", colorHex: "#3B6FD1")
        let mathe = Subject(name: "Mathe", colorHex: "#C0453C")
        let englisch = Subject(name: "Englisch", colorHex: "#2E8B62")
        let sachkunde = Subject(name: "Sachkunde", colorHex: "#C2801F")
        let sport = Subject(name: "Sport", colorHex: "#7A5AA8")
        let kunst = Subject(name: "Kunst", colorHex: "#B05576")
        let musik = Subject(name: "Musik", colorHex: "#2A8A99")

        var data = PlannerData()
        data.subjects = [deutsch, mathe, englisch, sachkunde, sport, kunst, musik]
        data.timetable.periodCount = 6

        let plan: [Weekday: [Int: Subject]] = [
            .monday: [1: deutsch, 2: deutsch, 4: mathe, 5: mathe],
            .tuesday: [1: mathe, 2: mathe, 3: englisch, 4: sachkunde, 5: sport],
            .wednesday: [1: deutsch, 2: mathe, 3: sachkunde, 4: sachkunde, 5: kunst, 6: kunst],
            .thursday: [1: englisch, 2: englisch, 3: deutsch, 4: mathe, 5: musik],
            .friday: [1: mathe, 2: deutsch, 3: sport, 4: sport]
        ]
        for (day, lessons) in plan {
            for (period, subject) in lessons {
                data.timetable.set(subject.id, day: day, period: period)
            }
        }
        return data
    }
}
