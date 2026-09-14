# Ritter von Eichenwald

Ein kleines Pixel-Rollenspiel im Stil von Undertale – alles selbst gezeichnet,
Pixel für Pixel im Code. Keine Bilddateien, kein Internet nötig.

**Starten:** `spiel/index.html` im Browser öffnen (oder auf dem iPad über
„Zum Home-Bildschirm“ als eigene App).

> Dasselbe Spiel gibt es auch **nativ in SwiftUI** für iPad und iPhone:
> [`ios/RitterVonEichenwald/`](../ios/RitterVonEichenwald/README.md) – zum Öffnen
> in Xcode auf einem Mac.

## Die Geschichte

Du bist ein Ritter und wohnst mit deiner Familie in einem Holzhaus mitten im
Eichenwald: **Mama Edda**, **Papa Gunnar** und deine kleine Schwester **Mila**.
Draußen im Wald stolpern Zombies herum. Vor der Tür warten vier Freunde, die
mit dir rausgehen wollen – oder du gehst allein. Und wenn du genug hast,
fährst du mit der ganzen Familie im Auto in die Stadt.

## Steuerung

| | Tastatur | iPad / Handy |
|---|---|---|
| Laufen | WASD oder Pfeiltasten | Steuerkreuz unten links |
| Schlagen | Leertaste (oder X / J) | großer roter Knopf ⚔ |
| Reden / Weiter | E oder Enter | Knopf **E**, oder auf die Textbox tippen |
| Antwort wählen | ↑ ↓ + Enter | Antwort antippen |
| Musik an/aus | – | ♪ oben rechts |

## Was es alles gibt

**Das Holzhaus**
- Kamin, Betten, Tisch, Teppich – und die Familie.
- Mit Mama reden → Eintopf essen → Leben wieder voll.
- Gehst du zur Tür raus, wirst du gefragt, wer heute mitkommt:
  allein, zwei Freunde, alle vier oder „überrasch mich“.

**Die Freunde (Bots)**
- Lisbeth (Bogenschützin), Tarik (Schmied), Momo (Magierin), Griswold (Wächter).
- Sie laufen dir hinterher, hauen im Kampf mit drauf …
- … und **stellen dir von selbst Fragen**. Du bekommst zwei oder drei
  Antworten zur Auswahl, sie reagieren auf deine Antwort. Die Fragen passen
  zum Ort: im Wald andere als im Haus oder in der Stadt.
- Mit **E** kannst du sie auch selbst ansprechen. Freunde mit einem **!**
  über dem Kopf stehen noch vorm Haus und wollen mitgenommen werden.

**Zombies**
- Laufen im Wald herum und kommen auf dich zu, wenn sie dich sehen.
- Du hältst das Schwert **immer in der Hand**. Beim Schlagen holt der Ritter
  aus, das Schwert zieht einen weißen Bogen durch die Luft – ein Treffer lässt
  den Zombie weiß aufblitzen und zurücktaumeln.
- Nach **drei Treffern** löst er sich in Pixel auf. Oben rechts wird gezählt.
- Berührt dich ein Zombie, verlierst du Leben (5 Herzen = 20 HP). Bei null
  wachst du zu Hause im Bett wieder auf.
- Während ein Gespräch läuft, bleiben die Zombies stehen – niemand wird beim
  Reden von hinten gebissen.

**Das Auto und die Stadt**
- Auf dem Waldweg steht ein Auto. Mit **E** ansprechen → „mit der ganzen
  Familie“ oder „nur wir“ → kleine Pixel-Fahrt-Animation mit Sonnenuntergang.
- In **Eichenstadt**: Straßen, Häuserdächer, Läden, Laternen, ein Park mit
  Brunnen und Bänken, Leute zum Anquatschen und ein Blatt am Stadttor,
  das man lesen kann. Mit dem Auto geht es wieder zurück.

**Musik**
- 8-Bit-Musik direkt im Browser erzeugt: ein Thema für den Wald, eins fürs
  Haus, eins für die Stadt – und wenn ein Zombie nah ist, wird es schneller.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst, Textbox, Touch-Knöpfe |
| `style.css` | Textbox im Undertale-Stil, Steuerkreuz, Skalierung |
| `sprites.js` | Alle Pixel-Grafiken: Ritter, Schwert, Leute, Zombies, Kacheln, Auto |
| `maps.js` | Die drei Welten: Wald, Haus, Stadt |
| `game.js` | Spielablauf: Laufen, Kämpfen, Begleiter, Türen, Autofahrt |
| `chat.js` | Die Personen und alle Fragen und Antworten |
| `dialog.js` | Textbox mit tippenden Buchstaben und Auswahl |
| `audio.js` | 8-Bit-Musik und Geräusche |
