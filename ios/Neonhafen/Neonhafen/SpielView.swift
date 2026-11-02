import SwiftUI
import UIKit
import WebKit

/// Zeigt das Spiel aus dem App-Bundle im Vollbild.
struct SpielView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // Brücke für Vibration: das Spiel ruft window.webkit.messageHandlers.haptic.postMessage("heavy")
        config.userContentController.add(context.coordinator, name: "haptic")

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .nacht
        web.scrollView.backgroundColor = .nacht
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never   // Safe-Area regelt das Spiel selbst (env(safe-area-inset-*))
        web.scrollView.delegate = context.coordinator            // verhindert Zoomen mit zwei Fingern
        web.allowsLinkPreview = false
        web.navigationDelegate = context.coordinator
        if #available(iOS 16.4, *) { web.isInspectable = true }

        if let url = Bundle.main.url(forResource: "neonhafen", withExtension: "html") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else {
            web.loadHTMLString("<body style='background:#0b1018;color:#fff;font:20px -apple-system;padding:40px'>Spieldatei fehlt. Bitte <code>python3 spiel-einbauen.py</code> ausführen.</body>", baseURL: nil)
        }
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "haptic")
    }

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate, UIScrollViewDelegate {
        private let leicht = UIImpactFeedbackGenerator(style: .light)
        private let mittel = UIImpactFeedbackGenerator(style: .medium)
        private let stark = UIImpactFeedbackGenerator(style: .heavy)

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.body as? String {
            case "heavy": stark.impactOccurred()
            case "medium": mittel.impactOccurred()
            default: leicht.impactOccurred(intensity: 0.6)
            }
        }

        func viewForZooming(in scrollView: UIScrollView) -> UIView? { nil }

        /// Falls iOS den Web-Prozess beendet (z. B. Speicher knapp): neu laden, Spielstand liegt im localStorage.
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }
    }
}
