//
//  OnlineNetz.swift
//  Mehrspieler übers Internet mit Game Center (GameKit).
//  Alle mit demselben Raum-Schlüssel landen in derselben „Spielergruppe“.
//
//  Damit das klappt, muss in Xcode unter „Signing & Capabilities“ die
//  Fähigkeit „Game Center“ eingeschaltet sein (siehe README).
//

import Foundation
import GameKit
import UIKit

final class OnlineNetz: NSObject, NetzTransport {
    var beimEmpfang: ((Data) -> Void)?
    var beiStatus: ((NetzStatus) -> Void)?

    private var spiel: GKMatch?
    private var raum = ""
    private var aktiv = false

    func starte(raum: String) {
        stoppe()
        self.raum = raum
        aktiv = true
        beiStatus?(.suche)
        let ich = GKLocalPlayer.local
        if ich.isAuthenticated {
            suche()
            return
        }
        ich.authenticateHandler = { [weak self] anmeldung, _ in
            DispatchQueue.main.async {
                guard let self, self.aktiv else { return }
                if let anmeldung {
                    OnlineNetz.zeige(anmeldung)
                } else if GKLocalPlayer.local.isAuthenticated {
                    self.suche()
                } else {
                    self.beiStatus?(.fehler("Game Center: nicht angemeldet"))
                }
            }
        }
    }

    private func suche() {
        let anfrage = GKMatchRequest()
        anfrage.minPlayers = 2
        anfrage.maxPlayers = min(10, GKMatchRequest.maxPlayersAllowedForMatch(of: .peerToPeer))
        anfrage.playerGroup = OnlineNetz.gruppe(raum)
        GKMatchmaker.shared().findMatch(for: anfrage) { [weak self] gefunden, fehler in
            DispatchQueue.main.async {
                guard let self, self.aktiv else { return }
                if let gefunden {
                    self.spiel = gefunden
                    gefunden.delegate = self
                    self.beiStatus?(.verbunden(gefunden.players.count))
                } else {
                    self.beiStatus?(.fehler("Game Center: \(fehler?.localizedDescription ?? "kein Spiel gefunden")"))
                }
            }
        }
    }

    func sende(_ daten: Data, zuverlaessig: Bool) {
        try? spiel?.sendData(toAllPlayers: daten, with: zuverlaessig ? .reliable : .unreliable)
    }

    func stoppe() {
        aktiv = false
        GKMatchmaker.shared().cancel()
        spiel?.disconnect()
        spiel?.delegate = nil
        spiel = nil
    }

    /// Gleiche Zahl auf allen Geräten für denselben Raum.
    private static func gruppe(_ text: String) -> Int {
        var h: UInt32 = 2_166_136_261
        for b in text.utf8 { h = (h ^ UInt32(b)) &* 16_777_619 }
        return Int(h & 0x7fff_ffff)
    }

    private static func zeige(_ vc: UIViewController) {
        let fenster = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }
        var oben = fenster?.rootViewController
        while let weiter = oben?.presentedViewController { oben = weiter }
        oben?.present(vc, animated: true)
    }
}

extension OnlineNetz: GKMatchDelegate {
    func match(_ match: GKMatch, didReceive data: Data, fromRemotePlayer player: GKPlayer) {
        DispatchQueue.main.async { [weak self] in self?.beimEmpfang?(data) }
    }

    func match(_ match: GKMatch, player: GKPlayer, didChange state: GKPlayerConnectionState) {
        DispatchQueue.main.async { [weak self] in self?.beiStatus?(.verbunden(match.players.count)) }
    }
}
