/* Der letzte Bus – eine interaktive Gruselgeschichte.
   Bei jeder Runde wird zufällig ausgelost, welcher Fahrgast kein Mensch ist.
   Wer genau hinsieht und zuhört, findet es heraus. */
'use strict';

const $ = s => document.querySelector(s);
const pause = ms => new Promise(r => setTimeout(r, ms));
const ZAHLEN = ['keinen einzigen', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs'];

/* ---------------------------------------------------------------
   Die Fahrgäste. Jeder hat eine „menschliche“ und eine „Ding“-Fassung
   seiner Hinweise: [Mensch, Ding]. Auch Menschen wirken manchmal
   seltsam – genau hinsehen lohnt sich.
   --------------------------------------------------------------- */
const LEUTE = {
  berger: {
    name: 'Frau Berger', kurz: 'HB',
    einstieg: [
      'Eine alte Frau steigt ein. In der einen Hand eine Einkaufstasche, in der anderen Stricknadeln. Sie nickt dir zu und setzt sich schräg gegenüber.',
      'Aus ihrer Tasche hängt ein roter Schal. Er ist viel zu lang. Er reicht bis auf den Boden.'
    ],
    reden: [
      ['Sie lächelt. „Der ist für meinen Enkel. Er wird nächste Woche zehn.“', 'Sie hält den Schal hoch. „Ich höre einfach nie rechtzeitig auf. Das sagt meine Tochter auch immer.“'],
      ['Sie lächelt. „Der ist für meinen Enkel.“ Die Nadeln klappern weiter, während sie dich ansieht. Sie schaut nicht ein einziges Mal auf ihre Hände.', '„Er wird zehn“, sagt sie. „Er wird schon so lange zehn.“']
    ],
    ansehen: [
      ['Du beobachtest sie heimlich. Sie pustet in einen Becher Tee aus ihrer Thermoskanne, und ihre Brille beschlägt dabei.', 'Ihre Hände zittern ein bisschen. Ganz normale, müde, alte Hände.'],
      ['Du beobachtest sie heimlich. Sie pustet in einen Becher Tee aus ihrer Thermoskanne. Ihre Brille beschlägt nicht.', 'Dann siehst du es: Der Becher ist leer. Sie trinkt trotzdem. Schluck für Schluck.']
    ],
    nochmal: [
      ['„Weißt du, wo dieser Bus eigentlich hinfährt?“, fragt sie leise. „Ich glaube, ich bin falsch eingestiegen. Ich wollte zum Klinikum.“', 'Sie lacht nervös und strickt schneller.'],
      ['„Du warst schon mal hier“, sagt sie, ohne aufzusehen. „Letzten Winter. Mit der blauen Mütze.“', 'Du hattest letzten Winter eine blaue Mütze. Du hast sie verloren. In einem Bus.']
    ],
    beschuldigt: '„Ich?“ Frau Berger lässt die Nadeln sinken. Ihre Augen füllen sich mit Tränen. „Kind, ich will doch nur zu meinem Enkel.“',
    enttarnt: [
      'Frau Berger hört auf zu stricken. Zum ersten Mal.',
      'Der rote Schal rutscht von ihrem Schoß und hört nicht auf zu rutschen, Meter um Meter, bis er den ganzen Gang bedeckt.',
      '„Schade“, sagt sie. Ihr Mund bewegt sich dabei nicht.'
    ],
    lacht: '„Er wird zehn“, flüstert Frau Berger hinter dir. „Und du wirst … gar nichts mehr.“'
  },

  jonas: {
    name: 'Jonas', kurz: 'JO',
    einstieg: [
      'Ein Junge steigt ein, vielleicht sechzehn. Die Kapuze tief im Gesicht, große Kopfhörer über den Ohren.',
      'Er lässt sich auf die letzte Bank fallen und starrt auf sein Handy. Der Bildschirm ist schwarz.'
    ],
    reden: [
      ['Er zieht einen Kopfhörer herunter. „Was?“', '„Mein Akku ist leer, seit ich eingestiegen bin. War vorhin noch bei achtzig.“ Er reibt sich die Arme. „Ist dir auch so kalt?“'],
      ['Er zieht einen Kopfhörer herunter. Aus dem Kopfhörer kommt keine Musik. Nur Atmen. Langsam. Im selben Takt wie deins.', '„Was?“, fragt er. Seine Lippen bewegen sich einen Moment zu spät.']
    ],
    ansehen: [
      ['Er wippt nervös mit dem Fuß. An seinen Turnschuhen klebt frischer Matsch, und auf seiner Hand ist ein Pflaster mit kleinen Dinos drauf.', 'Er sieht aus wie jemand, der dringend nach Hause will.'],
      ['Er sitzt ganz still. Zu still.', 'Du beobachtest ihn, bis der Bus die nächste Kurve nimmt. Er blinzelt nicht. Kein einziges Mal.']
    ],
    nochmal: [
      ['„Meine Mutter bringt mich um“, murmelt er. „Ich hab versprochen, um zwölf zu Hause zu sein.“', 'Er sieht aus dem Fenster. „Die Bäume in der Lindenallee hatten heute Mittag noch Blätter. Ich schwör’s.“'],
      ['„Wie heißt du?“, fragt er. Du sagst es ihm.', '„{name}“, wiederholt er. Dann noch einmal. „{name}.“ Und noch einmal, leiser, als würde er üben, wie es klingt.']
    ],
    beschuldigt: 'Jonas springt auf. „Was? Ich? Spinnst du? Ich hab Hunger, mir ist kalt und ich will nach Hause!“ Seine Stimme bricht.',
    enttarnt: [
      'Jonas nimmt langsam die Kopfhörer ab. Darunter sind keine Ohren.',
      'Er lächelt. Das Lächeln geht zu weit. Viel zu weit.',
      '„{name}“, sagt er mit deiner Stimme. „Fast hätte ich es richtig gekonnt.“'
    ],
    lacht: '„{name}“, sagt Jonas hinter dir. Mit deiner Stimme. Diesmal klingt es perfekt.'
  },

  mira: {
    name: 'Mira', kurz: 'MI',
    einstieg: [
      'Eine junge Frau steigt ein. Unter ihrem Regenmantel trägt sie hellblaue Krankenhauskleidung, in der Hand einen Kaffeebecher. Ihre Augen sind rot vor Müdigkeit.',
      'Hinter ihr, am Friedhofstor, steht jetzt niemand mehr.'
    ],
    reden: [
      ['„Nachtschicht“, sagt sie und hebt den Becher. „Zwölf Stunden.“', '„Ich wohne hinter dem Friedhof. Ist eine Abkürzung. Nachts ein bisschen gruselig, aber man gewöhnt sich dran.“'],
      ['„Nachtschicht“, sagt sie. „Ich habe heute jemanden verloren.“ Sie lächelt dabei.', '„Aber jetzt ist er ja wieder da.“ Sie sieht an dir vorbei. Auf den leeren Platz neben dir.']
    ],
    ansehen: [
      ['Auf ihrem Namensschild steht „M. Okafor – Station 4“. Ihr Regenmantel ist trocken, nur an ihren Schuhen klebt feuchtes Gras vom Friedhof.', 'Sie gähnt so heftig, dass ihr die Augen tränen. Der Kaffee dampft.'],
      ['Ihr Namensschild ist leer.', 'Ihr Mantel tropft. Dabei hat es am Friedhof gar nicht geregnet. Die Pfütze unter ihrem Sitz wird immer größer. Das Wasser ist schwarz.']
    ],
    nochmal: [
      ['Sie mustert dich, so wie Krankenschwestern das machen. „Du bist ganz schön blass. Hast du heute was gegessen?“', 'Sie gibt dir einen Müsliriegel. Ihre Finger sind warm.'],
      ['Sie greift nach deinem Handgelenk, ganz professionell, und fühlt deinen Puls. Ihre Finger sind eiskalt.', '„Hm“, sagt sie. „Noch.“']
    ],
    beschuldigt: 'Mira sieht dich müde an. „Ehrlich jetzt? Ich hab zwölf Stunden Leute gerettet, und du …“ Sie schüttelt den Kopf und sieht weg.',
    enttarnt: [
      'Mira stellt den Kaffeebecher ab. Er ist voll mit schwarzem Wasser.',
      'Sie steht auf, und das Wasser läuft aus ihren Ärmeln, aus ihren Haaren, aus ihren Augen.',
      '„Ich hätte gut auf dich aufgepasst“, sagt sie. „Für immer.“'
    ],
    lacht: '„Hm“, macht Mira hinter dir, und ihre kalten Finger legen sich um dein Handgelenk. „Jetzt nicht mehr.“'
  },

  albrecht: {
    name: 'Herr Albrecht', kurz: 'HA',
    einstieg: [
      'Ein großer Mann in einem grauen Mantel steigt ein und nimmt höflich den Hut ab. Sein Regenschirm ist zusammengeklappt und völlig trocken.',
      '„Guten Abend allerseits“, sagt er und setzt sich direkt hinter den Fahrer.'
    ],
    reden: [
      ['„Albrecht, sehr angenehm.“ Er nickt dir zu und tippt auf den Anhänger an deinem Rucksack. „Und du bist {name}. Steht ja hier.“', '„Man sollte seinen Namen nachts nicht so offen herumtragen“, sagt er. „Man weiß nie, wer mitliest.“'],
      ['„Guten Abend, {name}“, sagt er freundlich.', 'Du hast ihm deinen Namen nicht gesagt. Er steht nirgends. „Wir kennen uns noch nicht“, sagt er. „Aber bald.“']
    ],
    ansehen: [
      ['Er liest Zeitung. Eine ganz normale Zeitung von heute, mit Fußballergebnissen und Wetterbericht. Ab und zu schüttelt er den Kopf.', 'Er riecht nach Pfefferminz und Rasierwasser.'],
      ['Er liest Zeitung. Du schielst auf die Seite: Das Datum ist von morgen.', 'Auf der Titelseite ist ein Foto. Von diesem Bus.']
    ],
    nochmal: [
      ['„Ich fahre diese Strecke jede Nacht“, erzählt er. „Ich bin Nachtwächter im Stadtmuseum.“', '„Diese Haltestelle hatte früher einen Namen. Irgendwann ist er einfach … abgeblättert. Niemand hat ihn neu geschrieben.“'],
      ['„Ich fahre diese Strecke jede Nacht“, sagt er. „Schon sehr, sehr lange.“', 'Er zählt die Fahrgäste mit dem Finger ab. Bei dir hört er auf und lächelt.']
    ],
    beschuldigt: 'Herr Albrecht hebt die Augenbrauen. „Junger Mensch, das ist eine ziemlich unhöfliche Behauptung.“ Seine Hände krallen sich um den Regenschirm. Sie zittern.',
    enttarnt: [
      'Herr Albrecht faltet seine Zeitung zusammen, ordentlich, Kante auf Kante.',
      'Dann setzt er seinen Hut auf. Unter dem Hut ist kein Gesicht mehr. Nur Dunkelheit, die dich ansieht.',
      '„Morgen“, sagt die Dunkelheit höflich. „Morgen steht es in der Zeitung.“'
    ],
    lacht: '„Wir kennen uns noch nicht“, sagt Herr Albrecht hinter dir. „Aber jetzt haben wir ja Zeit.“'
  },

  lotte: {
    name: 'Lotte', kurz: 'LO',
    einstieg: [
      'Ein kleines Mädchen in einer gelben Regenjacke steigt ein. Ganz allein. Sie drückt einen Stoffhasen an sich, der nur ein Ohr hat.',
      'Der Fahrer sagt nichts. Sie setzt sich auf den Platz direkt neben der Tür.'
    ],
    reden: [
      ['„Ich warte auf meine Mama“, sagt sie ernst. „Sie hat gesagt, ich soll an der Schule warten. Aber dann ist es so dunkel geworden.“', 'Ihre Unterlippe zittert. „Fährt der Bus nach Hause?“'],
      ['„Ich warte auf meine Mama“, sagt sie ernst. „Schon seit 1987.“', 'Dann kichert sie, als wäre das ein richtig guter Witz.']
    ],
    ansehen: [
      ['Ihre Schuhe sind mit Doppelknoten zugebunden, so wie Eltern das machen. Aus ihrer Jackentasche guckt ein Zettel:', '„Lotte, Klasse 1b. Bei Fragen bitte Mama anrufen.“ Darunter eine Telefonnummer.'],
      ['Die Deckenlampe hängt genau über ihr. Unter ihrem Sitz ist der Boden hell.', 'Sie wirft keinen Schatten. Und ihr Hase hat jetzt zwei Ohren.']
    ],
    nochmal: [
      ['Sie hält dir ihren Hasen hin. „Das ist Herr Hoppel. Er hat Angst im Dunkeln.“', '„Ich nicht“, sagt sie. Dann rückt sie ein Stück näher an dich heran. „Na gut. Ein bisschen.“'],
      ['„Du sitzt auf dem Platz von jemandem“, flüstert sie.', '„Er kommt gleich wieder.“']
    ],
    beschuldigt: 'Lotte versteht nicht sofort. Dann fängt sie an zu weinen, ganz leise, und drückt Herrn Hoppel an sich. „Ich will zu meiner Mama.“',
    enttarnt: [
      'Lotte hört auf zu kichern.',
      'Sie lässt den Hasen fallen. Er landet mit einem nassen Geräusch, das nicht nach Stoff klingt.',
      '„Du hättest mein Freund sein können“, sagt sie, und ihre Stimme ist plötzlich sehr, sehr alt.'
    ],
    lacht: 'Hinter dir kichert Lotte. „Jetzt bist du dran mit Warten.“'
  }
};

/* ---------------------------------------------------------------
   Die Haltestellen – jede seltsamer als die vorige.
   --------------------------------------------------------------- */
const HALTE = [
  { szene: 'stadt', schild: 'Marktplatz', uhr: '00:47', regen: 1, laternen: true },
  {
    szene: 'bahnhof', schild: 'Hauptbahnhof', uhr: '00:53', regen: 1, laternen: true, steigt: 'berger',
    fahrt: ['Der Bus fährt durch die leere Innenstadt. Alle Ampeln sind grün. Alle gleichzeitig.'],
    text: ['Die große Uhr über dem Bahnhofseingang hat keine Zeiger.', 'Der Bahnhof ist leer. Nur unter dem Wartehäuschen steht jemand, als hätte er genau auf diesen Bus gewartet.']
  },
  {
    szene: 'linden', schild: 'Lindenallee', uhr: '01:04', regen: .35, laternen: 'flackern', steigt: 'jonas',
    fahrt: ['Die Scheibenwischer quietschen. Irgendwann merkst du, dass sie im Takt quietschen. Wie ein Lied, das du kennst und an das du dich nicht erinnern willst.'],
    text: ['Die Lindenallee. Hier läufst du jeden Morgen zur Schule. Aber so kennst du sie nicht.', 'Die Bäume sind kahl, alle, und ihre Äste hängen über die Straße wie lange, dünne Finger. Der Regen hört auf, als hätte jemand ihn abgedreht.']
  },
  {
    szene: 'friedhof', schild: 'Am Alten Friedhof', uhr: '01:13', regen: 0, laternen: false, steigt: 'mira',
    fahrt: ['Der Bus biegt ab, wo er nicht abbiegen sollte. Die Straßen werden schmaler. Die Häuser haben keine Türen mehr.'],
    text: ['Diese Haltestelle gibt es nicht. Der Alte Friedhof liegt am anderen Ende der Stadt, und dort fährt kein Bus.', 'Nebel kriecht zwischen den Grabsteinen hervor und legt sich um die Räder. Das Tor steht offen.']
  },
  {
    szene: 'namenlos', schild: '', uhr: '01:31', regen: 0, laternen: 'eine', steigt: 'albrecht',
    fahrt: ['Lange fährt der Bus durch völlige Dunkelheit. Draußen ist kein einziges Licht. Im Glas siehst du nur euch selbst.'],
    text: ['Der Bus hält an einer Haltestelle ohne Namen. Das Schild ist leer. Auf dem Fahrplan steht nur eine einzige Abfahrtszeit: jetzt.', 'Rundherum ist nichts. Keine Häuser, keine Straße. Nur eine Laterne, die genau über dem Bus brennt.']
  },
  {
    szene: 'schule', schild: 'Schulstraße', uhr: '02:00', regen: 0, laternen: true, steigt: 'lotte',
    fahrt: ['Der Bus wird schneller. Die Laternen ziehen so schnell vorbei, dass sie zu einem einzigen Lichtstreifen verschwimmen.'],
    text: ['Schulstraße. Deine Schule. Es ist zwei Uhr nachts, und in jedem einzelnen Fenster brennt Licht.', 'In deinem Klassenzimmer, zweiter Stock, drittes Fenster, sitzt jemand an deinem Platz. Bevor du genauer hinsehen kannst, gehen alle Lichter gleichzeitig aus.']
  },
  {
    szene: 'zuhause', schild: 'Ahornweg', uhr: '02:47', regen: .2, laternen: true, zuhause: true,
    fahrt: ['Der Motor brummt tief und gleichmäßig, wie etwas Großes, das schläft.'],
    text: ['Ahornweg. Deine Haltestelle. Endlich.', 'Da ist euer Haus. In der Küche brennt Licht. Durch das Fenster siehst du jemanden am Tisch sitzen. Er wartet auf dich.', 'Die Türen öffnen sich. Niemand steigt ein. Trotzdem senkt sich der Bus ein Stück, als wäre etwas Schweres zugestiegen.', 'Der Fahrer wartet.']
  },
  {
    szene: 'ende', schild: 'Endstation', uhr: '00:47', regen: 0, laternen: false, ende: true,
    fahrt: ['Der Bus fährt weiter. Weg von deinem Haus, weg von allem. Die Straße unter den Rädern wird weich und still.']
  }
];

const FAHRER = [
  ['Du gehst nach vorne. „Entschuldigung, wohin fährt dieser Bus?“', 'Der Fahrer antwortet nicht. Im Rückspiegel siehst du nur den Schirm seiner Mütze.'],
  ['„Hallo? Ich muss zum Ahornweg.“', 'Der Fahrer hebt einen Finger, ohne sich umzudrehen, und zeigt auf das Schild über seinem Kopf: BITTE WÄHREND DER FAHRT NICHT MIT DEM FAHRER SPRECHEN.', 'Darunter hat jemand mit Kuli geschrieben: ZÄHL LIEBER.'],
  ['Diesmal sind seine Augen im Rückspiegel zu sehen. Müde Augen. Sie kommen dir bekannt vor.', 'Sehr bekannt.'],
  ['„Sie sehen aus wie …“, fängst du an.', 'Der Fahrer klappt den Rückspiegel nach oben.'],
  ['Der Fahrer summt leise. Es ist dasselbe Lied wie das der Scheibenwischer.']
];

const ENDEN = {
  ausgestiegen: 'Ausgestiegen',
  fahrgast: 'Fahrgast',
  doppelt: 'Doppelt',
  steuer: 'Am Steuer'
};

/* ---------------------------------------------------------------
   Spielzustand
   --------------------------------------------------------------- */
let S;
function neuesSpiel(name) {
  S = {
    name,
    ding: pick(Object.keys(LEUTE)),
    da: [],             // eingestiegene Fahrgäste
    getan: new Set(),   // z. B. 'jonas:ansehen'
    spiegel: false,
    fahrer: 0,
    aufmerksam: 0,      // wie sehr das Ding bemerkt hat, dass du es beobachtest
    warnung1: false,
    warnung2: false
  };
}
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
const istDing = id => S.ding === id;
const n = s => s.replace(/\{name\}/g, S.name);

/* ---------------------------------------------------------------
   Erzähl-Werkzeuge
   --------------------------------------------------------------- */
const textEl = $('#text'), wahlEl = $('#wahl'), zeitEl = $('#zeit'), geschichteEl = $('#geschichte');
let eilig = false;
geschichteEl.addEventListener('click', e => { if (!e.target.closest('button')) eilig = true; });

function runter() { geschichteEl.scrollTop = geschichteEl.scrollHeight; }
function leeren() { textEl.innerHTML = ''; }

async function sag(zeilen, klasse) {
  if (!Array.isArray(zeilen)) zeilen = [zeilen];
  for (let z of zeilen) {
    z = n(z);
    const p = document.createElement('p');
    p.className = klasse || (/^[„»]/.test(z) ? 'rede' : '');
    textEl.appendChild(p);
    const knoten = document.createTextNode('');
    p.appendChild(knoten);
    for (let i = 0; i < z.length; i++) {
      if (eilig) { knoten.data = z; break; }
      knoten.appendData(z[i]);
      if (i % 4 === 0) { runter(); if (z[i] !== ' ') Klang.tippen(); }
      const c = z[i];
      await pause('.!?…'.includes(c) ? 240 : c === ',' ? 90 : 20);
    }
    runter();
    await pause(eilig ? 40 : 320);
  }
}

function trenner() {
  const p = document.createElement('p'); p.className = 'trenner'; textEl.appendChild(p);
}

function waehle(optionen) {
  eilig = false;
  return new Promise(fertig => {
    wahlEl.innerHTML = '';
    for (const o of optionen) {
      const b = document.createElement('button');
      b.textContent = n(o.text);
      if (o.klasse) b.className = o.klasse;
      b.onclick = () => { wahlEl.innerHTML = ''; Klang.klick(); fertig(o.wert); };
      wahlEl.appendChild(b);
    }
    runter();
  });
}
const weiter = (text = 'Weiter ▸') => waehle([{ text, wert: 1, klasse: 'weiter' }]);

/* ---------------------------------------------------------------
   Bild: Fenster, Regen, Sitze, Licht
   --------------------------------------------------------------- */
const draussen = $('#draussen');

function svgUrl(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }

function streifenFuer(szene, laternen) {
  const W = 600, H = 200;
  let fern = '', nah = '';
  const r = (a, b) => a + Math.random() * (b - a);
  if (szene === 'stadt' || szene === 'bahnhof' || szene === 'zuhause' || szene === 'schule') {
    let x = 0;
    while (x < W) {
      const w = r(40, 90), h = szene === 'zuhause' ? r(50, 80) : r(70, 150);
      fern += `<rect x="${x}" y="${H - h}" width="${w - 4}" height="${h}" fill="#0b0d14"/>`;
      if (szene === 'zuhause') fern += `<path d="M${x - 4} ${H - h} L${x + w / 2} ${H - h - 26} L${x + w} ${H - h}Z" fill="#0b0d14"/>`;
      for (let fy = H - h + 10; fy < H - 20; fy += 18) {
        for (let fx = x + 8; fx < x + w - 14; fx += 14) {
          const an = szene === 'schule' ? true : Math.random() < (szene === 'zuhause' ? .08 : .3);
          if (an) fern += `<rect x="${fx}" y="${fy}" width="7" height="9" fill="${szene === 'schule' ? '#dfe8ff' : '#f2c56b'}" opacity="${r(.5, .95)}"/>`;
        }
      }
      x += w;
    }
  } else if (szene === 'linden') {
    for (let x = 10; x < W; x += r(50, 80)) {
      const h = r(110, 160), y0 = H - h;
      fern += `<g stroke="#050608" stroke-width="5" fill="none" stroke-linecap="round"><path d="M${x} ${H} L${x} ${y0 + 40}"/>`;
      for (let k = 0; k < 6; k++) {
        const ax = x + r(-40, 40), ay = y0 + r(-10, 50);
        fern += `<path d="M${x} ${y0 + r(40, 80)} Q${x + (ax - x) / 2} ${ay + 20} ${ax} ${ay}" stroke-width="${r(1.5, 3)}"/>`;
      }
      fern += '</g>';
    }
  } else if (szene === 'friedhof') {
    fern += `<rect x="0" y="${H - 30}" width="${W}" height="30" fill="#151a1c"/>`;
    for (let x = 10; x < W; x += r(28, 50)) {
      const h = r(18, 34);
      fern += Math.random() < .4
        ? `<path d="M${x + 6} ${H - 28 - h} v${h + 4} M${x} ${H - 18 - h} h12" stroke="#101415" stroke-width="4"/>`
        : `<path d="M${x} ${H - 26} v-${h - 8} a8 8 0 0 1 16 0 v${h - 8}Z" fill="#101415"/>`;
    }
    for (let x = 0; x < W; x += 9) nah += `<rect x="${x}" y="${H - 70}" width="3" height="70" fill="#07090a"/>`;
    nah += `<rect x="0" y="${H - 64}" width="${W}" height="3" fill="#07090a"/><rect x="0" y="${H - 22}" width="${W}" height="3" fill="#07090a"/>`;
  }
  if (laternen === true || laternen === 'flackern') {
    for (let x = 60; x < W; x += 300) {
      nah += `<rect x="${x}" y="40" width="5" height="${H - 40}" fill="#08090c"/><rect x="${x - 12}" y="36" width="30" height="6" fill="#08090c"/>`;
      nah += `<ellipse cx="${x + 3}" cy="46" rx="22" ry="6" fill="#ffd27a" opacity=".85"/><path d="M${x - 10} 46 L${x - 50} ${H} L${x + 56} ${H} L${x + 16} 46Z" fill="#ffd27a" opacity=".07"/>`;
    }
  }
  if (laternen === 'eine') {
    nah = `<rect x="295" y="30" width="5" height="${H - 30}" fill="#0a0a0a"/><ellipse cx="298" cy="34" rx="20" ry="6" fill="#ffd27a"/><path d="M285 36 L230 ${H} L366 ${H} L311 36Z" fill="#ffd27a" opacity=".12"/>`;
  }
  const wrap = inhalt => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${inhalt}</svg>`;
  return { fern: wrap(fern), nah: wrap(nah) };
}

function szene(h) {
  const faehrt = draussen.classList.contains('faehrt'), schnell = draussen.classList.contains('schnell');
  draussen.className = 'szene-' + h.szene;
  draussen.classList.toggle('faehrt', faehrt);
  draussen.classList.toggle('schnell', schnell);
  const st = streifenFuer(h.szene, h.laternen);
  for (const [id, svg] of [['#fern', st.fern], ['#nah', st.nah]]) {
    const el = $(id);
    el.style.backgroundImage = svgUrl(svg);
    el.style.backgroundSize = '50% 100%';
  }
  $('#nah').classList.toggle('flimmert', h.laternen === 'flackern');
  regenStufe = h.regen;
  Klang.regen(h.regen);
}

function fahren(an, schnell) {
  draussen.classList.toggle('faehrt', an);
  draussen.classList.toggle('schnell', !!schnell);
  Klang.motor(an ? (schnell ? 1 : .8) : .3);
}

function schildZeigen(text) {
  const s = $('#schild');
  s.classList.remove('hidden');
  s.querySelector('b').textContent = text;
  s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
}
function schildWeg() { $('#schild').classList.add('hidden'); }

function sitzeZeichnen() {
  const el = $('#sitze');
  el.innerHTML = '';
  const du = document.createElement('div');
  du.className = 'platz du';
  du.innerHTML = '<i>DU</i><span></span>';
  du.querySelector('span').textContent = S.name;
  el.appendChild(du);
  for (const id of S.da) {
    const p = document.createElement('div');
    p.className = 'platz';
    p.innerHTML = `<i>${LEUTE[id].kurz}</i><span>${LEUTE[id].name}</span>`;
    el.appendChild(p);
  }
}

function flackern() {
  document.body.classList.remove('flackern'); void document.body.offsetWidth;
  document.body.classList.add('flackern');
  $('#led').classList.add('stoerung');
  setTimeout(() => $('#led').classList.remove('stoerung'), 1300);
}

// Regen auf der Scheibe
const regenCanvas = $('#regen'), rc = regenCanvas.getContext('2d');
let regenStufe = 0, tropfen = [];
function regenSchleife() {
  const w = regenCanvas.clientWidth, h = regenCanvas.clientHeight;
  if (regenCanvas.width !== w || regenCanvas.height !== h) { regenCanvas.width = w; regenCanvas.height = h; }
  rc.clearRect(0, 0, w, h);
  const ziel = Math.floor(regenStufe * 90);
  while (tropfen.length < ziel) tropfen.push({ x: Math.random() * w, y: Math.random() * h, v: 4 + Math.random() * 6, l: 8 + Math.random() * 14 });
  if (tropfen.length > ziel) tropfen.length = ziel;
  const schraeg = draussen.classList.contains('faehrt') ? -0.35 : -0.05;
  rc.strokeStyle = 'rgba(180,200,230,.35)'; rc.lineWidth = 1;
  rc.beginPath();
  for (const t of tropfen) {
    rc.moveTo(t.x, t.y); rc.lineTo(t.x + t.l * schraeg, t.y + t.l);
    t.y += t.v; t.x += t.v * schraeg;
    if (t.y > h || t.x < -20) { t.y = -20; t.x = Math.random() * (w + 40); }
  }
  rc.stroke();
  requestAnimationFrame(regenSchleife);
}

/* ---------------------------------------------------------------
   Gespeicherte Enden
   --------------------------------------------------------------- */
const ENDEN_KEY = 'derletztebus.enden';
function gefundeneEnden() { try { return JSON.parse(localStorage.getItem(ENDEN_KEY)) || []; } catch (e) { return []; } }
function endeMerken(k) {
  try {
    const a = gefundeneEnden();
    if (!a.includes(k)) { a.push(k); localStorage.setItem(ENDEN_KEY, JSON.stringify(a)); }
  } catch (e) { /* egal */ }
}
function endenZeigen() {
  const gef = gefundeneEnden();
  const el = $('#enden');
  el.innerHTML = '';
  if (!gef.length) return;
  for (const k of Object.keys(ENDEN)) {
    const s = document.createElement('span');
    s.textContent = gef.includes(k) ? '★ ' + ENDEN[k] : '? ? ?';
    if (gef.includes(k)) s.className = 'ja';
    el.appendChild(s);
  }
  const info = document.createElement('span');
  info.textContent = `${gef.length} von ${Object.keys(ENDEN).length} Enden`;
  el.appendChild(info);
}

/* ---------------------------------------------------------------
   Ablauf
   --------------------------------------------------------------- */
async function einleitung() {
  const h = HALTE[0];
  szene(h); $('#uhr').textContent = h.uhr;
  schildZeigen(h.schild);
  Klang.motor(0); Klang.unbehagen(0);
  await sag(['Es ist 00:47. Der Regen ist so kalt, dass er in den Ohren wehtut.',
    'Du hast die letzte Bahn verpasst. Dein Handy hat noch 3 % Akku. Bis nach Hause sind es vier Haltestellen. Normalerweise.',
    'Dann biegen zwei Scheinwerfer um die Ecke. Ein Nachtbus. Auf der Anzeige leuchtet: N13 – ENDSTATION.',
    'Die N13 kennst du nicht. Aber sie hält direkt vor dir, und die Türen öffnen sich mit einem langen Seufzen.']);
  Klang.motor(.3); Klang.tueren();
  let w = await waehle([{ text: 'Einsteigen', wert: 'rein' }, { text: 'Lieber auf einen anderen Bus warten', wert: 'warten' }]);
  if (w === 'warten') {
    await sag(['Du wartest. Der Bus wartet auch.', 'Es kommt kein anderer Bus. Es kommt kein Auto, kein Mensch, nicht einmal eine Katze. Die Türen stehen offen. Drinnen ist es warm und hell.',
      'Dein Handy geht aus.'], 'leise');
    await waehle([{ text: 'Einsteigen', wert: 'rein' }]);
  }
  await sag(['Der Bus ist leer. Es riecht nach nassen Jacken und altem Kaugummi.',
    'Der Fahrer trägt eine Mütze und dreht sich nicht um. Du hältst ihm dein Ticket hin. Er nickt nur.',
    'Du setzt dich in die Mitte, ans Fenster. Die Türen schließen sich hinter dir.']);
  Klang.tueren();
  sitzeZeichnen();
  await weiter('Losfahren ▸');
}

async function fahrtZu(i) {
  const h = HALTE[i];
  leeren();
  zeitEl.innerHTML = '';
  schildWeg();
  fahren(true, h.szene === 'schule');
  Klang.unbehagen(Math.min(1, i / 6));
  await sag(h.fahrt, 'leise');
  await pause(900);
  szene(h);
  await pause(700);
  fahren(false);
  Klang.gong();
  $('#uhr').textContent = h.uhr;
  schildZeigen(h.schild);
  await sag(h.ende ? 'ENDSTATION' : (h.schild ? h.schild.toUpperCase() : '– – –'), 'halt');
  if (h.text) await sag(h.text);
}

async function einsteigenLassen(id) {
  Klang.tueren();
  await sag(LEUTE[id].einstieg);
  S.da.push(id);
  sitzeZeichnen();
  Klang.tueren();
}

// Zwei Dinge kannst du zwischen zwei Haltestellen tun.
async function zwischenHalt() {
  let zuege = 2;
  while (zuege > 0) {
    trenner();
    zeitEl.innerHTML = 'Bis zur nächsten Haltestelle: <b>' + '●'.repeat(zuege) + '○'.repeat(2 - zuege) + '</b>';
    const opt = [];
    for (const id of S.da) {
      const offen = ['reden', 'ansehen'].filter(a => !S.getan.has(id + ':' + a)).length
        + (S.getan.has(id + ':reden') && !S.getan.has(id + ':nochmal') ? 1 : 0);
      if (offen) opt.push({ text: LEUTE[id].name + ' …', wert: 'p:' + id });
    }
    if (!S.spiegel) opt.push({ text: 'Ins Spiegelbild der Scheibe schauen', wert: 'spiegel' });
    opt.push({ text: 'Zum Fahrer gehen', wert: 'fahrer' });
    opt.push({ text: 'Einfach still sitzen bleiben', wert: 'still', klasse: 'zurueck' });

    const w = await waehle(opt);
    if (w.startsWith('p:')) {
      const id = w.slice(2);
      const sub = [];
      if (!S.getan.has(id + ':reden')) sub.push({ text: 'Mit ' + LEUTE[id].name + ' reden', wert: 'reden' });
      else if (!S.getan.has(id + ':nochmal')) sub.push({ text: 'Noch einmal mit ' + LEUTE[id].name + ' reden', wert: 'nochmal' });
      if (!S.getan.has(id + ':ansehen')) sub.push({ text: LEUTE[id].name + ' heimlich genauer ansehen', wert: 'ansehen' });
      sub.push({ text: '◂ Zurück', wert: 'zurueck', klasse: 'zurueck' });
      const a = await waehle(sub);
      if (a === 'zurueck') continue;
      S.getan.add(id + ':' + a);
      await sag(LEUTE[id][a][istDing(id) ? 1 : 0]);
      if (istDing(id)) S.aufmerksam++;
    } else if (w === 'spiegel') {
      await spiegelbild();
    } else if (w === 'fahrer') {
      await sag(FAHRER[Math.min(S.fahrer, FAHRER.length - 1)]);
      S.fahrer++;
    } else {
      await sag('Du ziehst die Jacke enger und schaust aus dem Fenster. Du versuchst, nicht aufzufallen.', 'leise');
      if (S.aufmerksam > 0) S.aufmerksam--;
      zuege = 1;
    }
    zuege--;
  }
  zeitEl.innerHTML = '';
  await warnungen();
}

async function spiegelbild() {
  S.spiegel = true;
  const echt = S.da.length;
  const imGlas = echt - (S.da.includes(S.ding) ? 1 : 0);
  await sag(['Du wischst mit dem Ärmel über die beschlagene Scheibe. Im dunklen Glas spiegelt sich der ganze Bus: die gelben Haltestangen, die Sitze, du selbst.',
    `Du zählst die Fahrgäste im Spiegelbild: ${ZAHLEN[imGlas]}.`,
    `Du drehst dich um und zählst noch einmal, in echt: ${ZAHLEN[echt]}.`]);
  if (imGlas !== echt) {
    Klang.schreck();
    await sag('Du zählst noch einmal. Es bleibt dabei. Einer von ihnen ist im Glas nicht da.', 'unheimlich');
  } else {
    await sag('Die Zahlen stimmen. Fürs Erste.');
  }
  await sag('Dein Atem lässt die Scheibe sofort wieder beschlagen. Diesmal bleibt sie trüb, egal wie oft du wischst.', 'leise');
}

async function warnungen() {
  if (S.aufmerksam >= 2 && !S.warnung1) {
    S.warnung1 = true;
    flackern();
    await sag(['Das Licht flackert.', 'Du spürst, dass dich jemand ansieht. Als du aufschaust, schauen alle aus dem Fenster. Alle bis auf einen – aber du warst nicht schnell genug, um zu sehen, wer.'], 'leise');
  } else if (S.aufmerksam >= 4 && !S.warnung2) {
    S.warnung2 = true;
    document.body.classList.add('blackout');
    Klang.schreck();
    await sag(['Das Licht geht aus. Komplett. Der Motor läuft weiter.',
      'In der Dunkelheit setzt sich jemand neben dich. Du spürst, wie der Sitz nachgibt. Etwas Kaltes legt sich auf deine Hand.'], 'leise');
    await sag('„Nicht so neugierig, {name}“, flüstert es.', 'unheimlich');
    await pause(900);
    document.body.classList.remove('blackout');
    await sag('Das Licht geht wieder an. Neben dir ist niemand. Alle sitzen auf ihren Plätzen. Genau wie vorher.');
  }
}

function namensListe(ids) {
  const namen = ids.map(id => LEUTE[id].name);
  if (namen.length <= 1) return namen.join('');
  return namen.slice(0, -1).join(', ') + ' und ' + namen[namen.length - 1];
}

async function zuhause() {
  const w = await waehle([
    { text: 'Aussteigen und nach Hause rennen', wert: 'raus', klasse: 'gefahr' },
    { text: 'Sitzen bleiben', wert: 'bleiben' }
  ]);
  if (w === 'bleiben') {
    await sag(['Du bleibst sitzen. Irgendetwas in dir sagt, dass das, was da am Küchentisch sitzt, nicht auf dich wartet.',
      'Die Türen schließen sich. Das Licht in der Küche geht aus.']);
    Klang.tueren();
    return false;
  }
  Klang.tueren();
  await sag(['Du springst aus dem Bus. Die Luft riecht nach nassem Laub und nach Zuhause. Du rennst zur Haustür.',
    'Hinter dir schließen sich die Türen. Aber der Bus fährt nicht los.',
    'Du drehst dich um. Im hell erleuchteten Bus sitzen alle noch auf ihren Plätzen. ' + namensListe(S.da) + '. Und in der Mitte, am Fenster:']);
  Klang.schreck();
  await sag('Du.', 'unheimlich');
  await sag(['Dein anderes Ich hebt die Hand und winkt dir zu. Dann fährt der Bus in die Nacht.',
    'Du schließt die Haustür auf. Am Küchentisch sitzt niemand. Auf dem Tisch liegt dein Handy.',
    'Es hat 3 % Akku. Die Uhr zeigt 00:47.']);
  await ende('doppelt');
  return true;
}

async function endstation() {
  await sag(['Draußen ist nichts mehr. Kein Haus, kein Baum, kein Himmel. Nur weißer, stiller Nebel.',
    'Zum ersten Mal steht der Fahrer auf. Er dreht sich nicht um. Seine Stimme klingt wie ein Radio, das zwischen zwei Sendern rauscht.']);
  await sag(['„Endstation. Alle Menschen steigen hier aus.“', '„Einer von euch ist kein Mensch. Wer es ist, bleibt im Bus.“', '„Sag es mir, {name}. Du hast doch genau hingesehen.“']);
  await sag('Alle sehen dich an.', 'leise');
  const opt = S.da.map(id => ({ text: 'Auf ' + LEUTE[id].name + ' zeigen', wert: id }));
  opt.push({ text: 'Auf den Fahrer zeigen', wert: 'fahrer', klasse: 'gefahr' });
  const w = await waehle(opt);
  leeren();

  if (w === 'fahrer') {
    await sag(['Du zeigst auf den Fahrer.', 'Er lacht leise. Dann dreht er sich zum ersten Mal um.']);
    Klang.schreck();
    await sag('Er hat dein Gesicht. Älter. Müder.', 'unheimlich');
    await sag(['„Gut geraten“, sagt er mit deiner Stimme. „Ich habe damals auch auf den Fahrer gezeigt.“',
      'Er nimmt seine Mütze ab und setzt sie dir auf. Sie passt genau.',
      'Die anderen steigen aus, alle, auch das, was kein Mensch war. Der Nebel verschluckt sie. Dann steigt auch der alte Fahrer aus und ist fort.',
      'Du setzt dich hinter das Lenkrad. Auf der Anzeige steht: N13 – ENDSTATION.',
      'Irgendwo in der Stadt steht jemand im Regen und wartet auf den letzten Bus.']);
    return ende('steuer');
  }

  await sag(`Du zeigst auf ${LEUTE[w].name}.`);
  await pause(600);

  if (istDing(w)) {
    Klang.schreck();
    flackern();
    await sag(LEUTE[w].enttarnt, 'unheimlich');
    const andere = S.da.filter(id => id !== w);
    await sag(['Der Fahrer nickt. „Gut.“', 'Die Türen öffnen sich.',
      (andere.length ? `Ihr steigt aus – du, ${namensListe(andere)}.` : 'Du steigst aus.') + ' Der Nebel ist warm, und irgendwo dahinter wird es hell.',
      `Als du dich umdrehst, fährt der Bus schon. Hinter der Rückscheibe sitzt ${LEUTE[w].name} und winkt. Langsam. Bis der Nebel den Bus verschluckt.`]);
    szene({ szene: 'zuhause', laternen: true, regen: 0 });
    Klang.unbehagen(0); Klang.motor(0, 4);
    await sag(['Du stehst an der Haltestelle Ahornweg. Es dämmert. Ein Vogel singt.',
      'Dein Handy vibriert: 14 verpasste Anrufe von Zuhause.',
      'Du hast es geschafft.']);
    return ende('ausgestiegen');
  }

  await sag(LEUTE[w].beschuldigt);
  await sag(['Der Fahrer schweigt sehr lange.', '„Falsch“, sagt er.']);
  Klang.schreck();
  await sag(['Hinter dir lacht jemand. Ganz leise.', LEUTE[S.ding].lacht], 'unheimlich');
  document.body.classList.add('blackout');
  await sag('Die Lichter gehen aus.', 'leise');
  await pause(1200);
  document.body.classList.remove('blackout');
  S.da = [];
  sitzeZeichnen();
  szene(HALTE[0]);
  schildZeigen(HALTE[0].schild);
  $('#uhr').textContent = HALTE[0].uhr;
  fahren(true);
  await sag(['Als sie wieder angehen, ist der Bus leer. Nur du sitzt noch da, in der Mitte, am Fenster.',
    'Draußen regnet es. Der Bus hält am Marktplatz. Dort steht jemand im Regen, und die Türen öffnen sich mit einem langen Seufzen.',
    'Diesmal bist du der Fahrgast, der schon da ist.']);
  fahren(false);
  await ende('fahrgast');
}

async function ende(k) {
  endeMerken(k);
  trenner();
  await sag('ENDE: ' + ENDEN[k].toUpperCase(), 'halt');
  if (k !== 'ausgestiegen') {
    await sag(`Kein Mensch war übrigens: ${LEUTE[S.ding].name}.`, 'leise');
  }
  const gef = gefundeneEnden().length, alle = Object.keys(ENDEN).length;
  await sag(`Du hast ${gef} von ${alle} Enden gefunden. Bei jeder Fahrt ist jemand anderes kein Mensch.`, 'leise');
  await waehle([{ text: 'Noch einmal einsteigen', wert: 1, klasse: 'weiter' }]);
  Klang.motor(0); Klang.regen(0); Klang.unbehagen(0);
  $('#bus').classList.add('hidden');
  $('#titel').classList.remove('hidden');
  endenZeigen();
}

async function spielen() {
  leeren();
  await einleitung();
  for (let i = 1; i < HALTE.length; i++) {
    await fahrtZu(i);
    const h = HALTE[i];
    if (h.steigt) await einsteigenLassen(h.steigt);
    if (h.zuhause && await zuhause()) return;
    if (h.ende) return endstation();
    await zwischenHalt();
    await weiter('Weiterfahren ▸');
  }
}

/* ---------------------------------------------------------------
   Start
   --------------------------------------------------------------- */
const tonKnopf = $('#ton');
tonKnopf.classList.toggle('aus', Klang.stumm);
tonKnopf.onclick = () => { Klang.start(); tonKnopf.classList.toggle('aus', Klang.umschalten()); };

const nameEingabe = $('#nameEingabe');
try { nameEingabe.value = localStorage.getItem('derletztebus.name') || ''; } catch (e) { /* egal */ }

$('#einsteigen').onclick = () => {
  let name = nameEingabe.value.trim().replace(/[<>{}]/g, '') || 'Sam';
  name = name.charAt(0).toUpperCase() + name.slice(1);
  try { localStorage.setItem('derletztebus.name', name); } catch (e) { /* egal */ }
  Klang.start();
  neuesSpiel(name);
  $('#titel').classList.add('hidden');
  $('#bus').classList.remove('hidden');
  spielen();
};

endenZeigen();
regenSchleife();
