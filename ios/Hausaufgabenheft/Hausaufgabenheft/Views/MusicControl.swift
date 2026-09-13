//
//  MusicControl.swift
//  Der runde Knopf für die Entspannungsmusik.
//

import SwiftUI

struct MusicControl: View {
    @EnvironmentObject private var music: LofiEngine

    var body: some View {
        HStack(spacing: 10) {
            if music.isPlaying {
                Slider(value: $music.volume, in: 0...1)
                    .tint(Color.planBlue)
                    .frame(width: 130)
                    .padding(.leading, 8)
                    .transition(.opacity.combined(with: .scale(scale: 0.8, anchor: .trailing)))
            }

            Button {
                music.toggle()
            } label: {
                ZStack {
                    Circle()
                        .fill(music.isPlaying ? Color.planBlue : Color(hex: "#E9E2D4"))
                    Text(music.isPlaying ? "♫" : "♪")
                        .font(.system(size: 23))
                        .foregroundStyle(music.isPlaying ? .white : Color.inkSoft)
                }
                .frame(width: 48, height: 48)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(music.isPlaying ? "Musik aus" : "Entspannungsmusik an")
        }
        .padding(5)
        .background(
            Capsule()
                .fill(Color.paper.opacity(0.85))
                .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
        )
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: music.isPlaying)
    }
}
