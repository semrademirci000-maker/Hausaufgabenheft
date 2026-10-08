//
//  DisplayView.swift
//  Wie beim echten EMO: Statt der Augen zeigt der Bildschirm kurz etwas an –
//  Uhrzeit, Datum, Timer, Würfel, Münze, Wetter, Akku, Foto …
//  Alles leuchtet in Emos Augenfarbe auf schwarzem Grund.
//

import SwiftUI

enum RPSChoice: CaseIterable {
    case scissors, rock, paper

    var name: String {
        switch self {
        case .scissors: return "Schere"
        case .rock:     return "Stein"
        case .paper:    return "Papier"
        }
    }

    var symbol: String {
        switch self {
        case .scissors: return "scissors"
        case .rock:     return "circle.fill"
        case .paper:    return "doc.fill"
        }
    }

    func beats(_ other: RPSChoice) -> Bool {
        switch (self, other) {
        case (.scissors, .paper), (.rock, .scissors), (.paper, .rock): return true
        default: return false
        }
    }

    /// Handzeichen aus der Kamera → Schere, Stein oder Papier.
    init?(sign: HandSign) {
        switch sign {
        case .peace, .gun:      self = .scissors
        case .fist, .thumbsUp:  self = .rock
        case .openPalm:         self = .paper
        }
    }
}

/// Was der Bildschirm gerade statt der Augen zeigt.
enum ScreenDisplay: Equatable {
    case clock
    case date
    case timer(end: Date, total: Double)
    case timerDone
    case dice(Int, rolling: Bool)
    case coin(heads: Bool, flipping: Bool)
    case word(String)
    case rps(RPSChoice)
    case weather(temp: Int, symbol: String)
    case battery(level: Int, charging: Bool)
    case countdown(Int)
    case flash
    case photo(UIImage)
}

struct DisplayView: View {
    var display: ScreenDisplay
    var color: Color
    var screen: CGSize

    /// Grundgröße für große Schrift – passt auf iPhone und iPad, hoch und quer.
    private var big: CGFloat { min(screen.height * 0.4, screen.width * 0.23) }

    var body: some View {
        if display == .flash {
            Color.white
                .frame(width: screen.width * 2, height: screen.height * 2)
        } else {
            content
                .foregroundStyle(color)
                .shadow(color: color.opacity(0.8), radius: big * 0.06)
                .shadow(color: color.opacity(0.35), radius: big * 0.2)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch display {
        case .clock:                         clock
        case .date:                          date
        case .timer(let end, let total):     timer(end: end, total: total)
        case .timerDone:                     timerDone
        case .dice(let v, let rolling):      dice(v, rolling: rolling)
        case .coin(let heads, let flipping): coin(heads: heads, flipping: flipping)
        case .word(let w):                   word(w)
        case .rps(let choice):               rps(choice)
        case .weather(let temp, let symbol): weather(temp: temp, symbol: symbol)
        case .battery(let level, let charging): battery(level: level, charging: charging)
        case .countdown(let n):              countdown(n)
        case .flash:                         EmptyView()
        case .photo(let image):              photo(image)
        }
    }

    private func bigFont(_ factor: CGFloat = 1) -> Font {
        .system(size: big * factor, weight: .heavy, design: .rounded)
    }

    // MARK: Uhr und Datum

    private var clock: some View {
        TimelineView(.periodic(from: .now, by: 0.5)) { ctx in
            let c = Calendar.current.dateComponents([.hour, .minute, .second], from: ctx.date)
            let colonOn = (c.second ?? 0) % 2 == 0
            HStack(spacing: 0) {
                Text(String(format: "%02d", c.hour ?? 0))
                Text(":").opacity(colonOn ? 1 : 0.15).offset(y: -big * 0.06)
                Text(String(format: "%02d", c.minute ?? 0))
            }
            .font(bigFont())
            .monospacedDigit()
        }
    }

    private var date: some View {
        let now = Date()
        let weekday = DateFormatter.emo("EEEE").string(from: now).uppercased()
        let day = DateFormatter.emo("d. MMM").string(from: now).uppercased().replacingOccurrences(of: ".", with: "")
        return VStack(spacing: big * 0.05) {
            Text(weekday).font(bigFont(0.32))
            Text(day).font(bigFont(0.75)).monospacedDigit()
        }
        .lineLimit(1)
        .minimumScaleFactor(0.4)
    }

    // MARK: Timer

    private func timer(end: Date, total: Double) -> some View {
        TimelineView(.periodic(from: .now, by: 0.25)) { ctx in
            let left = max(0, end.timeIntervalSince(ctx.date))
            let fraction = total > 0 ? CGFloat(left / total) : 0
            VStack(spacing: big * 0.15) {
                Text(DisplayView.format(left))
                    .font(bigFont(0.9))
                    .monospacedDigit()
                ZStack(alignment: .leading) {
                    Capsule().fill(color.opacity(0.2))
                    Capsule().fill(color).frame(width: big * 2.6 * fraction)
                }
                .frame(width: big * 2.6, height: big * 0.07)
            }
        }
    }

    static func format(_ seconds: Double) -> String {
        let s = Int(seconds.rounded(.up))
        if s >= 3600 { return String(format: "%d:%02d:%02d", s / 3600, s / 60 % 60, s % 60) }
        return String(format: "%02d:%02d", s / 60, s % 60)
    }

    private var timerDone: some View {
        TimelineView(.animation) { ctx in
            let t = ctx.date.timeIntervalSinceReferenceDate
            let on = Int(t * 3) % 2 == 0
            VStack(spacing: big * 0.1) {
                Image(systemName: "bell.fill")
                    .font(.system(size: big * 0.5))
                    .rotationEffect(.degrees(sin(t * 30) * 18), anchor: .top)
                Text("00:00")
                    .font(bigFont(0.8))
                    .monospacedDigit()
                    .opacity(on ? 1 : 0.25)
            }
        }
    }

    // MARK: Spiele

    private func dice(_ value: Int, rolling: Bool) -> some View {
        let size = big * 1.1
        return Group {
            if rolling {
                TimelineView(.periodic(from: .now, by: 0.08)) { ctx in
                    let t = ctx.date.timeIntervalSinceReferenceDate
                    let v = Int(t * 12.5) % 6 + 1
                    DiceFace(value: v, size: size, color: color)
                        .rotationEffect(.degrees(sin(t * 9) * 25))
                        .offset(y: CGFloat(-abs(sin(t * 7))) * big * 0.15)
                }
            } else {
                DiceFace(value: value, size: size, color: color)
                    .transition(.scale)
            }
        }
    }

    private func coin(heads: Bool, flipping: Bool) -> some View {
        let size = big * 1.2
        return TimelineView(.animation(paused: !flipping)) { ctx in
            let t = ctx.date.timeIntervalSinceReferenceDate
            let spin = flipping ? cos(t * 16) : 1
            let showHeads = flipping ? spin > 0 : heads
            ZStack {
                Circle().stroke(color, lineWidth: size * 0.05)
                Circle().stroke(color.opacity(0.5), lineWidth: size * 0.02).padding(size * 0.1)
                Text(showHeads ? "KOPF" : "ZAHL")
                    .font(.system(size: size * 0.22, weight: .heavy, design: .rounded))
            }
            .frame(width: size, height: size)
            .scaleEffect(x: CGFloat(max(abs(spin), 0.05)), y: 1)
        }
    }

    private func word(_ w: String) -> some View {
        Text(w)
            .font(bigFont(0.6))
            .lineLimit(1)
            .minimumScaleFactor(0.3)
            .padding(.horizontal, 20)
    }

    private func rps(_ choice: RPSChoice) -> some View {
        VStack(spacing: big * 0.08) {
            Image(systemName: choice.symbol)
                .font(.system(size: big * 0.75, weight: .bold))
            Text(choice.name.uppercased())
                .font(bigFont(0.25))
        }
    }

    // MARK: Infos

    private func weather(temp: Int, symbol: String) -> some View {
        HStack(spacing: big * 0.2) {
            Image(systemName: symbol)
                .font(.system(size: big * 0.75))
                .symbolRenderingMode(.monochrome)
            Text("\(temp)°")
                .font(bigFont(0.85))
                .monospacedDigit()
        }
    }

    private func battery(level: Int, charging: Bool) -> some View {
        let w = big * 1.7, h = big * 0.8
        let fill = CGFloat(min(max(level, 0), 100)) / 100
        return VStack(spacing: big * 0.12) {
            HStack(spacing: big * 0.04) {
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: h * 0.2)
                        .stroke(color, lineWidth: h * 0.08)
                    RoundedRectangle(cornerRadius: h * 0.1)
                        .fill(level <= 20 ? Color(red: 1, green: 0.35, blue: 0.3) : color)
                        .frame(width: max((w - h * 0.32) * fill, 2))
                        .padding(h * 0.16)
                    if charging {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: h * 0.55))
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                    }
                }
                .frame(width: w, height: h)
                RoundedRectangle(cornerRadius: h * 0.06)
                    .fill(color)
                    .frame(width: h * 0.12, height: h * 0.35)
            }
            Text("\(level) %")
                .font(bigFont(0.35))
                .monospacedDigit()
        }
    }

    private func countdown(_ n: Int) -> some View {
        Text("\(n)")
            .font(bigFont(1.3))
            .id(n)
            .transition(.scale.combined(with: .opacity))
    }

    private func photo(_ image: UIImage) -> some View {
        Image(uiImage: image)
            .resizable()
            .scaledToFit()
            .frame(maxWidth: screen.width * 0.8, maxHeight: screen.height * 0.8)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(color, lineWidth: 4)
            }
    }
}

/// Ein Würfel mit Punkten.
struct DiceFace: View {
    var value: Int
    var size: CGFloat
    var color: Color

    /// Punkt-Positionen im 3×3-Raster (-1, 0, 1).
    private var pips: [(Int, Int)] {
        switch value {
        case 1: return [(0, 0)]
        case 2: return [(-1, -1), (1, 1)]
        case 3: return [(-1, -1), (0, 0), (1, 1)]
        case 4: return [(-1, -1), (1, -1), (-1, 1), (1, 1)]
        case 5: return [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)]
        default: return [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1)]
        }
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.18, style: .continuous)
                .stroke(color, lineWidth: size * 0.06)
            ForEach(pips.indices, id: \.self) { i in
                Circle()
                    .fill(color)
                    .frame(width: size * 0.17, height: size * 0.17)
                    .offset(x: CGFloat(pips[i].0) * size * 0.26, y: CGFloat(pips[i].1) * size * 0.26)
            }
        }
        .frame(width: size, height: size)
    }
}

extension DateFormatter {
    static func emo(_ format: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "de_DE")
        f.dateFormat = format
        return f
    }
}
