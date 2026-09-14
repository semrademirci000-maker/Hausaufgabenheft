//
//  Maps.swift
//  Die drei Welten: Eichenwald, das Holzhaus und Eichenstadt.
//  Jedes Zeichen im Raster ist eine Kachel (16 x 16 Pixel).
//

import Foundation

enum SongName {
    case wald, haus, stadt, kampf
}

/// Eine Tür: Wer hier draufläuft, landet in einer anderen Welt.
struct DoorTrigger {
    let x: Int
    let y: Int
    let width: Int
    let height: Int
    let to: String
    let target: Vec             // Zielplatz in Kacheln
}

/// Etwas, das auf der Karte steht: Baum, Auto, Schild, Laterne …
struct PropSpec {
    let kind: String
    let x: Double
    let y: Double
    var text: String?

    init(_ kind: String, _ x: Double, _ y: Double, text: String? = nil) {
        self.kind = kind
        self.x = x
        self.y = y
        self.text = text
    }
}

struct GameMap {
    let key: String
    let name: String
    let rows: [[Character]]
    let song: SongName
    let spawn: Vec
    let hasZombies: Bool
    let triggers: [DoorTrigger]
    let props: [PropSpec]
    let friendSpots: [Vec]

    var columns: Int { rows.first?.count ?? 0 }
    var lines: Int { rows.count }

    /// Kacheln, durch die man nicht laufen kann.
    static let solidTiles: Set<Character> = [
        "T", "t", "*", "r", "s", "~", "#", "^", "W", "=",
        "b", "n", "m", "h", "F", "B", "C", "V", "K", "O", "Q", "l", "P"
    ]

    func tile(_ x: Int, _ y: Int) -> Character {
        guard y >= 0, y < rows.count, x >= 0, x < rows[y].count else { return "T" }
        return rows[y][x]
    }

    func isSolid(_ x: Int, _ y: Int) -> Bool {
        GameMap.solidTiles.contains(tile(x, y))
    }

    static func make(_ key: String) -> GameMap {
        switch key {
        case "haus":  return haus()
        case "stadt": return stadt()
        default:      return wald()
        }
    }
}

// MARK: - Werkzeuge zum Zeichnen der Raster

private func makeGrid(_ w: Int, _ h: Int, _ ch: Character) -> [[Character]] {
    [[Character]](repeating: [Character](repeating: ch, count: w), count: h)
}

private func paint(_ g: inout [[Character]], _ x: Int, _ y: Int, _ w: Int, _ h: Int, _ ch: Character) {
    for yy in y..<(y + h) {
        for xx in x..<(x + w) {
            if yy >= 0, yy < g.count, xx >= 0, xx < g[yy].count { g[yy][xx] = ch }
        }
    }
}

/// Ein Häuserblock: alle vier Kacheln ein anderes Haus.
/// Kacheln, auf denen man laufen kann (Straße, Gehweg, Gras, Weg).
private func walkableChar(_ ch: Character) -> Bool {
    "SRM.,f-".contains(ch)
}

private func houseBlock(_ g: inout [[Character]], _ x0: Int, _ y0: Int,
                        _ bw: Int, _ bh: Int, _ kinds: [Character]) {
    for y in y0..<(y0 + bh) {
        for x in x0..<(x0 + bw) {
            guard y >= 0, y < g.count, x >= 0, x < g[y].count else { continue }
            let index = (x - x0) / 4 + ((y - y0) / 3) * 2
            g[y][x] = kinds[index % kinds.count]
        }
    }
}

private func stamp(_ g: inout [[Character]], _ x0: Int, _ y0: Int, _ rows: [String]) {
    for (dy, row) in rows.enumerated() {
        for (dx, ch) in row.enumerated() {
            if ch == "|" { continue }                 // hier nichts verändern
            let x = x0 + dx, y = y0 + dy
            if y >= 0, y < g.count, x >= 0, x < g[y].count { g[y][x] = ch }
        }
    }
}

// MARK: - Wald

extension GameMap {

    static func wald() -> GameMap {
        let w = 44, h = 34
        var r = Rand(20_250_914)
        var g = makeGrid(w, h, ".")

        // Gras mit ein paar Büscheln und Blumen
        for y in 0..<h {
            for x in 0..<w {
                let v = r.next()
                g[y][x] = v > 0.9 ? "f" : (v > 0.68 ? "," : ".")
            }
        }
        // Dichter Waldrand ringsherum
        for y in 0..<h {
            for x in 0..<w {
                let d = min(min(x, y), min(w - 1 - x, h - 1 - y))
                if d == 0 || (d <= 2 && r.next() > 0.25) { g[y][x] = "T" }
            }
        }
        // Baumgruppen im Inneren
        for _ in 0..<34 {
            let cx = 4 + r.int(w - 8)
            let cy = 4 + r.int(h - 8)
            for _ in 0..<(1 + r.int(4)) {
                let tx = cx + r.int(4) - 2
                let ty = cy + r.int(4) - 2
                if ty >= 0, ty < h, tx >= 0, tx < w {
                    g[ty][tx] = r.next() > 0.65 ? "t" : "T"
                }
            }
        }
        // Büsche und Steine
        for _ in 0..<24 {
            let x = 3 + r.int(w - 6)
            let y = 3 + r.int(h - 6)
            g[y][x] = r.next() > 0.45 ? "*" : "r"
        }
        // Teich unten rechts
        for y in 24..<31 {
            for x in 31..<41 {
                let dx = (Double(x) - 36) / 5
                let dy = (Double(y) - 27.5) / 3.4
                if dx * dx + dy * dy < 1 { g[y][x] = "~" }
            }
        }

        // Lichtung ums Haus
        paint(&g, 3, 2, 18, 12, ".")
        for y in 2..<14 {
            for x in 3..<21 {
                if r.next() > 0.75 { g[y][x] = "," }
            }
        }

        // Das Holzhaus
        stamp(&g, 6, 3, [
            "..^^^^^^^^..",
            ".^^^^^^^^^^.",
            ".^^^^^^^^^^.",
            "..#W####W#..",
            "..###Dd###..",
            "..--------.."
        ])

        // Weg vom Haus nach unten und nach rechts zum Auto
        for y in 9...17 { g[y][11] = "-"; g[y][12] = "-" }
        for x in 11...27 { g[17][x] = "-"; g[18][x] = "-" }
        for y in 17...22 { g[y][26] = "-"; g[y][27] = "-" }
        paint(&g, 24, 14, 6, 4, "-")

        // Lichtung in der Mitte – da ist am meisten los
        paint(&g, 14, 21, 12, 8, ",")
        for y in 21..<29 {
            for x in 14..<26 {
                if r.next() > 0.82 { g[y][x] = "f" }
            }
        }
        g[23][16] = "T"
        g[27][23] = "t"
        g[25][20] = "*"

        return GameMap(
            key: "wald",
            name: "Eichenwald",
            rows: g,
            song: .wald,
            spawn: Vec(x: 11.5, y: 10),
            hasZombies: true,
            triggers: [
                DoorTrigger(x: 11, y: 7, width: 2, height: 1, to: "haus",
                            target: Vec(x: 10.5, y: 10.5))
            ],
            props: [
                PropSpec("car", 26.5, 16),
                PropSpec("sign", 28, 20.9,
                         text: "Wegweiser: Nach Osten geht es zur Stadt Eichenstadt. "
                             + "Zu Fuss viel zu weit - nimm das Auto!")
            ],
            friendSpots: [
                Vec(x: 15.5, y: 11), Vec(x: 17, y: 12.5),
                Vec(x: 14, y: 13), Vec(x: 16.5, y: 14.5)
            ]
        )
    }

    // MARK: - Haus

    static func haus() -> GameMap {
        let plan = [
            "====================",
            "==W=======W======W==",
            "=F________________b=",
            "=_________________n=",
            "=___mmm___________h=",
            "=___mmm____________=",
            "=___hhh____________=",
            "=b_________cc______=",
            "=n_________cc______=",
            "=h_________________=",
            "=__________________=",
            "=_________Dd_______=",
            "====================",
            "====================",
            "===================="
        ]
        return GameMap(
            key: "haus",
            name: "Zuhause",
            rows: plan.map { Array($0) },
            song: .haus,
            spawn: Vec(x: 10.5, y: 10.5),
            hasZombies: false,
            triggers: [
                DoorTrigger(x: 10, y: 11, width: 2, height: 1, to: "wald",
                            target: Vec(x: 11.5, y: 10))
            ],
            props: [],
            friendSpots: []
        )
    }

    // MARK: - Stadt

    static func stadt() -> GameMap {
        let w = 44, h = 30
        var r = Rand(31_415)
        var g = makeGrid(w, h, "S")

        // Straßen: eine quer, eine hoch
        for y in 0..<h {
            for x in 0..<w {
                if y >= 13, y <= 17 { g[y][x] = (y == 15 ? "M" : "R") }
                if x >= 20, x <= 24 {
                    g[y][x] = (x == 22 && !(y >= 13 && y <= 17)) ? "M" : "R"
                }
            }
        }

        // Häuserblöcke
        houseBlock(&g, 2, 2, 14, 8, ["B", "B", "C", "V"])
        houseBlock(&g, 27, 2, 14, 8, ["V", "C", "B", "B"])
        houseBlock(&g, 2, 21, 13, 7, ["C", "B", "V", "C"])
        houseBlock(&g, 28, 21, 13, 7, ["B", "V", "C", "B"])

        // Ladenzeilen an der Straße
        for x in 4..<14 { g[10][x] = "K" }
        for x in 29..<39 { g[10][x] = "K" }
        for x in 5..<13 { g[20][x] = "K" }

        // Park mit Brunnen
        paint(&g, 16, 19, 8, 8, "S")
        paint(&g, 17, 20, 6, 6, ".")
        for y in 20..<26 {
            for x in 17..<23 {
                if r.next() > 0.7 { g[y][x] = "," }
            }
        }

        // Außenrand: Häuser, damit man nicht aus der Stadt läuft
        for y in 0..<h {
            g[y][0] = "B"; g[y][1] = "B"; g[y][w - 1] = "B"; g[y][w - 2] = "B"
        }
        for x in 0..<w {
            g[0][x] = "B"; g[1][x] = "B"; g[h - 1][x] = "B"; g[h - 2][x] = "B"
        }
        // Die Hauptstraße bleibt am Rand offen (Ein- und Ausfahrt)
        for x in 0..<w where x < 2 || x > w - 3 {
            g[14][x] = "R"; g[15][x] = "M"; g[16][x] = "R"
        }

        // Von oben sieht man Dächer – nur die Seite zur Straße ist Hauswand.
        var roofed = g
        for y in 0..<h {
            for x in 0..<w {
                let ch = g[y][x]
                guard "BCVK".contains(ch) else { continue }
                let freeBelow = (y + 1 < h) && walkableChar(g[y + 1][x])
                if !freeBelow { roofed[y][x] = (ch == "C" || ch == "K") ? "Q" : "O" }
            }
        }
        g = roofed

        return GameMap(
            key: "stadt",
            name: "Eichenstadt",
            rows: g,
            song: .stadt,
            spawn: Vec(x: 26.5, y: 22),
            hasZombies: false,
            triggers: [],
            props: [
                PropSpec("sign", 18.5, 12.6,
                         text: "Auf dem Blatt am Stadttor steht: \"EICHENSTADT - 412 Einwohner, "
                             + "3 Baecker, 0 Zombies. Bitte Schwert stecken lassen!\""),
                PropSpec("lamp", 18.5, 18.6),
                PropSpec("lamp", 26.5, 18.6),
                PropSpec("lamp", 18.5, 11.6),
                PropSpec("lamp", 26.5, 11.6),
                PropSpec("car", 26.5, 20.5),
                PropSpec("fountain", 19.9, 23.5),
                PropSpec("bench", 17.5, 25.6),
                PropSpec("bench", 22.3, 25.6),
                PropSpec("tree", 17.5, 21.2),
                PropSpec("tree", 22.5, 21.2),
                PropSpec("lamp", 25.4, 24.6)
            ],
            friendSpots: []
        )
    }

    /// Wo in der Stadt die Leute herumlaufen.
    static let stadtWanderSpots: [Vec] = [
        Vec(x: 12, y: 18), Vec(x: 31, y: 12),
        Vec(x: 18, y: 22), Vec(x: 34, y: 19)
    ]
}
