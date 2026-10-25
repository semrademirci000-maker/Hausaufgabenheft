//
//  Geraete.swift
//  Controller (Xbox, PlayStation, MFi) und Hardware-Tastatur – einfach verbinden und losspielen.
//
//  Controller: linker Stick laufen, rechter Stick umschauen, A springen, RT festhalten (E),
//  LT sprinten, B zurück (R), X Lampe (F), Y Hände hoch (1), Steuerkreuz 1–4,
//  LB/RB linke/rechte Hand (4/2), Optionen = TAB, Menü = ESC.
//  Tastatur: W A S D laufen, Pfeiltasten umschauen, Leertaste springen, ⇧ sprinten,
//  E festhalten, R zurück, F Lampe, Tab Spielerliste, Esc Menü, 1–4 Hände.
//

import GameController

final class Geraete {
    /// Stick-Werte von Controller/Tastatur (je −1…1, y nach oben)
    private(set) var lx: Float = 0
    private(set) var ly: Float = 0
    private(set) var rx: Float = 0
    private(set) var ry: Float = 0
    /// Ist gerade ein Controller oder eine Tastatur verbunden?
    private(set) var verbunden = false
    /// Meldet „Controller verbunden“ usw.
    var meldung: ((String) -> Void)?

    private var vorher: [Spiel.Taste: Bool] = [:]
    private var beobachter: [NSObjectProtocol] = []

    init() {
        let nc = NotificationCenter.default
        beobachter.append(nc.addObserver(forName: .GCControllerDidConnect, object: nil, queue: .main) { [weak self] _ in
            self?.meldung?("CONTROLLER VERBUNDEN")
        })
        beobachter.append(nc.addObserver(forName: .GCKeyboardDidConnect, object: nil, queue: .main) { [weak self] _ in
            self?.meldung?("TASTATUR VERBUNDEN")
        })
        GCController.startWirelessControllerDiscovery {}
    }

    deinit {
        for b in beobachter { NotificationCenter.default.removeObserver(b) }
        GCController.stopWirelessControllerDiscovery()
    }

    /// Einmal pro Takt abfragen. Gibt die Tasten zurück, die sich geändert haben (gedrückt/losgelassen).
    func abfragen() -> [(Spiel.Taste, Bool)] {
        var gedrueckt: [Spiel.Taste: Bool] = [:]
        lx = 0; ly = 0; rx = 0; ry = 0
        verbunden = false

        for c in GCController.controllers() {
            guard let p = c.extendedGamepad else { continue }
            verbunden = true
            lx = lx != 0 ? lx : tot(p.leftThumbstick.xAxis.value)
            ly = ly != 0 ? ly : tot(p.leftThumbstick.yAxis.value)
            rx = rx != 0 ? rx : tot(p.rightThumbstick.xAxis.value)
            ry = ry != 0 ? ry : tot(p.rightThumbstick.yAxis.value)
            let belegung: [(GCControllerButtonInput?, Spiel.Taste)] = [
                (p.buttonA, .leer), (p.buttonB, .r), (p.buttonX, .f), (p.buttonY, .eins),
                (p.leftShoulder, .vier), (p.rightShoulder, .zwei),
                (p.leftTrigger, .shift), (p.rightTrigger, .e),
                (p.buttonOptions, .tab), (p.buttonMenu, .esc),
                (p.dpad.up, .eins), (p.dpad.down, .drei), (p.dpad.left, .vier), (p.dpad.right, .zwei),
            ]
            for (knopf, taste) in belegung where knopf?.isPressed == true { gedrueckt[taste] = true }
        }

        if let k = GCKeyboard.coalesced?.keyboardInput {
            verbunden = true
            func an(_ code: GCKeyCode) -> Bool { k.button(forKeyCode: code)?.isPressed ?? false }
            let kx = (an(.keyD) ? 1 : 0) - (an(.keyA) ? 1 : 0)
            let ky = (an(.keyW) ? 1 : 0) - (an(.keyS) ? 1 : 0)
            if lx == 0 { lx = Float(kx) }
            if ly == 0 { ly = Float(ky) }
            let px = (an(.rightArrow) ? 1 : 0) - (an(.leftArrow) ? 1 : 0)
            let py = (an(.upArrow) ? 1 : 0) - (an(.downArrow) ? 1 : 0)
            if rx == 0 { rx = Float(px) * 0.75 }
            if ry == 0 { ry = Float(py) * 0.75 }
            let belegung: [(GCKeyCode, Spiel.Taste)] = [
                (.spacebar, .leer), (.leftShift, .shift), (.rightShift, .shift), (.keyE, .e),
                (.keyR, .r), (.keyF, .f), (.tab, .tab), (.escape, .esc),
                (.one, .eins), (.two, .zwei), (.three, .drei), (.four, .vier),
            ]
            for (code, taste) in belegung where an(code) { gedrueckt[taste] = true }
        }

        // Nur Änderungen melden – wie ein Finger, der eine Taste drückt oder loslässt
        var aenderungen: [(Spiel.Taste, Bool)] = []
        for taste in Set(gedrueckt.keys).union(vorher.keys) {
            let jetzt = gedrueckt[taste] ?? false
            if jetzt != (vorher[taste] ?? false) { aenderungen.append((taste, jetzt)) }
        }
        vorher = gedrueckt
        return aenderungen
    }

    private func tot(_ x: Float) -> Float {
        abs(x) < 0.15 ? 0 : (x - (x > 0 ? 0.15 : -0.15)) / 0.85
    }
}
