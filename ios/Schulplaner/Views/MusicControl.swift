import SwiftUI

/// Kleiner Knopf in der Navigationsleiste – öffnet die Musik-Steuerung.
struct MusicToolbarButton: View {
    @ObservedObject private var music = MusicEngine.shared
    @State private var showPanel = false

    var body: some View {
        Button {
            showPanel = true
        } label: {
            Image(systemName: music.isPlaying ? "speaker.wave.2.fill" : "music.note")
                .font(.system(size: 16, weight: .medium))
        }
        .accessibilityLabel(Text("Musik"))
        .sheet(isPresented: $showPanel) {
            MusicPanel()
        }
    }
}

/// Dezenter Knopf auf der Startseite.
struct MusicPill: View {
    @ObservedObject private var music = MusicEngine.shared
    @State private var showPanel = false

    var body: some View {
        Button {
            showPanel = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: music.isPlaying ? "speaker.wave.2.fill" : "music.note")
                    .font(.system(size: 13, weight: .medium))
                Text(music.isPlaying ? "Musik läuft" : "Fokus-Musik")
                    .font(Theme.font(14, .medium))
            }
            .foregroundStyle(music.isPlaying ? Theme.accent : Theme.secondaryInk)
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .background(
                Capsule(style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                Capsule(style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showPanel) {
            MusicPanel()
        }
    }
}

/// Die Steuerung: abspielen, anhalten, Lautstärke.
struct MusicPanel: View {
    @ObservedObject private var music = MusicEngine.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 22) {
            VStack(spacing: 4) {
                Text("Fokus-Musik")
                    .font(Theme.font(17, .semibold))
                    .foregroundStyle(Theme.ink)
                Text("Ruhige Musik zum Lernen")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.secondaryInk)
            }

            Button {
                music.toggle()
            } label: {
                Image(systemName: music.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 62, height: 62)
                    .background(Circle().fill(Theme.accent))
            }
            .buttonStyle(.plain)

            HStack(spacing: 12) {
                Image(systemName: "speaker.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.tertiaryInk)
                Slider(value: $music.volume, in: 0...1)
                Image(systemName: "speaker.wave.3.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.tertiaryInk)
            }

            Text("Wird direkt in der App erzeugt – ohne Internet.")
                .font(Theme.font(12))
                .foregroundStyle(Theme.tertiaryInk)
        }
        .padding(.horizontal, 28)
        .padding(.top, 26)
        .padding(.bottom, 20)
        .frame(maxWidth: .infinity)
        .background(Theme.background.ignoresSafeArea())
        .presentationDetents([.height(290)])
        .presentationDragIndicator(.visible)
    }
}
