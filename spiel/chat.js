/* chat.js – die Leute und das automatische Gequatsche.
   Die Begleiter stellen von selbst Fragen, du wählst eine Antwort. */
(function (global) {
  'use strict';

  var PEOPLE = {
    lisbeth: {
      name: 'Lisbeth', rolle: 'Bogenschuetzin', color: '#8fd36a', kurz: 'Lisbeth',
      pal: { hair: '#a8642a', skin: '#f0c191', shirt: '#4f9b45', shirtDark: '#3a7a34', pants: '#5b4326', boots: '#3a2a18' }
    },
    tarik: {
      name: 'Tarik', rolle: 'Schmied', color: '#e8a54a', kurz: 'Tarik',
      pal: { hair: '#2a1d14', skin: '#c08a5a', shirt: '#b8603a', shirtDark: '#94472a', pants: '#3b3b46', boots: '#2a2a33' }
    },
    momo: {
      name: 'Momo', rolle: 'Magierin', color: '#c78ce0', kurz: 'Momo',
      pal: { hair: '#6b3f8a', skin: '#f5cfa8', shirt: '#8a5ac4', shirtDark: '#6b44a0', pants: '#4a3a6b', boots: '#2f2545' }
    },
    gris: {
      name: 'Griswold', rolle: 'alter Waechter', color: '#a9c0d8', kurz: 'Griswold',
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
    'Schoenes Auto haben Sie da. Faehrt das auch bergauf?'
  ];

  var Chat = {
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
