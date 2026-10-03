/* Klang für „Der letzte Bus“ – alles live im Browser erzeugt (Web Audio),
   keine Sounddateien nötig. */
const Klang = (() => {
  let ctx = null, out, motorGain, motorFilter, regenGain, droneGain;
  let stumm = false;
  try { stumm = localStorage.getItem('derletztebus.stumm') === '1'; } catch (e) { /* egal */ }

  function rauschen(sek) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sek), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function start() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = stumm ? 0 : 0.9;
    out.connect(ctx.destination);

    // Motor: tiefes, brummendes Sägezahn-Paar mit leichtem Wabern
    motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.value = 150;
    motorFilter.Q.value = 3;
    motorGain = ctx.createGain();
    motorGain.gain.value = 0;
    [[38, 'sawtooth', 0.5], [38.7, 'sawtooth', 0.5], [76.2, 'square', 0.1]].forEach(([f, typ, v]) => {
      const o = ctx.createOscillator(); o.type = typ; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = v;
      o.connect(g).connect(motorFilter); o.start();
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.35;
    const lfoG = ctx.createGain(); lfoG.gain.value = 22;
    lfo.connect(lfoG).connect(motorFilter.frequency); lfo.start();
    motorFilter.connect(motorGain).connect(out);

    // Regen auf dem Dach
    const regen = ctx.createBufferSource(); regen.buffer = rauschen(2); regen.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    regenGain = ctx.createGain(); regenGain.gain.value = 0;
    regen.connect(hp).connect(lp).connect(regenGain).connect(out); regen.start();

    // Unbehagen: leise, schiefe Töne, die mit jeder Haltestelle lauter werden
    droneGain = ctx.createGain(); droneGain.gain.value = 0;
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 700;
    [[55, 'sine'], [58.3, 'sine'], [82.4, 'triangle'], [116.5, 'sine']].forEach(([f, typ], i) => {
      const o = ctx.createOscillator(); o.type = typ; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 3 ? 0.15 : 0.35;
      const w = ctx.createOscillator(); w.frequency.value = 0.07 + i * 0.05;
      const wg = ctx.createGain(); wg.gain.value = 0.2;
      w.connect(wg).connect(g.gain); w.start();
      o.connect(g).connect(dl); o.start();
    });
    dl.connect(droneGain).connect(out);
  }

  function rampe(param, wert, sek) {
    if (!ctx) return;
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(wert, t + sek);
  }

  function ton(freq, typ, lautst, dauer, verzoegerung = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + verzoegerung;
    const o = ctx.createOscillator(); o.type = typ; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(lautst, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g).connect(out); o.start(t); o.stop(t + dauer + 0.05);
  }

  function zisch(dauer, freq, lautst) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = rauschen(dauer + 0.1);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(lautst, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dauer + 0.1);
  }

  return {
    start,
    motor(stufe, sek = 1.5) {
      if (!ctx) return;
      rampe(motorGain.gain, stufe * 0.32, sek);
      rampe(motorFilter.frequency, 110 + stufe * 90, sek);
    },
    regen(stufe) { if (ctx) rampe(regenGain.gain, stufe * 0.1, 2.5); },
    unbehagen(stufe) { if (ctx) rampe(droneGain.gain, stufe * 0.16, 4); },
    gong() { ton(1318, 'sine', 0.2, 1.4); ton(988, 'sine', 0.2, 1.8, 0.35); },
    tueren() { zisch(1.1, 2400, 0.12); ton(70, 'sine', 0.3, 0.3, 0.9); },
    schreck() {
      ton(41, 'sine', 0.6, 2.2);
      ton(622, 'sawtooth', 0.05, 1.2); ton(659, 'sawtooth', 0.05, 1.2); ton(698, 'sawtooth', 0.04, 1.4);
    },
    klick() { ton(1800, 'square', 0.02, 0.04); },
    tippen() { ton(2600 + Math.random() * 400, 'square', 0.006, 0.015); },
    get stumm() { return stumm; },
    umschalten() {
      stumm = !stumm;
      try { localStorage.setItem('derletztebus.stumm', stumm ? '1' : '0'); } catch (e) { /* egal */ }
      if (ctx) rampe(out.gain, stumm ? 0 : 0.9, 0.3);
      return stumm;
    }
  };
})();
