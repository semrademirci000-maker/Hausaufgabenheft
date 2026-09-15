/* game.js – Oakblade
   Ein kleines Pixel-Rollenspiel: Wald, Holzhaus, Familie, Freunde,
   Zombies, Schwertschlag-Animation und Autofahrt in die Stadt. */
(function (global) {
  'use strict';

  var TILE = 16, VW = 320, VH = 240;
  var FASSUNG = 16;                    /* steht unten auf dem Titelbild */
  var cv = document.getElementById('game');
  var ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var S = global.Sprites, MAPS = global.MAPS, D = global.Dialog, Chat = global.Chat;
  var A = global.Audio8;

  var ACT = {};                    /* fertige Laufbilder je Person */
  var G = {
    state: 'title',
    map: null, mapKey: '', mapW: 0, mapH: 0,
    ents: [], party: [], partyKeys: [], trail: [],
    player: null, camX: 0, camY: 0,
    kills: 0, time: 0, fade: 0, fadeTo: null,
    spawnT: 4, shake: 0, hint: '', hintT: 0,
    boss: null, bossQueue: [], bossesBeaten: 0, killsSinceBoss: 0,
    coins: 0, swordLevel: 0, armorLevel: 0,
    pilze: 0, beeren: 0, spared: 0, pets: 0, hundBonus: false,
    zeit: 0.28, quest: null, sammelT: 6,
    drive: null, overT: 0, lastSave: 0, maxhpGesichert: 10
  };
  global.GAME = G;

  /* ================= Eingabe ================= */
  var keys = {}, tapped = {};
  var KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
    ' ': 'attack', Enter: 'talk', e: 'talk', E: 'talk',
    z: 'talk', Z: 'talk', x: 'attack', X: 'attack', j: 'attack', J: 'attack'
  };

  global.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (!k) return;
    e.preventDefault();
    if (!keys[k]) tapped[k] = true;
    keys[k] = true;
  });
  global.addEventListener('keyup', function (e) {
    var k = KEYMAP[e.key];
    if (!k) return;
    e.preventDefault();
    keys[k] = false;
  });

  /* ================= Laufen =================
     Alles laeuft ueber den Joystick aus joystick.js. Ziehen laeuft,
     kurzes Tippen liest Texte weiter - mehr Eingaben gibt es nicht
     (ausser der Tastatur am Rechner). */
  var stick = null;

  function bindStick() {
    if (!global.Joystick) return;
    stick = new Joystick({
      radius: 60,
      deadZone: 0.18,

      /* Gelaufen (und im Kampf ausgewichen) wird, sobald das Spiel laeuft. */
      canStart: function () {
        return G.state === 'play' || G.state === 'over' || G.state === 'kampf';
      },

      /* Knoepfe und die Textbox behalten ihre eigenen Beruehrungen. */
      ignore: function (target) {
        if (!target || !target.closest) return false;
        return !!(target.closest('button') || target.closest('#box'));
      },

      /* Kurz getippt statt gezogen: Spiel starten oder weiterlesen. */
      onTap: function (x, y) {
        if (A) A.resume();
        if (G.state === 'title') { startGame(); return; }
        if (D.isOpen()) { D.press(); return; }
        if (G.state === 'kampf') {
          /* Bildschirmpunkt in Spielpunkte umrechnen */
          var r = cv.getBoundingClientRect();
          Kampf.tippen((x - r.left) / r.width * VW, (y - r.top) / r.height * VH);
          return;
        }
        if (G.state === 'drive') { tapped.talk = true; }
      }
    });
  }

  /* Richtung, in die der Ritter laufen soll: erst der Stick, sonst Tasten. */
  function laufRichtung() {
    var dx = 0, dy = 0;
    if (stick && stick.active && (stick.x !== 0 || stick.y !== 0)) {
      dx = stick.x;
      dy = stick.y;
    } else {
      if (keys.left) dx -= 1;
      if (keys.right) dx += 1;
      if (keys.up) dy -= 1;
      if (keys.down) dy += 1;
    }
    var laenge = Math.sqrt(dx * dx + dy * dy);
    if (laenge > 1) { dx /= laenge; dy /= laenge; }   /* nie schneller als 1 */
    return { x: dx, y: dy };
  }

  function bindTouch() {
    var btns = document.querySelectorAll('#touch button');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        var k = b.getAttribute('data-k');
        function on(e) { e.preventDefault(); if (!keys[k]) tapped[k] = true; keys[k] = true; if (A) A.resume(); }
        function off(e) { e.preventDefault(); keys[k] = false; }
        b.addEventListener('touchstart', on, { passive: false });
        b.addEventListener('touchend', off, { passive: false });
        b.addEventListener('touchcancel', off, { passive: false });
        b.addEventListener('mousedown', on);
        b.addEventListener('mouseup', off);
        b.addEventListener('mouseleave', off);
      })(btns[i]);
    }
  }

  function took(k) { if (tapped[k]) { tapped[k] = false; return true; } return false; }

  /* Die Lauf-Knöpfe nur zeigen, wenn man auch laufen darf. */
  var touchEl = null, controlsOn = null;
  function updateControls() {
    if (!touchEl) touchEl = document.getElementById('touch');
    var spielt = (G.state === 'play' || G.state === 'over');
    /* Im Kampf steuert der Stick das rote Herz - also auch dort zeigen. */
    if (stick) stick.setVisible(spielt || G.state === 'kampf');
    var show = spielt && !D.isOpen();
    if (show === controlsOn) return;
    controlsOn = show;
    touchEl.classList.toggle('off', !show);
    var autotext = document.getElementById('autotext');
    if (autotext) autotext.textContent = (G.mapKey === 'stadt') ? 'Wald' : 'Stadt';
    if (!show) {
      /* Finger weg vom Knopf: nichts darf gedrückt bleiben */
      for (var k in keys) keys[k] = false;
    }
  }

  /* ================= Karte laden ================= */
  function solidTile(ch) { return MAPS.SOLID.indexOf(ch) >= 0; }

  function tileAt(tx, ty) {
    if (ty < 0 || ty >= G.mapH || tx < 0 || tx >= G.mapW) return 'T';
    return G.map.rows[ty][tx];
  }

  function loadMap(key, tx, ty, after) {
    var m = MAPS[key]();
    G.map = m; G.mapKey = key;
    G.mapH = m.rows.length; G.mapW = m.rows[0].length;
    G.ents = []; G.party = []; G.trail = [];
    G.boss = null;
    G.blocks = [];

    /* Bäume, Büsche und Steine aus den Kacheln zu Objekten machen */
    for (var y = 0; y < G.mapH; y++) {
      for (var x = 0; x < G.mapW; x++) {
        var ch = m.rows[y][x];
        if (ch === 'T') addProp('tree', x + 0.5, y + 1);
        else if (ch === 't') addProp('pine', x + 0.5, y + 1);
        else if (ch === '*') addProp('bush', x + 0.5, y + 1);
        else if (ch === 'r') addProp('rock', x + 0.5, y + 1);
      }
    }
    /* zusätzliche Objekte der Karte (Auto, Schild, Laternen) */
    for (var i = 0; i < m.props.length; i++) {
      var p = m.props[i];
      addProp(p.kind, p.x, p.y, p);
    }

    /* Spieler */
    if (!G.player) {
      var mh = Math.max(10, Math.min(20, G.maxhpGesichert || 10));
      G.player = { type: 'player', x: 0, y: 0, dir: 'down', anim: 0, moving: false,
                   hp: mh, maxhp: mh, atk: null, atkCd: 0, swingId: 0, invuln: 0, kx: 0, ky: 0 };
    }
    G.player.x = tx * TILE; G.player.y = ty * TILE;
    G.player.atk = null; G.player.kx = 0; G.player.ky = 0;
    G.ents.push(G.player);

    /* Begleiter, die gerade mitlaufen */
    for (i = 0; i < G.partyKeys.length; i++) {
      var c = makeCompanion(G.partyKeys[i], G.player.x - 10 - i * 4, G.player.y + 8 + i * 3);
      G.ents.push(c); G.party.push(c);
    }

    if (key === 'wald') {
      /* Freunde, die (noch) nicht mitkommen, stehen vorm Haus */
      var spots = m.friendSpots, fi = 0;
      var alle = ['lisbeth', 'tarik', 'momo', 'gris'];
      for (i = 0; i < alle.length; i++) {
        if (G.partyKeys.indexOf(alle[i]) >= 0) continue;
        var sp = spots[fi % spots.length]; fi++;
        var f = makeCompanion(alle[i], sp.x * TILE, sp.y * TILE);
        f.idle = true; f.dir = 'down';
        G.ents.push(f);
      }
    }

    if (key === 'haus') {
      addNPC('mama', 3.5, 4, 'down');
      addNPC('papa', 6.5, 7.2, 'up');
      addNPC('mila', 12.5, 9.2, 'left');
      var hund = addNPC('hund', 15.5, 5.5, 'down');
      hund.hund = true;
    }

    if (key === 'stadt') {
      for (i = 0; i < m.wanderSpots.length; i++) {
        var w = m.wanderSpots[i];
        var n = addNPC(w.wer || 'buerger', w.x, w.y, 'down');
        n.wander = true; n.wt = Math.random() * 2;
        n.line = Chat.cityLines[i % Chat.cityLines.length];
      }
      if (m.haendler) {
        var h = addNPC('haendler', m.haendler.x, m.haendler.y, 'down');
        h.shop = true;
      }
    }

    if (key === 'wald') {
      for (i = 0; i < 9; i++) sammelStueckSetzen();
    }

    G.spawnT = 3;
    if (A) A.music(m.music);
    hint(m.name);
    if (after) after();
  }

  function addProp(kind, x, y, data) {
    var spr = kind === 'tree' ? S.tree : kind === 'pine' ? S.pine : kind === 'bush' ? S.bush :
              kind === 'rock' ? S.rock : kind === 'lamp' ? S.lamp : kind === 'sign' ? S.sign :
              kind === 'car' ? S.car : kind === 'fountain' ? S.fountain :
              kind === 'bench' ? S.bench : kind === 'stall' ? S.stall : null;
    var p = { type: 'prop', kind: kind, x: x * TILE, y: y * TILE, spr: spr,
              text: data && data.text };
    G.ents.push(p);
    if (kind === 'car') G.blocks.push({ l: p.x - 20, r: p.x + 20, t: p.y - 12, b: p.y });
    if (kind === 'lamp') G.blocks.push({ l: p.x - 4, r: p.x + 4, t: p.y - 4, b: p.y });
    if (kind === 'sign') G.blocks.push({ l: p.x - 12, r: p.x + 12, t: p.y - 6, b: p.y });
    if (kind === 'fountain') G.blocks.push({ l: p.x - 16, r: p.x + 16, t: p.y - 14, b: p.y });
    if (kind === 'bench') G.blocks.push({ l: p.x - 10, r: p.x + 10, t: p.y - 5, b: p.y });
    if (kind === 'stall') G.blocks.push({ l: p.x - 17, r: p.x + 17, t: p.y - 10, b: p.y });
    return p;
  }

  function makeCompanion(key, px, py) {
    return { type: 'friend', key: key, x: px, y: py, dir: 'down', anim: 0,
             moving: false, mood: 0, atkCd: 0, swing: 0, idle: false };
  }

  function addNPC(key, x, y, dir) {
    var n = { type: 'npc', key: key, x: x * TILE, y: y * TILE, dir: dir || 'down',
              anim: 0, moving: false, said: 0 };
    G.ents.push(n);
    return n;
  }

  function hint(text) { G.hint = text; G.hintT = 2.6; }

  /* ================= Laufen & Wände ================= */
  function boxFree(x, y) {
    var l = x - 5, r = x + 5, t = y - 7, b = y - 0.5;
    var i, j;
    for (i = 0; i < 2; i++) {
      for (j = 0; j < 2; j++) {
        var px = i ? r : l, py = j ? b : t;
        if (solidTile(tileAt(Math.floor(px / TILE), Math.floor(py / TILE)))) return false;
      }
    }
    for (i = 0; i < G.blocks.length; i++) {
      var bl = G.blocks[i];
      if (r > bl.l && l < bl.r && b > bl.t && t < bl.b) return false;
    }
    return true;
  }

  function moveEnt(e, dx, dy, ignoreBlocks) {
    var ox = e.x, oy = e.y;
    if (dx) {
      e.x += dx;
      if (!ignoreBlocks && !boxFree(e.x, e.y)) e.x = ox;
    }
    if (dy) {
      e.y += dy;
      if (!ignoreBlocks && !boxFree(e.x, e.y)) e.y = oy;
    }
    e.x = Math.max(8, Math.min(G.mapW * TILE - 8, e.x));
    e.y = Math.max(10, Math.min(G.mapH * TILE - 2, e.y));
  }

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  /* ================= Spieler ================= */
  var SPEED = 62;

  function updatePlayer(dt) {
    var p = G.player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.atkCd = Math.max(0, p.atkCd - dt);

    var richtung = laufRichtung();
    var dx = richtung.x, dy = richtung.y;

    p.moving = !!(dx || dy);
    if (p.moving && !p.atk) {
      if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left';
      else p.dir = dy > 0 ? 'down' : 'up';
    }

    var sp = p.atk ? SPEED * 0.35 : SPEED;
    moveEnt(p, dx * sp * dt, dy * sp * dt);

    /* Rückstoß nach einem Treffer */
    if (p.kx || p.ky) {
      moveEnt(p, p.kx * dt, p.ky * dt);
      p.kx *= 0.86; p.ky *= 0.86;
      if (Math.abs(p.kx) < 3) p.kx = 0;
      if (Math.abs(p.ky) < 3) p.ky = 0;
    }

    p.anim += dt * (p.moving ? 7 : 0);

    /* Spur für die Begleiter */
    G.trail.unshift({ x: p.x, y: p.y, dir: p.dir, moving: p.moving });
    if (G.trail.length > 260) G.trail.pop();

    /* Schlagen */
    if (took('attack') && !D.isOpen() && !p.atk && p.atkCd <= 0) {
      p.atk = { t: 0 };
      p.swingId++;
      if (A) A.swing();
    }
    if (p.atk) {
      p.atk.t += dt;
      if (p.atk.t >= 0.06 && p.atk.t <= 0.22) hitCheck(p);
      if (p.atk.t >= 0.34) { p.atk = null; p.atkCd = 0.1; }
    }

    /* Türen */
    var tx = Math.floor(p.x / TILE), ty = Math.floor((p.y - 3) / TILE);
    var trg = G.map.triggers;
    for (var i = 0; i < trg.length; i++) {
      var t = trg[i];
      if (tx >= t.x && tx < t.x + t.w && ty >= t.y && ty < t.y + t.h) {
        useDoor(t);
        break;
      }
    }
  }

  function useDoor(t) {
    if (G.fadeTo) return;
    if (A) A.door();
    var fromHaus = (G.mapKey === 'haus');
    fadeTo(function () {
      loadMap(t.to, t.tx, t.ty);
      if (fromHaus && t.to === 'wald') askParty();
    });
  }

  function fadeTo(fn) { G.fadeTo = fn; G.fade = 0.001; }

  /* Trefferzone vor dem Ritter */
  function hitCheck(p) {
    var box;
    if (p.dir === 'right') box = { l: p.x + 2, r: p.x + 22, t: p.y - 16, b: p.y - 1 };
    else if (p.dir === 'left') box = { l: p.x - 22, r: p.x - 2, t: p.y - 16, b: p.y - 1 };
    else if (p.dir === 'down') box = { l: p.x - 12, r: p.x + 12, t: p.y - 6, b: p.y + 14 };
    else box = { l: p.x - 12, r: p.x + 12, t: p.y - 32, b: p.y - 12 };

    for (var i = 0; i < G.ents.length; i++) {
      var z = G.ents[i];
      if (z.type !== 'zombie' || z.dying || z.spared) continue;
      if (z.hitId === p.swingId) continue;
      if (z.x + 6 > box.l && z.x - 6 < box.r && z.y > box.t && z.y - 14 < box.b) {
        z.hitId = p.swingId;
        damageZombie(z, 1 + G.swordLevel, z.x - p.x, z.y - p.y);
      }
    }
  }

  function damageZombie(z, dmg, dx, dy) {
    z.hp -= dmg;
    z.flash = 0.18;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    z.kx = dx / len * 140; z.ky = dy / len * 140;
    G.shake = 2.5;
    if (z.hp <= 0) {
      z.dying = 0.001;
      if (A) A.dead();
      if (z.boss) {
        muenzenAbwerfen(z.x, z.y - 8, 12 + ((Math.random() * 8) | 0));
        bossBesiegt(z);
      } else {
        muenzenAbwerfen(z.x, z.y - 8, (1 + ((Math.random() * 3) | 0)) * (istNacht() ? 2 : 1));
        G.kills++;
        G.killsSinceBoss++;
        G.killsHeute = (G.killsHeute || 0) + 1;
        questFortschritt('zombies', 1);
        if (G.killsHeute === 3) hint('Genug gekaempft? Der Auto-Knopf bringt euch in die Stadt!');
        Chat.killLine(G);
        save();
      }
    } else if (A) A.hit();
  }

  /* ================= Zombies ================= */
  function spawnZombie() {
    var tries = 60;
    while (tries--) {
      var tx = 2 + ((Math.random() * (G.mapW - 4)) | 0);
      var ty = 2 + ((Math.random() * (G.mapH - 4)) | 0);
      if (solidTile(tileAt(tx, ty))) continue;
      var x = tx * TILE + 8, y = ty * TILE + 14;
      var dx = x - G.player.x, dy = y - G.player.y;
      if (dx * dx + dy * dy < 160 * 160) continue;
      if (ty < 12 && tx < 22) continue;                 /* nicht direkt am Haus */
      G.ents.push({ type: 'zombie', x: x, y: y, hp: 3, dir: 'down', anim: 0,
                    kx: 0, ky: 0, flash: 0, dying: 0, hitId: -1, wt: 0, vx: 0, vy: 0,
                    hurtCd: 0 });
      return;
    }
  }

  G.zombieNear = function (r) {
    for (var i = 0; i < G.ents.length; i++) {
      var z = G.ents[i];
      if (z.type === 'zombie' && !z.dying && dist(z, G.player) < r) return true;
    }
    return false;
  };

  function countZombies() {
    var n = 0;
    for (var i = 0; i < G.ents.length; i++) if (G.ents[i].type === 'zombie' && !G.ents[i].dying) n++;
    return n;
  }

  function updateZombie(z, dt) {
    if (z.dying) {
      z.dying += dt;
      return;
    }
    /* Verschont: er trollt sich friedlich davon */
    if (z.spared) {
      z.leaving -= dt;
      moveEnt(z, z.vx * 32 * dt, z.vy * 32 * dt);
      z.anim += dt * 3;
      if (Math.abs(z.vx) > Math.abs(z.vy)) z.dir = z.vx > 0 ? 'right' : 'left';
      else z.dir = z.vy > 0 ? 'down' : 'up';
      if (z.leaving <= 0) z.dying = 0.02;
      return;
    }
    if (D.isOpen()) { z.flash = Math.max(0, z.flash - dt); return; }
    z.flash = Math.max(0, z.flash - dt);
    z.hurtCd = Math.max(0, z.hurtCd - dt);

    var p = G.player;
    var dx = p.x - z.x, dy = p.y - z.y;
    var dd = Math.sqrt(dx * dx + dy * dy) || 1;
    var sp = 0;

    if (z.boss) { updateBoss(z, dt, dx, dy, dd); return; }

    if (dd < 150) {
      sp = 26; z.vx = dx / dd; z.vy = dy / dd;
    } else {
      z.wt -= dt;
      if (z.wt <= 0) {
        z.wt = 1.2 + Math.random() * 2;
        var ang = Math.random() * Math.PI * 2;
        z.vx = Math.cos(ang); z.vy = Math.sin(ang);
        if (Math.random() < 0.3) { z.vx = 0; z.vy = 0; }
      }
      sp = 11;
    }
    if (Math.abs(z.vx) > Math.abs(z.vy)) z.dir = z.vx > 0 ? 'right' : 'left';
    else if (z.vy) z.dir = z.vy > 0 ? 'down' : 'up';

    moveEnt(z, z.vx * sp * dt, z.vy * sp * dt);
    z.anim += dt * (sp > 0 ? 3.4 : 0);

    if (z.kx || z.ky) {
      moveEnt(z, z.kx * dt, z.ky * dt);
      z.kx *= 0.8; z.ky *= 0.8;
      if (Math.abs(z.kx) < 4) z.kx = 0;
      if (Math.abs(z.ky) < 4) z.ky = 0;
    }

    /* Zombie berührt den Ritter */
    if (dd < 13 && p.invuln <= 0 && G.state === 'play') hurtPlayer(1, dx, dy, dd);
  }

  /* Ein Treffer kostet ein halbes Herz, ein Bosstreffer ein ganzes. */
  function hurtPlayer(dmg, dx, dy, dd) {
    var p = G.player;
    p.hp -= dmg;
    p.invuln = 1.1;
    p.kx = -dx / dd * 150; p.ky = -dy / dd * 150;
    G.shake = 4;
    if (A) A.hurt();
    if (p.hp <= 0) { p.hp = 0; gameOver(); }
  }

  /* ================= Pilze und Beeren ================= */

  function sammelStueckSetzen() {
    for (var i = 0; i < 40; i++) {
      var tx = 2 + ((Math.random() * (G.mapW - 4)) | 0);
      var ty = 2 + ((Math.random() * (G.mapH - 4)) | 0);
      var kachel = tileAt(tx, ty);
      if (solidTile(kachel)) continue;
      if (kachel !== '.' && kachel !== ',' && kachel !== 'f') continue;   /* nur auf Gras */
      G.ents.push({
        type: 'pickup',
        art: Math.random() > 0.45 ? 'pilz' : 'beere',
        x: tx * TILE + 8, y: ty * TILE + 14, anim: Math.random() * 3
      });
      return true;
    }
    return false;
  }

  function countPickups() {
    var n = 0;
    for (var i = 0; i < G.ents.length; i++) if (G.ents[i].type === 'pickup') n++;
    return n;
  }

  function updatePickup(e, dt) {
    e.anim += dt * 2;
    var dx = G.player.x - e.x, dy = (G.player.y - 6) - e.y;
    if (dx * dx + dy * dy < 13 * 13) {
      e.weg = true;
      if (e.art === 'pilz') { G.pilze++; hint('Pilz gefunden! (' + G.pilze + ')'); }
      else { G.beeren++; hint('Beeren gefunden! (' + G.beeren + ')'); }
      questFortschritt('pilze', e.art === 'pilz' ? 1 : 0);
      if (A) A.coin();
      save();
    }
  }

  /* ================= Tag und Nacht ================= */

  /* 0 = Mitternacht, 0.5 = Mittag. Ein ganzer Tag dauert vier Minuten. */
  function istNacht() { return G.zeit < 0.18 || G.zeit > 0.82; }

  function tageszeitFarbe() {
    var t = G.zeit;
    if (t > 0.26 && t < 0.72) return null;                  /* heller Tag */
    var dunkel;
    if (t <= 0.26) dunkel = 1 - t / 0.26;                   /* Nacht -> Morgen */
    else dunkel = (t - 0.72) / 0.28;                        /* Abend -> Nacht */
    var abend = (t > 0.6 && t < 0.8) || (t > 0.16 && t < 0.3);
    return {
      farbe: abend ? 'rgba(180,90,40,' : 'rgba(20,24,70,',
      staerke: Math.min(0.52, dunkel * 0.6)
    };
  }

  function schlafen() {
    D.push('Dein Bett', '#9ad8e0',
           'Du legst dich hin. Draussen wird es hell...',
           [{ t: 'Bis zum Morgen schlafen', r: 'Du wachst ausgeruht auf. Alle Herzen sind voll!',
              go: function () {
                G.zeit = 0.3;
                G.player.hp = G.player.maxhp;
                if (A) A.heal();
                hint('Guten Morgen!');
              } },
            { t: 'Doch nicht muede', r: 'Du stehst wieder auf.' }]);
    D.begin();
  }

  /* ================= Muenzen ================= */

  function muenzenAbwerfen(x, y, anzahl) {
    for (var i = 0; i < anzahl; i++) {
      var w = Math.random() * Math.PI * 2;
      G.ents.push({
        type: 'coin', x: x, y: y, t: 0, anim: Math.random() * 2,
        vx: Math.cos(w) * (20 + Math.random() * 30),
        vy: Math.sin(w) * (14 + Math.random() * 20) - 10
      });
    }
  }

  function updateCoin(c, dt) {
    c.t += dt;
    c.anim += dt * 6;
    var p = G.player;
    var dx = p.x - c.x, dy = (p.y - 8) - c.y;
    var dd = Math.sqrt(dx * dx + dy * dy) || 1;

    if (c.t < 0.3) {
      /* kurz wegspringen */
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 90 * dt;
    } else {
      /* dann fliegt sie von selbst zum Ritter */
      var sp = 110 + c.t * 120;
      c.x += dx / dd * sp * dt;
      c.y += dy / dd * sp * dt;
    }

    if (dd < 11) {
      c.weg = true;
      G.coins++;
      if (A) A.coin();
      save();
    }
  }

  /* ================= Bosse ================= */

  function mischen(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0, t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function spawnBoss() {
    if (!G.bossQueue.length) G.bossQueue = mischen(Chat.bosse);
    var b = G.bossQueue.shift();
    G.killsSinceBoss = 0;
    G.shake = 6;
    if (A) A.music('boss');

    D.push('!!!', '#ff5a5a', b.intro);
    if (G.party.length) {
      var f = G.party[(Math.random() * G.party.length) | 0];
      var pp = Chat.people[f.key];
      var lines = Chat.bossLines.auftritt;
      D.push(pp.name, pp.color, lines[(Math.random() * lines.length) | 0]);
    }
    /* Wenn die Einleitung durch ist, geht der Kampf los. */
    D.begin(function () {
      G.state = 'kampf';
      Kampf.start(b);
    });
  }

  /* Bild des Bosses fuer das Kampf-Fenster */
  function bossBild(b, frame) {
    if (b.art === 'spider') return S.spider[frame % 2];
    if (b.art === 'treant') return S.treant;
    if (b.art === 'wolf') return wolfSet().down[frame % 2];
    return actorFor('zombie', true).down[frame % 2];
  }

  function bossBelohnung(b, verschont) {
    var p = G.player;
    G.state = 'play';
    G.bossesBeaten++;
    G.killsSinceBoss = 0;
    G.shake = 4;
    questFortschritt('boss', 1);
    if (p.maxhp < 20) p.maxhp += 2;
    p.hp = p.maxhp;
    G.coins += verschont ? 60 : 40;
    if (verschont) G.spared++;
    if (A) { A.heal(); A.music(G.map.music); }

    if (verschont) {
      D.push(b.name + ' verschont!', '#ffd24a',
             'Ihr habt euch vertragen. Er trottet davon und dreht sich noch zweimal um.');
      D.push('Belohnung', '#ffd24a', '60 Muenzen, ein Herz mehr - und ein guter Ruf im Wald.');
    } else {
      D.push(b.name + ' besiegt!', '#ffd24a', b.sieg);
      D.push('Belohnung', '#ffd24a', '40 Muenzen und ein Herz mehr. Alle Herzen wieder voll!');
    }
    if (G.party.length) {
      var f = G.party[(Math.random() * G.party.length) | 0];
      var pp = Chat.people[f.key];
      var lines = verschont ? Chat.spareLines : Chat.bossLines.sieg;
      D.push(pp.name, pp.color, lines[(Math.random() * lines.length) | 0]);
    }
    D.begin();
    hint(b.name.split(',')[0] + (verschont ? ' verschont!' : ' besiegt!'));
    save();
  }

  function spawnZombieNear(z) {
    for (var i = 0; i < 20; i++) {
      var a = Math.random() * Math.PI * 2, r = 26 + Math.random() * 26;
      var x = z.x + Math.cos(a) * r, y = z.y + Math.sin(a) * r;
      var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (solidTile(tileAt(tx, ty))) continue;
      G.ents.push({ type: 'zombie', x: x, y: y, hp: 3, dir: 'down', anim: 0,
                    kx: 0, ky: 0, flash: 0, dying: 0, hitId: -1, wt: 0,
                    vx: 0, vy: 0, hurtCd: 0 });
      return;
    }
  }

  function updateBoss(z, dt, dx, dy, dd) {
    var b = z.boss, p = G.player;
    z.flash = Math.max(0, z.flash - dt);
    z.spT -= dt;

    var sp = b.speed * (z.rage ? 1.6 : 1);
    z.vx = dx / dd; z.vy = dy / dd;

    if (b.koennen === 'sprint') {
      if (z.dash > 0) { z.dash -= dt; sp = 120; }
      else if (z.spT <= 0 && dd < 190) {
        z.spT = 2.8; z.dash = 0.45; G.shake = 2;
        if (A) A.swing();
      }
    }
    if (b.koennen === 'rufen' && z.spT <= 0 && dd < 220) {
      z.spT = 7;
      spawnZombieNear(z); spawnZombieNear(z);
      hint('Grauzahn ruft Verstaerkung!');
    }
    if (b.koennen === 'wut' && !z.rage && z.hp <= z.maxhp / 2) {
      z.rage = true; G.shake = 5;
      hint('Mondfell wird wuetend!');
    }
    if (b.koennen === 'wurzeln') {
      if (z.roots > 0) {
        z.roots -= dt;
        sp = 0;
        if (z.roots <= 0 && dd < 46 && p.invuln <= 0 && G.state === 'play') {
          hurtPlayer(b.dmg, dx, dy, dd);
        }
      } else if (z.spT <= 0 && dd < 130) {
        z.spT = 4.5; z.roots = 0.75;
        if (A) A.hit();
      }
    }

    if (Math.abs(z.vx) > Math.abs(z.vy)) z.dir = z.vx > 0 ? 'right' : 'left';
    else z.dir = z.vy > 0 ? 'down' : 'up';

    moveEnt(z, z.vx * sp * dt, z.vy * sp * dt);
    z.anim += dt * (sp > 0 ? 4 : 1.4);

    if (z.kx || z.ky) {
      moveEnt(z, z.kx * 0.5 * dt, z.ky * 0.5 * dt);
      z.kx *= 0.78; z.ky *= 0.78;
      if (Math.abs(z.kx) < 4) z.kx = 0;
      if (Math.abs(z.ky) < 4) z.ky = 0;
    }

    if (dd < 14 + b.scale * 4 && p.invuln <= 0 && G.state === 'play') {
      hurtPlayer(b.dmg, dx, dy, dd);
    }
  }

  function bossBesiegt(z) {
    var b = z.boss, p = G.player;
    G.boss = null;
    G.bossesBeaten++;
    G.killsSinceBoss = 0;
    questFortschritt('boss', 1);
    G.shake = 6;
    if (p.maxhp < 14) p.maxhp += 2;
    p.hp = p.maxhp;
    if (A) { A.heal(); A.music(G.map.music); }

    D.push(b.name + ' besiegt!', '#ffd24a', b.sieg);
    D.push('Belohnung', '#ffd24a',
           'Du fuehlst dich staerker: ein Herz mehr - und alle Herzen wieder voll.');
    if (G.party.length) {
      var f = G.party[(Math.random() * G.party.length) | 0];
      var pp = Chat.people[f.key];
      var lines = Chat.bossLines.sieg;
      D.push(pp.name, pp.color, lines[(Math.random() * lines.length) | 0]);
    }
    D.begin();
    hint(b.name.split(',')[0] + ' besiegt!');
    save();
  }

  /* ================= Begleiter ================= */
  function updateCompanion(c, dt, idx) {
    c.atkCd = Math.max(0, c.atkCd - dt);
    if (c.swing > 0) c.swing -= dt;

    if (c.idle) { c.anim += 0; c.moving = false; return; }

    /* dem Ritter hinterher */
    var want = G.trail[Math.min(G.trail.length - 1, 18 + idx * 15)];
    if (want) {
      var dx = want.x - c.x, dy = want.y - c.y;
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (dd > 9) {
        var sp = Math.min(SPEED * 1.05, 26 + dd * 3);
        moveEnt(c, dx / dd * sp * dt, dy / dd * sp * dt);
        c.moving = true;
        if (Math.abs(dx) > Math.abs(dy)) c.dir = dx > 0 ? 'right' : 'left';
        else c.dir = dy > 0 ? 'down' : 'up';
      } else c.moving = false;
    }
    c.anim += dt * (c.moving ? 7 : 0);

    /* Freunde helfen im Kampf */
    /* Waehrend geredet wird, haut auch niemand zu */
    if (c.atkCd <= 0 && !D.isOpen()) {
      for (var i = 0; i < G.ents.length; i++) {
        var z = G.ents[i];
        if (z.type !== 'zombie' || z.dying) continue;
        /* Wer zuhoert oder verschont ist, wird in Ruhe gelassen */
        if (z.spared || z.reden || z.mercy > 0) continue;
        if (dist(z, c) < 22) {
          c.atkCd = 1.5; c.swing = 0.25;
          damageZombie(z, 1, z.x - c.x, z.y - c.y);
          break;
        }
      }
    }
  }

  function updateNPC(n, dt) {
    if (!n.wander) return;
    n.wt -= dt;
    if (n.wt <= 0) {
      n.wt = 1.5 + Math.random() * 2.5;
      var r = Math.random();
      n.vx = 0; n.vy = 0;
      if (r < 0.25) n.vx = -1; else if (r < 0.5) n.vx = 1;
      else if (r < 0.7) n.vy = -1; else if (r < 0.9) n.vy = 1;
    }
    if (n.vx || n.vy) {
      moveEnt(n, (n.vx || 0) * 18 * dt, (n.vy || 0) * 18 * dt);
      n.moving = true;
      if (n.vx) n.dir = n.vx > 0 ? 'right' : 'left';
      else if (n.vy) n.dir = n.vy > 0 ? 'down' : 'up';
    } else n.moving = false;
    n.anim += dt * (n.moving ? 6 : 0);
  }

  /* ================= Auftraege ================= */

  var AUFTRAEGE = [
    { art: 'zombies', ziel: 8, text: 'Erledige 8 Zombies', lohn: 40 },
    { art: 'pilze', ziel: 5, text: 'Sammle 5 Pilze', lohn: 35 },
    { art: 'verschonen', ziel: 3, text: 'Verschone 3 Zombies', lohn: 55 },
    { art: 'boss', ziel: 1, text: 'Besiege einen Boss', lohn: 80 }
  ];

  function questFortschritt(art, n) {
    if (!n || !G.quest || G.quest.art !== art || G.quest.fertig) return;
    G.quest.stand += n;
    if (G.quest.stand >= G.quest.ziel) {
      G.quest.fertig = true;
      hint('Auftrag geschafft! Erzaehl es Papa.');
      if (A) A.select();
    }
  }

  function neuerAuftrag() {
    var a = AUFTRAEGE[(Math.random() * AUFTRAEGE.length) | 0];
    G.quest = { art: a.art, ziel: a.ziel, text: a.text, lohn: a.lohn, stand: 0, fertig: false };
    hint('Neuer Auftrag: ' + a.text);
  }

  function auftragAbgeben() {
    var lohn = G.quest.lohn;
    G.coins += lohn;
    G.quest = null;
    if (A) A.coin();
    hint('+' + lohn + ' Muenzen!');
    save();
  }

  /* ============ Mit Zombies reden statt zuschlagen ============ */

  function zombieAnsprechen(z) {
    if (!z.mercy) z.mercy = 0;
    z.reden = true;                 /* jetzt wird geredet, nicht geschlagen */
    var text = Chat.zombieTexte[Math.min(z.mercy, Chat.zombieTexte.length - 1)];
    D.push('Ein Zombie', '#8fd36a', text, [
      { t: 'Freundlich winken',
        go: function () { mercyPlus(z, 'Du winkst. Der Zombie winkt ganz langsam zurueck.'); } },
      { t: 'Einen Witz erzaehlen',
        go: function () { mercyPlus(z, 'Dein Witz ueber Regenwuermer kommt gut an. Der Zombie gluckst.'); } },
      { t: 'Den Grashalm wegnehmen',
        go: function () { mercyPlus(z, 'Du zupfst ihm den Halm aus dem Ohr. Er sieht fast ordentlich aus.'); } },
      { t: 'Lieber doch kaempfen',
        r: 'Der Zombie knurrt und kommt wieder auf dich zu.' }
    ]);
    D.begin();
  }

  function mercyPlus(z, text) {
    z.mercy = (z.mercy || 0) + 1;
    D.push('Ein Zombie', '#8fd36a', text);
    if (A) A.blip();
    if (z.mercy >= 3) verschonen(z);
    else D.push('Ein Zombie', '#8fd36a', 'Er wirkt schon viel ruhiger. Noch ein bisschen...');
  }

  function verschonen(z) {
    z.spared = true;
    z.leaving = 2.2;
    z.vx = (z.x - G.player.x) || 1;
    z.vy = (z.y - G.player.y);
    var len = Math.sqrt(z.vx * z.vx + z.vy * z.vy) || 1;
    z.vx /= len; z.vy /= len;
    G.spared++;
    muenzenAbwerfen(z.x, z.y - 8, 2 + ((Math.random() * 3) | 0));
    questFortschritt('verschonen', 1);
    if (A) A.heal();
    hint('Verschont! (' + G.spared + ')');
    D.push('Ein Zombie', '#8fd36a',
           Chat.zombieFreund[(Math.random() * Chat.zombieFreund.length) | 0]);
    if (G.party.length) {
      var f = G.party[(Math.random() * G.party.length) | 0];
      var pp = Chat.people[f.key];
      D.push(pp.name, pp.color, Chat.spareLines[(Math.random() * Chat.spareLines.length) | 0]);
    }
    save();
  }

  /* ================= Der Laden ================= */

  var SCHWERT_STUFEN = [
    { name: 'Geschaerfte Klinge', preis: 25 },
    { name: 'Stahlklinge', preis: 60 },
    { name: 'Goldene Klinge', preis: 120 }
  ];
  var RUESTUNG_STUFEN = [
    { name: 'Lederwams', preis: 30 },
    { name: 'Kettenhemd', preis: 70 },
    { name: 'Goldene Ruestung', preis: 140 }
  ];

  function ladenOeffnen(ersterBesuch) {
    var h = Chat.people.haendler;
    var opts = [];
    var sw = SCHWERT_STUFEN[G.swordLevel];
    var ru = RUESTUNG_STUFEN[G.armorLevel];

    if (sw) {
      opts.push({ t: 'Schwert: ' + sw.name + ' - ' + sw.preis + ' Muenzen',
                  go: function () { kaufen('schwert', sw); } });
    }
    if (ru) {
      opts.push({ t: 'Ruestung: ' + ru.name + ' - ' + ru.preis + ' Muenzen',
                  go: function () { kaufen('ruestung', ru); } });
    }
    if (G.pilze > 0) {
      opts.push({ t: G.pilze + ' Pilze verkaufen (je 4)',
                  go: function () {
                    var lohn = G.pilze * 4; G.coins += lohn; G.pilze = 0;
                    if (A) A.coin(); hint('+' + lohn + ' Muenzen');
                    D.push(h.name, h.color, 'Schoene Pilze! Die kommen heute Abend in die Pfanne.');
                    save(); ladenOeffnen(false);
                  } });
    }
    if (G.beeren > 0) {
      opts.push({ t: G.beeren + ' Beeren verkaufen (je 3)',
                  go: function () {
                    var lohn = G.beeren * 3; G.coins += lohn; G.beeren = 0;
                    if (A) A.coin(); hint('+' + lohn + ' Muenzen');
                    D.push(h.name, h.color, 'Beeren! Meine Frau macht Marmelade draus.');
                    save(); ladenOeffnen(false);
                  } });
    }
    if (G.player.hp < G.player.maxhp) {
      opts.push({ t: 'Eintopf, alle Herzen voll - 10 Muenzen',
                  go: function () { kaufen('eintopf', { name: 'Eintopf', preis: 10 }); } });
    }
    opts.push({ t: 'Nur schauen, danke.', r: 'Kein Problem. Komm wieder, wenn die Tasche klimpert!' });

    var text = ersterBesuch
      ? Chat.shopLines[(Math.random() * Chat.shopLines.length) | 0]
      : 'Sonst noch was?';
    text += '  (Du hast ' + G.coins + ' Muenzen)';

    D.push(h.name + ' (' + h.rolle + ')', h.color, text, opts);
    D.begin();
  }

  function kaufen(art, stufe) {
    var h = Chat.people.haendler;
    if (G.coins < stufe.preis) {
      D.push(h.name, h.color,
             'Dafuer fehlen dir ' + (stufe.preis - G.coins) +
             ' Muenzen. Im Wald liegen genug herum - in Zombies!');
      ladenOeffnen(false);
      return;
    }
    G.coins -= stufe.preis;

    if (art === 'schwert') {
      G.swordLevel++;
      D.push(h.name, h.color, 'Die ' + stufe.name + ' gehoert dir. Damit haust du haerter zu!');
      hint('Schwert aufgewertet!');
      if (A) A.select();
    } else if (art === 'ruestung') {
      G.armorLevel++;
      G.player.maxhp = Math.min(20, G.player.maxhp + 2);
      G.player.hp = G.player.maxhp;
      D.push(h.name, h.color, stufe.name + ' sitzt wie angegossen. Ein Herz mehr - und alle voll!');
      hint('Ruestung aufgewertet!');
      if (A) A.heal();
    } else {
      G.player.hp = G.player.maxhp;
      D.push(h.name, h.color, 'Loeffel leer, Herzen voll. Guten Appetit!');
      if (A) A.heal();
    }
    save();
    ladenOeffnen(false);
  }

  /* ================= Reden ================= */
  /* Auf welcher Kachel steht der Ritter, wenn er einen Schritt vorgeht? */
  function kachelVorDemRitter() {
    var p = G.player, dx = 0, dy = 0;
    if (p.dir === 'left') dx = -12;
    else if (p.dir === 'right') dx = 12;
    else if (p.dir === 'up') dy = -14;
    else dy = 6;
    return tileAt(Math.floor((p.x + dx) / TILE), Math.floor((p.y - 4 + dy) / TILE));
  }

  function tryTalk() {
    var p = G.player, best = null, bd = 30;

    /* Erst schauen, ob ein Zombie in der Naehe ist - mit dem kann man reden! */
    var zNah = null, zd = 30;
    for (var j = 0; j < G.ents.length; j++) {
      var z = G.ents[j];
      if (z.type !== 'zombie' || z.dying || z.boss || z.spared) continue;
      var d0 = dist(z, p);
      if (d0 < zd) { zd = d0; zNah = z; }
    }
    if (zNah) return zombieAnsprechen(zNah);

    /* Vor dem Bett schlafen */
    var k = kachelVorDemRitter();
    if (G.mapKey === 'haus' && (k === 'b' || k === 'n')) return schlafen();

    for (var i = 0; i < G.ents.length; i++) {
      var e = G.ents[i];
      if (e === p) continue;
      if (e.type === 'npc' || e.type === 'friend' ||
          (e.type === 'prop' && (e.kind === 'car' || e.kind === 'sign'))) {
        var d = dist(e, p);
        if (d < bd) { bd = d; best = e; }
      }
    }
    if (!best) return;
    if (best.type === 'prop' && best.kind === 'car') return talkCar();
    if (best.type === 'prop' && best.kind === 'sign') {
      D.say('Ein Blatt Papier', '#e8e2c8', best.text);
      return;
    }
    if (best.type === 'npc' && best.hund) return streicheln(best);
    if (best.type === 'npc' && best.shop) return ladenOeffnen(true);
    if (best.type === 'npc') return talkNPC(best);
    return talkFriend(best);
  }

  function familyLine(wer, index) {
    var lines = Chat.familyLines[wer] || [];
    if (!lines.length) return 'Schoen, dass du da bist!';
    return lines[index % lines.length];
  }

  function talkNPC(n) {
    var p = Chat.people[n.key];
    if (n.key === 'mama') {
      var mopts = [
        { t: 'Ja bitte, einen Teller Eintopf!',
          r: 'Da, iss auf. So, jetzt bist du wieder ganz.', go: heal }
      ];
      if (G.pilze >= 3) {
        mopts.push({ t: 'Ich hab Pilze dabei! (3 Pilze)',
                     r: 'Pilzpfanne! Die beste im ganzen Wald. Davon wirst du staerker.',
                     go: function () {
                       G.pilze -= 3;
                       if (G.player.maxhp < 20) G.player.maxhp += 2;
                       G.player.hp = G.player.maxhp;
                       hint('Ein Herz mehr von Mamas Pilzpfanne!');
                       if (A) A.heal();
                       save();
                     } });
      }
      mopts.push({ t: 'Spaeter, ich muss los.', r: 'Dann pass auf dich auf, mein Ritter.' });
      D.push(p.name, p.color, familyLine('mama', n.said), mopts);
    } else if (n.key === 'papa') {
      var opts = [];
      if (!G.quest) {
        opts.push({ t: 'Hast du eine Aufgabe fuer mich?',
                    r: 'Immer! Pack das an, dann gibt es Muenzen.',
                    go: neuerAuftrag });
      } else if (G.quest.fertig) {
        opts.push({ t: 'Auftrag erledigt! (' + G.quest.text + ')',
                    r: 'Sauber gemacht! Hier, dein Lohn.',
                    go: auftragAbgeben });
      } else {
        opts.push({ t: 'Wie war der Auftrag nochmal?',
                    r: G.quest.text + ' - du hast ' + G.quest.stand + ' von ' + G.quest.ziel + '.' });
      }
      opts.push({ t: 'Lass uns in die Stadt fahren!',
                  r: 'Gern! Alle einsteigen!', go: starteFahrt });
      opts.push({ t: 'Ich gehe erst noch in den Wald.',
                  r: 'Halt das Schwert fest und den Kopf unten.' });
      D.push(p.name, p.color, familyLine('papa', n.said), opts);
    } else if (n.key === 'mila') {
      D.push(p.name, p.color, familyLine('mila', n.said), [
        { t: 'Wenn du groesser bist, versprochen.', r: 'Das sagst du immer! Aber gut. Ich uebe schon mal.' },
        { t: 'In die Stadt darfst du mit.', r: 'JAAA! Ich hol meine Schuhe!' }
      ]);
    } else {
      D.push(p.name, p.color, n.line || 'Schoenen Tag noch!');
    }
    n.said++;
    D.begin();
  }

  function streicheln(hund) {
    var w = Chat.people.hund;
    D.push(w.name, w.color, 'Wuffel wedelt so doll, dass sein ganzer Hintern mitwackelt.', [
      { t: 'Kopf kraulen', go: function () { gestreichelt(hund, 'Wuffel macht die Augen zu und lehnt sich an dein Bein.'); } },
      { t: 'Bauch kraulen', go: function () { gestreichelt(hund, 'Wuffel faellt sofort um und zeigt dir den Bauch.'); } },
      { t: 'Stoeckchen werfen', go: function () { gestreichelt(hund, 'Wuffel rast los, kommt mit einem viel zu grossen Ast zurueck.'); } },
      { t: 'Spaeter, Wuffel.', r: 'Wuffel legt sich seufzend wieder hin.' }
    ]);
    D.begin();
  }

  function gestreichelt(hund, text) {
    G.pets++;
    hund.anim += 1;
    if (A) A.heal();
    D.push(Chat.people.hund.name, Chat.people.hund.color, text);
    if (G.pets >= 5 && !G.hundBonus) {
      G.hundBonus = true;
      G.player.maxhp = Math.min(20, G.player.maxhp + 2);
      G.player.hp = G.player.maxhp;
      D.push('Wuffel', Chat.people.hund.color,
             'Von so viel Hund wird einem ganz warm ums Herz. Ein Herz mehr!');
      hint('Ein Herz mehr - danke, Wuffel!');
    }
    save();
  }

  function heal() {
    G.player.hp = G.player.maxhp;
    if (A) A.heal();
    hint('Leben wieder voll!');
  }

  function talkFriend(f) {
    var p = Chat.people[f.key];
    if (f.idle) {
      D.push(p.name + ' (' + p.rolle + ')', p.color,
        'Na, brauchst du heute Begleitung im Wald?', [
          { t: 'Ja, komm mit!', r: 'Endlich! Ich hol nur schnell meine Sachen.', go: function () { joinParty(f); } },
          { t: 'Diesmal gehe ich allein.', r: 'Alles klar. Ich pass hier auf das Haus auf.' }
        ]);
      D.begin();
      return;
    }
    /* Begleiter, der schon mitläuft: er stellt eine Frage */
    Chat.ask(G, f);
  }

  function joinParty(f) {
    f.idle = false;
    G.party.push(f);
    if (G.partyKeys.indexOf(f.key) < 0) G.partyKeys.push(f.key);
    hint(Chat.people[f.key].name + ' kommt mit!');
  }

  function leaveParty() {
    G.partyKeys = [];
    G.party = [];
    for (var i = G.ents.length - 1; i >= 0; i--) {
      if (G.ents[i].type === 'friend') G.ents.splice(i, 1);
    }
  }

  /* Frage beim Verlassen des Hauses */
  function askParty() {
    var alle = ['lisbeth', 'tarik', 'momo', 'gris'];
    function setParty(keys) {
      G.partyKeys = keys.slice();
      /* Karte neu bevölkern, ohne neu zu laden */
      for (var i = G.ents.length - 1; i >= 0; i--) {
        if (G.ents[i].type === 'friend') G.ents.splice(i, 1);
      }
      G.party = [];
      var spots = G.map.friendSpots, fi = 0;
      for (i = 0; i < alle.length; i++) {
        var k = alle[i];
        if (keys.indexOf(k) >= 0) {
          var c = makeCompanion(k, G.player.x - 10 - i * 5, G.player.y + 10 + i * 3);
          G.ents.push(c); G.party.push(c);
        } else {
          var sp = spots[fi % spots.length]; fi++;
          var f = makeCompanion(k, sp.x * TILE, sp.y * TILE);
          f.idle = true;
          G.ents.push(f);
        }
      }
      hint(keys.length ? (keys.length + ' Begleiter dabei') : 'Du gehst allein');
    }
    function shuffled() {
      var a = alle.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
    D.push('Vor der Tuer', '#ffd24a', 'Die Sonne steht ueber den Eichen. Wer kommt heute mit in den Wald?', [
      { t: 'Ich gehe allein.', r: 'Nur du, dein Schwert und der Wald.', go: function () { setParty([]); } },
      { t: 'Zwei Freunde sollen mit.', r: 'Zu dritt macht der Wald mehr Spass.', go: function () { setParty(shuffled().slice(0, 2)); } },
      { t: 'Die ganze Truppe - alle vier!', r: 'Alle vier ziehen mit dir los!', go: function () { setParty(alle.slice()); } },
      { t: 'Ueberrasch mich.', r: 'Der Wald entscheidet.', go: function () { setParty(shuffled().slice(0, (Math.random() * 5) | 0)); } }
    ]);
    D.begin();
  }

  /* ================= Auto & Stadt ================= */
  function talkCar() {
    if (G.mapKey === 'stadt') {
      D.push('Das Auto', '#e8a54a', 'Der Motor blubbert leise. Zurueck in den Wald?', [
        { t: 'Ja, nach Hause.', r: 'Ihr steigt ein. Die Stadt wird klein im Rueckspiegel.', go: function () { startDrive('wald'); } },
        { t: 'Nein, ich schau mich noch um.', r: 'Das Auto wartet geduldig.' }
      ]);
      D.begin();
      return;
    }
    D.push('Das Auto', '#e8a54a', 'Ein klappriger Wagen aus Holz und Blech. Ab in die Stadt?', [
      { t: 'Ja - mit der ganzen Familie!', r: 'Mama, Papa und Mila springen rein. Es wird eng und laut.',
        go: function () { G.partyKeys = ['mama', 'papa', 'mila']; startDrive('stadt'); } },
      { t: 'Ja, nur wir.', r: 'Tuer zu, Motor an.', go: function () { startDrive('stadt'); } },
      { t: 'Lieber noch nicht.', r: 'Der Wagen bleibt stehen.' }
    ]);
    D.begin();
  }

  /* Mit einem Knopfdruck zur Stadt - die Familie steigt mit ein. */
  function starteFahrt() {
    if (G.state !== 'play') return;
    if (G.mapKey === 'stadt') {
      hint('Zurueck in den Wald!');
      startDrive('wald');
      return;
    }
    G.partyKeys = ['mama', 'papa', 'mila'];
    hint('Die ganze Familie steigt ein!');
    startDrive('stadt');
  }

  function startDrive(to) {
    if (A) A.horn();
    G.state = 'drive';
    G.drive = { t: 0, to: to, x: 90 };
  }

  function updateDrive(dt) {
    G.drive.t += dt;
    if (took('talk') || took('attack')) G.drive.t = Math.max(G.drive.t, 4.2);
    if (G.drive.t > 4.4) {
      var to = G.drive.to;
      G.drive = null;
      G.state = 'play';
      if (to === 'stadt') {
        loadMap('stadt', 26.5, 22);
        hint('Beim Marktstand gibt es Schwerter und Ruestungen!');
        D.push('Mila', Chat.people.mila.color, 'Schau mal, so viele Haeuser! Und die riechen nach Brot!');
        D.begin();
      } else {
        var hatFamilie = G.partyKeys.indexOf('mama') >= 0;
        if (hatFamilie) G.partyKeys = [];
        loadMap('wald', 26.5, 18.5);
        if (hatFamilie) {
          D.push('Zuhause', '#ffd24a', 'Die Familie geht mit den Einkaeufen ins Haus. Du bleibst noch draussen.');
          D.begin();
        }
      }
    }
  }

  function drawDrive() {
    var t = G.drive.t;
    ctx.fillStyle = '#1b2438'; ctx.fillRect(0, 0, VW, VH);
    /* Himmel und Hügel */
    var sky = ctx.createLinearGradient(0, 0, 0, 120);
    sky.addColorStop(0, '#2b3f6b'); sky.addColorStop(1, '#c9713f');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, 120);
    ctx.fillStyle = '#f0d24a'; ctx.fillRect(240, 30, 18, 18);
    ctx.fillStyle = '#2c4a2e';
    for (var i = 0; i < 7; i++) {
      var hx = ((i * 60 - t * 26) % 400 + 400) % 400 - 40;
      S.blob(ctx, hx, 126, 34, '#2c4a2e');
    }
    ctx.fillStyle = '#3a5a3c'; ctx.fillRect(0, 118, VW, 14);
    /* Straße */
    ctx.fillStyle = '#434350'; ctx.fillRect(0, 130, VW, 110);
    ctx.fillStyle = '#3b3b46'; ctx.fillRect(0, 130, VW, 4);
    ctx.fillStyle = '#d8cf8a';
    for (i = 0; i < 9; i++) {
      var lx = ((i * 46 - t * 150) % 420 + 420) % 420 - 50;
      ctx.fillRect(lx, 196, 26, 5);
    }
    /* Auto */
    var bob = Math.sin(t * 18) > 0 ? 0 : 1;
    var car = S.car;
    ctx.save();
    ctx.translate(110, 148 + bob);
    ctx.scale(2, 2);
    ctx.drawImage(car, 0, 0);
    ctx.restore();
    /* Staub */
    ctx.fillStyle = 'rgba(200,190,170,0.5)';
    for (i = 0; i < 6; i++) {
      var dxx = 104 - ((t * 90 + i * 23) % 110);
      ctx.fillRect(dxx, 186 + (i % 3) * 4, 3, 3);
    }
    var txt = G.drive.to === 'stadt' ? 'Unterwegs nach Eichenstadt...' : 'Zurueck zum Eichenwald...';
    var bw = txt.length * 6 + 20;
    box((VW - bw) / 2, 8, bw, 22);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(txt, VW / 2, 23);
    ctx.fillStyle = '#cfc9e6';
    ctx.font = '8px "Courier New", monospace';
    ctx.fillText('Taste druecken zum Ueberspringen', VW / 2, 232);
    ctx.textAlign = 'left';
  }

  /* ================= Game Over ================= */
  function gameOver() {
    G.state = 'over';
    G.overT = 0;
    if (A) A.dead();
  }

  /* ================= Zeichnen ================= */
  function box(x, y, w, h) {
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
  }

  function drawMapTiles() {
    var x0 = Math.max(0, Math.floor(G.camX / TILE));
    var y0 = Math.max(0, Math.floor(G.camY / TILE));
    var x1 = Math.min(G.mapW - 1, Math.ceil((G.camX + VW) / TILE));
    var y1 = Math.min(G.mapH - 1, Math.ceil((G.camY + VH) / TILE));
    for (var y = y0; y <= y1; y++) {
      var row = G.map.rows[y];
      for (var x = x0; x <= x1; x++) {
        var img = S.tiles[row[x]] || S.tiles['.'];
        ctx.drawImage(img, x * TILE - G.camX, y * TILE - G.camY);
      }
    }
  }

  var WHITE = [];
  function whiteCopy(img) {
    for (var i = 0; i < WHITE.length; i++) if (WHITE[i][0] === img) return WHITE[i][1];
    var c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    WHITE.push([img, c]);
    return c;
  }

  function frameOf(e) { return (Math.floor(e.anim) % 2) === 0 ? 0 : 1; }

  function actorFor(key, isZombie) {
    if (!ACT[key]) {
      ACT[key] = isZombie ? S.actor(Chat.zombiePal, 'zombie')
                          : S.actor(Chat.people[key].pal);
    }
    return ACT[key];
  }

  function drawEntity(e) {
    var sx = Math.round(e.x - G.camX), sy = Math.round(e.y - G.camY);
    if (sx < -50 || sx > VW + 50 || sy < -60 || sy > VH + 60) return;

    if (e.type === 'prop') {
      if (!e.spr) return;
      ctx.drawImage(e.spr, sx - (e.spr.width >> 1), sy - e.spr.height);
      return;
    }

    if (e.type === 'pickup') {
      var bild = e.art === 'pilz' ? S.mushroom : S.berries;
      ctx.drawImage(bild, sx - 5, sy - 10 + Math.round(Math.sin(e.anim) * 1.2));
      return;
    }

    if (e.type === 'coin') {
      var cf = Math.floor(e.anim) % 2;
      ctx.drawImage(S.coin[cf], sx - 4, sy - 8 + Math.round(Math.sin(e.anim) * 1.5));
      return;
    }

    if (e.type === 'zombie') {
      var set = actorFor('zombie', true);
      var img = set[e.dir][frameOf(e)];
      if (e.boss) { drawBoss(e, sx, sy); return; }
      if (e.dying) {
        var k = Math.min(1, e.dying / 0.5);
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.translate(0, k * 4);
        ctx.drawImage(img, sx - 8, sy - 16);
        ctx.restore();
        /* zerfallende Pixel */
        ctx.fillStyle = '#7aa85f';
        for (var i = 0; i < 10; i++) {
          var a = i * 1.7;
          ctx.globalAlpha = 1 - k;
          ctx.fillRect(sx - 8 + ((i * 5) % 16), sy - 16 + ((i * 7) % 16) - k * 14, 2, 2);
        }
        ctx.globalAlpha = 1;
        return;
      }
      ctx.drawImage(img, sx - 8, sy - 16);
      if (e.flash > 0) {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(whiteCopy(img), sx - 8, sy - 16);
        ctx.globalAlpha = 1;
      }
      /* Wer schon zuhoert, bekommt ein gelbes Herz */
      if (e.mercy > 0 && !e.spared) {
        ctx.fillStyle = '#ffd24a';
        ctx.font = '8px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('\u2665'.repeat(e.mercy), sx, sy - 19);
        ctx.textAlign = 'left';
      }

      /* kleine Lebensanzeige */
      if (e.hp < 3) {
        ctx.fillStyle = '#1a1420'; ctx.fillRect(sx - 7, sy - 20, 14, 3);
        ctx.fillStyle = '#8fd36a'; ctx.fillRect(sx - 6, sy - 19, (e.hp / 3) * 12, 1);
      }
      return;
    }

    if (e.type === 'npc' && e.hund) {
      ctx.drawImage(S.dog[frameOf(e)], sx - 8, sy - 14);
      ctx.fillStyle = '#d8a45a';
      ctx.font = '8px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Wuffel', sx, sy - 17);
      ctx.textAlign = 'left';
      return;
    }

    if (e.type === 'npc' || e.type === 'friend') {
      var s2 = actorFor(e.key, false);
      ctx.drawImage(s2[e.dir][frameOf(e)], sx - 8, sy - 16);
      if (e.shop) {
        ctx.fillStyle = '#ffd24a';
        ctx.font = '8px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LADEN', sx, sy - 26);
        ctx.textAlign = 'left';
      }
      if (e.type === 'friend' && e.idle) {
        ctx.fillStyle = '#ffd24a';
        ctx.font = '8px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', sx, sy - 19);
        ctx.textAlign = 'left';
      }
      if (e.swing > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy - 8, 12, -0.6, 0.9);
        ctx.stroke();
      }
      return;
    }

    if (e.type === 'player') drawKnight(e, sx, sy);
  }

  /* Werwolf: die Menschen-Vorlage mit Fell und spitzen Ohren */
  var WOLF = null;
  function wolfSet() {
    if (WOLF) return WOLF;
    var base = S.actor({ hair: '#4a4550', skin: '#6b6472', eye: '#d24b4b',
                         shirt: '#3b3644', shirtDark: '#2a2632',
                         pants: '#241f2c', boots: '#17131f' });
    WOLF = {};
    var dirs = ['down', 'up', 'left', 'right'];
    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      WOLF[d] = [S.withEars(base[d][0], '#4a4550'), S.withEars(base[d][1], '#4a4550')];
    }
    return WOLF;
  }

  function bossImage(e) {
    var art = e.boss.art, f = frameOf(e);
    if (art === 'spider') return S.spider[f];
    if (art === 'treant') return S.treant;
    if (art === 'wolf') return wolfSet()[e.dir][f];
    return actorFor('zombie', true)[e.dir][f];
  }

  function drawBoss(e, sx, sy) {
    var b = e.boss, s = b.scale;
    var img = bossImage(e);
    var w = img.width * s, h = img.height * s;
    var x = sx - w / 2, y = sy - h;

    /* Wurzeln, die aus dem Boden schiessen */
    if (e.roots > 0) {
      var k = 1 - e.roots / 0.75;
      for (var i = 0; i < 10; i++) {
        var a = i * 0.628, r = 14 + k * 30;
        ctx.fillStyle = i % 2 ? '#5f4026' : '#3d2a18';
        ctx.fillRect(sx + Math.cos(a) * r - 2, sy + Math.sin(a) * r * 0.6 - 6, 4, 8);
      }
    }

    if (e.dying) {
      var d = Math.min(1, e.dying / 0.5);
      ctx.globalAlpha = 1 - d;
      ctx.drawImage(img, x, y + d * 6, w, h);
      ctx.globalAlpha = 1;
      return;
    }

    ctx.drawImage(img, x, y, w, h);
    if (b.art === 'zombie') {
      var crown = S.crown;
      ctx.drawImage(crown, sx - crown.width * s / 2, y - crown.height * s * 0.55,
                    crown.width * s, crown.height * s);
    }
    if (e.flash > 0) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(whiteCopy(img), x, y, w, h);
      ctx.globalAlpha = 1;
    }
    if (e.rage) {
      ctx.fillStyle = 'rgba(226,58,58,0.25)';
      ctx.fillRect(x, y, w, h);
    }
  }

  var DIRDEG = { right: 0, down: 90, left: 180, up: 270 };
  var HAND = { right: [4, -9], left: [-4, -9], down: [5, -7], up: [-5, -10] };

  function swordAngle(p) {
    var base = DIRDEG[p.dir];
    if (!p.atk) return base - 70 + (p.moving ? Math.sin(p.anim * 2) * 5 : 0);
    var k = Math.min(1, p.atk.t / 0.28);
    var ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    return base - 105 + 150 * ease;
  }

  function drawSword(p, sx, sy) {
    var h = HAND[p.dir];
    var hx = sx + h[0], hy = sy + h[1];
    var deg = swordAngle(p);
    var rad = (deg + 90) * Math.PI / 180;

    if (p.atk && p.atk.t > 0.04 && p.atk.t < 0.26) {
      var base = DIRDEG[p.dir];
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx, hy, 15, (base - 105) * Math.PI / 180, deg * Math.PI / 180);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(180,220,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx, hy, 19, (base - 105) * Math.PI / 180, deg * Math.PI / 180);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(rad);
    ctx.drawImage(S.swordFor(G.swordLevel), -2, -12);
    ctx.restore();
  }

  function drawKnight(p, sx, sy) {
    var img = S.knightFor(G.armorLevel)[p.dir][frameOf(p)];
    var blink = p.invuln > 0 && (Math.floor(p.invuln * 14) % 2 === 0);
    if (blink) ctx.globalAlpha = 0.35;
    if (p.dir === 'up') drawSword(p, sx, sy);
    ctx.drawImage(img, sx - 8, sy - 16);
    if (p.dir !== 'up') drawSword(p, sx, sy);
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    /* Herzen: jedes Herz sind zwei Haelften */
    var p = G.player;
    var anzahl = Math.ceil(p.maxhp / 2);
    for (var i = 0; i < anzahl; i++) {
      var x = 6 + i * 9, rest = p.hp - i * 2;
      ctx.globalAlpha = 0.22;
      ctx.drawImage(S.heart, x, 6);            /* leeres Herz als Umriss */
      ctx.globalAlpha = 1;
      if (rest >= 2) {
        ctx.drawImage(S.heart, x, 6);
      } else if (rest === 1) {
        /* nur die linke Haelfte = ein halbes Herz */
        ctx.drawImage(S.heart, 0, 0, 4, S.heart.height, x, 6, 4, S.heart.height);
      }
    }
    ctx.globalAlpha = 1;
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('HP ' + p.hp + '/' + p.maxhp, 10 + anzahl * 9, 13);

    /* Zombiezähler (zweite Zeile, damit der Musikknopf nichts verdeckt) */
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8fd36a';
    ctx.fillText('Zombies: ' + G.kills, VW - 6, 23);
    ctx.fillStyle = '#ffd24a';
    ctx.fillText(G.coins + ' Muenzen', VW - 6, 33);
    if (G.spared > 0) {
      ctx.fillStyle = '#8fd0e0';
      ctx.fillText('Verschont: ' + G.spared, VW - 6, 43);
    }
    if (G.pilze || G.beeren) {
      ctx.fillStyle = '#c8c2e0';
      ctx.fillText(G.pilze + ' Pilze  ' + G.beeren + ' Beeren', VW - 6, 53);
    }
    ctx.textAlign = 'left';
    ctx.drawImage(S.coin[0], VW - 6 - ctx.measureText(G.coins + ' Muenzen').width - 10, 26);

    /* Begleiter */
    var names = [];
    for (var j = 0; j < G.party.length; j++) {
      var pp = Chat.people[G.party[j].key];
      names.push(pp.kurz || pp.name);
    }
    if (names.length) {
      ctx.fillStyle = '#c8c2e0';
      ctx.fillText('Dabei: ' + names.join(', '), 6, 23);
    }

    /* Lebensbalken des Bosses */
    if (G.boss && !G.boss.dying) {
      var b = G.boss, bw = 176, bx = (VW - bw) / 2, by = 32;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff9a8a';
      ctx.fillText(b.boss.name.toUpperCase(), VW / 2, by - 3);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1a1420'; ctx.fillRect(bx - 1, by, bw + 2, 7);
      ctx.fillStyle = '#3b2028'; ctx.fillRect(bx, by + 1, bw, 5);
      var anteil = Math.max(0, b.hp) / b.maxhp;
      ctx.fillStyle = '#e03a3a'; ctx.fillRect(bx, by + 1, bw * anteil, 5);
      ctx.fillStyle = '#ff9a8a'; ctx.fillRect(bx, by + 1, bw * anteil, 2);
    }

    /* Fassungsnummer immer in der Ecke */
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = 'rgba(207,201,230,0.45)';
    ctx.textAlign = 'right';
    ctx.fillText('F' + FASSUNG, VW - 4, VH - 4);
    ctx.textAlign = 'left';

    /* Kleiner Hinweis, bis der Stick einmal benutzt wurde */
    if (stick && !stick.used && G.state === 'play' && !D.isOpen()) {
      var puls = 0.55 + 0.45 * Math.abs(Math.sin(G.time * 2));
      ctx.globalAlpha = puls;
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = '#cfc9e6';
      ctx.fillText('Finger aufs Bild legen und ziehen zum Laufen', 8, VH - 10);
      ctx.globalAlpha = 1;
    }

    /* Laufender Auftrag */
    if (G.quest) {
      ctx.fillStyle = G.quest.fertig ? '#8fd36a' : '#c8c2e0';
      ctx.fillText(G.quest.fertig
        ? 'Auftrag geschafft: zu Papa!'
        : 'Auftrag: ' + G.quest.text + ' (' + Math.min(G.quest.stand, G.quest.ziel) + '/' + G.quest.ziel + ')',
        6, 33);
    }

    /* Ortsname / Hinweis */
    if (G.hintT > 0) {
      ctx.globalAlpha = Math.min(1, G.hintT);
      var w = G.hint.length * 6 + 16;
      box((VW - w) / 2, 30, w, 18);
      ctx.fillStyle = '#fff';
      ctx.font = '10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(G.hint, VW / 2, 43);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  function drawTitle() {
    ctx.fillStyle = '#08070e'; ctx.fillRect(0, 0, VW, VH);
    /* Sterne */
    for (var i = 0; i < 40; i++) {
      var r = (i * 9301 + 49297) % 233280 / 233280;
      var r2 = (i * 4913 + 7919) % 104729 / 104729;
      ctx.fillStyle = i % 5 === 0 ? '#ffd24a' : '#4a4560';
      ctx.fillRect((r * VW) | 0, (r2 * 110) | 0, 1, 1);
    }
    /* Bäume als Silhouette */
    ctx.globalAlpha = 0.9;
    for (i = 0; i < 8; i++) ctx.drawImage(S.pine, i * 42 - 6, 96);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#111019'; ctx.fillRect(0, 130, VW, VH - 130);
    ctx.fillStyle = '#1b1a26'; ctx.fillRect(0, 130, VW, 3);

    /* Ritter in der Mitte */
    var p = { dir: 'down', anim: G.time * 2, atk: null, moving: false, invuln: 0 };
    ctx.save(); ctx.translate(VW / 2, 150); ctx.scale(3, 3);
    ctx.drawImage(S.knightFor(G.armorLevel).down[(Math.floor(G.time * 2) % 2)], -8, -16);
    ctx.restore();
    ctx.save(); ctx.translate(VW / 2 + 13, 126); ctx.scale(3, 3);
    ctx.rotate(20 * Math.PI / 180);
    ctx.drawImage(S.swordFor(G.swordLevel), -2, -12);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 34px "Courier New", monospace';
    ctx.fillText('OAKBLADE', VW / 2, 54);
    ctx.fillStyle = '#8fd36a';
    ctx.font = '9px "Courier New", monospace';
    ctx.fillText('ein Pixel-Abenteuer mit Familie, Freunden', VW / 2, 76);
    ctx.fillText('und viel zu vielen Zombies', VW / 2, 88);
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText('FASSUNG ' + FASSUNG + ' - SPEICHERT JETZT', VW / 2, 106);

    ctx.fillStyle = (Math.floor(G.time * 1.6) % 2) ? '#fff' : '#7a748f';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText('[ Enter / Tippen zum Starten ]', VW / 2, 200);
    ctx.fillStyle = '#6a6480';
    ctx.font = '8px "Courier New", monospace';
    ctx.fillText('Laufen: Joystick unten links ziehen (oder irgendwo aufs Bild)', VW / 2, 216);
    ctx.fillText('Schlagen: roter Knopf / Leertaste   Reden: E   Weiter: tippen', VW / 2, 227);

    ctx.textAlign = 'left';
  }

  function drawOver() {
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.9, G.overT) + ')';
    ctx.fillRect(0, 0, VW, VH);
    if (G.overT < 0.4) return;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e03a3a';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('DU BIST UMGEFALLEN', VW / 2, 100);
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText('Die Zombies waren zu viele.', VW / 2, 122);
    ctx.fillText('Deine Familie traegt dich nach Hause...', VW / 2, 136);
    ctx.textAlign = 'left';
  }

  /* ================= Speichern =================
     Zwei Wege, damit der Stand nicht mehr verloren geht:
     1. localStorage - klappt im Browser, wird aber auf dem iPhone
        in der Vorschau (iframe) gerne geloescht.
     2. die Wolke der Vorschau (claude.use('db')) - die bleibt,
        auch wenn man die Vorschau schliesst oder das Geraet wechselt.  */
  var WOLKE = null;          /* Dokument in der Wolke, wenn vorhanden */
  var wolkeBereit = false;   /* erst nach dem ersten Lesen darf geschrieben werden */
  var wolkeOffen = false;    /* gerade laeuft ein Schreibvorgang */
  var wolkeWartet = null;    /* letzter Stand, der noch hoch muss */

  function standDaten() {
    return {
      kills: G.kills, coins: G.coins,
      schwert: G.swordLevel, ruestung: G.armorLevel,
      maxhp: G.player ? G.player.maxhp : (G.maxhpGesichert || 10),
      pilze: G.pilze, beeren: G.beeren, spared: G.spared,
      pets: G.pets, hundBonus: G.hundBonus,
      bosse: G.bossesBeaten,
      gespeichert: Date.now()
    };
  }

  function standAnwenden(d) {
    if (!d) return;
    G.kills = d.kills || 0;
    G.coins = d.coins || 0;
    G.swordLevel = d.schwert || 0;
    G.armorLevel = d.ruestung || 0;
    G.pilze = d.pilze || 0;
    G.beeren = d.beeren || 0;
    G.spared = d.spared || 0;
    G.pets = d.pets || 0;
    G.hundBonus = !!d.hundBonus;
    if (typeof d.bosse === 'number') G.bossesBeaten = d.bosse;
    var mh = Math.max(10, Math.min(20, d.maxhp || 10));
    G.maxhpGesichert = mh;          /* wird beim Erschaffen des Ritters gesetzt */
    if (G.player) {
      G.player.maxhp = mh;
      G.player.hp = mh;
    }
  }

  function save() {
    var d = standDaten();
    try { localStorage.setItem('oakblade_stand', JSON.stringify(d)); } catch (e) { }
    wolkeSchreiben(d);
  }

  /* schreibt hoechstens alle 1.2 Sekunden, sammelt alles dazwischen ein */
  function wolkeSchreiben(d) {
    if (!WOLKE || !wolkeBereit) return;
    wolkeWartet = d;
    if (wolkeOffen) return;
    wolkeOffen = true;
    setTimeout(function () {
      var w = wolkeWartet; wolkeWartet = null;
      var fertig = function () {
        wolkeOffen = false;
        if (wolkeWartet) wolkeSchreiben(wolkeWartet);
      };
      try { WOLKE.set(w).then(fertig, fertig); } catch (e) { fertig(); }
    }, 1200);
  }

  function load() {
    var lokal = null;
    try {
      var roh = localStorage.getItem('oakblade_stand');
      if (roh) lokal = JSON.parse(roh);
    } catch (e) { lokal = null; }
    if (lokal) standAnwenden(lokal);

    /* und jetzt noch in der Wolke nachschauen */
    var lokalZeit = (lokal && lokal.gespeichert) || 0;
    if (!global.claude || typeof global.claude.use !== 'function') return;
    try {
      global.claude.use('db').then(function (db) {
        if (!db) return;
        WOLKE = db.doc('spielstand/ritter');
        return WOLKE.get().then(function (snap) {
          if (snap && snap.exists) {
            var d = snap.data();
            /* der neuere Stand gewinnt */
            if (d && (d.gespeichert || 1) >= lokalZeit) standAnwenden(d);
          }
          wolkeBereit = true;
          save();                     /* gleich einmal hochladen */
        });
      }).then(null, function () { });
    } catch (e) { }
  }

  /* ================= Schleife ================= */
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    G.time += dt;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    updateControls();

    /* Dialog hat Vorrang */
    D.update(dt);
    if (D.isOpen()) {
      if (took('up')) D.move(-1);
      if (took('down')) D.move(1);
      if (took('talk') || took('attack')) D.press();
    }

    if (G.state === 'kampf') {
      if (took('left')) Kampf.taste('left');
      if (took('right')) Kampf.taste('right');
      if (took('talk') || took('attack')) Kampf.taste('ok');
    }

    if (G.state === 'title') {
      if (took('talk') || took('attack')) startGame();
      return;
    }
    if (G.state === 'kampf') { Kampf.update(dt); return; }
    if (G.state === 'drive') { updateDrive(dt); return; }
    if (G.state === 'over') {
      G.overT += dt;
      if (G.overT > 3) {
        G.state = 'play';
        G.player.hp = G.player.maxhp;
        G.player.invuln = 1.5;
        leaveParty();
        loadMap('haus', 10.5, 9.5);
        D.push('Mama Edda', Chat.people.mama.color, 'Du bist wach! Du hast uns vielleicht erschreckt. Erst Eintopf, dann Abenteuer.');
        D.begin();
      }
      return;
    }

    /* Blende beim Tuerwechsel */
    if (G.fadeTo) {
      G.fade += dt * 3.2;
      if (G.fade >= 1 && G.fadeTo) {
        var fn = G.fadeTo; G.fadeTo = null;
        fn();
      }
    } else if (G.fade > 0) {
      G.fade = Math.max(0, G.fade - dt * 3.2);
    }

    /* Auto-Knopf: sofort losfahren, kein Suchen noetig */
    if (took('auto') && !D.isOpen()) starteFahrt();

    if (!D.isOpen() && took('talk')) tryTalk();

    updatePlayer(dt);

    var ci = 0;
    for (var i = G.ents.length - 1; i >= 0; i--) {
      var e = G.ents[i];
      if (e.type === 'zombie') {
        updateZombie(e, dt);
        if (e.dying > 0.55) G.ents.splice(i, 1);
      } else if (e.type === 'coin') {
        updateCoin(e, dt);
        if (e.weg) G.ents.splice(i, 1);
      } else if (e.type === 'pickup') {
        updatePickup(e, dt);
        if (e.weg) G.ents.splice(i, 1);
      }
    }
    for (i = 0; i < G.ents.length; i++) {
      var e2 = G.ents[i];
      if (e2.type === 'friend' && !e2.idle) { updateCompanion(e2, dt, ci); ci++; }
      else if (e2.type === 'npc') updateNPC(e2, dt);
    }

    /* Zombies nachwachsen lassen */
    if (G.map.zombies && G.state === 'play') {
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        G.spawnT = (istNacht() ? 3 : 5) + Math.random() * 4;
        if (countZombies() < (istNacht() ? 10 : 7)) spawnZombie();
      }
      /* Nach ein paar erledigten Zombies kommt ein Boss - jedes Mal ein anderer */
      if (!G.boss && G.killsSinceBoss >= 6 && !D.isOpen()) spawnBoss();

      /* Pilze und Beeren wachsen nach */
      G.sammelT -= dt;
      if (G.sammelT <= 0) {
        G.sammelT = 10 + Math.random() * 8;
        if (countPickups() < 12) sammelStueckSetzen();
      }
    }

    /* Musik im Kampf */
    if (G.map.zombies) {
      var nah = false;
      for (i = 0; i < G.ents.length; i++) {
        if (G.ents[i].type === 'zombie' && !G.ents[i].dying && dist(G.ents[i], G.player) < 70) { nah = true; break; }
      }
      if (A) A.music(G.boss ? 'boss' : (nah ? 'kampf' : G.map.music));
      G.danger = nah;
    } else G.danger = false;

    Chat.update(dt, G);

    /* Die Zeit vergeht nur draussen */
    if (G.mapKey === 'wald') {
      var vorher = istNacht();
      G.zeit = (G.zeit + dt / 240) % 1;
      if (!vorher && istNacht()) hint('Es wird dunkel - mehr Zombies, doppelte Muenzen!');
      if (vorher && !istNacht()) hint('Die Sonne geht auf.');
    }

    if (G.hintT > 0) G.hintT -= dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 12);

    /* Kamera */
    G.camX = Math.max(0, Math.min(G.mapW * TILE - VW, G.player.x - VW / 2));
    G.camY = Math.max(0, Math.min(G.mapH * TILE - VH, G.player.y - VH / 2));
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (G.state === 'title') { drawTitle(); return; }

    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    if (G.state === 'kampf') { Kampf.draw(); return; }
    if (G.state === 'drive') { drawDrive(); return; }

    if (G.shake > 0) {
      ctx.setTransform(1, 0, 0, 1,
        (Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    }

    drawMapTiles();

    /* alles nach Tiefe sortiert zeichnen */
    var list = G.ents.slice().sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < list.length; i++) drawEntity(list[i]);

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    /* Tag und Nacht */
    var tz = (G.mapKey === 'wald') ? tageszeitFarbe() : null;
    if (tz) {
      ctx.fillStyle = tz.farbe + tz.staerke.toFixed(2) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }

    /* Innen-Stimmung */
    if (G.mapKey === 'haus') {
      ctx.fillStyle = 'rgba(60,30,10,0.10)';
      ctx.fillRect(0, 0, VW, VH);
    }

    drawHUD();

    if (G.fade > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, G.fade) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
    if (G.state === 'over') drawOver();
  }

  /* ================= Start ================= */
  function startGame() {
    G.state = 'play';
    G.partyKeys = [];
    loadMap('haus', 10.5, 9.5);
    D.push('Mama Edda', Chat.people.mama.color,
      'Guten Morgen, mein Ritter! Draussen im Wald soll es wieder Zombies geben.');
    D.push('Papa Gunnar', Chat.people.papa.color,
      'Nimm dein Schwert mit. Und frag die Freunde vor der Tuer, ob sie mitkommen.');
    D.push('Mila', Chat.people.mila.color,
      'Und wenn du zurueck bist, fahren wir alle mit dem Auto in die Stadt! Versprochen!');
    D.begin();
  }

  function resize() {
    var stage = document.getElementById('stage');
    var s = Math.min(global.innerWidth / VW, global.innerHeight / VH) * 0.98;
    stage.style.transform = 'scale(' + s + ')';
  }

  function init() {
    S.build();
    D.init();
    bindTouch();
    bindStick();

    /* Das Kampf-Fenster bekommt alles, was es braucht */
    if (global.Kampf) {
      Kampf.init({
        ctx: ctx, S: S, D: D, A: A, G: G, VW: VW, VH: VH,
        keys: keys,
        stick: function () { return stick; },
        bossBild: bossBild,
        onSieg: function (b) { bossBelohnung(b, false); },
        onVerschont: function (b) { bossBelohnung(b, true); },
        onTod: function () { gameOver(); }
      });
    }
    load();
    resize();
    /* wenn man die Seite verlaesst oder wegwischt: schnell noch sichern */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) save();
    });
    global.addEventListener('pagehide', function () { save(); });
    global.addEventListener('resize', resize);
    global.addEventListener('orientationchange', resize);

    document.getElementById('sound').addEventListener('click', function () {
      var on = A.toggle();
      this.classList.toggle('off', !on);
    });
    document.getElementById('sound').classList.add('off');

    /* kleine Startabkuerzung zum Testen: ?map=stadt */
    var q = (location.search || '').match(/map=(\w+)/);
    if (q && MAPS[q[1]]) {
      G.state = 'play';
      G.partyKeys = q[1] === 'stadt' ? ['mama', 'papa', 'mila'] : ['lisbeth', 'momo'];
      var sp = MAPS[q[1]]().spawn;
      loadMap(q[1], sp.x, sp.y);
    }

    if (S.warnings.length) console.warn('Sprite-Hinweise:', S.warnings.slice(0, 12));
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
