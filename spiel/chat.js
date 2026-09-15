/* chat.js – die Leute und das automatische Gequatsche.
   Die Begleiter stellen von selbst Fragen, du wählst eine Antwort. */
(function (global) {
  'use strict';

  var PEOPLE = {
    lisbeth: {
      name: 'Lisbeth', rolle: 'Ritterin mit Bogen', color: '#8fd36a', kurz: 'Lisbeth',
      ritter: { a: '#cfe8bf', b: '#7ab05e', c: '#4a7a3a', t: '#4f9b45', u: '#3a7a34', r: '#8fd36a' },
      pal: { hair: '#a8642a', skin: '#f0c191', shirt: '#4f9b45', shirtDark: '#3a7a34', pants: '#5b4326', boots: '#3a2a18' }
    },
    tarik: {
      name: 'Tarik', rolle: 'Ritter und Schmied', color: '#e8a54a', kurz: 'Tarik',
      ritter: { a: '#f0d0a0', b: '#c08a4a', c: '#8a5a28', t: '#b8603a', u: '#94472a', r: '#e8a54a' },
      pal: { hair: '#2a1d14', skin: '#c08a5a', shirt: '#b8603a', shirtDark: '#94472a', pants: '#3b3b46', boots: '#2a2a33' }
    },
    momo: {
      name: 'Momo', rolle: 'Zauberritterin', color: '#c78ce0', kurz: 'Momo',
      ritter: { a: '#e8d0f5', b: '#a878c8', c: '#6b44a0', t: '#8a5ac4', u: '#6b44a0', r: '#c78ce0' },
      pal: { hair: '#6b3f8a', skin: '#f5cfa8', shirt: '#8a5ac4', shirtDark: '#6b44a0', pants: '#4a3a6b', boots: '#2f2545' }
    },
    gris: {
      name: 'Griswold', rolle: 'alter Ritter', color: '#a9c0d8', kurz: 'Griswold',
      ritter: { a: '#dfe8f2', b: '#9aa8bc', c: '#5a6478', t: '#5a6478', u: '#454e60', r: '#a9c0d8' },
      pal: { hair: '#cfd4dc', skin: '#e0b48a', shirt: '#5a6478', shirtDark: '#454e60', pants: '#3b4250', boots: '#2a2f3a' }
    },
    mama: {
      name: 'Mama Edda', rolle: 'Mutter', color: '#f0a0b8', kurz: 'Edda',
      pal: { hair: '#8a5a2a', skin: '#f0c191', shirt: '#c4557a', shirtDark: '#a03f60', pants: '#6b4a2b', boots: '#4a3524' }
    },
    papa: {
      name: 'Papa Gunnar', rolle: 'Vater', color: '#d8c07a', kurz: 'Gunnar',
      pal: { hair: '#6b4a2b', skin: '#e8b58a', shirt: '#4a6b8a', shirtDark: '#37536b', pants: '#4a3a2a', boots: '#33261a' }
    },
    mila: {
      name: 'Mila', rolle: 'kleine Schwester', color: '#9ad8e0', kurz: 'Mila',
      pal: { hair: '#e0c05a', skin: '#f5cfa8', shirt: '#5ab8c4', shirtDark: '#3f95a0', pants: '#8a5ac4', boots: '#5b4326' }
    },
    buerger: {
      name: 'Stadtmensch', rolle: 'Buerger', color: '#c8c8d8', kurz: 'Buerger',
      pal: { hair: '#4a3a2a', skin: '#e8b58a', shirt: '#6b7a8a', shirtDark: '#55606e', pants: '#3b3b46', boots: '#2a2a33' }
    },
    buerger2: {
      name: 'Baeckerin Rosa', rolle: 'Baeckerin', color: '#f0b0c0', kurz: 'Rosa',
      pal: { hair: '#8a3f5a', skin: '#f0c191', shirt: '#e0a0b8', shirtDark: '#c07f98', pants: '#efe6cf', boots: '#7a5327' }
    },
    buerger3: {
      name: 'Alter Jorin', rolle: 'Rentner', color: '#c0c0b0', kurz: 'Jorin',
      pal: { hair: '#dcdcdc', skin: '#e0b48a', shirt: '#7a6a5a', shirtDark: '#5f5348', pants: '#4a4238', boots: '#33261a' }
    },
    buerger4: {
      name: 'Nell', rolle: 'Botin', color: '#8fd0e0', kurz: 'Nell',
      pal: { hair: '#2a4a8a', skin: '#c08a5a', shirt: '#4a9bb8', shirtDark: '#377a92', pants: '#3b3b46', boots: '#2a2a33' }
    },
    buerger5: {
      name: 'Wache Brom', rolle: 'Stadtwache', color: '#b0b8c8', kurz: 'Brom',
      pal: { hair: '#3a3a44', skin: '#e8b58a', shirt: '#5a6478', shirtDark: '#454e60', pants: '#3b4250', boots: '#2a2f3a' }
    },
    buerger6: {
      name: 'Kleiner Tino', rolle: 'Stadtkind', color: '#e0d080', kurz: 'Tino',
      pal: { hair: '#c8a03a', skin: '#f5cfa8', shirt: '#7ac45a', shirtDark: '#5da040', pants: '#8a5ac4', boots: '#5b4326' }
    },
    hund: {
      name: 'Wuffel', rolle: 'Familienhund', color: '#d8a45a', kurz: 'Wuffel',
      pal: { hair: '#a9743f', skin: '#c89a62', shirt: '#a9743f', shirtDark: '#7a5327', pants: '#7a5327', boots: '#5b3d22' }
    },
    haendler: {
      name: 'Haendler Bosko', rolle: 'Waffenschmied', color: '#ffd24a', kurz: 'Bosko',
      pal: { hair: '#5a3a1a', skin: '#d8a070', shirt: '#8a5a2a', shirtDark: '#6b4420', pants: '#4a3a2a', boots: '#33261a' }
    },
    schmied: {
      name: 'Schmiedin Halda', rolle: 'Ruestungsschmiedin', color: '#b8c8e0', kurz: 'Halda',
      pal: { hair: '#3a3a44', skin: '#c89a62', shirt: '#5a6478', shirtDark: '#454e60', pants: '#3b3b46', boots: '#24242c' }
    },
    alchi: {
      name: 'Alchemist Vex', rolle: 'Traenkemischer', color: '#ff9ab0', kurz: 'Vex',
      pal: { hair: '#6b3f8a', skin: '#e8c0a0', shirt: '#a04a70', shirtDark: '#7a3554', pants: '#4a2a44', boots: '#2e1a2a' }
    },
    meister: {
      name: 'Waffenmeister Orin', rolle: 'alter Kaempfer', color: '#ffb06a', kurz: 'Orin',
      pal: { hair: '#c8c8d0', skin: '#d8a070', shirt: '#7a3a2a', shirtDark: '#5a2a1e', pants: '#3a3228', boots: '#241e18' }
    }
  };

  var ZOMBIE_PAL = {
    hair: '#2f4a2a', skin: '#7aa85f', eye: '#c43a2a',
    shirt: '#5b4a3a', shirtDark: '#443528', pants: '#3a3a44', boots: '#2a2622'
  };

  /* ---------- Fragen, die die Begleiter von selbst stellen ---------- */
  var FRAGEN = {
    wald: [
      { q: 'Sag mal, wie viele Zombies schaffen wir heute?',
        a: [{ t: 'Alle! Jeden einzelnen.', r: 'Ha! Genau so redet ein Ritter.' },
            { t: 'Vielleicht zehn.', r: 'Zehn sind ein guter Anfang.' },
            { t: 'Am liebsten keinen.', r: 'Auch gut. Dann gehen wir Beeren suchen.' }] },
      { q: 'Riechst du das auch? So modrig... die sind nah.',
        a: [{ t: 'Schwert raus, ich gehe vor.', r: 'Ich bleib direkt hinter dir.' },
            { t: 'Wir schleichen aussen rum.', r: 'Schlau. Leise wie ein Fuchs.' }] },
      { q: 'Was war eigentlich dein erster Kampf?',
        a: [{ t: 'Gegen eine Gans. Ich hab verloren.', r: 'Gaense sind auch furchtbar.' },
            { t: 'Gegen drei Zombies auf einmal.', r: 'Drei?! Und du stehst noch?' },
            { t: 'Daran denke ich nicht gern.', r: 'Verstehe. Dann reden wir ueber was anderes.' }] },
      { q: 'Wenn du ein Tier waerst - welches?',
        a: [{ t: 'Ein Baer.', r: 'Passt. Gross, ruhig, und niemand legt sich mit dir an.' },
            { t: 'Ein Rabe.', r: 'Schlau und immer da, wo was los ist.' },
            { t: 'Ein Igel.', r: 'Stachelig von aussen, weich innen. Kenn ich.' }] },
      { q: 'Dein Schwert - hat das einen Namen?',
        a: [{ t: 'Eichenzahn.', r: 'Eichenzahn! Das klingt nach Aerger fuer Zombies.' },
            { t: 'Nein, es ist einfach ein Schwert.', r: 'Jedes gute Schwert verdient einen Namen. Denk drueber nach.' },
            { t: 'Kuschel.', r: '...Kuschel. Okay. Warum eigentlich nicht.' }] },
      { q: 'Sollen wir nachher noch zum Teich?',
        a: [{ t: 'Ja, Fuesse ins Wasser.', r: 'Abgemacht!' },
            { t: 'Erst Zombies, dann Teich.', r: 'Arbeit vor Vergnuegen. Sehr ritterlich.' }] },
      { q: 'Vermisst du deine Familie, wenn wir draussen sind?',
        a: [{ t: 'Immer ein bisschen.', r: 'Deshalb passen wir auf, dass du heil heimkommst.' },
            { t: 'Ich bin doch gleich wieder da.', r: 'Stimmt. Das Haus laeuft nicht weg.' }] },
      { q: 'Wer haelt laenger auf einem Bein? Du oder ich?',
        a: [{ t: 'Ich natuerlich.', r: 'Gewagt. Nach dem Kampf gilt das!' },
            { t: 'Du, in voller Ruestung schaff ich das nie.', r: 'Endlich sagt es mal einer.' }] }
    ],
    kampf: [
      { q: 'Achtung, da vorne! Was machen wir?',
        a: [{ t: 'Ich lenke ihn ab, du von hinten.', r: 'Guter Plan. Los!' },
            { t: 'Alle draufhauen!', r: 'Mein Lieblingsplan.' },
            { t: 'Ruhig bleiben und warten.', r: 'Okay... ich zittere aber trotzdem.' }] },
      { q: 'Alles noch heil bei dir?',
        a: [{ t: 'Nur ein Kratzer.', r: 'Sagt jeder Ritter, kurz bevor er umkippt.' },
            { t: 'Ehrlich? Es tut weh.', r: 'Dann geh hinter mich. Ich uebernehme.' }] }
    ],
    haus: [
      { q: 'Gemuetlich habt ihr es hier. Wer hat das Haus gebaut?',
        a: [{ t: 'Mein Vater, Balken fuer Balken.', r: 'Das sieht man. Das haelt hundert Winter.' },
            { t: 'Ich. Mit sehr vielen Schrammen.', r: 'Respekt! Und alles steht noch gerade.' }] },
      { q: 'Was gibt es heute zu essen?',
        a: [{ t: 'Eintopf. Wie immer.', r: 'Eintopf ist nie "wie immer". Eintopf ist immer gut.' },
            { t: 'Keine Ahnung, Mama ueberrascht uns.', r: 'Die besten Essen sind Ueberraschungen.' }] }
    ],
    stadt: [
      { q: 'So viele Leute! Bleibst du in der Naehe?',
        a: [{ t: 'Ich geh nirgendwo hin.', r: 'Gut. Ich verlauf mich hier sonst.' },
            { t: 'Ich schau mich kurz um.', r: 'Dann treffen wir uns beim Brunnen.' }] },
      { q: 'Sollen wir was kaufen?',
        a: [{ t: 'Brot fuer den Rueckweg.', r: 'Vernuenftig. Und vielleicht Kuchen?' },
            { t: 'Ich hab kein Geld dabei.', r: 'Gucken ist umsonst.' },
            { t: 'Ein neues Schwert!', r: 'Deins ist doch gut. Aber schauen wir mal.' }] },
      { q: 'Merkst du, wie ruhig das hier ist ohne Zombies?',
        a: [{ t: 'Fast schon zu ruhig.', r: 'Typisch Ritter. Geniess es einfach.' },
            { t: 'Herrlich.', r: 'Nicht wahr? Kein Stoehnen, kein Gematsche.' }] }
    ]
  };

  /* Wenn man mit einem Zombie redet statt zuzuschlagen */
  var ZOMBIE_TEXTE = [
    'Der Zombie bleibt stehen und starrt dich an. Ein Grashalm haengt ihm aus dem Ohr.',
    'Der Zombie macht "Bluuuh?" und legt den Kopf schief.',
    'Der Zombie schnueffelt an deinem Schwert und niest. Fast schon suess.'
  ];

  var ZOMBIE_FREUND = [
    'Der Zombie brummt zufrieden, winkt kurz und schlurft in den Wald zurueck.',
    'Der Zombie legt dir einen matschigen Wurm vor die Fuesse. Ein Geschenk!',
    'Der Zombie macht einen sehr langsamen Freudensprung und trollt sich.'
  ];

  var SPARE_LINES = [
    'Du hast ihn einfach gehen lassen? Du bist schon ein Komischer.',
    'Guck mal, der winkt! Das hab ich ja noch nie gesehen.',
    'Nicht jeder Kampf muss ein Kampf sein. Schoen.'
  ];

  /* Spruch, wenn ein Zombie fällt */
  var KILL_LINES = [
    'Sauber getroffen!',
    'Der steht nicht mehr auf.',
    'Zwei, drei Hiebe - wie im Lehrbuch.',
    'Puh. Der roch wirklich uebel.',
    'Noch einer weniger im Wald.',
    'Dein Schwert singt heute.'
  ];

  var FAMILY_LINES = {
    mama: [
      'Da bist du ja! Hast du wieder mit dem Schwert im Wald gespielt?',
      'Es steht Eintopf auf dem Feuer. Iss was, dann haelst du auch mehr aus.',
      'Pass auf dich auf da draussen, Ritter hin oder her.'
    ],
    papa: [
      'Das Holz fuer den Winter liegt noch draussen. Aber erst mal: erzaehl!',
      'Frueher war der Wald ruhiger. Heute stolpert man ueber Zombies.',
      'Wenn ihr in die Stadt wollt - der Wagen steht auf dem Weg.'
    ],
    mila: [
      'Nimmst du mich mal mit raus? Bitte bitte bitte!',
      'Ich hab ein Bild von dir gemalt. Du bist da sehr eckig.',
      'Mama sagt, ich darf erst mit, wenn ich groesser bin. Ich bin doch schon riesig!'
    ]
  };

  var CITY_LINES = [
    'Ein Ritter! Mit echtem Schwert! Machen Sie bitte kein Loch in die Strasse.',
    'Frisches Brot, zwei Kupfer. Fuer Helden drei, weil Helden immer Hunger haben.',
    'Zombies? Hier? Nein nein, die bleiben schoen im Wald. Hoffentlich.',
    'Schoenes Auto haben Sie da. Faehrt das auch bergauf?',
    'Beim Haendler am Brunnen gibt es Ruestungen. Der nimmt nur Muenzen.',
    'Mein Neffe sagt, im Wald waere ein Werwolf. Ich sage: zu viel Fantasie.',
    'Wenn Sie Muenzen haben - ausgeben! Liegen lassen macht sie nicht mehr.',
    'Heute ist Markt. Also, eigentlich ist immer Markt.',
    'Sie sehen muede aus. Und ein bisschen nach Zombie.',
    'Guten Tag! Schoenes Wetter, oder? Sagen Sie bitte ja, ich uebe Small Talk.',
    'Ich haette gern so ein Schwert. Meine Mutter sagt nein.',
    'Die Strassenlaternen sind neu. Kosten haben die gekostet!'
  ];

  /* Was der Haendler so sagt */
  var SHOP_LINES = [
    'Aha! Ein Ritter mit Muenzen in der Tasche. Willkommen!',
    'Frisch geschmiedet, alles ehrlich. Was darf es sein?',
    'Du siehst aus, als koenntest du was Schaerferes gebrauchen.'
  ];

  /* ---------- Die Bosse ---------- */
  /* Die Bosse. Gekaempft wird direkt im Wald - mit Schwert und Rolle.
     angriffe = was er kann. Jeder Angriff wird vorher angekuendigt,
     damit man wegrollen kann. Wer stehen bleibt, kassiert. */
  var BOSSE = [
    {
      key: 'koenig', name: 'Grauzahn, der Zombiekoenig', art: 'zombie',
      scale: 1.9, hp: 75, speed: 34, dmg: 2, farbe: '#7ad048',
      angriffe: ['sturm', 'rufen', 'stampf'],
      intro: 'Der Boden bebt. Ein riesiger Zombie mit schiefer Krone stapft aus dem Dickicht.',
      spruch: 'GRRRAAA! MEIN WALD! MEINE WUERMER!',
      sieg: 'Die Krone kullert ins Gras. Grauzahn faellt um wie ein nasser Sack.'
    },
    {
      key: 'spinne', name: 'Nachtweberin, die Waldspinne', art: 'spider',
      scale: 1.6, hp: 90, speed: 50, dmg: 2, farbe: '#c78ce0',
      angriffe: ['sturm', 'salve', 'sprung'],
      intro: 'Zwischen zwei Eichen haengt ein Netz so gross wie eine Tuer. Acht Beine kommen heraus.',
      spruch: 'ssssss... bleib doch ein biiisschen kleben.',
      sieg: 'Die Nachtweberin rollt sich ein und verschwindet im Gebuesch.'
    },
    {
      key: 'wolf', name: 'Mondfell, der Werwolf', art: 'wolf',
      scale: 1.6, hp: 105, speed: 56, dmg: 3, farbe: '#d8d0e8',
      angriffe: ['sturm', 'fegen', 'sprung'],
      intro: 'Ein Heulen, viel zu nah. Etwas Grosses laeuft auf zwei Beinen zwischen den Baeumen.',
      spruch: 'Du riechst nach Eintopf, kleiner Ritter.',
      sieg: 'Mondfell schuettelt sich, brummt beleidigt und trottet davon.'
    },
    {
      key: 'knorr', name: 'Alter Knorr, der Baumgeist', art: 'treant',
      scale: 1.5, hp: 130, speed: 26, dmg: 3, farbe: '#8fd36a',
      angriffe: ['wurzeln', 'stampf', 'regen'],
      intro: 'Der Baum vor dir macht die Augen auf. Und dann macht er einen Schritt.',
      spruch: 'Ihr... trampelt... auf... meinen... Wurzeln.',
      sieg: 'Alter Knorr setzt sich wieder hin und ist einfach nur noch ein Baum.'
    },
    {
      key: 'ritter', name: 'Sir Moder, der gefallene Ritter', art: 'ritter',
      scale: 1.7, hp: 165, speed: 52, dmg: 3, farbe: '#9aa4b8',
      angriffe: ['sturm', 'fegen', 'sprung', 'salve'],
      intro: 'Eine rostige Ruestung richtet sich auf. Sie war mal einer von euch.',
      spruch: 'ICH... WAR... DER BESTE... VON... UNS.',
      sieg: 'Der Helm rollt davon. Innen drin war schon lange niemand mehr.'
    },
    {
      key: 'fuerst', name: 'Der Seuchenfuerst', art: 'fuerst',
      scale: 2.1, hp: 220, speed: 46, dmg: 4, farbe: '#ff5a9a',
      angriffe: ['regen', 'rufen', 'stampf', 'salve', 'sturm'],
      intro: 'Der Himmel wird gruen. Etwas sehr Altes und sehr Boeses richtet sich auf.',
      spruch: 'IHR SEID NUR DER ANFANG MEINER ARMEE.',
      sieg: 'Der Seuchenfuerst zerfaellt zu Staub. Der Himmel wird wieder blau.'
    }
  ];

  /* Was der Boss beim Angriff ruft */
  var BOSS_ANSAGEN = {
    sturm: 'STURMANGRIFF!',
    stampf: 'ER STAMPFT!',
    fegen: 'RUNDUMSCHLAG!',
    salve: 'SALVE!',
    rufen: 'ER RUFT VERSTAERKUNG!',
    wurzeln: 'WURZELN!',
    sprung: 'ER SPRINGT!',
    regen: 'ES REGNET SEUCHE!'
  };

  var BOSS_LINES = {
    auftritt: [
      'Das ist kein normaler Zombie. Bleib dicht bei mir!',
      'Oh nein. OH NEIN. Ist der gross.',
      'Ausweichen, dann zuschlagen. Immer abwechselnd!',
      'Sowas hab ich zuletzt als Kind gesehen. Damals bin ich weggelaufen.'
    ],
    sieg: [
      'DAS war ein Kampf! Hast du gesehen, wie der umgefallen ist?',
      'Mein Herz klopft bis in die Ohren. Aber wir leben!',
      'Dein Schwert hat heute gesungen, Ritter.',
      'Ich erzaehl das heute Abend allen. Mit Handbewegungen.'
    ]
  };

  var Chat = {
    zombieTexte: ZOMBIE_TEXTE,
    zombieFreund: ZOMBIE_FREUND,
    spareLines: SPARE_LINES,
    shopLines: SHOP_LINES,
    bosse: BOSSE,
    bossAnsagen: BOSS_ANSAGEN,
    bossLines: BOSS_LINES,
    people: PEOPLE,
    zombiePal: ZOMBIE_PAL,
    killLines: KILL_LINES,
    familyLines: FAMILY_LINES,
    cityLines: CITY_LINES,
    timer: 16 + Math.random() * 10,
    lastIdx: -1
  };

  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  /* Wird jede Sekunde vom Spiel gefragt: Zeit für eine Frage? */
  Chat.update = function (dt, game) {
    if (!game.party.length) return;
    if (global.Dialog.isOpen()) return;
    if (game.state !== 'play') return;
    if (game.zombieNear && game.zombieNear(120)) { Chat.timer = 5; return; }
    Chat.timer -= dt;
    if (Chat.timer > 0) return;
    Chat.timer = 20 + Math.random() * 18;
    Chat.ask(game, null);
  };

  /* Stellt eine Frage. who = Person (optional), ctx = Situation */
  Chat.ask = function (game, who, ctxName) {
    var partner = who || pick(game.party);
    var p = PEOPLE[partner.key] || PEOPLE.lisbeth;
    var ctx = ctxName || game.mapKey;
    var pool = FRAGEN[ctx] || FRAGEN.wald;
    var f = pool[(Math.random() * pool.length) | 0];
    var opts = f.a.map(function (o) {
      return { t: o.t, r: o.r };
    });
    global.Dialog.push(p.name + ' (' + p.rolle + ')', p.color, f.q, opts);
    global.Dialog.begin();
    partner.mood = (partner.mood || 0) + 1;
  };

  Chat.killLine = function (game) {
    if (!game.party.length || global.Dialog.isOpen()) return;
    if (game.zombieNear && game.zombieNear(95)) return;
    if (Math.random() > 0.5) return;
    var partner = pick(game.party);
    var p = PEOPLE[partner.key];
    global.Dialog.push(p.name, p.color, pick(KILL_LINES));
    global.Dialog.begin();
  };

  global.Chat = Chat;
})(window);
