# Oakblade

Ein kleines Pixel-Rollenspiel im Stil von Undertale – alles selbst gezeichnet,
Pixel für Pixel im Code. Keine Bilddateien, kein Internet nötig.

**Starten:** `spiel/index.html` im Browser öffnen (oder auf dem iPad über
„Zum Home-Bildschirm“ als eigene App).

> Dasselbe Spiel gibt es auch **nativ in SwiftUI** für iPad und iPhone:
> [`ios/Oakblade/`](../ios/Oakblade/README.md) – zum Öffnen in Xcode auf einem Mac.

Der Name: *oak* ist die Eiche, *blade* die Klinge – dein Schwert im Eichenwald.

## Die Geschichte

Du bist ein Ritter und wohnst mit deiner Familie in einem Holzhaus mitten im
Eichenwald: **Mama Edda**, **Papa Gunnar** und deine kleine Schwester **Mila**.
Draußen im Wald stolpern Zombies herum. Vor der Tür warten vier Freunde, die
mit dir rausgehen wollen – oder du gehst allein. Und wenn du genug hast,
fährst du mit der ganzen Familie im Auto in die Stadt.

## Steuerung

| | Tastatur | iPad / Handy |
|---|---|---|
| Laufen | WASD oder Pfeiltasten | **Daumen-Stick** unten links ziehen |
| Schlagen | Leertaste (oder X / J) | großer roter Knopf ⚔ |
| Reden / Weiter | E oder Enter | Knopf **E**, oder kurz aufs Bild tippen |
| Antwort wählen | ↑ ↓ + Enter | Antwort antippen |
| Musik an/aus | – | ♪ oben rechts |

Der Stick ist ein echter Analog-Stick: Du kannst den Finger **irgendwo** auf dem
Bild aufsetzen (nur nicht auf den beiden Knöpfen) – der Stick springt dorthin. Je weiter du ziehst,
desto schneller läuft der Ritter, und er läuft in **jede** Richtung, nicht nur in
acht. Lässt du los, springt der Stick zurück in seine Ecke.

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

**Leben in halben Herzen**
- Du hast fünf Herzen, jedes besteht aus zwei Hälften.
- Ein normaler Zombie nimmt dir **ein halbes Herz**, ein Boss ein ganzes.
- Für jeden besiegten Boss bekommst du **ein Herz dazu** (bis zu sieben) und
  bist sofort wieder ganz voll.

**Bosskämpfe im Kampf-Fenster (wie in Undertale)**
- Nach jeweils sechs erledigten Zombies taucht ein **Boss** auf – jedes Mal ein
  anderer. Dann wechselt das Spiel in ein echtes **Kampf-Fenster**:
- Oben der Boss mit Lebensbalken, unten vier Knöpfe:
  - **KÄMPFEN** – ein Zeiger saust hin und her. Tippe, wenn er in der Mitte ist:
    je mittiger, desto mehr Schaden (VOLLTREFFER!).
  - **HANDELN** – für jeden Boss etwas anderes: dem Zombiekönig die Krone
    richten, die Spinne für ihr Netz loben, den Werwolf hinter den Ohren
    kraulen, den Baumgeist gießen. Dreimal nett sein …
  - **ITEM** – Pilz oder Beeren essen und heilen.
  - **SCHONEN** – … und dann kannst du ihn gehen lassen. Gibt **mehr** Münzen
    als ihn zu besiegen.
- Danach greift der Boss an: Du steuerst dein **rotes Herz** mit dem Joystick
  durch das Kampf-Fenster und weichst aus. Jeder Boss hat ein eigenes Muster –
  Würmer regnen herunter, Netzfäden schießen von der Seite, Krallen zielen auf
  dich, Wurzeln schießen aus dem Boden.
- **Grauzahn, der Zombiekönig** – riesig, mit Krone, ruft Verstärkung.
- **Nachtweberin, die Waldspinne** – schnell, schießt in Sprints auf dich zu.
- **Mondfell, der Werwolf** – wird bei der Hälfte seiner Kraft wütend und noch schneller.
- **Alter Knorr, der Baumgeist** – langsam und zäh, lässt Wurzeln um sich
  aus dem Boden schießen.

**Reden statt kämpfen (wie in Undertale)**
- Geh nah an einen Zombie und drücke **E** – statt zuzuschlagen redest du mit ihm:
  winken, einen Witz erzählen, ihm den Grashalm aus dem Ohr ziehen.
- Nach **drei freundlichen Sachen** ist er gezähmt: Er winkt, lässt Münzen da und
  schlurft friedlich in den Wald zurück. Oben steht, wie viele du **verschont** hast.
- Über einem Zombie, der schon zuhört, schweben gelbe Herzchen. Deine Freunde
  hauen dann nicht mehr drauf – und im Gespräch bleibt sowieso alles stehen.

**Pilze und Beeren**
- Im Wald liegen Pilze und Beeren herum; du sammelst sie einfach durch Drüberlaufen.
- Beim Händler verkaufen (Pilz 4, Beere 3 Münzen) – oder **Mama drei Pilze bringen**:
  Sie macht eine Pilzpfanne daraus, die **ein Herz dazugibt**.

**Tag und Nacht**
- Draußen vergeht die Zeit: Abendrot, dann Nacht, dann Sonnenaufgang.
- **Nachts** kommen mehr Zombies – dafür gibt es **doppelte Münzen**.
- Zu Hause vor dem Bett **E** drücken: Du schläfst bis zum Morgen und alle
  Herzen sind wieder voll.

**Aufträge von Papa**
- Frag Papa nach einer Aufgabe: 8 Zombies erledigen, 5 Pilze sammeln,
  3 Zombies verschonen oder einen Boss besiegen.
- Der Fortschritt steht oben links. Fertig? Zurück zu Papa – es gibt Münzen.

**Wuffel, der Hund**
- Im Haus wohnt Wuffel. Streicheln, Bauch kraulen, Stöckchen werfen.
- Nach fünfmal Streicheln gibt es **ein Herz dazu**. (Hunde sind wichtig.)

**Zombies**
- Laufen im Wald herum und kommen auf dich zu, wenn sie dich sehen.
- Du hältst das Schwert **immer in der Hand**. Beim Schlagen holt der Ritter
  aus, das Schwert zieht einen weißen Bogen durch die Luft – ein Treffer lässt
  den Zombie weiß aufblitzen und zurücktaumeln.
- Nach **drei Treffern** löst er sich in Pixel auf. Oben rechts wird gezählt.
- Bei null Herzen wachst du zu Hause im Bett wieder auf.
- Während ein Gespräch läuft, bleiben die Zombies stehen – niemand wird beim
  Reden von hinten gebissen.

**Münzen und der Laden**
- Jeder erledigte Zombie lässt **1 bis 3 Münzen** fallen, ein Boss **12 bis 19**.
  Die Münzen fliegen von selbst zu dir – du musst sie nicht einsammeln.
- In Eichenstadt steht am Brunnen ein **Marktstand**. Der Händler **Bosko**
  (mit dem Schild *LADEN* über dem Kopf) verkauft dir:
  - **Schwert**: Geschärfte Klinge (25) → Stahlklinge (60) → Goldene Klinge (120).
    Jede Stufe macht **einen Schaden mehr** – und die Klinge sieht anders aus.
  - **Rüstung**: Lederwams (30) → Kettenhemd (70) → Goldene Rüstung (140).
    Jede Stufe gibt **ein Herz dazu** – und der Ritter glänzt anders.
  - **Eintopf** für 10 Münzen macht alle Herzen wieder voll.
- Dein Stand (Münzen, Stufen, Herzen) wird auf dem Gerät gespeichert.

**Das Auto und die Stadt**
- Auf dem Waldweg steht ein Auto. Mit **E** ansprechen → „mit der ganzen
  Familie“ oder „nur wir“ → kleine Pixel-Fahrt-Animation mit Sonnenuntergang.
- In **Eichenstadt**: Straßen, Häuserdächer, Läden, Laternen, ein Park mit
  Brunnen und Bänken, **zwölf Leute** zum Anquatschen (Bäckerin, Stadtwache,
  Botin, Rentner, Kinder …), der Marktstand und ein Blatt am Stadttor,
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
| `joystick.js` | Der virtuelle Joystick (erscheint unter dem Daumen) |
| `kampf.js` | Das Kampf-Fenster für Bosse: Menü, Angriffsbalken, Ausweichen |
| `build.mjs` | Baut alles zu `oakblade-einzeldatei.html` zusammen |
| `chat.js` | Die Personen und alle Fragen und Antworten |
| `dialog.js` | Textbox mit tippenden Buchstaben und Auswahl |
| `audio.js` | 8-Bit-Musik und Geräusche |
