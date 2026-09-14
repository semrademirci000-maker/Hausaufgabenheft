//
//  GameWorld.swift
//  Der Ablauf des Spiels: laufen, schlagen, reden, Türen, Autofahrt.
//

import SwiftUI

enum GameButton {
    case up, down, left, right, attack, talk
}

/// Merkt sich, welche Knöpfe gedrückt sind und welche gerade neu gedrückt wurden.
final class InputState {
    private var held: Set<GameButton> = []
    private var taps: Set<GameButton> = []

    func press(_ button: GameButton) {
        if !held.contains(button) { taps.insert(button) }
        held.insert(button)
    }

    func release(_ button: GameButton) {
        held.remove(button)
    }

    func isHeld(_ button: GameButton) -> Bool { held.contains(button) }

    /// Einmaliges Drücken abholen (danach ist es verbraucht).
    func took(_ button: GameButton) -> Bool {
        if taps.contains(button) {
            taps.remove(button)
            return true
        }
        return false
    }

    func releaseAll() {
        held.removeAll()
        taps.removeAll()
    }
}

enum Phase {
    case title, play, drive, over
}

struct TrailPoint {
    let x: Double
    let y: Double
}

struct DriveState {
    var t: Double
    let to: String
}

/// Merkt sich, wo eine Antwort in der Textbox steht – zum Antippen.
struct ChoiceHit {
    let index: Int
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

final class GameWorld {

    // MARK: Feste Größen

    static let viewWidth: Double = 320
    static let viewHeight: Double = 240
    static let tileSize: Double = 16
    private static let walkSpeed: Double = 62
    private static let attackTime: Double = 0.34

    // MARK: Zustand

    var phase: Phase = .title
    var map: GameMap = GameMap.haus()
    var mapImage: Image = Image(systemName: "square")
    var mapPixelWidth: Double = 320
    var mapPixelHeight: Double = 240

    var entities: [Entity] = []
    var party: [Entity] = []
    var partyKeys: [String] = []
    let player = Entity(kind: .player, key: "ritter", pos: Vec(x: 0, y: 0))

    var blocks: [Box] = []
    var trail: [TrailPoint] = []

    var kills = 0
    var boss: Entity?
    var bossQueue: [Boss] = []
    var bossesBeaten = 0
    var killsSinceBoss = 0
    var time: Double = 0
    var camera = Vec.zero
    var shake: Double = 0
    var hint = ""
    var hintTimer: Double = 0
    var fade: Double = 0
    var drive: DriveState?
    var overTimer: Double = 0

    /// Wie die Spielfläche gerade auf dem Bildschirm liegt (fürs Antippen).
    var viewScale: Double = 1
    var viewOffset = Vec.zero
    var choiceHits: [ChoiceHit] = []

    /// Meldet, ob die Lauf-Knöpfe gerade sinnvoll sind (beim Reden nicht).
    var onControlsChanged: ((Bool) -> Void)?
    private var controlsVisible = true

    private var pendingChange: (() -> Void)?
    private var spawnTimer: Double = 3
    private var chatTimer: Double = 18
    private var lastUpdate: Date?

    let input = InputState()
    let dialog = DialogState()
    let audio: ChipEngine

    init(audio: ChipEngine) {
        self.audio = audio
        player.hp = 10
        player.maxHP = 10
        kills = UserDefaults.standard.integer(forKey: "oakblade.kills")
        dialog.onBlip = { [weak self] in self?.audio.play(.blip) }
        dialog.onSelect = { [weak self] in self?.audio.play(.select) }
    }

    // MARK: Takt

    func advance(to date: Date) {
        var dt = 0.0
        if let last = lastUpdate {
            dt = min(0.05, date.timeIntervalSince(last))
        }
        lastUpdate = date
        time += dt
        update(dt)
    }

    private func update(_ dt: Double) {
        dialog.update(dt)
        updateControlsVisibility()

        if dialog.isOpen {
            if input.took(.up) { dialog.move(-1) }
            if input.took(.down) { dialog.move(1) }
            if input.took(.talk) || input.took(.attack) { dialog.press() }
        }

        switch phase {
        case .title:
            if input.took(.talk) || input.took(.attack) { startGame() }
            return
        case .drive:
            updateDrive(dt)
            return
        case .over:
            updateGameOver(dt)
            return
        case .play:
            break
        }

        updateFade(dt)

        if !dialog.isOpen, input.took(.talk) { tryTalk() }

        updatePlayer(dt)

        // Zombies zuerst, danach Begleiter und Leute
        for entity in entities where entity.kind == .zombie {
            updateZombie(entity, dt)
        }
        entities.removeAll { $0.kind == .zombie && $0.isDying && $0.dying > 0.55 }

        var followerIndex = 0
        for entity in entities {
            switch entity.kind {
            case .friend:
                if !entity.waitsAtHome {
                    updateCompanion(entity, dt, index: followerIndex)
                    followerIndex += 1
                }
            case .npc:
                updateNPC(entity, dt)
            default:
                break
            }
        }

        if map.hasZombies {
            spawnTimer -= dt
            if spawnTimer <= 0 {
                spawnTimer = 5 + Double.random(in: 0...4)
                if livingZombies() < 7 { spawnZombie() }
            }
            if boss != nil {
                audio.music(.boss)
            } else {
                audio.music(zombieNear(70) ? .kampf : map.song)
            }
            // Nach ein paar erledigten Zombies kommt ein Boss – jedes Mal ein anderer.
            if boss == nil, killsSinceBoss >= 6, !dialog.isOpen { spawnBoss() }
        }

        updateChat(dt)

        if hintTimer > 0 { hintTimer -= dt }
        if shake > 0 { shake = max(0, shake - dt * 12) }

        camera.x = clamp(player.pos.x - GameWorld.viewWidth / 2,
                         0, Double(map.columns) * 16 - GameWorld.viewWidth)
        camera.y = clamp(player.pos.y - GameWorld.viewHeight / 2,
                         0, Double(map.lines) * 16 - GameWorld.viewHeight)
    }

    /// Beim Reden und auf dem Titelbild stören die Knöpfe nur – dann weg damit.
    private func updateControlsVisibility() {
        let show = (phase == .play || phase == .over) && !dialog.isOpen
        guard show != controlsVisible else { return }
        controlsVisible = show
        if !show { input.releaseAll() }
        onControlsChanged?(show)
    }

    private func clamp(_ value: Double, _ low: Double, _ high: Double) -> Double {
        if high < low { return low }
        return min(max(value, low), high)
    }

    // MARK: Start

    func startGame() {
        phase = .play
        partyKeys = []
        loadMap("haus", at: Vec(x: 10.5, y: 9.5))
        dialog.push(who: Chat.person("mama").name, color: Chat.person("mama").color,
                    text: "Guten Morgen, mein Ritter! Draussen im Wald soll es wieder Zombies geben.")
        dialog.push(who: Chat.person("papa").name, color: Chat.person("papa").color,
                    text: "Nimm dein Schwert mit. Und frag die Freunde vor der Tuer, ob sie mitkommen.")
        dialog.push(who: Chat.person("mila").name, color: Chat.person("mila").color,
                    text: "Und wenn du zurueck bist, fahren wir alle mit dem Auto in die Stadt! Versprochen!")
        dialog.start()
    }

    // MARK: Karten

    func loadMap(_ key: String, at position: Vec) {
        map = GameMap.make(key)
        entities = []
        party = []
        blocks = []
        trail = []
        boss = nil
        buildMapImage()

        player.pos = Vec(x: position.x * 16, y: position.y * 16)
        player.attackTimer = nil
        player.knock = .zero
        entities.append(player)

        for (index, key) in partyKeys.enumerated() {
            let friend = Entity(kind: .friend, key: key,
                                pos: Vec(x: player.pos.x - 10 - Double(index) * 5,
                                         y: player.pos.y + 10 + Double(index) * 3))
            entities.append(friend)
            party.append(friend)
        }

        for prop in map.props {
            addProp(kind: prop.kind, x: prop.x, y: prop.y, text: prop.text)
        }

        // Bäume, Büsche und Steine stehen als Objekte auf den Kacheln.
        for y in 0..<map.lines {
            for x in 0..<map.columns {
                switch map.tile(x, y) {
                case "T": addProp(kind: "tree", x: Double(x) + 0.5, y: Double(y) + 1)
                case "t": addProp(kind: "pine", x: Double(x) + 0.5, y: Double(y) + 1)
                case "*": addProp(kind: "bush", x: Double(x) + 0.5, y: Double(y) + 1)
                case "r": addProp(kind: "rock", x: Double(x) + 0.5, y: Double(y) + 1)
                default: break
                }
            }
        }

        if map.key == "wald" {
            var spotIndex = 0
            for key in Chat.friendKeys where !partyKeys.contains(key) {
                let spot = map.friendSpots[spotIndex % max(1, map.friendSpots.count)]
                spotIndex += 1
                let friend = Entity(kind: .friend, key: key,
                                    pos: Vec(x: spot.x * 16, y: spot.y * 16))
                friend.waitsAtHome = true
                entities.append(friend)
            }
        }

        if map.key == "haus" {
            addNPC("mama", x: 3.5, y: 4, facing: .down)
            addNPC("papa", x: 6.5, y: 7.2, facing: .up)
            addNPC("mila", x: 12.5, y: 9.2, facing: .left)
        }

        if map.key == "stadt" {
            for (index, spot) in GameMap.stadtWanderSpots.enumerated() {
                let person = addNPC("buerger", x: spot.x, y: spot.y, facing: .down)
                person.wanders = true
                person.wanderTimer = Double.random(in: 0...2)
                person.line = Chat.cityLines[index % Chat.cityLines.count]
            }
        }

        spawnTimer = 3
        audio.music(map.song)
        showHint(map.name)
    }

    /// Die ganze Karte wird einmal in ein großes Bild gemalt.
    private func buildMapImage() {
        let canvas = PixelImage(map.columns * 16, map.lines * 16)
        for y in 0..<map.lines {
            for x in 0..<map.columns {
                let tile = Art.shared.tiles[map.tile(x, y)] ?? Art.shared.tiles["."]
                if let tile { canvas.blit(tile, x * 16, y * 16) }
            }
        }
        mapPixelWidth = Double(canvas.width)
        mapPixelHeight = Double(canvas.height)
        mapImage = Image(decorative: canvas.cgImage(), scale: 1)
            .interpolation(.none)
            .antialiased(false)
    }

    @discardableResult
    private func addProp(kind: String, x: Double, y: Double, text: String? = nil) -> Entity {
        let prop = Entity(kind: .prop, key: kind, pos: Vec(x: x * 16, y: y * 16))
        prop.text = text
        entities.append(prop)
        switch kind {
        case "car":
            blocks.append(Box(minX: prop.pos.x - 20, minY: prop.pos.y - 12,
                              maxX: prop.pos.x + 20, maxY: prop.pos.y))
        case "lamp":
            blocks.append(Box(minX: prop.pos.x - 4, minY: prop.pos.y - 4,
                              maxX: prop.pos.x + 4, maxY: prop.pos.y))
        case "sign":
            blocks.append(Box(minX: prop.pos.x - 12, minY: prop.pos.y - 6,
                              maxX: prop.pos.x + 12, maxY: prop.pos.y))
        case "fountain":
            blocks.append(Box(minX: prop.pos.x - 16, minY: prop.pos.y - 14,
                              maxX: prop.pos.x + 16, maxY: prop.pos.y))
        case "bench":
            blocks.append(Box(minX: prop.pos.x - 10, minY: prop.pos.y - 5,
                              maxX: prop.pos.x + 10, maxY: prop.pos.y))
        default:
            break
        }
        return prop
    }

    @discardableResult
    private func addNPC(_ key: String, x: Double, y: Double, facing: Facing) -> Entity {
        let npc = Entity(kind: .npc, key: key, pos: Vec(x: x * 16, y: y * 16))
        npc.facing = facing
        entities.append(npc)
        return npc
    }

    func showHint(_ text: String) {
        hint = text
        hintTimer = 2.6
    }

    // MARK: Laufen und Wände

    private func canStand(at point: Vec) -> Bool {
        let left = point.x - 5, right = point.x + 5
        let top = point.y - 7, bottom = point.y - 0.5
        for px in [left, right] {
            for py in [top, bottom] {
                let tx = Int(floor(px / 16)), ty = Int(floor(py / 16))
                if map.isSolid(tx, ty) { return false }
            }
        }
        for block in blocks {
            if block.overlaps(minX: left, minY: top, maxX: right, maxY: bottom) { return false }
        }
        return true
    }

    private func move(_ entity: Entity, dx: Double, dy: Double) {
        if dx != 0 {
            let old = entity.pos.x
            entity.pos.x += dx
            if !canStand(at: entity.pos) { entity.pos.x = old }
        }
        if dy != 0 {
            let old = entity.pos.y
            entity.pos.y += dy
            if !canStand(at: entity.pos) { entity.pos.y = old }
        }
        entity.pos.x = clamp(entity.pos.x, 8, Double(map.columns) * 16 - 8)
        entity.pos.y = clamp(entity.pos.y, 10, Double(map.lines) * 16 - 2)
    }

    // MARK: Der Ritter

    private func updatePlayer(_ dt: Double) {
        player.invulnerable = max(0, player.invulnerable - dt)
        player.attackCooldown = max(0, player.attackCooldown - dt)

        var dx = 0.0, dy = 0.0
        if !dialog.isOpen {
            if input.isHeld(.left) { dx -= 1 }
            if input.isHeld(.right) { dx += 1 }
            if input.isHeld(.up) { dy -= 1 }
            if input.isHeld(.down) { dy += 1 }
        }
        if dx != 0, dy != 0 { dx *= 0.7071; dy *= 0.7071 }

        player.moving = dx != 0 || dy != 0
        if player.moving, player.attackTimer == nil {
            if abs(dx) > abs(dy) {
                player.facing = dx > 0 ? .right : .left
            } else {
                player.facing = dy > 0 ? .down : .up
            }
        }

        let speed = player.attackTimer == nil ? GameWorld.walkSpeed : GameWorld.walkSpeed * 0.35
        move(player, dx: dx * speed * dt, dy: dy * speed * dt)

        if player.knock.x != 0 || player.knock.y != 0 {
            move(player, dx: player.knock.x * dt, dy: player.knock.y * dt)
            player.knock.x *= 0.86
            player.knock.y *= 0.86
            if abs(player.knock.x) < 3 { player.knock.x = 0 }
            if abs(player.knock.y) < 3 { player.knock.y = 0 }
        }

        player.anim += dt * (player.moving ? 7 : 0)

        trail.insert(TrailPoint(x: player.pos.x, y: player.pos.y), at: 0)
        if trail.count > 260 { trail.removeLast() }

        if input.took(.attack), !dialog.isOpen,
           player.attackTimer == nil, player.attackCooldown <= 0 {
            player.attackTimer = 0
            player.swingCount += 1
            audio.play(.swing)
        }

        if var timer = player.attackTimer {
            timer += dt
            player.attackTimer = timer
            if timer >= 0.06, timer <= 0.22 { hitCheck() }
            if timer >= GameWorld.attackTime {
                player.attackTimer = nil
                player.attackCooldown = 0.1
            }
        }

        checkDoors()
    }

    private func checkDoors() {
        guard pendingChange == nil else { return }
        let tx = Int(floor(player.pos.x / 16))
        let ty = Int(floor((player.pos.y - 3) / 16))
        for door in map.triggers {
            if tx >= door.x, tx < door.x + door.width,
               ty >= door.y, ty < door.y + door.height {
                useDoor(door)
                return
            }
        }
    }

    private func useDoor(_ door: DoorTrigger) {
        audio.play(.door)
        let cameFromHouse = (map.key == "haus")
        fade = 0.001
        pendingChange = { [weak self] in
            guard let self else { return }
            self.loadMap(door.to, at: door.target)
            if cameFromHouse, door.to == "wald" { self.askWhoComesAlong() }
        }
    }

    private func updateFade(_ dt: Double) {
        if let change = pendingChange {
            fade += dt * 3.2
            if fade >= 1 {
                pendingChange = nil
                change()
            }
        } else if fade > 0 {
            fade = max(0, fade - dt * 3.2)
        }
    }

    // MARK: Kämpfen

    private func hitCheck() {
        var left = 0.0, right = 0.0, top = 0.0, bottom = 0.0
        switch player.facing {
        case .right:
            left = player.pos.x + 2;  right = player.pos.x + 22
            top = player.pos.y - 16;  bottom = player.pos.y - 1
        case .left:
            left = player.pos.x - 22; right = player.pos.x - 2
            top = player.pos.y - 16;  bottom = player.pos.y - 1
        case .down:
            left = player.pos.x - 12; right = player.pos.x + 12
            top = player.pos.y - 6;   bottom = player.pos.y + 14
        case .up:
            left = player.pos.x - 12; right = player.pos.x + 12
            top = player.pos.y - 32;  bottom = player.pos.y - 12
        }

        for zombie in entities where zombie.kind == .zombie && !zombie.isDying {
            if zombie.hitBySwing == player.swingCount { continue }
            if zombie.pos.x + 6 > left, zombie.pos.x - 6 < right,
               zombie.pos.y > top, zombie.pos.y - 14 < bottom {
                zombie.hitBySwing = player.swingCount
                damage(zombie, from: player.pos)
            }
        }
    }

    private func damage(_ zombie: Entity, from source: Vec) {
        zombie.hp -= 1
        zombie.flash = 0.18
        let dx = zombie.pos.x - source.x
        let dy = zombie.pos.y - source.y
        let length = max(0.001, (dx * dx + dy * dy).squareRoot())
        zombie.knock = Vec(x: dx / length * 140, y: dy / length * 140)
        shake = 2.5

        if zombie.hp <= 0 {
            zombie.isDying = true
            zombie.dying = 0.001
            audio.play(.dead)
            if zombie.boss != nil {
                bossDefeated(zombie)
            } else {
                kills += 1
                killsSinceBoss += 1
                UserDefaults.standard.set(kills, forKey: "oakblade.kills")
                sayKillLine()
            }
        } else {
            audio.play(.hit)
        }
    }

    private func livingZombies() -> Int {
        entities.filter { $0.kind == .zombie && !$0.isDying && $0.boss == nil }.count
    }

    func zombieNear(_ radius: Double) -> Bool {
        for zombie in entities where zombie.kind == .zombie && !zombie.isDying {
            if zombie.pos.distance(to: player.pos) < radius { return true }
        }
        return false
    }

    private func spawnZombie() {
        for _ in 0..<60 {
            let tx = 2 + Int.random(in: 0..<max(1, map.columns - 4))
            let ty = 2 + Int.random(in: 0..<max(1, map.lines - 4))
            if map.isSolid(tx, ty) { continue }
            if ty < 12, tx < 22 { continue }               // nicht direkt am Haus
            let spot = Vec(x: Double(tx) * 16 + 8, y: Double(ty) * 16 + 14)
            if spot.distance(to: player.pos) < 160 { continue }
            let zombie = Entity(kind: .zombie, key: "zombie", pos: spot)
            zombie.hp = 3
            zombie.maxHP = 3
            entities.append(zombie)
            return
        }
    }

    private func updateZombie(_ zombie: Entity, _ dt: Double) {
        if zombie.isDying {
            zombie.dying += dt
            return
        }
        // Während geredet wird, bleiben die Zombies stehen.
        if dialog.isOpen {
            zombie.flash = max(0, zombie.flash - dt)
            return
        }
        zombie.flash = max(0, zombie.flash - dt)

        if zombie.boss != nil {
            updateBoss(zombie, dt)
            return
        }

        let dx = player.pos.x - zombie.pos.x
        let dy = player.pos.y - zombie.pos.y
        let distance = max(0.001, (dx * dx + dy * dy).squareRoot())
        var speed = 0.0

        if distance < 150 {
            speed = 26
            zombie.drift = Vec(x: dx / distance, y: dy / distance)
        } else {
            zombie.wanderTimer -= dt
            if zombie.wanderTimer <= 0 {
                zombie.wanderTimer = 1.2 + Double.random(in: 0...2)
                let angle = Double.random(in: 0...(2 * Double.pi))
                if Double.random(in: 0...1) < 0.3 {
                    zombie.drift = .zero
                } else {
                    zombie.drift = Vec(x: cos(angle), y: sin(angle))
                }
            }
            speed = 11
        }

        if abs(zombie.drift.x) > abs(zombie.drift.y) {
            zombie.facing = zombie.drift.x > 0 ? .right : .left
        } else if zombie.drift.y != 0 {
            zombie.facing = zombie.drift.y > 0 ? .down : .up
        }

        move(zombie, dx: zombie.drift.x * speed * dt, dy: zombie.drift.y * speed * dt)
        zombie.anim += dt * (speed > 0 ? 3.4 : 0)

        if zombie.knock.x != 0 || zombie.knock.y != 0 {
            move(zombie, dx: zombie.knock.x * dt, dy: zombie.knock.y * dt)
            zombie.knock.x *= 0.8
            zombie.knock.y *= 0.8
            if abs(zombie.knock.x) < 4 { zombie.knock.x = 0 }
            if abs(zombie.knock.y) < 4 { zombie.knock.y = 0 }
        }

        if distance < 13, player.invulnerable <= 0, phase == .play {
            hurtPlayer(1, dx: dx, dy: dy, distance: distance)
        }
    }

    /// Ein Treffer kostet ein halbes Herz, ein Bosstreffer ein ganzes.
    private func hurtPlayer(_ amount: Int, dx: Double, dy: Double, distance: Double) {
        let length = max(0.001, distance)
        player.hp -= amount
        player.invulnerable = 1.1
        player.knock = Vec(x: -dx / length * 150, y: -dy / length * 150)
        shake = 4
        audio.play(.hurt)
        if player.hp <= 0 {
            player.hp = 0
            gameOver()
        }
    }

    // MARK: Bosse

    private func spawnBoss() {
        if bossQueue.isEmpty { bossQueue = Chat.bosse.shuffled() }
        let data = bossQueue.removeFirst()

        var spot: Vec?
        for _ in 0..<90 {
            let tx = 2 + Int.random(in: 0..<max(1, map.columns - 4))
            let ty = 2 + Int.random(in: 0..<max(1, map.lines - 4))
            if map.isSolid(tx, ty) { continue }
            let candidate = Vec(x: Double(tx) * 16 + 8, y: Double(ty) * 16 + 14)
            let d = candidate.distance(to: player.pos)
            if d < 80 || d > 210 { continue }
            spot = candidate
            break
        }
        let place = spot ?? Vec(x: player.pos.x + 110, y: player.pos.y)

        let entity = Entity(kind: .zombie, key: data.key, pos: place)
        entity.boss = data
        entity.hp = data.hp
        entity.maxHP = data.hp
        entity.specialTimer = 2.5
        entities.append(entity)
        boss = entity
        killsSinceBoss = 0
        shake = 6
        audio.music(.boss)

        dialog.push(who: "!!!", color: Color(hex: 0xFF5A5A), text: data.intro)
        dialog.push(who: data.name, color: Color(hex: 0xFF9A8A), text: data.spruch)
        if let friend = party.randomElement(), let line = Chat.bossAuftritt.randomElement() {
            let person = Chat.person(friend.key)
            dialog.push(who: person.name, color: person.color, text: line)
        }
        dialog.start()
    }

    private func spawnZombieNear(_ entity: Entity) {
        for _ in 0..<20 {
            let angle = Double.random(in: 0...(2 * Double.pi))
            let radius = 26 + Double.random(in: 0...26)
            let spot = Vec(x: entity.pos.x + cos(angle) * radius,
                           y: entity.pos.y + sin(angle) * radius)
            let tx = Int(floor(spot.x / 16)), ty = Int(floor(spot.y / 16))
            if map.isSolid(tx, ty) { continue }
            let zombie = Entity(kind: .zombie, key: "zombie", pos: spot)
            zombie.hp = 3
            zombie.maxHP = 3
            entities.append(zombie)
            return
        }
    }

    private func updateBoss(_ entity: Entity, _ dt: Double) {
        guard let data = entity.boss else { return }
        entity.specialTimer -= dt

        let dx = player.pos.x - entity.pos.x
        let dy = player.pos.y - entity.pos.y
        let distance = max(0.001, (dx * dx + dy * dy).squareRoot())
        var speed = data.speed * (entity.raging ? 1.6 : 1)
        entity.drift = Vec(x: dx / distance, y: dy / distance)

        switch data.koennen {
        case "sprint":
            if entity.dashTimer > 0 {
                entity.dashTimer -= dt
                speed = 120
            } else if entity.specialTimer <= 0, distance < 190 {
                entity.specialTimer = 2.8
                entity.dashTimer = 0.45
                shake = 2
                audio.play(.swing)
            }
        case "rufen":
            if entity.specialTimer <= 0, distance < 220 {
                entity.specialTimer = 7
                spawnZombieNear(entity)
                spawnZombieNear(entity)
                showHint("Grauzahn ruft Verstaerkung!")
            }
        case "wut":
            if !entity.raging, entity.hp <= entity.maxHP / 2 {
                entity.raging = true
                shake = 5
                showHint("Mondfell wird wuetend!")
            }
        case "wurzeln":
            if entity.rootsTimer > 0 {
                entity.rootsTimer -= dt
                speed = 0
                if entity.rootsTimer <= 0, distance < 46,
                   player.invulnerable <= 0, phase == .play {
                    hurtPlayer(data.dmg, dx: dx, dy: dy, distance: distance)
                }
            } else if entity.specialTimer <= 0, distance < 130 {
                entity.specialTimer = 4.5
                entity.rootsTimer = 0.75
                audio.play(.hit)
            }
        default:
            break
        }

        if abs(entity.drift.x) > abs(entity.drift.y) {
            entity.facing = entity.drift.x > 0 ? .right : .left
        } else {
            entity.facing = entity.drift.y > 0 ? .down : .up
        }

        move(entity, dx: entity.drift.x * speed * dt, dy: entity.drift.y * speed * dt)
        entity.anim += dt * (speed > 0 ? 4 : 1.4)

        if entity.knock.x != 0 || entity.knock.y != 0 {
            move(entity, dx: entity.knock.x * 0.5 * dt, dy: entity.knock.y * 0.5 * dt)
            entity.knock.x *= 0.78
            entity.knock.y *= 0.78
            if abs(entity.knock.x) < 4 { entity.knock.x = 0 }
            if abs(entity.knock.y) < 4 { entity.knock.y = 0 }
        }

        if distance < 14 + data.scale * 4, player.invulnerable <= 0, phase == .play {
            hurtPlayer(data.dmg, dx: dx, dy: dy, distance: distance)
        }
    }

    private func bossDefeated(_ entity: Entity) {
        guard let data = entity.boss else { return }
        boss = nil
        bossesBeaten += 1
        killsSinceBoss = 0
        shake = 6
        if player.maxHP < 14 { player.maxHP += 2 }
        player.hp = player.maxHP
        audio.play(.heal)
        audio.music(map.song)

        dialog.push(who: data.name + " besiegt!", color: Color(hex: 0xFFD24A), text: data.sieg)
        dialog.push(who: "Belohnung", color: Color(hex: 0xFFD24A),
                    text: "Du fuehlst dich staerker: ein Herz mehr - und alle Herzen wieder voll.")
        if let friend = party.randomElement(), let line = Chat.bossSieg.randomElement() {
            let person = Chat.person(friend.key)
            dialog.push(who: person.name, color: person.color, text: line)
        }
        dialog.start()
        showHint(String(data.name.split(separator: ",").first ?? "Boss") + " besiegt!")
    }

    // MARK: Begleiter

    private func updateCompanion(_ friend: Entity, _ dt: Double, index: Int) {
        friend.helperCooldown = max(0, friend.helperCooldown - dt)
        if friend.helperSwing > 0 { friend.helperSwing -= dt }

        let wanted = min(trail.count - 1, 18 + index * 15)
        if wanted >= 0, !trail.isEmpty {
            let target = trail[wanted]
            let dx = target.x - friend.pos.x
            let dy = target.y - friend.pos.y
            let distance = (dx * dx + dy * dy).squareRoot()
            if distance > 9 {
                let speed = min(GameWorld.walkSpeed * 1.05, 26 + distance * 3)
                move(friend, dx: dx / distance * speed * dt, dy: dy / distance * speed * dt)
                friend.moving = true
                if abs(dx) > abs(dy) {
                    friend.facing = dx > 0 ? .right : .left
                } else {
                    friend.facing = dy > 0 ? .down : .up
                }
            } else {
                friend.moving = false
            }
        }
        friend.anim += dt * (friend.moving ? 7 : 0)

        guard friend.helperCooldown <= 0 else { return }
        for zombie in entities where zombie.kind == .zombie && !zombie.isDying {
            if zombie.pos.distance(to: friend.pos) < 22 {
                friend.helperCooldown = 1.5
                friend.helperSwing = 0.25
                damage(zombie, from: friend.pos)
                return
            }
        }
    }

    private func updateNPC(_ npc: Entity, _ dt: Double) {
        guard npc.wanders else { return }
        npc.wanderTimer -= dt
        if npc.wanderTimer <= 0 {
            npc.wanderTimer = 1.5 + Double.random(in: 0...2.5)
            let roll = Double.random(in: 0...1)
            switch roll {
            case ..<0.25: npc.drift = Vec(x: -1, y: 0)
            case ..<0.5:  npc.drift = Vec(x: 1, y: 0)
            case ..<0.7:  npc.drift = Vec(x: 0, y: -1)
            case ..<0.9:  npc.drift = Vec(x: 0, y: 1)
            default:      npc.drift = .zero
            }
        }
        if npc.drift.x != 0 || npc.drift.y != 0 {
            move(npc, dx: npc.drift.x * 18 * dt, dy: npc.drift.y * 18 * dt)
            npc.moving = true
            if npc.drift.x != 0 {
                npc.facing = npc.drift.x > 0 ? .right : .left
            } else {
                npc.facing = npc.drift.y > 0 ? .down : .up
            }
        } else {
            npc.moving = false
        }
        npc.anim += dt * (npc.moving ? 6 : 0)
    }

    // MARK: Reden

    private func tryTalk() {
        var best: Entity?
        var bestDistance = 30.0
        for entity in entities {
            if entity === player { continue }
            let talkable = entity.kind == .npc || entity.kind == .friend
                || (entity.kind == .prop && (entity.key == "car" || entity.key == "sign"))
            guard talkable else { continue }
            let distance = entity.pos.distance(to: player.pos)
            if distance < bestDistance {
                bestDistance = distance
                best = entity
            }
        }
        guard let partner = best else { return }

        switch partner.kind {
        case .prop:
            if partner.key == "car" {
                talkToCar()
            } else if let text = partner.text {
                dialog.say(who: "Ein Blatt Papier", color: Color(hex: 0xE8E2C8), text: text)
            }
        case .npc:
            talkToNPC(partner)
        case .friend:
            talkToFriend(partner)
        default:
            break
        }
    }

    private func familyLine(_ key: String, _ index: Int) -> String {
        let lines = Chat.familyLines[key] ?? []
        guard !lines.isEmpty else { return "Schoen, dass du da bist!" }
        return lines[index % lines.count]
    }

    private func talkToNPC(_ npc: Entity) {
        let person = Chat.person(npc.key)
        switch npc.key {
        case "mama":
            dialog.push(who: person.name, color: person.color,
                        text: familyLine("mama", npc.timesTalked),
                        choices: [
                            DialogChoice("Ja bitte, einen Teller Eintopf!",
                                         reply: "Da, iss auf. So, jetzt bist du wieder ganz.",
                                         action: { [weak self] in self?.heal() }),
                            DialogChoice("Spaeter, ich muss los.",
                                         reply: "Dann pass auf dich auf, mein Ritter.")
                        ])
        case "papa":
            dialog.push(who: person.name, color: person.color,
                        text: familyLine("papa", npc.timesTalked),
                        choices: [
                            DialogChoice("Wollen wir in die Stadt fahren?",
                                         reply: "Gern! Der Wagen steht auf dem Weg draussen. Sag Bescheid."),
                            DialogChoice("Ich gehe erst noch in den Wald.",
                                         reply: "Halt das Schwert fest und den Kopf unten.")
                        ])
        case "mila":
            dialog.push(who: person.name, color: person.color,
                        text: familyLine("mila", npc.timesTalked),
                        choices: [
                            DialogChoice("Wenn du groesser bist, versprochen.",
                                         reply: "Das sagst du immer! Aber gut. Ich uebe schon mal."),
                            DialogChoice("In die Stadt darfst du mit.",
                                         reply: "JAAA! Ich hol meine Schuhe!")
                        ])
        default:
            dialog.push(who: person.name, color: person.color,
                        text: npc.line ?? "Schoenen Tag noch!")
        }
        npc.timesTalked += 1
        dialog.start()
    }

    private func heal() {
        player.hp = player.maxHP
        audio.play(.heal)
        showHint("Leben wieder voll!")
    }

    private func talkToFriend(_ friend: Entity) {
        let person = Chat.person(friend.key)
        if friend.waitsAtHome {
            dialog.push(who: "\(person.name) (\(person.rolle))", color: person.color,
                        text: "Na, brauchst du heute Begleitung im Wald?",
                        choices: [
                            DialogChoice("Ja, komm mit!",
                                         reply: "Endlich! Ich hol nur schnell meine Sachen.",
                                         action: { [weak self] in self?.join(friend) }),
                            DialogChoice("Diesmal gehe ich allein.",
                                         reply: "Alles klar. Ich pass hier auf das Haus auf.")
                        ])
            dialog.start()
            return
        }
        askQuestion(from: friend)
    }

    private func join(_ friend: Entity) {
        friend.waitsAtHome = false
        party.append(friend)
        if !partyKeys.contains(friend.key) { partyKeys.append(friend.key) }
        showHint("\(Chat.person(friend.key).kurz) kommt mit!")
    }

    private func setParty(_ keys: [String]) {
        partyKeys = keys
        entities.removeAll { $0.kind == .friend }
        party = []
        var spotIndex = 0
        for (index, key) in Chat.friendKeys.enumerated() {
            if keys.contains(key) {
                let friend = Entity(kind: .friend, key: key,
                                    pos: Vec(x: player.pos.x - 10 - Double(index) * 5,
                                             y: player.pos.y + 10 + Double(index) * 3))
                entities.append(friend)
                party.append(friend)
            } else if !map.friendSpots.isEmpty {
                let spot = map.friendSpots[spotIndex % map.friendSpots.count]
                spotIndex += 1
                let friend = Entity(kind: .friend, key: key,
                                    pos: Vec(x: spot.x * 16, y: spot.y * 16))
                friend.waitsAtHome = true
                entities.append(friend)
            }
        }
        showHint(keys.isEmpty ? "Du gehst allein" : "\(keys.count) Begleiter dabei")
    }

    /// Beim Verlassen des Hauses: Wer kommt mit?
    private func askWhoComesAlong() {
        let all = Chat.friendKeys
        dialog.push(who: "Vor der Tuer", color: Color(hex: 0xFFD24A),
                    text: "Die Sonne steht ueber den Eichen. Wer kommt heute mit in den Wald?",
                    choices: [
                        DialogChoice("Ich gehe allein.",
                                     reply: "Nur du, dein Schwert und der Wald.",
                                     action: { [weak self] in self?.setParty([]) }),
                        DialogChoice("Zwei Freunde sollen mit.",
                                     reply: "Zu dritt macht der Wald mehr Spass.",
                                     action: { [weak self] in
                                         self?.setParty(Array(all.shuffled().prefix(2)))
                                     }),
                        DialogChoice("Die ganze Truppe - alle vier!",
                                     reply: "Alle vier ziehen mit dir los!",
                                     action: { [weak self] in self?.setParty(all) }),
                        DialogChoice("Ueberrasch mich.",
                                     reply: "Der Wald entscheidet.",
                                     action: { [weak self] in
                                         let count = Int.random(in: 0...4)
                                         self?.setParty(Array(all.shuffled().prefix(count)))
                                     })
                    ])
        dialog.start()
    }

    // MARK: Automatisches Gequatsche

    private func updateChat(_ dt: Double) {
        guard !party.isEmpty, !dialog.isOpen, phase == .play else { return }
        if zombieNear(120) {
            chatTimer = 5
            return
        }
        chatTimer -= dt
        if chatTimer <= 0 {
            chatTimer = 20 + Double.random(in: 0...18)
            if let friend = party.randomElement() { askQuestion(from: friend) }
        }
    }

    private func askQuestion(from friend: Entity) {
        let person = Chat.person(friend.key)
        let pool = Chat.fragen[map.key] ?? Chat.fragen["wald"] ?? []
        guard let question = pool.randomElement() else { return }
        let choices = question.answers.map { answer in
            DialogChoice(answer.text, reply: answer.reply)
        }
        dialog.push(who: "\(person.name) (\(person.rolle))", color: person.color,
                    text: question.text, choices: choices)
        dialog.start()
        friend.mood += 1
    }

    private func sayKillLine() {
        guard !party.isEmpty, !dialog.isOpen else { return }
        if zombieNear(95) { return }
        if Double.random(in: 0...1) > 0.5 { return }
        guard let friend = party.randomElement(),
              let line = Chat.killLines.randomElement() else { return }
        let person = Chat.person(friend.key)
        dialog.push(who: person.name, color: person.color, text: line)
        dialog.start()
    }

    // MARK: Auto und Stadt

    private func talkToCar() {
        if map.key == "stadt" {
            dialog.push(who: "Das Auto", color: Color(hex: 0xE8A54A),
                        text: "Der Motor blubbert leise. Zurueck in den Wald?",
                        choices: [
                            DialogChoice("Ja, nach Hause.",
                                         reply: "Ihr steigt ein. Die Stadt wird klein im Rueckspiegel.",
                                         action: { [weak self] in self?.startDrive(to: "wald") }),
                            DialogChoice("Nein, ich schau mich noch um.",
                                         reply: "Das Auto wartet geduldig.")
                        ])
            dialog.start()
            return
        }
        dialog.push(who: "Das Auto", color: Color(hex: 0xE8A54A),
                    text: "Ein klappriger Wagen aus Holz und Blech. Ab in die Stadt?",
                    choices: [
                        DialogChoice("Ja - mit der ganzen Familie!",
                                     reply: "Mama, Papa und Mila springen rein. Es wird eng und laut.",
                                     action: { [weak self] in
                                         guard let self else { return }
                                         self.partyKeys = Chat.familyKeys
                                         self.startDrive(to: "stadt")
                                     }),
                        DialogChoice("Ja, nur wir.",
                                     reply: "Tuer zu, Motor an.",
                                     action: { [weak self] in self?.startDrive(to: "stadt") }),
                        DialogChoice("Lieber noch nicht.",
                                     reply: "Der Wagen bleibt stehen.")
                    ])
        dialog.start()
    }

    private func startDrive(to destination: String) {
        audio.play(.horn)
        phase = .drive
        drive = DriveState(t: 0, to: destination)
    }

    private func updateDrive(_ dt: Double) {
        guard var state = drive else { return }
        state.t += dt
        if input.took(.talk) || input.took(.attack) { state.t = max(state.t, 4.2) }
        drive = state
        guard state.t > 4.4 else { return }

        drive = nil
        phase = .play
        if state.to == "stadt" {
            loadMap("stadt", at: Vec(x: 26.5, y: 22))
            let mila = Chat.person("mila")
            dialog.say(who: mila.name, color: mila.color,
                       text: "Schau mal, so viele Haeuser! Und die riechen nach Brot!")
        } else {
            let withFamily = partyKeys.contains("mama")
            if withFamily { partyKeys = [] }
            loadMap("wald", at: Vec(x: 26.5, y: 18.5))
            if withFamily {
                dialog.say(who: "Zuhause", color: Color(hex: 0xFFD24A),
                           text: "Die Familie geht mit den Einkaeufen ins Haus. Du bleibst noch draussen.")
            }
        }
    }

    // MARK: Umfallen und Aufwachen

    private func gameOver() {
        phase = .over
        overTimer = 0
        audio.play(.dead)
    }

    private func updateGameOver(_ dt: Double) {
        overTimer += dt
        guard overTimer > 3 else { return }
        phase = .play
        player.hp = player.maxHP
        player.invulnerable = 1.5
        partyKeys = []
        loadMap("haus", at: Vec(x: 10.5, y: 9.5))
        let mama = Chat.person("mama")
        dialog.say(who: mama.name, color: mama.color,
                   text: "Du bist wach! Du hast uns vielleicht erschreckt. Erst Eintopf, dann Abenteuer.")
    }

    // MARK: Tippen auf den Bildschirm

    func handleTap(at point: CGPoint) {
        let x = (Double(point.x) - viewOffset.x) / max(0.0001, viewScale)
        let y = (Double(point.y) - viewOffset.y) / max(0.0001, viewScale)

        if dialog.isOpen {
            for hit in choiceHits {
                if x >= hit.x, x <= hit.x + hit.width, y >= hit.y, y <= hit.y + hit.height {
                    dialog.choose(hit.index)
                    return
                }
            }
            dialog.press()
            return
        }

        switch phase {
        case .title:
            startGame()
        case .drive:
            input.press(.talk)
            input.release(.talk)
        default:
            break
        }
    }

    // MARK: Für die Anzeige

    /// Alles, was gezeichnet wird – von hinten nach vorne sortiert.
    func drawOrder() -> [Entity] {
        entities.sorted { $0.pos.y < $1.pos.y }
    }

    var partyNames: String {
        party.map { Chat.person($0.key).kurz }.joined(separator: ", ")
    }
}
