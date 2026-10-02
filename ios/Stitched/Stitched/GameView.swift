import SwiftUI
import WebKit

/// Zeigt das 3D-Spiel (Three.js, Ordner `Game`) in einem WKWebView an.
/// Die Dateien werden über ein eigenes URL-Schema (`stitched://`) direkt aus dem App-Bundle
/// geliefert – so funktionieren JavaScript-Module auch komplett offline.
struct GameView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.isElementFullscreenEnabled = true

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.pinchGestureRecognizer?.isEnabled = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsBackForwardNavigationGestures = false
        #if DEBUG
        web.isInspectable = true // Safari → Entwickler → Gerät, zum Fehlersuchen
        #endif

        web.uiDelegate = context.coordinator
        web.load(URLRequest(url: URL(string: "\(BundleSchemeHandler.scheme)://game/index.html")!))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    /// Erlaubt dem Sprecher-Studio das Mikrofon (iOS fragt trotzdem einmal nach).
    final class Coordinator: NSObject, WKUIDelegate {
        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(type == .microphone ? .grant : .deny)
        }
    }
}

/// Liefert Dateien aus dem App-Bundle mit dem richtigen MIME-Typ aus.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "stitched"

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        while path.hasPrefix("/") { path.removeFirst() }
        if path.isEmpty { path = "index.html" }

        guard let fileURL = Self.locate(path), let data = try? Data(contentsOf: fileURL) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let headers = [
            "Content-Type": Self.mimeType(for: fileURL.pathExtension),
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ]
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    /// Sucht zuerst im Unterordner `Game`, dann direkt im Bundle.
    /// (Xcode legt Ressourcen aus synchronisierten Ordnern teils flach ins Bundle.)
    static func locate(_ path: String) -> URL? {
        guard let base = Bundle.main.resourceURL else { return nil }
        let candidates = [
            base.appendingPathComponent("Game").appendingPathComponent(path),
            base.appendingPathComponent(path),
            base.appendingPathComponent((path as NSString).lastPathComponent),
        ]
        return candidates.first { FileManager.default.fileExists(atPath: $0.path) }
    }

    static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json"
        case "png": return "image/png"
        case "svg": return "image/svg+xml"
        default: return "application/octet-stream"
        }
    }
}
