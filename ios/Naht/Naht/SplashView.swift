import SwiftUI

/// Startbild, das kurz über dem Spiel liegt, während die 3D-Welt lädt.
struct SplashView: View {
    @State private var flicker = false

    private let green = Color(red: 0.36, green: 0.78, blue: 0.36)
    private let orange = Color(red: 1.0, green: 0.55, blue: 0.16)
    private let red = Color(red: 0.82, green: 0.11, blue: 0.18)

    var body: some View {
        ZStack {
            RadialGradient(colors: [Color(red: 0.24, green: 0.05, blue: 0.08), .black],
                           center: .center, startRadius: 10, endRadius: 520)
                .ignoresSafeArea()

            VStack(spacing: 14) {
                Text("EIN SPIEL VON MUAZ")
                    .font(.system(size: 14, weight: .medium))
                    .tracking(6)
                    .foregroundStyle(.gray)

                Text("NAHT")
                    .foregroundStyle(red)
                    .tracking(14)
                .font(.system(size: 84, weight: .black, design: .default))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .opacity(flicker ? 0.35 : 1)
                .shadow(color: .black, radius: 12)

                HStack(spacing: 8) {
                    Text("KAPITEL 1 ·").foregroundStyle(.white)
                    Text("DAS TIEFE WERK").foregroundStyle(Color(red: 1, green: 0.8, blue: 0.2))
                }
                .font(.system(size: 22, weight: .semibold))
                .tracking(4)

                HStack(spacing: 28) {
                    HandShape().fill(green).frame(width: 46, height: 60)
                    HandShape().fill(orange).frame(width: 46, height: 60).scaleEffect(x: -1)
                }
                .padding(.top, 18)

                ProgressView()
                    .tint(.white)
                    .padding(.top, 8)
            }
            .padding(24)
        }
        .task {
            // kurzes Neonröhren-Flackern
            for delay in [0.5, 0.08, 0.25, 0.06] {
                try? await Task.sleep(for: .seconds(delay))
                flicker.toggle()
            }
            flicker = false
        }
    }
}

/// Eine einfache Greifer-Hand: Handfläche, vier Finger nach oben, Daumen zur Seite.
struct HandShape: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        let w = r.width, h = r.height
        p.addRoundedRect(in: CGRect(x: r.minX + w * 0.1, y: r.minY + h * 0.42, width: w * 0.72, height: h * 0.5),
                         cornerSize: CGSize(width: 6, height: 6))
        for i in 0..<4 {
            let fx = r.minX + w * (0.1 + Double(i) * 0.185)
            p.addRoundedRect(in: CGRect(x: fx, y: r.minY + h * (i == 1 || i == 2 ? 0.0 : 0.08),
                                        width: w * 0.15, height: h * 0.48),
                             cornerSize: CGSize(width: 4, height: 4))
        }
        var thumb = Path(roundedRect: CGRect(x: 0, y: 0, width: w * 0.16, height: h * 0.34),
                         cornerSize: CGSize(width: 4, height: 4))
        thumb = thumb.applying(CGAffineTransform(rotationAngle: -0.6)
            .concatenating(CGAffineTransform(translationX: r.minX + w * 0.78, y: r.minY + h * 0.5)))
        p.addPath(thumb)
        return p
    }
}

#Preview(traits: .landscapeLeft) {
    SplashView()
}
