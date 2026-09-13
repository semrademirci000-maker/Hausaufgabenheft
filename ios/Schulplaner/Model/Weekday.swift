import Foundation

/// Montag bis Freitag – die Spalten im Stundenplan.
enum Weekday: Int, Codable, CaseIterable, Identifiable, Hashable {
    case monday = 1
    case tuesday = 2
    case wednesday = 3
    case thursday = 4
    case friday = 5

    var id: Int { rawValue }

    var longName: String {
        switch self {
        case .monday: return "Montag"
        case .tuesday: return "Dienstag"
        case .wednesday: return "Mittwoch"
        case .thursday: return "Donnerstag"
        case .friday: return "Freitag"
        }
    }

    var shortName: String {
        switch self {
        case .monday: return "Mo"
        case .tuesday: return "Di"
        case .wednesday: return "Mi"
        case .thursday: return "Do"
        case .friday: return "Fr"
        }
    }

    /// Wochentag eines Datums – nil am Wochenende.
    init?(date: Date) {
        // Calendar zählt Sonntag = 1, Montag = 2 …
        let component = SchoolCalendar.calendar.component(.weekday, from: date)
        guard let day = Weekday(rawValue: component - 1) else { return nil }
        self = day
    }
}
