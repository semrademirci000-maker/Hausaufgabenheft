//
//  RobotScreen.swift
//  Der ganze Bildschirm ist Emos Gesicht. Antippen, streicheln, schütteln!
//

import SwiftUI

struct RobotScreen: View {
    @EnvironmentObject private var brain: RobotBrain
    @EnvironmentObject private var settings: EmoSettings
    @Environment(\.scenePhase) private var scenePhase

    @State private var showGear = true
    @State private var showSettings = false
    @State private var gearTimer: Task<Void, Never>?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            FaceView()
                .ignoresSafeArea()

            VStack {
                Spacer()
                if settings.showSubtitles {
                    subtitles
                }
            }
            .padding(.bottom, 18)
            .padding(.horizontal, 24)
            .allowsHitTesting(false)
        }
        .contentShape(Rectangle())
        .onTapGesture { brain.tapped(); flashGear() }
        .onLongPressGesture(minimumDuration: 0.7) { brain.petted() }
        .gesture(DragGesture(minimumDistance: 40).onEnded { _ in brain.petted() })
        .overlay(alignment: .topTrailing) { gearButton }
        .overlay(alignment: .topLeading) { statusIcons }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .environmentObject(brain)
                .environmentObject(settings)
        }
        .onReceive(NotificationCenter.default.publisher(for: .deviceDidShake)) { _ in
            brain.shaken()
        }
        .onAppear {
            UIApplication.shared.isIdleTimerDisabled = true
            brain.start()
            flashGear()
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active:     brain.resume()
            case .background: brain.pause()
            default:          break
            }
        }
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
    }

    // MARK: Teile

    @ViewBuilder
    private var subtitles: some View {
        VStack(spacing: 6) {
            if let heard = brain.heard, !brain.isSpeaking {
                Text("„\(heard)“")
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.45))
                    .lineLimit(2)
                    .transition(.opacity)
            }
            if let line = brain.subtitle {
                Text(line)
                    .font(.system(size: 19, weight: .semibold, design: .rounded))
                    .foregroundStyle(settings.eyeColor.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: brain.subtitle)
        .animation(.easeInOut(duration: 0.25), value: brain.heard)
    }

    private var gearButton: some View {
        Button {
            showSettings = true
        } label: {
            Image(systemName: "gearshape.fill")
                .font(.system(size: 20))
                .foregroundStyle(.white.opacity(0.5))
                .padding(18)
                .contentShape(Rectangle())
        }
        .opacity(showGear ? 1 : 0)
        .animation(.easeInOut(duration: 0.4), value: showGear)
    }

    private var statusIcons: some View {
        HStack(spacing: 10) {
            if settings.useMicrophone {
                Image(systemName: brain.listeningForQuestion ? "ear.fill" : "mic.fill")
                    .foregroundStyle(settings.eyeColor.opacity(0.25 + Double(brain.micLevel) * 0.75))
            }
            if settings.useCamera {
                Image(systemName: brain.seesYou ? "eye.fill" : "eye")
                    .foregroundStyle(.white.opacity(brain.seesYou ? 0.45 : 0.2))
            }
        }
        .font(.system(size: 14))
        .padding(18)
        .opacity(showGear ? 1 : 0)
        .animation(.easeInOut(duration: 0.4), value: showGear)
        .allowsHitTesting(false)
    }

    /// Zahnrad kurz zeigen und dann wieder verstecken – Emos Gesicht soll frei bleiben.
    private func flashGear() {
        showGear = true
        gearTimer?.cancel()
        gearTimer = Task {
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            if !Task.isCancelled { showGear = false }
        }
    }
}

// MARK: - Schütteln erkennen

extension Notification.Name {
    static let deviceDidShake = Notification.Name("emo.deviceDidShake")
}

extension UIWindow {
    open override func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
        if motion == .motionShake {
            NotificationCenter.default.post(name: .deviceDidShake, object: nil)
        }
        super.motionEnded(motion, with: event)
    }
}
