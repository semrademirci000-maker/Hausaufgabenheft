//
//  NahNetz.swift
//  Mehrspieler ohne Server: Geräte in der Nähe finden sich über WLAN und
//  Bluetooth (MultipeerConnectivity). iPhone + iPad im selben Raum reicht.
//
//  Jedes Gerät sucht und wird gefunden. Nur wer den gleichen Raum-Schlüssel
//  hat (z. B. „OEFF-WALD-INFEKTION“ oder einen Code), wird eingeladen.
//

import Foundation
import MultipeerConnectivity

final class NahNetz: NSObject, NetzTransport {
    static let dienst = "affen-tag"

    var beimEmpfang: ((Data) -> Void)?
    var beiStatus: ((NetzStatus) -> Void)?

    private let ich: MCPeerID
    private var sitzung: MCSession?
    private var werber: MCNearbyServiceAdvertiser?
    private var sucher: MCNearbyServiceBrowser?
    private var raum = ""

    init(name: String) {
        let kurz = String(name.prefix(16))
        ich = MCPeerID(displayName: "\(kurz)-\(UUID().uuidString.prefix(6))")
    }

    func starte(raum: String) {
        stoppe()
        self.raum = raum
        let s = MCSession(peer: ich, securityIdentity: nil, encryptionPreference: .none)
        s.delegate = self
        sitzung = s

        let w = MCNearbyServiceAdvertiser(peer: ich, discoveryInfo: ["raum": String(raum.prefix(60))], serviceType: NahNetz.dienst)
        w.delegate = self
        w.startAdvertisingPeer()
        werber = w

        let b = MCNearbyServiceBrowser(peer: ich, serviceType: NahNetz.dienst)
        b.delegate = self
        b.startBrowsingForPeers()
        sucher = b
        melde(.verbunden(0))
    }

    func sende(_ daten: Data, zuverlaessig: Bool) {
        guard let s = sitzung, !s.connectedPeers.isEmpty else { return }
        try? s.send(daten, toPeers: s.connectedPeers, with: zuverlaessig ? .reliable : .unreliable)
    }

    func stoppe() {
        werber?.stopAdvertisingPeer()
        sucher?.stopBrowsingForPeers()
        sitzung?.disconnect()
        werber = nil
        sucher = nil
        sitzung = nil
    }

    private func melde(_ s: NetzStatus) {
        DispatchQueue.main.async { [weak self] in self?.beiStatus?(s) }
    }
}

extension NahNetz: MCSessionDelegate {
    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        melde(.verbunden(session.connectedPeers.count))
    }

    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        DispatchQueue.main.async { [weak self] in self?.beimEmpfang?(data) }
    }

    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}

    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String,
                 fromPeer peerID: MCPeerID, with progress: Progress) {}

    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String,
                 fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

extension NahNetz: MCNearbyServiceAdvertiserDelegate {
    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID,
                    withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        let passt = context.flatMap { String(data: $0, encoding: .utf8) } == String(raum.prefix(60))
        invitationHandler(passt, passt ? sitzung : nil)
    }

    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didNotStartAdvertisingPeer error: Error) {
        melde(.fehler("WLAN/Bluetooth nicht verfügbar"))
    }
}

extension NahNetz: MCNearbyServiceBrowserDelegate {
    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String: String]?) {
        guard let s = sitzung, info?["raum"] == String(raum.prefix(60)), peerID != ich,
              !s.connectedPeers.contains(peerID) else { return }
        // Nur einer von beiden lädt ein, sonst kreuzen sich die Einladungen.
        guard ich.displayName < peerID.displayName else { return }
        browser.invitePeer(peerID, to: s, withContext: String(raum.prefix(60)).data(using: .utf8), timeout: 12)
    }

    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {}

    func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) {
        melde(.fehler("WLAN/Bluetooth nicht verfügbar"))
    }
}
