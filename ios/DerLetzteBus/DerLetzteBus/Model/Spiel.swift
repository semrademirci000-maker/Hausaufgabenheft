//
//  Spiel.swift
//  Der Ablauf von „Der letzte Bus“.
//
//  Die Geschichte läuft als eine einzige async-Funktion von oben nach unten.
//  `sag` schreibt Text Buchstabe für Buchstabe, `waehle` wartet, bis der
//  Spieler einen Knopf drückt. Die Views zeigen nur an, was hier passiert.
//

import SwiftUI

struct Absatz: Identifiable {
    enum Stil { case normal, rede, leise, unheimlich, halt, trenner }
    let id = UUID()
    var text: String
    var stil: Stil
}

struct Option: Identifiable {
    enum Stil { case normal, weiter, zurueck, gefahr }
    let id = UUID()
    let text: String
    let wert: String
    var stil: Stil = .normal
}

enum Licht { case an, aus }

@MainActor
final class Spiel: ObservableObject {

    enum Bildschirm { case titel, bus }

    // MARK: Was die Views anzeigen

    @Published var bildschirm: Bildschirm = .titel
    @Published private(set) var absaetze: [Absatz] = []
    @Published private(set) var optionen: [Option] = []
    @Published private(set) var zuege: Int? = nil
    @Published private(set) var fahrgaeste: [String] = []
    @Published private(set) var name = "Sam"

    @Published private(set) var szene: Szene = .stadt
    @Published private(set) var laternen: Laternen = .an
    @Published private(set) var regen: Double = 1
    @Published private(set) var faehrt = false
    @Published private(set) var schnell = false
    @Published private(set) var schild: String? = nil
    @Published private(set) var uhr = "00:47"
    @Published private(set) var licht: Licht = .an
    @Published private(set) var ledStoerung = false

    @Published private(set) var gefundeneEnden: [Ende] = []

    let klang = BusKlang()

    // MARK: Spielzustand

    private var ding = "berger"
    private var getan = Set<String>()
    private var spiegelBenutzt = false
    private var fahrerZaehler = 0
    private var aufmerksam = 0      // wie sehr das Ding gemerkt hat, dass du es beobachtest
    private var warnung1 = false
    private var warnung2 = false

    private var eilig = false
    private var wartetAufWahl: CheckedContinuation<String, Never>?

    init() {
        let gespeichert = UserDefaults.standard.stringArray(forKey: "derletztebus.enden") ?? []
        gefundeneEnden = Ende.allCases.filter { gespeichert.contains($0.rawValue) }
        name = UserDefaults.standard.string(forKey: "derletztebus.name") ?? ""
    }

    // MARK: Bedienung aus den Views

    func einsteigen(name eingabe: String) {
        var n = eingabe.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "{", with: "")
            .replacingOccurrences(of: "}", with: "")
        if n.isEmpty { n = "Sam" }
        n = String(n.prefix(14))
        n = n.prefix(1).uppercased() + n.dropFirst()
        UserDefaults.standard.set(n, forKey: "derletztebus.name")
        name = n

        ding = Geschichte.reihenfolge.randomElement() ?? "berger"
        fahrgaeste = []
        getan = []
        spiegelBenutzt = false
        fahrerZaehler = 0
        aufmerksam = 0
        warnung1 = false
        warnung2 = false
        absaetze = []
        optionen = []
        licht = .an

        klang.start()
        withAnimation(.easeInOut(duration: 0.5)) { bildschirm = .bus }
        Task { await spielen() }
    }

    /// Tippen auf den Text: Der Rest bis zur nächsten Entscheidung erscheint sofort.
    func beeilen() { eilig = true }

    func tippe(_ option: Option) {
        guard let fortsetzung = wartetAufWahl else { return }
        wartetAufWahl = nil
        optionen = []
        klang.klick()
        fortsetzung.resume(returning: option.wert)
    }

    // MARK: Erzähl-Werkzeuge

    private func n(_ s: String) -> String { s.replacingOccurrences(of: "{name}", with: name) }

    private func warte(_ sekunden: Double) async {
        try? await Task.sleep(nanoseconds: UInt64(sekunden * 1_000_000_000))
    }

    private func sag(_ zeilen: [String], stil: Absatz.Stil? = nil) async {
        for roh in zeilen {
            let ganz = n(roh)
            let s = stil ?? (ganz.hasPrefix("„") ? .rede : .normal)
            absaetze.append(Absatz(text: "", stil: s))
            let index = absaetze.count - 1
            var bisher = ""
            for (i, zeichen) in ganz.enumerated() {
                if eilig { break }
                bisher.append(zeichen)
                absaetze[index].text = bisher
                if i % 4 == 0 && zeichen != " " { klang.tippen() }
                await warte(".!?…".contains(zeichen) ? 0.24 : zeichen == "," ? 0.09 : 0.02)
            }
            absaetze[index].text = ganz
            await warte(eilig ? 0.04 : 0.32)
        }
    }

    private func sag(_ zeile: String, stil: Absatz.Stil? = nil) async {
        await sag([zeile], stil: stil)
    }

    private func trenner() { absaetze.append(Absatz(text: "", stil: .trenner)) }
    private func leeren() { absaetze = [] }

    private func waehle(_ liste: [Option]) async -> String {
        eilig = false
        return await withCheckedContinuation { fortsetzung in
            wartetAufWahl = fortsetzung
            optionen = liste.map { Option(text: n($0.text), wert: $0.wert, stil: $0.stil) }
        }
    }

    private func weiter(_ text: String = "Weiter ▸") async {
        _ = await waehle([Option(text: text, wert: "1", stil: .weiter)])
    }

    // MARK: Bild und Ton

    private func zeigeSzene(_ h: Haltestelle) {
        withAnimation(.easeInOut(duration: 2)) {
            szene = h.szene
            regen = h.regen
        }
        laternen = h.laternen
        klang.regen(h.regen)
    }

    private func fahren(_ an: Bool, schnell s: Bool = false) {
        faehrt = an
        schnell = s
        klang.motor(an ? (s ? 1 : 0.8) : 0.3)
    }

    private func zeigeSchild(_ text: String?) {
        withAnimation(.easeOut(duration: 0.8)) { schild = text }
    }

    private func flackern() {
        ledStoerung = true
        Task {
            for an in [false, true, false, true, false, true] {
                licht = an ? .an : .aus
                await warte(Double.random(in: 0.06...0.2))
            }
            licht = .an
            await warte(0.6)
            ledStoerung = false
        }
    }

    private func sitzeEinsteigen(_ id: String) {
        withAnimation(.spring(duration: 0.6)) { fahrgaeste.append(id) }
    }

    private func istDing(_ id: String) -> Bool { id == ding }

    // MARK: Ablauf

    private func spielen() async {
        await einleitung()
        for i in 1..<Geschichte.halte.count {
            let h = Geschichte.halte[i]
            await fahrtZu(i)
            if let wer = h.steigt { await einsteigenLassen(wer) }
            if h.zuhause, await zuhause() { return }
            if h.ende { await endstation(); return }
            await zwischenHalt()
            await weiter("Weiterfahren ▸")
        }
    }

    private func einleitung() async {
        let h = Geschichte.halte[0]
        zeigeSzene(h)
        uhr = h.uhr
        zeigeSchild(h.schild)
        klang.motor(0)
        klang.unbehagen(0)
        await sag([
            "Es ist 00:47. Der Regen ist so kalt, dass er in den Ohren wehtut.",
            "Du hast die letzte Bahn verpasst. Dein Handy hat noch 3 % Akku. Bis nach Hause sind es vier Haltestellen. Normalerweise.",
            "Dann biegen zwei Scheinwerfer um die Ecke. Ein Nachtbus. Auf der Anzeige leuchtet: N13 – ENDSTATION.",
            "Die N13 kennst du nicht. Aber sie hält direkt vor dir, und die Türen öffnen sich mit einem langen Seufzen."
        ])
        klang.motor(0.3)
        klang.tueren()
        let w = await waehle([
            Option(text: "Einsteigen", wert: "rein"),
            Option(text: "Lieber auf einen anderen Bus warten", wert: "warten")
        ])
        if w == "warten" {
            await sag([
                "Du wartest. Der Bus wartet auch.",
                "Es kommt kein anderer Bus. Es kommt kein Auto, kein Mensch, nicht einmal eine Katze. Die Türen stehen offen. Drinnen ist es warm und hell.",
                "Dein Handy geht aus."
            ], stil: .leise)
            _ = await waehle([Option(text: "Einsteigen", wert: "rein")])
        }
        await sag([
            "Der Bus ist leer. Es riecht nach nassen Jacken und altem Kaugummi.",
            "Der Fahrer trägt eine Mütze und dreht sich nicht um. Du hältst ihm dein Ticket hin. Er nickt nur.",
            "Du setzt dich in die Mitte, ans Fenster. Die Türen schließen sich hinter dir."
        ])
        klang.tueren()
        await weiter("Losfahren ▸")
    }

    private func fahrtZu(_ i: Int) async {
        let h = Geschichte.halte[i]
        leeren()
        zuege = nil
        zeigeSchild(nil)
        fahren(true, schnell: h.szene == .schule)
        klang.unbehagen(min(1, Double(i) / 6))
        await sag(h.fahrt, stil: .leise)
        await warte(0.9)
        zeigeSzene(h)
        await warte(0.7)
        fahren(false)
        klang.gong()
        uhr = h.uhr
        zeigeSchild(h.schild)
        await sag(h.ende ? "ENDSTATION" : (h.schild.isEmpty ? "– – –" : h.schild.uppercased()), stil: .halt)
        if !h.text.isEmpty { await sag(h.text) }
    }

    private func einsteigenLassen(_ id: String) async {
        guard let p = Geschichte.leute[id] else { return }
        klang.tueren()
        await sag(p.einstieg)
        sitzeEinsteigen(id)
        klang.tueren()
    }

    /// Zwischen zwei Haltestellen kannst du zwei Dinge tun.
    private func zwischenHalt() async {
        var rest = 2
        while rest > 0 {
            trenner()
            zuege = rest
            var liste: [Option] = []
            for id in fahrgaeste {
                guard let p = Geschichte.leute[id] else { continue }
                if !offeneAktionen(id).isEmpty {
                    liste.append(Option(text: p.name + " …", wert: "p:" + id))
                }
            }
            if !spiegelBenutzt { liste.append(Option(text: "Ins Spiegelbild der Scheibe schauen", wert: "spiegel")) }
            liste.append(Option(text: "Zum Fahrer gehen", wert: "fahrer"))
            liste.append(Option(text: "Einfach still sitzen bleiben", wert: "still", stil: .zurueck))

            let w = await waehle(liste)
            if w.hasPrefix("p:") {
                let id = String(w.dropFirst(2))
                guard let p = Geschichte.leute[id] else { continue }
                var sub = offeneAktionen(id).map { a -> Option in
                    switch a {
                    case .reden: return Option(text: "Mit \(p.name) reden", wert: a.rawValue)
                    case .nochmal: return Option(text: "Noch einmal mit \(p.name) reden", wert: a.rawValue)
                    case .ansehen: return Option(text: "\(p.name) heimlich genauer ansehen", wert: a.rawValue)
                    }
                }
                sub.append(Option(text: "◂ Zurück", wert: "zurueck", stil: .zurueck))
                let a = await waehle(sub)
                guard let aktion = Aktion(rawValue: a) else { continue }
                getan.insert(id + ":" + aktion.rawValue)
                await sag(p.hinweis(aktion, ding: istDing(id)))
                if istDing(id) { aufmerksam += 1 }
            } else if w == "spiegel" {
                await spiegelbild()
            } else if w == "fahrer" {
                await sag(Geschichte.fahrer[min(fahrerZaehler, Geschichte.fahrer.count - 1)])
                fahrerZaehler += 1
            } else {
                await sag("Du ziehst die Jacke enger und schaust aus dem Fenster. Du versuchst, nicht aufzufallen.", stil: .leise)
                if aufmerksam > 0 { aufmerksam -= 1 }
                rest = 1
            }
            rest -= 1
        }
        zuege = nil
        await warnungen()
    }

    private func offeneAktionen(_ id: String) -> [Aktion] {
        var a: [Aktion] = []
        if !getan.contains(id + ":reden") { a.append(.reden) }
        else if !getan.contains(id + ":nochmal") { a.append(.nochmal) }
        if !getan.contains(id + ":ansehen") { a.append(.ansehen) }
        return a
    }

    private func spiegelbild() async {
        spiegelBenutzt = true
        let echt = fahrgaeste.count
        let imGlas = echt - (fahrgaeste.contains(ding) ? 1 : 0)
        await sag([
            "Du wischst mit dem Ärmel über die beschlagene Scheibe. Im dunklen Glas spiegelt sich der ganze Bus: die gelben Haltestangen, die Sitze, du selbst.",
            "Du zählst die Fahrgäste im Spiegelbild: \(Geschichte.zahlen[imGlas]).",
            "Du drehst dich um und zählst noch einmal, in echt: \(Geschichte.zahlen[echt])."
        ])
        if imGlas != echt {
            klang.schreck()
            await sag("Du zählst noch einmal. Es bleibt dabei. Einer von ihnen ist im Glas nicht da.", stil: .unheimlich)
        } else {
            await sag("Die Zahlen stimmen. Fürs Erste.")
        }
        await sag("Dein Atem lässt die Scheibe sofort wieder beschlagen. Diesmal bleibt sie trüb, egal wie oft du wischst.", stil: .leise)
    }

    private func warnungen() async {
        if aufmerksam >= 2 && !warnung1 {
            warnung1 = true
            flackern()
            await sag([
                "Das Licht flackert.",
                "Du spürst, dass dich jemand ansieht. Als du aufschaust, schauen alle aus dem Fenster. Alle bis auf einen – aber du warst nicht schnell genug, um zu sehen, wer."
            ], stil: .leise)
        } else if aufmerksam >= 4 && !warnung2 {
            warnung2 = true
            licht = .aus
            klang.schreck()
            await sag([
                "Das Licht geht aus. Komplett. Der Motor läuft weiter.",
                "In der Dunkelheit setzt sich jemand neben dich. Du spürst, wie der Sitz nachgibt. Etwas Kaltes legt sich auf deine Hand."
            ], stil: .leise)
            await sag("„Nicht so neugierig, {name}“, flüstert es.", stil: .unheimlich)
            await warte(0.9)
            licht = .an
            await sag("Das Licht geht wieder an. Neben dir ist niemand. Alle sitzen auf ihren Plätzen. Genau wie vorher.")
        }
    }

    private func namensListe(_ ids: [String]) -> String {
        let namen = ids.compactMap { Geschichte.leute[$0]?.name }
        guard namen.count > 1 else { return namen.first ?? "" }
        return namen.dropLast().joined(separator: ", ") + " und " + (namen.last ?? "")
    }

    /// Gibt `true` zurück, wenn das Spiel hier zu Ende ist.
    private func zuhause() async -> Bool {
        let w = await waehle([
            Option(text: "Aussteigen und nach Hause rennen", wert: "raus", stil: .gefahr),
            Option(text: "Sitzen bleiben", wert: "bleiben")
        ])
        if w == "bleiben" {
            await sag([
                "Du bleibst sitzen. Irgendetwas in dir sagt, dass das, was da am Küchentisch sitzt, nicht auf dich wartet.",
                "Die Türen schließen sich. Das Licht in der Küche geht aus."
            ])
            klang.tueren()
            return false
        }
        klang.tueren()
        await sag([
            "Du springst aus dem Bus. Die Luft riecht nach nassem Laub und nach Zuhause. Du rennst zur Haustür.",
            "Hinter dir schließen sich die Türen. Aber der Bus fährt nicht los.",
            "Du drehst dich um. Im hell erleuchteten Bus sitzen alle noch auf ihren Plätzen. \(namensListe(fahrgaeste)). Und in der Mitte, am Fenster:"
        ])
        klang.schreck()
        await sag("Du.", stil: .unheimlich)
        await sag([
            "Dein anderes Ich hebt die Hand und winkt dir zu. Dann fährt der Bus in die Nacht.",
            "Du schließt die Haustür auf. Am Küchentisch sitzt niemand. Auf dem Tisch liegt dein Handy.",
            "Es hat 3 % Akku. Die Uhr zeigt 00:47."
        ])
        await ende(.doppelt)
        return true
    }

    private func endstation() async {
        await sag([
            "Draußen ist nichts mehr. Kein Haus, kein Baum, kein Himmel. Nur weißer, stiller Nebel.",
            "Zum ersten Mal steht der Fahrer auf. Er dreht sich nicht um. Seine Stimme klingt wie ein Radio, das zwischen zwei Sendern rauscht."
        ])
        await sag([
            "„Endstation. Alle Menschen steigen hier aus.“",
            "„Einer von euch ist kein Mensch. Wer es ist, bleibt im Bus.“",
            "„Sag es mir, {name}. Du hast doch genau hingesehen.“"
        ])
        await sag("Alle sehen dich an.", stil: .leise)

        var liste = fahrgaeste.compactMap { id in
            Geschichte.leute[id].map { Option(text: "Auf \($0.name) zeigen", wert: id) }
        }
        liste.append(Option(text: "Auf den Fahrer zeigen", wert: "fahrer", stil: .gefahr))
        let w = await waehle(liste)
        leeren()

        if w == "fahrer" {
            await sag(["Du zeigst auf den Fahrer.", "Er lacht leise. Dann dreht er sich zum ersten Mal um."])
            klang.schreck()
            await sag("Er hat dein Gesicht. Älter. Müder.", stil: .unheimlich)
            await sag([
                "„Gut geraten“, sagt er mit deiner Stimme. „Ich habe damals auch auf den Fahrer gezeigt.“",
                "Er nimmt seine Mütze ab und setzt sie dir auf. Sie passt genau.",
                "Die anderen steigen aus, alle, auch das, was kein Mensch war. Der Nebel verschluckt sie. Dann steigt auch der alte Fahrer aus und ist fort.",
                "Du setzt dich hinter das Lenkrad. Auf der Anzeige steht: N13 – ENDSTATION.",
                "Irgendwo in der Stadt steht jemand im Regen und wartet auf den letzten Bus."
            ])
            await ende(.steuer)
            return
        }

        guard let gezeigt = Geschichte.leute[w], let dasDing = Geschichte.leute[ding] else { return }
        await sag("Du zeigst auf \(gezeigt.name).")
        await warte(0.6)

        if istDing(w) {
            klang.schreck()
            flackern()
            await sag(gezeigt.enttarnt, stil: .unheimlich)
            let andere = fahrgaeste.filter { $0 != w }
            await sag([
                "Der Fahrer nickt. „Gut.“",
                "Die Türen öffnen sich.",
                (andere.isEmpty ? "Du steigst aus." : "Ihr steigt aus – du, \(namensListe(andere)).") + " Der Nebel ist warm, und irgendwo dahinter wird es hell.",
                "Als du dich umdrehst, fährt der Bus schon. Hinter der Rückscheibe sitzt \(gezeigt.name) und winkt. Langsam. Bis der Nebel den Bus verschluckt."
            ])
            zeigeSzene(Haltestelle(szene: .zuhause, schild: "Ahornweg", uhr: "05:58", regen: 0, laternen: .an))
            zeigeSchild("Ahornweg")
            uhr = "05:58"
            klang.unbehagen(0)
            klang.motor(0, sekunden: 4)
            await sag([
                "Du stehst an der Haltestelle Ahornweg. Es dämmert. Ein Vogel singt.",
                "Dein Handy vibriert: 14 verpasste Anrufe von Zuhause.",
                "Du hast es geschafft."
            ])
            await ende(.ausgestiegen)
            return
        }

        await sag(gezeigt.beschuldigt)
        await sag(["Der Fahrer schweigt sehr lange.", "„Falsch“, sagt er."])
        klang.schreck()
        await sag(["Hinter dir lacht jemand. Ganz leise.", dasDing.lacht], stil: .unheimlich)
        licht = .aus
        await sag("Die Lichter gehen aus.", stil: .leise)
        await warte(1.2)
        withAnimation { fahrgaeste = [] }
        let start = Geschichte.halte[0]
        zeigeSzene(start)
        zeigeSchild(start.schild)
        uhr = start.uhr
        licht = .an
        fahren(true)
        await sag([
            "Als sie wieder angehen, ist der Bus leer. Nur du sitzt noch da, in der Mitte, am Fenster.",
            "Draußen regnet es. Der Bus hält am Marktplatz. Dort steht jemand im Regen, und die Türen öffnen sich mit einem langen Seufzen.",
            "Diesmal bist du der Fahrgast, der schon da ist."
        ])
        fahren(false)
        await ende(.fahrgast)
    }

    private func ende(_ e: Ende) async {
        if !gefundeneEnden.contains(e) {
            gefundeneEnden = Ende.allCases.filter { gefundeneEnden.contains($0) || $0 == e }
            UserDefaults.standard.set(gefundeneEnden.map(\.rawValue), forKey: "derletztebus.enden")
        }
        trenner()
        await sag("ENDE: " + e.titel.uppercased(), stil: .halt)
        if e != .ausgestiegen, let d = Geschichte.leute[ding] {
            await sag("Kein Mensch war übrigens: \(d.name).", stil: .leise)
        }
        await sag("Du hast \(gefundeneEnden.count) von \(Ende.allCases.count) Enden gefunden. Bei jeder Fahrt ist jemand anderes kein Mensch.", stil: .leise)
        _ = await waehle([Option(text: "Noch einmal einsteigen", wert: "1", stil: .weiter)])
        klang.motor(0)
        klang.regen(0)
        klang.unbehagen(0)
        zeigeSchild(nil)
        withAnimation(.easeInOut(duration: 0.5)) { bildschirm = .titel }
    }
}
