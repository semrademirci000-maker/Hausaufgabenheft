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

struct ControlsOverlay: View {

    let world: GameWorld

    var body: some View {
        VStack {
            Spacer()
            HStack(alignment: .bottom) {
                dpad
                Spacer()
                actions
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 16)
    }

    private var dpad: some View {
        ZStack {
            HoldButton(world: world, button: .up, label: "▲").offset(x: 0, y: -48)
            HoldButton(world: world, button: .down, label: "▼").offset(x: 0, y: 48)
            HoldButton(world: world, button: .left, label: "◀").offset(x: -48, y: 0)
            HoldButton(world: world, button: .right, label: "▶").offset(x: 48, y: 0)
        }
        .frame(width: 142, height: 142)
    }

    private var actions: some View {
        HStack(alignment: .bottom, spacing: 14) {
            HoldButton(world: world, button: .talk, label: "E", caption: "reden",
                       size: 58, tint: Color(hex: 0xCFC9E6), round: true)
            HoldButton(world: world, button: .attack, label: "⚔", caption: "schlagen",
                       size: 76, tint: Color(hex: 0xFF9A8A), round: true)
        }
    }
}
