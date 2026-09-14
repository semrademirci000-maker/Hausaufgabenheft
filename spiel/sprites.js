/* sprites.js – alle Pixel-Grafiken werden hier im Speicher gemalt.
   Kein einziges Bild wird geladen: alles ist Pixel für Pixel im Code. */
(function (global) {
  'use strict';

  var warnings = [];

  function mk(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return c;
  }

  /* Baut ein Sprite aus Textzeilen. '.' = durchsichtig. */
  function sprite(rows, pal) {
    var w = 0, y, x;
    for (y = 0; y < rows.length; y++) w = Math.max(w, rows[y].length);
    var c = mk(w, rows.length), g = c.getContext('2d');
    for (y = 0; y < rows.length; y++) {
      if (rows[y].length !== w && rows[y].length !== 0) {
        warnings.push('Zeile ' + y + ': ' + rows[y].length + ' statt ' + w + ' Pixel');
      }
      for (x = 0; x < rows[y].length; x++) {
        var ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        var col = pal[ch];
        if (!col) { warnings.push('Farbe "' + ch + '" fehlt'); continue; }
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function flipX(src) {
    var c = mk(src.width, src.height), g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  }

  /* kleiner, immer gleicher Zufall – damit Gras jedes Mal gleich aussieht */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function blob(g, cx, cy, r, col) {
    g.fillStyle = col;
    for (var y = -r; y <= r; y++) {
      for (var x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) g.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }

  /* =========================================================
     RITTER  (16x16, Schwert wird separat gemalt)
     ========================================================= */
  var KP = {
    o: '#191324', a: '#d3dbe8', b: '#9aa4b8', c: '#646e82',
    t: '#3d6fb5', u: '#2b4f83', s: '#f0c191', r: '#d2453f',
    k: '#140f1e', n: '#6b4a2b'
  };

  var knightDown = [
    '................',
    '......orro......',
    '.....orrrro.....',
    '....oaaaaaao....',
    '...oaaaaaaaao...',
    '...oabbbbbbao...',
    '...oakkkkkkao...',
    '...oabssssbao...',
    '....oaaaaaao....',
    '...octtttttco...',
    '..socttttttcos..',
    '...otttttttto...',
    '...ouuuuuuuuo...',
    '...ouuuuuuuuo...',
    '...occo..occo...',
    '...onno..onno...'
  ];
  var knightDown2 = knightDown.slice(0, 14).concat([
    '...occcccccco...',
    '....onnnnnno....'
  ]);

  var knightUp = [
    '................',
    '......orro......',
    '.....orrrro.....',
    '....oaaaaaao....',
    '...oaaaaaaaao...',
    '...oabbbbbbao...',
    '...oabbbbbbao...',
    '...oabbbbbbao...',
    '....oaaaaaao....',
    '...octtttttco...',
    '..socttttttcos..',
    '...otttttttto...',
    '...ouuuuuuuuo...',
    '...ouuuuuuuuo...',
    '...occo..occo...',
    '...onno..onno...'
  ];
  var knightUp2 = knightUp.slice(0, 14).concat([
    '...occcccccco...',
    '....onnnnnno....'
  ]);

  var knightSide = [
    '................',
    '.....orro.......',
    '....orrrro......',
    '....oaaaaao.....',
    '...oaaaaaaao....',
    '...oabbbbkko....',
    '...oabbbbsko....',
    '...oabbbbbbo....',
    '....oaaaaao.....',
    '...octtttco.....',
    '...ottttttos....',
    '...otttttto.....',
    '....ouuuuuo.....',
    '....ouuuuuo.....',
    '....occ.cco.....',
    '....onn.nno.....'
  ];
  var knightSide2 = knightSide.slice(0, 14).concat([
    '....occccco.....',
    '.....onnno......'
  ]);

  var SWORD = sprite([
    '..w..',
    '..w..',
    '.www.',
    '.wgw.',
    '.wgw.',
    '.wgw.',
    '.wgw.',
    '.wgw.',
    '.wgw.',
    'hhhhh',
    '..n..',
    '..n..',
    '..n..',
    '..h..'
  ], { w: '#eef3fb', g: '#aab6c8', h: '#d8a43a', n: '#6b4a2b' });

  /* =========================================================
     MENSCHEN (Familie, Freunde, Stadtleute) – eine Vorlage,
     die je Person andere Farben bekommt.
     ========================================================= */
  var personDown = [
    '................',
    '....oooooooo....',
    '...oHHHHHHHHo...',
    '...oHHHHHHHHo...',
    '...oSSSSSSSSo...',
    '...oSEESSEESo...',
    '...oSSSSSSSSo...',
    '....oSSSSSSo....',
    '...oCCCCCCCCo...',
    '..oSCCCCCCCCSo..',
    '..oSCCCCCCCCSo..',
    '...oCCCCCCCCo...',
    '...occcccccco...',
    '...oPPPPPPPPo...',
    '...oPPo..oPPo...',
    '...oBBo..oBBo...'
  ];
  var personDown2 = personDown.slice(0, 13).concat([
    '...oPPPPPPPPo...',
    '...oPPPPPPPPo...',
    '....oBBBBBBo....'
  ]);
  var personUp = [
    '................',
    '....oooooooo....',
    '...oHHHHHHHHo...',
    '...oHHHHHHHHo...',
    '...oHHHHHHHHo...',
    '...oHHHHHHHHo...',
    '...oHHHHHHHHo...',
    '....oHHHHHHo....',
    '...oCCCCCCCCo...',
    '..oSCCCCCCCCSo..',
    '..oSCCCCCCCCSo..',
    '...oCCCCCCCCo...',
    '...occcccccco...',
    '...oPPPPPPPPo...',
    '...oPPo..oPPo...',
    '...oBBo..oBBo...'
  ];
  var personUp2 = personUp.slice(0, 13).concat([
    '...oPPPPPPPPo...',
    '...oPPPPPPPPo...',
    '....oBBBBBBo....'
  ]);
  var personSide = [
    '................',
    '....oooooooo....',
    '...oHHHHHHHHo...',
    '...oHHHHHHHHo...',
    '...oHHHSSSSSo...',
    '...oHHHSSEESo...',
    '...oHHHSSSSSo...',
    '....oSSSSSSo....',
    '...oCCCCCCCCo...',
    '...oCCCCCCCCoS..',
    '...oCCCCCCCCoS..',
    '...oCCCCCCCCo...',
    '...occcccccco...',
    '...oPPPPPPPPo...',
    '...oPPo..oPPo...',
    '...oBBo..oBBo...'
  ];
  var personSide2 = personSide.slice(0, 13).concat([
    '...oPPPPPPPPo...',
    '...oPPPPPPPPo...',
    '....oBBBBBBo....'
  ]);

  var zombieDown = [
    '................',
    '....oooooooo....',
    '...oHHHHHHHHo...',
    '...oHSSSSSSHo...',
    '...oSSSSSSSSo...',
    '...oSEESSEESo...',
    '...oSSSSSSSSo...',
    '....oSkkkkSo....',
    '...oCCCCCCCCo...',
    '.oSSCCCCCCCCSSo.',
    '.oSSCCCCCCCCSSo.',
    '...oCCCCCCCCo...',
    '...occcccccco...',
    '...oPPPPPPPPo...',
    '...oPPo..oPPo...',
    '...oBBo..oBBo...'
  ];
  var zombieDown2 = zombieDown.slice(0, 13).concat([
    '...oPPPPPPPPo...',
    '...oPPPPPPPPo...',
    '....oBBBBBBo....'
  ]);
  var zombieSide = [
    '................',
    '....oooooooo....',
    '...oHHHHHHHHo...',
    '...oHHHSSSSSo...',
    '...oHHSSSSSSo...',
    '...oHHSSSEESo...',
    '...oHHSSSSSSo...',
    '....oSSkkkSo....',
    '...oCCCCCCCCo...',
    '...oCCCCCCCCoSS.',
    '...oCCCCCCCCoSS.',
    '...oCCCCCCCCo...',
    '...occcccccco...',
    '...oPPPPPPPPo...',
    '...oPPo..oPPo...',
    '...oBBo..oBBo...'
  ];
  var zombieSide2 = zombieSide.slice(0, 13).concat([
    '...oPPPPPPPPo...',
    '...oPPPPPPPPo...',
    '....oBBBBBBo....'
  ]);

  /* Baut alle Laufbilder einer Person aus einer Farbpalette. */
  function buildActor(pal, style) {
    var base = {
      o: '#191324', E: pal.eye || '#1b1430', S: pal.skin || '#f0c191',
      H: pal.hair || '#6b4a2b', C: pal.shirt || '#c4553f',
      c: pal.shirtDark || '#9c3f2f', P: pal.pants || '#3b4a6b',
      B: pal.boots || '#4a3524', k: '#2a1420'
    };
    var D1, D2, U1, U2, S1, S2;
    if (style === 'zombie') {
      D1 = zombieDown; D2 = zombieDown2;
      U1 = personUp;   U2 = personUp2;
      S1 = zombieSide; S2 = zombieSide2;
    } else {
      D1 = personDown; D2 = personDown2;
      U1 = personUp;   U2 = personUp2;
      S1 = personSide; S2 = personSide2;
    }
    var right = [sprite(S1, base), sprite(S2, base)];
    return {
      down:  [sprite(D1, base), sprite(D2, base)],
      up:    [sprite(U1, base), sprite(U2, base)],
      right: right,
      left:  [flipX(right[0]), flipX(right[1])]
    };
  }

  var knightRight = [sprite(knightSide, KP), sprite(knightSide2, KP)];
  var KNIGHT = {
    down:  [sprite(knightDown, KP), sprite(knightDown2, KP)],
    up:    [sprite(knightUp, KP), sprite(knightUp2, KP)],
    right: knightRight,
    left:  [flipX(knightRight[0]), flipX(knightRight[1])]
  };

  /* =========================================================
     Bäume, Büsche, Steine, Laterne, Schild, Auto, Herz
     ========================================================= */
  function makeTree() {
    var c = mk(30, 38), g = c.getContext('2d'), r = rng(7);
    g.fillStyle = '#3d2a18'; g.fillRect(12, 22, 7, 15);
    g.fillStyle = '#5f4026'; g.fillRect(13, 22, 4, 15);
    g.fillStyle = '#78542f'; g.fillRect(14, 24, 1, 11);
    blob(g, 15, 18, 13, '#1f4a26');
    blob(g, 13, 14, 12, '#2d6a33');
    blob(g, 18, 13, 10, '#3c8440');
    blob(g, 12, 10, 7, '#4f9c4c');
    for (var i = 0; i < 26; i++) {
      g.fillStyle = r() > 0.5 ? '#1f4a26' : '#58a552';
      g.fillRect(3 + ((r() * 24) | 0), 3 + ((r() * 24) | 0), 1, 1);
    }
    return c;
  }
  function makePine() {
    var c = mk(26, 38), g = c.getContext('2d');
    g.fillStyle = '#3d2a18'; g.fillRect(11, 28, 5, 9);
    for (var i = 0; i < 4; i++) {
      var w = 20 - i * 3, y = 26 - i * 7;
      g.fillStyle = '#1d4526';
      g.fillRect(13 - w / 2, y, w, 7);
      g.fillStyle = '#2f6b34';
      g.fillRect(13 - w / 2 + 1, y, w - 2, 5);
      g.fillStyle = '#3f8a41';
      g.fillRect(13 - w / 2 + 2, y, w - 5, 2);
    }
    return c;
  }
  function makeBush() {
    var c = mk(18, 16), g = c.getContext('2d'), r = rng(21);
    blob(g, 6, 9, 6, '#24582a');
    blob(g, 12, 9, 6, '#24582a');
    blob(g, 6, 8, 5, '#357a39');
    blob(g, 12, 8, 5, '#357a39');
    blob(g, 8, 6, 3, '#4b9b4a');
    for (var i = 0; i < 8; i++) {
      g.fillStyle = '#d24b4b';
      if (r() > 0.5) g.fillRect(2 + ((r() * 14) | 0), 3 + ((r() * 9) | 0), 1, 1);
    }
    return c;
  }
  function makeRock() {
    var c = mk(16, 14), g = c.getContext('2d');
    blob(g, 8, 9, 6, '#5b606b');
    blob(g, 7, 8, 5, '#7d838f');
    blob(g, 6, 7, 3, '#9aa1ac');
    return c;
  }
  function makeLamp() {
    var c = mk(10, 34), g = c.getContext('2d');
    g.fillStyle = '#2a2a33'; g.fillRect(4, 6, 3, 27);
    g.fillRect(2, 31, 7, 3);
    g.fillStyle = '#4a4a58'; g.fillRect(5, 8, 1, 23);
    g.fillStyle = '#2a2a33'; g.fillRect(2, 2, 7, 6);
    g.fillStyle = '#ffe08a'; g.fillRect(3, 3, 5, 4);
    g.fillStyle = '#fff6cf'; g.fillRect(4, 4, 3, 2);
    return c;
  }
  /* Das Stadt-Schild: ein Pixel-Blatt Papier auf zwei Pfosten */
  function makeSign() {
    var c = mk(26, 30), g = c.getContext('2d');
    g.fillStyle = '#5b3d22'; g.fillRect(3, 16, 3, 14); g.fillRect(20, 16, 3, 14);
    g.fillStyle = '#efe6cf'; g.fillRect(1, 2, 24, 16);
    g.fillStyle = '#cdc2a6'; g.fillRect(1, 2, 24, 1); g.fillRect(1, 17, 24, 1);
    g.fillStyle = '#7a6a4a';
    g.fillRect(1, 2, 1, 16); g.fillRect(24, 2, 1, 16);
    g.fillStyle = '#3a3020';
    var lines = [[4, 6, 18], [4, 9, 14], [4, 12, 17]];
    for (var i = 0; i < lines.length; i++) {
      for (var x = 0; x < lines[i][2]; x += 2) g.fillRect(lines[i][0] + x, lines[i][1], 1, 1);
    }
    return c;
  }
  function makeCar() {
    var c = mk(40, 24), g = c.getContext('2d');
    g.fillStyle = '#191324'; g.fillRect(1, 6, 38, 13);
    g.fillStyle = '#b8342f'; g.fillRect(2, 9, 36, 9);
    g.fillStyle = '#d9534a'; g.fillRect(2, 9, 36, 3);
    g.fillStyle = '#8c231f'; g.fillRect(2, 16, 36, 2);
    g.fillStyle = '#191324'; g.fillRect(8, 2, 22, 8);
    g.fillStyle = '#9fd6ec'; g.fillRect(10, 4, 8, 5); g.fillRect(20, 4, 8, 5);
    g.fillStyle = '#d8f0fb'; g.fillRect(10, 4, 8, 2); g.fillRect(20, 4, 8, 2);
    g.fillStyle = '#ffe08a'; g.fillRect(37, 11, 2, 3);
    g.fillStyle = '#ff6b5a'; g.fillRect(1, 11, 2, 3);
    g.fillStyle = '#191324';
    g.fillRect(5, 17, 10, 6); g.fillRect(25, 17, 10, 6);
    g.fillStyle = '#3b3b46'; g.fillRect(7, 18, 6, 4); g.fillRect(27, 18, 6, 4);
    g.fillStyle = '#8a8a98'; g.fillRect(9, 19, 2, 2); g.fillRect(29, 19, 2, 2);
    return c;
  }
  function makeHeart() {
    return sprite([
      '.rr.rr.',
      'rrrrrrr',
      'rrrrrrr',
      '.rrrrr.',
      '..rrr..',
      '...r...'
    ], { r: '#e03a3a' });
  }


  /* ---- Bosse ---------------------------------------------------- */

  /* Waldspinne: dicker Leib, acht Beine, rote Augen */
  function makeSpider(step) {
    var c = mk(30, 22), g = c.getContext('2d');
    var beinFarbe = '#241a2e', hoch = step ? 1 : 0;
    var beine = [
      [11, 12, 2, 6], [11, 13, 5, 9], [19, 12, 28, 6], [19, 13, 25, 9]
    ];
    for (var i = 0; i < beine.length; i++) {
      var b = beine[i];
      var x0 = b[0], y0 = b[1] + (i % 2 ? hoch : -hoch);
      var x1 = b[2], y1 = b[3] + (i % 2 ? -hoch : hoch);
      // grobe Pixel-Linie
      var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (var t = 0; t <= n; t++) {
        var x = Math.round(x0 + (x1 - x0) * t / n);
        var y = Math.round(y0 + (y1 - y0) * t / n);
        g.fillStyle = beinFarbe;
        g.fillRect(x, y, 2, 2);
      }
    }
    blob(g, 15, 14, 7, '#2e2140');
    blob(g, 15, 13, 6, '#3f2c57');
    blob(g, 15, 8, 5, '#241a2e');
    blob(g, 15, 7, 4, '#4a3568');
    g.fillStyle = '#d24b4b';
    g.fillRect(12, 6, 2, 2); g.fillRect(17, 6, 2, 2);
    g.fillStyle = '#ff9a8a';
    g.fillRect(12, 6, 1, 1); g.fillRect(17, 6, 1, 1);
    g.fillStyle = '#6b4f8a';
    g.fillRect(13, 12, 4, 2); g.fillRect(14, 16, 3, 2);
    return c;
  }

  /* Krone für den Zombiekönig */
  function makeCrown() {
    var c = mk(12, 7), g = c.getContext('2d');
    g.fillStyle = '#8a6a1a';
    g.fillRect(0, 4, 12, 3);
    g.fillStyle = '#ffd24a';
    g.fillRect(0, 3, 12, 2);
    g.fillRect(0, 0, 2, 4); g.fillRect(5, 0, 2, 4); g.fillRect(10, 0, 2, 4);
    g.fillStyle = '#fff0b4';
    g.fillRect(0, 0, 1, 2); g.fillRect(5, 0, 1, 2); g.fillRect(10, 0, 1, 2);
    g.fillStyle = '#d24b4b';
    g.fillRect(5, 4, 2, 2);
    return c;
  }

  /* Spitze Ohren für den Werwolf */
  function withEars(src, color) {
    var c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.fillStyle = color;
    g.fillRect(3, 0, 3, 3); g.fillRect(4, 0, 2, 4);
    g.fillRect(10, 0, 3, 3); g.fillRect(10, 0, 2, 4);
    g.fillStyle = '#1b1524';
    g.fillRect(3, 0, 1, 3); g.fillRect(12, 0, 1, 3);
    return c;
  }

  /* Baumgeist: ein Baum, der Augen aufmacht */
  function makeTreant() {
    var c = mk(34, 42), g = c.getContext('2d'), r = rng(99);
    g.fillStyle = '#3d2a18'; g.fillRect(13, 22, 9, 19);
    g.fillStyle = '#5f4026'; g.fillRect(14, 22, 6, 19);
    g.fillStyle = '#3d2a18';
    g.fillRect(6, 30, 8, 3); g.fillRect(21, 32, 8, 3);
    blob(g, 17, 17, 14, '#1d3a22');
    blob(g, 14, 13, 12, '#28572f');
    blob(g, 21, 12, 10, '#35703a');
    for (var i = 0; i < 20; i++) {
      g.fillStyle = r() > 0.5 ? '#16301c' : '#47934a';
      g.fillRect(4 + ((r() * 26) | 0), 3 + ((r() * 24) | 0), 1, 1);
    }
    /* Gesicht im Stamm */
    g.fillStyle = '#1b1008'; g.fillRect(14, 26, 7, 8);
    g.fillStyle = '#ffd24a'; g.fillRect(14, 27, 2, 3); g.fillRect(19, 27, 2, 3);
    g.fillStyle = '#fff0b4'; g.fillRect(14, 27, 1, 1); g.fillRect(19, 27, 1, 1);
    g.fillStyle = '#2a1a10'; g.fillRect(15, 31, 5, 2);
    return c;
  }

  /* =========================================================
     KACHELN (16x16) – Wald, Haus, Stadt
     ========================================================= */
  var T = 16;
  function tileCanvas() { return mk(T, T); }

  function grassTile(seed, tuft, flower) {
    var c = tileCanvas(), g = c.getContext('2d'), r = rng(seed);
    g.fillStyle = '#4b8f46'; g.fillRect(0, 0, T, T);
    var i;
    for (i = 0; i < 26; i++) g.fillStyle = '#437f3f', g.fillRect((r() * T) | 0, (r() * T) | 0, 1, 1);
    for (i = 0; i < 10; i++) g.fillStyle = '#57a24f', g.fillRect((r() * T) | 0, (r() * T) | 0, 1, 2);
    if (tuft) {
      for (i = 0; i < 5; i++) {
        var x = 3 + ((r() * 10) | 0), y = 4 + ((r() * 9) | 0);
        g.fillStyle = '#2f6b34'; g.fillRect(x, y, 1, 3);
        g.fillStyle = '#63b158'; g.fillRect(x + 1, y + 1, 1, 2);
      }
    }
    if (flower) {
      var fc = ['#f0d24a', '#e8718a', '#e8e2f0'];
      for (i = 0; i < 4; i++) {
        var fx = 2 + ((r() * 12) | 0), fy = 2 + ((r() * 12) | 0);
        g.fillStyle = fc[(r() * 3) | 0];
        g.fillRect(fx, fy, 2, 2);
        g.fillStyle = '#2f6b34'; g.fillRect(fx, fy + 2, 1, 2);
      }
    }
    return c;
  }
  function pathTile(seed) {
    var c = tileCanvas(), g = c.getContext('2d'), r = rng(seed);
    g.fillStyle = '#b08a58'; g.fillRect(0, 0, T, T);
    for (var i = 0; i < 30; i++) {
      g.fillStyle = r() > 0.5 ? '#9c7647' : '#c6a06a';
      g.fillRect((r() * T) | 0, (r() * T) | 0, 1 + ((r() * 2) | 0), 1);
    }
    for (i = 0; i < 3; i++) {
      g.fillStyle = '#8a6840';
      g.fillRect((r() * 13) | 0, (r() * 13) | 0, 2, 2);
    }
    return c;
  }
  function waterTile(seed) {
    var c = tileCanvas(), g = c.getContext('2d'), r = rng(seed);
    g.fillStyle = '#2f5f9c'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#3d78bd'; g.fillRect(0, 0, T, 8);
    for (var i = 0; i < 5; i++) {
      g.fillStyle = '#7fb6e2';
      g.fillRect((r() * 11) | 0, (r() * 15) | 0, 4, 1);
    }
    return c;
  }
  function plankTile(base, dark, light, vertical) {
    var c = tileCanvas(), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, T, T);
    for (var i = 0; i < T; i += 4) {
      g.fillStyle = dark;
      if (vertical) g.fillRect(i, 0, 1, T); else g.fillRect(0, i, T, 1);
      g.fillStyle = light;
      if (vertical) g.fillRect(i + 1, 0, 1, T); else g.fillRect(0, i + 1, T, 1);
    }
    g.fillStyle = dark;
    if (vertical) g.fillRect(0, 7, T, 1); else g.fillRect(7, 0, 1, T);
    return c;
  }
  function roofTile() {
    var c = tileCanvas(), g = c.getContext('2d');
    g.fillStyle = '#7a3327'; g.fillRect(0, 0, T, T);
    for (var y = 0; y < T; y += 5) {
      for (var x = (y % 10 === 0 ? 0 : -4); x < T; x += 8) {
        g.fillStyle = '#93413020'; // wird unten überschrieben
        g.fillStyle = '#944333';
        g.fillRect(x + 1, y, 6, 4);
        g.fillStyle = '#5e2419';
        g.fillRect(x, y + 4, 8, 1);
      }
    }
    return c;
  }
  function windowTile() {
    var c = plankTile('#a9743f', '#8a5c31', '#bd8a52', false), g = c.getContext('2d');
    g.fillStyle = '#4a3018'; g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#8fd3ea'; g.fillRect(3, 3, 10, 10);
    g.fillStyle = '#c6ecf8'; g.fillRect(3, 3, 10, 4);
    g.fillStyle = '#4a3018'; g.fillRect(7, 2, 2, 12); g.fillRect(2, 7, 12, 2);
    return c;
  }
  function doorTile(side) {
    var c = plankTile('#a9743f', '#8a5c31', '#bd8a52', false), g = c.getContext('2d');
    g.fillStyle = '#4a3018'; g.fillRect(side === 'l' ? 2 : 0, 1, 14, 15);
    g.fillStyle = '#6b4a2b'; g.fillRect(side === 'l' ? 3 : 0, 2, 13, 14);
    g.fillStyle = '#5b3d22';
    for (var x = 0; x < T; x += 4) g.fillRect(x, 2, 1, 14);
    if (side === 'r') { g.fillStyle = '#ffd24a'; g.fillRect(2, 8, 2, 2); }
    return c;
  }
  function floorTile(seed) {
    var c = tileCanvas(), g = c.getContext('2d'), r = rng(seed);
    g.fillStyle = '#c09263'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#a87f4d';
    g.fillRect(0, 7, T, 1); g.fillRect(0, 15, T, 1);
    g.fillStyle = '#d2a978'; g.fillRect(0, 0, T, 1); g.fillRect(0, 8, T, 1);
    for (var i = 0; i < 10; i++) {
      g.fillStyle = i % 2 ? '#b58a58' : '#c9a074';
      g.fillRect((r() * 13) | 0, (r() * T) | 0, 3, 1);
    }
    return c;
  }
  function carpetTile() {
    var c = floorTile(3), g = c.getContext('2d');
    g.fillStyle = '#8a3f5a'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#a9536e'; g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#d9a05a'; g.fillRect(5, 5, 6, 6);
    g.fillStyle = '#8a3f5a'; g.fillRect(7, 7, 2, 2);
    return c;
  }
  function wallTile() {
    var c = plankTile('#8a5c31', '#6e4826', '#9c6b3a', false), g = c.getContext('2d');
    g.fillStyle = '#5b3d22'; g.fillRect(0, 0, T, 2);
    return c;
  }
  function bedTile(part) {
    var c = floorTile(5), g = c.getContext('2d');
    g.fillStyle = '#6b4a2b'; g.fillRect(1, 0, 14, 16);
    if (part === 'top') {
      g.fillStyle = '#e8e2f0'; g.fillRect(2, 2, 12, 6);
      g.fillStyle = '#c9c2d8'; g.fillRect(2, 7, 12, 1);
      g.fillStyle = '#4f7fc4'; g.fillRect(2, 9, 12, 7);
    } else {
      g.fillStyle = '#4f7fc4'; g.fillRect(2, 0, 12, 13);
      g.fillStyle = '#3d68a8'; g.fillRect(2, 6, 12, 1);
      g.fillStyle = '#6b4a2b'; g.fillRect(1, 13, 14, 3);
    }
    return c;
  }
  function tableTile() {
    var c = floorTile(9), g = c.getContext('2d');
    g.fillStyle = '#7a5327'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#a06f38'; g.fillRect(0, 0, 16, 12);
    g.fillStyle = '#c08a52'; g.fillRect(0, 0, 16, 3);
    g.fillStyle = '#8a5c31'; g.fillRect(0, 7, 16, 1);
    return c;
  }
  function chairTile() {
    var c = floorTile(11), g = c.getContext('2d');
    g.fillStyle = '#6b4a2b'; g.fillRect(4, 3, 9, 10);
    g.fillStyle = '#8a6238'; g.fillRect(5, 4, 7, 5);
    g.fillStyle = '#5b3d22'; g.fillRect(4, 12, 2, 3); g.fillRect(11, 12, 2, 3);
    return c;
  }
  function fireTile() {
    var c = wallTile(), g = c.getContext('2d');
    g.fillStyle = '#6b6b76'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#8a8a96';
    for (var y = 0; y < T; y += 4) for (var x = (y % 8 ? 0 : 4); x < T; x += 8) g.fillRect(x, y, 7, 3);
    g.fillStyle = '#1a1420'; g.fillRect(3, 6, 10, 10);
    g.fillStyle = '#d2451f'; g.fillRect(5, 10, 6, 6);
    g.fillStyle = '#f08a2a'; g.fillRect(6, 11, 4, 5);
    g.fillStyle = '#ffd24a'; g.fillRect(7, 13, 2, 3);
    return c;
  }
  function roadTile(line) {
    var c = tileCanvas(), g = c.getContext('2d'), r = rng(line ? 33 : 31);
    g.fillStyle = '#434350'; g.fillRect(0, 0, T, T);
    for (var i = 0; i < 20; i++) {
      g.fillStyle = r() > 0.5 ? '#3b3b46' : '#4f4f5c';
      g.fillRect((r() * T) | 0, (r() * T) | 0, 1, 1);
    }
    if (line) { g.fillStyle = '#d8cf8a'; g.fillRect(7, 3, 2, 10); }
    return c;
  }
  function walkTile() {
    var c = tileCanvas(), g = c.getContext('2d');
    g.fillStyle = '#b0a89c'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#c2bab0'; g.fillRect(0, 0, T, 1); g.fillRect(0, 0, 1, T);
    g.fillStyle = '#98907f'; g.fillRect(0, 15, T, 1); g.fillRect(15, 0, 1, T);
    g.fillStyle = '#a79f92'; g.fillRect(3, 5, 2, 1); g.fillRect(9, 11, 3, 1);
    return c;
  }
  function buildingTile(kind) {
    var c = tileCanvas(), g = c.getContext('2d');
    var body = kind === 1 ? '#6a6478' : (kind === 2 ? '#7a5a52' : '#59657a');
    var trim = kind === 1 ? '#565064' : (kind === 2 ? '#644841' : '#465268');
    g.fillStyle = body; g.fillRect(0, 0, T, T);
    g.fillStyle = trim; g.fillRect(0, 0, T, 1); g.fillRect(0, 15, T, 1);
    g.fillStyle = '#2a2633'; g.fillRect(2, 4, 5, 7); g.fillRect(9, 4, 5, 7);
    g.fillStyle = '#ffd98a'; g.fillRect(3, 5, 3, 5);
    g.fillStyle = '#8fb6d8'; g.fillRect(10, 5, 3, 5);
    return c;
  }
  function shopTile() {
    var c = tileCanvas(), g = c.getContext('2d');
    g.fillStyle = '#7a5a52'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#2a2633'; g.fillRect(1, 3, 14, 13);
    g.fillStyle = '#ffd98a'; g.fillRect(2, 4, 12, 8);
    g.fillStyle = '#c85a4a';
    for (var x = 0; x < T; x += 4) g.fillRect(x, 0, 2, 3);
    g.fillStyle = '#e8e2f0'; g.fillRect(2, 0, 2, 3); g.fillRect(10, 0, 2, 3);
    return c;
  }


  function flatRoofTile() {
    var c = tileCanvas(), g = c.getContext('2d');
    g.fillStyle = '#4e4a58'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#5a5666'; g.fillRect(0, 0, T, 1); g.fillRect(0, 0, 1, T);
    g.fillStyle = '#3f3b49'; g.fillRect(0, 15, T, 1); g.fillRect(15, 0, 1, T);
    g.fillStyle = '#565262'; g.fillRect(3, 4, 10, 8);
    g.fillStyle = '#46424f'; g.fillRect(5, 6, 6, 4);
    return c;
  }
  function tiledRoofTile() {
    var c = tileCanvas(), g = c.getContext('2d');
    g.fillStyle = '#6e3b2e'; g.fillRect(0, 0, T, T);
    for (var y = 0; y < T; y += 4) {
      for (var x = (y % 8 === 0 ? 0 : -3); x < T; x += 6) {
        g.fillStyle = '#804638'; g.fillRect(x + 1, y, 4, 3);
        g.fillStyle = '#552a20'; g.fillRect(x, y + 3, 6, 1);
      }
    }
    return c;
  }
  function makeFountain() {
    var c = mk(32, 28), g = c.getContext('2d');
    g.fillStyle = '#6e6a76'; g.fillRect(2, 8, 28, 18);
    g.fillStyle = '#8a8694'; g.fillRect(2, 8, 28, 3);
    g.fillStyle = '#4f7fc4'; g.fillRect(5, 11, 22, 12);
    g.fillStyle = '#7fb6e2'; g.fillRect(6, 12, 20, 4);
    g.fillStyle = '#8a8694'; g.fillRect(13, 2, 6, 12);
    g.fillStyle = '#a9a5b2'; g.fillRect(14, 2, 2, 12);
    g.fillStyle = '#c6ecf8'; g.fillRect(12, 1, 8, 2);
    g.fillStyle = '#9fd6ec'; g.fillRect(10, 4, 2, 5); g.fillRect(20, 4, 2, 5);
    g.fillStyle = '#5b5766'; g.fillRect(1, 25, 30, 2);
    return c;
  }
  function makeBench() {
    var c = mk(20, 14), g = c.getContext('2d');
    g.fillStyle = '#5b3d22'; g.fillRect(1, 2, 18, 3); g.fillRect(1, 6, 18, 4);
    g.fillStyle = '#7a5327'; g.fillRect(1, 2, 18, 1); g.fillRect(1, 6, 18, 1);
    g.fillStyle = '#3b3b46'; g.fillRect(2, 10, 3, 3); g.fillRect(15, 10, 3, 3);
    return c;
  }

  var TILES = {};
  function buildTiles() {
    TILES['.'] = grassTile(1, false, false);
    TILES[','] = grassTile(2, true, false);
    TILES['f'] = grassTile(3, true, true);
    TILES['-'] = pathTile(4);
    TILES['~'] = waterTile(5);
    TILES['#'] = plankTile('#a9743f', '#8a5c31', '#bd8a52', false);
    TILES['^'] = roofTile();
    TILES['W'] = windowTile();
    TILES['D'] = doorTile('l');
    TILES['d'] = doorTile('r');
    TILES['='] = wallTile();
    TILES['_'] = floorTile(6);
    TILES['c'] = carpetTile();
    TILES['b'] = bedTile('top');
    TILES['n'] = bedTile('bottom');
    TILES['m'] = tableTile();
    TILES['h'] = chairTile();
    TILES['F'] = fireTile();
    TILES['R'] = roadTile(false);
    TILES['M'] = roadTile(true);
    TILES['S'] = walkTile();
    TILES['B'] = buildingTile(1);
    TILES['C'] = buildingTile(2);
    TILES['V'] = buildingTile(3);
    TILES['K'] = shopTile();
    TILES['O'] = flatRoofTile();
    TILES['Q'] = tiledRoofTile();
    /* Kacheln, auf denen etwas "draufsteht", sehen unten aus wie Boden */
    TILES['T'] = TILES['.'];
    TILES['t'] = TILES[','];
    TILES['*'] = TILES['.'];
    TILES['r'] = TILES[','];
    TILES['l'] = TILES['S'];
    TILES['P'] = TILES['S'];
    TILES['x'] = TILES['.'];
  }

  global.Sprites = {
    knight: KNIGHT,
    sword: SWORD,
    heart: makeHeart(),
    car: makeCar(),
    tree: makeTree(),
    pine: makePine(),
    bush: makeBush(),
    rock: makeRock(),
    lamp: makeLamp(),
    fountain: makeFountain(),
    bench: makeBench(),
    sign: makeSign(),
    spider: [makeSpider(0), makeSpider(1)],
    crown: makeCrown(),
    treant: makeTreant(),
    withEars: withEars,
    actor: buildActor,
    tiles: TILES,
    build: buildTiles,
    blob: blob,
    rng: rng,
    warnings: warnings
  };
})(window);
