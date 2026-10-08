//
//  FaceView.swift
//  Emos ganzes Gesicht: zwei Augen, Effekte, Arme, Bewegungen.
//

import SwiftUI

/// Maße des Gesichts – hängen von der Bildschirmgröße ab.
struct FaceMetrics {
    let screen: CGSize
    let eye: CGSize
    let gap: CGFloat

    init(_ screen: CGSize) {
        self.screen = screen
        let w = min(screen.width * 0.21, screen.height * 0.34)
        eye = CGSize(width: w, height: w * 1.2)
        gap = w * 0.6
    }
}

struct FaceView: View {
    @EnvironmentObject private var brain: RobotBrain
    @EnvironmentObject private var settings: EmoSettings

    var body: some View {
        GeometryReader { geo in
            face(FaceMetrics(geo.size))
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.72), value: brain.mood)
        .animation(.spring(response: 0.45, dampingFraction: 0.6), value: brain.handsUp)
        .animation(.easeIn(duration: 0.9), value: brain.fallen)
        .animation(.easeInOut(duration: 0.07), value: brain.blink)
        .animation(.easeOut(duration: 0.25), value: brain.look)
        .animation(.easeInOut(duration: 0.3), value: brain.isSpeaking)
        .animation(.spring(response: 0.4, dampingFraction: 0.75), value: brain.display)
    }

    private var color: Color { brain.mood.tint(settings.eyeColor) }

    private func face(_ m: FaceMetrics) -> some View {
        let dropY: CGFloat = brain.fallen ? m.screen.height * 0.22 : 0
        return ZStack {
            if let display = brain.display {
                // Wie beim echten EMO: Augen weg, Anzeige da.
                DisplayView(display: display, color: settings.eyeColor, screen: m.screen)
                    .transition(.scale(scale: 0.2).combined(with: .opacity))
            } else {
                eyes(m)
                    .modifier(Breathing(active: brain.mood == .neutral || brain.mood == .sleeping))
                    .transition(.scale(scale: 0.2).combined(with: .opacity))
            }
            arms(m)
        }
        .frame(width: m.screen.width, height: m.screen.height)
        .modifier(Tremble(active: brain.trembling))
        .modifier(DanceMove(active: brain.dancing))
        .rotationEffect(.degrees(brain.fallen ? 78 : 0))
        .offset(y: dropY)
    }

    private func eyes(_ m: FaceMetrics) -> some View {
        let look = brain.look
        // Wer zur Seite schaut, hat ein „hinteres“ Auge, das etwas kleiner ist.
        let leftScale: CGFloat = 1 + look.x * 0.08
        let rightScale: CGFloat = 1 - look.x * 0.08
        let offsetX: CGFloat = look.x * m.screen.width * 0.13
        let offsetY: CGFloat = look.y * m.screen.height * 0.11
        let shape = brain.mood.eyes
        let style = brain.mood.style

        return ZStack {
            // Jedes Auge ist etwas breiter gerahmt als es ist – deshalb Abstand korrigieren.
            HStack(spacing: m.gap - m.eye.width * 0.25) {
                EyeView(shape: shape, style: style, isLeft: true,
                        base: m.eye, color: color, blink: brain.blink)
                    .scaleEffect(leftScale)
                EyeView(shape: shape, style: style, isLeft: false,
                        base: m.eye, color: color, blink: brain.blink)
                    .scaleEffect(rightScale)
            }

            EffectLayer(effect: brain.effect, eye: m.eye, gap: m.gap, color: color)

            if brain.isSpeaking && settings.showTalkBars {
                TalkBars(color: color, width: m.eye.width * 1.2)
                    .offset(y: m.eye.height * 0.95)
                    .transition(.opacity)
            }
        }
        .offset(x: offsetX, y: offsetY)
    }

    /// Die Arme kommen bei „Hände hoch!“ von unten.
    private func arms(_ m: FaceMetrics) -> some View {
        let armSize: CGFloat = m.eye.width * 0.8
        let spacing: CGFloat = m.gap + m.eye.width * 2.4
        let up = brain.handsUp
        let y: CGFloat = up ? m.screen.height * 0.08 : m.screen.height * 0.95
        return HStack(spacing: spacing) {
            RobotArm(color: color, size: armSize, isLeft: true)
                .rotationEffect(.degrees(up ? -8 : 20), anchor: .bottom)
            RobotArm(color: color, size: armSize, isLeft: false)
                .rotationEffect(.degrees(up ? 8 : -20), anchor: .bottom)
        }
        .offset(y: y)
        .opacity(up ? 1 : 0)
    }
}
