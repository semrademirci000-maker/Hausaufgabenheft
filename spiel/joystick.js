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

      this._id = null;
      this._down = false;      // Finger liegt auf (auch wenn kein Stick)
      this._origin = { x: 0, y: 0 };
      this._moved = 0;
      this._start = 0;

      var zone = o.zone || document.body;

      this.base = document.createElement('div');
      this.base.style.cssText =
        'position:fixed;width:' + (this.radius * 2) + 'px;height:' + (this.radius * 2) + 'px;' +
        'border-radius:50%;background:rgba(120,112,170,.20);' +
        'border:2px solid rgba(207,201,230,.45);pointer-events:none;' +
        'display:none;z-index:9999;transform:translate(-50%,-50%);';

      this.knob = document.createElement('div');
      this.knob.style.cssText =
        'position:fixed;width:' + this.radius + 'px;height:' + this.radius + 'px;' +
        'border-radius:50%;background:rgba(207,201,230,.75);' +
        'border:2px solid rgba(255,255,255,.7);pointer-events:none;' +
        'display:none;z-index:10000;transform:translate(-50%,-50%);';

      document.body.appendChild(this.base);
      document.body.appendChild(this.knob);

      zone.style.touchAction = 'none';
      document.documentElement.style.touchAction = 'none';

      this._listen(zone);
    }

    /* ---- Ereignisse: Finger und Maus laufen durch dieselben drei Schritte ---- */
    _listen(zone) {
      var self = this;

      zone.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        if (t) self._begin(t, t.identifier, e);
      }, { passive: false });

      global.addEventListener('touchmove', function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier === self._id) {
            self._drag(t, t.identifier);
            if (e.cancelable) e.preventDefault();
            return;
          }
        }
      }, { passive: false });

      var los = function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          self._stop(e.changedTouches[i].identifier);
        }
      };
      global.addEventListener('touchend', los);
      global.addEventListener('touchcancel', los);

      zone.addEventListener('mousedown', function (e) { self._begin(e, 'maus', e); });
      global.addEventListener('mousemove', function (e) { self._drag(e, 'maus'); });
      global.addEventListener('mouseup', function () { self._stop('maus'); });

      /* Verlässt der Finger das Fenster, wird losgelassen. */
      global.addEventListener('blur', function () { self.release(); });
    }

    _begin(point, id, event) {
      if (this._down) return;
      if (this.ignore(point.target)) return;        // Knöpfe haben Vorrang

      this._down = true;
      this._id = id;
      this._origin = { x: point.clientX, y: point.clientY };
      this._moved = 0;
      this._start = Date.now();

      if (this.canStart()) {
        this.active = true;
        this.used = true;
        this.base.style.left = this.knob.style.left = point.clientX + 'px';
        this.base.style.top = this.knob.style.top = point.clientY + 'px';
        this.base.style.display = this.knob.style.display = 'block';
      }
      if (event && event.cancelable) event.preventDefault();
    }

    _drag(point, id) {
      if (!this._down || id !== this._id) return;

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

    _stop(id) {
      if (!this._down || id !== this._id) return;
      var kurz = this._moved < 14 && (Date.now() - this._start) < 600;
      this.release();
      if (kurz && this.onTap) this.onTap();          // getippt statt gezogen
    }

    /* Alles loslassen – auch von aussen aufrufbar. */
    release() {
      this._down = false;
      this.active = false;
      this._id = null;
      this.x = this.y = 0;
      this.base.style.display = this.knob.style.display = 'none';
    }

    get angle() { return Math.atan2(this.y, this.x); }
    get distance() { return Math.min(1, Math.sqrt(this.x * this.x + this.y * this.y)); }
  }

  global.Joystick = Joystick;
})(window);
