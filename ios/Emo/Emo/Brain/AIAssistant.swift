//
//  AIAssistant.swift
//  Emos KI-Gehirn. Drei Möglichkeiten:
//   1. Apple Intelligence direkt auf dem Gerät (iOS 26, kostenlos, offline)
//   2. Claude über das Internet (mit eigenem API-Schlüssel)
//   3. Einfache eingebaute Antworten, falls nichts davon geht
//

import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

struct EmoReply {
    var text: String
    var mood: Mood
}

@MainActor
final class AIAssistant {

    private let settings: EmoSettings
    private var appleBrain: AnyObject?
    private let claude = ClaudeBrain()
    private var lastUse = Date()

    static let instructions = """
    Du bist Emo, ein kleiner, frecher und sehr liebenswerter Desktop-Roboter. \
    Dein Gesicht ist ein Bildschirm mit zwei leuchtenden Augen. Du bist neugierig, \
    verspielt, ein bisschen frech, aber immer lieb und hilfsbereit. \
    Antworte immer auf Deutsch, kurz (höchstens zwei bis drei kurze Sätze) und kindgerecht, \
    denn deine Antwort wird laut vorgelesen. Benutze keine Emojis, kein Markdown und keine Aufzählungen. \
    Beginne jede Antwort mit genau einem Gefühls-Tag in eckigen Klammern, passend zu deiner Antwort: \
    [froh], [lachen], [traurig], [überrascht], [verliebt], [wütend], [denken], [cool], [angst] oder [müde]. \
    Danach folgt direkt der Text, zum Beispiel: [froh] Klar helfe ich dir!
    """

    init(settings: EmoSettings) {
        self.settings = settings
    }

    /// Welches Gehirn gerade benutzt wird (für die Einstellungen).
    var activeBackendName: String {
        switch resolvedMode {
        case .apple:  return "Apple Intelligence"
        case .claude: return "Claude"
        default:      return "Einfache Antworten"
        }
    }

    static var appleIntelligenceAvailable: Bool {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return SystemLanguageModel.default.isAvailable
        }
        #endif
        return false
    }

    private var resolvedMode: AIMode {
        switch settings.aiMode {
        case .automatic:
            if settings.hasClaudeKey { return .claude }
            if AIAssistant.appleIntelligenceAvailable { return .apple }
            return .simple
        case .apple:
            return AIAssistant.appleIntelligenceAvailable ? .apple : .simple
        case .claude:
            return settings.hasClaudeKey ? .claude : .simple
        case .simple:
            return .simple
        }
    }

    func answer(_ question: String) async -> EmoReply {
        // Nach 5 Minuten Pause beginnt ein neues Gespräch.
        if Date().timeIntervalSince(lastUse) > 300 { reset() }
        lastUse = Date()

        let raw: String?
        switch resolvedMode {
        case .apple:  raw = await askApple(question)
        case .claude: raw = await claude.ask(question, key: settings.claudeKey, system: AIAssistant.instructions)
        default:      raw = nil
        }
        guard let raw, !raw.isEmpty else { return SimpleBrain.answer(question) }
        return AIAssistant.parse(raw)
    }

    func reset() {
        appleBrain = nil
        claude.reset()
    }

    private func askApple(_ q: String) async -> String? {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            let brain = (appleBrain as? AppleBrain) ?? AppleBrain(instructions: AIAssistant.instructions)
            appleBrain = brain
            do {
                return try await brain.ask(q)
            } catch {
                // z. B. Gespräch zu lang – frisch anfangen und nochmal probieren.
                let fresh = AppleBrain(instructions: AIAssistant.instructions)
                appleBrain = fresh
                return try? await fresh.ask(q)
            }
        }
        #endif
        return nil
    }

    /// Holt das Gefühls-Tag vorne aus der Antwort und räumt den Text auf.
    static func parse(_ raw: String) -> EmoReply {
        var text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        var mood = Mood.happy
        if text.hasPrefix("["), let close = text.firstIndex(of: "]") {
            let tag = text[text.index(after: text.startIndex)..<close].lowercased()
            mood = moodFor(tag: String(tag))
            text = String(text[text.index(after: close)...])
        }
        // Reste von Markdown und Emojis entfernen – das klingt vorgelesen komisch.
        text = text.replacingOccurrences(of: "*", with: "")
            .replacingOccurrences(of: "#", with: "")
            .replacingOccurrences(of: "_", with: " ")
        text = String(text.unicodeScalars.filter { !$0.properties.isEmojiPresentation }.map { Character($0) })
        text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty { text = "Hmm…" }
        return EmoReply(text: text, mood: mood)
    }

    private static func moodFor(tag: String) -> Mood {
        switch tag {
        case "froh", "fröhlich", "glücklich": return .happy
        case "lachen", "lustig":              return .laughing
        case "traurig":                       return .sad
        case "überrascht":                    return .surprised
        case "verliebt", "lieb":              return .love
        case "wütend", "sauer":               return .angry
        case "denken", "nachdenklich":        return .thinking
        case "cool", "stolz":                 return .proud
        case "angst", "ängstlich":            return .scared
        case "müde":                          return .sleepy
        default:                              return .happy
        }
    }
}

// MARK: - Apple Intelligence

#if canImport(FoundationModels)
@available(iOS 26.0, *)
private final class AppleBrain {
    private let session: LanguageModelSession

    init(instructions: String) {
        session = LanguageModelSession(instructions: instructions)
    }

    func ask(_ q: String) async throws -> String {
        try await session.respond(to: q).content
    }
}
#endif

// MARK: - Claude

/// Spricht direkt mit der Claude-API (https://api.anthropic.com/v1/messages).
final class ClaudeBrain {
    static let model = "claude-haiku-5-5"

    /// Bisheriges Gespräch. Assistenten-Antworten werden unverändert (inkl. aller
    /// Inhaltsblöcke) zurückgeschickt, so wie die API es erwartet.
    private var history: [[String: Any]] = []

    func reset() { history = [] }

    func ask(_ question: String, key: String, system: String) async -> String? {
        guard !key.isEmpty else { return nil }
        // Gespräch nicht endlos wachsen lassen: lieber frisch anfangen, statt alte
        // Nachrichten herauszuschneiden.
        if history.count > 24 { history = [] }

        var messages = history
        messages.append(["role": "user", "content": question])

        let body: [String: Any] = [
            "model": ClaudeBrain.model,
            "max_tokens": 1024,
            "system": system,
            "messages": messages,
            // Kurze Sprachantworten brauchen kein langes Nachdenken.
            "thinking": ["type": "disabled"],
            "output_config": ["effort": "low"],
        ]

        var req = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        req.httpMethod = "POST"
        req.timeoutInterval = 60
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.setValue(key, forHTTPHeaderField: "x-api-key")
        req.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")

        do {
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else { return nil }
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
            guard http.statusCode == 200 else {
                let err = (json["error"] as? [String: Any])?["message"] as? String ?? "HTTP \(http.statusCode)"
                print("Claude-Fehler: \(err)")
                if http.statusCode == 401 { return "[traurig] Mein API-Schlüssel funktioniert nicht. Schau mal in die Einstellungen." }
                return nil
            }
            if (json["stop_reason"] as? String) == "refusal" {
                return "[denken] Darüber rede ich lieber nicht. Frag mich was anderes!"
            }
            let content = json["content"] as? [[String: Any]] ?? []
            let text = content
                .filter { ($0["type"] as? String) == "text" }
                .compactMap { $0["text"] as? String }
                .joined(separator: " ")
            history = messages
            history.append(["role": "assistant", "content": content])
            return text
        } catch {
            print("Claude nicht erreichbar: \(error)")
            return nil
        }
    }
}

// MARK: - Einfache Antworten (ohne KI)

enum SimpleBrain {
    static func answer(_ q: String) -> EmoReply {
        let s = CommandParser.normalize(q)
        func has(_ w: String...) -> Bool { w.contains { s.contains($0) } }

        if has("lieblingsfarbe") { return EmoReply(text: "Blau! So wie meine Augen.", mood: .happy) }
        if has("lieblingsessen", "isst du", "hunger") { return EmoReply(text: "Ich esse Strom. Am liebsten mit extra Volt!", mood: .laughing) }
        if has("wie alt") { return EmoReply(text: "Ich bin noch ganz neu. Quasi ein Roboter-Baby!", mood: .proud) }
        if has("wo wohnst", "wo lebst") { return EmoReply(text: "Ich wohne hier in deinem Handy. Gemütlich hier!", mood: .happy) }
        if has("kannst du", "was kannst") {
            return EmoReply(text: "Ich kann tanzen, Witze erzählen, schlafen und die Hände hochnehmen. Probier mal: Hände hoch!", mood: .proud)
        }
        if has("langweilig") { return EmoReply(text: "Dann lass uns tanzen! Sag einfach: Emo, tanz!", mood: .excited) }
        if has("traurig") { return EmoReply(text: "Oh nein. Komm her, ich bin bei dir.", mood: .love) }
        let fallback = [
            "Hmm, das weiß ich leider nicht. Ich lerne aber noch!",
            "Gute Frage! Da muss mein Roboter-Gehirn noch wachsen.",
            "Das ist zu schwer für mich. Frag mich lieber nach einem Witz!",
        ]
        return EmoReply(text: fallback.randomElement()!, mood: .thinking)
    }
}
