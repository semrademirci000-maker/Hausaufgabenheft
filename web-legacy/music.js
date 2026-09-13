/* =========================================================
   Lo-Fi-Entspannungsmusik – komplett im Browser erzeugt
   (Web Audio API, keine Musikdateien, funktioniert offline)
   ========================================================= */
(() => {
'use strict';

const KEY  = 'schulplaner.music';
const BPM  = 72;
const BEAT = 60 / BPM;          // Viertelnote
const STEP = BEAT / 2;          // Achtelnote
const SWING = 0.17;             // schleppendes Lo-Fi-Feeling

const midi = m => 440 * Math.pow(2, (m - 69) / 12);

/* vier Takte, ruhige Jazz-Harmonien */
const CHORDS = [
  { pad:[50,57,60,65,69], bass:38 },   // Dm9
  { pad:[43,53,59,64,69], bass:31 },   // G13
  { pad:[48,55,59,64,67], bass:36 },   // Cmaj9
  { pad:[45,52,55,62,67], bass:33 },   // Am11
];
const MELODY = [74,72,69,67,65,69,72,77];   // d-Moll-Pentatonik

let ctx = null, master = null, tone = null, crackle = null, delay = null;
let timer = null, nextTime = 0, step = 0;
let on = false, vol = 0.45;

/* ---------- Einstellungen merken ---------- */
try {
  const s = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (typeof s.vol === 'number') vol = Math.min(1, Math.max(0, s.vol));
  if (s.on) on = true;
} catch (e) {}
const remember = () => { try { localStorage.setItem(KEY, JSON.stringify({ on, vol })); } catch (e) {} };

/* ---------- Audio-Aufbau ---------- */
function build(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = 0;

  const warm = ctx.createBiquadFilter();          // dumpfer „Kassetten“-Klang
  warm.type = 'lowpass'; warm.frequency.value = 2600; warm.Q.value = 0.4;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.ratio.value = 4; comp.release.value = .4;

  tone = ctx.createGain(); tone.gain.value = 1;
  tone.connect(warm); warm.connect(comp); comp.connect(master); master.connect(ctx.destination);

  /* weiches Echo für Melodie */
  delay = ctx.createDelay(1.0);
  delay.delayTime.value = STEP * 1.5;
  const fb = ctx.createGain(); fb.gain.value = .32;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1600;
  delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(tone);

  /* Vinyl-Knistern */
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++){
    d[i] = (Math.random() * 2 - 1) * 0.06;
    if (Math.random() < 0.00035) d[i] += (Math.random() * 2 - 1) * 0.8;
  }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
  crackle = ctx.createGain(); crackle.gain.value = 0.25;
  src.connect(hp); hp.connect(crackle); crackle.connect(tone); src.start();

  return true;
}

/* ---------- Klänge ---------- */
function pad(f, t, dur){
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 850; lp.Q.value = 0.7;
  const a = ctx.createOscillator(), b = ctx.createOscillator();
  a.type = 'triangle'; b.type = 'sine';
  a.frequency.value = f; b.frequency.value = f * 1.004;       // leichtes Schweben
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.075, t + 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  a.connect(g); b.connect(g); g.connect(lp); lp.connect(tone);
  a.start(t); b.start(t); a.stop(t + dur + .1); b.stop(t + dur + .1);
}

function bass(f, t, dur){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(tone); o.start(t); o.stop(t + dur + .05);
}

function keys(f, t){
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = f;
  o2.type = 'sine'; o2.frequency.value = f * 2; 
  const g2 = ctx.createGain(); g2.gain.value = .18;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.10, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  o.connect(g); o2.connect(g2); g2.connect(g);
  g.connect(tone); g.connect(delay);
  o.start(t); o2.start(t); o.stop(t + 1.7); o2.stop(t + 1.7);
}

function noise(t, dur, type, freq, level){
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = level;
  s.connect(f); f.connect(g); g.connect(tone); s.start(t);
}

function kick(t){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.34, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g); g.connect(tone); o.start(t); o.stop(t + .35);
}
const snare = t => { noise(t, .18, 'bandpass', 1900, .11); };
const hat   = (t, soft) => noise(t, .045, 'highpass', 7800, soft ? .022 : .045);

/* ---------- Takt-Planer ---------- */
function schedule(){
  while (nextTime < ctx.currentTime + 0.2){
    const inBar = step % 8;
    const bar   = Math.floor(step / 8) % 4;
    const ch    = CHORDS[bar];
    const t     = nextTime + (inBar % 2 ? STEP * SWING : 0);   // Swing auf Offbeats

    if (inBar === 0){
      ch.pad.forEach((m, i) => pad(midi(m), t + i * 0.035, BEAT * 4.1));
      bass(midi(ch.bass), t, BEAT * 1.6);
      kick(t);
    }
    if (inBar === 3) kick(t + STEP * .1);
    if (inBar === 5){ bass(midi(ch.bass + 7), t, BEAT * .9); kick(t); }
    if (inBar === 2 || inBar === 6) snare(t);
    hat(t, inBar % 2 === 1);

    /* sparsame Melodie */
    if ((inBar === 4 || inBar === 7) && Math.random() < 0.45)
      keys(midi(MELODY[Math.floor(Math.random() * MELODY.length)]), t);

    nextTime += STEP;
    step++;
  }
}

/* ---------- Steuerung ---------- */
function start(){
  if (!ctx && !build()) return false;
  if (ctx.state === 'suspended') ctx.resume();
  if (!timer){
    nextTime = ctx.currentTime + 0.12;
    timer = setInterval(schedule, 25);
  }
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
  master.gain.linearRampToValueAtTime(vol * 0.9, ctx.currentTime + 1.2);
  return true;
}

function stop(){
  if (!ctx) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
  setTimeout(() => { if (!on && timer){ clearInterval(timer); timer = null; } }, 900);
}

/* ---------- Bedienelement ---------- */
const box    = document.getElementById('music');
const btn    = document.getElementById('music-btn');
const slider = document.getElementById('music-vol');
if (!box) return;

slider.value = Math.round(vol * 100);

function paint(){
  box.classList.toggle('is-on', on);
  btn.textContent = on ? '♫' : '♪';
  btn.setAttribute('aria-label', on ? 'Musik aus' : 'Entspannungsmusik an');
  btn.title = on ? 'Musik aus' : 'Entspannungsmusik an';
}

btn.addEventListener('click', () => {
  on = !on;
  if (on){ if (!start()) { on = false; alert('Musik geht auf diesem Gerät leider nicht.'); } }
  else stop();
  paint(); remember();
});

slider.addEventListener('input', () => {
  vol = slider.value / 100;
  if (ctx && on){
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(vol * 0.9, ctx.currentTime + 0.15);
  }
  remember();
});

/* War die Musik zuletzt an? Beim ersten Tippen wieder starten
   (Safari erlaubt Ton nur nach einer Berührung). */
if (on){
  paint();
  const wake = () => {
    document.removeEventListener('pointerdown', wake);
    if (on) start();
  };
  document.addEventListener('pointerdown', wake, { once:true });
} else {
  paint();
}
})();
