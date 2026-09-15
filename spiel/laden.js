/* laden.js – der Laden als ganzer Bildschirm.
   Tippt man einen Haendler an, geht hier ein richtiges Schaufenster auf:
   alle Waren untereinander mit Bild, Preis und einem Satz dazu.
   Antippen = kaufen. Die Welt steht so lange still. */
(function (global) {
  'use strict';

  var ctx, S, G, A, VW, VH, API;
  var L = null;                     /* offener Laden oder null */

  var P = { x: 8, y: 10, w: 304, h: 220 };
  var LISTE_Y = 56;                 /* wo die erste Ware anfaengt */
  var ZEILE = 30;                   /* Hoehe einer Zeile */
  var SICHT = 5;                    /* so viele Zeilen passen rein */

  function init(o) {
    ctx = o.ctx; S = o.S; G = o.G; A = o.A;
    VW = o.VW; VH = o.VH; API = o.api;
  }

  function oeffnen(art) {
    L = { art: art, sel: -1, scroll: 0, meldung: '', meldungT: 0, farbe: '#8fd36a', t: 0 };
    frischen();
    if (A) A.select && A.select();
  }

  function frischen() {
    if (!L) return;
    L.waren = API.waren(L.art) || [];
    if (L.sel >= L.waren.length) L.sel = L.waren.length - 1;
    sichtbarMachen();
  }

  function sichtbarMachen() {
    if (L.sel < 0) { L.scroll = Math.max(0, Math.min(L.scroll, Math.max(0, L.waren.length - SICHT))); return; }
    if (L.sel < L.scroll) L.scroll = L.sel;
    if (L.sel > L.scroll + SICHT - 1) L.scroll = L.sel - SICHT + 1;
    var max = Math.max(0, L.waren.length - SICHT);
    if (L.scroll > max) L.scroll = max;
    if (L.scroll < 0) L.scroll = 0;
  }

  function zu() { L = null; }
  function offen() { return !!L; }
  function art() { return L ? L.art : null; }

  function melden(text, farbe) {
    if (!L) return;
    L.meldung = text;
    L.farbe = farbe || '#8fd36a';
    L.meldungT = 2.4;
  }

  /* ---------- Kaufen ---------- */
  function kaufen(i) {
    if (!L || !L.waren[i]) return;
    var w = L.waren[i];
    if (w.fertig) { melden(w.info || 'Das hast du schon.', '#8a8798'); return; }
    if (w.preis > 0 && G.coins < w.preis) {
      melden('Dir fehlen ' + (w.preis - G.coins) + ' Muenzen.', '#ff9a8a');
      if (A) A.hurt && A.hurt();
      return;
    }
    var antwort = API.kaufen(L.art, w.id);
    melden((antwort && antwort.text) || 'Gekauft!', (antwort && antwort.farbe) || '#8fd36a');
    frischen();
  }

  /* ---------- Eingabe ---------- */
  function taste(k) {
    if (!L) return;
    if (k === 'up') { L.sel = Math.max(0, L.sel - 1); sichtbarMachen(); }
    else if (k === 'down') { L.sel = Math.min(L.waren.length - 1, L.sel + 1); sichtbarMachen(); }
    else if (k === 'ok') { if (L.sel < 0) { L.sel = 0; sichtbarMachen(); } else kaufen(L.sel); }
    else if (k === 'zu') zu();
  }

  /* Bildschirmpunkt (schon in Spielkoordinaten) */
  function tippen(x, y) {
    if (!L) return;
    /* Ausserhalb oder auf das Kreuz: zu */
    if (x < P.x || x > P.x + P.w || y < P.y || y > P.y + P.h) { zu(); return; }
    if (x > P.x + P.w - 24 && y < P.y + 20) { zu(); return; }

    /* Eine Zeile wird von oben nach unten gezeichnet - genau da
       darf man auch tippen. (Vorher lag die Treffflaeche 12 Pixel
       zu tief, darum ging das Kaufen per Finger nicht.) */
    var oben = P.y + LISTE_Y - 12;
    var rel = y - oben;
    if (rel >= 0 && rel < SICHT * ZEILE) {
      var i = Math.floor(rel / ZEILE) + L.scroll;
      if (i >= 0 && i < L.waren.length) {
        if (L.sel === i) kaufen(i);       /* zweites Tippen kauft */
        else { L.sel = i; sichtbarMachen(); if (A && A.select) A.select(); }
        return;
      }
    }
    /* Unten blaettern */
    if (y >= P.y + P.h - 28 && L.waren.length > SICHT) {
      var maxS = Math.max(0, L.waren.length - SICHT);
      if (x < P.x + P.w / 2) L.scroll = Math.max(0, L.scroll - 1);
      else L.scroll = Math.min(maxS, L.scroll + 1);
    }
  }

  function update(dt) {
    if (!L) return;
    L.t += dt;
    if (L.meldungT > 0) L.meldungT -= dt;
  }

  /* ---------- Bilder der Waren ---------- */
  function bild(w, x, y) {
    var i = w.icon;
    if (i === 'schwert') { ctx.drawImage(S.swordFor(w.stufe || 0), x + 5, y + 1); return; }
    if (i === 'ruestung') {
      var r = S.knightFor(w.stufe || 0).down[0];
      ctx.drawImage(r, x, y, 16, 16); return;
    }
    if (i === 'herz') { ctx.drawImage(S.heart, x + 4, y + 4); return; }
    if (i === 'pilz') { ctx.drawImage(S.mushroom, x + 3, y + 3); return; }
    if (i === 'beere') { ctx.drawImage(S.berries, x + 3, y + 3); return; }
    if (i === 'trank') {
      ctx.fillStyle = '#d84a6a'; ctx.fillRect(x + 5, y + 4, 6, 10);
      ctx.fillStyle = '#ff9ab0'; ctx.fillRect(x + 5, y + 4, 6, 3);
      ctx.fillStyle = '#8a7050'; ctx.fillRect(x + 6, y + 1, 4, 3);
      return;
    }
    if (i === 'kristall') { ctx.drawImage(S.kristall[0], x + 3, y + 2); return; }
    if (i === 'guertel') {
      ctx.fillStyle = '#6b4626'; ctx.fillRect(x + 1, y + 6, 14, 4);
      ctx.fillStyle = '#d8a43a'; ctx.fillRect(x + 6, y + 5, 4, 6);
      return;
    }
    if (i === 'ring' || i === 'amulett' || i === 'stiefel' || i === 'siegel') {
      ctx.drawImage(S.schmuck[i], x + 3, y + 3); return;
    }
    if (i === 'rolle') {
      ctx.strokeStyle = '#9fe0b0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 5, 0.4, 5.4); ctx.stroke();
      ctx.fillStyle = '#9fe0b0'; ctx.fillRect(x + 11, y + 2, 3, 3);
      return;
    }
    if (i === 'wirbel') {
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 1.6); ctx.stroke();
      ctx.drawImage(S.swordFor(1), x + 6, y - 1, 5, 12);
      return;
    }
    if (i === 'zorn') {
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 1); ctx.lineTo(x + 4, y + 9); ctx.lineTo(x + 8, y + 9);
      ctx.lineTo(x + 6, y + 15); ctx.lineTo(x + 13, y + 6); ctx.lineTo(x + 9, y + 6);
      ctx.closePath(); ctx.fill();
      return;
    }
    if (i === 'brot') {
      ctx.fillStyle = '#c89a52'; ctx.fillRect(x + 2, y + 6, 12, 6);
      ctx.fillStyle = '#e0b878'; ctx.fillRect(x + 3, y + 5, 10, 3);
      ctx.fillStyle = '#8a5c31'; ctx.fillRect(x + 5, y + 7, 1, 3); ctx.fillRect(x + 9, y + 7, 1, 3);
      return;
    }
    /* Standard: ein Muenzsack */
    ctx.drawImage(S.coin[0], x + 4, y + 4);
  }

  /* ---------- Zeichnen ---------- */
  function draw() {
    if (!L) return;
    var h = API.person(L.art);

    /* Alles dahinter abdunkeln */
    ctx.fillStyle = 'rgba(6,5,12,0.86)';
    ctx.fillRect(0, 0, VW, VH);

    /* Rahmen im Undertale-Stil */
    ctx.fillStyle = '#000';
    ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(P.x, P.y, P.w, 3);
    ctx.fillRect(P.x, P.y + P.h - 3, P.w, 3);
    ctx.fillRect(P.x, P.y, 3, P.h);
    ctx.fillRect(P.x + P.w - 3, P.y, 3, P.h);

    /* Kopfzeile: wer verkauft, und wie viel du hast */
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = h.color;
    ctx.fillText(h.name.toUpperCase(), P.x + 10, P.y + 17);
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = '#8a8798';
    ctx.fillText(h.rolle, P.x + 10, P.y + 27);

    /* Muenzen */
    ctx.drawImage(S.coin[Math.floor(L.t * 6) % 2], P.x + P.w - 76, P.y + 8);
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillStyle = '#ffd24a';
    ctx.fillText(String(G.coins), P.x + P.w - 64, P.y + 17);

    /* Schliessen-Kreuz */
    ctx.fillStyle = '#2a2633';
    ctx.fillRect(P.x + P.w - 22, P.y + 6, 15, 14);
    ctx.strokeStyle = '#cfc9e6'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(P.x + P.w - 18, P.y + 10); ctx.lineTo(P.x + P.w - 11, P.y + 16);
    ctx.moveTo(P.x + P.w - 11, P.y + 10); ctx.lineTo(P.x + P.w - 18, P.y + 16);
    ctx.stroke();

    /* Trennlinie */
    ctx.fillStyle = '#3a3448';
    ctx.fillRect(P.x + 6, P.y + 32, P.w - 12, 1);

    /* Die Waren */
    var ende = Math.min(L.waren.length, L.scroll + SICHT);
    for (var i = L.scroll; i < ende; i++) {
      var w = L.waren[i];
      var oben2 = P.y + LISTE_Y - 12 + (i - L.scroll) * ZEILE;
      var y = oben2 + 12;
      var gewaehlt = (i === L.sel);
      var zuTeuer = (w.preis > 0 && G.coins < w.preis);

      if (gewaehlt) {
        ctx.fillStyle = 'rgba(255,210,74,0.16)';
        ctx.fillRect(P.x + 6, oben2, P.w - 12, ZEILE - 2);
        ctx.fillStyle = '#ffd24a';
        ctx.fillRect(P.x + 6, oben2, 2, ZEILE - 2);
      }

      /* Bild */
      ctx.globalAlpha = (w.fertig || zuTeuer) ? 0.45 : 1;
      bild(w, P.x + 12, y - 8);
      ctx.globalAlpha = 1;

      /* Name */
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.fillStyle = w.fertig ? '#6a6480' : (zuTeuer ? '#8a8798' : '#fff');
      ctx.fillText(w.name, P.x + 34, y);

      /* Satz dazu */
      ctx.font = '7px "Courier New", monospace';
      ctx.fillStyle = w.fertig ? '#55506a' : '#9a94b0';
      ctx.fillText(w.info || '', P.x + 34, y + 9);

      /* Preis rechts */
      ctx.textAlign = 'right';
      ctx.font = 'bold 9px "Courier New", monospace';
      if (w.fertig) {
        ctx.fillStyle = '#6a6480';
        ctx.fillText('✓', P.x + P.w - 12, y);
      } else if (w.preis < 0) {
        ctx.fillStyle = '#8fd36a';
        ctx.fillText('+' + (-w.preis), P.x + P.w - 12, y);
      } else {
        ctx.fillStyle = zuTeuer ? '#8a5a5a' : '#ffd24a';
        ctx.fillText(String(w.preis), P.x + P.w - 12, y);
      }
      ctx.textAlign = 'left';

      /* Auf der gewaehlten Zeile steht, was zu tun ist */
      if (gewaehlt && !w.fertig) {
        var kt = w.preis < 0 ? 'VERKAUFEN' : (zuTeuer ? 'ZU TEUER' : 'KAUFEN');
        ctx.font = 'bold 7px "Courier New", monospace';
        var kb = ctx.measureText(kt).width + 10;
        ctx.fillStyle = zuTeuer ? '#3a2a2a' : '#ffd24a';
        ctx.fillRect(P.x + P.w - 12 - kb, y + 3, kb, 10);
        ctx.fillStyle = zuTeuer ? '#a07070' : '#1a1420';
        ctx.textAlign = 'center';
        ctx.fillText(kt, P.x + P.w - 12 - kb / 2, y + 10);
        ctx.textAlign = 'left';
      }

      /* Trennlinie */
      ctx.fillStyle = '#241f30';
      ctx.fillRect(P.x + 10, oben2 + ZEILE - 2, P.w - 20, 1);
    }

    /* Nichts da? */
    if (!L.waren.length) {
      ctx.textAlign = 'center';
      ctx.font = '9px "Courier New", monospace';
      ctx.fillStyle = '#8a8798';
      ctx.fillText('Heute ist nichts im Angebot.', VW / 2, P.y + 90);
      ctx.textAlign = 'left';
    }

    /* Blaetterhinweis */
    if (L.waren.length > SICHT) {
      ctx.textAlign = 'center';
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = '#6a6480';
      ctx.fillStyle = L.scroll > 0 ? '#cfc9e6' : '#3a3448';
      ctx.fillText('◀ zurueck', P.x + 74, P.y + P.h - 24);
      ctx.fillStyle = (L.scroll + SICHT < L.waren.length) ? '#cfc9e6' : '#3a3448';
      ctx.fillText('weiter ▶', P.x + P.w - 74, P.y + P.h - 24);
      ctx.textAlign = 'left';
    }

    /* Meldung oder Fusszeile */
    ctx.textAlign = 'center';
    if (L.meldungT > 0) {
      ctx.globalAlpha = Math.min(1, L.meldungT * 2);
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.fillStyle = L.farbe;
      ctx.fillText(L.meldung, VW / 2, P.y + P.h - 10);
      ctx.globalAlpha = 1;
    } else {
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = '#6a6480';
      ctx.fillText(L.sel < 0 ? 'Eine Ware antippen zum Anschauen'
                             : 'Nochmal tippen = kaufen   |   X schliesst', VW / 2, P.y + P.h - 10);
    }
    ctx.textAlign = 'left';
  }

  global.Laden = {
    init: init, oeffnen: oeffnen, zu: zu, offen: offen, art: art,
    taste: taste, tippen: tippen, update: update, draw: draw,
    frischen: frischen, melden: melden
  };
})(window);
