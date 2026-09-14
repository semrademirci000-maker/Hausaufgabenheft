//
//  Controls.swift
//  Steuerkreuz und Knöpfe zum Antippen – wie bei einer kleinen Konsole.
//

import SwiftUI

/// Ein Knopf, der gedrückt bleibt, solange der Finger darauf liegt.
struct HoldButton: View {

    let world: GameWorld
    let button: GameButton
    let label: String
    let caption: String?
    let size: CGFloat
    let tint: Color
    let round: Bool

    @State private var isDown = false

    init(world: GameWorld, button: GameButton, label: String, caption: String? = nil,
         size: CGFloat = 46, tint: Color = Color(hex: 0xCFC9E6), round: Bool = false) {
        self.world = world
        self.button = button
        self.label = label
        self.caption = caption
        self.size = size
        self.tint = tint
        self.round = round
    }

    var body: some View {
        VStack(spacing: 1) {
            Text(label)
                .font(.system(size: size * 0.36, weight: .semibold))
            if let caption {
                Text(caption)
                    .font(.system(size: 8, weight: .regular, design: .monospaced))
                    .opacity(0.75)
            }
        }
        .foregroundColor(tint)
        .frame(width: size, height: size)
        .background {
            if round {
                Circle().fill(Color(hex: 0x1E1C2C).opacity(isDown ? 1 : 0.82))
            } else {
                RoundedRectangle(cornerRadius: 9)
                    .fill(Color(hex: 0x1E1C2C).opacity(isDown ? 1 : 0.82))
            }
        }
        .overlay {
            if round {
                Circle().stroke(tint.opacity(0.5), lineWidth: 2)
            } else {
                RoundedRectangle(cornerRadius: 9).stroke(tint.opacity(0.45), lineWidth: 2)
            }
        }
        .scaleEffect(isDown ? 0.94 : 1)
        .contentShape(round ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: 9)))
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if !isDown {
                        isDown = true
                        world.input.press(button)
                    }
                }
                .onEnded { _ in
                    isDown = false
                    world.input.release(button)
                }
        )
        .onDisappear {
            isDown = false
            world.input.release(button)
        }
    }
}

/// Der Daumen-Stick: irgendwo links unten den Finger aufsetzen und ziehen.
struct JoystickView: View {

    let world: GameWorld

    private let baseSize: CGFloat = 118
    private let knobSize: CGFloat = 52
    private let radius: CGFloat = 46

    @State private var center: CGPoint?
    @State private var knob: CGSize = .zero
    @State private var used = false

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                Color.clear.contentShape(Rectangle())

                // Der Stick erscheint erst da, wo der Daumen aufsetzt.
                if let center {
                    stick
                        .position(center)
                        .allowsHitTesting(false)
                } else if !used {
                    Text("Finger aufs Bild legen und ziehen zum Laufen")
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(Color(hex: 0xCFC9E6).opacity(0.85))
                        .shadow(color: .black, radius: 2)
                        .position(x: geo.size.width * 0.34, y: geo.size.height - 20)
                        .allowsHitTesting(false)
                }
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        let base = center ?? clamped(value.startLocation, in: geo.size)
                        if center == nil {
                            center = base
                            used = true
                        }
                        let dx = value.location.x - base.x
                        let dy = value.location.y - base.y
                        let distance = sqrt(dx * dx + dy * dy)
                        var kx = dx, ky = dy
                        if distance > radius {
                            kx = dx / distance * radius
                            ky = dy / distance * radius
                        }
                        knob = CGSize(width: kx, height: ky)
                        var nx = Double(kx / radius)
                        var ny = Double(ky / radius)
                        if (nx * nx + ny * ny).squareRoot() < 0.22 { nx = 0; ny = 0 }
                        world.input.stick = Vec(x: nx, y: ny)
                    }
                    .onEnded { _ in
                        center = nil
                        knob = .zero
                        world.input.stick = .zero
                    }
            )
        }
        .onDisappear { world.input.stick = .zero }
    }

    private var stick: some View {
        ZStack {
            Circle()
                .fill(Color(hex: 0x161422).opacity(0.72))
                .overlay(Circle().stroke(Color(hex: 0x7A72A0).opacity(0.45), lineWidth: 2))
                .frame(width: baseSize, height: baseSize)
            Circle()
                .fill(Color(hex: 0x605A8C).opacity(0.92))
                .overlay(Circle().stroke(Color(hex: 0xCFC9E6), lineWidth: 2))
                .frame(width: knobSize, height: knobSize)
                .offset(knob)
        }
        .frame(width: baseSize, height: baseSize)
    }

    /// Der Stick soll ganz im Bild bleiben.
    private func clamped(_ point: CGPoint, in size: CGSize) -> CGPoint {
        let half = baseSize / 2 + 6
        return CGPoint(x: min(max(point.x, half), max(half, size.width - half)),
                       y: min(max(point.y, half), max(half, size.height - half)))
    }
}

struct ControlsOverlay: View {

    let world: GameWorld

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottomTrailing) {
                // Der Stick nimmt die ganze Flaeche an: Finger irgendwo
                // aufsetzen, er springt dorthin. Die Knoepfe liegen darueber.
                JoystickView(world: world)

                HStack(alignment: .bottom, spacing: 14) {
                    HoldButton(world: world, button: .talk, label: "E", caption: "reden",
                               size: 58, tint: Color(hex: 0xCFC9E6), round: true)
                    HoldButton(world: world, button: .attack, label: "⚔", caption: "schlagen",
                               size: 76, tint: Color(hex: 0xFF9A8A), round: true)
                }
                .padding(.trailing, 20)
                .padding(.bottom, 20)
            }
        }
    }
}
