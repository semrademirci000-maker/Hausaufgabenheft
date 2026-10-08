//
//  Effects.swift
//  Alles, was um die Augen herum passiert: Zzz, Tränen, Herzchen, Noten,
//  Schweißtropfen … und die kleinen Roboterarme für „Hände hoch!“.
//

import SwiftUI

/// Zeichnet einen Effekt. Der Ursprung (0,0) ist die Mitte zwischen den Augen.
struct EffectLayer: View {
    var effect: FaceEffect
    var eye: CGSize
    var gap: CGFloat
    var color: Color

    /// Mitte des linken / rechten Auges.
    private var leftX: CGFloat { -(gap / 2 + eye.width / 2) }
    private var rightX: CGFloat { gap / 2 + eye.width / 2 }

    var body: some View {
        TimelineView(.animation) { ctx in
            content(ctx.date.timeIntervalSinceReferenceDate)
        }
        .allowsHitTesting(false)
    }

    @ViewBuilder
    private func content(_ t: Double) -> some View {
        switch effect {
        case .none:        EmptyView()
        case .zzz:         zzz(t)
        case .tears:       tears(t)
        case .hearts:      hearts(t)
        case .notes:       notes(t)
        case .sweat:       sweat(t)
        case .question:    question(t)
        case .anger:       anger(t)
        case .sparkles:    sparkles(t)
        case .exclamation: exclamation(t)
        }
    }

    private func zzz(_ t: Double) -> some View {
        ZStack {
            ForEach(0..<3, id: \.self) { i in
                let p: CGFloat = phase(t, speed: 0.33, offset: Double(i) / 3)
                let size: CGFloat = eye.width * (0.22 + 0.18 * p)
                let x: CGFloat = rightX + eye.width * (0.4 + 0.5 * p)
                let y: CGFloat = -eye.height * (0.3 + 0.9 * p)
                Text("Z")
                    .font(.system(size: size, weight: .heavy, design: .rounded))
                    .foregroundStyle(color)
                    .opacity(fade(p))
                    .offset(x: x, y: y)
            }
        }
    }

    private func tears(_ t: Double) -> some View {
        ZStack {
            ForEach(0..<4, id: \.self) { i in
                let p: CGFloat = phase(t, speed: 0.7, offset: Double(i) / 4)
                let side: CGFloat = i < 2 ? -1 : 1
                let base: CGFloat = i.isMultiple(of: 2) ? leftX : rightX
                let x: CGFloat = base + side * eye.width * 0.15
                let y: CGFloat = eye.height * (0.35 + 1.1 * p)
                Teardrop()
                    .fill(Color(red: 0.45, green: 0.7, blue: 1.0))
                    .frame(width: eye.width * 0.14, height: eye.width * 0.2)
                    .opacity(fade(p))
                    .offset(x: x, y: y)
            }
        }
    }

    private static let heartSpots: [CGFloat] = [-1.6, 1.5, -0.4, 0.6, 1.9]
    private static let noteSpots: [CGFloat] = [-1.8, 1.7, -1.1, 1.2, 0]

    private func hearts(_ t: Double) -> some View {
        ZStack {
            ForEach(0..<5, id: \.self) { i in
                let p: CGFloat = phase(t, speed: 0.4, offset: Double(i) / 5)
                let wobble: CGFloat = CGFloat(sin(t * 2 + Double(i))) * 10
                let x: CGFloat = EffectLayer.heartSpots[i] * eye.width + wobble
                let y: CGFloat = eye.height * (0.6 - 1.4 * p)
                Heart()
                    .fill(Color(red: 1.0, green: 0.4, blue: 0.62))
                    .frame(width: eye.width * 0.22, height: eye.width * 0.2)
                    .opacity(fade(p))
                    .offset(x: x, y: y)
            }
        }
    }

    private func notes(_ t: Double) -> some View {
        ZStack {
            ForEach(0..<5, id: \.self) { i in
                let p: CGFloat = phase(t, speed: 0.45, offset: Double(i) / 5)
                let wobble: CGFloat = CGFloat(sin(t * 3 + Double(i))) * 14
                let x: CGFloat = EffectLayer.noteSpots[i] * eye.width + wobble
                let y: CGFloat = eye.height * (0.5 - 1.3 * p)
                Text(i.isMultiple(of: 2) ? "♪" : "♫")
                    .font(.system(size: eye.width * 0.3, weight: .bold))
                    .foregroundStyle(color)
                    .opacity(fade(p))
                    .offset(x: x, y: y)
            }
        }
    }

    private func sweat(_ t: Double) -> some View {
        let p: CGFloat = phase(t, speed: 0.6, offset: 0)
        let x: CGFloat = rightX + eye.width * 0.62
        let y: CGFloat = -eye.height * 0.5 + eye.height * 0.5 * p
        return Teardrop()
            .fill(Color(red: 0.55, green: 0.8, blue: 1.0))
            .frame(width: eye.width * 0.13, height: eye.width * 0.19)
            .opacity(fade(p))
            .offset(x: x, y: y)
    }

    private func question(_ t: Double) -> some View {
        let bob: CGFloat = CGFloat(sin(t * 3)) * 6
        return Text("?")
            .font(.system(size: eye.width * 0.45, weight: .heavy, design: .rounded))
            .foregroundStyle(color)
            .offset(x: rightX + eye.width * 0.55, y: -eye.height * 0.75 + bob)
    }

    private func anger(_ t: Double) -> some View {
        let pulse: CGFloat = 1 + 0.15 * CGFloat(sin(t * 10))
        return Image(systemName: "bolt.fill")
            .font(.system(size: eye.width * 0.32, weight: .bold))
            .foregroundStyle(Color(red: 1, green: 0.35, blue: 0.3))
            .scaleEffect(pulse)
            .offset(x: rightX + eye.width * 0.6, y: -eye.height * 0.7)
    }

    private func sparkles(_ t: Double) -> some View {
        ZStack {
            ForEach(0..<6, id: \.self) { i in
                let a: Double = Double(i) / 6 * 2 * .pi
                let twinkle: Double = (sin(t * 4 + Double(i) * 1.7) + 1) / 2
                let x: CGFloat = CGFloat(cos(a)) * (gap / 2 + eye.width * 1.35)
                let y: CGFloat = CGFloat(sin(a)) * eye.height * 0.85
                Image(systemName: "sparkle")
                    .font(.system(size: eye.width * 0.2))
                    .foregroundStyle(color)
                    .opacity(twinkle)
                    .scaleEffect(0.6 + 0.6 * twinkle)
                    .offset(x: x, y: y)
            }
        }
    }

    private func exclamation(_ t: Double) -> some View {
        let pulse: CGFloat = 1 + 0.08 * CGFloat(sin(t * 12))
        return Text("!")
            .font(.system(size: eye.width * 0.55, weight: .black, design: .rounded))
            .foregroundStyle(color)
            .scaleEffect(pulse)
            .offset(y: -eye.height * 0.95)
    }

    /// Läuft von 0 bis 1 und fängt dann von vorne an.
    private func phase(_ t: Double, speed: Double, offset: Double) -> CGFloat {
        CGFloat((t * speed + offset).truncatingRemainder(dividingBy: 1))
    }

    /// Ein- und ausblenden über den Verlauf.
    private func fade(_ p: CGFloat) -> Double {
        Double(min(1, p * 5) * min(1, (1 - p) * 3))
    }
}

// MARK: - Arme

/// Ein kleiner Roboterarm, der von unten hochkommt.
struct RobotArm: View {
    var color: Color
    var size: CGFloat
    var isLeft: Bool

    var body: some View {
        VStack(spacing: -size * 0.04) {
            // Drei Finger
            HStack(alignment: .bottom, spacing: size * 0.05) {
                finger(height: size * 0.2)
                finger(height: size * 0.26)
                finger(height: size * 0.22)
            }
            // Handfläche
            RoundedRectangle(cornerRadius: size * 0.1, style: .continuous)
                .fill(color)
                .frame(width: size * 0.5, height: size * 0.36)
            // Gelenk
            Circle()
                .fill(color.opacity(0.75))
                .frame(width: size * 0.22, height: size * 0.22)
            // Arm
            Capsule()
                .fill(LinearGradient(colors: [color.opacity(0.85), color.opacity(0.35)],
                                     startPoint: .top, endPoint: .bottom))
                .frame(width: size * 0.24, height: size * 2.8)
        }
        .overlay(alignment: isLeft ? .trailing : .leading) {
            // Daumen
            Capsule()
                .fill(color)
                .frame(width: size * 0.11, height: size * 0.22)
                .rotationEffect(.degrees(isLeft ? 35 : -35))
                .offset(y: -size * 1.35)
        }
        .shadow(color: color.opacity(0.6), radius: size * 0.12)
    }

    private func finger(height: CGFloat) -> some View {
        Capsule().fill(color).frame(width: size * 0.12, height: height)
    }
}

// MARK: - Bewegungen

/// Zittern (bei Angst).
struct Tremble: ViewModifier {
    var active: Bool
    func body(content: Content) -> some View {
        if active {
            TimelineView(.animation) { ctx in
                let t = ctx.date.timeIntervalSinceReferenceDate
                content.offset(x: CGFloat(sin(t * 47)) * 4, y: CGFloat(cos(t * 39)) * 2)
            }
        } else {
            content
        }
    }
}

/// Wippen im Takt (beim Tanzen).
struct DanceMove: ViewModifier {
    var active: Bool
    var bpm: Double = 120
    func body(content: Content) -> some View {
        if active {
            TimelineView(.animation) { ctx in
                let t = ctx.date.timeIntervalSinceReferenceDate
                let beat = t * bpm / 60 * .pi
                content
                    .offset(x: CGFloat(sin(beat)) * 40, y: -CGFloat(abs(cos(beat))) * 30)
                    .rotationEffect(.degrees(sin(beat) * 8))
            }
        } else {
            content
        }
    }
}

/// Sanftes Atmen im Ruhezustand – Emo lebt!
struct Breathing: ViewModifier {
    var active: Bool
    func body(content: Content) -> some View {
        if active {
            TimelineView(.animation) { ctx in
                let t = ctx.date.timeIntervalSinceReferenceDate
                content.scaleEffect(1 + 0.012 * sin(t * 1.6), anchor: .center)
            }
        } else {
            content
        }
    }
}

/// Kleine Balken unter den Augen, während Emo spricht.
struct TalkBars: View {
    var color: Color
    var width: CGFloat
    var body: some View {
        TimelineView(.animation(minimumInterval: 0.07)) { ctx in
            let t = ctx.date.timeIntervalSinceReferenceDate
            HStack(spacing: width * 0.05) {
                ForEach(0..<5, id: \.self) { i in
                    let v = (sin(t * 13 + Double(i) * 1.9) + sin(t * 7.3 + Double(i))) / 4 + 0.5
                    Capsule()
                        .fill(color)
                        .frame(width: width * 0.07, height: width * (0.06 + 0.22 * CGFloat(v)))
                }
            }
            .frame(height: width * 0.3)
        }
        .shadow(color: color.opacity(0.6), radius: 8)
    }
}
