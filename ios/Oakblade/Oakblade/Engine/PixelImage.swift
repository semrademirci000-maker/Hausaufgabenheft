//
//  PixelImage.swift
//  Ein winziges Malprogramm: Bilder werden Pixel für Pixel im Speicher gebaut.
//  So braucht das Spiel keine einzige Bilddatei.
//

import CoreGraphics
import Foundation

/// Eine Farbe mit Rot, Grün, Blau und Deckkraft.
struct RGBA {
    var r: UInt8
    var g: UInt8
    var b: UInt8
    var a: UInt8

    init(r: UInt8, g: UInt8, b: UInt8, a: UInt8 = 255) {
        self.r = r; self.g = g; self.b = b; self.a = a
    }

    /// Farbe wie im Web schreiben: RGBA(0x4b8f46)
    init(_ hex: UInt32) {
        r = UInt8((hex >> 16) & 0xFF)
        g = UInt8((hex >> 8) & 0xFF)
        b = UInt8(hex & 0xFF)
        a = 255
    }

    static let clear = RGBA(r: 0, g: 0, b: 0, a: 0)
}

/// Immer gleicher Zufall – damit der Wald bei jedem Start gleich aussieht.
struct Rand {
    private var state: UInt32

    init(_ seed: UInt32) { state = seed }

    mutating func next() -> Double {
        state = state &* 1_664_525 &+ 1_013_904_223
        return Double(state) / 4_294_967_296.0
    }

    mutating func int(_ upperBound: Int) -> Int {
        max(0, min(upperBound - 1, Int(next() * Double(upperBound))))
    }

    mutating func chance(_ p: Double) -> Bool { next() < p }
}

/// Ein Bild aus einzelnen Pixeln.
final class PixelImage {
    let width: Int
    let height: Int
    private var bytes: [UInt8]          // je Pixel vier Werte: R, G, B, Deckkraft

    init(_ width: Int, _ height: Int) {
        self.width = max(1, width)
        self.height = max(1, height)
        bytes = [UInt8](repeating: 0, count: self.width * self.height * 4)
    }

    // MARK: Malen

    func set(_ x: Int, _ y: Int, _ color: RGBA) {
        guard color.a > 0, x >= 0, y >= 0, x < width, y < height else { return }
        let i = (y * width + x) * 4
        bytes[i] = color.r
        bytes[i + 1] = color.g
        bytes[i + 2] = color.b
        bytes[i + 3] = color.a
    }

    func fill(_ x: Int, _ y: Int, _ w: Int, _ h: Int, _ color: RGBA) {
        guard w > 0, h > 0 else { return }
        for yy in y..<(y + h) {
            for xx in x..<(x + w) {
                set(xx, yy, color)
            }
        }
    }

    func fillAll(_ color: RGBA) { fill(0, 0, width, height, color) }

    /// Ein runder Klecks – daraus werden Baumkronen und Büsche.
    func circle(_ cx: Int, _ cy: Int, _ r: Int, _ color: RGBA) {
        guard r > 0 else { return }
        for y in -r...r {
            for x in -r...r {
                if x * x + y * y <= r * r { set(cx + x, cy + y, color) }
            }
        }
    }

    /// Ein anderes Bild hineinkopieren (durchsichtige Pixel bleiben frei).
    /// Arbeitet direkt auf den Zahlenreihen – das geht deutlich schneller.
    func blit(_ other: PixelImage, _ x: Int, _ y: Int) {
        for sy in 0..<other.height {
            let dy = y + sy
            if dy < 0 || dy >= height { continue }
            var source = sy * other.width * 4
            var target = (dy * width + x) * 4
            for sx in 0..<other.width {
                let dx = x + sx
                if dx >= 0, dx < width, other.bytes[source + 3] > 0 {
                    bytes[target] = other.bytes[source]
                    bytes[target + 1] = other.bytes[source + 1]
                    bytes[target + 2] = other.bytes[source + 2]
                    bytes[target + 3] = other.bytes[source + 3]
                }
                source += 4
                target += 4
            }
        }
    }

    func pixel(_ x: Int, _ y: Int) -> RGBA {
        guard x >= 0, y >= 0, x < width, y < height else { return .clear }
        let i = (y * width + x) * 4
        return RGBA(r: bytes[i], g: bytes[i + 1], b: bytes[i + 2], a: bytes[i + 3])
    }

    // MARK: Umformen

    func flippedHorizontally() -> PixelImage {
        let out = PixelImage(width, height)
        for y in 0..<height {
            for x in 0..<width {
                out.set(width - 1 - x, y, pixel(x, y))
            }
        }
        return out
    }

    /// Eine ganz weiße Kopie – dafür blitzt ein getroffener Zombie auf.
    func whiteCopy() -> PixelImage {
        let out = PixelImage(width, height)
        for y in 0..<height {
            for x in 0..<width {
                if pixel(x, y).a > 0 { out.set(x, y, RGBA(0xFFFFFF)) }
            }
        }
        return out
    }

    // MARK: Aus Textzeilen bauen

    /// Jedes Zeichen ist ein Pixel, '.' bleibt durchsichtig.
    static func from(rows: [String], palette: [Character: RGBA]) -> PixelImage {
        let w = rows.map { $0.count }.max() ?? 1
        let img = PixelImage(w, rows.count)
        for (y, row) in rows.enumerated() {
            for (x, ch) in row.enumerated() {
                if ch == "." || ch == " " { continue }
                if let color = palette[ch] { img.set(x, y, color) }
            }
        }
        return img
    }

    // MARK: Fertiges Bild

    func cgImage() -> CGImage {
        let info = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)
        let data = Data(bytes)
        guard let provider = CGDataProvider(data: data as CFData),
              let image = CGImage(width: width,
                                  height: height,
                                  bitsPerComponent: 8,
                                  bitsPerPixel: 32,
                                  bytesPerRow: width * 4,
                                  space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: info,
                                  provider: provider,
                                  decode: nil,
                                  shouldInterpolate: false,
                                  intent: .defaultIntent)
        else {
            // Notfalls ein einzelner durchsichtiger Pixel.
            let fallback = CGContext(data: nil, width: 1, height: 1, bitsPerComponent: 8,
                                     bytesPerRow: 4, space: CGColorSpaceCreateDeviceRGB(),
                                     bitmapInfo: info.rawValue)
            return fallback!.makeImage()!
        }
        return image
    }
}
