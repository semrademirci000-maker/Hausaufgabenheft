// Alle Texturen werden auf <canvas> gemalt – keine Bilddateien.
import * as THREE from 'three';

let seed = 1337;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + rnd() * (b - a);

let maxAniso = 4;
export function setAniso(n) { maxAniso = n; }

function make(w, h, draw, { repeat = [1, 1], color = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = maxAniso;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function grime(g, w, h, amount = 1, dark = true) {
  // Flecken
  for (let i = 0; i < 60 * amount; i++) {
    const x = rr(0, w), y = rr(0, h), r = rr(4, 60);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const a = rr(0.03, 0.14);
    grd.addColorStop(0, dark ? `rgba(20,14,8,${a})` : `rgba(255,250,230,${a})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Körnung
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 22 * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(id, 0, 0);
}

function drips(g, w, h, fromY, count, color = 'rgba(30,20,10,') {
  for (let i = 0; i < count; i++) {
    const x = rr(0, w), len = rr(20, h * 0.6), wd = rr(1, 5);
    const grd = g.createLinearGradient(0, fromY, 0, fromY + len);
    grd.addColorStop(0, color + rr(0.15, 0.4) + ')');
    grd.addColorStop(1, color + '0)');
    g.fillStyle = grd; g.fillRect(x, fromY, wd, len);
  }
}

// Tapete oben, Holzvertäfelung unten – wie in der Spielzeugfabrik
export function wallTexture(variant = 0) {
  seed = 100 + variant * 17;
  const palettes = [
    { paper: '#3f7a78', stripe: '#4b8a86', motif: '#e8c65a', panel: '#5b1e22', trim: '#3a2717' },
    { paper: '#8a5e6f', stripe: '#98697b', motif: '#7fd0e6', panel: '#2b3350', trim: '#2c1f14' },
    { paper: '#6d6a3e', stripe: '#7a7747', motif: '#e86d5a', panel: '#233f32', trim: '#2c1f14' },
  ];
  const p = palettes[variant % palettes.length];
  return make(512, 512, (g, w, h) => {
    const split = h * 0.58;
    g.fillStyle = p.paper; g.fillRect(0, 0, w, split);
    for (let x = 0; x < w; x += 64) { g.fillStyle = p.stripe; g.fillRect(x, 0, 30, split); }
    // Motive: kleine Sterne und lächelnde Gesichter
    for (let y = 30; y < split - 20; y += 64) {
      for (let x = 16 + ((y / 64) % 2) * 32; x < w; x += 64) {
        g.save(); g.translate(x, y); g.globalAlpha = 0.55; g.fillStyle = p.motif; g.strokeStyle = p.motif; g.lineWidth = 2;
        if ((x + y) % 128 < 64) {
          g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, r = k % 2 ? 4 : 9; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
        } else {
          g.beginPath(); g.arc(0, 0, 8, 0, 7); g.stroke();
          g.fillRect(-4, -3, 2, 2); g.fillRect(2, -3, 2, 2);
          g.beginPath(); g.arc(0, 1, 4, 0.2, Math.PI - 0.2); g.stroke();
        }
        g.restore();
      }
    }
    // abgerissene Tapete
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#7d7466'; g.beginPath();
      const x = rr(0, w), y = rr(0, split - 80);
      g.moveTo(x, y); for (let k = 0; k < 8; k++) g.lineTo(x + rr(-50, 50), y + rr(0, 90)); g.fill();
    }
    // Zierleiste
    g.fillStyle = p.trim; g.fillRect(0, split, w, 18);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, split + 2, w, 2);
    // Vertäfelung
    g.fillStyle = p.panel; g.fillRect(0, split + 18, w, h - split - 18);
    for (let x = 0; x < w; x += 128) {
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(x + 14, split + 36, 100, h - split - 80);
      g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; g.strokeRect(x + 18, split + 40, 92, h - split - 88);
    }
    g.fillStyle = '#1a1210'; g.fillRect(0, h - 26, w, 26);
    drips(g, w, h, 0, 40);
    drips(g, w, h, split + 18, 20);
    grime(g, w, h, 1.2);
    // Dunkler nach unten
    const sh = g.createLinearGradient(0, h * 0.75, 0, h); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.5)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
  });
}

export function floorTexture(W, H) {
  seed = 7;
  return make(512, 512, (g, w, h) => {
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? '#8f877a' : '#5c5750';
      g.fillRect(x * s, y * s, s, s);
      g.fillStyle = `rgba(0,0,0,${rr(0, 0.12)})`; g.fillRect(x * s, y * s, s, s);
    }
    g.strokeStyle = '#2b2824'; g.lineWidth = 4;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    // Risse
    g.strokeStyle = 'rgba(20,16,12,.6)'; g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { g.beginPath(); let x = rr(0, w), y = rr(0, h); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rr(-25, 25); y += rr(-25, 25); g.lineTo(x, y); } g.stroke(); }
    grime(g, w, h, 1.6);
  }, { repeat: [W, H] });
}

export function ceilingTexture(W, H) {
  seed = 11;
  return make(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3835'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1c1b19'; g.lineWidth = 6;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); }
    for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(rr(0, w), rr(0, h), 2, 2); }
    grime(g, w, h, 1);
  }, { repeat: [W, H] });
}

export function metalTexture(base = '#6b6f73', hazard = false, label = '') {
  seed = 55 + label.length * 13;
  return make(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(255,255,255,${rr(0, 0.04)})`; g.fillRect(0, y, w, 1); }
    // Nieten
    g.fillStyle = 'rgba(0,0,0,.4)';
    for (let x = 12; x < w; x += 38) { g.beginPath(); g.arc(x, 10, 3, 0, 7); g.fill(); g.beginPath(); g.arc(x, h - 10, 3, 0, 7); g.fill(); }
    if (hazard) {
      g.save(); g.beginPath(); g.rect(0, h * 0.78, w, h * 0.12); g.clip();
      for (let x = -h; x < w + h; x += 28) { g.fillStyle = '#e0b423'; g.beginPath(); g.moveTo(x, h * 0.78); g.lineTo(x + 14, h * 0.78); g.lineTo(x + 14 + 30, h * 0.9); g.lineTo(x + 30, h * 0.9); g.fill(); }
      g.restore();
      g.fillStyle = '#111'; g.fillRect(0, h * 0.78, w, 2); g.fillRect(0, h * 0.9, w, 2);
    }
    if (label) {
      g.fillStyle = 'rgba(240,235,220,.85)'; g.font = 'bold 64px Oswald, Impact, sans-serif'; g.textAlign = 'center';
      g.fillText(label, w / 2, h * 0.22);
    }
    drips(g, w, h, 0, 14, 'rgba(70,35,10,');
    grime(g, w, h, 1);
  });
}

export function shutterTexture() {
  seed = 99;
  return make(256, 256, (g, w, h) => {
    g.fillStyle = '#7a1c1c'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y + 12, w, 4);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y, w, 2);
    }
    g.fillStyle = '#f2e8d0'; g.font = 'bold 40px Oswald, Impact, sans-serif'; g.textAlign = 'center';
    g.fillText('AUSGANG', w / 2, h * 0.3);
    drips(g, w, h, 0, 20);
    grime(g, w, h, 1.2);
  });
}

export function woodTexture() {
  seed = 5;
  return make(128, 128, (g, w, h) => {
    g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = `rgb(${rr(90, 120)},${rr(62, 80)},${rr(35, 50)})`; g.fillRect(0, y + 2, w, 28);
      for (let k = 0; k < 8; k++) { g.strokeStyle = 'rgba(40,25,10,.35)'; g.beginPath(); g.moveTo(0, y + rr(4, 28)); g.bezierCurveTo(40, y + rr(4, 28), 80, y + rr(4, 28), w, y + rr(4, 28)); g.stroke(); }
    }
    g.strokeStyle = '#2d1d0e'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.stroke();
    g.fillStyle = 'rgba(20,10,0,.6)'; g.font = 'bold 18px sans-serif'; g.fillText('PLAYTIME', 16, 70);
    grime(g, w, h, 0.8);
  });
}

export function furTexture(color = '#2a1636') {
  seed = 3;
  return make(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const x = rr(0, w), y = rr(0, h), l = rr(3, 9), a = rr(-0.4, 0.4);
      g.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.28)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y + Math.cos(a) * l); g.stroke();
    }
    // Nähte
    g.strokeStyle = 'rgba(200,190,160,.35)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 128) { for (let y = 0; y < h; y += 10) { g.beginPath(); g.moveTo(x + 60, y); g.lineTo(x + 68, y + 6); g.stroke(); } }
  }, { repeat: [2, 2] });
}

// Das breite Grinsen mit spitzen Zähnen
export function grinTexture(open = 0) {
  return make(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cy = h * 0.42, mw = w * 0.46, mh = 40 + open * 70;
    g.fillStyle = '#16060a';
    g.beginPath();
    g.moveTo(w / 2 - mw, cy - 10);
    g.quadraticCurveTo(w / 2, cy + 30, w / 2 + mw, cy - 10);
    g.quadraticCurveTo(w / 2, cy + mh * 2.2, w / 2 - mw, cy - 10);
    g.fill();
    // Lippen
    g.strokeStyle = '#8a1030'; g.lineWidth = 12; g.stroke();
    // Zähne
    g.fillStyle = '#efe8d6';
    const teeth = 17;
    for (let i = 0; i < teeth; i++) {
      const t = (i + 0.5) / teeth, x = w / 2 - mw + t * mw * 2;
      const top = cy - 10 + Math.sin(t * Math.PI) * 20;
      const bot = cy - 10 + Math.sin(t * Math.PI) * mh * 1.1;
      const tw = mw * 2 / teeth * 0.5, th = 18 + Math.sin(t * Math.PI) * 18;
      g.beginPath(); g.moveTo(x - tw, top); g.lineTo(x + tw, top); g.lineTo(x, top + th); g.fill();
      g.beginPath(); g.moveTo(x - tw, bot); g.lineTo(x + tw, bot); g.lineTo(x, bot - th); g.fill();
    }
  }, { color: true });
}

export function posterTexture(kind = 0) {
  seed = 200 + kind * 31;
  return make(256, 360, (g, w, h) => {
    const bgs = ['#e8d9b5', '#d9e3e8', '#f0cfcf'];
    g.fillStyle = bgs[kind % 3]; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b02020'; g.fillRect(0, 0, w, 62);
    g.fillStyle = '#fff'; g.font = 'bold 34px Oswald, Impact, sans-serif'; g.textAlign = 'center';
    g.fillText('PLAYTIME CO.', w / 2, 44);
    // Spielzeug-Figur
    g.save(); g.translate(w / 2, 180);
    if (kind % 3 === 0) {
      g.fillStyle = '#2f5fd0'; g.beginPath(); g.ellipse(0, 0, 55, 65, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-20, -15, 12, 0, 7); g.arc(20, -15, 12, 0, 7); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(-20, -15, 5, 0, 7); g.arc(20, -15, 5, 0, 7); g.fill();
      g.strokeStyle = '#c21d4a'; g.lineWidth = 7; g.beginPath(); g.arc(0, 8, 32, 0.15, Math.PI - 0.15); g.stroke();
    } else if (kind % 3 === 1) {
      g.fillStyle = '#e04a8a'; g.beginPath(); g.arc(0, 0, 50, 0, 7); g.fill();
      g.fillStyle = '#ffd24a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(Math.cos(i * 1.25) * 60, Math.sin(i * 1.25) * 60, 18, 0, 7); g.fill(); }
      g.fillStyle = '#000'; g.beginPath(); g.arc(-15, -8, 6, 0, 7); g.arc(15, -8, 6, 0, 7); g.fill();
    } else {
      g.fillStyle = '#6b4a2b'; g.fillRect(-45, -45, 90, 90);
      g.fillStyle = '#ffcc33'; g.font = 'bold 60px sans-serif'; g.fillText('A', 0, 20);
    }
    g.restore();
    g.fillStyle = '#222'; g.font = '22px Oswald, sans-serif';
    const lines = [['Wo Spielzeug', 'lebendig wird!'], ['Spielen ist', 'für immer!'], ['Lern mit', 'Freunden!']][kind % 3];
    g.fillText(lines[0], w / 2, 290); g.fillText(lines[1], w / 2, 318);
    // Kratzer über dem Poster
    if (kind === 1) {
      g.strokeStyle = 'rgba(40,0,0,.8)'; g.lineWidth = 5;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40 + i * 25, 90); g.lineTo(90 + i * 30, 300); g.stroke(); }
    }
    grime(g, w, h, 1.4);
    // Ränder zerfleddert
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(rnd() > 0.5 ? rr(0, 8) : w - rr(0, 8), rr(0, h), rr(4, 12), 0, 7); g.fill(); }
  });
}

export function scrawlTexture(text) {
  return make(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,10,10,.85)'; g.font = 'bold 110px Creepster, Impact, sans-serif'; g.textAlign = 'center';
    g.save(); g.translate(w / 2, h * 0.62); g.rotate(-0.05); g.fillText(text, 0, 0); g.restore();
    drips(g, w, h, h * 0.5, 16, 'rgba(110,8,8,');
  });
}

export function noteTexture() {
  seed = 42;
  return make(128, 160, (g, w, h) => {
    g.fillStyle = '#e8dfc8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(40,40,60,.55)';
    for (let y = 24; y < h - 10; y += 12) { g.beginPath(); g.moveTo(12, y); g.lineTo(rr(60, w - 10), y); g.stroke(); }
    g.fillStyle = '#b22'; g.beginPath(); g.arc(w / 2, 8, 5, 0, 7); g.fill();
    grime(g, w, h, 0.6);
  });
}

export function lockerTexture() {
  seed = 77;
  return make(128, 256, (g, w, h) => {
    g.fillStyle = '#3e5a48'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.5)';
    for (let y = 20; y < 70; y += 9) g.fillRect(24, y, w - 48, 4);
    for (let y = h - 70; y < h - 20; y += 9) g.fillRect(24, y, w - 48, 4);
    g.fillStyle = '#999'; g.fillRect(w - 26, h / 2 - 16, 8, 32);
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    drips(g, w, h, 0, 8);
    grime(g, w, h, 1);
  });
}
