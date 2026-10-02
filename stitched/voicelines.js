// Alle gesprochenen Sätze im Spiel (für das Sprecher-Studio).
// Wird aus game.js erzeugt – Reihenfolge = Reihenfolge in der Geschichte.
export const LINES = [
  { who: 'DURCHSAGE', text: 'Willkommen bei Joyworks, Ebene neun. Notbetrieb aktiv. Bitte bleiben Sie ruhig.' },
  { who: 'MILA', text: 'Kannst du mich hören? Gut … du lebst noch.' },
  { who: 'MILA', text: 'Der Aufzug ist abgestürzt. So tief unten war noch nie ein Mitarbeiter.' },
  { who: 'MILA', text: 'Das Ausgangstor braucht Strom. Finde drei Batterien und bring sie zum Generator.' },
  { who: 'MILA', text: 'Und … sei leise. Hier unten wohnt <b>Zipper</b>. Er hat noch nie jemanden gehen lassen.' },
  { who: 'MILA', text: 'Das ist Zipper! <b>LAUF!</b> Versteck dich in einem Spind!' },
  { who: 'MILA', text: 'Oh nein. Die Lichter … Es ist wach. VERSTECK DICH, wenn es kommt!' },
  { who: 'MILA', text: 'Noch eine! Die letzte liegt bei The Tailor – auf der Kommode neben seinem Käfig.' },
  { who: 'DURCHSAGE', text: 'Achtung. Generator sechs läuft. Ausgangstor wird geöffnet.' },
  { who: 'MILA', text: 'Der Generator läuft! Das Tor ist offen – <b>LAUF!</b>' },
  { who: 'TAILOR', text: 'Lauf nur. Du kannst mir nicht entkommen. Ich halte alle Fäden.' },
  { who: 'MILA', text: 'Das Tor ist zu! Zipper kommt da nicht durch.' },
  { who: 'MILA', text: 'Du hast es fast geschafft. Der Aufzug nach oben braucht eine <b>Schlüsselkarte</b>.' },
  { who: 'MILA', text: 'Sie liegt in der Nähstube, hinter der lila Tür. Zieh den Hebel daneben.' },
  { who: 'TAILOR', text: 'Die Nähstube … Hier habe ich euch alle zusammengenäht. Willkommen zu Hause.' },
  { who: 'MILA', text: 'Er ist in der Lüftung! <b>LAUF ZUR GELBEN TÜR!</b>' },
  { who: 'ZIPPER', text: 'Ich näh dich fest … ganz fest …' },
  { who: 'MILA', text: 'Die Tür geht auf – schnell durch!' },
  { who: 'MILA', text: 'Geschafft! Die Tür hält ihn auf.' },
  { who: 'MILA', text: 'Das ist die Montagehalle. Der Aufzug hat aber keinen Strom – wir brauchen <b>zwei Sicherungen</b>.' },
  { who: 'MILA', text: 'Eine ist hinter die Grube gefallen. Da kommst du nur mit dem Greifer ran!' },
  { who: 'TAILOR', text: 'Du glaubst, du bist entkommen? Ich halte alle Fäden. Auch die in dieser Halle.' },
  { who: 'DURCHSAGE', text: 'Achtung. Aufzug defekt. Lagertor wird geöffnet. Bitte zwanzig Sekunden warten.' },
  { who: 'MILA', text: 'Das Seil vom Aufzug ist gerissen! Wir müssen durchs Lager – dahinter gibt es einen <b>Lastenaufzug</b>.' },
  { who: 'MILA', text: 'Er ist in der Halle! <b>Halte durch, bis das Tor offen ist!</b>' },
  { who: 'MILA', text: 'Das Tor ist offen! <b>REIN INS LAGER!</b>' },
  { who: 'MILA', text: 'Puh … das Tor ist zu. Das ist das Spielzeuglager.' },
  { who: 'MILA', text: 'Die Tür zum Spielzimmer hat ein <b>Zahlenschloss</b>. Die Zahlen stehen auf den großen Spielwürfeln.' },
  { who: 'TAILOR', text: 'So viele Regale … So viele Verstecke. Er findet dich trotzdem.' },
  { who: 'MILA', text: 'Hörst du das? Er ist durch die Lüftung ins Lager gekrochen! <b>Duck dich</b> und bleib zwischen den Regalen.' },
  { who: 'MILA', text: 'Oh nein … er ist hier drin! Versteck dich, wenn er kommt – und lade die Hand weiter auf!' },
  { who: 'ZIPPER', text: 'Wo bist du … ich höre dich …' },
  { who: 'MILA', text: 'Richtig! Die Tür geht auf.' },
  { who: 'MILA', text: 'Die Tür ist zu. Das hier war früher das Spielzimmer.' },
  { who: 'MILA', text: 'Die Tür zum Lastenaufzug braucht Strom. Schieß eine Hand auf die <b>Stromspule</b>, dann ist sie geladen.' },
  { who: 'MILA', text: 'Dann schnell zu einem <b>Empfänger</b> an der Wand und die geladene Hand darauf schießen. Es gibt zwei.' },
  { who: 'TAILOR', text: 'Mein liebes Spielzimmer. Hier habe ich Mila das Sprechen beigebracht.' },
  { who: 'MILA', text: 'Die Hand ist geladen! Schnell – die Ladung hält nicht lange.' },
  { who: 'MILA', text: 'Einer ist an! Noch ein Empfänger.' },
  { who: 'MILA', text: 'Beide Empfänger haben Strom! Die Tür ist offen – <b>zum Lastenaufzug!</b>' },
  { who: 'MILA', text: 'Er ist direkt hinter dir! <b>RENN!</b> Bleib nicht stehen!' },
  { who: 'TAILOR', text: 'Du gehörst MIR! Zipper, bring ihn zurück!' },
  { who: 'MILA', text: 'Gleich geschafft! Der Lastenaufzug ist am Ende vom Tunnel!' },
  { who: 'ZIPPER', text: 'Ich näh dich fest …' },
  { who: 'ZIPPER', text: 'Zipper hat dich gefunden …' },
  { who: 'ZIPPER', text: 'Bleib bei mir … für immer.' },
  { who: 'ZIPPER', text: 'Komm her … lächle für mich.' },
  { who: 'ZIPPER', text: 'Wir spielen für immer.' },
  { who: 'TAILOR', text: 'Endlich … Besuch.' },
  { who: 'TAILOR', text: 'Nimm dir ruhig die Batterie. Lauf nur. Zipper näht dich sowieso fest.' },
  { who: 'MILA', text: 'Hallo! Ich bin Mila. Kannst du mich hören?' },
];

// Schlüssel eines Satzes: Figur + Text ohne Formatierung
export function lineKey(who, html) {
  const t = String(html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
  return who + '-' + h.toString(36);
}
