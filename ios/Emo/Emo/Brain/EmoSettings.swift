//
//  EmoSettings.swift
//  Einstellungen – werden automatisch gespeichert.
//

import SwiftUI
import Security

enum AIMode: String, CaseIterable, Identifiable {
    case automatic, apple, claude, simple
    var id: String { rawValue }
    var title: String {
        switch self {
        case .automatic: return "Automatisch"
        case .apple:     return "Apple Intelligence (auf dem Gerät)"
        case .claude:    return "Claude (Internet, API-Schlüssel)"
        case .simple:    return "Nur einfache Antworten"
        }
    }
}

final class EmoSettings: ObservableObject {

    static let eyeColors: [(name: String, color: Color)] = [
        ("Emo-Blau", Color(red: 0.31, green: 0.89, blue: 1.0)),
        ("Weiß",     Color(red: 0.88, green: 0.95, blue: 1.0)),
        ("Grün",     Color(red: 0.35, green: 1.0, blue: 0.55)),
        ("Pink",     Color(red: 1.0, green: 0.45, blue: 0.75)),
        ("Orange",   Color(red: 1.0, green: 0.65, blue: 0.25)),
        ("Lila",     Color(red: 0.7, green: 0.5, blue: 1.0)),
    ]

    private let d = UserDefaults.standard

    @Published var eyeColorIndex: Int { didSet { d.set(eyeColorIndex, forKey: "eyeColor") } }
    @Published var voicePitch: Double { didSet { d.set(voicePitch, forKey: "voicePitch") } }
    @Published var volume: Double { didSet { d.set(volume, forKey: "volume") } }
    @Published var useCamera: Bool { didSet { d.set(useCamera, forKey: "useCamera") } }
    @Published var useMicrophone: Bool { didSet { d.set(useMicrophone, forKey: "useMicrophone") } }
    @Published var needsWakeWord: Bool { didSet { d.set(needsWakeWord, forKey: "needsWakeWord") } }
    @Published var showSubtitles: Bool { didSet { d.set(showSubtitles, forKey: "showSubtitles") } }
    @Published var showTalkBars: Bool { didSet { d.set(showTalkBars, forKey: "showTalkBars") } }
    @Published var followFace: Bool { didSet { d.set(followFace, forKey: "followFace") } }
    @Published var aiMode: AIMode { didSet { d.set(aiMode.rawValue, forKey: "aiMode") } }
    @Published private(set) var hasClaudeKey: Bool

    var eyeColor: Color {
        EmoSettings.eyeColors[min(max(eyeColorIndex, 0), EmoSettings.eyeColors.count - 1)].color
    }

    init() {
        d.register(defaults: [
            "eyeColor": 0, "voicePitch": 1.6, "volume": 0.8,
            "useCamera": true, "useMicrophone": true, "needsWakeWord": true,
            "showSubtitles": true, "showTalkBars": true, "followFace": true,
            "aiMode": AIMode.automatic.rawValue,
        ])
        eyeColorIndex = d.integer(forKey: "eyeColor")
        voicePitch = d.double(forKey: "voicePitch")
        volume = d.double(forKey: "volume")
        useCamera = d.bool(forKey: "useCamera")
        useMicrophone = d.bool(forKey: "useMicrophone")
        needsWakeWord = d.bool(forKey: "needsWakeWord")
        showSubtitles = d.bool(forKey: "showSubtitles")
        showTalkBars = d.bool(forKey: "showTalkBars")
        followFace = d.bool(forKey: "followFace")
        aiMode = AIMode(rawValue: d.string(forKey: "aiMode") ?? "") ?? .automatic
        hasClaudeKey = !(Keychain.read("claudeKey") ?? "").isEmpty
    }

    /// Der Claude-API-Schlüssel liegt sicher im Schlüsselbund, nicht in den Einstellungen.
    var claudeKey: String {
        get { Keychain.read("claudeKey") ?? "" }
        set {
            let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
            Keychain.write("claudeKey", trimmed)
            hasClaudeKey = !trimmed.isEmpty
        }
    }
}

/// Mini-Helfer für den iOS-Schlüsselbund.
enum Keychain {
    private static let service = "de.schulplaner.emo"

    static func read(_ key: String) -> String? {
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func write(_ key: String, _ value: String) {
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(base as CFDictionary)
        guard !value.isEmpty else { return }
        var add = base
        add[kSecValueData as String] = Data(value.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }
}
