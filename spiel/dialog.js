/* dialog.js – Textbox im Undertale-Stil: Buchstaben tippen sich einzeln,
   und man kann Antworten auswählen. */
(function (global) {
  'use strict';

  var box, whoEl, txtEl, optsEl, moreEl;

  var D = {
    queue: [],
    node: null,
    full: '',
    shown: 0,
    t: 0,
    speed: 42,          /* Buchstaben pro Sekunde */
    sel: 0,
    open: false,
    onFinish: null
  };

  function el(id) { return document.getElementById(id); }

  D.init = function () {
    box = el('box'); whoEl = el('who'); txtEl = el('txt');
    optsEl = el('opts'); moreEl = el('more');
    box.addEventListener('click', function (e) {
      if (e.target && e.target.classList.contains('opt')) return;
      D.press();
    });
  };

  /* text: String. who: Name. color: Farbe des Namens. opts: [{t:'Antwort', r:'Reaktion'}] */
  D.push = function (who, color, text, opts) {
    D.queue.push({ who: who, color: color || '#ffd24a', text: text, opts: opts || null });
  };
  D.say = function (who, color, text) { D.push(who, color, text); D.begin(); };

  D.begin = function (onFinish) {
    if (onFinish) D.onFinish = onFinish;
    if (!D.node) next();
  };

  function next() {
    if (!D.queue.length) {
      D.open = false;
      box.classList.remove('on');
      D.node = null;
      var f = D.onFinish; D.onFinish = null;
      if (f) f();
      return;
    }
    D.node = D.queue.shift();
    D.full = D.node.text;
    D.shown = 0; D.t = 0; D.sel = 0;
    D.open = true;
    box.classList.add('on');
    whoEl.textContent = D.node.who || '';
    whoEl.style.color = D.node.color || '#ffd24a';
    txtEl.textContent = '';
    optsEl.innerHTML = '';
    moreEl.classList.remove('on');
  }

  function showOptions() {
    optsEl.innerHTML = '';
    if (!D.node.opts) { moreEl.classList.add('on'); return; }
    for (var i = 0; i < D.node.opts.length; i++) {
      (function (i) {
        var d = document.createElement('div');
        d.className = 'opt' + (i === D.sel ? ' sel' : '');
        d.textContent = D.node.opts[i].t;
        d.addEventListener('click', function (ev) {
          ev.stopPropagation();
          D.sel = i; choose();
        });
        optsEl.appendChild(d);
      })(i);
    }
  }

  function markSel() {
    var kids = optsEl.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].className = 'opt' + (i === D.sel ? ' sel' : '');
    }
  }

  function choose() {
    var o = D.node.opts[D.sel];
    if (global.Audio8) Audio8.select();
    var node = D.node;
    D.node = null;
    optsEl.innerHTML = '';
    if (o.r) {
      D.queue.unshift({ who: node.who, color: node.color, text: o.r, opts: null });
    }
    if (o.go) o.go();
    next();
  }

  D.update = function (dt) {
    if (!D.node) return;
    if (D.shown < D.full.length) {
      D.t += dt * D.speed;
      while (D.t >= 1 && D.shown < D.full.length) {
        D.t -= 1; D.shown++;
        var c = D.full[D.shown - 1];
        if (c !== ' ' && global.Audio8 && D.shown % 2 === 0) Audio8.blip();
      }
      txtEl.textContent = D.full.slice(0, D.shown);
      if (D.shown >= D.full.length) showOptions();
    }
  };

  /* Bestätigen / weiter */
  D.press = function () {
    if (!D.node) return;
    if (D.shown < D.full.length) {          /* erst Text komplett zeigen */
      D.shown = D.full.length;
      txtEl.textContent = D.full;
      showOptions();
      return;
    }
    if (D.node.opts) { choose(); return; }
    D.node = null;
    next();
  };

  D.move = function (dir) {
    if (!D.node || !D.node.opts || D.shown < D.full.length) return;
    D.sel = (D.sel + dir + D.node.opts.length) % D.node.opts.length;
    if (global.Audio8) Audio8.blip();
    markSel();
  };

  D.isOpen = function () { return D.open; };
  D.clear = function () { D.queue.length = 0; D.node = null; D.open = false; if (box) box.classList.remove('on'); };

  global.Dialog = D;
})(window);
