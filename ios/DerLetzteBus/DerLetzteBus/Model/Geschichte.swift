//
//  Geschichte.swift
//  Alle Texte von „Der letzte Bus“: Fahrgäste, Haltestellen, Fahrer, Enden.
//
//  Jeder Fahrgast hat bei seinen Hinweisen zwei Fassungen:
//  [0] = er ist ein Mensch, [1] = er ist das Ding.
//  „{name}“ wird später durch den Namen des Spielers ersetzt.
//

import Foundation

struct Fahrgast {
    let id: String
    let name: String
    let kurz: String
    let einstieg: [String]
    let reden: [[String]]
    let ansehen: [[String]]
    let nochmal: [[String]]
    let beschuldigt: String
    let enttarnt: [String]
    let lacht: String

    func hinweis(_ art: Aktion, ding: Bool) -> [String] {
        let i = ding ? 1 : 0
        switch art {
        case .reden: return reden[i]
        case .ansehen: return ansehen[i]
        case .nochmal: return nochmal[i]
        }
    }
}

enum Aktion: String, CaseIterable {
    case reden, ansehen, nochmal
}

enum Szene {
    case stadt, bahnhof, linden, friedhof, namenlos, schule, zuhause, ende
}

enum Laternen {
    case an, flackern, aus, eine
}

struct Haltestelle {
    let szene: Szene
    let schild: String
    let uhr: String
    let regen: Double
    let laternen: Laternen
    var steigt: String? = nil
    var fahrt: [String] = []
    var text: [String] = []
    var zuhause = false
    var ende = false
}

enum Ende: String, CaseIterable {
    case ausgestiegen, fahrgast, doppelt, steuer

    var titel: String {
        switch self {
        case .ausgestiegen: return "Ausgestiegen"
        case .fahrgast: return "Fahrgast"
        case .doppelt: return "Doppelt"
        case .steuer: return "Am Steuer"
        }
    }
}

enum Geschichte {

    static let zahlen = ["keinen einzigen", "eins", "zwei", "drei", "vier", "fünf", "sechs"]

    // MARK: Fahrgäste

    static let reihenfolge = ["berger", "jonas", "mira", "albrecht", "lotte"]

    static let leute: [String: Fahrgast] = Dictionary(uniqueKeysWithValues: alle.map { ($0.id, $0) })

    private static let alle: [Fahrgast] = [
        Fahrgast(
            id: "berger", name: "Frau Berger", kurz: "HB",
            einstieg: [
                "Eine alte Frau steigt ein. In der einen Hand eine Einkaufstasche, in der anderen Stricknadeln. Sie nickt dir zu und setzt sich schräg gegenüber.",
                "Aus ihrer Tasche hängt ein roter Schal. Er ist viel zu lang. Er reicht bis auf den Boden."
            ],
            reden: [
                ["Sie lächelt. „Der ist für meinen Enkel. Er wird nächste Woche zehn.“", "Sie hält den Schal hoch. „Ich höre einfach nie rechtzeitig auf. Das sagt meine Tochter auch immer.“"],
                ["Sie lächelt. „Der ist für meinen Enkel.“ Die Nadeln klappern weiter, während sie dich ansieht. Sie schaut nicht ein einziges Mal auf ihre Hände.", "„Er wird zehn“, sagt sie. „Er wird schon so lange zehn.“"]
            ],
            ansehen: [
                ["Du beobachtest sie heimlich. Sie pustet in einen Becher Tee aus ihrer Thermoskanne, und ihre Brille beschlägt dabei.", "Ihre Hände zittern ein bisschen. Ganz normale, müde, alte Hände."],
                ["Du beobachtest sie heimlich. Sie pustet in einen Becher Tee aus ihrer Thermoskanne. Ihre Brille beschlägt nicht.", "Dann siehst du es: Der Becher ist leer. Sie trinkt trotzdem. Schluck für Schluck."]
            ],
            nochmal: [
                ["„Weißt du, wo dieser Bus eigentlich hinfährt?“, fragt sie leise. „Ich glaube, ich bin falsch eingestiegen. Ich wollte zum Klinikum.“", "Sie lacht nervös und strickt schneller."],
                ["„Du warst schon mal hier“, sagt sie, ohne aufzusehen. „Letzten Winter. Mit der blauen Mütze.“", "Du hattest letzten Winter eine blaue Mütze. Du hast sie verloren. In einem Bus."]
            ],
            beschuldigt: "„Ich?“ Frau Berger lässt die Nadeln sinken. Ihre Augen füllen sich mit Tränen. „Kind, ich will doch nur zu meinem Enkel.“",
            enttarnt: [
                "Frau Berger hört auf zu stricken. Zum ersten Mal.",
                "Der rote Schal rutscht von ihrem Schoß und hört nicht auf zu rutschen, Meter um Meter, bis er den ganzen Gang bedeckt.",
                "„Schade“, sagt sie. Ihr Mund bewegt sich dabei nicht."
            ],
            lacht: "„Er wird zehn“, flüstert Frau Berger hinter dir. „Und du wirst … gar nichts mehr.“"
        ),
        Fahrgast(
            id: "jonas", name: "Jonas", kurz: "JO",
            einstieg: [
                "Ein Junge steigt ein, vielleicht sechzehn. Die Kapuze tief im Gesicht, große Kopfhörer über den Ohren.",
                "Er lässt sich auf die letzte Bank fallen und starrt auf sein Handy. Der Bildschirm ist schwarz."
            ],
            reden: [
                ["Er zieht einen Kopfhörer herunter. „Was?“", "„Mein Akku ist leer, seit ich eingestiegen bin. War vorhin noch bei achtzig.“ Er reibt sich die Arme. „Ist dir auch so kalt?“"],
                ["Er zieht einen Kopfhörer herunter. Aus dem Kopfhörer kommt keine Musik. Nur Atmen. Langsam. Im selben Takt wie deins.", "„Was?“, fragt er. Seine Lippen bewegen sich einen Moment zu spät."]
            ],
            ansehen: [
                ["Er wippt nervös mit dem Fuß. An seinen Turnschuhen klebt frischer Matsch, und auf seiner Hand ist ein Pflaster mit kleinen Dinos drauf.", "Er sieht aus wie jemand, der dringend nach Hause will."],
                ["Er sitzt ganz still. Zu still.", "Du beobachtest ihn, bis der Bus die nächste Kurve nimmt. Er blinzelt nicht. Kein einziges Mal."]
            ],
            nochmal: [
                ["„Meine Mutter bringt mich um“, murmelt er. „Ich hab versprochen, um zwölf zu Hause zu sein.“", "Er sieht aus dem Fenster. „Die Bäume in der Lindenallee hatten heute Mittag noch Blätter. Ich schwör’s.“"],
                ["„Wie heißt du?“, fragt er. Du sagst es ihm.", "„{name}“, wiederholt er. Dann noch einmal. „{name}.“ Und noch einmal, leiser, als würde er üben, wie es klingt."]
            ],
            beschuldigt: "Jonas springt auf. „Was? Ich? Spinnst du? Ich hab Hunger, mir ist kalt und ich will nach Hause!“ Seine Stimme bricht.",
            enttarnt: [
                "Jonas nimmt langsam die Kopfhörer ab. Darunter sind keine Ohren.",
                "Er lächelt. Das Lächeln geht zu weit. Viel zu weit.",
                "„{name}“, sagt er mit deiner Stimme. „Fast hätte ich es richtig gekonnt.“"
            ],
            lacht: "„{name}“, sagt Jonas hinter dir. Mit deiner Stimme. Diesmal klingt es perfekt."
        ),
        Fahrgast(
            id: "mira", name: "Mira", kurz: "MI",
            einstieg: [
                "Eine junge Frau steigt ein. Unter ihrem Regenmantel trägt sie hellblaue Krankenhauskleidung, in der Hand einen Kaffeebecher. Ihre Augen sind rot vor Müdigkeit.",
                "Hinter ihr, am Friedhofstor, steht jetzt niemand mehr."
            ],
            reden: [
                ["„Nachtschicht“, sagt sie und hebt den Becher. „Zwölf Stunden.“", "„Ich wohne hinter dem Friedhof. Ist eine Abkürzung. Nachts ein bisschen gruselig, aber man gewöhnt sich dran.“"],
                ["„Nachtschicht“, sagt sie. „Ich habe heute jemanden verloren.“ Sie lächelt dabei.", "„Aber jetzt ist er ja wieder da.“ Sie sieht an dir vorbei. Auf den leeren Platz neben dir."]
            ],
            ansehen: [
                ["Auf ihrem Namensschild steht „M. Okafor – Station 4“. Ihr Regenmantel ist trocken, nur an ihren Schuhen klebt feuchtes Gras vom Friedhof.", "Sie gähnt so heftig, dass ihr die Augen tränen. Der Kaffee dampft."],
                ["Ihr Namensschild ist leer.", "Ihr Mantel tropft. Dabei hat es am Friedhof gar nicht geregnet. Die Pfütze unter ihrem Sitz wird immer größer. Das Wasser ist schwarz."]
            ],
            nochmal: [
                ["Sie mustert dich, so wie Krankenschwestern das machen. „Du bist ganz schön blass. Hast du heute was gegessen?“", "Sie gibt dir einen Müsliriegel. Ihre Finger sind warm."],
                ["Sie greift nach deinem Handgelenk, ganz professionell, und fühlt deinen Puls. Ihre Finger sind eiskalt.", "„Hm“, sagt sie. „Noch.“"]
            ],
            beschuldigt: "Mira sieht dich müde an. „Ehrlich jetzt? Ich hab zwölf Stunden Leute gerettet, und du …“ Sie schüttelt den Kopf und sieht weg.",
            enttarnt: [
                "Mira stellt den Kaffeebecher ab. Er ist voll mit schwarzem Wasser.",
                "Sie steht auf, und das Wasser läuft aus ihren Ärmeln, aus ihren Haaren, aus ihren Augen.",
                "„Ich hätte gut auf dich aufgepasst“, sagt sie. „Für immer.“"
            ],
            lacht: "„Hm“, macht Mira hinter dir, und ihre kalten Finger legen sich um dein Handgelenk. „Jetzt nicht mehr.“"
        ),
        Fahrgast(
            id: "albrecht", name: "Herr Albrecht", kurz: "HA",
            einstieg: [
                "Ein großer Mann in einem grauen Mantel steigt ein und nimmt höflich den Hut ab. Sein Regenschirm ist zusammengeklappt und völlig trocken.",
                "„Guten Abend allerseits“, sagt er und setzt sich direkt hinter den Fahrer."
            ],
            reden: [
                ["„Albrecht, sehr angenehm.“ Er nickt dir zu und tippt auf den Anhänger an deinem Rucksack. „Und du bist {name}. Steht ja hier.“", "„Man sollte seinen Namen nachts nicht so offen herumtragen“, sagt er. „Man weiß nie, wer mitliest.“"],
                ["„Guten Abend, {name}“, sagt er freundlich.", "Du hast ihm deinen Namen nicht gesagt. Er steht nirgends. „Wir kennen uns noch nicht“, sagt er. „Aber bald.“"]
            ],
            ansehen: [
                ["Er liest Zeitung. Eine ganz normale Zeitung von heute, mit Fußballergebnissen und Wetterbericht. Ab und zu schüttelt er den Kopf.", "Er riecht nach Pfefferminz und Rasierwasser."],
                ["Er liest Zeitung. Du schielst auf die Seite: Das Datum ist von morgen.", "Auf der Titelseite ist ein Foto. Von diesem Bus."]
            ],
            nochmal: [
                ["„Ich fahre diese Strecke jede Nacht“, erzählt er. „Ich bin Nachtwächter im Stadtmuseum.“", "„Diese Haltestelle hatte früher einen Namen. Irgendwann ist er einfach … abgeblättert. Niemand hat ihn neu geschrieben.“"],
                ["„Ich fahre diese Strecke jede Nacht“, sagt er. „Schon sehr, sehr lange.“", "Er zählt die Fahrgäste mit dem Finger ab. Bei dir hört er auf und lächelt."]
            ],
            beschuldigt: "Herr Albrecht hebt die Augenbrauen. „Junger Mensch, das ist eine ziemlich unhöfliche Behauptung.“ Seine Hände krallen sich um den Regenschirm. Sie zittern.",
            enttarnt: [
                "Herr Albrecht faltet seine Zeitung zusammen, ordentlich, Kante auf Kante.",
                "Dann setzt er seinen Hut auf. Unter dem Hut ist kein Gesicht mehr. Nur Dunkelheit, die dich ansieht.",
                "„Morgen“, sagt die Dunkelheit höflich. „Morgen steht es in der Zeitung.“"
            ],
            lacht: "„Wir kennen uns noch nicht“, sagt Herr Albrecht hinter dir. „Aber jetzt haben wir ja Zeit.“"
        ),
        Fahrgast(
            id: "lotte", name: "Lotte", kurz: "LO",
            einstieg: [
                "Ein kleines Mädchen in einer gelben Regenjacke steigt ein. Ganz allein. Sie drückt einen Stoffhasen an sich, der nur ein Ohr hat.",
                "Der Fahrer sagt nichts. Sie setzt sich auf den Platz direkt neben der Tür."
            ],
            reden: [
                ["„Ich warte auf meine Mama“, sagt sie ernst. „Sie hat gesagt, ich soll an der Schule warten. Aber dann ist es so dunkel geworden.“", "Ihre Unterlippe zittert. „Fährt der Bus nach Hause?“"],
                ["„Ich warte auf meine Mama“, sagt sie ernst. „Schon seit 1987.“", "Dann kichert sie, als wäre das ein richtig guter Witz."]
            ],
            ansehen: [
                ["Ihre Schuhe sind mit Doppelknoten zugebunden, so wie Eltern das machen. Aus ihrer Jackentasche guckt ein Zettel:", "„Lotte, Klasse 1b. Bei Fragen bitte Mama anrufen.“ Darunter eine Telefonnummer."],
                ["Die Deckenlampe hängt genau über ihr. Unter ihrem Sitz ist der Boden hell.", "Sie wirft keinen Schatten. Und ihr Hase hat jetzt zwei Ohren."]
            ],
            nochmal: [
                ["Sie hält dir ihren Hasen hin. „Das ist Herr Hoppel. Er hat Angst im Dunkeln.“", "„Ich nicht“, sagt sie. Dann rückt sie ein Stück näher an dich heran. „Na gut. Ein bisschen.“"],
                ["„Du sitzt auf dem Platz von jemandem“, flüstert sie.", "„Er kommt gleich wieder.“"]
            ],
            beschuldigt: "Lotte versteht nicht sofort. Dann fängt sie an zu weinen, ganz leise, und drückt Herrn Hoppel an sich. „Ich will zu meiner Mama.“",
            enttarnt: [
                "Lotte hört auf zu kichern.",
                "Sie lässt den Hasen fallen. Er landet mit einem nassen Geräusch, das nicht nach Stoff klingt.",
                "„Du hättest mein Freund sein können“, sagt sie, und ihre Stimme ist plötzlich sehr, sehr alt."
            ],
            lacht: "Hinter dir kichert Lotte. „Jetzt bist du dran mit Warten.“"
        )
    ]

    // MARK: Haltestellen – jede seltsamer als die vorige

    static let halte: [Haltestelle] = [
        Haltestelle(szene: .stadt, schild: "Marktplatz", uhr: "00:47", regen: 1, laternen: .an),
        Haltestelle(
            szene: .bahnhof, schild: "Hauptbahnhof", uhr: "00:53", regen: 1, laternen: .an, steigt: "berger",
            fahrt: ["Der Bus fährt durch die leere Innenstadt. Alle Ampeln sind grün. Alle gleichzeitig."],
            text: ["Die große Uhr über dem Bahnhofseingang hat keine Zeiger.", "Der Bahnhof ist leer. Nur unter dem Wartehäuschen steht jemand, als hätte er genau auf diesen Bus gewartet."]
        ),
        Haltestelle(
            szene: .linden, schild: "Lindenallee", uhr: "01:04", regen: 0.35, laternen: .flackern, steigt: "jonas",
            fahrt: ["Die Scheibenwischer quietschen. Irgendwann merkst du, dass sie im Takt quietschen. Wie ein Lied, das du kennst und an das du dich nicht erinnern willst."],
            text: ["Die Lindenallee. Hier läufst du jeden Morgen zur Schule. Aber so kennst du sie nicht.", "Die Bäume sind kahl, alle, und ihre Äste hängen über die Straße wie lange, dünne Finger. Der Regen hört auf, als hätte jemand ihn abgedreht."]
        ),
        Haltestelle(
            szene: .friedhof, schild: "Am Alten Friedhof", uhr: "01:13", regen: 0, laternen: .aus, steigt: "mira",
            fahrt: ["Der Bus biegt ab, wo er nicht abbiegen sollte. Die Straßen werden schmaler. Die Häuser haben keine Türen mehr."],
            text: ["Diese Haltestelle gibt es nicht. Der Alte Friedhof liegt am anderen Ende der Stadt, und dort fährt kein Bus.", "Nebel kriecht zwischen den Grabsteinen hervor und legt sich um die Räder. Das Tor steht offen."]
        ),
        Haltestelle(
            szene: .namenlos, schild: "", uhr: "01:31", regen: 0, laternen: .eine, steigt: "albrecht",
            fahrt: ["Lange fährt der Bus durch völlige Dunkelheit. Draußen ist kein einziges Licht. Im Glas siehst du nur euch selbst."],
            text: ["Der Bus hält an einer Haltestelle ohne Namen. Das Schild ist leer. Auf dem Fahrplan steht nur eine einzige Abfahrtszeit: jetzt.", "Rundherum ist nichts. Keine Häuser, keine Straße. Nur eine Laterne, die genau über dem Bus brennt."]
        ),
        Haltestelle(
            szene: .schule, schild: "Schulstraße", uhr: "02:00", regen: 0, laternen: .an, steigt: "lotte",
            fahrt: ["Der Bus wird schneller. Die Laternen ziehen so schnell vorbei, dass sie zu einem einzigen Lichtstreifen verschwimmen."],
            text: ["Schulstraße. Deine Schule. Es ist zwei Uhr nachts, und in jedem einzelnen Fenster brennt Licht.", "In deinem Klassenzimmer, zweiter Stock, drittes Fenster, sitzt jemand an deinem Platz. Bevor du genauer hinsehen kannst, gehen alle Lichter gleichzeitig aus."]
        ),
        Haltestelle(
            szene: .zuhause, schild: "Ahornweg", uhr: "02:47", regen: 0.2, laternen: .an,
            fahrt: ["Der Motor brummt tief und gleichmäßig, wie etwas Großes, das schläft."],
            text: ["Ahornweg. Deine Haltestelle. Endlich.", "Da ist euer Haus. In der Küche brennt Licht. Durch das Fenster siehst du jemanden am Tisch sitzen. Er wartet auf dich.", "Die Türen öffnen sich. Niemand steigt ein. Trotzdem senkt sich der Bus ein Stück, als wäre etwas Schweres zugestiegen.", "Der Fahrer wartet."],
            zuhause: true
        ),
        Haltestelle(
            szene: .ende, schild: "Endstation", uhr: "00:47", regen: 0, laternen: .aus,
            fahrt: ["Der Bus fährt weiter. Weg von deinem Haus, weg von allem. Die Straße unter den Rädern wird weich und still."],
            ende: true
        )
    ]

    // MARK: Der Fahrer

    static let fahrer: [[String]] = [
        ["Du gehst nach vorne. „Entschuldigung, wohin fährt dieser Bus?“", "Der Fahrer antwortet nicht. Im Rückspiegel siehst du nur den Schirm seiner Mütze."],
        ["„Hallo? Ich muss zum Ahornweg.“", "Der Fahrer hebt einen Finger, ohne sich umzudrehen, und zeigt auf das Schild über seinem Kopf: BITTE WÄHREND DER FAHRT NICHT MIT DEM FAHRER SPRECHEN.", "Darunter hat jemand mit Kuli geschrieben: ZÄHL LIEBER."],
        ["Diesmal sind seine Augen im Rückspiegel zu sehen. Müde Augen. Sie kommen dir bekannt vor.", "Sehr bekannt."],
        ["„Sie sehen aus wie …“, fängst du an.", "Der Fahrer klappt den Rückspiegel nach oben."],
        ["Der Fahrer summt leise. Es ist dasselbe Lied wie das der Scheibenwischer."]
    ]
}
