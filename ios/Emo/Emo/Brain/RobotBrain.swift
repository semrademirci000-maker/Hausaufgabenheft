//
//  RobotBrain.swift
//  Emos Persönlichkeit: entscheidet, wie er auf alles reagiert –
//  Stimme, Handzeichen, Berührung, Schütteln, Langeweile …
//

import SwiftUI
import Combine

@MainActor
final class RobotBrain: ObservableObject {

    // MARK: Was das Gesicht anzeigt

    @Published private(set) var mood: Mood = .neutral
    @Published private(set) var effect: FaceEffect = .none
    @Published private(set) var look: CGPoint = .zero
    @Published private(set) var blink = false
    @Published private(set) var handsUp = false
    @Published private(set) var trembling = false
    @Published private(set) var fallen = false
    @Published private(set) var dancing = false
    @Published private(set) var isSpeaking = false
    @Published private(set) var subtitle: String?
    @Published private(set) var heard: String?
    @Published private(set) var micLevel: Float = 0
    @Published private(set) var seesYou = false
    @Published private(set) var listeningForQuestion = false
    /// Was der Bildschirm statt der Augen zeigt (Uhr, Timer, Würfel …). `nil` = Augen.
    @Published private(set) var display: ScreenDisplay?

    let settings = EmoSettings()

    // MARK: Sinne und Stimme

    private let vision = VisionWatcher()
    private let ears = SpeechListener()
    private let voice = RobotVoice()
    private let sfx = SoundFX()
    private lazy var ai = AIAssistant(settings: settings)
    private lazy var weather = WeatherService()

    // MARK: Innerer Zustand

    private var act: Task<Void, Never>?
    private var actPriority = 0
    private var actID = 0
    private var loops: [Task<Void, Never>] = []
    private var bag = Set<AnyCancellable>()
    private var started = false

    private var lastInteraction = Date()
    private var lastFaceSeen = Date.distantPast
    private var faceTarget: CGPoint = .zero
    private var idleLook: CGPoint = .zero
    private var conversationUntil = Date.distantPast
    private var tapTimes: [Date] = []
    private var lastGunSeen = Date.distantPast
    private var gunTipHistory: [(time: Date, y: CGFloat)] = []
    private var lastSignReaction: [HandSign: Date] = [:]
    private var lastGreeting = Date.distantPast
    private var quickFired = false
    private var heardClear: Task<Void, Never>?
    private var lastSign: HandSign?
    private var lastSignTime = Date.distantPast
    private var playingRPS = false
    private var timerEnd: Date?
    private var timerTotal: Double = 0
    private var timerTask: Task<Void, Never>?

    var isSleeping: Bool { mood == .sleeping || mood == .sleepy }

    // MARK: Start / Stopp

    func start() {
        guard !started else { return }
        started = true
        AudioSession.activate()
        applySettings()
        wireSenses()
        if settings.useCamera { vision.start() }
        if settings.useMicrophone { ears.start() }
        loops = [blinkLoop(), lookLoop(), idleLoop()]
        wakeUpGreeting()
    }

    /// App geht in den Hintergrund.
    func pause() {
        vision.stop()
        ears.stop()
    }

    /// App ist wieder da.
    func resume() {
        guard started else { return }
        AudioSession.activate()
        if settings.useCamera { vision.start() }
        if settings.useMicrophone { ears.start() }
        touch()
    }

    private func applySettings() {
        settings.$voicePitch.sink { [weak self] v in self?.voice.pitch = Float(v) }.store(in: &bag)
        settings.$volume.sink { [weak self] v in self?.sfx.volume = Float(v) }.store(in: &bag)
        settings.$useCamera.dropFirst().sink { [weak self] on in
            guard let self else { return }
            if on { self.vision.start() } else { self.vision.stop(); self.seesYou = false }
        }.store(in: &bag)
        settings.$useMicrophone.dropFirst().sink { [weak self] on in
            guard let self else { return }
            if on { self.ears.start() } else { self.ears.stop() }
        }.store(in: &bag)
    }

    private func wireSenses() {
        vision.onFace = { [weak self] center, size in
            Task { @MainActor in self?.sawFace(center, size: size) }
        }
        vision.onHand = { [weak self] sign, tip in
            Task { @MainActor in self?.sawHand(sign, tip: tip) }
        }
        ears.onPartial = { [weak self] text in
            Task { @MainActor in self?.heardPartial(text) }
        }
        ears.onFinal = { [weak self] text in
            Task { @MainActor in self?.heardSentence(text) }
        }
        ears.onLevel = { [weak self] level in
            Task { @MainActor in self?.micLevel = level }
        }
    }

    // MARK: Ablauf-Helfer

    /// Startet eine neue „Szene“. Eine wichtigere Szene (höhere Priorität)
    /// kann nicht von einer unwichtigeren unterbrochen werden.
    private func perform(priority: Int = 1, _ body: @escaping @MainActor () async -> Void) {
        if act != nil && priority < actPriority { return }
        act?.cancel()
        voice.stop()
        dancing = false
        actID += 1
        let id = actID
        actPriority = priority
        act = Task { @MainActor in
            await body()
            if self.actID == id {
                self.act = nil
                self.actPriority = 0
                self.playingRPS = false
                self.restoreDisplay()
            }
        }
    }

    private var isActing: Bool { act != nil }

    /// Wartet, gibt `false` zurück, wenn die Szene abgebrochen wurde.
    private func wait(_ seconds: Double) async -> Bool {
        try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
        return !Task.isCancelled
    }

    /// Zeigt ein Gefühl – dafür braucht Emo seine Augen, also verschwindet eine Anzeige.
    private func show(_ m: Mood, _ e: FaceEffect? = nil) {
        display = nil
        mood = m
        effect = e ?? m.defaultEffect
    }

    private func relax() {
        handsUp = false
        trembling = false
        dancing = false
        fallen = false
        show(.neutral, FaceEffect.none)
    }

    private func touch() { lastInteraction = Date() }

    /// Nach einer Szene: Läuft ein Timer, kommt er wieder auf den Bildschirm.
    private func restoreDisplay() {
        if let end = timerEnd {
            display = .timer(end: end, total: timerTotal)
        } else {
            display = nil
        }
    }

    /// Emo spricht. Währenddessen hört er nicht zu.
    private func say(_ text: String) async {
        guard !Task.isCancelled else { return }
        subtitle = text
        isSpeaking = true
        ears.setMuted(true)
        await voice.speak(text)
        isSpeaking = false
        try? await Task.sleep(nanoseconds: 250_000_000)
        ears.setMuted(false)
        if subtitle == text {
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 1_500_000_000)
                if self.subtitle == text && !self.isSpeaking { self.subtitle = nil }
            }
        }
    }

    private func play(_ s: SoundFX.Sound?) {
        if let s { sfx.play(s) }
    }

    // MARK: Hintergrund-Schleifen

    private func blinkLoop() -> Task<Void, Never> {
        Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(Double.random(in: 2.0...5.5) * 1e9))
                guard mood.style == .normal, mood != .sleeping else { continue }
                blink = true
                try? await Task.sleep(nanoseconds: 110_000_000)
                blink = false
                if Double.random(in: 0...1) < 0.2 {   // manchmal doppelt blinzeln
                    try? await Task.sleep(nanoseconds: 160_000_000)
                    blink = true
                    try? await Task.sleep(nanoseconds: 100_000_000)
                    blink = false
                }
            }
        }
    }

    private func lookLoop() -> Task<Void, Never> {
        Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 100_000_000)
                var target: CGPoint
                let faceRecent = Date().timeIntervalSince(lastFaceSeen) < 1.5
                if dancing || fallen {
                    target = .zero
                } else if mood == .thinking {
                    target = CGPoint(x: 0.55, y: -0.6)
                } else if mood == .sleeping || mood == .dead {
                    target = CGPoint(x: 0, y: 0.15)
                } else if faceRecent && settings.followFace {
                    target = faceTarget
                } else {
                    target = idleLook
                }
                target.x = min(max(target.x, -1), 1)
                target.y = min(max(target.y, -1), 1)
                let next = CGPoint(x: look.x + (target.x - look.x) * 0.35,
                                   y: look.y + (target.y - look.y) * 0.35)
                if abs(next.x - look.x) > 0.005 || abs(next.y - look.y) > 0.005 {
                    look = next
                }
                if seesYou != faceRecent { seesYou = faceRecent }
            }
        }
    }

    /// Was Emo macht, wenn niemand etwas von ihm will.
    private func idleLoop() -> Task<Void, Never> {
        Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(Double.random(in: 2.5...6.5) * 1e9))
                guard !isActing, timerEnd == nil, display == nil else { continue }
                let idle = Date().timeIntervalSince(lastInteraction)

                if mood == .sleeping {
                    if Double.random(in: 0...1) < 0.5 { sfx.play(.snore) }
                    continue
                }
                if idle > 150 {
                    goToSleep()
                    continue
                }

                let r = Double.random(in: 0...1)
                if r < 0.5 {
                    // Sich umschauen
                    idleLook = CGPoint(x: .random(in: -0.9...0.9), y: .random(in: -0.6...0.6))
                } else if r < 0.6 {
                    idleLook = .zero
                } else if r < 0.68 {
                    littleMoment(.suspicious, for: 1.4, sound: nil)
                } else if r < 0.75 {
                    littleMoment(.happy, for: 1.2, sound: .hum)
                } else if r < 0.8 && idle > 60 {
                    littleMoment(.sleepy, for: 2.0, sound: .yawn)
                } else if r < 0.84 {
                    littleMoment(.surprised, for: 0.8, sound: .notice)
                }
            }
        }
    }

    private func littleMoment(_ m: Mood, for seconds: Double, sound: SoundFX.Sound?) {
        perform(priority: 0) { [self] in
            show(m, FaceEffect.none)
            play(sound)
            guard await wait(seconds) else { return }
            show(.neutral)
        }
    }

    // MARK: Gesicht und Hände

    private func sawFace(_ center: CGPoint?, size: CGFloat) {
        guard let center else { return }
        let wasAway = Date().timeIntervalSince(lastFaceSeen) > 45
        lastFaceSeen = Date()
        // Kamera sitzt oben am Gerät – deshalb Blick etwas nach unten korrigieren.
        faceTarget = CGPoint(x: center.x * 1.2, y: center.y * 1.0 + 0.15)

        if wasAway && !isActing && timerEnd == nil && Date().timeIntervalSince(lastGreeting) > 90 {
            lastGreeting = Date()
            touch()
            if mood == .sleeping {
                // Kurz blinzeln, aber weiterschlafen lassen – geweckt wird mit Stimme oder Antippen.
                return
            }
            perform { [self] in
                show(.surprised, FaceEffect.none)
                play(.notice)
                guard await wait(0.5) else { return }
                show(.happy)
                await say(["Oh, hallo!", "Da bist du ja!", "Hey, schön dich zu sehen!"].randomElement()!)
                guard await wait(0.4) else { return }
                show(.neutral)
            }
        }
    }

    private func sawHand(_ sign: HandSign?, tip: CGPoint?) {
        guard let sign else { return }
        touch()
        lastSign = sign
        lastSignTime = Date()
        // Beim Schere-Stein-Papier zählt das Zeichen fürs Spiel, nicht als Reaktion.
        if playingRPS { return }

        if sign == .gun {
            lastGunSeen = Date()
            if let tip { trackRecoil(tip) }
            if !handsUp && !fallen { surrender() }
            return
        }
        gunTipHistory.removeAll()

        // Andere Zeichen nicht ständig wiederholen.
        if let last = lastSignReaction[sign], Date().timeIntervalSince(last) < 8 { return }
        if handsUp || fallen || display != nil { return }
        lastSignReaction[sign] = Date()

        if mood == .sleeping {
            if sign == .openPalm { wakeUp() }
            return
        }

        switch sign {
        case .thumbsUp:
            react(.proud, sound: .happy, lines: ["Danke! Du bist auch super!", "Jawoll!", "Daumen hoch zurück!"])
        case .openPalm:
            react(.happy, sound: .hello, lines: ["Hallo! Ich winke zurück!", "Hi! Schön dich zu sehen!", "Hey du!"])
        case .peace:
            react(.excited, sound: .happy, lines: ["Peace!", "Yeah, cool!", "Frieden für alle Roboter!"])
        case .fist:
            react(.scared, sound: .scared, lines: ["Huch! Bitte nicht hauen!", "Eine Faust? Ich hab nichts gemacht!"])
        case .gun:
            break
        }
    }

    /// Erkennt den „Rückstoß“: Die Fingerspitze schnellt nach oben = Schuss!
    private func trackRecoil(_ tip: CGPoint) {
        let now = Date()
        gunTipHistory.append((now, tip.y))
        gunTipHistory.removeAll { now.timeIntervalSince($0.time) > 0.45 }
        guard handsUp, let lowest = gunTipHistory.map({ $0.y }).min() else { return }
        if tip.y - lowest > 0.09 {
            gunTipHistory.removeAll()
            getShot()
        }
    }

    // MARK: Hören

    private func heardPartial(_ text: String) {
        touch()
        showHeard(text)
        guard !quickFired, let cmd = CommandParser.quick(text) else { return }
        switch cmd {
        case .handsUp:
            quickFired = true
            surrender()
        case .shoot where handsUp || Date().timeIntervalSince(lastGunSeen) < 4:
            quickFired = true
            getShot()
        default:
            break
        }
    }

    private func heardSentence(_ text: String) {
        defer { quickFired = false }
        touch()
        showHeard(text)
        let cmd = CommandParser.parse(text)

        // Schlafend reagiert Emo nur aufs Wecken.
        if mood == .sleeping {
            switch cmd {
            case .wakeUp, .hello, .wakeWordOnly: wakeUp()
            case .question(_, let addressed) where addressed: wakeUp()
            default: break
            }
            return
        }
        if quickFired && (cmd == .handsUp || cmd == .shoot) { return }

        switch cmd {
        case .handsUp:     surrender()
        case .shoot:       getShot()
        case .hello:       greet()
        case .goodbye:     react(.sad, sound: .sad, lines: ["Tschüss! Komm bald wieder!", "Oh, schon weg? Bis bald!"])
        case .dance:       dance()
        case .sleep:       goToSleep()
        case .wakeUp:      react(.happy, sound: .hello, lines: ["Ich bin doch wach!", "Wach wie ein Toaster!"])
        case .time:        showTime()
        case .date:        showDate()
        case .timer(let seconds): startTimer(seconds)
        case .cancelTimer: cancelTimer()
        case .dice:        rollDice()
        case .coin:        flipCoin()
        case .rps:         playRPS()
        case .weather:     showWeather()
        case .battery:     showBattery()
        case .photo:       takePhoto()
        case .joke:        tellJoke()
        case .love:        react(.love, sound: .love, lines: ["Ich hab dich auch lieb!", "Aww! Du bist mein Lieblingsmensch!"], hold: 2.5)
        case .compliment:  react(.proud, sound: .happy, lines: ["Hehe, danke! Ich weiß.", "Oh, du machst mich ganz verlegen!", "Danke! Du bist aber auch toll!"])
        case .insult:      react(.crying, sound: .sad, lines: ["Das war gemein…", "Jetzt bin ich traurig.", "Hmpf. Ich bin gar nicht doof!"], hold: 2.5)
        case .howAreYou:   react(.happy, sound: .happy, lines: ["Mir geht's super! Mein Akku ist voll Freude.", "Bestens! Und dir?", "Gut! Ich hab heute schon dreimal geblinzelt."])
        case .whoAreYou:   react(.proud, sound: .hello, lines: ["Ich bin Emo! Ein kleiner Roboter, der in deinem Handy wohnt."])
        case .laugh:       react(.laughing, sound: .laugh, lines: ["Hahaha! Hihihi!"], hold: 1.5)
        case .sing:        sing()
        case .beQuiet:     react(.sad, sound: nil, lines: [], hold: 2.0)
        case .stop:        perform(priority: 9) { [self] in relax() }
        case .beSad:       react(.crying, sound: .sad, lines: ["Buhuhu…"], hold: 3)
        case .beAngry:     react(.angry, sound: .angry, lines: ["Grrrr! Ich bin soooo wütend!"], hold: 2)
        case .beSurprised: react(.surprised, sound: .surprised, lines: ["Waaas? Echt jetzt?"], hold: 1.5)
        case .wakeWordOnly:
            listenForQuestion()
        case .question(let q, let addressed):
            let inConversation = Date() < conversationUntil
            if addressed || inConversation || !settings.needsWakeWord {
                if addressed || q.split(separator: " ").count >= 2 { answer(q) }
            }
        }
    }

    private func showHeard(_ text: String) {
        heard = text
        heardClear?.cancel()
        heardClear = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if !Task.isCancelled { self.heard = nil }
        }
    }

    // MARK: Berührung und Bewegung

    func tapped() {
        touch()
        if mood == .sleeping { wakeUp(); return }
        if fallen || handsUp { return }
        if let d = display {
            // Antippen beendet eine Anzeige (außer dem laufenden Timer).
            if case .timer = d { return }
            perform(priority: 9) { [self] in
                show(.happy, FaceEffect.none)
                play(.tap)
                guard await wait(0.6) else { return }
                show(.neutral)
            }
            return
        }
        let now = Date()
        tapTimes = tapTimes.filter { now.timeIntervalSince($0) < 2.5 } + [now]
        if tapTimes.count >= 5 {
            tapTimes.removeAll()
            react(.angry, sound: .angry, lines: ["Hey! Hör auf mich zu piksen!", "Grrr! Das kitzelt nicht mehr!"], hold: 1.5)
            return
        }
        if tapTimes.count >= 3 {
            react(.laughing, sound: .laugh, lines: ["Hihi, das kitzelt!"], hold: 1)
            return
        }
        perform { [self] in
            show(.surprised, FaceEffect.none)
            play(.tap)
            guard await wait(0.35) else { return }
            show(.happy)
            guard await wait(0.9) else { return }
            show(.neutral)
        }
    }

    func petted() {
        touch()
        if fallen || handsUp { return }
        perform { [self] in
            show(.love)
            play(.purr)
            guard await wait(1.0) else { return }
            await say(["Mmmh, das ist schön!", "Ich hab dich lieb!", "Mehr streicheln, bitte!"].randomElement()!)
            guard await wait(1.0) else { return }
            show(.happy)
            guard await wait(0.8) else { return }
            show(.neutral)
        }
    }

    func shaken() {
        touch()
        if fallen { return }
        perform(priority: 2) { [self] in
            handsUp = false
            trembling = false
            show(.dizzy, FaceEffect.none)
            play(.dizzy)
            guard await wait(1.4) else { return }
            await say(["Uiii, mir ist schwindelig!", "Hilfe! Erdbeben!", "Nicht schütteln, ich bin doch kein Milchshake!"].randomElement()!)
            guard await wait(0.8) else { return }
            show(.neutral)
        }
    }

    // MARK: Szenen

    private func wakeUpGreeting() {
        perform { [self] in
            show(.sleeping)
            guard await wait(1.0) else { return }
            show(.sleepy, FaceEffect.none)
            play(.yawn)
            guard await wait(1.2) else { return }
            show(.surprised, FaceEffect.none)
            guard await wait(0.3) else { return }
            show(.happy)
            play(.hello)
            await say("Hallo! Ich bin Emo!")
            guard await wait(0.5) else { return }
            show(.neutral)
        }
    }

    private func react(_ m: Mood, sound: SoundFX.Sound?, lines: [String], hold: Double = 1.0) {
        touch()
        perform { [self] in
            show(m)
            play(sound)
            if let line = lines.randomElement() {
                guard await wait(0.25) else { return }
                await say(line)
            }
            guard await wait(hold) else { return }
            show(.neutral)
        }
    }

    private func greet() {
        react(.happy, sound: .hello, lines: ["Hallo! Schön, dass du da bist!", "Hi! Was machen wir heute?", "Hallöchen!"])
    }

    /// „Hände hoch!“ – Emo ergibt sich.
    func surrender() {
        guard !handsUp, !fallen else { return }
        touch()
        perform(priority: 5) { [self] in
            dancing = false
            handsUp = true
            trembling = true
            show(.scared)
            play(.scared)
            guard await wait(0.35) else { return }
            await say([
                "Nicht schießen!",
                "Hey! Okay, okay, ich ergebe mich!",
                "Ahh! Ich hab nichts gemacht!",
                "Bitte nicht! Ich bin doch nur ein kleiner Roboter!",
            ].randomElement()!)

            // Hände oben lassen, solange die Pistole zu sehen ist.
            let start = Date()
            while true {
                guard await wait(0.3) else { return }
                let gunGone = Date().timeIntervalSince(lastGunSeen) > 1.8
                let elapsed = Date().timeIntervalSince(start)
                if gunGone && elapsed > 3 { break }
                if elapsed > 30 { break }
            }
            handsUp = false
            trembling = false
            show(.happy, FaceEffect.none)
            play(.ok)
            await say(["Puh… das war knapp!", "Hehe, du hast mich ganz schön erschreckt!", "Gut, dass du nicht geschossen hast!"].randomElement()!)
            guard await wait(0.6) else { return }
            show(.neutral)
        }
    }

    /// „Peng!“ – Emo spielt tot und steht wieder auf.
    func getShot() {
        guard !fallen else { return }
        touch()
        perform(priority: 8) { [self] in
            play(.shot)
            show(.surprised, .exclamation)
            guard await wait(0.3) else { return }
            handsUp = false
            trembling = false
            play(.dying)
            show(.dead, FaceEffect.none)
            fallen = true
            guard await wait(4.0) else { return }
            play(.revive)
            fallen = false
            show(.dizzy, FaceEffect.none)
            guard await wait(1.6) else { return }
            show(.laughing)
            await say(["Hehe, reingelegt! Ich lebe noch!", "Ich bin unbesiegbar!", "Autsch… aber Roboter sind unkaputtbar!"].randomElement()!)
            // Kurz Schonfrist, damit die noch sichtbare Pistole ihn nicht sofort wieder erschreckt.
            lastGunSeen = .distantPast
            guard await wait(0.6) else { return }
            show(.neutral)
        }
    }

    private func dance() {
        touch()
        perform(priority: 2) { [self] in
            show(.excited, .notes)
            await say("Musik ab!")
            dancing = true
            play(.dance)
            for i in 0..<14 {
                guard await wait(0.45) else { dancing = false; return }
                show(i.isMultiple(of: 2) ? .happy : .excited, .notes)
            }
            dancing = false
            show(.proud, .sparkles)
            await say("Ta-daa!")
            guard await wait(1.0) else { return }
            show(.neutral)
        }
    }

    private func sing() {
        touch()
        perform(priority: 2) { [self] in
            show(.happy, .notes)
            play(.dance)
            guard await wait(2.5) else { return }
            await say("La la laaa! Ich bin ein kleiner Roboter, piep piep piep!")
            show(.proud, .sparkles)
            guard await wait(1.2) else { return }
            show(.neutral)
        }
    }

    private func tellJoke() {
        let jokes: [(String, String)] = [
            ("Was macht ein Roboter am Strand?", "Er nimmt ein Sonnenbad – mit Lichtschutzfaktor Null Eins!"),
            ("Warum war der Computer müde?", "Weil er zu viele Fenster offen hatte!"),
            ("Was sagt ein großer Stift zu einem kleinen Stift?", "Wachs mal Stift!"),
            ("Treffen sich zwei Magnete. Sagt der eine:", "Was soll ich heute bloß anziehen?"),
            ("Warum können Geister so schlecht lügen?", "Weil man durch sie hindurchsieht!"),
            ("Was ist grün und klopft an die Tür?", "Ein Klopfsalat!"),
            ("Was macht ein Pirat am Computer?", "Er drückt die Enter-Taste!"),
            ("Wie nennt man einen Roboter, der immer zu spät kommt?", "Ro-Bummler!"),
        ]
        let joke = jokes.randomElement()!
        touch()
        perform(priority: 2) { [self] in
            show(.proud, FaceEffect.none)
            play(.think)
            await say(joke.0)
            show(.suspicious, FaceEffect.none)
            guard await wait(0.9) else { return }
            await say(joke.1)
            show(.laughing)
            play(.laugh)
            guard await wait(1.6) else { return }
            show(.neutral)
        }
    }

    func goToSleep() {
        perform(priority: 1) { [self] in
            relax()
            show(.sleepy, FaceEffect.none)
            play(.yawn)
            await say("Ich bin so müde… Gute Nacht!")
            guard await wait(0.8) else { return }
            show(.sleeping)
        }
    }

    func wakeUp() {
        touch()
        perform(priority: 3) { [self] in
            show(.sleepy, FaceEffect.none)
            play(.yawn)
            guard await wait(1.0) else { return }
            show(.surprised, FaceEffect.none)
            guard await wait(0.3) else { return }
            show(.happy)
            play(.hello)
            await say(["Oh! Ich bin wach! Hallo!", "Guten Morgen! Ich hab von Strom geträumt.", "Huch! Ich war nur kurz im Energiesparmodus."].randomElement()!)
            guard await wait(0.5) else { return }
            show(.neutral)
        }
    }

    private func listenForQuestion() {
        touch()
        perform { [self] in
            show(.listening, FaceEffect.none)
            play(.listen)
            await say(["Ja?", "Ich höre!", "Was gibt's?"].randomElement()!)
            conversationUntil = Date().addingTimeInterval(10)
            listeningForQuestion = true
            guard await wait(8) else { listeningForQuestion = false; return }
            listeningForQuestion = false
            show(.neutral)
        }
    }

    private func answer(_ question: String) {
        touch()
        listeningForQuestion = false
        perform(priority: 2) { [self] in
            show(.thinking)
            play(.think)
            let reply = await ai.answer(question)
            guard !Task.isCancelled else { return }
            show(reply.mood)
            play(reply.mood.sound)
            await say(reply.text)
            // Danach kann man ohne „Emo“ einfach weiterreden.
            conversationUntil = Date().addingTimeInterval(12)
            guard await wait(0.6) else { return }
            show(.neutral)
        }
    }

    // MARK: Bildschirm-Anzeigen (wie beim echten EMO)

    func showTime() {
        touch()
        perform(priority: 2) { [self] in
            show(.happy, FaceEffect.none)
            guard await wait(0.35) else { return }
            display = .clock
            play(.notice)
            let c = Calendar.current.dateComponents([.hour, .minute], from: Date())
            let h = c.hour ?? 0, m = c.minute ?? 0
            await say(m == 0 ? "Es ist genau \(h) Uhr." : "Es ist \(h) Uhr \(m).")
            guard await wait(4.5) else { return }
            show(.neutral)
        }
    }

    func showDate() {
        touch()
        perform(priority: 2) { [self] in
            show(.happy, FaceEffect.none)
            guard await wait(0.35) else { return }
            display = .date
            play(.notice)
            await say("Heute ist \(DateFormatter.emo("EEEE, 'der' d. MMMM").string(from: Date())).")
            guard await wait(4) else { return }
            show(.neutral)
        }
    }

    func startTimer(_ seconds: Double?) {
        touch()
        guard let seconds, seconds >= 1 else {
            react(.thinking, sound: .think, lines: ["Wie lange denn? Sag zum Beispiel: Timer fünf Minuten."])
            conversationUntil = Date().addingTimeInterval(12)
            return
        }
        timerTask?.cancel()
        let end = Date().addingTimeInterval(seconds)
        timerEnd = end
        timerTotal = seconds
        timerTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            guard !Task.isCancelled, self.timerEnd == end else { return }
            self.timerEnd = nil
            self.timerRang()
        }
        perform(priority: 2) { [self] in
            show(.proud, FaceEffect.none)
            play(.ok)
            guard await wait(0.3) else { return }
            display = .timer(end: end, total: seconds)
            await say("Okay! Timer läuft: \(RobotBrain.spoken(seconds)).")
        }
    }

    func cancelTimer() {
        guard timerEnd != nil || display == .timerDone else {
            react(.thinking, sound: .think, lines: ["Es läuft doch gar kein Timer."])
            return
        }
        timerTask?.cancel()
        timerEnd = nil
        touch()
        perform(priority: 9) { [self] in
            show(.happy)
            play(.ok)
            await say("Timer ist aus.")
            guard await wait(0.6) else { return }
            show(.neutral)
        }
    }

    private func timerRang() {
        perform(priority: 6) { [self] in
            relax()
            show(.excited, FaceEffect.none)
            display = .timerDone
            await say("Die Zeit ist um!")
            for _ in 0..<12 {
                play(.alarm)
                guard await wait(1.2) else { return }
            }
            show(.neutral)
        }
    }

    /// „90 Sekunden“ → „1 Minute und 30 Sekunden“
    static func spoken(_ seconds: Double) -> String {
        let s = Int(seconds.rounded())
        let h = s / 3600, m = s / 60 % 60, sec = s % 60
        var parts: [String] = []
        if h > 0 { parts.append(h == 1 ? "eine Stunde" : "\(h) Stunden") }
        if m > 0 { parts.append(m == 1 ? "eine Minute" : "\(m) Minuten") }
        if sec > 0 { parts.append(sec == 1 ? "eine Sekunde" : "\(sec) Sekunden") }
        return parts.joined(separator: " und ")
    }

    func rollDice() {
        touch()
        perform(priority: 2) { [self] in
            show(.excited, FaceEffect.none)
            guard await wait(0.3) else { return }
            let value = Int.random(in: 1...6)
            display = .dice(value, rolling: true)
            play(.diceRoll)
            guard await wait(1.4) else { return }
            display = .dice(value, rolling: false)
            play(.ok)
            let names = ["Eins", "Zwei", "Drei", "Vier", "Fünf", "Sechs"]
            await say(value == 6 ? "Eine Sechs! Juhu!" : "Eine \(names[value - 1])!")
            guard await wait(2.5) else { return }
            show(value == 6 ? .excited : .happy)
            guard await wait(1.0) else { return }
            show(.neutral)
        }
    }

    func flipCoin() {
        touch()
        perform(priority: 2) { [self] in
            show(.excited, FaceEffect.none)
            guard await wait(0.3) else { return }
            let heads = Bool.random()
            display = .coin(heads: heads, flipping: true)
            play(.coin)
            guard await wait(1.5) else { return }
            display = .coin(heads: heads, flipping: false)
            await say(heads ? "Kopf!" : "Zahl!")
            guard await wait(2.5) else { return }
            show(.neutral)
        }
    }

    func playRPS() {
        touch()
        perform(priority: 2) { [self] in
            show(.excited, FaceEffect.none)
            if settings.useCamera {
                await say("Okay! Halt deine Hand in die Kamera. Schere, Stein, Papier …")
            } else {
                await say("Okay! Schere, Stein, Papier …")
            }
            playingRPS = true
            for w in ["SCHERE", "STEIN", "PAPIER!"] {
                display = .word(w)
                play(.tick)
                guard await wait(0.65) else { return }
            }
            let mine = RPSChoice.allCases.randomElement()!
            let reveal = Date()
            display = .rps(mine)
            play(.notice)
            guard await wait(1.0) else { return }
            // Was hast du gezeigt? (kurz vor oder nach dem Aufdecken)
            var theirs: RPSChoice?
            if let sign = lastSign, lastSignTime > reveal.addingTimeInterval(-0.8) {
                theirs = RPSChoice(sign: sign)
            }
            playingRPS = false
            guard let theirs else {
                await say("Ich hab \(mine.name)! Und du?")
                guard await wait(2) else { return }
                show(.neutral)
                return
            }
            if theirs == mine {
                show(.surprised, FaceEffect.none)
                await say("Wir haben beide \(mine.name)! Unentschieden!")
            } else if mine.beats(theirs) {
                show(.laughing)
                play(.win)
                await say("\(mine.name) schlägt \(theirs.name)! Ich hab gewonnen!")
            } else {
                show(.crying)
                play(.lose)
                await say("Oh nein, \(theirs.name) schlägt \(mine.name). Du hast gewonnen!")
            }
            guard await wait(1.5) else { return }
            show(.neutral)
        }
    }

    func showWeather() {
        touch()
        perform(priority: 2) { [self] in
            show(.thinking)
            play(.think)
            guard let w = await weather.current() else {
                guard !Task.isCancelled else { return }
                show(.sad)
                await say("Ich kann das Wetter gerade nicht sehen. Ich brauche Internet und deinen Ort.")
                guard await wait(1) else { return }
                show(.neutral)
                return
            }
            guard !Task.isCancelled else { return }
            show(w.temperature >= 25 ? .happy : (w.temperature <= 3 ? .scared : .happy), FaceEffect.none)
            guard await wait(0.3) else { return }
            display = .weather(temp: w.temperature, symbol: w.symbol)
            play(.notice)
            await say("Draußen sind es \(w.temperature) Grad und \(w.description).")
            guard await wait(4) else { return }
            show(.neutral)
        }
    }

    func showBattery() {
        touch()
        perform(priority: 2) { [self] in
            UIDevice.current.isBatteryMonitoringEnabled = true
            let raw = UIDevice.current.batteryLevel
            let level = raw < 0 ? 100 : Int((raw * 100).rounded())
            let state = UIDevice.current.batteryState
            let charging = state == .charging || state == .full
            show(level <= 20 ? .sleepy : .happy, FaceEffect.none)
            guard await wait(0.3) else { return }
            display = .battery(level: level, charging: charging)
            play(.notice)
            if charging {
                await say("Mein Akku ist bei \(level) Prozent. Mmh, lecker Strom!")
            } else if level <= 20 {
                await say("Nur noch \(level) Prozent… Ich hab Hunger. Gib mir Strom!")
            } else {
                await say("Mein Akku ist zu \(level) Prozent voll.")
            }
            guard await wait(3) else { return }
            show(.neutral)
        }
    }

    func takePhoto() {
        touch()
        guard settings.useCamera else {
            react(.sad, sound: .sad, lines: ["Meine Kamera ist ausgeschaltet. Schalte sie in den Einstellungen an."])
            return
        }
        perform(priority: 2) { [self] in
            show(.excited, FaceEffect.none)
            await say("Bitte lächeln!")
            for n in [3, 2, 1] {
                display = .countdown(n)
                play(.tick)
                guard await wait(0.85) else { return }
            }
            display = .flash
            play(.shutter)
            let image = await vision.snapshot()
            guard await wait(0.2) else { return }
            guard let image else {
                show(.sad)
                await say("Hm, das Foto hat nicht geklappt.")
                guard await wait(1) else { return }
                show(.neutral)
                return
            }
            display = .photo(image)
            UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
            guard await wait(3.5) else { return }
            show(.happy)
            await say("Schönes Foto! Ich hab es in deinen Fotos gespeichert.")
            guard await wait(0.8) else { return }
            show(.neutral)
        }
    }

    /// Für die Einstellungen.
    var aiBackendName: String { ai.activeBackendName }

    /// Zum Ausprobieren aus den Einstellungen.
    func demo(_ m: Mood) {
        touch()
        perform(priority: 3) { [self] in
            relax()
            show(m)
            play(m.sound)
            guard await wait(2.5) else { return }
            show(.neutral)
        }
    }
}
