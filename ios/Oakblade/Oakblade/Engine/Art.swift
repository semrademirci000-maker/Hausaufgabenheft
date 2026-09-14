//
//  Art.swift
//  Alle Grafiken des Spiels: Ritter, Schwert, Leute, Zombies, Bäume,
//  Kacheln, Auto … Alles wird beim Start einmal Pixel für Pixel gemalt.
//

import CoreGraphics
import SwiftUI

enum Facing {
    case down, up, left, right
}

/// Farben einer Person – damit sehen alle Leute unterschiedlich aus.
struct ActorPalette {
    var hair: UInt32 = 0x6B4A2B
    var skin: UInt32 = 0xF0C191
    var eye: UInt32 = 0x1B1430
    var shirt: UInt32 = 0xC4553F
    var shirtDark: UInt32 = 0x9C3F2F
    var pants: UInt32 = 0x3B4A6B
    var boots: UInt32 = 0x4A3524
}

/// Die vier Blickrichtungen mit je zwei Laufbildern.
struct ActorFrames {
    let down: [Image]
    let up: [Image]
    let left: [Image]
    let right: [Image]

    func image(_ facing: Facing, _ frame: Int) -> Image {
        let list: [Image]
        switch facing {
        case .down:  list = down
        case .up:    list = up
        case .left:  list = left
        case .right: list = right
        }
        return list[abs(frame) % list.count]
    }
}

struct PropArt {
    let image: Image
    let width: Double
    let height: Double
}

final class Art {

    static let shared = Art()

    let knight: ActorFrames
    let zombie: ActorFrames
    let zombieWhite: ActorFrames
    let sword: Image
    let heart: Image
    let heartHalf: Image
    let spider: [Image]
    let spiderWhite: [Image]
    let crown: Image
    let treant: Image
    let treantWhite: Image
    let props: [String: PropArt]
    let tiles: [Character: PixelImage]

    /// 16 x 16 – so groß ist jede Figur und jede Kachel.
    static let unit: Double = 16
    static let swordWidth: Double = 5
    static let swordHeight: Double = 14
    static let heartWidth: Double = 7
    static let heartHeight: Double = 6

    private var actorCache: [String: ActorFrames] = [:]

    private init() {
        knight = Art.buildKnight()

        let zombiePixels = Art.actorPixels(palette: Chat.zombiePalette, zombie: true)
        zombie = Art.frames(from: zombiePixels, white: false)
        zombieWhite = Art.frames(from: zombiePixels, white: true)

        sword = Art.image(PixelImage.from(rows: SpriteRows.sword, palette: [
            "w": RGBA(0xEEF3FB), "g": RGBA(0xAAB6C8), "h": RGBA(0xD8A43A), "n": RGBA(0x6B4A2B)
        ]))
        let heartRows = [
            ".rr.rr.",
            "rrrrrrr",
            "rrrrrrr",
            ".rrrrr.",
            "..rrr..",
            "...r..."
        ]
        let heartPalette: [Character: RGBA] = ["r": RGBA(0xE03A3A)]
        heart = Art.image(PixelImage.from(rows: heartRows, palette: heartPalette))
        // Die linke Hälfte ist das halbe Herz.
        heartHalf = Art.image(PixelImage.from(rows: heartRows.map { String($0.prefix(4)) },
                                              palette: heartPalette))
        let spiderPixels = [Art.makeSpider(0), Art.makeSpider(1)]
        spider = spiderPixels.map { Art.image($0) }
        spiderWhite = spiderPixels.map { Art.image($0.whiteCopy()) }
        crown = Art.image(Art.makeCrown())
        let treantPixels = Art.makeTreant()
        treant = Art.image(treantPixels)
        treantWhite = Art.image(treantPixels.whiteCopy())

        props = Art.buildProps()
        tiles = Art.buildTiles()
    }

    /// Laufbilder einer Person – wird je Person nur einmal gebaut.
    func actor(_ key: String, palette: ActorPalette) -> ActorFrames {
        if let cached = actorCache[key] { return cached }
        let made = Art.frames(from: Art.actorPixels(palette: palette, zombie: false), white: false)
        actorCache[key] = made
        return made
    }

    func prop(_ kind: String) -> PropArt? { props[kind] }

    /// Der Werwolf: die Menschen-Vorlage in Fellfarben, mit spitzen Ohren.
    private var wolfFrames: ActorFrames?
    private var wolfWhiteFrames: ActorFrames?

    func wolf(white: Bool = false) -> ActorFrames {
        if white, let ready = wolfWhiteFrames { return ready }
        if !white, let ready = wolfFrames { return ready }
        let palette = ActorPalette(hair: 0x4A4550, skin: 0x6B6472, eye: 0xD24B4B,
                                   shirt: 0x3B3644, shirtDark: 0x2A2632,
                                   pants: 0x241F2C, boots: 0x17131F)
        let pixels = Art.actorPixels(palette: palette, zombie: false)
        let ears = RGBA(0x4A4550)
        let down = pixels.down.map { Art.withEars($0, ears) }
        let up = pixels.up.map { Art.withEars($0, ears) }
        let side = pixels.side.map { Art.withEars($0, ears) }
        func finish(_ p: PixelImage) -> Image { Art.image(white ? p.whiteCopy() : p) }
        let made = ActorFrames(
            down: down.map(finish),
            up: up.map(finish),
            left: side.map { finish($0.flippedHorizontally()) },
            right: side.map(finish)
        )
        if white { wolfWhiteFrames = made } else { wolfFrames = made }
        return made
    }

    /// Größe der Boss-Bilder (für das Zeichnen).
    static let spiderWidth: Double = 30
    static let spiderHeight: Double = 22
    static let treantWidth: Double = 34
    static let treantHeight: Double = 42
    static let crownWidth: Double = 12
    static let crownHeight: Double = 7

    // MARK: - Hilfsmittel

    private static func image(_ pixels: PixelImage) -> Image {
        Image(decorative: pixels.cgImage(), scale: 1)
            .interpolation(.none)
            .antialiased(false)
    }

    private struct ActorPixels {
        let down: [PixelImage]
        let up: [PixelImage]
        let side: [PixelImage]
    }

    private static func actorPixels(palette: ActorPalette, zombie: Bool) -> ActorPixels {
        let pal: [Character: RGBA] = [
            "o": RGBA(0x191324),
            "E": RGBA(palette.eye),
            "S": RGBA(palette.skin),
            "H": RGBA(palette.hair),
            "C": RGBA(palette.shirt),
            "c": RGBA(palette.shirtDark),
            "P": RGBA(palette.pants),
            "B": RGBA(palette.boots),
            "k": RGBA(0x2A1420)
        ]
        let downRows = zombie ? [SpriteRows.zombieDown, SpriteRows.zombieDown2]
                              : [SpriteRows.personDown, SpriteRows.personDown2]
        let sideRows = zombie ? [SpriteRows.zombieSide, SpriteRows.zombieSide2]
                              : [SpriteRows.personSide, SpriteRows.personSide2]
        let upRows = [SpriteRows.personUp, SpriteRows.personUp2]
        return ActorPixels(
            down: downRows.map { PixelImage.from(rows: $0, palette: pal) },
            up:   upRows.map   { PixelImage.from(rows: $0, palette: pal) },
            side: sideRows.map { PixelImage.from(rows: $0, palette: pal) }
        )
    }

    private static func frames(from pixels: ActorPixels, white: Bool) -> ActorFrames {
        func done(_ p: PixelImage) -> Image { image(white ? p.whiteCopy() : p) }
        return ActorFrames(
            down: pixels.down.map(done),
            up: pixels.up.map(done),
            left: pixels.side.map { done($0.flippedHorizontally()) },
            right: pixels.side.map(done)
        )
    }

    private static func buildKnight() -> ActorFrames {
        let pal: [Character: RGBA] = [
            "o": RGBA(0x191324), "a": RGBA(0xD3DBE8), "b": RGBA(0x9AA4B8), "c": RGBA(0x646E82),
            "t": RGBA(0x3D6FB5), "u": RGBA(0x2B4F83), "s": RGBA(0xF0C191), "r": RGBA(0xD2453F),
            "k": RGBA(0x140F1E), "n": RGBA(0x6B4A2B)
        ]
        let side = [SpriteRows.knightSide, SpriteRows.knightSide2]
            .map { PixelImage.from(rows: $0, palette: pal) }
        return ActorFrames(
            down: [SpriteRows.knightDown, SpriteRows.knightDown2]
                .map { image(PixelImage.from(rows: $0, palette: pal)) },
            up: [SpriteRows.knightUp, SpriteRows.knightUp2]
                .map { image(PixelImage.from(rows: $0, palette: pal)) },
            left: side.map { image($0.flippedHorizontally()) },
            right: side.map { image($0) }
        )
    }

    // MARK: - Bäume, Auto und anderes Zeug

    private static func buildProps() -> [String: PropArt] {
        var out: [String: PropArt] = [:]
        func add(_ name: String, _ p: PixelImage) {
            out[name] = PropArt(image: image(p),
                                width: Double(p.width), height: Double(p.height))
        }
        add("tree", makeTree())
        add("pine", makePine())
        add("bush", makeBush())
        add("rock", makeRock())
        add("lamp", makeLamp())
        add("sign", makeSign())
        add("car", makeCar())
        add("fountain", makeFountain())
        add("bench", makeBench())
        return out
    }

    private static func makeTree() -> PixelImage {
        let p = PixelImage(30, 38)
        var r = Rand(7)
        p.fill(12, 22, 7, 15, RGBA(0x3D2A18))
        p.fill(13, 22, 4, 15, RGBA(0x5F4026))
        p.fill(14, 24, 1, 11, RGBA(0x78542F))
        p.circle(15, 18, 13, RGBA(0x1F4A26))
        p.circle(13, 14, 12, RGBA(0x2D6A33))
        p.circle(18, 13, 10, RGBA(0x3C8440))
        p.circle(12, 10, 7, RGBA(0x4F9C4C))
        for _ in 0..<26 {
            let color = r.chance(0.5) ? RGBA(0x1F4A26) : RGBA(0x58A552)
            p.set(3 + r.int(24), 3 + r.int(24), color)
        }
        return p
    }

    private static func makePine() -> PixelImage {
        let p = PixelImage(26, 38)
        p.fill(11, 28, 5, 9, RGBA(0x3D2A18))
        for i in 0..<4 {
            let w = 20 - i * 3
            let y = 26 - i * 7
            p.fill(13 - w / 2, y, w, 7, RGBA(0x1D4526))
            p.fill(13 - w / 2 + 1, y, w - 2, 5, RGBA(0x2F6B34))
            p.fill(13 - w / 2 + 2, y, w - 5, 2, RGBA(0x3F8A41))
        }
        return p
    }

    private static func makeBush() -> PixelImage {
        let p = PixelImage(18, 16)
        var r = Rand(21)
        p.circle(6, 9, 6, RGBA(0x24582A))
        p.circle(12, 9, 6, RGBA(0x24582A))
        p.circle(6, 8, 5, RGBA(0x357A39))
        p.circle(12, 8, 5, RGBA(0x357A39))
        p.circle(8, 6, 3, RGBA(0x4B9B4A))
        for _ in 0..<8 {
            if r.chance(0.5) { p.set(2 + r.int(14), 3 + r.int(9), RGBA(0xD24B4B)) }
        }
        return p
    }

    private static func makeRock() -> PixelImage {
        let p = PixelImage(16, 14)
        p.circle(8, 9, 6, RGBA(0x5B606B))
        p.circle(7, 8, 5, RGBA(0x7D838F))
        p.circle(6, 7, 3, RGBA(0x9AA1AC))
        return p
    }

    private static func makeLamp() -> PixelImage {
        let p = PixelImage(10, 34)
        p.fill(4, 6, 3, 27, RGBA(0x2A2A33))
        p.fill(2, 31, 7, 3, RGBA(0x2A2A33))
        p.fill(5, 8, 1, 23, RGBA(0x4A4A58))
        p.fill(2, 2, 7, 6, RGBA(0x2A2A33))
        p.fill(3, 3, 5, 4, RGBA(0xFFE08A))
        p.fill(4, 4, 3, 2, RGBA(0xFFF6CF))
        return p
    }

    /// Das Schild an der Stadt: ein Blatt Papier auf zwei Pfosten.
    private static func makeSign() -> PixelImage {
        let p = PixelImage(26, 30)
        p.fill(3, 16, 3, 14, RGBA(0x5B3D22))
        p.fill(20, 16, 3, 14, RGBA(0x5B3D22))
        p.fill(1, 2, 24, 16, RGBA(0xEFE6CF))
        p.fill(1, 2, 24, 1, RGBA(0xCDC2A6))
        p.fill(1, 17, 24, 1, RGBA(0xCDC2A6))
        p.fill(1, 2, 1, 16, RGBA(0x7A6A4A))
        p.fill(24, 2, 1, 16, RGBA(0x7A6A4A))
        let lines = [(4, 6, 18), (4, 9, 14), (4, 12, 17)]
        for line in lines {
            for x in stride(from: 0, to: line.2, by: 2) {
                p.set(line.0 + x, line.1, RGBA(0x3A3020))
            }
        }
        return p
    }

    private static func makeCar() -> PixelImage {
        let p = PixelImage(40, 24)
        p.fill(1, 6, 38, 13, RGBA(0x191324))
        p.fill(2, 9, 36, 9, RGBA(0xB8342F))
        p.fill(2, 9, 36, 3, RGBA(0xD9534A))
        p.fill(2, 16, 36, 2, RGBA(0x8C231F))
        p.fill(8, 2, 22, 8, RGBA(0x191324))
        p.fill(10, 4, 8, 5, RGBA(0x9FD6EC))
        p.fill(20, 4, 8, 5, RGBA(0x9FD6EC))
        p.fill(10, 4, 8, 2, RGBA(0xD8F0FB))
        p.fill(20, 4, 8, 2, RGBA(0xD8F0FB))
        p.fill(37, 11, 2, 3, RGBA(0xFFE08A))
        p.fill(1, 11, 2, 3, RGBA(0xFF6B5A))
        p.fill(5, 17, 10, 6, RGBA(0x191324))
        p.fill(25, 17, 10, 6, RGBA(0x191324))
        p.fill(7, 18, 6, 4, RGBA(0x3B3B46))
        p.fill(27, 18, 6, 4, RGBA(0x3B3B46))
        p.fill(9, 19, 2, 2, RGBA(0x8A8A98))
        p.fill(29, 19, 2, 2, RGBA(0x8A8A98))
        return p
    }

    private static func makeFountain() -> PixelImage {
        let p = PixelImage(32, 28)
        p.fill(2, 8, 28, 18, RGBA(0x6E6A76))
        p.fill(2, 8, 28, 3, RGBA(0x8A8694))
        p.fill(5, 11, 22, 12, RGBA(0x4F7FC4))
        p.fill(6, 12, 20, 4, RGBA(0x7FB6E2))
        p.fill(13, 2, 6, 12, RGBA(0x8A8694))
        p.fill(14, 2, 2, 12, RGBA(0xA9A5B2))
        p.fill(12, 1, 8, 2, RGBA(0xC6ECF8))
        p.fill(10, 4, 2, 5, RGBA(0x9FD6EC))
        p.fill(20, 4, 2, 5, RGBA(0x9FD6EC))
        p.fill(1, 25, 30, 2, RGBA(0x5B5766))
        return p
    }

    /// Waldspinne: dicker Leib, acht Beine, rote Augen.
    private static func makeSpider(_ step: Int) -> PixelImage {
        let p = PixelImage(30, 22)
        let lift = step == 1 ? 1 : 0
        let legs: [(Int, Int, Int, Int)] = [
            (11, 12, 2, 6), (11, 13, 5, 9), (19, 12, 28, 6), (19, 13, 25, 9)
        ]
        for (index, leg) in legs.enumerated() {
            let wobble = index % 2 == 0 ? -lift : lift
            let x0 = leg.0, y0 = leg.1 + wobble
            let x1 = leg.2, y1 = leg.3 - wobble
            let steps = max(abs(x1 - x0), abs(y1 - y0))
            for t in 0...max(1, steps) {
                let f = Double(t) / Double(max(1, steps))
                let x = x0 + Int((Double(x1 - x0) * f).rounded())
                let y = y0 + Int((Double(y1 - y0) * f).rounded())
                p.fill(x, y, 2, 2, RGBA(0x241A2E))
            }
        }
        p.circle(15, 14, 7, RGBA(0x2E2140))
        p.circle(15, 13, 6, RGBA(0x3F2C57))
        p.circle(15, 8, 5, RGBA(0x241A2E))
        p.circle(15, 7, 4, RGBA(0x4A3568))
        p.fill(12, 6, 2, 2, RGBA(0xD24B4B))
        p.fill(17, 6, 2, 2, RGBA(0xD24B4B))
        p.set(12, 6, RGBA(0xFF9A8A))
        p.set(17, 6, RGBA(0xFF9A8A))
        p.fill(13, 12, 4, 2, RGBA(0x6B4F8A))
        p.fill(14, 16, 3, 2, RGBA(0x6B4F8A))
        return p
    }

    /// Krone für den Zombiekönig.
    private static func makeCrown() -> PixelImage {
        let p = PixelImage(12, 7)
        p.fill(0, 4, 12, 3, RGBA(0x8A6A1A))
        p.fill(0, 3, 12, 2, RGBA(0xFFD24A))
        p.fill(0, 0, 2, 4, RGBA(0xFFD24A))
        p.fill(5, 0, 2, 4, RGBA(0xFFD24A))
        p.fill(10, 0, 2, 4, RGBA(0xFFD24A))
        p.fill(0, 0, 1, 2, RGBA(0xFFF0B4))
        p.fill(5, 0, 1, 2, RGBA(0xFFF0B4))
        p.fill(10, 0, 1, 2, RGBA(0xFFF0B4))
        p.fill(5, 4, 2, 2, RGBA(0xD24B4B))
        return p
    }

    /// Spitze Ohren obendrauf – aus einer Person wird ein Werwolf.
    private static func withEars(_ source: PixelImage, _ color: RGBA) -> PixelImage {
        let p = PixelImage(source.width, source.height)
        p.blit(source, 0, 0)
        p.fill(3, 0, 3, 3, color)
        p.fill(4, 0, 2, 4, color)
        p.fill(10, 0, 3, 3, color)
        p.fill(10, 0, 2, 4, color)
        p.fill(3, 0, 1, 3, RGBA(0x1B1524))
        p.fill(12, 0, 1, 3, RGBA(0x1B1524))
        return p
    }

    /// Baumgeist: ein Baum, der die Augen aufmacht.
    private static func makeTreant() -> PixelImage {
        let p = PixelImage(34, 42)
        var r = Rand(99)
        p.fill(13, 22, 9, 19, RGBA(0x3D2A18))
        p.fill(14, 22, 6, 19, RGBA(0x5F4026))
        p.fill(6, 30, 8, 3, RGBA(0x3D2A18))
        p.fill(21, 32, 8, 3, RGBA(0x3D2A18))
        p.circle(17, 17, 14, RGBA(0x1D3A22))
        p.circle(14, 13, 12, RGBA(0x28572F))
        p.circle(21, 12, 10, RGBA(0x35703A))
        for _ in 0..<20 {
            let color = r.chance(0.5) ? RGBA(0x16301C) : RGBA(0x47934A)
            p.set(4 + r.int(26), 3 + r.int(24), color)
        }
        p.fill(14, 26, 7, 8, RGBA(0x1B1008))
        p.fill(14, 27, 2, 3, RGBA(0xFFD24A))
        p.fill(19, 27, 2, 3, RGBA(0xFFD24A))
        p.set(14, 27, RGBA(0xFFF0B4))
        p.set(19, 27, RGBA(0xFFF0B4))
        p.fill(15, 31, 5, 2, RGBA(0x2A1A10))
        return p
    }

    private static func makeBench() -> PixelImage {
        let p = PixelImage(20, 14)
        p.fill(1, 2, 18, 3, RGBA(0x5B3D22))
        p.fill(1, 6, 18, 4, RGBA(0x5B3D22))
        p.fill(1, 2, 18, 1, RGBA(0x7A5327))
        p.fill(1, 6, 18, 1, RGBA(0x7A5327))
        p.fill(2, 10, 3, 3, RGBA(0x3B3B46))
        p.fill(15, 10, 3, 3, RGBA(0x3B3B46))
        return p
    }

    // MARK: - Kacheln (16 x 16)

    private static func buildTiles() -> [Character: PixelImage] {
        var t: [Character: PixelImage] = [:]
        t["."] = grass(1, tuft: false, flower: false)
        t[","] = grass(2, tuft: true, flower: false)
        t["f"] = grass(3, tuft: true, flower: true)
        t["-"] = path(4)
        t["~"] = water(5)
        t["#"] = planks(base: 0xA9743F, dark: 0x8A5C31, light: 0xBD8A52)
        t["^"] = roof()
        t["W"] = windowTile()
        t["D"] = door(knobRight: false)
        t["d"] = door(knobRight: true)
        t["="] = innerWall()
        t["_"] = floor(6)
        t["c"] = carpet()
        t["b"] = bed(top: true)
        t["n"] = bed(top: false)
        t["m"] = table()
        t["h"] = chair()
        t["F"] = fireplace()
        t["R"] = road(line: false)
        t["M"] = road(line: true)
        t["S"] = pavement()
        t["B"] = building(1)
        t["C"] = building(2)
        t["V"] = building(3)
        t["K"] = shop()
        t["O"] = flatRoof()
        t["Q"] = tiledRoof()
        // Kacheln, auf denen ein Objekt steht, zeigen unten einfach den Boden.
        t["T"] = t["."]
        t["t"] = t[","]
        t["*"] = t["."]
        t["r"] = t[","]
        t["l"] = t["S"]
        t["P"] = t["S"]
        t["x"] = t["."]
        return t
    }

    private static func grass(_ seed: UInt32, tuft: Bool, flower: Bool) -> PixelImage {
        let p = PixelImage(16, 16)
        var r = Rand(seed)
        p.fillAll(RGBA(0x4B8F46))
        for _ in 0..<26 { p.set(r.int(16), r.int(16), RGBA(0x437F3F)) }
        for _ in 0..<10 { p.fill(r.int(16), r.int(16), 1, 2, RGBA(0x57A24F)) }
        if tuft {
            for _ in 0..<5 {
                let x = 3 + r.int(10), y = 4 + r.int(9)
                p.fill(x, y, 1, 3, RGBA(0x2F6B34))
                p.fill(x + 1, y + 1, 1, 2, RGBA(0x63B158))
            }
        }
        if flower {
            let colors = [RGBA(0xF0D24A), RGBA(0xE8718A), RGBA(0xE8E2F0)]
            for _ in 0..<4 {
                let x = 2 + r.int(12), y = 2 + r.int(12)
                p.fill(x, y, 2, 2, colors[r.int(3)])
                p.fill(x, y + 2, 1, 2, RGBA(0x2F6B34))
            }
        }
        return p
    }

    private static func path(_ seed: UInt32) -> PixelImage {
        let p = PixelImage(16, 16)
        var r = Rand(seed)
        p.fillAll(RGBA(0xB08A58))
        for _ in 0..<30 {
            let color = r.chance(0.5) ? RGBA(0x9C7647) : RGBA(0xC6A06A)
            p.fill(r.int(16), r.int(16), 1 + r.int(2), 1, color)
        }
        for _ in 0..<3 { p.fill(r.int(13), r.int(13), 2, 2, RGBA(0x8A6840)) }
        return p
    }

    private static func water(_ seed: UInt32) -> PixelImage {
        let p = PixelImage(16, 16)
        var r = Rand(seed)
        p.fillAll(RGBA(0x2F5F9C))
        p.fill(0, 0, 16, 8, RGBA(0x3D78BD))
        for _ in 0..<5 { p.fill(r.int(11), r.int(15), 4, 1, RGBA(0x7FB6E2)) }
        return p
    }

    private static func planks(base: UInt32, dark: UInt32, light: UInt32) -> PixelImage {
        let p = PixelImage(16, 16)
        p.fillAll(RGBA(base))
        for y in stride(from: 0, to: 16, by: 4) {
            p.fill(0, y, 16, 1, RGBA(dark))
            p.fill(0, y + 1, 16, 1, RGBA(light))
        }
        p.fill(7, 0, 1, 16, RGBA(dark))
        return p
    }

    private static func roof() -> PixelImage {
        let p = PixelImage(16, 16)
        p.fillAll(RGBA(0x7A3327))
        for y in stride(from: 0, to: 16, by: 5) {
            for x in stride(from: y % 10 == 0 ? 0 : -4, to: 16, by: 8) {
                p.fill(x + 1, y, 6, 4, RGBA(0x944333))
                p.fill(x, y + 4, 8, 1, RGBA(0x5E2419))
            }
        }
        return p
    }

    private static func windowTile() -> PixelImage {
        let p = planks(base: 0xA9743F, dark: 0x8A5C31, light: 0xBD8A52)
        p.fill(2, 2, 12, 12, RGBA(0x4A3018))
        p.fill(3, 3, 10, 10, RGBA(0x8FD3EA))
        p.fill(3, 3, 10, 4, RGBA(0xC6ECF8))
        p.fill(7, 2, 2, 12, RGBA(0x4A3018))
        p.fill(2, 7, 12, 2, RGBA(0x4A3018))
        return p
    }

    private static func door(knobRight: Bool) -> PixelImage {
        let p = planks(base: 0xA9743F, dark: 0x8A5C31, light: 0xBD8A52)
        p.fill(knobRight ? 0 : 2, 1, 14, 15, RGBA(0x4A3018))
        p.fill(knobRight ? 0 : 3, 2, 13, 14, RGBA(0x6B4A2B))
        for x in stride(from: 0, to: 16, by: 4) {
            p.fill(x, 2, 1, 14, RGBA(0x5B3D22))
        }
        if knobRight { p.fill(2, 8, 2, 2, RGBA(0xFFD24A)) }
        return p
    }

    private static func innerWall() -> PixelImage {
        let p = planks(base: 0x8A5C31, dark: 0x6E4826, light: 0x9C6B3A)
        p.fill(0, 0, 16, 2, RGBA(0x5B3D22))
        return p
    }

    private static func floor(_ seed: UInt32) -> PixelImage {
        let p = PixelImage(16, 16)
        var r = Rand(seed)
        p.fillAll(RGBA(0xC09263))
        p.fill(0, 7, 16, 1, RGBA(0xA87F4D))
        p.fill(0, 15, 16, 1, RGBA(0xA87F4D))
        p.fill(0, 0, 16, 1, RGBA(0xD2A978))
        p.fill(0, 8, 16, 1, RGBA(0xD2A978))
        for i in 0..<10 {
            let color = i % 2 == 0 ? RGBA(0xC9A074) : RGBA(0xB58A58)
            p.fill(r.int(13), r.int(16), 3, 1, color)
        }
        return p
    }

    private static func carpet() -> PixelImage {
        let p = floor(3)
        p.fillAll(RGBA(0x8A3F5A))
        p.fill(2, 2, 12, 12, RGBA(0xA9536E))
        p.fill(5, 5, 6, 6, RGBA(0xD9A05A))
        p.fill(7, 7, 2, 2, RGBA(0x8A3F5A))
        return p
    }

    private static func bed(top: Bool) -> PixelImage {
        let p = floor(5)
        p.fill(1, 0, 14, 16, RGBA(0x6B4A2B))
        if top {
            p.fill(2, 2, 12, 6, RGBA(0xE8E2F0))
            p.fill(2, 7, 12, 1, RGBA(0xC9C2D8))
            p.fill(2, 9, 12, 7, RGBA(0x4F7FC4))
        } else {
            p.fill(2, 0, 12, 13, RGBA(0x4F7FC4))
            p.fill(2, 6, 12, 1, RGBA(0x3D68A8))
            p.fill(1, 13, 14, 3, RGBA(0x6B4A2B))
        }
        return p
    }

    private static func table() -> PixelImage {
        let p = floor(9)
        p.fill(0, 0, 16, 16, RGBA(0x7A5327))
        p.fill(0, 0, 16, 12, RGBA(0xA06F38))
        p.fill(0, 0, 16, 3, RGBA(0xC08A52))
        p.fill(0, 7, 16, 1, RGBA(0x8A5C31))
        return p
    }

    private static func chair() -> PixelImage {
        let p = floor(11)
        p.fill(4, 3, 9, 10, RGBA(0x6B4A2B))
        p.fill(5, 4, 7, 5, RGBA(0x8A6238))
        p.fill(4, 12, 2, 3, RGBA(0x5B3D22))
        p.fill(11, 12, 2, 3, RGBA(0x5B3D22))
        return p
    }

    private static func fireplace() -> PixelImage {
        let p = PixelImage(16, 16)
        p.fillAll(RGBA(0x6B6B76))
        for y in stride(from: 0, to: 16, by: 4) {
            for x in stride(from: y % 8 == 0 ? 4 : 0, to: 16, by: 8) {
                p.fill(x, y, 7, 3, RGBA(0x8A8A96))
            }
        }
        p.fill(3, 6, 10, 10, RGBA(0x1A1420))
        p.fill(5, 10, 6, 6, RGBA(0xD2451F))
        p.fill(6, 11, 4, 5, RGBA(0xF08A2A))
        p.fill(7, 13, 2, 3, RGBA(0xFFD24A))
        return p
    }

    private static func road(line: Bool) -> PixelImage {
        let p = PixelImage(16, 16)
        var r = Rand(line ? 33 : 31)
        p.fillAll(RGBA(0x434350))
        for _ in 0..<20 {
            let color = r.chance(0.5) ? RGBA(0x3B3B46) : RGBA(0x4F4F5C)
            p.set(r.int(16), r.int(16), color)
        }
        if line { p.fill(7, 3, 2, 10, RGBA(0xD8CF8A)) }
        return p
    }

    private static func pavement() -> PixelImage {
        let p = PixelImage(16, 16)
        p.fillAll(RGBA(0xB0A89C))
        p.fill(0, 0, 16, 1, RGBA(0xC2BAB0))
        p.fill(0, 0, 1, 16, RGBA(0xC2BAB0))
        p.fill(0, 15, 16, 1, RGBA(0x98907F))
        p.fill(15, 0, 1, 16, RGBA(0x98907F))
        p.fill(3, 5, 2, 1, RGBA(0xA79F92))
        p.fill(9, 11, 3, 1, RGBA(0xA79F92))
        return p
    }

    private static func building(_ kind: Int) -> PixelImage {
        let p = PixelImage(16, 16)
        let body: UInt32 = kind == 1 ? 0x6A6478 : (kind == 2 ? 0x7A5A52 : 0x59657A)
        let trim: UInt32 = kind == 1 ? 0x565064 : (kind == 2 ? 0x644841 : 0x465268)
        p.fillAll(RGBA(body))
        p.fill(0, 0, 16, 1, RGBA(trim))
        p.fill(0, 15, 16, 1, RGBA(trim))
        p.fill(2, 4, 5, 7, RGBA(0x2A2633))
        p.fill(9, 4, 5, 7, RGBA(0x2A2633))
        p.fill(3, 5, 3, 5, RGBA(0xFFD98A))
        p.fill(10, 5, 3, 5, RGBA(0x8FB6D8))
        return p
    }

    private static func shop() -> PixelImage {
        let p = PixelImage(16, 16)
        p.fillAll(RGBA(0x7A5A52))
        p.fill(1, 3, 14, 13, RGBA(0x2A2633))
        p.fill(2, 4, 12, 8, RGBA(0xFFD98A))
        for x in stride(from: 0, to: 16, by: 4) {
            p.fill(x, 0, 2, 3, RGBA(0xC85A4A))
        }
        p.fill(2, 0, 2, 3, RGBA(0xE8E2F0))
        p.fill(10, 0, 2, 3, RGBA(0xE8E2F0))
        return p
    }

    private static func flatRoof() -> PixelImage {
        let p = PixelImage(16, 16)
        p.fillAll(RGBA(0x4E4A58))
        p.fill(0, 0, 16, 1, RGBA(0x5A5666))
        p.fill(0, 0, 1, 16, RGBA(0x5A5666))
        p.fill(0, 15, 16, 1, RGBA(0x3F3B49))
        p.fill(15, 0, 1, 16, RGBA(0x3F3B49))
        p.fill(3, 4, 10, 8, RGBA(0x565262))
        p.fill(5, 6, 6, 4, RGBA(0x46424F))
        return p
    }

    private static func tiledRoof() -> PixelImage {
        let p = PixelImage(16, 16)
        p.fillAll(RGBA(0x6E3B2E))
        for y in stride(from: 0, to: 16, by: 4) {
            for x in stride(from: y % 8 == 0 ? 0 : -3, to: 16, by: 6) {
                p.fill(x + 1, y, 4, 3, RGBA(0x804638))
                p.fill(x, y + 3, 6, 1, RGBA(0x552A20))
            }
        }
        return p
    }
}
