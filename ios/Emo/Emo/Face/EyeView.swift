//
//  EyeView.swift
//  Ein einzelnes leuchtendes Auge – im Stil von EMO: abgerundetes Rechteck,
//  das durch „Lider“ (schwarze Masken) seine Form ändert.
//

import SwiftUI

struct EyeView: View {
    var shape: EyeShape
    var style: EyeStyle
    var isLeft: Bool
    /// Grundgröße eines Auges in Punkten.
    var base: CGSize
    var color: Color
    var blink: Bool

    var body: some View {
        let scale = isLeft ? shape.leftScale : shape.rightScale
        let w = base.width * shape.width * scale
        let fullH = base.height * shape.height * scale
        let h = blink && style == .normal ? max(fullH * 0.07, 4) : fullH

        ZStack {
            switch style {
            case .normal:
                normalEye(w: w, h: h)
            case .hearts:
                Heart()
                    .fill(color)
                    .frame(width: base.width * 1.1, height: base.width * 1.0)
                    .modifier(Pulse(amount: 0.08, speed: 2.2))
            case .crosses:
                Cross()
                    .stroke(color, style: StrokeStyle(lineWidth: base.width * 0.16, lineCap: .round))
                    .frame(width: base.width * 0.8, height: base.width * 0.8)
            case .spirals:
                Spiral()
                    .stroke(color, style: StrokeStyle(lineWidth: base.width * 0.09, lineCap: .round))
                    .frame(width: base.width, height: base.width)
                    .modifier(Spin(speed: isLeft ? 1.4 : -1.4))
            case .chevrons:
                Chevron(pointsRight: isLeft)
                    .stroke(color, style: StrokeStyle(lineWidth: base.width * 0.17, lineCap: .round, lineJoin: .round))
                    .frame(width: base.width * 0.7, height: base.height * 0.62)
                    .modifier(Pulse(amount: 0.06, speed: 6))
            case .stars:
                Star()
                    .fill(color)
                    .frame(width: base.width * 1.15, height: base.width * 1.15)
                    .modifier(Spin(speed: isLeft ? 0.35 : -0.35))
                    .modifier(Pulse(amount: 0.1, speed: 3))
            }
        }
        .frame(width: base.width * 1.25, height: base.height * 1.3)
        .shadow(color: color.opacity(0.75), radius: base.width * 0.12)
        .shadow(color: color.opacity(0.35), radius: base.width * 0.3)
    }

    private func normalEye(w: CGFloat, h: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: min(w, h) * 0.32, style: .continuous)
            .fill(
                LinearGradient(colors: [color.opacity(0.92), color],
                               startPoint: .top, endPoint: .bottom)
            )
            .frame(width: w, height: h)
            .mask {
                ZStack {
                    Rectangle()
                    // Oberes Lid – dreht sich für böse/traurige Blicke.
                    Rectangle()
                        .frame(width: w * 2.2, height: h)
                        .offset(y: -h + shape.topLid * h)
                        .rotationEffect(.degrees(isLeft ? shape.tilt : -shape.tilt))
                        .blendMode(.destinationOut)
                    // Unteres Lid – ein Bogen von unten, macht ^ ^ Augen.
                    Ellipse()
                        .frame(width: w * 1.7, height: h * 1.2)
                        .offset(y: h * (1.1 - shape.bottomLid))
                        .blendMode(.destinationOut)
                }
                .compositingGroup()
            }
    }
}

// MARK: - Formen

struct Heart: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        let w = r.width, h = r.height
        p.move(to: CGPoint(x: r.midX, y: r.minY + h * 0.95))
        p.addCurve(to: CGPoint(x: r.minX, y: r.minY + h * 0.32),
                   control1: CGPoint(x: r.minX + w * 0.2, y: r.minY + h * 0.78),
                   control2: CGPoint(x: r.minX, y: r.minY + h * 0.55))
        p.addArc(center: CGPoint(x: r.minX + w * 0.25, y: r.minY + h * 0.27),
                 radius: w * 0.25, startAngle: .degrees(170), endAngle: .degrees(-10), clockwise: false)
        p.addArc(center: CGPoint(x: r.minX + w * 0.75, y: r.minY + h * 0.27),
                 radius: w * 0.25, startAngle: .degrees(190), endAngle: .degrees(10), clockwise: false)
        p.addCurve(to: CGPoint(x: r.midX, y: r.minY + h * 0.95),
                   control1: CGPoint(x: r.maxX, y: r.minY + h * 0.55),
                   control2: CGPoint(x: r.maxX - w * 0.2, y: r.minY + h * 0.78))
        p.closeSubpath()
        return p
    }
}

struct Cross: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        p.move(to: CGPoint(x: r.maxX, y: r.minY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        return p
    }
}

struct Spiral: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        let c = CGPoint(x: r.midX, y: r.midY)
        let maxR = min(r.width, r.height) / 2
        let turns = 3.0
        let steps = 140
        for i in 0...steps {
            let t = Double(i) / Double(steps)
            let angle = t * turns * 2 * .pi
            let radius = maxR * CGFloat(t)
            let pt = CGPoint(x: c.x + radius * CGFloat(cos(angle)), y: c.y + radius * CGFloat(sin(angle)))
            if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
        }
        return p
    }
}

/// Ein „>“ bzw. „<“ für zugekniffene Lach-Augen.
struct Chevron: Shape {
    var pointsRight: Bool
    func path(in r: CGRect) -> Path {
        var p = Path()
        if pointsRight {
            p.move(to: CGPoint(x: r.minX, y: r.minY))
            p.addLine(to: CGPoint(x: r.maxX, y: r.midY))
            p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        } else {
            p.move(to: CGPoint(x: r.maxX, y: r.minY))
            p.addLine(to: CGPoint(x: r.minX, y: r.midY))
            p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        }
        return p
    }
}

struct Star: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        let c = CGPoint(x: r.midX, y: r.midY)
        let outer = min(r.width, r.height) / 2
        let inner = outer * 0.45
        for i in 0..<10 {
            let radius = i.isMultiple(of: 2) ? outer : inner
            let angle = Double(i) * .pi / 5 - .pi / 2
            let pt = CGPoint(x: c.x + radius * CGFloat(cos(angle)), y: c.y + radius * CGFloat(sin(angle)))
            if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
        }
        p.closeSubpath()
        return p
    }
}

struct Teardrop: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.midX, y: r.minY))
        p.addCurve(to: CGPoint(x: r.midX, y: r.maxY),
                   control1: CGPoint(x: r.midX + r.width * 0.15, y: r.minY + r.height * 0.3),
                   control2: CGPoint(x: r.maxX + r.width * 0.1, y: r.maxY))
        p.addCurve(to: CGPoint(x: r.midX, y: r.minY),
                   control1: CGPoint(x: r.minX - r.width * 0.1, y: r.maxY),
                   control2: CGPoint(x: r.midX - r.width * 0.15, y: r.minY + r.height * 0.3))
        return p
    }
}

// MARK: - Kleine Dauer-Animationen

/// Lässt etwas sanft pulsieren.
struct Pulse: ViewModifier {
    var amount: Double
    var speed: Double
    func body(content: Content) -> some View {
        TimelineView(.animation) { ctx in
            let t = ctx.date.timeIntervalSinceReferenceDate
            content.scaleEffect(1 + amount * sin(t * speed * 2 * .pi / 2))
        }
    }
}

/// Dreht etwas dauerhaft (Umdrehungen pro Sekunde).
struct Spin: ViewModifier {
    var speed: Double
    func body(content: Content) -> some View {
        TimelineView(.animation) { ctx in
            let t = ctx.date.timeIntervalSinceReferenceDate
            content.rotationEffect(.degrees((t * speed * 360).truncatingRemainder(dividingBy: 360)))
        }
    }
}
