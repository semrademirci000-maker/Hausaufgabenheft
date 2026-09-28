// Alle Geräusche werden live mit der Web-Audio-API erzeugt – keine Audiodateien.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.chaseTarget = 0;
    this.alarm = false;
    this._beatT = 0;
    this._ambT = 4;
    this._boxT = 0;
  }

  init() {
    // iPad/iPhone: Ton auch bei Lautlos-Modus (Safari 17+)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* älteres iOS */ }
    if (this.ctx) { this.unlock(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.unlock();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(comp);

    // Hall: selbst erzeugte Impulsantwort (große, leere Fabrikhalle)
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb.buffer = ir;
    this.revGain = ctx.createGain(); this.revGain.gain.value = 0.45;
    this.reverb.connect(this.revGain).connect(this.master);

    // Rauschpuffer
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;

    // 3D-Quelle für das Monster
    this.monsterPan = ctx.createPanner();
    Object.assign(this.monsterPan, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 2.5, rolloffFactor: 1.3, maxDistance: 80 });
    this.monsterPan.connect(this.master);
    this.monsterPan.connect(this.reverb);

    this._startAmbience();
    this._startChaseBed();
  }

  // Muss bei jedem echten Tippen/Klicken aufgerufen werden: iOS gibt Ton nur nach einer Geste frei.
  unlock() {
    const c = this.ctx;
    if (!c) return;
    if (c.state !== 'running') c.resume().catch(() => {});
    if (this._unlocked) return;
    this._unlocked = true;
    // winziger stiller Puffer – "weckt" die Audio-Ausgabe auf iOS
    const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
    s.buffer = b; s.connect(c.destination); s.start(0);
    // Eine stille, laufende <audio>-Spur schaltet iOS auf "Wiedergabe" – dann stört der Lautlos-Schalter nicht mehr
    try {
      const rate = 8000, n = rate / 2, buf = new ArrayBuffer(44 + n), d = new DataView(buf);
      const str = (o, t) => [...t].forEach((ch, i) => d.setUint8(o + i, ch.charCodeAt(0)));
      str(0, 'RIFF'); d.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); d.setUint32(16, 16, true);
      d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, rate, true); d.setUint32(28, rate, true);
      d.setUint16(32, 1, true); d.setUint16(34, 8, true); str(36, 'data'); d.setUint32(40, n, true);
      for (let i = 0; i < n; i++) d.setUint8(44 + i, 128);
      const el = this._silent = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
      el.loop = true; el.setAttribute('playsinline', ''); el.volume = 0.01;
      el.play().catch(() => {});
    } catch (e) { /* egal */ }
  }

  // ---------- Stimmen der Figuren (Sprachausgabe des Geräts) ----------
  // Stimmen des Geräts nach Geschlecht auswählen (Namen der deutschen iOS/macOS/Windows/Chrome-Stimmen)
  _voices() {
    const S = window.speechSynthesis;
    if (!S) return [];
    if (!this._vlist || !this._vlist.length) {
      this._vlist = S.getVoices().filter(v => (v.lang || '').toLowerCase().startsWith('de'));
      if (!this._vHooked) { this._vHooked = true; S.addEventListener?.('voiceschanged', () => { this._vlist = null; }); }
    }
    return this._vlist;
  }
  _pickVoice(kind = 'female') {
    const de = this._voices().filter(v => !(this._badVoices && this._badVoices.has(v.name)));
    const names = kind === 'male'
      ? ['Markus', 'Martin', 'Yannick', 'Viktor', 'Hans', 'Stefan', 'Conrad', 'Klaus', 'Male', 'männlich']
      : ['Anna', 'Petra', 'Helena', 'Marlene', 'Vicki', 'Katja', 'Hedda', 'Female', 'weiblich', 'Google Deutsch'];
    return de.find(v => names.some(n => v.name.includes(n))) || de[0] || null;
  }

  // Jede Figur hat ihr eigenes Stimmprofil
  static VOICES = {
    MILA: { kind: 'female', pitch: 1.55, rate: 0.93 },           // helle, sanfte Puppenstimme über Funk
    TAILOR: { kind: 'male', pitch: 0.05, rate: 0.72 },        // tief, langsam, bedrohlich
    ZIPPER: { kind: 'male', pitch: 0.35, rate: 0.62, vol: 0.8 }, // geflüstert, gedehnt
    DURCHSAGE: { kind: 'female', pitch: 1.0, rate: 0.98 },       // Fabrik-Lautsprecher
  };

  primeSpeech() {
    // iOS spricht erst, wenn das erste speak() direkt in einem Tippen passiert
    const S = window.speechSynthesis;
    if (!S || this._speechPrimed) return;
    this._speechPrimed = true;
    try { S.resume(); } catch (e) { /* egal */ }
    const u = new SpeechSynthesisUtterance('.');
    u.volume = 0.01; u.lang = 'de-DE';
    S.speak(u);
  }
  speak(html, who = 'MILA', { urgent = false } = {}) {
    const S = window.speechSynthesis;
    if (!S || this.volume <= 0) return;
    const text = html.replace(/<[^>]+>/g, '').replace(/…/g, '...').trim();
    if (!text) return;
    const prof = AudioEngine.VOICES[who] || AudioEngine.VOICES.MILA;
    // Eine pausierte Sprachausgabe (z. B. nach dem Pause-Menü) würde sonst für immer schweigen
    if (S.paused) S.resume();
    // nicht zu viel stauen: bei dringenden Sätzen oder langer Schlange vorher abbrechen
    if (urgent || (S.pending && S.speaking)) S.cancel();
    const make = withVoice => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE'; u.pitch = prof.pitch; u.rate = prof.rate;
      u.volume = Math.min(1, this.volume * 1.15 * (prof.vol ?? 1));
      if (withVoice) { const v = this._pickVoice(prof.kind); if (v) u.voice = v; }
      // Referenz behalten – Safari/Chrome räumen Sätze sonst vorzeitig weg
      this._utt = (this._utt || []).filter(x => !x._done).concat(u).slice(-6);
      u.onend = u.onerror = () => { u._done = true; };
      return u;
    };
    const u = make(true);
    let started = false;
    u.onstart = () => { started = true; };
    S.speak(u);
    // Fallback: manche gelisteten Stimmen sind nicht installiert und bleiben stumm.
    // Wenn der Satz nicht anfängt, ohne feste Stimme noch einmal versuchen – und diese Stimme künftig meiden.
    if (u.voice) setTimeout(() => {
      if (started || u._done) return;
      if (S.speaking && !S.paused) return;
      this._badVoices = (this._badVoices || new Set()).add(u.voice.name);
      this._vlist = null;
      S.cancel();
      S.speak(make(false));
    }, 1500);
  }
  stopSpeech() { try { const S = window.speechSynthesis; S?.cancel(); S?.resume(); } catch (e) { /* egal */ } }
  pauseSpeech(on) { try { on ? window.speechSynthesis?.pause() : window.speechSynthesis?.resume(); } catch (e) { /* egal */ } }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  get t() { return this.ctx.currentTime; }

  // ---------- Grundbausteine ----------
  _env(g, t0, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  noise({ dur = 0.3, type = 'lowpass', freq = 1000, q = 1, gain = 0.3, attack = 0.005, dest, wet = 0, freqEnd, delay = 0 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = c.createGain(); this._env(g, t0, attack, gain, dur);
    src.connect(f).connect(g).connect(dest || this.master);
    if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w).connect(this.reverb); }
    src.start(t0, Math.random() * 1.5); src.stop(t0 + attack + dur + 0.05);
  }
  tone({ type = 'sine', freq = 440, freqEnd, dur = 0.3, gain = 0.2, attack = 0.005, dest, wet = 0, delay = 0, detune = 0 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + attack + dur);
    const g = c.createGain(); this._env(g, t0, attack, gain, dur);
    o.connect(g).connect(dest || this.master);
    if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w).connect(this.reverb); }
    o.start(t0); o.stop(t0 + attack + dur + 0.05);
  }

  // ---------- Atmosphäre ----------
  _startAmbience() {
    const c = this.ctx;
    this.ambGain = c.createGain(); this.ambGain.gain.value = 0.0;
    this.ambGain.connect(this.master);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
    lp.connect(this.ambGain);
    for (const [f, type, g] of [[41, 'sawtooth', 0.12], [41.6, 'sawtooth', 0.12], [61.7, 'sine', 0.2]]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f;
      const og = c.createGain(); og.gain.value = g; o.connect(og).connect(lp); o.start();
    }
    // Luftzug durch die Lüftung
    const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.7;
    const ng = c.createGain(); ng.gain.value = 0.05;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(bp.frequency); lfo.start();
    n.connect(bp).connect(ng).connect(this.ambGain); n.start();
    // Neonröhren-Brummen
    const hum = c.createOscillator(); hum.type = 'square'; hum.frequency.value = 100;
    const hf = c.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 200; hf.Q.value = 10;
    const hg = c.createGain(); hg.gain.value = 0.006;
    hum.connect(hf).connect(hg).connect(this.ambGain); hum.start();
  }

  _startChaseBed() {
    const c = this.ctx;
    this.chaseGain = c.createGain(); this.chaseGain.gain.value = 0;
    this.chaseGain.connect(this.master);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 3;
    lp.connect(this.chaseGain);
    // dissonante Streicher-Fläche
    for (const f of [110, 116.5, 164.8, 233]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const vib = c.createOscillator(); vib.frequency.value = 5 + Math.random() * 2;
      const vg = c.createGain(); vg.gain.value = 1.5; vib.connect(vg).connect(o.frequency); vib.start();
      const og = c.createGain(); og.gain.value = 0.05; o.connect(og).connect(lp); o.start();
    }
    // Alarmsirene (nach dem Einschalten des Generators)
    this.sirenGain = c.createGain(); this.sirenGain.gain.value = 0; this.sirenGain.connect(this.master);
    const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = 600;
    const sl = c.createOscillator(); sl.frequency.value = 0.5;
    const slg = c.createGain(); slg.gain.value = 220; sl.connect(slg).connect(s.frequency); sl.start();
    const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 800; sf.Q.value = 2;
    const sw = c.createGain(); sw.gain.value = 0.35;
    s.connect(sf).connect(this.sirenGain); sf.connect(sw).connect(this.reverb); s.start();
  }

  setAmbience(on) { if (this.ctx) this.ambGain.gain.setTargetAtTime(on ? 1 : 0, this.t, 0.8); }

  update(dt, { chase = 0, playing = false, menu = false } = {}) {
    if (!this.ctx) return;
    this.chaseGain.gain.setTargetAtTime(chase * 0.55, this.t, chase > 0.5 ? 0.15 : 1.2);
    this.sirenGain.gain.setTargetAtTime(this.alarm && playing ? 0.07 : 0, this.t, 0.3);
    if (chase > 0.3) {
      this._beatT -= dt;
      if (this._beatT <= 0) {
        this._beatT = 0.42;
        this.tone({ type: 'sine', freq: 95, freqEnd: 38, dur: 0.28, gain: 0.55 * chase });
        this.noise({ dur: 0.05, type: 'highpass', freq: 6000, gain: 0.05 * chase, delay: 0.21 });
      }
    }
    if (playing) {
      this._ambT -= dt;
      if (this._ambT <= 0) { this._ambT = 5 + Math.random() * 11; this.randomAmbient(); }
    }
    if (menu) {
      this._boxT -= dt;
      if (this._boxT <= 0) { this._boxT = 9.6; this.musicBox(); }
    }
  }

  randomAmbient() {
    const r = Math.random();
    if (r < 0.35) { // Metall-Klirren in der Ferne
      this.noise({ dur: 0.5, type: 'bandpass', freq: 900 + Math.random() * 1500, q: 12, gain: 0.12, wet: 1.2 });
      this.tone({ type: 'triangle', freq: 180 + Math.random() * 200, dur: 1.4, gain: 0.05, wet: 1.5 });
    } else if (r < 0.6) { // Rohr-Ächzen
      this.tone({ type: 'sawtooth', freq: 70 + Math.random() * 30, freqEnd: 50, dur: 2.2, attack: 0.6, gain: 0.05, wet: 1 });
    } else if (r < 0.8) { // Tropfen
      this.tone({ type: 'sine', freq: 1400 + Math.random() * 800, freqEnd: 500, dur: 0.12, gain: 0.08, wet: 1.5 });
    } else { // ferne Spieluhr
      this.musicBox(0.35);
    }
  }

  // Schiefe, verstimmte Spieluhr-Melodie
  musicBox(vol = 1) {
    const notes = [76, 79, 83, 81, 79, 76, 74, 76, 79, 78, 74, 71];
    notes.forEach((m, i) => {
      const f = 440 * Math.pow(2, (m - 69) / 12);
      const d = i * 0.4 + (i % 4 === 3 ? 0.4 : 0);
      this.tone({ type: 'sine', freq: f, dur: 1.2, gain: 0.07 * vol, delay: d, detune: -15 + Math.random() * 30, wet: 0.8 });
      this.tone({ type: 'triangle', freq: f * 2, dur: 0.35, gain: 0.015 * vol, delay: d, wet: 0.5 });
    });
  }

  // ---------- Spielgeräusche ----------
  footstep(vol = 1) {
    this.noise({ dur: 0.08, type: 'lowpass', freq: 700, gain: 0.12 * vol });
    this.tone({ type: 'sine', freq: 90, freqEnd: 50, dur: 0.08, gain: 0.08 * vol });
  }
  monsterStep(heavy = 1) {
    if (!this.ctx) return;
    this.tone({ type: 'sine', freq: 70, freqEnd: 32, dur: 0.35, gain: 0.9 * heavy, dest: this.monsterPan });
    this.noise({ dur: 0.12, type: 'lowpass', freq: 400, gain: 0.5 * heavy, dest: this.monsterPan });
  }
  growl(intensity = 1) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime, dur = 1.6 + intensity;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(85, t0); o.frequency.linearRampToValueAtTime(55, t0 + dur);
    const am = c.createOscillator(); am.frequency.value = 23;
    const amg = c.createGain(); amg.gain.value = 0.5; am.connect(amg);
    const g = c.createGain(); g.gain.value = 0;
    amg.connect(g.gain);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const out = c.createGain(); this._env(out, t0, 0.2, 1.2 * intensity, dur);
    o.connect(g).connect(f).connect(out).connect(this.monsterPan);
    o.start(t0); am.start(t0); o.stop(t0 + dur + 0.3); am.stop(t0 + dur + 0.3);
    this.noise({ dur, type: 'bandpass', freq: 300, q: 2, gain: 0.3 * intensity, attack: 0.2, dest: this.monsterPan });
  }
  roar() {
    this.growl(1.6);
    this.tone({ type: 'sawtooth', freq: 220, freqEnd: 120, dur: 1.4, attack: 0.1, gain: 0.35, dest: this.monsterPan, detune: 20 });
    this.tone({ type: 'sawtooth', freq: 233, freqEnd: 110, dur: 1.4, attack: 0.1, gain: 0.35, dest: this.monsterPan });
  }
  heartbeat(vol) {
    this.tone({ type: 'sine', freq: 60, freqEnd: 40, dur: 0.12, gain: 0.5 * vol });
    this.tone({ type: 'sine', freq: 55, freqEnd: 38, dur: 0.14, gain: 0.35 * vol, delay: 0.18 });
  }
  grabFire() {
    this.noise({ dur: 0.25, type: 'bandpass', freq: 3000, freqEnd: 800, q: 1.5, gain: 0.18 });
    this.tone({ type: 'square', freq: 180, freqEnd: 90, dur: 0.06, gain: 0.08 });
  }
  grabHit() {
    this.noise({ dur: 0.1, type: 'bandpass', freq: 1800, q: 5, gain: 0.25, wet: 0.4 });
    this.tone({ type: 'triangle', freq: 320, freqEnd: 160, dur: 0.12, gain: 0.12 });
  }
  grabReturn() {
    this.noise({ dur: 0.3, type: 'bandpass', freq: 900, freqEnd: 2600, q: 2, gain: 0.1 });
    this.tone({ type: 'square', freq: 120, dur: 0.05, gain: 0.08, delay: 0.28 });
  }
  pickup() {
    this.tone({ type: 'sine', freq: 440, freqEnd: 880, dur: 0.25, gain: 0.12 });
    this.noise({ dur: 0.3, type: 'highpass', freq: 5000, gain: 0.04 });
  }
  insertBattery() {
    this.tone({ type: 'square', freq: 120, dur: 0.08, gain: 0.12 });
    this.tone({ type: 'sawtooth', freq: 60, freqEnd: 240, dur: 1.2, gain: 0.12, delay: 0.1, wet: 0.5 });
    this.tone({ type: 'sine', freq: 880, dur: 0.4, gain: 0.1, delay: 1.2 });
  }
  lever() {
    this.noise({ dur: 0.35, type: 'bandpass', freq: 600, q: 4, gain: 0.3, wet: 0.5 });
    this.tone({ type: 'square', freq: 90, dur: 0.1, gain: 0.15, delay: 0.3 });
  }
  door() {
    this.noise({ dur: 2.2, type: 'lowpass', freq: 260, gain: 0.35, attack: 0.2, wet: 0.8 });
    this.tone({ type: 'sawtooth', freq: 48, dur: 2.2, gain: 0.08, attack: 0.3 });
    this.tone({ type: 'square', freq: 70, freqEnd: 40, dur: 0.3, gain: 0.3, delay: 2.1, wet: 1 });
  }
  locker(open) {
    this.noise({ dur: 0.25, type: 'bandpass', freq: open ? 1200 : 900, q: 3, gain: 0.25 });
    this.tone({ type: 'triangle', freq: 150, freqEnd: 90, dur: 0.2, gain: 0.2, delay: open ? 0 : 0.15 });
  }
  paper() { this.noise({ dur: 0.35, type: 'highpass', freq: 2500, gain: 0.08 }); }
  radio() {
    this.noise({ dur: 0.25, type: 'bandpass', freq: 2200, q: 1, gain: 0.08 });
    this.tone({ type: 'square', freq: 1250, dur: 0.08, gain: 0.03 });
  }
  // ---------- Intro & Menümusik ----------
  // Dunkle, schwebende Fläche mit langsam atmendem Filter – läuft im Hauptmenü
  setMenuMusic(on) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (!this.menuGain) {
      this.menuGain = c.createGain(); this.menuGain.gain.value = 0; this.menuGain.connect(this.master);
      const wet = c.createGain(); wet.gain.value = 0.6; this.menuGain.connect(wet).connect(this.reverb);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 4; lp.connect(this.menuGain);
      const lfo = c.createOscillator(); lfo.frequency.value = 0.06;
      const lg = c.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(lp.frequency); lfo.start();
      // Moll-Akkord mit einem schiefen Ton (Tritonus) – klingt unheimlich
      for (const [f, g] of [[55, 0.1], [65.4, 0.08], [77.8, 0.07], [82.4, 0.05], [110.3, 0.04]]) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 14;
        const og = c.createGain(); og.gain.value = g; o.connect(og).connect(lp); o.start();
      }
      // leises, zitterndes Pfeifen weit oben
      const hi = c.createOscillator(); hi.type = 'sine'; hi.frequency.value = 1244;
      const trem = c.createOscillator(); trem.frequency.value = 5.5;
      const tg = c.createGain(); tg.gain.value = 9; trem.connect(tg).connect(hi.frequency); trem.start();
      const hg = c.createGain(); hg.gain.value = 0.006; hi.connect(hg).connect(this.menuGain); hi.start();
      // tiefer Herzschlag-Puls
      const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = 41;
      const pulse = c.createOscillator(); pulse.frequency.value = 0.8;
      const pg = c.createGain(); pg.gain.value = 0.12; pulse.connect(pg);
      const sg = c.createGain(); sg.gain.value = 0.1; pg.connect(sg.gain); sub.connect(sg).connect(this.menuGain); sub.start(); pulse.start();
    }
    this.menuGain.gain.setTargetAtTime(on ? 0.9 : 0, this.t, on ? 1.5 : 0.6);
  }
  // Reißverschluss, der aufgezogen wird (Zipper)
  zipper() {
    for (let i = 0; i < 14; i++) this.noise({ dur: 0.025, type: 'bandpass', freq: 2600 + i * 90, q: 5, gain: 0.14, delay: i * 0.028, dest: this.monsterPan });
    this.growl(0.6);
  }
  // Servo-Surren und Knacken, wenn die Klauenhand zuckt
  servo() {
    this.tone({ type: 'sawtooth', freq: 220, freqEnd: 520, dur: 0.35, gain: 0.05, attack: 0.03, wet: 0.8 });
    this.noise({ dur: 0.12, type: 'bandpass', freq: 2500, q: 6, gain: 0.12, delay: 0.3, wet: 1 });
    this.tone({ type: 'square', freq: 80, dur: 0.06, gain: 0.08, delay: 0.32 });
  }
  // Tiefer Schlag, wenn das Logo erscheint
  boom() {
    this.tone({ type: 'sine', freq: 70, freqEnd: 24, dur: 2.2, gain: 0.9, wet: 0.8 });
    this.tone({ type: 'sawtooth', freq: 110, freqEnd: 40, dur: 1.2, gain: 0.15, wet: 1 });
    this.noise({ dur: 1.4, type: 'lowpass', freq: 900, freqEnd: 80, gain: 0.35, wet: 1.2 });
  }
  // Wisch-Geräusch
  whoosh() {
    this.noise({ dur: 0.7, type: 'bandpass', freq: 300, freqEnd: 5000, q: 1.2, gain: 0.35, attack: 0.25, wet: 0.6 });
    this.tone({ type: 'sawtooth', freq: 180, freqEnd: 900, dur: 0.6, gain: 0.05, attack: 0.2 });
  }
  // kurzes digitales Knacken (Glitch)
  glitch() {
    for (let i = 0; i < 4; i++) this.noise({ dur: 0.04, type: 'highpass', freq: 2000 + Math.random() * 4000, gain: 0.12, delay: i * 0.06 + Math.random() * 0.03 });
    this.tone({ type: 'square', freq: 60, dur: 0.12, gain: 0.08 });
  }

  // Lautsprecher-Gong vor einer Durchsage
  chime() {
    this.tone({ type: 'sine', freq: 784, dur: 0.6, gain: 0.12, wet: 1.2 });
    this.tone({ type: 'sine', freq: 659, dur: 0.6, gain: 0.12, wet: 1.2, delay: 0.3 });
    this.tone({ type: 'sine', freq: 523, dur: 0.9, gain: 0.12, wet: 1.2, delay: 0.6 });
  }
  cageHit() {
    this.noise({ dur: 0.6, type: 'bandpass', freq: 1800, q: 4, gain: 0.5, wet: 1 });
    for (const f of [410, 617, 893]) this.tone({ type: 'triangle', freq: f, freqEnd: f * 0.97, dur: 1.4, gain: 0.08, wet: 1.2 });
    this.tone({ type: 'sine', freq: 70, freqEnd: 40, dur: 0.4, gain: 0.5 });
  }
  flashClick() { this.tone({ type: 'square', freq: 2400, dur: 0.02, gain: 0.05 }); }
  powerDown() { this.tone({ type: 'sawtooth', freq: 300, freqEnd: 30, dur: 1.2, gain: 0.15, wet: 1 }); }
  powerUp() {
    this.tone({ type: 'sawtooth', freq: 40, freqEnd: 400, dur: 2.5, gain: 0.15, wet: 1 });
    this.tone({ type: 'square', freq: 55, dur: 0.4, gain: 0.25, delay: 2.4, wet: 1 });
  }
  // Kurzer Schrei beim Jumpscare: erschreckt kurz, ist aber nicht zu laut oder zu lang
  jumpscare() {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime, dur = 0.75;
    const out = c.createGain(); this._env(out, t0, 0.02, 0.45, dur);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8;
    bp.connect(out).connect(this.master);
    const wet = c.createGain(); wet.gain.value = 0.3; out.connect(wet).connect(this.reverb);
    // Stimme: zwei leicht verstimmte Töne, schnell hoch, dann abfallend, mit Zittern
    for (const [f, d] of [[620, 0], [655, 12]]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = d;
      o.frequency.setValueAtTime(f * 0.7, t0);
      o.frequency.exponentialRampToValueAtTime(f * 1.25, t0 + 0.12);
      o.frequency.exponentialRampToValueAtTime(f * 0.8, t0 + dur);
      const vib = c.createOscillator(); vib.frequency.value = 9;
      const vg = c.createGain(); vg.gain.value = 18; vib.connect(vg).connect(o.frequency);
      const g = c.createGain(); g.gain.value = 0.35;
      o.connect(g).connect(bp); o.start(t0); vib.start(t0); o.stop(t0 + dur + 0.1); vib.stop(t0 + dur + 0.1);
    }
    this.noise({ dur: 0.5, type: 'bandpass', freq: 2500, q: 1, gain: 0.08 });
    this.tone({ type: 'sine', freq: 90, freqEnd: 45, dur: 0.4, gain: 0.35 });
  }


  setListener(pos, fwd) {
    if (!this.ctx) return;
    const L = this.ctx.listener;
    if (L.positionX) {
      const t = this.t;
      L.positionX.setTargetAtTime(pos.x, t, 0.02); L.positionY.setTargetAtTime(pos.y, t, 0.02); L.positionZ.setTargetAtTime(pos.z, t, 0.02);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.02); L.forwardY.setTargetAtTime(fwd.y, t, 0.02); L.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else {
      L.setPosition(pos.x, pos.y, pos.z);
      L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }
  setMonsterPos(p) {
    if (!this.ctx) return;
    const P = this.monsterPan;
    if (P.positionX) { P.positionX.value = p.x; P.positionY.value = p.y; P.positionZ.value = p.z; }
    else P.setPosition(p.x, p.y, p.z);
  }
}
