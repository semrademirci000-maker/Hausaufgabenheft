import Foundation

/// Kalender-Hilfen: deutsche Wochentage, Schultage (Mo–Fr) und Datums-Schlüssel.
enum SchoolCalendar {
    static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "de_DE")
        calendar.firstWeekday = 2 // Montag
        return calendar
    }()

    private static let keyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static let longDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "EEEE, d. MMMM"
        return formatter
    }()

    static let shortDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "d.M.yyyy"
        return formatter
    }()

    /// Eindeutiger Schlüssel für einen Tag, z. B. "2026-09-14".
    static func key(for date: Date) -> String {
        keyFormatter.string(from: date)
    }

    static func startOfDay(_ date: Date) -> Date {
        calendar.startOfDay(for: date)
    }

    static func isSchoolDay(_ date: Date) -> Bool {
        Weekday(date: date) != nil
    }

    static func isToday(_ date: Date) -> Bool {
        calendar.isDateInToday(date)
    }

    /// Nächster Schultag (überspringt Samstag und Sonntag).
    static func nextSchoolDay(onOrAfter date: Date) -> Date {
        var day = startOfDay(date)
        var safety = 0
        while !isSchoolDay(day), safety < 7 {
            guard let next = calendar.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
            safety += 1
        }
        return day
    }

    /// Alle Schultage in einem Zeitraum rund um heute – eine Seite pro Tag.
    static func schoolDays(weeksBack: Int = 8, weeksForward: Int = 30, from reference: Date = Date()) -> [Date] {
        let today = startOfDay(reference)
        guard let start = calendar.date(byAdding: .day, value: -weeksBack * 7, to: today),
              let end = calendar.date(byAdding: .day, value: weeksForward * 7, to: today) else {
            return [today]
        }
        var days: [Date] = []
        var cursor = start
        while cursor <= end {
            if isSchoolDay(cursor) { days.append(cursor) }
            guard let next = calendar.date(byAdding: .day, value: 1, to: cursor) else { break }
            cursor = next
        }
        return days.isEmpty ? [today] : days
    }
}
