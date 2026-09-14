/* audio.js – 8-Bit-Musik und Geräusche, komplett im Browser erzeugt. */
(function (global) {
  'use strict';

  var ctx = null, master = null, on = false, songTimer = null, cur = '';

  function start() {
    if (ctx) return;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }

  function note(freq, t, dur, type, vol) {
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(t, dur, vol) {
    if (!ctx) return;
    var len = Math.max(1, (ctx.sampleRate * dur) | 0);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var g = ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(g); g.connect(master);
    src.start(t);
  }

  var N = { C3: 130.8, D3: 146.8, E3: 164.8, F3: 174.6, G3: 196, A3: 220, B3: 246.9,
            C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9,
            C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880 };

  var SONGS = {
    wald: {
      bpm: 104,
      lead: ['E4','G4','A4','G4','E4','D4','E4','.','C4','E4','G4','E4','D4','.','D4','.',
             'E4','G4','A4','B4','C5','B4','A4','G4','E4','G4','E4','D4','C4','.','.','.'],
      bass: ['A3','.','E3','.','A3','.','E3','.','F3','.','C3','.','G3','.','G3','.',
             'A3','.','E3','.','A3','.','E3','.','F3','.','G3','.','A3','.','.','.']
    },
    haus: {
      bpm: 78,
      lead: ['C4','E4','G4','E4','F4','A4','G4','.','E4','G4','C5','G4','F4','E4','D4','.'],
      bass: ['C3','.','G3','.','F3','.','C3','.','C3','.','G3','.','F3','.','G3','.']
    },
    stadt: {
      bpm: 126,
      lead: ['G4','B4','D5','B4','G4','A4','B4','A4','F4','A4','C5','A4','F4','G4','A4','.',
             'E4','G4','B4','G4','E4','F4','G4','F4','D4','F4','A4','F4','G4','.','B4','.'],
      bass: ['G3','G3','D3','D3','G3','G3','D3','D3','F3','F3','C3','C3','F3','F3','C3','C3',
             'E3','E3','B3','B3','E3','E3','B3','B3','D3','D3','A3','A3','G3','G3','G3','.']
    },
    boss: {
      bpm: 132,
      lead: ['A4','.','A4','G4','A4','.','C5','B4','A4','.','E4','F4','G4','.','.','.',
             'A4','.','C5','B4','A4','G4','F4','E4','D4','E4','F4','G4','A4','.','.','.'],
      bass: ['A3','A3','A3','A3','F3','F3','F3','F3','G3','G3','G3','G3','E3','E3','E3','E3',
             'A3','A3','A3','A3','F3','F3','F3','F3','D3','D3','D3','D3','E3','E3','E3','E3']
    },
    kampf: {
      bpm: 150,
      lead: ['E4','E4','G4','E4','A4','G4','E4','D4','E4','E4','C5','B4','A4','G4','E4','.'],
      bass: ['E3','E3','E3','E3','A3','A3','A3','A3','F3','F3','F3','F3','G3','G3','G3','G3']
    }
  };

  function playSong(name) {
    if (!on || !ctx) return;
    var song = SONGS[name] || SONGS.wald;
    var step = 60 / song.bpm / 2;
    var t = ctx.currentTime + 0.06;
    var len = song.lead.length;
    for (var i = 0; i < len; i++) {
      var l = song.lead[i], b = song.bass[i % song.bass.length];
      if (l !== '.') note(N[l], t + i * step, step * 0.92, 'square', 0.14);
      if (b !== '.') note(N[b], t + i * step, step * 1.5, 'triangle', 0.2);
      if (i % 4 === 0) noise(t + i * step, 0.05, 0.1);
      if (i % 4 === 2) noise(t + i * step, 0.03, 0.05);
    }
    songTimer = setTimeout(function () { playSong(cur); }, len * step * 1000 - 40);
  }

  var Audio = {
    isOn: function () { return on; },
    toggle: function () {
      start();
      on = !on;
      if (on) { if (ctx.state === 'suspended') ctx.resume(); playSong(cur || 'wald'); }
      else { clearTimeout(songTimer); }
      return on;
    },
    music: function (name) {
      if (cur === name) return;
      cur = name;
      clearTimeout(songTimer);
      if (on) playSong(name);
    },
    resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume(); },

    /* Geräusche */
    swing: function () { if (!on || !ctx) return; noise(ctx.currentTime, 0.14, 0.16); note(520, ctx.currentTime, 0.07, 'sawtooth', 0.05); },
    hit: function () { if (!on || !ctx) return; var t = ctx.currentTime; note(180, t, 0.09, 'square', 0.22); note(90, t + 0.04, 0.12, 'square', 0.2); noise(t, 0.09, 0.24); },
    dead: function () { if (!on || !ctx) return; var t = ctx.currentTime; note(220, t, 0.1, 'sawtooth', 0.16); note(160, t + 0.09, 0.12, 'sawtooth', 0.14); note(100, t + 0.2, 0.25, 'sawtooth', 0.14); },
    hurt: function () { if (!on || !ctx) return; var t = ctx.currentTime; note(320, t, 0.08, 'sawtooth', 0.2); note(150, t + 0.07, 0.2, 'sawtooth', 0.18); },
    blip: function () { if (!on || !ctx) return; note(760 + Math.random() * 90, ctx.currentTime, 0.025, 'square', 0.055); },
    select: function () { if (!on || !ctx) return; note(660, ctx.currentTime, 0.05, 'square', 0.12); note(990, ctx.currentTime + 0.05, 0.07, 'square', 0.1); },
    door: function () { if (!on || !ctx) return; noise(ctx.currentTime, 0.18, 0.12); note(180, ctx.currentTime, 0.15, 'triangle', 0.1); },
    horn: function () { if (!on || !ctx) return; var t = ctx.currentTime; note(392, t, 0.3, 'square', 0.16); note(330, t, 0.3, 'square', 0.14); },
    coin: function () {
      if (!on || !ctx) return;
      var t = ctx.currentTime;
      note(1046, t, 0.05, 'square', 0.12);
      note(1568, t + 0.05, 0.09, 'square', 0.1);
    },
    heal: function () { if (!on || !ctx) return; var t = ctx.currentTime; note(523, t, 0.1, 'triangle', 0.16); note(659, t + 0.09, 0.1, 'triangle', 0.16); note(784, t + 0.18, 0.22, 'triangle', 0.16); }
  };

  global.Audio8 = Audio;
})(window);
