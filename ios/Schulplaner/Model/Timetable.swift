import Foundation

/// Der Stundenplan: welches Fach liegt in welcher Stunde an welchem Tag.
struct Timetable: Codable, Hashable {
    /// Wie viele Stunden pro Tag angezeigt werden.
    var periodCount: Int = 6
    /// Schlüssel: "wochentag-stunde", z. B. "1-2" für Montag, 2. Stunde.
    var entries: [String: UUID] = [:]

    static func key(_ day: Weekday, _ period: Int) -> String {
        "\(day.rawValue)-\(period)"
    }

    func subjectID(_ day: Weekday, _ period: Int) -> UUID? {
        entries[Timetable.key(day, period)]
    }

    mutating func set(_ subjectID: UUID?, day: Weekday, period: Int) {
        let key = Timetable.key(day, period)
        if let subjectID {
            entries[key] = subjectID
        } else {
            entries.removeValue(forKey: key)
        }
    }

    mutating func removeAll(of subjectID: UUID) {
        entries = entries.filter { $0.value != subjectID }
    }
}

/// Mehrere gleiche Stunden hintereinander (z. B. 1. und 2. Stunde Deutsch)
/// werden zu einem Block zusammengefasst.
struct LessonBlock: Identifiable, Hashable {
    var firstPeriod: Int
    var lastPeriod: Int
    var subject: Subject

    var id: Int { firstPeriod }

    var periodCount: Int { lastPeriod - firstPeriod + 1 }

    /// "1.–2." oder "3."
    var periodLabel: String {
        firstPeriod == lastPeriod ? "\(firstPeriod)." : "\(firstPeriod).–\(lastPeriod)."
    }

    var longPeriodLabel: String {
        firstPeriod == lastPeriod ? "\(firstPeriod). Stunde" : "\(firstPeriod).–\(lastPeriod). Stunde"
    }
}
