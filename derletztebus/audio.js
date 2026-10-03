// Alle Geräusche für „Der letzte Bus – Nachtkiosk“, live mit Web Audio erzeugt.
// Keine Sounddateien nötig.

let ctx = null, out = null, regenGain = null, summenGain = null, jagdGain = null;
let stumm = false;
try { stumm = localStorage.getItem('derletztebus.stumm') === '1'; } catch (e) { /* egal */ }
let herzTimer = null, dachGain = null, tropfenTimer = null, tropfenBuffer = null;
let letzteAtmo = [-1, -1];

function rauschBuffer(sek) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sek), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function ton(freq, typ, lautst, dauer, verz = 0, gleitZu = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + verz;
  const o = ctx.createOscillator(); o.type = typ; o.frequency.setValueAtTime(freq, t);
  if (gleitZu) o.frequency.exponentialRampToValueAtTime(gleitZu, t + dauer);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(lautst, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  o.connect(g).connect(out); o.start(t); o.stop(t + dauer + 0.05);
}

function rauschen(dauer, freq, q, lautst, verz = 0, anstieg = 0.01) {
  if (!ctx) return;
  const t = ctx.currentTime + verz;
  const s = ctx.createBufferSource(); s.buffer = rauschBuffer(dauer + 0.1);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(lautst, t + anstieg);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dauer + 0.1);
}

function rampe(param, wert, sek) {
  if (!ctx) return;
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(wert, t + sek);
}

export const Ton = {
  start() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    out = ctx.createGain(); out.gain.value = stumm ? 0 : 0.85; out.connect(ctx.destination);

    // Regen: weiches (rosa) Rauschen statt hartem Zischen, darüber einzelne Tropfen
    const rosa = (sek) => {
      const b = ctx.createBuffer(2, Math.floor(ctx.sampleRate * sek), ctx.sampleRate);
      for (let k = 0; k < 2; k++) {
        const d = b.getChannelData(k);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < d.length; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        }
      }
      return b;
    };
    regenGain = ctx.createGain(); regenGain.gain.value = 0;
    regenGain.connect(out);
    const r = ctx.createBufferSource(); r.buffer = rosa(4); r.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 250;
    const weich = ctx.createBiquadFilter(); weich.type = 'lowpass'; weich.frequency.value = 5200;
    r.connect(hp).connect(weich).connect(regenGain); r.start();
    // Prasseln auf dem Dach (im Kiosk lauter)
    dachGain = ctx.createGain(); dachGain.gain.value = 0;
    dachGain.connect(out);
    tropfenTimer = setInterval(() => {
      if (!ctx || stumm) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const w = t + Math.random() * 0.1;
        const s = ctx.createBufferSource(); s.buffer = tropfenBuffer || (tropfenBuffer = rauschBuffer(0.05));
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 4500; f.Q.value = 3 + Math.random() * 4;
        const g = ctx.createGain();
        const laut = 0.02 + Math.random() * 0.06;
        g.gain.setValueAtTime(laut, w); g.gain.exponentialRampToValueAtTime(0.0001, w + 0.02 + Math.random() * 0.03);
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) { pan.pan.value = Math.random() * 2 - 1; s.connect(f).connect(g).connect(pan).connect(regenGain); }
        else s.connect(f).connect(g).connect(regenGain);
        s.start(w); s.stop(w + 0.06);
        if (Math.random() < 0.5) {
          const d = ctx.createBufferSource(); d.buffer = tropfenBuffer;
          const df = ctx.createBiquadFilter(); df.type = 'bandpass'; df.frequency.value = 500 + Math.random() * 900; df.Q.value = 2;
          const dg = ctx.createGain(); const dw = t + Math.random() * 0.1;
          dg.gain.setValueAtTime(0.05 + Math.random() * 0.08, dw); dg.gain.exponentialRampToValueAtTime(0.0001, dw + 0.05);
          d.connect(df).connect(dg).connect(dachGain); d.start(dw); d.stop(dw + 0.07);
        }
      }
    }, 100);

    // Summen der Neonröhre
    summenGain = ctx.createGain(); summenGain.gain.value = 0;
    [100, 200, 300].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.012 / (i + 1);
      o.connect(g).connect(summenGain); o.start();
    });
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    summenGain.connect(lp).connect(out);

    // Jagd-Musik: tiefes, schiefes Dröhnen
    jagdGain = ctx.createGain(); jagdGain.gain.value = 0;
    [[55, 'sawtooth'], [58, 'sawtooth'], [110.5, 'square']].forEach(([f, typ]) => {
      const o = ctx.createOscillator(); o.type = typ; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.25;
      o.connect(g).connect(jagdGain); o.start();
    });
    const jlp = ctx.createBiquadFilter(); jlp.type = 'lowpass'; jlp.frequency.value = 380;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 4;
    const lfoG = ctx.createGain(); lfoG.gain.value = 160;
    lfo.connect(lfoG).connect(jlp.frequency); lfo.start();
    jagdGain.connect(jlp).connect(out);
  },

  atmosphaere(regen, summen) {
    if (!ctx || (regen === letzteAtmo[0] && summen === letzteAtmo[1])) return;
    letzteAtmo = [regen, summen];
    rampe(regenGain.gain, regen * 0.55, 2);
    rampe(dachGain.gain, summen > 0 ? 0.9 : 0.15, 1);
    rampe(summenGain.gain, summen, 0.5);
  },

  jagd(an) {
    if (!ctx) return;
    rampe(jagdGain.gain, an ? 0.22 : 0, an ? 0.4 : 2);
    clearInterval(herzTimer);
    if (an) herzTimer = setInterval(() => { ton(55, 'sine', 0.5, 0.18); ton(50, 'sine', 0.4, 0.2, 0.2); }, 620);
  },

  klingel() { ton(1046, 'sine', 0.18, 0.9); ton(784, 'sine', 0.18, 1.2, 0.28); },
  kasse() {
    rauschen(0.12, 3000, 1, 0.12);
    ton(1568, 'triangle', 0.2, 0.5, 0.08); ton(2093, 'triangle', 0.18, 0.7, 0.16);
  },
  taser() {
    if (!ctx) return;
    for (let i = 0; i < 9; i++) { rauschen(0.05, 3000 + Math.random() * 3000, 2, 0.25, i * 0.045); ton(60 + Math.random() * 40, 'square', 0.12, 0.05, i * 0.045); }
  },
  knurren() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(62, t); o.frequency.linearRampToValueAtTime(48, t + 1.8);
    const am = ctx.createOscillator(); am.frequency.value = 23;
    const amG = ctx.createGain(); amG.gain.value = 0.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + 2);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    am.connect(amG).connect(g.gain);
    o.connect(f).connect(g).connect(out); o.start(t); am.start(t); o.stop(t + 2.1); am.stop(t + 2.1);
    rauschen(1.6, 300, 1.5, 0.12, 0.1, 0.3);
  },
  klick() { ton(1900, 'square', 0.03, 0.04); },
  muenze() { ton(2400 + Math.random() * 600, 'triangle', 0.12, 0.18); ton(3800, 'sine', 0.05, 0.1, 0.02); },
  nehmen() { ton(520, 'triangle', 0.1, 0.08); ton(780, 'triangle', 0.08, 0.1, 0.05); },
  ablegen() { ton(200, 'sine', 0.2, 0.12); rauschen(0.08, 1200, 1, 0.05); },
  fehler() { ton(150, 'square', 0.08, 0.25); ton(140, 'square', 0.08, 0.3, 0.12); },
  gut() { ton(660, 'triangle', 0.14, 0.15); ton(880, 'triangle', 0.14, 0.15, 0.1); ton(1320, 'triangle', 0.14, 0.3, 0.2); },
  rollladen() {
    if (!ctx) return;
    for (let i = 0; i < 14; i++) rauschen(0.06, 900 + Math.random() * 500, 2, 0.12, i * 0.07);
    ton(90, 'sine', 0.3, 0.25, 1.0);
  },
  schlag() { ton(60, 'sine', 0.7, 0.35); rauschen(0.25, 300, 1, 0.3); },
  bus(an) {
    if (!ctx) return;
    // tiefes Motorbrummen, das an- oder abschwillt
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(an ? 35 : 55, t);
    o.frequency.linearRampToValueAtTime(an ? 55 : 30, t + 3);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + 3.2);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 3.3);
  },
  bustuer() { rauschen(0.9, 2600, 0.7, 0.14, 0, 0.05); },
  tuer() { ton(180, 'sawtooth', 0.05, 0.8, 0, 120); rauschen(0.6, 700, 4, 0.06); },
  schritt() { rauschen(0.07, 260 + Math.random() * 80, 1.5, 0.08); },
  schrei() {
    ton(300, 'sawtooth', 0.18, 1.4, 0, 90); ton(317, 'sawtooth', 0.16, 1.4, 0, 95);
    ton(900, 'square', 0.05, 1.0, 0, 400);
    rauschen(1.2, 1800, 0.6, 0.18);
  },
  schreck() {
    ton(45, 'sine', 0.9, 1.6);
    ton(622, 'sawtooth', 0.12, 1.2); ton(659, 'sawtooth', 0.12, 1.2); ton(740, 'sawtooth', 0.1, 1.3);
    rauschen(1.4, 2500, 0.5, 0.35);
  },
  donner() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = rauschBuffer(5);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(90, t + 4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.8);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 5);
    ton(38, 'sine', 0.4, 2.5, 0.05);
  },
  verschwinden() { ton(800, 'sine', 0.12, 1.2, 0, 60); rauschen(1, 4000, 2, 0.06); },
  sieg() { [523, 659, 784, 1046].forEach((f, i) => ton(f, 'triangle', 0.15, 0.6, i * 0.12)); },

  get stumm() { return stumm; },
  umschalten() {
    stumm = !stumm;
    try { localStorage.setItem('derletztebus.stumm', stumm ? '1' : '0'); } catch (e) { /* egal */ }
    if (ctx) rampe(out.gain, stumm ? 0 : 0.85, 0.2);
    return stumm;
  }
};
