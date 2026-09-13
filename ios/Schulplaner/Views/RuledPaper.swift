import SwiftUI

/// Weiße Seite mit schwarzen Linien.
struct RuledLines: View {
    var spacing: CGFloat
    var color: Color = Theme.rule

    var body: some View {
        Canvas { context, size in
            var y = spacing
            while y <= size.height {
                var line = Path()
                line.move(to: CGPoint(x: 0, y: y))
                line.addLine(to: CGPoint(x: size.width, y: y))
                context.stroke(line, with: .color(color), lineWidth: 1)
                y += spacing
            }
        }
        .allowsHitTesting(false)
    }
}

/// Eine Heftseite: Papier, roter Rand links, Linien.
struct PaperPage<Content: View>: View {
    var showMargin: Bool = true
    @ViewBuilder var content: () -> Content

    var body: some View {
        ZStack(alignment: .topLeading) {
            Theme.paper
            if showMargin {
                Rectangle()
                    .fill(Theme.margin)
                    .frame(width: 1.5)
                    .padding(.leading, 18)
                    .allowsHitTesting(false)
            }
            content()
        }
    }
}
