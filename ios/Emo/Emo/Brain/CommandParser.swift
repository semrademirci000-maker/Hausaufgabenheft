//
//  CommandParser.swift
//  Versteht, was du zu Emo sagst.
//

import Foundation

enum Command: Equatable {
    case handsUp, shoot
    case hello, goodbye, dance, sleep, wakeUp
    case time, date, joke, love, compliment, insult
    case howAreYou, whoAreYou, laugh, sing, beQuiet, stop
    case beSad, beAngry, beSurprised
    /// Nur „Emo“ gesagt – Emo hört jetzt zu.
    case wakeWordOnly
    /// Alles andere: eine Frage an die KI. `addressed` = Emo wurde mit Namen angesprochen.
    case question(String, addressed: Bool)
}

enum CommandParser {

    static let wakeWords = ["hey emo", "hi emo", "hallo emo", "emo", "emmo", "ehmo", "emu", "imo", "nemo", "elmo"]

    /// Kleinbuchstaben, ohne Satzzeichen.
    static func normalize(_ text: String) -> String {
        let lower = text.lowercased()
        let cleaned = lower.unicodeScalars.map { CharacterSet.punctuationCharacters.contains($0) ? " " : Character($0) }
        return String(cleaned)
            .split(separator: " ")
            .joined(separator: " ")
    }

    static func containsWakeWord(_ text: String) -> Bool {
        let words = Set(normalize(text).split(separator: " ").map(String.init))
        return wakeWords.contains { words.contains($0) }
    }

    /// Entfernt „Hey Emo“ usw. aus dem Satz.
    static func stripWakeWord(_ text: String) -> String {
        var s = " " + normalize(text) + " "
        for w in wakeWords { s = s.replacingOccurrences(of: " \(w) ", with: " ") }
        return s.trimmingCharacters(in: .whitespaces)
    }

    /// Schnelle Prüfung auf Zwischenständen (während du noch sprichst).
    static func quick(_ text: String) -> Command? {
        let s = normalize(text)
        if has(s, handsUpWords) { return .handsUp }
        if hasWord(s, shootWords) { return .shoot }
        return nil
    }

    static func parse(_ text: String) -> Command {
        let addressed = containsWakeWord(text)
        let s = stripWakeWord(text)
        let words = s.split(separator: " ").count

        if s.isEmpty { return addressed ? .wakeWordOnly : .question("", addressed: false) }
        if has(s, handsUpWords) { return .handsUp }
        if hasWord(s, shootWords) { return .shoot }
        if has(s, ["hör auf", "stopp", "stop"]) && words <= 4 { return .stop }
        if has(s, ["sei leise", "sei still", "psst", "pscht", "ruhe", "halt die klappe"]) { return .beQuiet }
        if has(s, ["wach auf", "aufwachen", "aufstehen", "guten morgen"]) { return .wakeUp }
        if has(s, ["gute nacht", "schlaf", "schlafen", "ins bett"]) { return .sleep }
        if has(s, ["tanz", "tanzen", "party"]) { return .dance }
        if has(s, ["sing", "lied"]) { return .sing }
        if has(s, ["witz", "lustiges"]) { return .joke }
        if has(s, ["wie spät", "uhrzeit", "wie viel uhr", "wieviel uhr"]) { return .time }
        if has(s, ["welcher tag", "welches datum", "datum", "welchen tag"]) { return .date }
        if has(s, ["lach"]) { return .laugh }
        if has(s, ["sei traurig", "wein mal", "weine"]) { return .beSad }
        if has(s, ["sei wütend", "sei sauer", "sei böse", "werd wütend"]) { return .beAngry }
        if has(s, ["erschreck", "sei überrascht"]) { return .beSurprised }
        if has(s, ["hab dich lieb", "liebe dich", "lieb dich", "magst du mich", "mag dich"]) { return .love }
        if has(s, ["du bist toll", "du bist süß", "du bist cool", "du bist schlau", "bist der beste",
                   "gut gemacht", "super gemacht", "du bist so süß", "braver"]) { return .compliment }
        if has(s, ["doof", "blöd", "dumm", "hässlich", "nervst", "bist gemein"]) { return .insult }
        if has(s, ["wie geht", "wie gehts", "alles gut bei dir"]) { return .howAreYou }
        if has(s, ["wer bist du", "wie heißt du", "dein name", "was bist du"]) { return .whoAreYou }
        if has(s, ["tschüss", "tschau", "ciao", "auf wiedersehen", "bis später", "bis morgen"]) { return .goodbye }
        if words <= 3 && (hasWord(s, ["hallo", "hi", "hey", "servus", "moin", "huhu", "hallöchen"])
                          || has(s, ["guten tag", "grüß"])) { return .hello }
        return .question(s, addressed: addressed)
    }

    // MARK: Wortlisten

    private static let handsUpWords = ["hände hoch", "hände nach oben", "hand hoch", "hande hoch", "hendi hoch"]
    private static let shootWords = ["peng", "päng", "bang", "bäm", "bam", "bumm", "bum", "piu", "pew", "schuss", "pow"]

    private static func has(_ s: String, _ phrases: [String]) -> Bool {
        let padded = " " + s + " "
        return phrases.contains { padded.contains(" " + $0) }
    }

    private static func hasWord(_ s: String, _ words: [String]) -> Bool {
        let set = Set(s.split(separator: " ").map(String.init))
        return words.contains { set.contains($0) }
    }
}
