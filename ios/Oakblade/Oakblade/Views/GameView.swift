//
//  GameView.swift
//  Zeichnet die ganze Welt in eine Canvas-Fläche: Karte, Figuren,
//  Schwertschlag, Herzen und die Textbox.
//

import SwiftUI

/// Hält Spielwelt und Ton zusammen, damit SwiftUI beides behalten kann.
final class GameSession: ObservableObject {
    let audio = ChipEngine()
    lazy var world: GameWorld = GameWorld(audio: audio)
    @Published var musicOn = false
    @Published var showControls = false

    /// Einmal beim Start verbinden: die Welt sagt Bescheid, wann die
    /// Lauf-Knöpfe gebraucht werden.
    func connect() {
        showControls = false
        world.onControlsChanged = { [weak self] visible in
            DispatchQueue.main.async { self?.showControls = visible }
        }
    }

    func toggleMusic() {
        audio.toggle()
        musicOn = audio.isOn
    }
}

struct GameView: View {

    @StateObject private var session = GameSession()

    private let gameWidth: Double = GameWorld.viewWidth
    private let gameHeight: Double = GameWorld.viewHeight

    var body: some View {
        ZStack {
            Color(hex: 0x07060C).ignoresSafeArea()

            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let world = session.world
                    world.advance(to: timeline.date)
                    draw(context, size: size, world: world)
                }
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onEnded { value in
                            session.world.handleTap(at: value.location)
                        }
                )
            }
            .ignoresSafeArea()

            if session.showControls {
                ControlsOverlay(world: session.world)
            }

            VStack {
                HStack {
                    Spacer()
                    Button {
                        session.toggleMusic()
                    } label: {
                        Image(systemName: session.musicOn ? "music.note" : "speaker.slash")
                            .font(.system(size: 15))
                            .frame(width: 38, height: 38)
                            .background(Color(hex: 0x14121C).opacity(0.9))
                            .foregroundColor(session.musicOn ? Color(hex: 0xFFD24A) : Color(hex: 0x6A6480))
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color(hex: 0x4A4560), lineWidth: 2))
                    }
                }
                Spacer()
            }
            .padding(12)
        }
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
        .onAppear { session.connect() }
        .focusable()
        .focusEffectDisabled()
        .onKeyPress(phases: [.down, .up]) { press in
            handleKey(press)
            return .handled
        }
    }

    // MARK: Tastatur (falls eine angeschlossen ist)

    private func handleKey(_ press: KeyPress) {
        let character = press.key.character
        var button: GameButton?
        switch character {
        case KeyEquivalent.upArrow.character, "w", "W":    button = .up
        case KeyEquivalent.downArrow.character, "s", "S":  button = .down
        case KeyEquivalent.leftArrow.character, "a", "A":  button = .left
        case KeyEquivalent.rightArrow.character, "d", "D": button = .right
        case " ", "x", "X", "j", "J":                      button = .attack
        case "\r", "\n", "e", "E", "z", "Z":               button = .talk
        default: button = nil
        }
        guard let button else { return }
        if press.phase == .down {
            session.world.input.press(button)
        } else {
            session.world.input.release(button)
        }
    }

    // MARK: Zeichnen

    private func draw(_ context: GraphicsContext, size: CGSize, world: GameWorld) {
        let viewWidth = Double(size.width)
        let viewHeight = Double(size.height)
        let scale = min(viewWidth / gameWidth, viewHeight / gameHeight)
        let offsetX = (viewWidth - gameWidth * scale) / 2
        let offsetY = (viewHeight - gameHeight * scale) / 2
        world.viewScale = scale
        world.viewOffset = Vec(x: offsetX, y: offsetY)

        var ctx = context
        ctx.translateBy(x: offsetX, y: offsetY)
        ctx.scaleBy(x: scale, y: scale)
        ctx.clip(to: Path(CGRect(x: 0, y: 0, width: gameWidth, height: gameHeight)))

        switch world.phase {
        case .title:
            drawTitle(ctx, world: world)
        case .drive:
            drawDrive(ctx, world: world)
        case .play, .over:
            drawWorld(ctx, world: world)
            drawHUD(ctx, world: world)
            if world.fade > 0 {
                ctx.fill(Path(CGRect(x: 0, y: 0, width: gameWidth, height: gameHeight)),
                         with: .color(.black.opacity(min(1, world.fade))))
            }
            if world.phase == .over { drawGameOver(ctx, world: world) }
        }

        drawDialog(ctx, world: world)
    }

    private func drawWorld(_ context: GraphicsContext, world: GameWorld) {
        var ctx = context
        if world.shake > 0 {
            ctx.translateBy(x: Double.random(in: -world.shake...world.shake),
                            y: Double.random(in: -world.shake...world.shake))
        }
        ctx.translateBy(x: -world.camera.x, y: -world.camera.y)

        ctx.draw(world.mapImage,
                 in: CGRect(x: 0, y: 0,
                            width: world.mapPixelWidth,
                            height: world.mapPixelHeight))

        for entity in world.drawOrder() {
            drawEntity(ctx, entity: entity, world: world)
        }

        if world.map.key == "haus" {
            // warmes Licht im Haus
            context.fill(Path(CGRect(x: 0, y: 0, width: gameWidth, height: gameHeight)),
                         with: .color(Color(hex: 0x3C1E0A).opacity(0.10)))
        }
    }

    private func drawEntity(_ ctx: GraphicsContext, entity: Entity, world: GameWorld) {
        let x = entity.pos.x
        let y = entity.pos.y

        // Was gar nicht zu sehen ist, wird auch nicht gezeichnet.
        let screenX = x - world.camera.x
        let screenY = y - world.camera.y
        if screenX < -60 || screenX > gameWidth + 60 || screenY < -60 || screenY > gameHeight + 60 {
            return
        }

        switch entity.kind {
        case .prop:
            guard let art = Art.shared.prop(entity.key) else { return }
            ctx.draw(art.image,
                     in: CGRect(x: x - art.width / 2, y: y - art.height,
                                width: art.width, height: art.height))

        case .zombie:
            if entity.boss != nil {
                drawBoss(ctx, entity: entity)
                return
            }
            let box = CGRect(x: x - 8, y: y - 16, width: 16, height: 16)
            if entity.isDying {
                let k = min(1.0, entity.dying / 0.5)
                var fading = ctx
                fading.opacity = 1 - k
                fading.draw(Art.shared.zombie.image(entity.facing, entity.frame),
                            in: CGRect(x: x - 8, y: y - 16 + k * 4, width: 16, height: 16))
                for i in 0..<10 {
                    let px = x - 8 + Double((i * 5) % 16)
                    let py = y - 16 + Double((i * 7) % 16) - k * 14
                    fading.fill(Path(CGRect(x: px, y: py, width: 2, height: 2)),
                                with: .color(Color(hex: 0x7AA85F)))
                }
                return
            }
            ctx.draw(Art.shared.zombie.image(entity.facing, entity.frame), in: box)
            if entity.flash > 0 {
                var flashing = ctx
                flashing.opacity = 0.9
                flashing.draw(Art.shared.zombieWhite.image(entity.facing, entity.frame), in: box)
            }
            if entity.hp < entity.maxHP {
                ctx.fill(Path(CGRect(x: x - 7, y: y - 20, width: 14, height: 3)),
                         with: .color(Color(hex: 0x1A1420)))
                let width = Double(entity.hp) / Double(max(1, entity.maxHP)) * 12
                ctx.fill(Path(CGRect(x: x - 6, y: y - 19, width: width, height: 1)),
                         with: .color(Color(hex: 0x8FD36A)))
            }

        case .npc, .friend:
            let person = Chat.person(entity.key)
            let frames = Art.shared.actor(entity.key, palette: person.palette)
            ctx.draw(frames.image(entity.facing, entity.frame),
                     in: CGRect(x: x - 8, y: y - 16, width: 16, height: 16))
            if entity.kind == .friend, entity.waitsAtHome {
                ctx.draw(Text("!")
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(hex: 0xFFD24A)),
                         at: CGPoint(x: x, y: y - 22))
            }
            if entity.helperSwing > 0 {
                var path = Path()
                path.addArc(center: CGPoint(x: x, y: y - 8), radius: 12,
                            startAngle: .degrees(-35), endAngle: .degrees(50), clockwise: false)
                ctx.stroke(path, with: .color(.white.opacity(0.8)), lineWidth: 2)
            }

        case .player:
            drawKnight(ctx, world: world)
        }
    }

    /// Bosse sind grösser und sehen jeder anders aus.
    private func drawBoss(_ ctx: GraphicsContext, entity: Entity) {
        guard let data = entity.boss else { return }
        let x = entity.pos.x, y = entity.pos.y

        var image: Image
        var whiteImage: Image
        var width = 16.0
        var height = 16.0
        switch data.art {
        case "spider":
            image = Art.shared.spider[entity.frame]
            whiteImage = Art.shared.spiderWhite[entity.frame]
            width = Art.spiderWidth
            height = Art.spiderHeight
        case "treant":
            image = Art.shared.treant
            whiteImage = Art.shared.treantWhite
            width = Art.treantWidth
            height = Art.treantHeight
        case "wolf":
            image = Art.shared.wolf().image(entity.facing, entity.frame)
            whiteImage = Art.shared.wolf(white: true).image(entity.facing, entity.frame)
        default:
            image = Art.shared.zombie.image(entity.facing, entity.frame)
            whiteImage = Art.shared.zombieWhite.image(entity.facing, entity.frame)
        }

        let drawWidth = width * data.scale
        let drawHeight = height * data.scale
        let left = x - drawWidth / 2
        let top = y - drawHeight

        // Wurzeln, die aus dem Boden schiessen
        if entity.rootsTimer > 0 {
            let grown = 1 - entity.rootsTimer / 0.75
            for i in 0..<10 {
                let angle = Double(i) * 0.628
                let radius = 14 + grown * 30
                let color = i % 2 == 0 ? Color(hex: 0x5F4026) : Color(hex: 0x3D2A18)
                ctx.fill(Path(CGRect(x: x + cos(angle) * radius - 2,
                                     y: y + sin(angle) * radius * 0.6 - 6,
                                     width: 4, height: 8)),
                         with: .color(color))
            }
        }

        if entity.isDying {
            let gone = min(1.0, entity.dying / 0.5)
            var fading = ctx
            fading.opacity = 1 - gone
            fading.draw(image, in: CGRect(x: left, y: top + gone * 6,
                                          width: drawWidth, height: drawHeight))
            return
        }

        ctx.draw(image, in: CGRect(x: left, y: top, width: drawWidth, height: drawHeight))

        if data.art == "zombie" {
            let crownWidth = Art.crownWidth * data.scale
            let crownHeight = Art.crownHeight * data.scale
            ctx.draw(Art.shared.crown,
                     in: CGRect(x: x - crownWidth / 2, y: top - crownHeight * 0.55,
                                width: crownWidth, height: crownHeight))
        }
        if entity.flash > 0 {
            var flashing = ctx
            flashing.opacity = 0.85
            flashing.draw(whiteImage, in: CGRect(x: left, y: top,
                                                 width: drawWidth, height: drawHeight))
        }
        if entity.raging {
            ctx.fill(Path(CGRect(x: left, y: top, width: drawWidth, height: drawHeight)),
                     with: .color(Color(hex: 0xE23A3A).opacity(0.25)))
        }
    }

    // MARK: Der Ritter mit seinem Schwert

    private func directionDegrees(_ facing: Facing) -> Double {
        switch facing {
        case .right: return 0
        case .down:  return 90
        case .left:  return 180
        case .up:    return 270
        }
    }

    private func handOffset(_ facing: Facing) -> (Double, Double) {
        switch facing {
        case .right: return (4, -9)
        case .left:  return (-4, -9)
        case .down:  return (5, -7)
        case .up:    return (-5, -10)
        }
    }

    private func swordAngle(_ player: Entity) -> Double {
        let base = directionDegrees(player.facing)
        guard let timer = player.attackTimer else {
            return base - 70 + (player.moving ? sin(player.anim * 2) * 5 : 0)
        }
        let k = min(1.0, timer / 0.28)
        // weich anfahren und weich abbremsen
        let eased = k < 0.5 ? 2 * k * k : 1 - pow(-2 * k + 2, 2) / 2
        return base - 105 + 150 * eased
    }

    private func drawSword(_ ctx: GraphicsContext, player: Entity) {
        let offset = handOffset(player.facing)
        let handX = player.pos.x + offset.0
        let handY = player.pos.y + offset.1
        let angle = swordAngle(player)

        if let timer = player.attackTimer, timer > 0.04, timer < 0.26 {
            let base = directionDegrees(player.facing)
            var arc = Path()
            arc.addArc(center: CGPoint(x: handX, y: handY), radius: 15,
                       startAngle: .degrees(base - 105), endAngle: .degrees(angle),
                       clockwise: false)
            ctx.stroke(arc, with: .color(.white.opacity(0.75)), lineWidth: 3)

            var outer = Path()
            outer.addArc(center: CGPoint(x: handX, y: handY), radius: 19,
                         startAngle: .degrees(base - 105), endAngle: .degrees(angle),
                         clockwise: false)
            ctx.stroke(outer, with: .color(Color(hex: 0xB4DCFF).opacity(0.5)), lineWidth: 1)
        }

        var blade = ctx
        blade.translateBy(x: handX, y: handY)
        blade.rotate(by: .degrees(angle + 90))
        blade.draw(Art.shared.sword,
                   in: CGRect(x: -2, y: -12,
                              width: Art.swordWidth, height: Art.swordHeight))
    }

    private func drawKnight(_ ctx: GraphicsContext, world: GameWorld) {
        let player = world.player
        var body = ctx
        let blinking = player.invulnerable > 0 && Int(player.invulnerable * 14) % 2 == 0
        if blinking { body.opacity = 0.35 }

        if player.facing == .up { drawSword(body, player: player) }
        body.draw(Art.shared.knight.image(player.facing, player.frame),
                  in: CGRect(x: player.pos.x - 8, y: player.pos.y - 16, width: 16, height: 16))
        if player.facing != .up { drawSword(body, player: player) }
    }

    // MARK: Anzeige oben

    private func drawHUD(_ ctx: GraphicsContext, world: GameWorld) {
        // Jedes Herz sind zwei Hälften.
        let hearts = Int(ceil(Double(world.player.maxHP) / 2.0))
        for i in 0..<hearts {
            let x = 6 + Double(i) * 9
            let rest = world.player.hp - i * 2
            var empty = ctx
            empty.opacity = 0.22
            empty.draw(Art.shared.heart,
                       in: CGRect(x: x, y: 6, width: Art.heartWidth, height: Art.heartHeight))
            if rest >= 2 {
                ctx.draw(Art.shared.heart,
                         in: CGRect(x: x, y: 6, width: Art.heartWidth, height: Art.heartHeight))
            } else if rest == 1 {
                ctx.draw(Art.shared.heartHalf,
                         in: CGRect(x: x, y: 6, width: 4, height: Art.heartHeight))
            }
        }
        ctx.draw(smallText("HP \(world.player.hp)/\(world.player.maxHP)", color: .white),
                 at: CGPoint(x: 10 + Double(hearts) * 9, y: 6), anchor: .topLeading)

        // Lebensbalken des Bosses
        if let boss = world.boss, let data = boss.boss, !boss.isDying {
            let barWidth = 176.0
            let barX = (gameWidth - barWidth) / 2
            let barY = 32.0
            ctx.draw(smallText(data.name.uppercased(), color: Color(hex: 0xFF9A8A)),
                     at: CGPoint(x: gameWidth / 2, y: 24), anchor: .top)
            ctx.fill(Path(CGRect(x: barX - 1, y: barY, width: barWidth + 2, height: 7)),
                     with: .color(Color(hex: 0x1A1420)))
            ctx.fill(Path(CGRect(x: barX, y: barY + 1, width: barWidth, height: 5)),
                     with: .color(Color(hex: 0x3B2028)))
            let share = Double(max(0, boss.hp)) / Double(max(1, boss.maxHP))
            ctx.fill(Path(CGRect(x: barX, y: barY + 1, width: barWidth * share, height: 5)),
                     with: .color(Color(hex: 0xE03A3A)))
            ctx.fill(Path(CGRect(x: barX, y: barY + 1, width: barWidth * share, height: 2)),
                     with: .color(Color(hex: 0xFF9A8A)))
        }
        ctx.draw(smallText("Zombies: \(world.kills)", color: Color(hex: 0x8FD36A)),
                 at: CGPoint(x: gameWidth - 6, y: 16), anchor: .topTrailing)

        if !world.party.isEmpty {
            ctx.draw(smallText("Dabei: " + world.partyNames, color: Color(hex: 0xC8C2E0)),
                     at: CGPoint(x: 6, y: 16), anchor: .topLeading)
        }

        if world.hintTimer > 0 {
            var box = ctx
            box.opacity = min(1, world.hintTimer)
            let width = Double(world.hint.count) * 6 + 18
            drawFrame(box, x: (gameWidth - width) / 2, y: 30, width: width, height: 18)
            box.draw(Text(world.hint)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(.white),
                     at: CGPoint(x: gameWidth / 2, y: 39))
        }
    }

    private func smallText(_ string: String, color: Color) -> Text {
        Text(string)
            .font(.system(size: 8, design: .monospaced))
            .foregroundColor(color)
    }

    /// Schwarzer Kasten mit weißem Rand – wie in Undertale.
    private func drawFrame(_ ctx: GraphicsContext, x: Double, y: Double,
                           width: Double, height: Double) {
        ctx.fill(Path(CGRect(x: x, y: y, width: width, height: height)), with: .color(.black))
        let white = GraphicsContext.Shading.color(.white)
        ctx.fill(Path(CGRect(x: x, y: y, width: width, height: 2)), with: white)
        ctx.fill(Path(CGRect(x: x, y: y + height - 2, width: width, height: 2)), with: white)
        ctx.fill(Path(CGRect(x: x, y: y, width: 2, height: height)), with: white)
        ctx.fill(Path(CGRect(x: x + width - 2, y: y, width: 2, height: height)), with: white)
    }

    // MARK: Textbox

    private func drawDialog(_ ctx: GraphicsContext, world: GameWorld) {
        world.choiceHits = []
        guard let node = world.dialog.current else { return }

        let boxX = 6.0, boxWidth = gameWidth - 12
        let lines = wrap(world.dialog.visibleText, limit: 45)
        let choices = world.dialog.visibleChoices
        let height = max(62, 26 + Double(lines.count) * 13 + Double(choices.count) * 13)
        let boxY = gameHeight - height - 6

        drawFrame(ctx, x: boxX, y: boxY, width: boxWidth, height: height)

        ctx.draw(smallText(node.who.uppercased(), color: node.color),
                 at: CGPoint(x: boxX + 7, y: boxY + 6), anchor: .topLeading)

        for (index, line) in lines.enumerated() {
            ctx.draw(Text(line)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(.white),
                     at: CGPoint(x: boxX + 7, y: boxY + 18 + Double(index) * 13),
                     anchor: .topLeading)
        }

        let choiceTop = boxY + 18 + Double(lines.count) * 13
        for (index, choice) in choices.enumerated() {
            let y = choiceTop + Double(index) * 13
            let selected = index == world.dialog.selected
            if selected {
                ctx.draw(Text("♥")
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundColor(Color(hex: 0xFF5A5A)),
                         at: CGPoint(x: boxX + 8, y: y), anchor: .topLeading)
            }
            ctx.draw(Text(choice.text)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(selected ? .white : Color(hex: 0xDCDCDC)),
                     at: CGPoint(x: boxX + 19, y: y), anchor: .topLeading)
            world.choiceHits.append(ChoiceHit(index: index, x: boxX, y: y - 2,
                                              width: boxWidth, height: 14))
        }

        if choices.isEmpty, !world.dialog.isTyping {
            ctx.draw(Text("▼")
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundColor(.white.opacity(Int(world.time * 2) % 2 == 0 ? 1 : 0.25)),
                     at: CGPoint(x: boxX + boxWidth - 10, y: boxY + height - 12),
                     anchor: .topLeading)
        }
    }

    /// Text auf Zeilen verteilen, ohne Wörter zu zerschneiden.
    private func wrap(_ text: String, limit: Int) -> [String] {
        var lines: [String] = []
        var line = ""
        for word in text.split(separator: " ", omittingEmptySubsequences: false) {
            let candidate = line.isEmpty ? String(word) : line + " " + word
            if candidate.count > limit, !line.isEmpty {
                lines.append(line)
                line = String(word)
            } else {
                line = candidate
            }
        }
        if !line.isEmpty || lines.isEmpty { lines.append(line) }
        return lines
    }

    // MARK: Titelbild

    private func drawTitle(_ ctx: GraphicsContext, world: GameWorld) {
        ctx.fill(Path(CGRect(x: 0, y: 0, width: gameWidth, height: gameHeight)),
                 with: .color(Color(hex: 0x08070E)))

        var seed = Rand(12_345)
        for i in 0..<40 {
            let x = seed.next() * gameWidth
            let y = seed.next() * 110
            ctx.fill(Path(CGRect(x: x, y: y, width: 1, height: 1)),
                     with: .color(i % 5 == 0 ? Color(hex: 0xFFD24A) : Color(hex: 0x4A4560)))
        }

        if let pine = Art.shared.prop("pine") {
            for i in 0..<8 {
                ctx.draw(pine.image, in: CGRect(x: Double(i) * 42 - 6, y: 96,
                                                width: pine.width, height: pine.height))
            }
        }
        ctx.fill(Path(CGRect(x: 0, y: 130, width: gameWidth, height: gameHeight - 130)),
                 with: .color(Color(hex: 0x111019)))

        var hero = ctx
        hero.translateBy(x: gameWidth / 2, y: 150)
        hero.scaleBy(x: 3, y: 3)
        hero.draw(Art.shared.knight.image(.down, Int(world.time * 2)),
                  in: CGRect(x: -8, y: -16, width: 16, height: 16))

        var blade = ctx
        blade.translateBy(x: gameWidth / 2 + 13, y: 126)
        blade.scaleBy(x: 3, y: 3)
        blade.rotate(by: .degrees(20))
        blade.draw(Art.shared.sword, in: CGRect(x: -2, y: -12, width: 5, height: 14))

        ctx.draw(Text("OAKBLADE")
                    .font(.system(size: 32, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(hex: 0xFFD24A)),
                 at: CGPoint(x: gameWidth / 2, y: 44))
        ctx.draw(Text("ein Pixel-Abenteuer mit Familie, Freunden")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundColor(Color(hex: 0x8FD36A)),
                 at: CGPoint(x: gameWidth / 2, y: 76))
        ctx.draw(Text("und viel zu vielen Zombies")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundColor(Color(hex: 0x8FD36A)),
                 at: CGPoint(x: gameWidth / 2, y: 88))

        let blink = Int(world.time * 1.6) % 2 == 0
        ctx.draw(Text("Tippen zum Starten")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(blink ? .white : Color(hex: 0x7A748F)),
                 at: CGPoint(x: gameWidth / 2, y: 204))
        ctx.draw(Text("Steuerkreuz laufen   Schwert schlagen   E reden")
                    .font(.system(size: 8, design: .monospaced))
                    .foregroundColor(Color(hex: 0x6A6480)),
                 at: CGPoint(x: gameWidth / 2, y: 224))
    }

    // MARK: Autofahrt

    private func drawDrive(_ ctx: GraphicsContext, world: GameWorld) {
        let t = world.drive?.t ?? 0
        let toCity = world.drive?.to == "stadt"

        let sky = Gradient(colors: [Color(hex: 0x2B3F6B), Color(hex: 0xC9713F)])
        ctx.fill(Path(CGRect(x: 0, y: 0, width: gameWidth, height: 120)),
                 with: .linearGradient(sky,
                                       startPoint: CGPoint(x: 0, y: 0),
                                       endPoint: CGPoint(x: 0, y: 120)))
        ctx.fill(Path(CGRect(x: 240, y: 30, width: 18, height: 18)),
                 with: .color(Color(hex: 0xF0D24A)))

        for i in 0..<7 {
            let raw = (Double(i) * 60 - t * 26).truncatingRemainder(dividingBy: 400)
            let x = (raw < 0 ? raw + 400 : raw) - 40
            ctx.fill(Path(ellipseIn: CGRect(x: x - 34, y: 92, width: 68, height: 68)),
                     with: .color(Color(hex: 0x2C4A2E)))
        }
        ctx.fill(Path(CGRect(x: 0, y: 118, width: gameWidth, height: 14)),
                 with: .color(Color(hex: 0x3A5A3C)))
        ctx.fill(Path(CGRect(x: 0, y: 130, width: gameWidth, height: 110)),
                 with: .color(Color(hex: 0x434350)))

        for i in 0..<9 {
            let raw = (Double(i) * 46 - t * 150).truncatingRemainder(dividingBy: 420)
            let x = (raw < 0 ? raw + 420 : raw) - 50
            ctx.fill(Path(CGRect(x: x, y: 196, width: 26, height: 5)),
                     with: .color(Color(hex: 0xD8CF8A)))
        }

        if let car = Art.shared.prop("car") {
            let bump: Double = sin(t * 18) > 0 ? 0 : 1
            ctx.draw(car.image, in: CGRect(x: 110, y: 148 + bump,
                                           width: car.width * 2, height: car.height * 2))
        }

        for i in 0..<6 {
            let x = 104 - (t * 90 + Double(i) * 23).truncatingRemainder(dividingBy: 110)
            ctx.fill(Path(CGRect(x: x, y: 186 + Double(i % 3) * 4, width: 3, height: 3)),
                     with: .color(Color(hex: 0xC8BEAA).opacity(0.5)))
        }

        let title = toCity ? "Unterwegs nach Eichenstadt..." : "Zurueck zum Eichenwald..."
        let width = Double(title.count) * 6 + 20
        drawFrame(ctx, x: (gameWidth - width) / 2, y: 8, width: width, height: 22)
        ctx.draw(Text(title)
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.white),
                 at: CGPoint(x: gameWidth / 2, y: 19))
        ctx.draw(Text("Tippen zum Ueberspringen")
                    .font(.system(size: 8, design: .monospaced))
                    .foregroundColor(Color(hex: 0xCFC9E6)),
                 at: CGPoint(x: gameWidth / 2, y: 230))
    }

    // MARK: Umgefallen

    private func drawGameOver(_ ctx: GraphicsContext, world: GameWorld) {
        ctx.fill(Path(CGRect(x: 0, y: 0, width: gameWidth, height: gameHeight)),
                 with: .color(.black.opacity(min(0.9, world.overTimer))))
        guard world.overTimer > 0.4 else { return }
        ctx.draw(Text("DU BIST UMGEFALLEN")
                    .font(.system(size: 16, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(hex: 0xE03A3A)),
                 at: CGPoint(x: gameWidth / 2, y: 100))
        ctx.draw(Text("Die Zombies waren zu viele.")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.white),
                 at: CGPoint(x: gameWidth / 2, y: 122))
        ctx.draw(Text("Deine Familie traegt dich nach Hause...")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.white),
                 at: CGPoint(x: gameWidth / 2, y: 136))
    }
}

#Preview {
    GameView()
}
