// Legende:
// #  Wand            .  Boden          P  Spielerstart     M  Monster-Start
// B  Batterie        G  Generator      E  Ausgangstor      X  Ausgang
// L  Deckenlampe     K  Spind          N  Notiz / Tonband
// a/b/c  Hebel       1/2/3  Tür, die vom passenden Hebel geöffnet wird (Hebel steht direkt daneben)
// O  Käfig mit The Tailor  Y  Vitrine mit der Puppe Mila
// D  Batterie auf einer Kommode mit Puppe (neben dem Käfig)
// Bereich „Die Nähstube“ (gehört zu Kapitel 1): X = Übergang (Tor schließt sich), Q = Schlüsselkarte,
// Z = Sicherheitstür (braucht die Karte), V = Lüftung (Zipper kommt heraus), F = Aufzug (Ziel)
export const MAP = [
  "###################",
  "######L.PB#########",
  "######KY.B#########",
  "########.##########",
  "#######K.N#########",
  "#..K####.######K.O#",
  "#.L.###..LGK###.LD#",
  "#....1a.....b2...K#",
  "#N..###K..KM###...#",
  "##.######.#####N..#",
  "##.######E#########",
  "#...K####X#########",
  "#L....###.#########",
  "#K....###.#########",
  "#########.#########",
  "#..N##...L..K######",
  "#Q..##......V#..K.#",
  "#...3c.......#.L..#",
  "#N.K##...........N#",
  "#..L##..L....##.K.#",
  "#########Z#########",
  "#######..L..#######",
  "#######.....#######",
  "#######..F..#######",
  "###################",
];
