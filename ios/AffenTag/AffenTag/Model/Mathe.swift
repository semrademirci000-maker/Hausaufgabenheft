//
//  Mathe.swift
//  Kleine Rechenhilfen für Vektoren und Winkel.
//
//  Koordinaten wie in SceneKit: x nach rechts, y nach oben, Blick nach −z.
//  „Gier“ ist die Drehung um die senkrechte Achse (wie eulerAngles.y).
//

import Foundation
import simd

typealias V3 = SIMD3<Float>

extension SIMD3 where Scalar == Float {
    var laenge: Float { simd_length(self) }
    var flach: V3 { V3(x, 0, z) }
    var normiert: V3 {
        let l = simd_length(self)
        return l > 1e-5 ? self / l : .zero
    }
}

/// Dreht einen Vektor um die y-Achse – genau wie SceneKit einen Knoten mit eulerAngles.y.
func drehY(_ v: V3, _ winkel: Float) -> V3 {
    let c = cos(winkel), s = sin(winkel)
    return V3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z)
}

/// Blickrichtung (flach) für eine Gier.
func vorne(_ gier: Float) -> V3 { V3(-sin(gier), 0, -cos(gier)) }

/// Gier, mit der man in Richtung `r` schaut.
func gierZu(_ r: V3) -> Float { atan2(-r.x, -r.z) }

func klemm<T: Comparable>(_ v: T, _ lo: T, _ hi: T) -> T { min(max(v, lo), hi) }

func grad(_ g: Float) -> Float { g * .pi / 180 }

/// Kleinster Unterschied zweier Winkel (−π…π).
func winkelDiff(_ a: Float, _ b: Float) -> Float {
    var d = (a - b).truncatingRemainder(dividingBy: 2 * .pi)
    if d > .pi { d -= 2 * .pi }
    if d < -.pi { d += 2 * .pi }
    return d
}

func mische(_ a: V3, _ b: V3, _ t: Float) -> V3 { a + (b - a) * t }

/// Ein kleiner, reproduzierbarer Zufallsgenerator – alle Geräte bauen damit
/// dieselbe Karte, ohne sie übers Netz zu schicken.
struct Wuerfel {
    private var zustand: UInt64
    init(_ saat: UInt64) { zustand = saat &* 0x9E3779B97F4A7C15 | 1 }

    mutating func naechste() -> UInt64 {
        zustand ^= zustand << 13
        zustand ^= zustand >> 7
        zustand ^= zustand << 17
        return zustand
    }

    mutating func zahl(_ lo: Float, _ hi: Float) -> Float {
        lo + (hi - lo) * Float(naechste() % 1_000_000) / 1_000_000
    }

    mutating func ganz(_ lo: Int, _ hi: Int) -> Int { lo + Int(naechste() % UInt64(hi - lo + 1)) }
}
