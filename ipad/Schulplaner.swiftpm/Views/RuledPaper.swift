import SwiftUI

/// Weiße Seite mit feinen schwarzen Linien.
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
                context.stroke(line, with: .color(color), lineWidth: 0.75)
                y += spacing
            }
        }
        .allowsHitTesting(false)
    }
}
