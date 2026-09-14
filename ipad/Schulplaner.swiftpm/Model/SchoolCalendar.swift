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

    static let shortWeekdayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "EE"
        return formatter
    }()

    static let dayMonthFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "d.M."
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

    /// Die Seiten des Hefts: pro Woche Montag bis Freitag und eine
    /// Wochenendseite. So ergeben sich saubere Doppelseiten
    /// (Mo|Di, Mi|Do, Fr|Wochenende), und Montag liegt immer links.
    static func bookPages(weeksBack: Int = 3, weeksForward: Int = 12, from reference: Date = Date()) -> [Date] {
        var cursor = startOfDay(reference)
        cursor = calendar.date(byAdding: .day, value: -weeksBack * 7, to: cursor) ?? cursor
        // auf den Montag davor zurückgehen
        var safety = 0
        while calendar.component(.weekday, from: cursor) != 2, safety < 7 {
            cursor = calendar.date(byAdding: .day, value: -1, to: cursor) ?? cursor
            safety += 1
        }
        guard let end = calendar.date(byAdding: .day, value: (weeksBack + weeksForward) * 7, to: startOfDay(reference)) else {
            return [startOfDay(reference)]
        }

        var days: [Date] = []
        while cursor <= end {
            let weekday = calendar.component(.weekday, from: cursor)
            if weekday >= 2 && weekday <= 7 { // Montag bis Samstag, Samstag ist die Wochenendseite
                days.append(cursor)
            }
            guard let next = calendar.date(byAdding: .day, value: 1, to: cursor) else { break }
            cursor = next
        }
        return days.isEmpty ? [startOfDay(reference)] : days
    }

    /// Ist das eine Wochenendseite?
    static func isWeekendPage(_ date: Date) -> Bool {
        Weekday(date: date) == nil
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
