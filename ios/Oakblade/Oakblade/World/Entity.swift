//
//  Entity.swift
//  Alles, was auf der Karte steht oder läuft: der Ritter, Freunde,
//  Familie, Zombies, Bäume, das Auto.
//

import Foundation

/// Ein Punkt in der Welt – in Pixeln, mit Kommastellen.
struct Vec {
    var x: Double
    var y: Double

    static let zero = Vec(x: 0, y: 0)

    func distance(to other: Vec) -> Double {
        let dx = x - other.x, dy = y - other.y
        return (dx * dx + dy * dy).squareRoot()
    }
}

/// Ein rechteckiges Hindernis (Auto, Bank, Laterne).
struct Box {
    var minX: Double
    var minY: Double
    var maxX: Double
    var maxY: Double

    func overlaps(minX l: Double, minY t: Double, maxX r: Double, maxY b: Double) -> Bool {
        r > minX && l < maxX && b > minY && t < maxY
    }
}

final class Entity {

    enum Kind {
        case player, friend, npc, zombie, prop, coin
    }

    let kind: Kind
    var key: String                  // Person oder Art des Objekts
    var pos: Vec                     // Fußpunkt der Figur
    var facing: Facing = .down
    var anim: Double = 0
    var moving = false

    // Kampf
    var hp: Int = 0
    var maxHP: Int = 0
    var flash: Double = 0
    var dying: Double = 0
    var isDying = false
    var knock = Vec.zero
    var invulnerable: Double = 0
    var hitBySwing = -1
    var attackTimer: Double?         // läuft, während geschlagen wird
    var attackCooldown: Double = 0
    var swingCount = 0

    // Begleiter
    var waitsAtHome = false          // steht noch vorm Haus
    var mood = 0
    var helperCooldown: Double = 0
    var helperSwing: Double = 0

    // Herumlaufen und Reden
    var wanders = false
    var wanderTimer: Double = 0
    var drift = Vec.zero
    var line: String?
    var timesTalked = 0

    // Bosse
    var boss: Boss?
    var specialTimer: Double = 0
    var dashTimer: Double = 0
    var rootsTimer: Double = 0
    var raging = false

    // Münzen
    var life: Double = 0
    var collected = false

    // Objekte
    var text: String?
    var isShop = false

    init(kind: Kind, key: String, pos: Vec) {
        self.kind = kind
        self.key = key
        self.pos = pos
    }

    var frame: Int { Int(anim) % 2 }
}
