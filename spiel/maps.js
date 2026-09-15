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

  /* ============================ WALD ============================
     Der Wald ist jetzt doppelt so gross: Lichtung mit Haus, Teich,
     Friedhof, eine alte Ruine und ganz oben rechts das Dickicht,
     in dem es richtig ungemuetlich wird. */
  function buildWald() {
    var W = 64, H = 48, r = rng(20250914);
    var g = grid(W, H, '.');
    var x, y, i, k;

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
    for (i = 0; i < 80; i++) {
      var cx = 4 + ((r() * (W - 8)) | 0), cy = 4 + ((r() * (H - 8)) | 0);
      var n = 1 + ((r() * 4) | 0);
      for (k = 0; k < n; k++) {
        var tx = cx + ((r() * 4) | 0) - 2, ty = cy + ((r() * 4) | 0) - 2;
        if (g[ty] && g[ty][tx]) g[ty][tx] = r() > 0.65 ? 't' : 'T';
      }
    }
    /* Das Dickicht oben rechts: dichte Tannen, kaum Platz */
    for (y = 3; y < 17; y++) {
      for (x = 40; x < W - 3; x++) {
        if (r() > 0.55) g[y][x] = 't';
        else if (r() > 0.85) g[y][x] = 'r';
      }
    }
    /* eine Schneise mitten durchs Dickicht */
    for (x = 40; x < W - 4; x++) { g[10][x] = ','; g[11][x] = ','; }

    /* Büsche, Steine */
    for (i = 0; i < 48; i++) {
      x = 3 + ((r() * (W - 6)) | 0); y = 3 + ((r() * (H - 6)) | 0);
      g[y][x] = r() > 0.45 ? '*' : 'r';
    }

    /* Grosser See unten rechts */
    for (y = 32; y < 45; y++) {
      for (x = 40; x < 60; x++) {
        var dx = (x - 50) / 9.5, dy = (y - 38.5) / 6;
        if (dx * dx + dy * dy < 1) g[y][x] = '~';
      }
    }
    /* Ufersteine */
    for (i = 0; i < 14; i++) {
      x = 40 + ((r() * 20) | 0); y = 31 + ((r() * 14) | 0);
      if (g[y] && g[y][x] === '.') g[y][x] = 'r';
    }

    /* Lichtung ums Haus frei räumen */
    rect(g, 3, 2, 20, 14, '.');
    for (y = 2; y < 16; y++) for (x = 3; x < 23; x++) if (r() > 0.75) g[y][x] = ',';

    /* Holzhaus (8 breit) bei x=6, y=3 */
    stamp(g, 6, 3, [
      '..^^^^^^^^..',
      '.^^^^^^^^^^.',
      '.^^^^^^^^^^.',
      '..#W####W#..',
      '..###Dd###..',
      '..--------..'
    ]);

    /* Wege: vom Haus runter, dann quer nach rechts zum Auto */
    for (y = 9; y <= 19; y++) { g[y][11] = '-'; g[y][12] = '-'; }
    for (x = 11; x <= 31; x++) { g[19][x] = '-'; g[20][x] = '-'; }
    for (y = 19; y <= 26; y++) { g[y][30] = '-'; g[y][31] = '-'; }
    /* Weg weiter nach Osten zum See und nach Norden ins Dickicht */
    for (x = 31; x <= 47; x++) { g[26][x] = '-'; g[27][x] = '-'; }
    for (y = 11; y <= 19; y++) { g[y][41] = '-'; g[y][42] = '-'; }
    /* Platz fürs Auto frei halten */
    rect(g, 24, 15, 6, 4, '-');

    /* Grosse Lichtung in der Mitte (Kampfplatz) */
    rect(g, 14, 24, 16, 11, ',');
    for (y = 24; y < 35; y++) for (x = 14; x < 30; x++) if (r() > 0.82) g[y][x] = 'f';
    g[27][17] = 'T'; g[32][26] = 't'; g[29][22] = '*';

    /* --- Die alte Ruine links unten --- */
    stamp(g, 4, 36, [
      '==..===',
      '=.....=',
      '=.....|',
      '==...==',
      '=..=.=='
    ]);
    for (y = 35; y < 43; y++) for (x = 3; x < 12; x++) if (g[y][x] === '.') g[y][x] = ',';
    for (x = 11; x <= 17; x++) { g[38][x] = '-'; }

    /* --- Der alte Friedhof unten in der Mitte --- */
    rect(g, 16, 38, 10, 8, ',');
    for (y = 38; y < 46; y++) for (x = 16; x < 26; x++) if (r() > 0.7) g[y][x] = '.';
    for (y = 34; y <= 38; y++) { g[y][20] = '-'; g[y][21] = '-'; }

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
        { kind: 'sign', x: 32.5, y: 22.9, text: 'Wegweiser: Nach Osten geht es zur Stadt Eichenstadt. Zu Fuss viel zu weit - nimm das Auto!' },
        /* Lagerfeuer vor dem Haus */
        { kind: 'fire', x: 13.5, y: 14.5 },
        { kind: 'barrel', x: 9.6, y: 9.4 },
        { kind: 'barrel', x: 9.6, y: 10.6 },
        { kind: 'fence', x: 8.5, y: 13.5 },
        { kind: 'fence', x: 9.5, y: 13.5 },
        { kind: 'fence', x: 10.5, y: 13.5 },
        /* Der Friedhof */
        { kind: 'grave', x: 17.5, y: 39.5, art: 0 },
        { kind: 'grave', x: 19.5, y: 39.5, art: 1 },
        { kind: 'grave', x: 21.5, y: 39.5, art: 2 },
        { kind: 'grave', x: 23.5, y: 39.5, art: 1 },
        { kind: 'grave', x: 17.5, y: 42.5, art: 1 },
        { kind: 'grave', x: 19.5, y: 42.5, art: 2 },
        { kind: 'grave', x: 21.5, y: 42.5, art: 0 },
        { kind: 'grave', x: 23.5, y: 42.5, art: 2 },
        { kind: 'grave', x: 18.5, y: 45.2, art: 2 },
        { kind: 'grave', x: 22.5, y: 45.2, art: 1 },
        { kind: 'sign', x: 20.6, y: 36.4, text: 'Verwitterte Tafel: HIER RUHT NIEMAND MEHR RICHTIG. Nachts wird es hier ungemuetlich.' },
        /* Die Ruine */
        { kind: 'fire', x: 6.5, y: 39.5 },
        { kind: 'barrel', x: 8.5, y: 40.5 },
        { kind: 'sign', x: 11.5, y: 37.4, text: 'Halb zerfallene Tafel: ...RITTERBURG... hier stand mal etwas Grosses.' },
        /* Das Dickicht */
        { kind: 'sign', x: 40.5, y: 12.4, text: 'Grob geschnitzt: DICKICHT. WER NACHTS REINGEHT, KOMMT NICHT RAUS.' },
        { kind: 'rock', x: 45.5, y: 14.5 },
        { kind: 'rock', x: 52.5, y: 9.5 },
        /* Am See */
        { kind: 'bench', x: 45.5, y: 31.5 },
        { kind: 'fire', x: 43.5, y: 30.5 }
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
    var W = 56, H = 40, r = rng(31415);
    var g = grid(W, H, 'S');
    var x, y, i;

    /* Alles Gehweg, dann Strassen einzeichnen */
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        if (y >= 17 && y <= 21) g[y][x] = (y === 19 ? 'M' : 'R');     /* Hauptstrasse */
        if (x >= 25 && x <= 29) g[y][x] = (x === 27 && !(y >= 17 && y <= 21) ? 'M' : 'R');
      }
    }
    /* Zweite Querstrasse oben: die Ladenstrasse */
    for (y = 8; y <= 10; y++) for (x = 0; x < W; x++) g[y][x] = (y === 9 ? 'M' : 'R');

    function block(x0, y0, w, h, kinds) {
      for (var yy = y0; yy < y0 + h; yy++) {
        for (var xx = x0; xx < x0 + w; xx++) {
          if (!g[yy] || g[yy][xx] === undefined) continue;
          var bi = Math.floor((xx - x0) / 4) + Math.floor((yy - y0) / 3) * 2;
          g[yy][xx] = kinds[bi % kinds.length];
        }
      }
    }
    block(2, 2, 20, 5, ['B', 'B', 'C', 'V']);
    block(32, 2, 20, 5, ['V', 'C', 'B', 'B']);
    block(2, 12, 20, 4, ['C', 'B', 'V', 'C']);
    block(32, 12, 20, 4, ['B', 'V', 'C', 'B']);
    block(2, 29, 18, 8, ['C', 'B', 'V', 'C']);
    block(38, 29, 15, 8, ['B', 'V', 'C', 'B']);

    /* --- Die Ladenzeile: lauter Laeden nebeneinander --- */
    for (x = 3; x < 22; x++) g[11][x] = 'K';
    for (x = 33; x < 52; x++) g[11][x] = 'K';
    for (x = 4; x < 21; x++) g[7][x] = 'K';
    for (x = 34; x < 51; x++) g[7][x] = 'K';
    /* Ladenzeile am Marktplatz */
    for (x = 4; x < 19; x++) g[28][x] = 'K';
    for (x = 39; x < 52; x++) g[28][x] = 'K';

    /* --- Der Marktplatz: gepflastert, mit Brunnen --- */
    rect(g, 20, 23, 16, 13, 'S');
    rect(g, 22, 25, 12, 9, '.');
    for (y = 25; y < 34; y++) for (x = 22; x < 34; x++) if (r() > 0.75) g[y][x] = ',';

    /* Raender: aussen Gebaeude */
    for (y = 0; y < H; y++) { g[y][0] = 'B'; g[y][1] = 'B'; g[y][W - 1] = 'B'; g[y][W - 2] = 'B'; }
    for (x = 0; x < W; x++) { g[0][x] = 'B'; g[1][x] = 'B'; g[H - 1][x] = 'B'; g[H - 2][x] = 'B'; }
    /* Strassen bis zum Rand offen lassen */
    for (x = 0; x < W; x++) {
      if (x < 2 || x > W - 3) { g[18][x] = 'R'; g[19][x] = 'M'; g[20][x] = 'R'; }
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
      { kind: 'sign', x: 23.5, y: 16.6, text: 'Am Stadttor: "EICHENSTADT - 412 Einwohner, 3 Baecker, 0 Zombies. Bitte Schwert stecken lassen!"' },
      { kind: 'car', x: 31.5, y: 24.5 },
      /* Marktplatz */
      { kind: 'fountain', x: 27.9, y: 29.5 },
      { kind: 'bench', x: 23.5, y: 32.6 },
      { kind: 'bench', x: 32.3, y: 32.6 },
      { kind: 'bench', x: 23.5, y: 26.6 },
      { kind: 'bench', x: 32.3, y: 26.6 },
      { kind: 'tree', x: 22.5, y: 27.2 },
      { kind: 'tree', x: 33.5, y: 27.2 },
      { kind: 'tree', x: 22.5, y: 33.2 },
      { kind: 'tree', x: 33.5, y: 33.2 },
      { kind: 'fire', x: 30.5, y: 33.5 },
      { kind: 'barrel', x: 21.5, y: 30.5 },
      { kind: 'barrel', x: 21.5, y: 31.5 },
      { kind: 'barrel', x: 34.5, y: 30.5 },
      /* Laternen an beiden Strassen */
      { kind: 'lamp', x: 12.5, y: 12.6 }, { kind: 'lamp', x: 20.5, y: 12.6 },
      { kind: 'lamp', x: 34.5, y: 12.6 }, { kind: 'lamp', x: 44.5, y: 12.6 },
      { kind: 'lamp', x: 12.5, y: 16.6 }, { kind: 'lamp', x: 20.5, y: 16.6 },
      { kind: 'lamp', x: 34.5, y: 16.6 }, { kind: 'lamp', x: 44.5, y: 16.6 },
      { kind: 'lamp', x: 23.5, y: 22.6 }, { kind: 'lamp', x: 32.5, y: 22.6 },
      { kind: 'lamp', x: 23.5, y: 35.6 }, { kind: 'lamp', x: 32.5, y: 35.6 }
    ];

    return {
      key: 'stadt',
      name: 'Eichenstadt',
      rows: toStrings(g),
      music: 'stadt',
      spawn: { x: 31.5, y: 26 },
      zombies: false,
      triggers: [],
      props: props,
      /* Die Auftragstafel am Brunnen - hier holt man sich Arbeit */
      tafel: { x: 25.5, y: 27.6 },
      wanderSpots: [
        { x: 12, y: 19, wer: 'buerger' },
        { x: 38, y: 13, wer: 'buerger5' },
        { x: 18, y: 13, wer: 'buerger2' },
        { x: 44, y: 19, wer: 'buerger3' },
        { x: 30, y: 35, wer: 'buerger6' },
        { x: 8, y: 13, wer: 'buerger4' },
        { x: 47, y: 25, wer: 'buerger' },
        { x: 14, y: 26, wer: 'buerger2' },
        { x: 36, y: 19, wer: 'buerger6' },
        { x: 24, y: 19, wer: 'buerger3' },
        { x: 5, y: 19, wer: 'buerger4' },
        { x: 49, y: 13, wer: 'buerger5' },
        { x: 25, y: 31, wer: 'buerger' },
        { x: 34, y: 31, wer: 'buerger2' },
        { x: 16, y: 34, wer: 'buerger3' },
        { x: 42, y: 34, wer: 'buerger6' },
        { x: 9, y: 25, wer: 'buerger5' },
        { x: 46, y: 31, wer: 'buerger4' }
      ],
      /* Sechs Laeden, jeder mit eigenem Stand */
      haendler: { x: 27.9, y: 12.9 },
      laeden: [
        { wer: 'schmied', x: 13.5, y: 12.9, stand: true },
        { wer: 'alchi', x: 40.5, y: 12.9, stand: true },
        { wer: 'meister', x: 19.5, y: 29.9, stand: true },
        { wer: 'baecker', x: 8.5, y: 12.9, stand: true },
        { wer: 'juwel', x: 47.5, y: 12.9, stand: true }
      ]
    };
  }

  global.MAPS = {
    SOLID: SOLID,
    wald: buildWald,
    haus: buildHaus,
    stadt: buildStadt
  };
})(window);
