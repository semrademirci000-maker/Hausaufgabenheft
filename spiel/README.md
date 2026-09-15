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
Vor der Tür warten vier befreundete Ritter, die mit dir rausgehen.

Der eigentliche Mittelpunkt des Spiels ist aber **Eichenstadt**. Dort holst du
dir an der **Auftragstafel** Arbeit, dort sind die **sechs Läden**, und dort
gibst du aus, was du draußen verdient hast. Der Wald ist die Werkstatt, die
Stadt ist das Zuhause: Zombies erledigst du, **um an Münzen zu kommen** – nicht,
weil es der Zweck des Spiels wäre.

**Die Schleife:** Auftrag an der Tafel holen → mit dem Auto in den Wald →
Zombies erledigen, Pilze und Beeren sammeln → zurück in die Stadt → abkassieren,
Ruf steigt, Aufträge zahlen besser → einkaufen gehen.

## Steuerung

| | Tastatur | iPad / Handy |
|---|---|---|
| Laufen | WASD oder Pfeiltasten | **Daumen-Stick** unten links ziehen |
| Schlagen | Leertaste (oder X / J) | großer roter Knopf ⚔ |
| **Wirbelschlag** | Schlagtaste **halten**, dann loslassen | Knopf ⚔ **halten** |
| **Ausweichrolle** | Shift, C oder Q | Knopf 💨 **Rolle** |
| **Heiltrank** | H | Knopf ❤ **Heilen** |
| **Ritterzorn** | F | Knopf ⚡ (nur wenn geladen) |
| Reden / Weiter | E oder Enter | Knopf **E**, oder kurz aufs Bild tippen |
| Antwort wählen | ↑ ↓ + Enter | Antwort antippen |
| Karte | **M** | Knopf 🗺 oben rechts |
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

**Die Freunde – vier Ritter**
- Lisbeth, Tarik, Momo und Griswold tragen jetzt **eigene Rüstungen** in
  ihren Farben, mit **Schild und Schwert** – vier Ritter, die mitkommen.
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

**Echte Bosskämpfe – mitten im Wald, mit Schwert und Rolle**
- Kein Kampf-Fenster, kein Herz, keine Menüs. Der Boss steht im Wald
  und du musst ihn **wirklich besiegen**.
- Jeder Angriff wird **angekündigt**: der Boss blinkt rot, eine rote Linie
  zeigt, wohin er stürmt, ein roter Kreis, wie weit sein Stampfer reicht.
  Wer dann wegrollt, kommt heil davon. Wer stehen bleibt, verliert Herzen.
- Acht Angriffsarten: **Sturmangriff**, **Stampfer** (Schockwelle),
  **Rundumschlag**, **Salve** (Säurefächer), **Verstärkung rufen**,
  **Wurzeln**, **Sprung** und **Seuchenregen**. Wurzeln und Regen markieren
  vorher den Boden – da darfst du nicht mehr stehen.
- Rennt er ins Leere, **taumelt** er: freie Schläge, und die machen
  **mehr Schaden**. Genug Treffer am Stück lassen ihn auch so taumeln –
  der Balken unter seinem Leben zeigt es.
- **Drei Phasen**: bei zwei Dritteln und einem Drittel Leben wird er
  schneller und greift öfter an. In der letzten Phase glüht er rot.
- **Sechs Bosse, und jeder Kampf ist härter als der letzte**: jeder besiegte
  Boss gibt dem nächsten **42 % mehr Leben**, mehr Tempo und mehr Schaden.
  - **Grauzahn, der Zombiekönig** – ruft Verstärkung, stürmt, stampft.
  - **Nachtweberin, die Waldspinne** – stürmt, springt, schießt Fächer.
  - **Mondfell, der Werwolf** – schnell, Rundumschläge, Sprünge.
  - **Alter Knorr, der Baumgeist** – Wurzeln, Stampfer, Seuchenregen.
  - **Sir Moder, der gefallene Ritter** – kann fast alles.
  - **Der Seuchenfürst** – 220 Leben, alle fünf Angriffe, der Himmel wird grün.
- Deine Freunde helfen gegen Bosse **nur ein bisschen** – da musst du ran.
- Belohnung: ein Herz mehr, alle Herzen voll, zwei Tränke und Münzen.

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

**Der Wald ist doppelt so groß**
- 64 × 48 Kacheln statt 44 × 34, mit richtigen Gegenden:
  - die **Lichtung** mit Haus, Lagerfeuer, Zaun und Fässern
  - der große **See** im Osten mit Ufersteinen, Bank und Feuerstelle
  - das **Dickicht** im Nordosten: dichte Tannen, eine schmale Schneise,
    und eine Tafel, die vom Reingehen abrät
  - die **alte Ruine** im Südwesten mit Mauerresten und Feuerstelle
  - der **Friedhof** im Süden mit zehn Grabsteinen
- Wege verbinden alles, und auf der großen Karte sieht man sofort, wo man ist.

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

**Sechs Zombiesorten – jede kämpft anders**
- **Zombie** (grün) – der normale. 3 Treffer, läuft stur auf dich zu.
- **Renner** (gelbgrün) – nur 2 Treffer, aber er **sprintet** in Schüben los.
- **Panzer** (grau, groß) – **8 Treffer**, nimmt dir ein ganzes Herz, und der
  Rückstoß bringt ihn kaum aus dem Tritt. Dafür viele Münzen.
- **Spucker** (lila) – bleibt auf Abstand und **spuckt grüne Säure** nach dir.
- **Kriecher** (braun, klein) – kommt immer **zu dritt**, stirbt in einem Treffer.
- **Nachtschatten** (dunkelblau) – nur **nachts**, verschwindet und **taucht
  direkt hinter dir wieder auf**.
- Über jeder Sondersorte steht ihr Name, und jede hat einen eigenen
  Lebensbalken.

**Kombos, Volltreffer, Wirbelschlag**
- Jeder Treffer zählt hoch: **x2, x3, x4 …** oben in der Mitte. Ab drei Treffern
  macht jeder weitere Schlag **mehr Schaden**, und beim Töten gibt es
  **Extramünzen**. Wirst du getroffen, ist die Kombo weg.
- Serien werden ausgerufen: **3er SERIE**, **FÜNF AM STÜCK!**, **UNAUFHALTSAM!**,
  **LEGENDE!**
- **Volltreffer** (zufällig, öfter mit besserem Schwert): doppelter Schaden,
  das Bild blitzt weiß und steht kurz still.
- **Wirbelschlag**: Schlagknopf gedrückt halten, bis der Ritter golden glüht,
  dann loslassen – das Schwert dreht sich zweimal komplett herum und trifft
  **alles rundherum** mit fast doppeltem Schaden.
- **Ausweichrolle**: kurz unverwundbar durch alles hindurch. Danach eine
  Dreiviertelsekunde Pause (der Balken unten links zeigt sie an).

**Heiltrank – nicht immer, wenn du willst**
- Du hast drei Tränke am Gürtel (unten links). Einer füllt **zwei Herzen**.
- Danach **sieben Sekunden Pause** – mitten im Bosskampf musst du dir den
  richtigen Moment suchen. Der Knopf wird grau und zählt runter.
- Nachfüllen: schlafen, Boss besiegen, Haus verteidigen, oder beim
  **Alchemisten Vex** in der Stadt kaufen.

**Ritterzorn – die Superkraft**
- Der Balken unten links füllt sich mit jedem erledigten Zombie.
- Ist er voll, taucht der **⚡-Knopf** auf. Drücken: **acht Sekunden**
  Flammenschwert, **dreifacher Schaden**, jeder Schlag wirft eine
  Schockwelle, die auch die Nachbarn erwischt.

**Nachts kommen sie ins Haus**
- Wer sich nachts zu Hause verkriecht, ist nicht sicher: die Zombies
  **treten die Tür ein** und kommen einer nach dem anderen rein.
- Mila schreit, Mama stellt sich vor sie, Papa verrammelt die Fenster –
  die Tür gehört dir. Je weiter du im Spiel bist, desto mehr kommen.

**Beute, die Zombies fallen lassen**
- **Herz** (rot, fliegt dir entgegen) – füllt ein Herz auf. Fällt nur, wenn
  du wirklich verletzt bist.
- **Wutkristall** (pink) – **11 Sekunden doppelter Schaden**, der Ritter
  funkelt pink, unten läuft ein Balken ab.

**Die Freunde können jetzt was**
- **Lisbeth** schießt **Pfeile** auf Zombies in der Nähe.
- **Momo** wirft **Feuerbälle** (2 Schaden, mit Funkenregen).
- **Tarik** und **Griswold** hauen von Hand drauf.

**Alles wackelt und spritzt**
- Bei jedem Treffer fliegen **Pixelfetzen in der Farbe des Zombies**, springt
  eine **Schockwelle** auf und die **Schadenszahl** nach oben.
- Das Bild **steht bei jedem Treffer kurz still** (hit stop) und wackelt.
- Staubwölkchen beim Laufen, Glutfunken in der Nacht, Blütenblätter am Tag.
- Bei zwei Herzen oder weniger **pocht der ganze Bildschirmrand rot**.

**Der alte Friedhof und das Lagerfeuer**
- Unten links im Wald liegt ein **Friedhof** mit acht Grabsteinen und einer
  verwitterten Tafel. Ein Trampelpfad führt vom Hauptweg dorthin.
- Vor dem Haus brennt ein **Lagerfeuer** – die Flamme flackert, der Boden
  leuchtet warm. Dazu Fässer und ein Zaun.

**Zombies**
- Laufen im Wald herum und kommen auf dich zu, wenn sie dich sehen.
- Du hältst das Schwert **immer in der Hand**. Beim Schlagen holt der Ritter
  aus, das Schwert zieht einen weißen Bogen durch die Luft – ein Treffer lässt
  den Zombie weiß aufblitzen und zurücktaumeln.
- Nach **drei Treffern** löst er sich in Pixel auf. Oben rechts wird gezählt.
- Bei null Herzen wachst du zu Hause im Bett wieder auf.
- Während ein Gespräch läuft, bleiben die Zombies stehen – niemand wird beim
  Reden von hinten gebissen.

**Münzen**
- Jeder erledigte Zombie lässt **1 bis 3 Münzen** fallen, ein Boss viele mehr.
  Nachts gibt es doppelt, mit Glücksring die Hälfte obendrauf.
  Die Münzen fliegen von selbst zu dir.
- Das Geld ist der Zweck: In der Stadt wartet genug, wofür man es ausgeben kann.

**Eichenstadt – der Mittelpunkt**
- Auf dem Waldweg steht ein Auto. Mit **E** ansprechen → „mit der ganzen
  Familie“ oder „nur wir“ → kleine Pixel-Fahrt-Animation mit Sonnenuntergang.
- Die Stadt ist jetzt **56 × 40 Kacheln** groß mit einem richtigen Stadtplan:
  zwei **Ladenstraßen** übereinander, eine Hauptkreuzung, und unten ein großer
  **Marktplatz** mit Brunnen, Bänken, Bäumen, Fässern und Feuerstelle.
- **18 Leute** laufen herum und lassen sich ansprechen.

**Die Auftragstafel am Brunnen**
- Hier hängen **drei Zettel** zur Auswahl. Du nimmst einen mit:
  - *n Zombies erledigen* (Stadtwache)
  - *n Pilze sammeln* / *n Beeren sammeln* (Bäckerin Rosa)
  - *n Zombies verschonen* (Juwelier Perla)
  - *Einen Boss besiegen* (Bürgermeister, dickes Kopfgeld)
- Der Fortschritt steht oben links mit. Fertig? Zurück zur Tafel, Geld holen.
- Jeder abgegebene Auftrag gibt einen **Ruf-Stern** (oben rechts). Je mehr
  Sterne, desto **besser bezahlen** die nächsten Aufträge (+12 % pro Stern).
- Du kannst einen Auftrag auch wieder zurückgeben.

**Sechs Läden**
- **Händler Bosko** (Waffenschmied) – Schwerter, kauft Pilze (4) und Beeren (3).
- **Schmiedin Halda** – Rüstungen und Beulen ausklopfen.
- **Alchemist Vex** – Heiltränke, größerer Gürtel, Wutkristalle.
- **Waffenmeister Orin** – Kampfkunst, die **für immer** bleibt: schnellere
  Rolle, größerer Wirbelschlag, schnellerer Ritterzorn.
- **Bäckerin Rosa** – warmes Brot, Proviant, und sie zahlt für Pilze (7) und
  Beeren (6) **deutlich mehr als Bosko**.
- **Juwelier Perla** – **Schmuck, der dauerhaft wirkt**:
  - **Glücksring** (120) – die Hälfte mehr Münzen von jedem Zombie
  - **Herzamulett** (150) – ein Herz mehr, für immer
  - **Schnellstiefel** (130) – ein Fünftel schneller unterwegs
  - **Händlersiegel** (190) – alles in der Stadt ein Fünftel günstiger
  Was du trägst, siehst du unten links im Bild.

**Eichenstadt wird angegriffen**
- Ab dem zweiten besiegten Boss ist die Stadt nicht mehr sicher. Kommst du
  an, **brennt es schon**: Rauch über den Dächern, Zombies in den Gassen,
  der Bildschirm glüht orange.
- Erst die Gassen leerräumen, dann kommt **der Anführer** – ein richtiger
  Boss, mitten auf dem Marktplatz.
- Belohnung: dicker Batzen Münzen, alle Tränke voll, Ritterzorn voll geladen.

**Musik**
- 8-Bit-Musik direkt im Browser erzeugt: ein Thema für den Wald, eins fürs
  Haus, eins für die Stadt – und wenn ein Zombie nah ist, wird es schneller.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst, Textbox, Touch-Knöpfe |
| `style.css` | Textbox im Undertale-Stil, Steuerkreuz, Skalierung |
| `effekte.js` | Pixelfetzen, Schadenszahlen, Schockwellen, Trefferpause |
| `gegner.js` | die sechs Zombiesorten und die Wellen |
| `sprites.js` | Alle Pixel-Grafiken: Ritter, Schwert, Leute, Zombies, Kacheln, Auto |
| `maps.js` | Die drei Welten: Wald, Haus, Stadt |
| `game.js` | Spielablauf: Laufen, Kämpfen, Begleiter, Türen, Autofahrt |
| `joystick.js` | Der virtuelle Joystick (erscheint unter dem Daumen) |
| `kampf.js` | Das Kampf-Fenster für Bosse: Menü, Angriffsbalken, Ausweichen |
| `build.mjs` | Baut alles zu `oakblade-einzeldatei.html` zusammen |
| `chat.js` | Die Personen und alle Fragen und Antworten |
| `dialog.js` | Textbox mit tippenden Buchstaben und Auswahl |
| `audio.js` | 8-Bit-Musik und Geräusche |
