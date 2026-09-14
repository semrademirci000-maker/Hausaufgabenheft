/* kampf.js – Der Bosskampf im Kampf-Fenster, ganz wie in Undertale.
   Du hast einen Zug (KÄMPFEN / HANDELN / ITEM / SCHONEN), danach greift
   der Boss an und du weichst mit deinem roten Herz den Geschossen aus. */
(function (global) {
  'use strict';

  var W = null;            // Verbindung zum Spiel (wird bei init gesetzt)
  var k = null;            // der laufende Kampf

  /* Das Kampf-Fenster */
  var BOX = { x: 18, y: 78, w: 284, h: 92 };
  var KNOEPFE = ['KAEMPFEN', 'HANDELN', 'ITEM', 'SCHONEN'];

  /* Was man bei welchem Boss alles machen kann */
  var HANDLUNGEN = {
    koenig: [
      { t: 'Krone zurechtruecken', r: 'Du richtest die schiefe Krone. Grauzahn brummt geschmeichelt.' },
      { t: 'Ueber Wuermer reden', r: 'Ihr fachsimpelt ueber Regenwuermer. Er nickt begeistert.' },
      { t: 'Mitstoehnen', r: 'Du machst "Grrraaah". Er macht "Grrraaah". Fast schon ein Duett.' }
    ],
    spinne: [
      { t: 'Das Netz loben', r: 'Du lobst die Netzkunst. Die Nachtweberin wird ganz verlegen.' },
      { t: 'Eine Fliege anbieten', r: 'Du fischst eine Fliege aus der Luft. Sie nimmt sie vorsichtig.' },
      { t: 'Langsam blinzeln', r: 'Ihr blinzelt euch an. Alle acht Augen blinzeln zurueck.' }
    ],
    wolf: [
      { t: 'Hinter den Ohren kraulen', r: 'Mondfell brummt. Das Bein zuckt. Es ist um ihn geschehen.' },
      { t: 'Stoeckchen werfen', r: 'Er rast los. Er kommt mit dem Stock zurueck. Er schaemt sich.' },
      { t: 'Zurueckheulen', r: 'Du heulst. Er heult. Der halbe Wald heult mit.' }
    ],
    knorr: [
      { t: 'Giessen', r: 'Du kippst deine Feldflasche an die Wurzeln. Knorr seufzt wohlig.' },
      { t: 'Blaetter putzen', r: 'Du wischst Staub von den Blaettern. Er glaenzt richtig.' },
      { t: 'Ein Lied summen', r: 'Du summst. Seine Aeste wiegen ganz langsam mit.' }
    ]
  };

  /* --------- Start und Ende --------- */

  function start(bossDaten) {
    k = {
      boss: bossDaten,
      hp: bossDaten.hp * 4,
      maxhp: bossDaten.hp * 4,
      phase: 'text',
      text: bossDaten.spruch,
      auswahl: 0,
      untermenue: null,
      mercy: 0,
      mercyZiel: 3,
      soul: { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 },
      invuln: 0,
      schuesse: [],
      t: 0,
      runde: 0,
      barX: 0, barRichtung: 1,
      ende: null,
      anim: 0
    };
    if (W.A) W.A.music('boss');
  }

  function beenden(wie) {
    var boss = k.boss;
    k = null;
    if (wie === 'sieg') W.onSieg(boss);
    else if (wie === 'verschont') W.onVerschont(boss);
  }

  /* --------- Der eigene Zug --------- */

  function menueWaehlen(nr) {
    if (k.phase !== 'menue') return;
    k.auswahl = nr;
    if (nr === 0) {                       /* KAEMPFEN */
      k.phase = 'balken';
      k.barX = 0; k.barRichtung = 1;
      if (W.A) W.A.blip();
    } else if (nr === 1) {                /* HANDELN */
      k.untermenue = (HANDLUNGEN[k.boss.key] || HANDLUNGEN.koenig).map(function (h) { return h; });
      k.phase = 'untermenue';
      if (W.A) W.A.blip();
    } else if (nr === 2) {                /* ITEM */
      itemBenutzen();
    } else {                              /* SCHONEN */
      schonen();
    }
  }

  function balkenStoppen() {
    var mitte = BOX.w / 2;
    var abstand = Math.abs(k.barX - mitte);
    var guete = Math.max(0.15, 1 - abstand / mitte);        /* je mittiger, desto besser */
    var schaden = Math.round((3 + W.G.swordLevel * 2) * (1 + guete * 2));
    k.hp -= schaden;
    if (W.A) W.A.hit();
    W.G.shake = 4;
    k.phase = 'text';
    k.t = 0;
    k.text = guete > 0.85 ? 'VOLLTREFFER! ' + schaden + ' Schaden!'
           : guete > 0.5 ? 'Guter Treffer! ' + schaden + ' Schaden.'
           : 'Nur gestreift. ' + schaden + ' Schaden.';
    if (k.hp <= 0) { k.ende = 'sieg'; k.text = k.boss.sieg; }
  }

  function handlungWaehlen(nr) {
    var h = k.untermenue[nr];
    if (!h) return;
    k.untermenue = null;
    k.mercy = Math.min(k.mercyZiel, k.mercy + 1);
    k.phase = 'text';
    k.t = 0;
    k.text = h.r + (k.mercy >= k.mercyZiel
      ? '  -  Jetzt kannst du ihn SCHONEN!'
      : '  (' + k.mercy + '/' + k.mercyZiel + ')');
    if (W.A) W.A.select();
  }

  function itemBenutzen() {
    var G = W.G;
    k.phase = 'text';
    k.t = 0;
    if (G.pilze > 0) {
      G.pilze--;
      G.player.hp = Math.min(G.player.maxhp, G.player.hp + 4);
      k.text = 'Du isst einen Pilz. Zwei Herzen zurueck!';
      if (W.A) W.A.heal();
    } else if (G.beeren > 0) {
      G.beeren--;
      G.player.hp = Math.min(G.player.maxhp, G.player.hp + 2);
      k.text = 'Du isst ein paar Beeren. Ein Herz zurueck!';
      if (W.A) W.A.heal();
    } else {
      k.text = 'Deine Taschen sind leer. Nur Fusseln und ein Stein.';
    }
  }

  function schonen() {
    k.phase = 'text';
    k.t = 0;
    if (k.mercy >= k.mercyZiel) {
      k.ende = 'verschont';
      k.text = k.boss.name + ' laesst die Schultern sinken und laechelt schief. Ihr seid fertig hier.';
      if (W.A) W.A.heal();
    } else {
      k.text = 'Noch will er nicht. Sei erst mal nett zu ihm (HANDELN).';
    }
  }

  /* --------- Der Zug des Bosses --------- */

  function angriffStarten() {
    k.phase = 'gegner';
    k.t = 0;
    k.schuesse = [];
    k.soul.x = BOX.x + BOX.w / 2;
    k.soul.y = BOX.y + BOX.h / 2;
    k.runde++;
    k.text = '';
  }

  function schussSetzen(x, y, vx, vy, r, farbe, art) {
    k.schuesse.push({ x: x, y: y, vx: vx, vy: vy, r: r, farbe: farbe, art: art || 'kugel', t: 0 });
  }

  function angriffMuster(dt) {
    var art = k.boss.key;
    k.spawnT = (k.spawnT || 0) - dt;
    if (k.spawnT > 0) return;

    if (art === 'koenig') {                 /* Wuermer regnen herunter */
      k.spawnT = 0.35;
      var x = BOX.x + 10 + Math.random() * (BOX.w - 20);
      schussSetzen(x, BOX.y - 6, 0, 46 + Math.random() * 34, 3, '#8a5a3a', 'wurm');
    } else if (art === 'spinne') {          /* Netzfaeden von den Seiten */
      k.spawnT = 0.45;
      var vonLinks = Math.random() > 0.5;
      var y = BOX.y + 12 + Math.random() * (BOX.h - 24);
      schussSetzen(vonLinks ? BOX.x - 6 : BOX.x + BOX.w + 6, y,
                   (vonLinks ? 1 : -1) * (55 + Math.random() * 35), 0, 3, '#c8c2e0', 'faden');
    } else if (art === 'wolf') {            /* Krallen zielen auf dich */
      k.spawnT = 0.7;
      var sx = Math.random() > 0.5 ? BOX.x - 6 : BOX.x + BOX.w + 6;
      var sy = BOX.y + Math.random() * BOX.h;
      var dx = k.soul.x - sx, dy = k.soul.y - sy;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      schussSetzen(sx, sy, dx / len * 85, dy / len * 85, 4, '#d24b4b', 'kralle');
    } else {                                /* Wurzeln schiessen hoch */
      k.spawnT = 0.8;
      var wx = BOX.x + 12 + Math.random() * (BOX.w - 24);
      schussSetzen(wx, BOX.y + BOX.h + 8, 0, -60, 4, '#5f4026', 'wurzel');
    }
  }

  function seeleBewegen(dt) {
    var dx = 0, dy = 0;
    var stick = W.stick();
    if (stick && stick.active && (stick.x || stick.y)) { dx = stick.x; dy = stick.y; }
    else {
      if (W.keys.left) dx -= 1;
      if (W.keys.right) dx += 1;
      if (W.keys.up) dy -= 1;
      if (W.keys.down) dy += 1;
    }
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) { dx /= len; dy /= len; }

    k.soul.x += dx * 78 * dt;
    k.soul.y += dy * 78 * dt;
    k.soul.x = Math.max(BOX.x + 6, Math.min(BOX.x + BOX.w - 6, k.soul.x));
    k.soul.y = Math.max(BOX.y + 6, Math.min(BOX.y + BOX.h - 6, k.soul.y));
  }

  function schuesseBewegen(dt) {
    for (var i = k.schuesse.length - 1; i >= 0; i--) {
      var s = k.schuesse[i];
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < BOX.x - 20 || s.x > BOX.x + BOX.w + 20 ||
          s.y < BOX.y - 20 || s.y > BOX.y + BOX.h + 20) {
        k.schuesse.splice(i, 1);
        continue;
      }
      if (k.invuln <= 0) {
        var dx = s.x - k.soul.x, dy = s.y - k.soul.y;
        if (dx * dx + dy * dy < (s.r + 4) * (s.r + 4)) {
          k.invuln = 0.9;
          W.G.player.hp -= k.boss.dmg;
          W.G.shake = 4;
          if (W.A) W.A.hurt();
          if (W.G.player.hp <= 0) { W.G.player.hp = 0; k = null; W.onTod(); return; }
        }
      }
    }
  }

  /* --------- Takt --------- */

  function update(dt) {
    if (!k) return;
    k.anim += dt;
    k.invuln = Math.max(0, k.invuln - dt);

    if (k.phase === 'text') {
      k.t += dt;
      if (k.t > 1.9) {
        if (k.ende) beenden(k.ende);
        else angriffStarten();
      }
    } else if (k.phase === 'balken') {
      k.barX += k.barRichtung * 200 * dt;
      if (k.barX > BOX.w) { k.barX = BOX.w; k.barRichtung = -1; }
      if (k.barX < 0) { k.barX = 0; k.barRichtung = 1; }
    } else if (k.phase === 'gegner') {
      k.t += dt;
      angriffMuster(dt);
      seeleBewegen(dt);
      schuesseBewegen(dt);
      if (!k) return;
      if (k.t > 5.5) {
        k.phase = 'menue';
        k.schuesse = [];
        k.text = k.runde <= 2
          ? k.boss.name + ' wartet auf deinen Zug.\nKAEMPFEN bis sein Balken leer ist - oder dreimal HANDELN und dann SCHONEN.'
          : k.boss.name + ' wartet auf deinen Zug.';
      }
    }
  }

  /* Tippen und Tasten */
  function tippen(gx, gy) {
    if (!k) return false;

    if (k.phase === 'balken') { balkenStoppen(); return true; }
    if (k.phase === 'text') { k.t = 99; return true; }

    if (k.phase === 'untermenue') {
      for (var i = 0; i < k.untermenue.length; i++) {
        var y = BOX.y + 22 + i * 16;
        if (gy > y - 10 && gy < y + 8) { handlungWaehlen(i); return true; }
      }
      k.untermenue = null;                   /* daneben getippt: zurueck */
      k.phase = 'menue';
      return true;
    }

    if (k.phase === 'menue') {
      for (var j = 0; j < 4; j++) {
        var bx = 10 + j * 76;
        if (gx > bx && gx < bx + 72 && gy > 180 && gy < 206) { menueWaehlen(j); return true; }
      }
    }
    return true;
  }

  function taste(was) {
    if (!k) return;
    if (k.phase === 'balken') { balkenStoppen(); return; }
    if (k.phase === 'text') { k.t = 99; return; }
    if (k.phase === 'untermenue') {
      if (was === 'left') k.auswahl = Math.max(0, k.auswahl - 1);
      if (was === 'right') k.auswahl = Math.min(k.untermenue.length - 1, k.auswahl + 1);
      if (was === 'ok') handlungWaehlen(k.auswahl);
      return;
    }
    if (k.phase === 'menue') {
      if (was === 'left') k.auswahl = (k.auswahl + 3) % 4;
      if (was === 'right') k.auswahl = (k.auswahl + 1) % 4;
      if (was === 'ok') menueWaehlen(k.auswahl);
    }
  }

  /* --------- Zeichnen --------- */

  function rahmen(ctx, x, y, w, h, farbe) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = farbe || '#fff';
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x, y, 2, h);
    ctx.fillRect(x + w - 2, y, 2, h);
  }

  function draw() {
    if (!k) return;
    var ctx = W.ctx, VW = W.VW, VH = W.VH, G = W.G;

    ctx.fillStyle = '#05040a';
    ctx.fillRect(0, 0, VW, VH);

    /* Der Boss oben */
    var bild = W.bossBild(k.boss, Math.floor(k.anim * 4) % 2);
    var s = k.boss.art === 'treant' ? 1.4 : 2.2;
    var bw = bild.width * s, bh = bild.height * s;
    var by = 60 - bh;
    ctx.drawImage(bild, VW / 2 - bw / 2, Math.max(2, by), bw, bh);

    /* Name und Lebensbalken des Bosses */
    ctx.font = '8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9a8a';
    ctx.fillText(k.boss.name.toUpperCase(), VW / 2, 67);
    var bbw = 150, bbx = (VW - bbw) / 2;
    ctx.fillStyle = '#3b2028'; ctx.fillRect(bbx, 70, bbw, 5);
    ctx.fillStyle = '#e03a3a';
    ctx.fillRect(bbx, 70, bbw * Math.max(0, k.hp) / k.maxhp, 5);
    ctx.fillStyle = '#ff9a8a';
    ctx.fillRect(bbx, 70, bbw * Math.max(0, k.hp) / k.maxhp, 2);
    ctx.textAlign = 'left';

    /* Das Kampf-Fenster */
    rahmen(ctx, BOX.x, BOX.y, BOX.w, BOX.h);

    if (k.phase === 'gegner') {
      /* Geschosse */
      for (var i = 0; i < k.schuesse.length; i++) {
        var sch = k.schuesse[i];
        ctx.fillStyle = sch.farbe;
        if (sch.art === 'wurzel' || sch.art === 'faden') {
          ctx.fillRect(Math.round(sch.x - sch.r), Math.round(sch.y - sch.r * 2), sch.r * 2, sch.r * 4);
        } else {
          ctx.fillRect(Math.round(sch.x - sch.r), Math.round(sch.y - sch.r), sch.r * 2, sch.r * 2);
          ctx.fillStyle = '#fff';
          ctx.fillRect(Math.round(sch.x - 1), Math.round(sch.y - sch.r), 1, 2);
        }
      }
      /* Das rote Herz - das bist du */
      if (!(k.invuln > 0 && Math.floor(k.invuln * 14) % 2)) {
        ctx.drawImage(W.S.heart, Math.round(k.soul.x - 3), Math.round(k.soul.y - 3));
      }

      /* Erklaerung, solange man noch neu ist */
      if (k.runde <= 2) {
        ctx.font = '8px "Courier New", monospace';
        ctx.fillStyle = '#ffd24a';
        ctx.textAlign = 'center';
        ctx.fillText('Joystick ziehen: dein rotes Herz ausweichen lassen!',
                     W.VW / 2, BOX.y + BOX.h + 11);
        ctx.textAlign = 'left';
      }
    } else if (k.phase === 'balken') {
      ctx.fillStyle = '#c8c2e0';
      ctx.font = '9px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Tippen, wenn der Zeiger in der Mitte ist!', W.VW / 2, BOX.y + 24);
      ctx.textAlign = 'left';
      /* Balken */
      ctx.fillStyle = '#2a2633';
      ctx.fillRect(BOX.x + 8, BOX.y + 44, BOX.w - 16, 22);
      ctx.fillStyle = '#4a4560';
      ctx.fillRect(BOX.x + BOX.w / 2 - 12, BOX.y + 44, 24, 22);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(BOX.x + BOX.w / 2 - 2, BOX.y + 44, 4, 22);
      var zx = BOX.x + 8 + (k.barX / BOX.w) * (BOX.w - 16);
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.round(zx) - 1, BOX.y + 40, 3, 30);
    } else if (k.phase === 'untermenue') {
      ctx.font = '10px "Courier New", monospace';
      for (var j = 0; j < k.untermenue.length; j++) {
        var y = BOX.y + 22 + j * 16;
        ctx.fillStyle = (j === k.auswahl) ? '#ff5a5a' : '#000';
        if (j === k.auswahl) ctx.drawImage(W.S.heart, BOX.x + 10, y - 5);
        ctx.fillStyle = '#fff';
        ctx.fillText(k.untermenue[j].t, BOX.x + 24, y + 3);
      }
    } else {
      /* Text im Fenster */
      ctx.font = '10px "Courier New", monospace';
      ctx.fillStyle = '#fff';
      var zeilen = [];
      var absaetze = String(k.text || '').split('\n');
      for (var a = 0; a < absaetze.length; a++) {
        zeilen = zeilen.concat(umbrechen(absaetze[a], 40));
      }
      for (var z = 0; z < zeilen.length; z++) {
        ctx.fillText(zeilen[z], BOX.x + 10, BOX.y + 22 + z * 13);
      }
    }

    /* Die vier Knoepfe */
    if (k.phase === 'menue') {
      ctx.font = '9px "Courier New", monospace';
      for (var n = 0; n < 4; n++) {
        var bx = 10 + n * 76;
        var aktiv = (n === k.auswahl);
        rahmen(ctx, bx, 180, 72, 26, aktiv ? '#ffd24a' : '#e8a54a');
        ctx.fillStyle = aktiv ? '#ffd24a' : '#e8a54a';
        ctx.textAlign = 'center';
        ctx.fillText(KNOEPFE[n], bx + 36, 197);
        ctx.textAlign = 'left';
      }
    }

    /* Deine Herzen */
    var herzen = Math.ceil(G.player.maxhp / 2);
    for (var h2 = 0; h2 < herzen; h2++) {
      var hx = 10 + h2 * 9, rest = G.player.hp - h2 * 2;
      ctx.globalAlpha = 0.25;
      ctx.drawImage(W.S.heart, hx, 214);
      ctx.globalAlpha = 1;
      if (rest >= 2) ctx.drawImage(W.S.heart, hx, 214);
      else if (rest === 1) ctx.drawImage(W.S.heart, 0, 0, 4, W.S.heart.height, hx, 214, 4, W.S.heart.height);
    }
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('HP ' + G.player.hp + '/' + G.player.maxhp, 14 + herzen * 9, 221);
    if (k.mercy >= k.mercyZiel) {
      ctx.fillStyle = '#ffd24a';
      ctx.textAlign = 'right';
      ctx.fillText('SCHONEN moeglich!', W.VW - 8, 221);
      ctx.textAlign = 'left';
    }
  }

  function umbrechen(text, max) {
    var worte = String(text || '').split(' '), zeilen = [], zeile = '';
    for (var i = 0; i < worte.length; i++) {
      var probe = zeile ? zeile + ' ' + worte[i] : worte[i];
      if (probe.length > max && zeile) { zeilen.push(zeile); zeile = worte[i]; }
      else zeile = probe;
    }
    if (zeile) zeilen.push(zeile);
    return zeilen;
  }

  global.Kampf = {
    init: function (welt) { W = welt; },
    start: start,
    update: update,
    draw: draw,
    tippen: tippen,
    taste: taste,
    aktiv: function () { return !!k; },
    /* nur zum Nachschauen (auch praktisch beim Testen) */
    stand: function () {
      return k ? { phase: k.phase, hp: k.hp, maxhp: k.maxhp, mercy: k.mercy, ende: k.ende } : null;
    }
  };
})(window);
