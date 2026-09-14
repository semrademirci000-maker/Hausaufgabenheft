/* joystick.js – Virtueller Joystick im Brawl-Stars-Stil.
   Finger irgendwo aufsetzen: der Stick erscheint genau dort und folgt dem
   Daumen. Loslassen blendet ihn wieder aus.

   Ergänzt gegenüber der einfachen Fassung:
   - kleiner Totbereich in der Mitte (sonst zittert die Figur)
   - `ignore`: auf Knöpfen startet kein Stick
   - `canStart`: das Spiel entscheidet, ob gerade gelaufen werden darf
   - Finger-Ereignisse als Rückfall, falls der Browser keine Pointer kennt
*/
(function (global) {
  'use strict';

  class Joystick {
    constructor(options) {
      var o = options || {};
      this.radius = o.radius || 60;
      this.side = o.side || 'left';          // 'left', 'right' oder 'any'
      this.deadZone = o.deadZone != null ? o.deadZone : 0.18;
      this.canStart = o.canStart || function () { return true; };
      this.ignore = o.ignore || function () { return false; };

      this.x = 0;                 // -1 .. 1  (links/rechts)
      this.y = 0;                 // -1 .. 1  (oben/unten, + = runter)
      this.active = false;
      this.used = false;          // schon einmal benutzt?
      this.pointerId = null;
      this.origin = { x: 0, y: 0 };

      var zone = o.zone || document.body;

      this.base = document.createElement('div');
      this.base.style.cssText =
        'position:fixed;width:' + (this.radius * 2) + 'px;height:' + (this.radius * 2) + 'px;' +
        'border-radius:50%;background:rgba(120,112,170,.18);' +
        'border:2px solid rgba(207,201,230,.45);pointer-events:none;' +
        'display:none;z-index:9999;transform:translate(-50%,-50%);';

      this.knob = document.createElement('div');
      this.knob.style.cssText =
        'position:fixed;width:' + this.radius + 'px;height:' + this.radius + 'px;' +
        'border-radius:50%;background:rgba(207,201,230,.75);' +
        'border:2px solid rgba(255,255,255,.65);pointer-events:none;' +
        'display:none;z-index:10000;transform:translate(-50%,-50%);';

      document.body.appendChild(this.base);
      document.body.appendChild(this.knob);
      zone.style.touchAction = 'none';

      var self = this;

      /* Finger zuerst: touchstart/-move/-end kommen auf jedem Handy und
         iPad verlaesslich an - auch in fremden Rahmen. Der Aufruf von
         preventDefault() verhindert, dass der Browser daraus zusaetzlich
         Maus-Ereignisse baut, es kann also nichts doppelt ausgeloest werden. */
      var hatFinger = ('ontouchstart' in global) ||
                      (global.navigator && global.navigator.maxTouchPoints > 0);

      if (hatFinger) {
        zone.addEventListener('touchstart', function (e) {
          var t = e.changedTouches[0];
          if (t) self._start(t, t.identifier, e);
        }, { passive: false });

        global.addEventListener('touchmove', function (e) {
          for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            if (t.identifier === self.pointerId) {
              self._move(t, t.identifier);
              if (e.cancelable) e.preventDefault();
              return;
            }
          }
        }, { passive: false });

        var fingerWeg = function (e) {
          for (var i = 0; i < e.changedTouches.length; i++) {
            self._end(e.changedTouches[i].identifier);
          }
        };
        global.addEventListener('touchend', fingerWeg);
        global.addEventListener('touchcancel', fingerWeg);
      }

      /* Maus fuer den Rechner */
      zone.addEventListener('mousedown', function (e) { self._start(e, 'maus', e); });
      global.addEventListener('mousemove', function (e) { self._move(e, 'maus'); });
      global.addEventListener('mouseup', function () { self._end('maus'); });
    }

    _inSide(point) {
      if (this.side === 'any') return true;
      return this.side === 'left'
        ? point.clientX < global.innerWidth / 2
        : point.clientX >= global.innerWidth / 2;
    }

    _start(point, id, event) {
      if (this.active || !this._inSide(point)) return;
      if (!this.canStart() || this.ignore(point.target)) return;
      if (event && event.cancelable) event.preventDefault();

      this.active = true;
      this.used = true;
      this.pointerId = id;
      this.origin = { x: point.clientX, y: point.clientY };
      this.base.style.left = this.knob.style.left = point.clientX + 'px';
      this.base.style.top = this.knob.style.top = point.clientY + 'px';
      this.base.style.display = this.knob.style.display = 'block';
    }

    _move(point, id) {
      if (!this.active || id !== this.pointerId) return;
      var dx = point.clientX - this.origin.x;
      var dy = point.clientY - this.origin.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > this.radius) {
        dx = dx / dist * this.radius;
        dy = dy / dist * this.radius;
      }
      this.knob.style.left = (this.origin.x + dx) + 'px';
      this.knob.style.top = (this.origin.y + dy) + 'px';

      var nx = dx / this.radius, ny = dy / this.radius;
      if (Math.sqrt(nx * nx + ny * ny) < this.deadZone) { this.x = 0; this.y = 0; }
      else { this.x = nx; this.y = ny; }
    }

    _end(id) {
      if (!this.active || id !== this.pointerId) return;
      this.active = false;
      this.pointerId = null;
      this.x = this.y = 0;
      this.base.style.display = this.knob.style.display = 'none';
    }

    /* Von aussen abschalten (z.B. wenn ein Gespräch beginnt) */
    release() { this._end(this.pointerId); }

    get angle() { return Math.atan2(this.y, this.x); }
    get distance() { return Math.min(1, Math.sqrt(this.x * this.x + this.y * this.y)); }
  }

  global.Joystick = Joystick;
})(window);
