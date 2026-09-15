/* maps.js – die drei Welten: Wald, Holzhaus, Stadt */
(function (global) {
  'use strict';

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* Feste Buchstaben, die man nicht betreten kann */
  var SOLID = 'Tt*rs~#^W=bnmhFBCVKOQlP';

  function grid(w, h, ch) {
    var g = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) row.push(ch);
      g.push(row);
    }
    return g;
  }
  function stamp(g, x0, y0, rows) {
    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < rows[y].length; x++) {
        var ch = rows[y][x];
        if (ch === '|') continue;            /* '|' = nichts verändern */
        if (g[y0 + y] && g[y0 + y][x0 + x] !== undefined) g[y0 + y][x0 + x] = ch;
      }
    }
  }
  function rect(g, x0, y0, w, h, ch) {
    for (var y = y0; y < y0 + h; y++) {
      for (var x = x0; x < x0 + w; x++) {
        if (g[y] && g[y][x] !== undefined) g[y][x] = ch;
      }
    }
  }
  function toStrings(g) {
    var out = [];
    for (var y = 0; y < g.length; y++) out.push(g[y].join(''));
    return out;
  }

  /* ============================ WALD ============================ */
  function buildWald() {
    var W = 44, H = 34, r = rng(20250914);
    var g = grid(W, H, '.');
    var x, y;

    /* Grasvarianten */
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        var v = r();
        g[y][x] = v > 0.9 ? 'f' : (v > 0.68 ? ',' : '.');
      }
    }
    /* Waldrand ringsum */
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        var d = Math.min(x, y, W - 1 - x, H - 1 - y);
        if (d === 0 || (d <= 2 && r() > 0.25)) g[y][x] = 'T';
      }
    }
    /* Baumgruppen im Inneren */
    for (var i = 0; i < 34; i++) {
      var cx = 4 + ((r() * (W - 8)) | 0), cy = 4 + ((r() * (H - 8)) | 0);
      var n = 1 + ((r() * 4) | 0);
      for (var k = 0; k < n; k++) {
        var tx = cx + ((r() * 4) | 0) - 2, ty = cy + ((r() * 4) | 0) - 2;
        if (g[ty] && g[ty][tx]) g[ty][tx] = r() > 0.65 ? 't' : 'T';
      }
    }
    /* Büsche, Steine */
    for (i = 0; i < 24; i++) {
      x = 3 + ((r() * (W - 6)) | 0); y = 3 + ((r() * (H - 6)) | 0);
      g[y][x] = r() > 0.45 ? '*' : 'r';
    }
    /* Teich unten rechts */
    for (y = 24; y < 31; y++) {
      for (x = 31; x < 41; x++) {
        var dx = (x - 36) / 5, dy = (y - 27.5) / 3.4;
        if (dx * dx + dy * dy < 1) g[y][x] = '~';
      }
    }

    /* Lichtung ums Haus frei räumen */
    rect(g, 3, 2, 18, 12, '.');
    for (y = 2; y < 14; y++) for (x = 3; x < 21; x++) if (r() > 0.75) g[y][x] = ',';

    /* Holzhaus (8 breit) bei x=6, y=3 */
    stamp(g, 6, 3, [
      '..^^^^^^^^..',
      '.^^^^^^^^^^.',
      '.^^^^^^^^^^.',
      '..#W####W#..',
      '..###Dd###..',
      '..--------..'
    ]);

    /* Weg vom Haus nach unten und nach rechts zum Auto */
    for (y = 9; y <= 17; y++) { g[y][11] = '-'; g[y][12] = '-'; }
    for (x = 11; x <= 27; x++) { g[17][x] = '-'; g[18][x] = '-'; }
    for (y = 17; y <= 22; y++) { g[y][26] = '-'; g[y][27] = '-'; }
    /* Platz fürs Auto frei halten */
    rect(g, 24, 14, 6, 4, '-');

    /* Lichtung in der Mitte (Kampfplatz) */
    rect(g, 14, 21, 12, 8, ',');
    for (y = 21; y < 29; y++) for (x = 14; x < 26; x++) if (r() > 0.82) g[y][x] = 'f';
    /* ein paar einzelne Bäume als Deko in der Lichtung */
    g[23][16] = 'T'; g[27][23] = 't'; g[25][20] = '*';

    /* --- Der alte Friedhof unten links: da kommen die Zombies her --- */
    rect(g, 4, 24, 8, 7, ',');
    for (y = 24; y < 31; y++) for (x = 4; x < 12; x++) if (r() > 0.7) g[y][x] = '.';
    /* Trampelpfad vom Weg zum Friedhof */
    for (x = 8; x <= 14; x++) { g[23][x] = '-'; }
    for (y = 19; y <= 23; y++) { g[y][14] = '-'; }

    return {
      key: 'wald',
      name: 'Eichenwald',
      rows: toStrings(g),
      music: 'wald',
      spawn: { x: 11.5, y: 10 },
      zombies: true,
      triggers: [
        { x: 11, y: 7, w: 2, h: 1, kind: 'door', to: 'haus', tx: 10.5, ty: 10.5 }
      ],
      props: [
        { kind: 'car', x: 16.8, y: 10.4 },
        { kind: 'sign', x: 28, y: 20.9, text: 'Wegweiser: Nach Osten geht es zur Stadt Eichenstadt. Zu Fuss viel zu weit - nimm das Auto!' },
        /* Lagerfeuer vor dem Haus - nachts sitzen hier alle */
        { kind: 'fire', x: 13.5, y: 13.5 },
        { kind: 'barrel', x: 9.6, y: 9.4 },
        { kind: 'barrel', x: 9.6, y: 10.6 },
        /* Zaun links neben dem Haus */
        { kind: 'fence', x: 8.5, y: 12.5 },
        { kind: 'fence', x: 9.5, y: 12.5 },
        { kind: 'fence', x: 10.5, y: 12.5 },
        /* Der Friedhof */
        { kind: 'grave', x: 5.5, y: 25.5, art: 0 },
        { kind: 'grave', x: 7.5, y: 25.5, art: 1 },
        { kind: 'grave', x: 9.5, y: 25.5, art: 2 },
        { kind: 'grave', x: 5.5, y: 27.5, art: 1 },
        { kind: 'grave', x: 7.5, y: 27.5, art: 2 },
        { kind: 'grave', x: 9.5, y: 27.5, art: 0 },
        { kind: 'grave', x: 6.5, y: 29.5, art: 2 },
        { kind: 'grave', x: 8.5, y: 29.5, art: 1 },
        { kind: 'sign', x: 11.6, y: 23.4, text: 'Verwitterte Tafel: HIER RUHT NIEMAND MEHR RICHTIG. Nachts wird es hier ungemuetlich.' }
      ],
      /* Startplätze für die vier Freunde vor dem Haus */
      friendSpots: [
        { x: 15.5, y: 11 }, { x: 17, y: 12.5 }, { x: 14, y: 13 }, { x: 16.5, y: 14.5 }
      ]
    };
  }

  /* ============================ HAUS ============================ */
  function buildHaus() {
    var rows = [
      '====================',
      '==W=======W======W==',
      '=F________________b=',
      '=_________________n=',
      '=___mmm___________h=',
      '=___mmm____________=',
      '=___hhh____________=',
      '=b_________cc______=',
      '=n_________cc______=',
      '=h_________________=',
      '=__________________=',
      '=_________Dd_______=',
      '====================',
      '====================',
      '===================='
    ];
    return {
      key: 'haus',
      name: 'Zuhause',
      rows: rows,
      music: 'haus',
      spawn: { x: 10.5, y: 10.5 },
      zombies: false,
      triggers: [
        { x: 10, y: 11, w: 2, h: 1, kind: 'door', to: 'wald', tx: 11.5, ty: 10 }
      ],
      props: []
    };
  }

  /* ============================ STADT ============================ */
  function buildStadt() {
    var W = 44, H = 30, r = rng(31415);
    var g = grid(W, H, 'S');
    var x, y, i;

    /* Alles Gehweg, dann Straßen einzeichnen */
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        /* Waagerechte Hauptstraße */
        if (y >= 13 && y <= 17) g[y][x] = (y === 15 ? 'M' : 'R');
        /* Senkrechte Straße */
        if (x >= 20 && x <= 24) g[y][x] = (x === 22 && !(y >= 13 && y <= 17) ? 'M' : 'R');
      }
    }
    /* Häuserblöcke */
    function block(x0, y0, w, h, kinds) {
      for (var yy = y0; yy < y0 + h; yy++) {
        for (var xx = x0; xx < x0 + w; xx++) {
          if (!g[yy] || g[yy][xx] === undefined) continue;
          var bi = Math.floor((xx - x0) / 4) + Math.floor((yy - y0) / 3) * 2;
          g[yy][xx] = kinds[bi % kinds.length];
        }
      }
    }
    block(2, 2, 14, 8, ['B', 'B', 'C', 'V']);
    block(27, 2, 14, 8, ['V', 'C', 'B', 'B']);
    block(2, 21, 13, 7, ['C', 'B', 'V', 'C']);
    block(28, 21, 13, 7, ['B', 'V', 'C', 'B']);
    /* Ladenzeile an der Hauptstraße */
    for (x = 4; x < 14; x++) g[10][x] = 'K';
    for (x = 29; x < 39; x++) g[10][x] = 'K';
    for (x = 5; x < 13; x++) g[20][x] = 'K';
    /* Park mit Brunnen in der Mitte unten */
    rect(g, 16, 19, 8, 8, 'S');
    rect(g, 17, 20, 6, 6, '.');
    for (y = 20; y < 26; y++) for (x = 17; x < 23; x++) if (r() > 0.7) g[y][x] = ',';

    /* Raender: aussen Gebaeude, damit man nicht rauslaeuft */
    for (y = 0; y < H; y++) {
      g[y][0] = 'B'; g[y][1] = 'B'; g[y][W - 1] = 'B'; g[y][W - 2] = 'B';
    }
    for (x = 0; x < W; x++) {
      g[0][x] = 'B'; g[1][x] = 'B'; g[H - 1][x] = 'B'; g[H - 2][x] = 'B';
    }
    /* Strassen bis zum Rand offen lassen (Ein- und Ausfahrt) */
    for (x = 0; x < W; x++) {
      if (x < 2 || x > W - 3) { g[14][x] = 'R'; g[15][x] = 'M'; g[16][x] = 'R'; }
    }

    /* Von oben sieht man Daecher - nur die Seite zur Strasse ist Hauswand */
    function offen(ch) { return 'SRM.,f-'.indexOf(ch) >= 0; }
    var g2 = [];
    for (y = 0; y < H; y++) g2.push(g[y].slice());
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        var ch = g[y][x];
        if ('BCVK'.indexOf(ch) < 0) continue;
        var untenFrei = (y + 1 < H) && offen(g[y + 1][x]);
        if (!untenFrei) g2[y][x] = (ch === 'C' || ch === 'K') ? 'Q' : 'O';
      }
    }
    g = g2;

    var props = [
      { kind: 'sign', x: 18.5, y: 12.6, text: 'Auf dem Blatt am Stadttor steht: "EICHENSTADT - 412 Einwohner, 3 Baecker, 0 Zombies. Bitte Schwert stecken lassen!"' },
      { kind: 'lamp', x: 18.5, y: 18.6 },
      { kind: 'lamp', x: 26.5, y: 18.6 },
      { kind: 'lamp', x: 18.5, y: 11.6 },
      { kind: 'lamp', x: 26.5, y: 11.6 },
      { kind: 'car', x: 26.5, y: 20.5 },
      { kind: 'fountain', x: 19.9, y: 23.5 },
      { kind: 'bench', x: 17.5, y: 25.6 },
      { kind: 'bench', x: 22.3, y: 25.6 },
      { kind: 'tree', x: 17.5, y: 21.2 },
      { kind: 'tree', x: 22.5, y: 21.2 },
      { kind: 'lamp', x: 25.4, y: 24.6 },
      { kind: 'stall', x: 25.6, y: 23.2 }
    ];

    return {
      key: 'stadt',
      name: 'Eichenstadt',
      rows: toStrings(g),
      music: 'stadt',
      spawn: { x: 26.5, y: 22 },
      zombies: false,
      triggers: [],
      props: props,
      wanderSpots: [
        { x: 12, y: 18, wer: 'buerger' },
        { x: 31, y: 12, wer: 'buerger5' },
        { x: 18, y: 12, wer: 'buerger2' },
        { x: 34, y: 19, wer: 'buerger3' },
        { x: 26, y: 26, wer: 'buerger6' },
        { x: 8, y: 12, wer: 'buerger4' },
        { x: 37, y: 24, wer: 'buerger' },
        { x: 14, y: 26, wer: 'buerger2' },
        { x: 30, y: 18, wer: 'buerger6' },
        { x: 20, y: 18, wer: 'buerger3' },
        { x: 5, y: 19, wer: 'buerger4' },
        { x: 39, y: 12, wer: 'buerger5' }
      ],
      /* Der Haendler steht an seinem Stand, gleich neben dem Auto. */
      haendler: { x: 26.9, y: 23.9 }
    };
  }

  global.MAPS = {
    SOLID: SOLID,
    wald: buildWald,
    haus: buildHaus,
    stadt: buildStadt
  };
})(window);
