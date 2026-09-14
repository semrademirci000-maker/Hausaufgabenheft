//
//  People.swift
//  Die Familie, die Freunde und alles, was sie sagen und fragen.
//

import SwiftUI

struct Person {
    let key: String
    let name: String
    let rolle: String
    let kurz: String
    let color: Color
    let palette: ActorPalette
}

/// Eine Antwortmöglichkeit und was der Begleiter darauf sagt.
struct Answer {
    let text: String
    let reply: String
}

struct Question {
    let text: String
    let answers: [Answer]
}

enum Chat {

    static let zombiePalette = ActorPalette(
        hair: 0x2F4A2A, skin: 0x7AA85F, eye: 0xC43A2A,
        shirt: 0x5B4A3A, shirtDark: 0x443528, pants: 0x3A3A44, boots: 0x2A2622
    )

    static let friendKeys = ["lisbeth", "tarik", "momo", "gris"]
    static let familyKeys = ["mama", "papa", "mila"]

    static let people: [String: Person] = [
        "lisbeth": Person(
            key: "lisbeth", name: "Lisbeth", rolle: "Bogenschuetzin", kurz: "Lisbeth",
            color: Color(hex: 0x8FD36A),
            palette: ActorPalette(hair: 0xA8642A, skin: 0xF0C191,
                                  shirt: 0x4F9B45, shirtDark: 0x3A7A34,
                                  pants: 0x5B4326, boots: 0x3A2A18)
        ),
        "tarik": Person(
            key: "tarik", name: "Tarik", rolle: "Schmied", kurz: "Tarik",
            color: Color(hex: 0xE8A54A),
            palette: ActorPalette(hair: 0x2A1D14, skin: 0xC08A5A,
                                  shirt: 0xB8603A, shirtDark: 0x94472A,
                                  pants: 0x3B3B46, boots: 0x2A2A33)
        ),
        "momo": Person(
            key: "momo", name: "Momo", rolle: "Magierin", kurz: "Momo",
            color: Color(hex: 0xC78CE0),
            palette: ActorPalette(hair: 0x6B3F8A, skin: 0xF5CFA8,
                                  shirt: 0x8A5AC4, shirtDark: 0x6B44A0,
                                  pants: 0x4A3A6B, boots: 0x2F2545)
        ),
        "gris": Person(
            key: "gris", name: "Griswold", rolle: "alter Waechter", kurz: "Griswold",
            color: Color(hex: 0xA9C0D8),
            palette: ActorPalette(hair: 0xCFD4DC, skin: 0xE0B48A,
                                  shirt: 0x5A6478, shirtDark: 0x454E60,
                                  pants: 0x3B4250, boots: 0x2A2F3A)
        ),
        "mama": Person(
            key: "mama", name: "Mama Edda", rolle: "Mutter", kurz: "Edda",
            color: Color(hex: 0xF0A0B8),
            palette: ActorPalette(hair: 0x8A5A2A, skin: 0xF0C191,
                                  shirt: 0xC4557A, shirtDark: 0xA03F60,
                                  pants: 0x6B4A2B, boots: 0x4A3524)
        ),
        "papa": Person(
            key: "papa", name: "Papa Gunnar", rolle: "Vater", kurz: "Gunnar",
            color: Color(hex: 0xD8C07A),
            palette: ActorPalette(hair: 0x6B4A2B, skin: 0xE8B58A,
                                  shirt: 0x4A6B8A, shirtDark: 0x37536B,
                                  pants: 0x4A3A2A, boots: 0x33261A)
        ),
        "mila": Person(
            key: "mila", name: "Mila", rolle: "kleine Schwester", kurz: "Mila",
            color: Color(hex: 0x9AD8E0),
            palette: ActorPalette(hair: 0xE0C05A, skin: 0xF5CFA8,
                                  shirt: 0x5AB8C4, shirtDark: 0x3F95A0,
                                  pants: 0x8A5AC4, boots: 0x5B4326)
        ),
        "buerger": Person(
            key: "buerger", name: "Stadtmensch", rolle: "Buerger", kurz: "Buerger",
            color: Color(hex: 0xC8C8D8),
            palette: ActorPalette(hair: 0x4A3A2A, skin: 0xE8B58A,
                                  shirt: 0x6B7A8A, shirtDark: 0x55606E,
                                  pants: 0x3B3B46, boots: 0x2A2A33)
        )
    ]

    static func person(_ key: String) -> Person {
        people[key] ?? people["lisbeth"]!
    }

    /// Die Fragen, die die Begleiter von selbst stellen – je nach Ort.
    static let fragen: [String: [Question]] = [
        "wald": [
            Question(text: "Sag mal, wie viele Zombies schaffen wir heute?", answers: [
                Answer(text: "Alle! Jeden einzelnen.",
                       reply: "Ha! Genau so redet ein Ritter."),
                Answer(text: "Vielleicht zehn.",
                       reply: "Zehn sind ein guter Anfang."),
                Answer(text: "Am liebsten keinen.",
                       reply: "Auch gut. Dann gehen wir Beeren suchen.")
            ]),
            Question(text: "Riechst du das auch? So modrig... die sind nah.", answers: [
                Answer(text: "Schwert raus, ich gehe vor.",
                       reply: "Ich bleib direkt hinter dir."),
                Answer(text: "Wir schleichen aussen rum.",
                       reply: "Schlau. Leise wie ein Fuchs.")
            ]),
            Question(text: "Was war eigentlich dein erster Kampf?", answers: [
                Answer(text: "Gegen eine Gans. Ich hab verloren.",
                       reply: "Gaense sind auch furchtbar."),
                Answer(text: "Gegen drei Zombies auf einmal.",
                       reply: "Drei?! Und du stehst noch?"),
                Answer(text: "Daran denke ich nicht gern.",
                       reply: "Verstehe. Dann reden wir ueber was anderes.")
            ]),
            Question(text: "Wenn du ein Tier waerst - welches?", answers: [
                Answer(text: "Ein Baer.",
                       reply: "Passt. Gross, ruhig, und niemand legt sich mit dir an."),
                Answer(text: "Ein Rabe.",
                       reply: "Schlau und immer da, wo was los ist."),
                Answer(text: "Ein Igel.",
                       reply: "Stachelig von aussen, weich innen. Kenn ich.")
            ]),
            Question(text: "Dein Schwert - hat das einen Namen?", answers: [
                Answer(text: "Eichenzahn.",
                       reply: "Eichenzahn! Das klingt nach Aerger fuer Zombies."),
                Answer(text: "Nein, es ist einfach ein Schwert.",
                       reply: "Jedes gute Schwert verdient einen Namen. Denk drueber nach."),
                Answer(text: "Kuschel.",
                       reply: "...Kuschel. Okay. Warum eigentlich nicht.")
            ]),
            Question(text: "Sollen wir nachher noch zum Teich?", answers: [
                Answer(text: "Ja, Fuesse ins Wasser.",
                       reply: "Abgemacht!"),
                Answer(text: "Erst Zombies, dann Teich.",
                       reply: "Arbeit vor Vergnuegen. Sehr ritterlich.")
            ]),
            Question(text: "Vermisst du deine Familie, wenn wir draussen sind?", answers: [
                Answer(text: "Immer ein bisschen.",
                       reply: "Deshalb passen wir auf, dass du heil heimkommst."),
                Answer(text: "Ich bin doch gleich wieder da.",
                       reply: "Stimmt. Das Haus laeuft nicht weg.")
            ]),
            Question(text: "Wer haelt laenger auf einem Bein? Du oder ich?", answers: [
                Answer(text: "Ich natuerlich.",
                       reply: "Gewagt. Nach dem Kampf gilt das!"),
                Answer(text: "Du, in voller Ruestung schaff ich das nie.",
                       reply: "Endlich sagt es mal einer.")
            ])
        ],
        "kampf": [
            Question(text: "Achtung, da vorne! Was machen wir?", answers: [
                Answer(text: "Ich lenke ihn ab, du von hinten.",
                       reply: "Guter Plan. Los!"),
                Answer(text: "Alle draufhauen!",
                       reply: "Mein Lieblingsplan."),
                Answer(text: "Ruhig bleiben und warten.",
                       reply: "Okay... ich zittere aber trotzdem.")
            ]),
            Question(text: "Alles noch heil bei dir?", answers: [
                Answer(text: "Nur ein Kratzer.",
                       reply: "Sagt jeder Ritter, kurz bevor er umkippt."),
                Answer(text: "Ehrlich? Es tut weh.",
                       reply: "Dann geh hinter mich. Ich uebernehme.")
            ])
        ],
        "haus": [
            Question(text: "Gemuetlich habt ihr es hier. Wer hat das Haus gebaut?", answers: [
                Answer(text: "Mein Vater, Balken fuer Balken.",
                       reply: "Das sieht man. Das haelt hundert Winter."),
                Answer(text: "Ich. Mit sehr vielen Schrammen.",
                       reply: "Respekt! Und alles steht noch gerade.")
            ]),
            Question(text: "Was gibt es heute zu essen?", answers: [
                Answer(text: "Eintopf. Wie immer.",
                       reply: "Eintopf ist nie \"wie immer\". Eintopf ist immer gut."),
                Answer(text: "Keine Ahnung, Mama ueberrascht uns.",
                       reply: "Die besten Essen sind Ueberraschungen.")
            ])
        ],
        "stadt": [
            Question(text: "So viele Leute! Bleibst du in der Naehe?", answers: [
                Answer(text: "Ich geh nirgendwo hin.",
                       reply: "Gut. Ich verlauf mich hier sonst."),
                Answer(text: "Ich schau mich kurz um.",
                       reply: "Dann treffen wir uns beim Brunnen.")
            ]),
            Question(text: "Sollen wir was kaufen?", answers: [
                Answer(text: "Brot fuer den Rueckweg.",
                       reply: "Vernuenftig. Und vielleicht Kuchen?"),
                Answer(text: "Ich hab kein Geld dabei.",
                       reply: "Gucken ist umsonst."),
                Answer(text: "Ein neues Schwert!",
                       reply: "Deins ist doch gut. Aber schauen wir mal.")
            ]),
            Question(text: "Merkst du, wie ruhig das hier ist ohne Zombies?", answers: [
                Answer(text: "Fast schon zu ruhig.",
                       reply: "Typisch Ritter. Geniess es einfach."),
                Answer(text: "Herrlich.",
                       reply: "Nicht wahr? Kein Stoehnen, kein Gematsche.")
            ])
        ]
    ]

    /// Spruch, wenn ein Zombie umfällt.
    static let killLines: [String] = [
        "Sauber getroffen!",
        "Der steht nicht mehr auf.",
        "Zwei, drei Hiebe - wie im Lehrbuch.",
        "Puh. Der roch wirklich uebel.",
        "Noch einer weniger im Wald.",
        "Dein Schwert singt heute."
    ]

    static let familyLines: [String: [String]] = [
        "mama": [
            "Da bist du ja! Hast du wieder mit dem Schwert im Wald gespielt?",
            "Es steht Eintopf auf dem Feuer. Iss was, dann haelst du auch mehr aus.",
            "Pass auf dich auf da draussen, Ritter hin oder her."
        ],
        "papa": [
            "Das Holz fuer den Winter liegt noch draussen. Aber erst mal: erzaehl!",
            "Frueher war der Wald ruhiger. Heute stolpert man ueber Zombies.",
            "Wenn ihr in die Stadt wollt - der Wagen steht auf dem Weg."
        ],
        "mila": [
            "Nimmst du mich mal mit raus? Bitte bitte bitte!",
            "Ich hab ein Bild von dir gemalt. Du bist da sehr eckig.",
            "Mama sagt, ich darf erst mit, wenn ich groesser bin. Ich bin doch schon riesig!"
        ]
    ]

    static let cityLines: [String] = [
        "Ein Ritter! Mit echtem Schwert! Machen Sie bitte kein Loch in die Strasse.",
        "Frisches Brot, zwei Kupfer. Fuer Helden drei, weil Helden immer Hunger haben.",
        "Zombies? Hier? Nein nein, die bleiben schoen im Wald. Hoffentlich.",
        "Schoenes Auto haben Sie da. Faehrt das auch bergauf?"
    ]
}

extension Color {
    /// Farbe wie im Web schreiben: Color(hex: 0xFFD24A)
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0
        )
    }
}
