import Foundation

/// Eine Hausaufgabe zu einer Stunde an einem bestimmten Tag.
struct HomeworkEntry: Codable, Hashable {
    var text: String = ""
    /// Wurde „Keine Hausaufgaben“ gewählt?
    var noHomework: Bool = false
    var done: Bool = false

    var hasContent: Bool {
        noHomework || !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
