//
//  DialogState.swift
//  Die Textbox im Undertale-Stil: Buchstaben tippen sich einzeln,
//  darunter stehen die Antworten zum Auswählen.
//

import SwiftUI

struct DialogChoice {
    let text: String
    let reply: String?
    let action: (() -> Void)?

    init(_ text: String, reply: String? = nil, action: (() -> Void)? = nil) {
        self.text = text
        self.reply = reply
        self.action = action
    }
}

struct DialogNode {
    let who: String
    let color: Color
    let text: String
    var choices: [DialogChoice] = []
}

final class DialogState {

    private var queue: [DialogNode] = []
    private(set) var current: DialogNode?
    private(set) var shown = 0
    private var carry = 0.0
    private(set) var selected = 0

    /// Buchstaben pro Sekunde
    private let speed = 42.0

    var onBlip: (() -> Void)?
    var onSelect: (() -> Void)?
    var onFinished: (() -> Void)?

    var isOpen: Bool { current != nil }

    var isTyping: Bool {
        guard let node = current else { return false }
        return shown < node.text.count
    }

    var visibleText: String {
        guard let node = current else { return "" }
        if shown >= node.text.count { return node.text }
        return String(node.text.prefix(shown))
    }

    /// Zeigt die Antworten erst, wenn der Text fertig getippt ist.
    var visibleChoices: [DialogChoice] {
        guard let node = current, !isTyping else { return [] }
        return node.choices
    }

    // MARK: Füttern

    func push(_ node: DialogNode) {
        queue.append(node)
    }

    func push(who: String, color: Color, text: String, choices: [DialogChoice] = []) {
        queue.append(DialogNode(who: who, color: color, text: text, choices: choices))
    }

    func say(who: String, color: Color, text: String) {
        push(who: who, color: color, text: text)
        start()
    }

    /// Startet die Textbox, falls gerade nichts läuft.
    func start() {
        if current == nil { next() }
    }

    func clear() {
        queue.removeAll()
        current = nil
    }

    // MARK: Ablauf

    private func next() {
        guard !queue.isEmpty else {
            current = nil
            onFinished?()
            return
        }
        current = queue.removeFirst()
        shown = 0
        carry = 0
        selected = 0
    }

    func update(_ dt: Double) {
        guard let node = current, shown < node.text.count else { return }
        carry += dt * speed
        while carry >= 1, shown < node.text.count {
            carry -= 1
            shown += 1
            if shown % 2 == 0 { onBlip?() }
        }
    }

    /// Weiter tippen, Text überspringen oder eine Antwort bestätigen.
    func press() {
        guard let node = current else { return }
        if shown < node.text.count {
            shown = node.text.count           // erst den Text komplett zeigen
            return
        }
        if node.choices.isEmpty {
            next()
            return
        }
        choose(selected)
    }

    func choose(_ index: Int) {
        guard let node = current, !node.choices.isEmpty, !isTyping else { return }
        let choice = node.choices[min(max(0, index), node.choices.count - 1)]
        onSelect?()
        current = nil
        if let reply = choice.reply {
            queue.insert(DialogNode(who: node.who, color: node.color, text: reply), at: 0)
        }
        choice.action?()
        next()
    }

    func move(_ delta: Int) {
        guard let node = current, !node.choices.isEmpty, !isTyping else { return }
        let count = node.choices.count
        selected = ((selected + delta) % count + count) % count
        onBlip?()
    }
}
