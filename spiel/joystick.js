/* joystick.js – Virtueller Joystick im Brawl-Stars-Stil.

   Finger irgendwo aufsetzen: der Stick erscheint genau dort und folgt dem
   Daumen. Loslassen blendet ihn wieder aus.

   Wichtig: Es wird sowohl auf Finger- (touch) als auch auf Maus-Ereignisse
   gehorcht. Nur auf "pointer"-Ereignisse zu bauen hat sich als unzuverlässig
   erwiesen – in manchen Umgebungen kommen sie nicht an.

   Ein kurzes Tippen ohne Ziehen ist kein Laufen, sondern ein Tipp: dafür
   gibt es `onTap` (das Spiel liest damit Texte weiter).
*/
(function (global) {
  'use strict';

  class Joystick {

    constructor(options) {
      var o = options || {};
      this.radius = o.radius || 60;
      this.deadZone = o.deadZone != null ? o.deadZone : 0.18;
      this.canStart = o.canStart || function () { return true; };
      this.ignore = o.ignore || function () { return false; };
      this.onTap = o.onTap || null;

      this.x = 0;              // -1 .. 1  (links/rechts)
      this.y = 0;              // -1 .. 1  (oben/unten, + = runter)
      this.active = false;     // Finger liegt auf und der Stick ist sichtbar
      this.used = false;       // schon einmal benutzt (für den Hinweis)

      this._touchId = null;    // welcher Finger zieht gerade
      this._lastTouch = 0;     // wann zuletzt ein Finger/Pointer kam
      this.visible = false;    // wird vom Spiel ein- und ausgeschaltet
      this._down = false;      // Finger liegt auf (auch wenn kein Stick)
      this._origin = { x: 0, y: 0 };
      this._moved = 0;
      this._start = 0;

      var zone = o.zone || document.body;

      this.base = document.createElement('div');
      this.base.style.cssText =
        'position:fixed;width:' + (this.radius * 2) + 'px;height:' + (this.radius * 2) + 'px;' +
        'border-radius:50%;background:rgba(30,28,44,.55);' +
        'border:3px solid rgba(207,201,230,.75);pointer-events:none;' +
        'display:none;z-index:9999;transform:translate(-50%,-50%);';

      this.knob = document.createElement('div');
      this.knob.style.cssText =
        'position:fixed;width:' + this.radius + 'px;height:' + this.radius + 'px;' +
        'border-radius:50%;background:rgba(150,142,205,.9);' +
        'border:3px solid rgba(255,255,255,.85);pointer-events:none;' +
        'display:none;z-index:10000;transform:translate(-50%,-50%);';

      document.body.appendChild(this.base);
      document.body.appendChild(this.knob);

      zone.style.touchAction = 'none';
      document.documentElement.style.touchAction = 'none';

      var self = this;
      global.addEventListener('resize', function () {
        if (!self._down) self._zeigeRuheplatz();
      });

      this._listen(zone);
    }

    /* ---- Ereignisse ----------------------------------------------------
       Es wird auf ALLE Arten gehorcht: pointer, touch und Maus. Welche ein
       Geraet schickt, ist von Browser zu Browser verschieden - und manche
       schicken die eine zum Anfassen und die andere zum Ziehen. Deshalb
       darf jede Art jede laufende Beruehrung fortsetzen; doppelte Meldungen
       schreiben einfach denselben Wert und stoeren nicht.
       Nur echte Maus-Echos nach einer Fingerberuehrung werden verworfen. */
    _listen(zone) {
      var self = this;

      function istEcho(art) {
        return art === 'maus' && (Date.now() - self._lastTouch) < 900;
      }
      function merken(art) {
        if (art !== 'maus') self._lastTouch = Date.now();
      }

      /* 1) Pointer */
      if (global.PointerEvent) {
        zone.addEventListener('pointerdown', function (e) {
          merken('pointer');
          self._begin(e, e, null);
        });
        global.addEventListener('pointermove', function (e) {
          merken('pointer');
          self._drag(e);
        });
        global.addEventListener('pointerup', function () { merken('pointer'); self._stop(); });
        global.addEventListener('pointercancel', function () { merken('pointer'); self._stop(); });
      }

      /* 2) Finger */
      zone.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        if (!t) return;
        merken('touch');
        self._begin(t, e, t.identifier);
      }, { passive: false });

      global.addEventListener('touchmove', function (e) {
        merken('touch');
        var t = self._passenderFinger(e.changedTouches);
        if (!t) return;
        self._drag(t);
        if (e.cancelable) e.preventDefault();
      }, { passive: false });

      var fingerWeg = function (e) {
        merken('touch');
        if (self._touchId === null || self._passenderFinger(e.changedTouches)) self._stop();
      };
      global.addEventListener('touchend', fingerWeg);
      global.addEventListener('touchcancel', fingerWeg);

      /* 3) Maus */
      zone.addEventListener('mousedown', function (e) {
        if (istEcho('maus')) return;
        self._begin(e, e, null);
      });
      global.addEventListener('mousemove', function (e) {
        if (istEcho('maus')) return;
        self._drag(e);
      });
      global.addEventListener('mouseup', function () {
        if (istEcho('maus')) return;
        self._stop();
      });

      global.addEventListener('blur', function () { self.release(); });
    }

    /* Der Stick sitzt in Ruhe unten links - damit man ihn sieht. */
    _ruheplatz() {
      return { x: 30 + this.radius, y: global.innerHeight - 30 - this.radius };
    }

    _zeigeRuheplatz() {
      if (!this.visible) return;
      var platz = this._ruheplatz();
      this.base.style.left = this.knob.style.left = platz.x + 'px';
      this.base.style.top = this.knob.style.top = platz.y + 'px';
      this.base.style.display = this.knob.style.display = 'block';
      this.base.style.opacity = this.knob.style.opacity = '0.45';
    }

    /* Das Spiel sagt, wann gelaufen werden darf. */
    setVisible(sichtbar) {
      if (sichtbar === this.visible) return;
      this.visible = sichtbar;
      if (!sichtbar) {
        this.release();
        this.base.style.display = this.knob.style.display = 'none';
      } else {
        this._zeigeRuheplatz();
      }
    }

    /* Der Finger, der den Stick angefasst hat (falls bekannt). */
    _passenderFinger(liste) {
      if (this._touchId === null) return liste[0] || null;
      for (var i = 0; i < liste.length; i++) {
        if (liste[i].identifier === this._touchId) return liste[i];
      }
      return null;
    }

    _begin(point, event, touchId) {
      if (this._down) return;
      if (this.ignore(point.target)) return;        // Knöpfe haben Vorrang

      this._down = true;
      this._touchId = (touchId === undefined) ? null : touchId;
      this._origin = { x: point.clientX, y: point.clientY };
      this._moved = 0;
      this._start = Date.now();

      if (this.canStart()) {
        this.active = true;
        this.used = true;
        this.base.style.left = this.knob.style.left = point.clientX + 'px';
        this.base.style.top = this.knob.style.top = point.clientY + 'px';
        this.base.style.display = this.knob.style.display = 'block';
        this.base.style.opacity = this.knob.style.opacity = '1';
      }
      if (event && event.cancelable) event.preventDefault();
    }

    _drag(point) {
      if (!this._down) return;

      var dx = point.clientX - this._origin.x;
      var dy = point.clientY - this._origin.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > this._moved) this._moved = dist;
      if (!this.active) return;

      if (dist > this.radius) {
        dx = dx / dist * this.radius;
        dy = dy / dist * this.radius;
      }
      this.knob.style.left = (this._origin.x + dx) + 'px';
      this.knob.style.top = (this._origin.y + dy) + 'px';

      var nx = dx / this.radius, ny = dy / this.radius;
      if (Math.sqrt(nx * nx + ny * ny) < this.deadZone) { this.x = 0; this.y = 0; }
      else { this.x = nx; this.y = ny; }
    }

    _stop() {
      if (!this._down) return;
      var kurz = this._moved < 14 && (Date.now() - this._start) < 600;
      this.release();
      if (kurz && this.onTap) this.onTap();          // getippt statt gezogen
    }

    /* Alles loslassen – auch von aussen aufrufbar. */
    release() {
      this._down = false;
      this.active = false;
      this._touchId = null;
      this.x = this.y = 0;
      if (this.visible) this._zeigeRuheplatz();
      else this.base.style.display = this.knob.style.display = 'none';
    }

    get angle() { return Math.atan2(this.y, this.x); }
    get distance() { return Math.min(1, Math.sqrt(this.x * this.x + this.y * this.y)); }
  }

  global.Joystick = Joystick;
})(window);
