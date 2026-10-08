# Emo – dein Roboter im Handy (SwiftUI)

Emo ist ein kleiner Roboter wie **EMO Go Home** – nur dass sein Gesicht dein
iPhone oder iPad ist. Stell das Gerät quer hin (am besten an einen Ständer
gelehnt), und Emo schaut dich an, blinzelt, spricht, piept und reagiert auf dich.

> **Wichtig:** Dieser Code wurde auf einem Linux-Rechner geschrieben – dort gibt es
> kein Xcode. Er ist deshalb **nicht kompiliert getestet**. Falls Xcode beim ersten
> Bauen eine Kleinigkeit anmeckert, zeigt es dir die Stelle direkt an.

## Was Emo kann

| Du machst … | Emo macht … |
|---|---|
| **„Hände hoch!“** sagen oder eine **Finger-Pistole** in die Kamera halten | Reißt erschrocken seine Ärmchen hoch, zittert, schwitzt: „Nicht schießen!“ – und nimmt sie erst wieder runter, wenn die Pistole weg ist |
| Während der Hände-hoch-Szene **„Peng!“** sagen oder die Pistole **nach oben schnellen** lassen | Kippt mit X-Augen um, spielt tot … und steht wieder auf: „Reingelegt!“ |
| „**Hey Emo**, …“ + eine Frage | Denkt nach (Augen nach oben, „?“) und antwortet mit KI und passendem Gesicht |
| „Emo, **tanz**!“ | Musik, Noten, wippt im Takt |
| „Erzähl einen **Witz**“, „**Sing** was“, „Wie **spät** ist es?“ | Witz mit Pointe, Liedchen, Uhrzeit |
| „**Gute Nacht**“ / „**Wach auf**“ | Gähnt, schläft mit Zzz und schnarcht, wacht wieder auf |
| „Ich hab dich lieb“ / „Du bist doof“ | Herzaugen / Tränen |
| Antippen, oft antippen | Kichert … wird irgendwann sauer |
| Lange drücken oder drüberwischen (streicheln) | Herzaugen und Schnurren |
| Handy **schütteln** | Spiralaugen: „Mir ist schwindelig!“ |
| Winken, Daumen hoch, Peace, Faust | Winkt zurück, freut sich, „Peace!“, bekommt Angst |
| In die Kamera schauen | Emo folgt dir mit den Augen und begrüßt dich |
| Lange nichts | Schaut sich um, gähnt, schläft irgendwann ein |

Über das unauffällige ⚙️ oben rechts (erscheint beim Antippen) gibt es Einstellungen:
Augenfarbe, Stimmhöhe, Lautstärke, Kamera/Mikrofon an/aus, KI-Wahl und ein
Knopf-Menü zum Ausprobieren aller Gefühle.

## KI-Assistent

Emo sucht sich automatisch das beste Gehirn:

1. **Claude**, wenn du in den Einstellungen einen API-Schlüssel von
   [console.anthropic.com](https://console.anthropic.com) einträgst
   (kostet ein bisschen Geld pro Frage, braucht Internet).
2. **Apple Intelligence** direkt auf dem Gerät – kostenlos und offline, ab
   **iOS 26** auf Geräten, die Apple Intelligence können (iPhone 15 Pro oder neuer,
   iPads mit M-Chip). Dafür braucht man **Xcode 26** zum Bauen.
3. Sonst: eingebaute einfache Antworten.

Damit nicht jedes Gespräch im Raum als Frage gilt, beantwortet Emo freie Fragen nur,
wenn du ihn mit **„Emo“** ansprichst (abschaltbar). Nach einer Antwort kannst du
ein paar Sekunden ohne „Emo“ weiterreden. Kurze Befehle wie „Hände hoch“ gehen immer.

## Öffnen und starten

1. Ordner `ios/Emo` auf einen Mac kopieren.
2. `Emo.xcodeproj` doppelklicken (Xcode 16 oder neuer, für Apple Intelligence Xcode 26).
3. Unter **Signing & Capabilities** dein Team auswählen (Bundle-ID ggf. ändern).
4. Ein **echtes Gerät** wählen – im Simulator gibt es keine Frontkamera.
5. ▶ drücken und Kamera, Mikrofon und Spracherkennung erlauben.

Falls die Projektdatei nicht öffnet: `brew install xcodegen`, dann in `ios/Emo`
`xcodegen generate`.

Mindestversion: **iOS 17**.

## Aufbau des Codes

| Datei | Inhalt |
|---|---|
| `EmoApp.swift` | Einstieg |
| `Face/Mood.swift` | Alle Gefühle und wie die Augen dabei geformt sind |
| `Face/EyeView.swift` | Ein leuchtendes Auge mit Lidern, plus Herz-, X-, Spiral-, Stern-Augen |
| `Face/Effects.swift` | Zzz, Tränen, Herzchen, Noten, Schweiß, „?“, „!“, Roboterarme, Zittern, Tanzen |
| `Face/FaceView.swift` | Setzt das Gesicht zusammen, Blickrichtung, Umfallen |
| `Brain/RobotBrain.swift` | Emos Persönlichkeit: alle Reaktionen und Szenen |
| `Brain/CommandParser.swift` | Versteht deutsche Sprachbefehle |
| `Brain/AIAssistant.swift` | KI: Apple Intelligence, Claude oder einfache Antworten |
| `Brain/EmoSettings.swift` | Einstellungen (API-Schlüssel im Schlüsselbund) |
| `Senses/VisionWatcher.swift` | Frontkamera + Vision: Gesicht und Handzeichen (Finger-Pistole …) |
| `Senses/SpeechListener.swift` | Dauerhafte deutsche Spracherkennung auf dem Gerät |
| `Voice/RobotVoice.swift` | Sprachausgabe mit hoher Roboterstimme |
| `Voice/SoundFX.swift` | Piep- und Zwitschergeräusche, live berechnet |
| `Views/RobotScreen.swift` | Vollbild-Gesicht, Gesten, Untertitel |
| `Views/SettingsView.swift` | Einstellungen |

### So erkennt Emo die Finger-Pistole

Vision liefert 21 Punkte deiner Hand. Für jeden Finger wird verglichen, wie weit
die Fingerspitze vom Handgelenk entfernt ist – im Verhältnis zum Mittelgelenk.
Ist das Verhältnis groß, ist der Finger gestreckt, ist es klein, ist er eingerollt.
Pistole = Zeigefinger raus, Ring- und kleiner Finger eingerollt, Daumen steht ab.
Das Zeichen muss ein paar Bilder lang stabil sein, damit nichts flackert. Schnellt
die Zeigefingerspitze plötzlich nach oben, zählt das als Schuss.
