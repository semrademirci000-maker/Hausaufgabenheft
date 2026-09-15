/* effekte.js – alles, was knallt: Pixelfetzen, Schadenszahlen,
   Schlagringe und die kurze Trefferpause (hit stop).
   Nichts davon kennt das Spiel – es wird nur aufgerufen. */
(function (global) {
  'use strict';

  var teile = [];     /* fliegende Pixel */
  var texte = [];     /* Zahlen und Rufe, die nach oben steigen */
  var ringe = [];     /* Schockwellen */
  var stopT = 0;      /* so lange steht die Welt beim Treffer still */
  var blitzT = 0, blitzFarbe = '#fff';

  var MAX = 220;      /* mehr Pixel gleichzeitig braucht kein Mensch */

  function push(t) {
    if (teile.length >= MAX) teile.shift();
    teile.push(t);
  }

  /* ---------- Pixelfetzen ---------- */
  function funken(x, y, n, farbe, kraft) {
    kraft = kraft || 90;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = kraft * (0.35 + Math.random() * 0.9);
      push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30,
             g: 210, t: 0, leben: 0.32 + Math.random() * 0.4,
             f: farbe || '#fff', gr: Math.random() < 0.3 ? 2 : 1 });
    }
  }

  /* Fetzen in eine Richtung – fuer Treffer */
  function spritzer(x, y, n, farbe, dx, dy) {
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len; dy /= len;
    for (var i = 0; i < n; i++) {
      var streu = (Math.random() - 0.5) * 1.5;
      var vx = dx * Math.cos(streu) - dy * Math.sin(streu);
      var vy = dx * Math.sin(streu) + dy * Math.cos(streu);
      var s = 60 + Math.random() * 130;
      push({ x: x, y: y, vx: vx * s, vy: vy * s - 40,
             g: 240, t: 0, leben: 0.3 + Math.random() * 0.35,
             f: farbe || '#8fd36a', gr: Math.random() < 0.35 ? 2 : 1 });
    }
  }

  /* Staubwoelkchen unter den Fuessen */
  function staub(x, y) {
    push({ x: x + (Math.random() - 0.5) * 6, y: y, vx: (Math.random() - 0.5) * 18,
           vy: -6 - Math.random() * 10, g: 20, t: 0, leben: 0.35,
           f: 'rgba(200,190,170,0.55)', gr: 1 });
  }

  /* Glutstaub in der Nacht, Bluetenblaetter am Tag */
  function schweben(x, y, farbe) {
    push({ x: x, y: y, vx: (Math.random() - 0.5) * 12, vy: -4 - Math.random() * 8,
           g: -4, t: 0, leben: 1.6 + Math.random(), f: farbe, gr: 1, flimmer: true });
  }

  /* ---------- Zahlen und Rufe ---------- */
  function text(x, y, s, farbe, gross) {
    texte.push({ x: x, y: y, s: '' + s, f: farbe || '#fff',
                 t: 0, leben: gross ? 1.1 : 0.75, gross: !!gross,
                 vy: gross ? -22 : -30, vx: (Math.random() - 0.5) * 14 });
  }

  /* ---------- Schockwelle ---------- */
  function ring(x, y, r, farbe, dick) {
    ringe.push({ x: x, y: y, r0: 2, r1: r, t: 0, leben: 0.26,
                 f: farbe || 'rgba(255,255,255,0.9)', d: dick || 2 });
  }

  /* ---------- Trefferpause und Blitz ---------- */
  function stop(s) { if (s > stopT) stopT = s; }
  function blitz(s, farbe) { blitzT = Math.max(blitzT, s); blitzFarbe = farbe || '#fff'; }
  function wartet() { return stopT > 0; }

  function leeren() { teile.length = 0; texte.length = 0; ringe.length = 0; stopT = 0; blitzT = 0; }

  /* ---------- Rechnen ---------- */
  function update(dt) {
    if (stopT > 0) { stopT = Math.max(0, stopT - dt); }
    blitzT = Math.max(0, blitzT - dt);
    var i, p;
    for (i = teile.length - 1; i >= 0; i--) {
      p = teile[i];
      p.t += dt;
      if (p.t >= p.leben) { teile.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += p.g * dt;
      p.vx *= 0.97;
    }
    for (i = texte.length - 1; i >= 0; i--) {
      p = texte[i];
      p.t += dt;
      if (p.t >= p.leben) { texte.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy *= 0.92;
    }
    for (i = ringe.length - 1; i >= 0; i--) {
      p = ringe[i];
      p.t += dt;
      if (p.t >= p.leben) ringe.splice(i, 1);
    }
  }

  /* ---------- Zeichnen (in Weltkoordinaten) ---------- */
  function draw(ctx, camX, camY) {
    var i, p, k;
    for (i = 0; i < ringe.length; i++) {
      p = ringe[i];
      k = p.t / p.leben;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = p.f;
      ctx.lineWidth = p.d;
      ctx.beginPath();
      ctx.arc(Math.round(p.x - camX), Math.round(p.y - camY),
              p.r0 + (p.r1 - p.r0) * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (i = 0; i < teile.length; i++) {
      p = teile[i];
      k = p.t / p.leben;
      ctx.globalAlpha = p.flimmer ? (0.35 + 0.5 * Math.abs(Math.sin(p.t * 9))) * (1 - k)
                                  : Math.min(1, 2.2 - k * 2.2);
      ctx.fillStyle = p.f;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.gr, p.gr);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    for (i = 0; i < texte.length; i++) {
      p = texte[i];
      k = p.t / p.leben;
      ctx.globalAlpha = Math.min(1, 2.4 - k * 2.4);
      ctx.font = (p.gross ? 'bold 11px' : 'bold 9px') + ' "Courier New", monospace';
      var tx = Math.round(p.x - camX), ty = Math.round(p.y - camY);
      ctx.fillStyle = '#000';
      ctx.fillText(p.s, tx + 1, ty + 1);
      ctx.fillStyle = p.f;
      ctx.fillText(p.s, tx, ty);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  /* Weisser Blitz ueber dem ganzen Bild */
  function drawBlitz(ctx, VW, VH) {
    if (blitzT <= 0) return;
    ctx.globalAlpha = Math.min(0.6, blitzT * 3);
    ctx.fillStyle = blitzFarbe;
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;
  }

  global.Fx = {
    funken: funken, spritzer: spritzer, staub: staub, schweben: schweben,
    text: text, ring: ring, stop: stop, blitz: blitz, wartet: wartet,
    update: update, draw: draw, drawBlitz: drawBlitz, leeren: leeren,
    anzahl: function () { return teile.length; }
  };
})(window);
