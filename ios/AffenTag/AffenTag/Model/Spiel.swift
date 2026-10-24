//
//  Spiel.swift
//  Das Herz: läuft 60-mal pro Sekunde, bewegt dich und die anderen Spieler,
//  prüft wer wen gefangen hat, steuert die Runden und redet mit dem Netz.
//

import Combine
import CoreMotion
import QuartzCore
import SwiftUI
import UIKit
import simd

/// Eine Farbkugel aus der Schleuder (Farbschlacht).
struct Farbkugel: Codable {
    var id: Int
    var von: String
    var position: V3
    var geschwindigkeit: V3
    var farbe: V3
    var alter: Float = 0
}

struct SpielerZeile: Identifiable, Equatable {
    let id: String
    var name: String
    var farbe: V3
    var lava: Bool
    var raus: Bool
    var ich: Bool
}

/// Was oben auf dem Bildschirm steht – nur ~10-mal pro Sekunde aktualisiert.
final class HUD: ObservableObject {
    @Published var meldung: String?
    @Published var unterzeile: String = ""
    @Published var istLava = false
    @Published var eingefroren = false
    @Published var amComputer = false
    @Published var spieler: [SpielerZeile] = []
    @Published var netz: String = "Offline"
    @Published var zielName: String?
    @Published var zielFarbe: V3?
    @Published var zielWinkel: Double = 0
    @Published var ballons: Int?
    @Published var raus = false
    @Published var steine = 0
}

final class Spiel: ObservableObject {
    enum Bildschirm { case titel, spiel }

    @Published var bildschirm: Bildschirm = .titel
    @Published var einstellungen: Einstellungen {
        didSet {
            guard einstellungen != oldValue else { return }
            einstellungen.speichern()
            klang.lautstaerke(einstellungen.lautstaerke)
            if einstellungen.gyro != oldValue.gyro { gyroUmschalten() }
            if einstellungen.verbindung != oldValue.verbindung { notfallNah = false }
        }
    }
    @Published var zeigeComputer = false
    @Published var zeigeLaden = false
    @Published var zeigeMenue = false
    @Published var zeigeListe = false
    @Published private(set) var lampeAn = false
    @Published private(set) var karte: KartenID = .stumpf
    @Published private(set) var raumCode: String?

    let hud = HUD()
    let szene = SzeneVerwalter()
    let klang = AffenKlang()
    let ich = UUID().uuidString

    private(set) var welt = Welt()
    private(set) var lokal = Affenkoerper(position: V3(0, 1, 0), gier: 0)
    private var affen: [String: Affe] = [:]
    private(set) var runde = Runde()
    private var zeit: Double = 0
    private var naechsteRundeUm: Double = 0
    private var kugeln: [Farbkugel] = []
    private var naechsteKugelID = 0
    private var schleuderBereit: Double = 0
    private var netz: NetzTransport?
    private var netzStatus: NetzStatus = .aus
    private var sendeTakt: Double = 0
    private var rundeSendeTakt: Double = 0
    private var hudTakt: Double = 0
    private var belohnungTakt: Double = 0
    private var vogelTakt: Double = 3
    private var meldungBis: Double = 0
    private var notfallNah = false
    private var taktgeber: Taktgeber?
    private let bewegung = CMMotionManager()
    private let haptik = UIImpactFeedbackGenerator(style: .light)
    private let haptikStark = UIImpactFeedbackGenerator(style: .heavy)

    // Eingaben vom Bildschirm
    private var blickGier: Float = 0
    private var blickNeigung: Float = 0
    private var ruckSumme: Float = 0

    init() {
        einstellungen = Einstellungen.laden()
        hud.steine = einstellungen.steine
        klang.lautstaerke(einstellungen.lautstaerke)
    }

    // MARK: - Bildschirme

    func spielen(_ k: KartenID = .stumpf) {
        klang.start()
        bildschirm = .spiel
        lade(k)
        starteTakt()
        gyroUmschalten()
    }

    func zumTitel() {
        trenne()
        taktgeber?.stoppe()
        taktgeber = nil
        bewegung.stopDeviceMotionUpdates()
        zeigeComputer = false
        zeigeLaden = false
        zeigeMenue = false
        eingabe = SteuerEingabe()
        bildschirm = .titel
    }

    func lade(_ k: KartenID) {
        let gebaut = Karten.baue(k)
        welt = gebaut.welt
        szene.zeige(gebaut)
        karte = k
        kugeln.removeAll()
        affen.removeAll()

        let start = welt.startpunkte.randomElement() ?? V3(0, 1, 0)
        let blick = k == .stumpf ? 0 : gierZu(-start.flach)
        lokal.setzeZurueck(auf: start, gier: blick)
        blickNeigung = 0
        affen[ich] = Affe(id: ich, name: einstellungen.name, farbe: meineFarbe, istLokal: true, position: start)

        runde = Runde()
        runde.modus = k == .stumpf ? .locker : einstellungen.modus
        runde.wartet = true
        klang.wind(k == .hoehle ? 0.5 : (k == .wolken || k == .berge ? 0.7 : 0.25))
        verbinde()
        zeige("\(k.symbol) \(k.name.uppercased())", sekunden: 2.5)
    }

    var meineFarbe: V3 { fellFarbe(einstellungen.rot, einstellungen.gruen, einstellungen.blau) }

    // MARK: - Eingaben

    enum Taste: String {
        case leer, shift, e, r, f, tab, esc, logo, computer
        case eins = "1", zwei = "2", drei = "3", vier = "4"
    }

    /// Joysticks: links laufen, rechts umschauen (je −1…1, y nach oben).
    var eingabe = SteuerEingabe()

    /// Eine Taste auf dem Bildschirm wurde gedrückt oder losgelassen.
    func taste(_ t: Taste, _ gedrueckt: Bool) {
        switch t {
        case .shift: eingabe.sprint = gedrueckt
        case .e: eingabe.greifen = gedrueckt
        case .eins: eingabe.hoch = gedrueckt
        case .drei: eingabe.runter = gedrueckt
        default: break
        }
        guard gedrueckt else { return }
        switch t {
        case .leer: lokal.springe()
        case .vier: lokal.schlag[0] = 0.25
        case .zwei: lokal.schlag[1] = 0.25
        case .r:
            lokal.setzeZurueck(auf: welt.startpunkte.randomElement() ?? V3(0, 1, 0), gier: lokal.gier)
            zeige("ZURÜCK ZUM START", sekunden: 1.2)
        case .f:
            lampeAn.toggle()
            szene.lampe(lampeAn)
            zeige(lampeAn ? "TASCHENLAMPE AN" : "TASCHENLAMPE AUS", sekunden: 1)
        case .tab: zeigeListe.toggle()
        case .computer: zeigeComputer = true
        case .logo: zeigeMenue = true
        case .esc:
            if zeigeComputer { zeigeComputer = false }
            else if zeigeLaden { zeigeLaden = false }
            else { zeigeMenue.toggle() }
        default: break
        }
    }

    /// Wischen über die Welt: umschauen.
    func blick(dx: Float, dy: Float) {
        let tempo = 0.5 + Float(einstellungen.drehTempo) * 0.15
        switch einstellungen.drehModus {
        case .sanft:
            blickGier -= dx * 3.2 * tempo
        case .ruck:
            ruckSumme += dx
            if abs(ruckSumme) > 0.12 {
                blickGier += ruckSumme > 0 ? -grad(45) : grad(45)
                ruckSumme = 0
            }
        case .aus:
            break
        }
        if !einstellungen.gyro { blickNeigung = klemm(blickNeigung - dy * 2.5, grad(-80), grad(80)) }
    }

    func blickEnde() { ruckSumme = 0 }

    private func gyroUmschalten() {
        if einstellungen.gyro && bildschirm == .spiel && bewegung.isDeviceMotionAvailable {
            bewegung.deviceMotionUpdateInterval = 1 / 60
            bewegung.startDeviceMotionUpdates()
        } else {
            bewegung.stopDeviceMotionUpdates()
        }
    }

    // MARK: - Takt

    private func starteTakt() {
        guard taktgeber == nil else { return }
        let t = Taktgeber { [weak self] dt in self?.takt(dt) }
        t.starte()
        taktgeber = t
    }

    private func takt(_ rohDt: Double) {
        let dt = min(rohDt, 1.0 / 20)
        zeit += dt
        let fdt = Float(dt)

        wendeBlickAn(fdt)

        // Du
        let lava = istLava(ich)
        let eingefroren = (affen[ich]?.eingefrorenBis ?? 0) > zeit
        lokal.steuere(dt: fdt, eingabe: eingabe, welt: welt, eingefroren: eingefroren)
        let aufschlaege = lokal.schritt(dt: fdt, welt: welt, sprungFaktor: lava ? 1.3 : 1.1,
                                        maxTempo: lava ? 8.5 : 6.5, eingefroren: eingefroren)
        for a in aufschlaege {
            klang.aufschlag(a.material, staerke: a.staerke)
            if einstellungen.vibration { haptik.impactOccurred(intensity: CGFloat(min(1, 0.3 + a.staerke))) }
        }
        if lokal.position.y < welt.boden {
            lokal.setzeZurueck(auf: welt.startpunkte.randomElement() ?? V3(0, 1, 0), gier: lokal.gier)
        }
        if var a = affen[ich] {
            a.position = lokal.position
            a.gier = lokal.gier
            a.haende = lokal.haende.map(\.position)
            a.geschwindigkeit = lokal.geschwindigkeit
            a.name = einstellungen.name
            a.farbe = meineFarbe
            a.hut = einstellungen.hut
            a.gesicht = einstellungen.gesicht
            affen[ich] = a
        }

        // Tore im Stumpf und Rückweg
        for tor in welt.tore where tor.enthaelt(lokal.position) {
            klang.tor()
            lade(tor.ziel)
            return
        }

        glaetteEntfernte(fdt)
        pruefeFangen()
        bewegeKugeln(fdt)
        if istMeister { rundenLogik() }
        belohnungen(dt)
        sendeRegelmaessig(dt)
        umgebungsKlang(dt)

        // Bild
        let griff: [Float] = lokal.haende.map { $0.haftet ? 1 : ($0.aktiv ? 0.55 : 0.3) }
        let normalen = lokal.haende.map(\.haftNormale)
        let bilder: [SzeneVerwalter.AffenBild] = affen.values.map { a in
            var bild = SzeneVerwalter.AffenBild(affe: a, lava: istLava(a.id), raus: istRaus(a.id),
                                                ballons: runde.modus == .farbschlacht ? (runde.ballons[a.id] ?? 0) : nil,
                                                zielFarbe: a.istLokal ? zielVon(ich).flatMap { affen[$0]?.farbe } : nil)
            if a.istLokal {
                bild.griff = griff
                bild.normalen = normalen
            }
            return bild
        }
        szene.aktualisiere(affen: bilder, kameraPosition: lokal.position + V3(0, 0.12, 0),
                           gier: lokal.gier, neigung: lokal.blickNeigung, kugeln: kugeln, zeit: zeit)

        hudTakt -= dt
        if hudTakt <= 0 {
            hudTakt = 0.1
            aktualisiereHUD()
        }
    }

    private func wendeBlickAn(_ dt: Float) {
        // Rechter Joystick
        let stick = 0.6 + Float(einstellungen.empfindlichkeit) * 0.1
        if einstellungen.drehModus != .aus { blickGier -= eingabe.rx * 2.6 * stick * dt }
        if !einstellungen.gyro { blickNeigung = klemm(blickNeigung + eingabe.ry * 1.6 * stick * dt, grad(-80), grad(80)) }
        if einstellungen.gyro, let m = bewegung.deviceMotion {
            let g = V3(Float(m.gravity.x), Float(m.gravity.y), Float(m.gravity.z))
            let w = V3(Float(m.rotationRate.x), Float(m.rotationRate.y), Float(m.rotationRate.z))
            let oben = -g.normiert
            if einstellungen.drehModus != .aus { lokal.gier += simd_dot(w, oben) * dt }
            lokal.blickNeigung = klemm(asin(klemm(g.z, -1, 1)), grad(-80), grad(80))
        } else {
            lokal.blickNeigung = blickNeigung
        }
        lokal.gier += blickGier
        blickGier = 0
    }

    // MARK: - Spieler im Raum

    private var menschen: [String] { Array(affen.keys) }

    /// Das Gerät mit der kleinsten ID bestimmt die Runden für alle.
    var istMeister: Bool { menschen.min() == ich }

    // MARK: - Andere Spieler weich bewegen

    private func glaetteEntfernte(_ dt: Float) {
        let k = 1 - exp(-dt * 12)
        for (id, alt) in affen where id != ich {
            var a = alt
            if zeit - a.zuletztGehoert > 6 {
                affen[id] = nil
                continue
            }
            a.zielPosition += a.geschwindigkeit * dt
            a.position = mische(a.position, a.zielPosition, k)
            a.gier += winkelDiff(a.zielGier, a.gier) * k
            if a.zielHaende.count == 2 {
                a.haende = [mische(a.haende[0], a.zielHaende[0], k), mische(a.haende[1], a.zielHaende[1], k)]
            }
            affen[id] = a
        }
    }

    // MARK: - Spielregeln

    func istLava(_ id: String) -> Bool {
        (runde.modus == .infektion || runde.modus == .fangen) && runde.lava.contains(id)
    }

    func istRaus(_ id: String) -> Bool {
        switch runde.modus {
        case .jagd: return runde.raus.contains(id) || runde.ziele[id] == nil
        case .farbschlacht: return (runde.ballons[id] ?? 0) <= 0
        default: return false
        }
    }

    private func zielVon(_ id: String) -> String? {
        guard runde.modus == .jagd, !runde.vorbei else { return nil }
        return runde.ziele[id]
    }

    private func kannFangen(_ t: String, _ o: String) -> Bool {
        if (affen[o]?.eingefrorenBis ?? 0) > zeit { return false }
        switch runde.modus {
        case .infektion: return runde.lava.contains(t) && !runde.lava.contains(o)
        case .fangen: return runde.lava.contains(t)
        case .jagd: return runde.ziele[t] == o && !runde.raus.contains(t)
        case .farbschlacht, .locker: return false
        }
    }

    private func pruefeFangen() {
        guard !runde.vorbei, !runde.wartet, [.infektion, .fangen, .jagd].contains(runde.modus) else { return }
        // Jedes Gerät prüft nur für den eigenen Affen, ob er jemanden erwischt.
        guard let taeger = affen[ich], taeger.eingefrorenBis <= zeit else { return }
        for opfer in affen.values where opfer.id != ich && kannFangen(ich, opfer.id) {
            let mitHand = taeger.haende.contains { simd_length($0 - opfer.position) < 0.48 }
            let mitKoerper = simd_length(taeger.position - opfer.position) < 0.62
            if mitHand || mitKoerper {
                wendeMarkierungAn(ich, opfer.id)
                sende(.markiert(taeger: ich, opfer: opfer.id), zuverlaessig: true)
                return
            }
        }
    }

    private func wendeMarkierungAn(_ t: String, _ o: String) {
        guard kannFangen(t, o) else { return }
        switch runde.modus {
        case .infektion:
            runde.lava.insert(o)
            affen[o]?.eingefrorenBis = zeit + 1.0
        case .fangen:
            runde.lava = [o]
            affen[o]?.eingefrorenBis = zeit + 3.0
        case .jagd:
            runde.raus.insert(o)
            runde.ziele[t] = runde.ziele[o]
            runde.ziele[o] = nil
        default:
            return
        }
        let nameT = affen[t]?.name ?? "?"
        let nameO = affen[o]?.name ?? "?"
        if o == ich {
            klang.gefangen()
            if einstellungen.vibration { haptikStark.impactOccurred() }
            switch runde.modus {
            case .infektion: zeige("DU BIST LAVA! 🔥", sekunden: 2)
            case .fangen: zeige("DU BIST ES! 🔥", sekunden: 2)
            default: zeige("\(nameT) HAT DICH ERWISCHT!", sekunden: 2.5)
            }
        } else if t == ich {
            klang.fangen()
            einstellungen.steine += 2
            zeige("\(nameO) GEFANGEN! +2 💎", sekunden: 1.5)
        } else {
            klang.fernFangen()
        }
    }

    private func starteRunde() {
        guard istMeister else { return }
        runde.nummer += 1
        runde.vorbei = false
        runde.wartet = false
        runde.sieger = nil
        runde.lava = []
        runde.raus = []
        runde.ziele = [:]
        runde.ballons = [:]
        let ids = Array(affen.keys).shuffled()
        switch runde.modus {
        case .infektion, .fangen:
            if let erster = ids.first { runde.lava = [erster] }
        case .jagd:
            for (i, id) in ids.enumerated() where ids.count > 1 { runde.ziele[id] = ids[(i + 1) % ids.count] }
        case .farbschlacht:
            for id in ids { runde.ballons[id] = 3 }
        case .locker:
            break
        }
        rundeGestartet()
        sende(.runde(runde), zuverlaessig: true)
    }

    private func rundeGestartet() {
        guard runde.modus != .locker else { return }
        klang.rundeStart()
        if istLava(ich) {
            zeige(runde.modus == .fangen ? "DU BIST ES! FANG JEMANDEN! 🔥" : "DU BIST LAVA! FANG ALLE! 🔥", sekunden: 3)
        } else {
            zeige("NEUE RUNDE: \(runde.modus.name.uppercased())", sekunden: 2.5)
        }
    }

    private func rundenLogik() {
        // Allein im Raum: frei klettern, bis jemand dazukommt.
        if affen.count < 2 {
            if !runde.wartet {
                let war = runde.modus != .locker && runde.nummer > 0
                runde = Runde(modus: runde.modus, nummer: runde.nummer, wartet: true)
                if war { zeige("DIE ANDEREN SIND WEG – WARTE AUF SPIELER", sekunden: 3) }
            }
            return
        }
        if runde.wartet {
            starteRunde()
            return
        }
        if runde.vorbei {
            if zeit >= naechsteRundeUm { starteRunde() }
            return
        }
        let ids = Set(affen.keys)
        let vorher = runde
        switch runde.modus {
        case .infektion:
            runde.lava = runde.lava.intersection(ids)
            if runde.lava.isEmpty, let neu = ids.randomElement() { runde.lava = [neu] }
            if ids.count >= 2 && ids.isSubset(of: runde.lava) { beende(sieger: nil) }
        case .fangen:
            runde.lava = runde.lava.intersection(ids)
            if runde.lava.isEmpty, let neu = ids.randomElement() { runde.lava = [neu] }
        case .jagd:
            for (j, z) in runde.ziele where !ids.contains(j) || !ids.contains(z) {
                // Jemand ist gegangen: Kette neu schließen
                if !ids.contains(j) {
                    runde.ziele[j] = nil
                    if let vor = runde.ziele.first(where: { $0.value == j })?.key { runde.ziele[vor] = z }
                }
            }
            for (j, z) in runde.ziele where !ids.contains(z) { runde.ziele[j] = nil }
            let lebend = ids.filter { runde.ziele[$0] != nil && !runde.raus.contains($0) }
            if ids.count >= 2 && lebend.count <= 1 { beende(sieger: lebend.first) }
            if ids.count >= 2, let l = lebend.first, runde.ziele[l] == l { beende(sieger: l) }
        case .farbschlacht:
            let lebend = ids.filter { (runde.ballons[$0] ?? 0) > 0 }
            if ids.count >= 2 && lebend.count <= 1 { beende(sieger: lebend.first) }
        case .locker:
            break
        }
        if runde != vorher && !runde.vorbei { sende(.runde(runde), zuverlaessig: true) }
    }

    private func beende(sieger: String?) {
        guard !runde.vorbei else { return }
        runde.vorbei = true
        runde.sieger = sieger
        naechsteRundeUm = zeit + 6
        rundeBeendet()
        sende(.runde(runde), zuverlaessig: true)
    }

    private func rundeBeendet() {
        klang.rundeEnde()
        if runde.modus == .infektion {
            zeige("ALLE SIND LAVA! NEUE RUNDE GLEICH …", sekunden: 4)
        } else if let s = runde.sieger {
            if s == ich {
                einstellungen.steine += 10
                zeige("DU HAST GEWONNEN! +10 💎", sekunden: 4)
            } else {
                zeige("\(affen[s]?.name ?? "?") HAT GEWONNEN!", sekunden: 4)
            }
        }
    }

    private func belohnungen(_ dt: Double) {
        guard [.infektion, .fangen].contains(runde.modus), !runde.vorbei, !istLava(ich) else { return }
        belohnungTakt += dt
        if belohnungTakt >= 30 {
            belohnungTakt = 0
            einstellungen.steine += 1
        }
    }

    // MARK: - Farbschlacht

    func schiessen() {
        guard runde.modus == .farbschlacht, !runde.vorbei, !istRaus(ich), zeit >= schleuderBereit else { return }
        schleuderBereit = zeit + 0.45
        let r = V3(-sin(lokal.gier) * cos(lokal.blickNeigung), sin(lokal.blickNeigung), -cos(lokal.gier) * cos(lokal.blickNeigung))
        feuere(von: ich, start: lokal.position + V3(0, 0.1, 0) + r * 0.4, richtung: r, farbe: meineFarbe)
    }

    private func feuere(von: String, start: V3, richtung: V3, farbe: V3) {
        naechsteKugelID += 1
        let mitflug = affen[von]?.geschwindigkeit ?? .zero
        let k = Farbkugel(id: naechsteKugelID &* 31 &+ abs(von.hashValue % 100_000), von: von, position: start,
                          geschwindigkeit: richtung * 22 + mitflug * 0.5, farbe: farbe)
        kugeln.append(k)
        klang.schuss()
        sende(.schuss(k), zuverlaessig: false)
    }

    private func bewegeKugeln(_ dt: Float) {
        var bleiben: [Farbkugel] = []
        for var k in kugeln {
            k.alter += dt
            k.geschwindigkeit.y -= 9.81 * 0.5 * dt
            k.position += k.geschwindigkeit * dt
            if k.alter > 3 { continue }
            if welt.punktInnen(k.position) != nil {
                szene.klecks(k.position, k.farbe)
                continue
            }
            let entscheide = k.von == ich
            var getroffen = false
            for a in affen.values where a.id != k.von && !istRaus(a.id) {
                if simd_length(a.position - k.position) < 0.45 {
                    getroffen = true
                    if entscheide {
                        wendeTrefferAn(k.von, a.id)
                        sende(.treffer(schuetze: k.von, opfer: a.id), zuverlaessig: true)
                    }
                    break
                }
            }
            if !getroffen { bleiben.append(k) }
        }
        kugeln = bleiben
    }

    private func wendeTrefferAn(_ s: String, _ o: String) {
        guard runde.modus == .farbschlacht, !runde.vorbei, (runde.ballons[o] ?? 0) > 0 else { return }
        runde.ballons[o, default: 0] -= 1
        klang.platzen()
        if o == ich {
            if einstellungen.vibration { haptikStark.impactOccurred() }
            zeige((runde.ballons[o] ?? 0) == 0 ? "ALLE BALLONS WEG – DU BIST RAUS!" : "BALLON GEPLATZT!", sekunden: 1.8)
        } else if s == ich {
            einstellungen.steine += 1
            zeige("TREFFER! +1 💎", sekunden: 1)
        }
    }

    // MARK: - Netz

    func verbinde() {
        trenne()
        guard bildschirm == .spiel, einstellungen.verbindung != .aus else {
            netzStatus = .aus
            return
        }
        let schluessel: String
        if let c = raumCode {
            schluessel = "PRIV-\(c)-\(karte.rawValue)"
        } else {
            schluessel = "OEFF-\(karte.rawValue)-\(runde.modus.rawValue)-\(einstellungen.warteschlange.rawValue)"
        }
        let online = einstellungen.verbindung == .online && !notfallNah
        let t: NetzTransport = online ? OnlineNetz() : NahNetz(name: einstellungen.name)
        t.beimEmpfang = { [weak self] daten in self?.empfange(daten) }
        t.beiStatus = { [weak self] status in
            guard let self else { return }
            self.netzStatus = status
            // Kein Game Center (z. B. nicht angemeldet): dann wenigstens Geräte in der Nähe suchen.
            if online, case .fehler = status, !self.notfallNah {
                self.notfallNah = true
                self.verbinde()
            }
        }
        netz = t
        t.starte(raum: schluessel)
    }

    /// Karte wechseln – im privaten Raum kommen alle Freunde mit.
    func gruppeNach(_ k: KartenID) {
        guard bildschirm == .spiel else {
            spielen(k)
            return
        }
        if raumCode != nil { sende(.gruppe(k), zuverlaessig: true) }
        lade(k)
    }

    /// Privaten Raum betreten (oder mit nil verlassen).
    func raumBetreten(_ code: String?) {
        let c = code?.trimmingCharacters(in: .whitespaces).uppercased()
        raumCode = (c?.isEmpty ?? true) ? nil : c
        verbinde()
        zeige(raumCode.map { "RAUM \($0) BETRETEN" } ?? "ÖFFENTLICHER RAUM", sekunden: 2)
    }

    func trenne() {
        if netz != nil { sende(.tschuess(ich), zuverlaessig: true) }
        netz?.stoppe()
        netz = nil
        netzStatus = .aus
        for id in affen.keys where id != ich { affen[id] = nil }
    }

    private func sende(_ inhalt: Inhalt, zuverlaessig: Bool) {
        guard let netz else { return }
        let p = Paket(von: ich, karte: karte, inhalt: inhalt)
        if let daten = try? JSONEncoder().encode(p) { netz.sende(daten, zuverlaessig: zuverlaessig) }
    }

    private func daten(_ a: Affe) -> AffenDaten {
        AffenDaten(id: a.id, name: a.name, farbe: a.farbe, hut: a.hut, gesicht: a.gesicht,
                   p: a.position, g: a.gier, h: a.haende, v: a.geschwindigkeit)
    }

    private func sendeRegelmaessig(_ dt: Double) {
        guard netz != nil else { return }
        sendeTakt -= dt
        if sendeTakt <= 0 {
            sendeTakt = 1.0 / 15
            if let a = affen[ich] { sende(.affe(daten(a)), zuverlaessig: false) }
        }
        rundeSendeTakt -= dt
        if rundeSendeTakt <= 0 {
            rundeSendeTakt = 2
            if istMeister { sende(.runde(runde), zuverlaessig: true) }
        }
    }

    private func empfange(_ roh: Data) {
        guard let p = try? JSONDecoder().decode(Paket.self, from: roh), p.von != ich, p.karte == karte else { return }
        switch p.inhalt {
        case .affe(let d):
            let neu = affen[d.id] == nil
            uebernimm(d)
            if neu {
                klang.beitreten()
                zeige("\(d.name) IST DA", sekunden: 1.5)
                // Ein neuer Spieler bekommt sofort den Rundenstand.
                if istMeister { sende(.runde(runde), zuverlaessig: true) }
            }
        case .gruppe(let ziel):
            // Ein Freund im selben privaten Raum nimmt alle mit auf eine Karte.
            guard raumCode != nil, ziel != karte else { return }
            let wer = affen[p.von]?.name ?? "DEINE GRUPPE"
            klang.tor()
            lade(ziel)
            zeige("\(wer) HAT EUCH NACH \(ziel.name.uppercased()) MITGENOMMEN", sekunden: 3)
        case .runde(let r):
            guard !istMeister else { return }
            let alt = runde
            runde = r
            if r.nummer != alt.nummer && !r.vorbei { rundeGestartet() }
            if r.vorbei && !alt.vorbei { rundeBeendet() }
        case .markiert(let t, let o):
            wendeMarkierungAn(t, o)
        case .schuss(let k):
            kugeln.append(k)
        case .treffer(let s, let o):
            wendeTrefferAn(s, o)
        case .tschuess(let id):
            affen[id] = nil
        }
    }

    private func uebernimm(_ d: AffenDaten) {
        var a = affen[d.id] ?? Affe(id: d.id, name: d.name, farbe: d.farbe, istLokal: false, position: d.p)
        a.name = d.name
        a.farbe = d.farbe
        a.hut = d.hut
        a.gesicht = d.gesicht
        a.zielPosition = d.p
        a.zielGier = d.g
        a.zielHaende = d.h
        a.geschwindigkeit = d.v
        a.zuletztGehoert = zeit
        if simd_length(a.position - d.p) > 6 { a.position = d.p; a.haende = d.h }
        affen[d.id] = a
    }

    // MARK: - Laden

    func kaufe(_ k: Kosmetik) -> Bool {
        if einstellungen.besitz.contains(k.id) { return true }
        guard einstellungen.steine >= k.preis else { return false }
        einstellungen.steine -= k.preis
        einstellungen.besitz.append(k.id)
        return true
    }

    func trage(_ k: Kosmetik) {
        switch k.art {
        case .hut: einstellungen.hut = einstellungen.hut == k.id ? nil : k.id
        case .gesicht: einstellungen.gesicht = einstellungen.gesicht == k.id ? nil : k.id
        }
    }

    // MARK: - Anzeige

    func zeige(_ text: String, sekunden: Double) {
        hud.meldung = text
        meldungBis = zeit + sekunden
    }

    private func umgebungsKlang(_ dt: Double) {
        guard [.wald, .strand, .stumpf].contains(karte) else { return }
        vogelTakt -= dt
        if vogelTakt <= 0 {
            vogelTakt = Double.random(in: 3...9)
            klang.vogel()
        }
    }

    private func aktualisiereHUD() {
        if hud.meldung != nil && zeit > meldungBis { hud.meldung = nil }
        let lava = istLava(ich)
        if hud.istLava != lava { hud.istLava = lava }
        let eingefroren = (affen[ich]?.eingefrorenBis ?? 0) > zeit
        if hud.eingefroren != eingefroren { hud.eingefroren = eingefroren }
        let nahePC = welt.computer.map { simd_length($0 - lokal.position) < 2.6 } ?? false
        if hud.amComputer != nahePC { hud.amComputer = nahePC }
        let raus = istRaus(ich)
        if hud.raus != raus { hud.raus = raus }

        let zeilen = affen.values
            .map { SpielerZeile(id: $0.id, name: $0.name, farbe: $0.farbe, lava: istLava($0.id), raus: istRaus($0.id),
                                ich: $0.id == ich) }
            .sorted { ($0.ich ? 0 : 1, $0.name) < ($1.ich ? 0 : 1, $1.name) }
        if hud.spieler != zeilen { hud.spieler = zeilen }

        var unter = "\(karte.symbol) \(karte.name.uppercased()) · \(runde.modus.name.uppercased())"
        if runde.wartet && runde.modus != .locker { unter += " · WARTE AUF 2. SPIELER" }
        if let c = raumCode { unter += " · RAUM \(c)" }
        if hud.unterzeile != unter { hud.unterzeile = unter }
        var netzText = einstellungen.verbindung == .aus ? "Offline · du spielst allein" : netzStatus.text
        if notfallNah { netzText = "Game Center aus · " + netzText }
        if affen.count < 2 && einstellungen.verbindung != .aus { netzText += " · bis dahin kletterst du allein" }
        if hud.netz != netzText { hud.netz = netzText }
        if hud.steine != einstellungen.steine { hud.steine = einstellungen.steine }

        let ballons = runde.modus == .farbschlacht ? (runde.ballons[ich] ?? 0) : nil
        if hud.ballons != ballons { hud.ballons = ballons }

        if let z = zielVon(ich), let ziel = affen[z] {
            hud.zielName = ziel.name
            hud.zielFarbe = ziel.farbe
            let d = (ziel.position - lokal.position).flach
            hud.zielWinkel = Double(winkelDiff(lokal.gier, gierZu(d)))
        } else if hud.zielName != nil {
            hud.zielName = nil
            hud.zielFarbe = nil
        }
    }
}

/// Ruft 60-mal pro Sekunde zurück (CADisplayLink braucht ein NSObject-Ziel).
final class Taktgeber: NSObject {
    private let aktion: (Double) -> Void
    private var link: CADisplayLink?
    private var zuletzt: CFTimeInterval = 0

    init(_ aktion: @escaping (Double) -> Void) {
        self.aktion = aktion
    }

    func starte() {
        let l = CADisplayLink(target: self, selector: #selector(tick(_:)))
        l.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 60, preferred: 60)
        l.add(to: .main, forMode: .common)
        link = l
        zuletzt = CACurrentMediaTime()
    }

    func stoppe() {
        link?.invalidate()
        link = nil
    }

    @objc private func tick(_ l: CADisplayLink) {
        let jetzt = l.timestamp
        let dt = zuletzt == 0 ? 1.0 / 60 : jetzt - zuletzt
        zuletzt = jetzt
        aktion(max(0, dt))
    }
}
