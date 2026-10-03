// Grafik-Bausteine für den Nachtkiosk: Materialien mit Normal- und Rauheitskarten
// (alles zur Laufzeit berechnet, keine Bilddateien), Umgebungs-Spiegelung,
// Sterne/Mond/Lichtkegel und die Nachbearbeitung (Bloom, Filmkorn, Vignette).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export let ENV = null;        // Umgebungskarte für Spiegelungen
export const T = {};          // fertige Texturen-Sätze

const klemme = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const glatt = (a, b, v) => { const t = klemme((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function zufallsgenerator(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// ---------------------------------------------------------------------
//  Rauschen (kachelbar) und Texturen-Sätze
// ---------------------------------------------------------------------
export function feld(n, fx, fy, oktaven, seed) {
  const r = zufallsgenerator(seed);
  const aus = new Float32Array(n * n);
  let amp = 1, summe = 0;
  for (let o = 0; o < oktaven; o++) {
    const gx = Math.max(1, Math.round(fx * (1 << o))), gy = Math.max(1, Math.round(fy * (1 << o)));
    const g = new Float32Array(gx * gy);
    for (let i = 0; i < g.length; i++) g[i] = r();
    for (let y = 0; y < n; y++) {
      const v = y / n * gy, y0 = Math.floor(v), ty = v - y0, sy = ty * ty * (3 - 2 * ty);
      const ya = (y0 % gy) * gx, yb = ((y0 + 1) % gy) * gx;
      for (let x = 0; x < n; x++) {
        const u = x / n * gx, x0 = Math.floor(u), tx = u - x0, sx = tx * tx * (3 - 2 * tx);
        const xa = x0 % gx, xb = (x0 + 1) % gx;
        const a = g[ya + xa], b = g[ya + xb], c = g[yb + xa], d = g[yb + xb];
        aus[y * n + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
      }
    }
    summe += amp; amp *= 0.5;
  }
  for (let i = 0; i < aus.length; i++) aus[i] /= summe;
  return aus;
}

function leinwand(n, m = n) {
  const c = document.createElement('canvas'); c.width = n; c.height = m; return c;
}

function normalKarte(h, n, staerke) {
  const c = leinwand(n), g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
  for (let y = 0; y < n; y++) {
    const yu = ((y - 1 + n) % n) * n, yd = ((y + 1) % n) * n, yy = y * n;
    for (let x = 0; x < n; x++) {
      const l = h[yy + (x - 1 + n) % n], r = h[yy + (x + 1) % n];
      let nx = (l - r) * staerke, ny = (h[yd + x] - h[yu + x]) * staerke, nz = 1;
      const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      const i = (yy + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function tex(canvas, farbe, wdh) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(wdh[0], wdh[1]);
  t.colorSpace = farbe ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Baut Farb-, Normal- und Rauheitskarte aus Funktionen pro Pixel. */
function satz(n, wdh, { farbe, hoehe, rauheit, staerke = 2 }) {
  const cf = leinwand(n), gf = cf.getContext('2d'), imf = gf.createImageData(n, n);
  const cr = leinwand(n), gr = cr.getContext('2d'), imr = gr.createImageData(n, n);
  const c = [0, 0, 0];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x, p = i * 4;
    farbe(x, y, i, c);
    imf.data[p] = c[0]; imf.data[p + 1] = c[1]; imf.data[p + 2] = c[2]; imf.data[p + 3] = 255;
    const r = klemme(rauheit(x, y, i), 0.03, 1) * 255;
    imr.data[p] = 0; imr.data[p + 1] = r; imr.data[p + 2] = 0; imr.data[p + 3] = 255;
  }
  gf.putImageData(imf, 0, 0); gr.putImageData(imr, 0, 0);
  return {
    map: tex(cf, true, wdh),
    roughnessMap: tex(cr, false, wdh),
    normalMap: tex(normalKarte(hoehe, n, staerke), false, wdh)
  };
}

export function initTexturen() {
  const n = 512;

  // Bodenfliesen im Kiosk: schmutzig, abgetreten, mit dunklen Fugen
  {
    const rau = feld(n, 8, 8, 4, 11), fleck = feld(n, 3, 3, 5, 12), kratz = feld(n, 40, 40, 2, 13), kachel = n / 4;
    const h = new Float32Array(n * n), fuge = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const lx = x % kachel, ly = y % kachel, e = Math.min(lx, ly, kachel - 1 - lx, kachel - 1 - ly), i = y * n + x;
      fuge[i] = 1 - glatt(1.5, 5, e);
      h[i] = glatt(1.5, 6, e) * (0.85 + 0.15 * rau[i]) + kratz[i] * 0.04;
    }
    T.fliesen = satz(n, [1.4, 1.2], {
      hoehe: h, staerke: 3,
      farbe: (x, y, i, c) => {
        const tx = Math.floor(x / kachel), ty = Math.floor(y / kachel), grund = (tx + ty) % 2 ? [186, 182, 164] : [166, 174, 160];
        const schmutz = glatt(0.5, 0.75, fleck[i]) * 0.45 + fuge[i] * 0.2, v = 0.9 + rau[i] * 0.2;
        for (let k = 0; k < 3; k++) c[k] = mix(grund[k] * v, [58, 54, 46][k], klemme(schmutz + fuge[i] * 0.8, 0, 0.95));
      },
      rauheit: (x, y, i) => 0.32 + fleck[i] * 0.4 + fuge[i] * 0.4 + kratz[i] * 0.1
    });
  }

  // Wand im Kiosk: unten grüne Fliesen, oben abgeblätterter Putz
  {
    const putz = feld(n, 6, 6, 5, 21), fleck = feld(n, 2, 2, 5, 22), riss = feld(n, 30, 30, 3, 23);
    const h = new Float32Array(n * n), band = n * 0.62;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (y > band) {
        const lx = x % 24, ly = (y - band) % 24, e = Math.min(lx, ly);
        h[i] = glatt(0.5, 2.5, e) * 0.8 + 0.1;
      } else h[i] = putz[i] * 0.8 + riss[i] * 0.2;
    }
    T.wand = satz(n, [2.2, 1], {
      hoehe: h, staerke: 2.2,
      farbe: (x, y, i, c) => {
        if (y > band) {
          const lx = x % 24, ly = (y - band) % 24, fuge = Math.min(lx, ly) < 1.5 ? 1 : 0, v = 0.85 + putz[i] * 0.3;
          c[0] = mix(88 * v, 40, fuge); c[1] = mix(128 * v, 52, fuge); c[2] = mix(108 * v, 46, fuge);
        } else {
          const gelb = fleck[i] * 28, v = 0.88 + putz[i] * 0.22;
          c[0] = (226 - gelb * 0.4) * v; c[1] = (218 - gelb * 0.7) * v; c[2] = (192 - gelb * 1.4) * v;
          if (y > band - 6) { c[0] = 70; c[1] = 90; c[2] = 78; }
        }
      },
      rauheit: (x, y, i) => (y > band ? 0.18 + putz[i] * 0.15 : 0.85)
    });
  }

  // Wellblech-Außenwand des Kiosks
  {
    const streifen = feld(n, 40, 2, 3, 31), rost = feld(n, 10, 3, 4, 32), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) h[y * n + x] = 0.5 + 0.5 * Math.sin(x / n * Math.PI * 2 * 24) + rost[y * n + x] * 0.1;
    T.aussen = satz(n, [3, 1.2], {
      hoehe: h, staerke: 5,
      farbe: (x, y, i, c) => {
        const unten = glatt(0.55, 1, y / n), r = glatt(0.55, 0.8, rost[i]) * (0.3 + unten * 0.7), v = 0.8 + streifen[i] * 0.35;
        c[0] = mix(64 * v, 120, r * 0.7); c[1] = mix(78 * v, 62, r * 0.7); c[2] = mix(98 * v, 40, r * 0.7);
      },
      rauheit: (x, y, i) => 0.45 + rost[i] * 0.4
    });
  }

  // Asphalt: nass, mit Pfützen-Bereichen
  {
    const koernung = feld(n, 90, 90, 2, 41), gross = feld(n, 3, 3, 4, 42), mittel = feld(n, 14, 14, 4, 43), h = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) h[i] = koernung[i] * 0.7 + mittel[i] * 0.3;
    T.asphalt = satz(n, [26, 2.6], {
      hoehe: h, staerke: 2.5,
      farbe: (x, y, i, c) => {
        const nass = glatt(0.5, 0.58, gross[i]), v = (30 + koernung[i] * 36 + mittel[i] * 10) * mix(1, 0.55, nass);
        c[0] = v; c[1] = v * 1.02; c[2] = v * 1.08;
      },
      rauheit: (x, y, i) => mix(0.9 - koernung[i] * 0.25, 0.1, glatt(0.5, 0.58, gross[i]))
    });
  }

  // Platz vor dem Kiosk: Betonplatten
  {
    const rau = feld(n, 20, 20, 4, 51), fleck = feld(n, 3, 3, 4, 52), kachel = n / 2, h = new Float32Array(n * n), fugeF = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const lx = x % kachel, ly = y % kachel, e = Math.min(lx, ly, kachel - 1 - lx, kachel - 1 - ly), i = y * n + x;
      fugeF[i] = 1 - glatt(1, 4, e);
      h[i] = glatt(1, 5, e) * 0.8 + rau[i] * 0.2;
    }
    T.platten = satz(n, [18, 8], {
      hoehe: h, staerke: 3,
      farbe: (x, y, i, c) => {
        const nass = glatt(0.5, 0.6, fleck[i]), v = (66 + rau[i] * 40) * mix(1, 0.6, nass) * (1 - fugeF[i] * 0.6);
        c[0] = v; c[1] = v * 1.01; c[2] = v * 1.04;
      },
      rauheit: (x, y, i) => mix(0.85, 0.15, glatt(0.5, 0.6, fleck[i])) + fugeF[i] * 0.2
    });
  }

  // Holz (Regale, Theke)
  {
    const maserung = feld(n, 2, 60, 4, 61), ast = feld(n, 3, 10, 3, 62), h = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) h[i] = maserung[i] * 0.8 + ast[i] * 0.2;
    T.holz = satz(n, [1, 1], {
      hoehe: h, staerke: 1.5,
      farbe: (x, y, i, c) => { const v = 0.55 + maserung[i] * 0.8; c[0] = 120 * v; c[1] = 80 * v; c[2] = 48 * v; },
      rauheit: (x, y, i) => 0.55 + maserung[i] * 0.25
    });
  }

  // gebürstetes Metall
  {
    const linien = feld(n, 1, 120, 3, 71), h = linien;
    T.metall = satz(n, [1, 1], {
      hoehe: h, staerke: 0.8,
      farbe: (x, y, i, c) => { const v = 0.65 + linien[i] * 0.5; c[0] = 150 * v; c[1] = 155 * v; c[2] = 162 * v; },
      rauheit: (x, y, i) => 0.25 + linien[i] * 0.25
    });
  }

  // Rollladen aus Metall-Lamellen
  {
    const rost = feld(n, 6, 6, 4, 81), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const t = (y % 32) / 32;
      h[y * n + x] = Math.sin(t * Math.PI) * 0.9 + rost[y * n + x] * 0.1;
    }
    T.rollladen = satz(n, [1, 1], {
      hoehe: h, staerke: 5,
      farbe: (x, y, i, c) => {
        const t = (y % 32) / 32, licht = 0.55 + Math.sin(t * Math.PI) * 0.5, r = glatt(0.6, 0.8, rost[i]);
        c[0] = mix(172, 130, r) * licht; c[1] = mix(176, 82, r) * licht; c[2] = mix(182, 52, r) * licht;
      },
      rauheit: (x, y, i) => 0.35 + rost[i] * 0.4
    });
  }

  // Deckenplatten
  {
    const loch = feld(n, 60, 60, 2, 91), kachel = n / 2, h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const lx = x % kachel, ly = y % kachel, e = Math.min(lx, ly, kachel - 1 - lx, kachel - 1 - ly);
      h[y * n + x] = glatt(1, 4, e) * 0.7 + loch[y * n + x] * 0.3;
    }
    T.decke = satz(n, [3, 2.5], {
      hoehe: h, staerke: 2,
      farbe: (x, y, i, c) => { const v = 0.82 + loch[i] * 0.2; c[0] = 214 * v; c[1] = 212 * v; c[2] = 202 * v; },
      rauheit: () => 0.95
    });
  }

  // feine Normalkarten für Stoff und Haut
  {
    const f1 = feld(256, 90, 90, 2, 101), f2 = feld(256, 140, 6, 2, 102), h = new Float32Array(256 * 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const w = (Math.sin(x * 1.57) * Math.sin(y * 1.57)) * 0.5 + 0.5;
      h[y * 256 + x] = w * 0.6 + f1[y * 256 + x] * 0.4;
    }
    T.stoff = tex(normalKarte(h, 256, 2.2), false, [5, 5]);
    const p = feld(256, 120, 120, 3, 103);
    T.haut = tex(normalKarte(p, 256, 1.2), false, [3, 3]);
    void f2;
  }

  // Wasser: Kringel für Pfützen
  {
    const c = leinwand(256), g = c.getContext('2d');
    g.fillStyle = '#8080ff'; g.fillRect(0, 0, 256, 256);
    g.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 6 + Math.random() * 26;
      const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
      gr.addColorStop(0, 'rgba(128,128,255,0)'); gr.addColorStop(0.7, 'rgba(160,160,255,0.9)'); gr.addColorStop(1, 'rgba(128,128,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    T.wasser = tex(c, false, [2, 2]);
  }
}

// ---------------------------------------------------------------------
//  Umgebung (Spiegelungen) – eine kleine Nacht-Szene, einmal gerendert
// ---------------------------------------------------------------------
export function baueUmgebung(renderer) {
  const s = new THREE.Scene();
  const c = leinwand(4, 256), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#04070e'); gr.addColorStop(0.42, '#0d1530'); gr.addColorStop(0.5, '#2a2234'); gr.addColorStop(0.56, '#0b0b10'); gr.addColorStop(1, '#040405');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const kuppel = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.BackSide }));
  kuppel.material.map.colorSpace = THREE.SRGBColorSpace;
  s.add(kuppel);
  const karte = (r, gg, b, br, ho, rx, ry, rz, d = 40) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(br, ho), new THREE.MeshBasicMaterial({ color: new THREE.Color(r, gg, b), side: THREE.DoubleSide }));
    const v = new THREE.Vector3(rx, ry, rz).normalize().multiplyScalar(d);
    m.position.copy(v); m.lookAt(0, 0, 0); s.add(m);
  };
  karte(7, 8, 10, 6, 6, -0.5, 0.6, -0.6);                       // Mond
  karte(14, 8, 3, 1.5, 1.5, 1, 0.12, -0.2);                    // Laternen
  karte(12, 7, 2.5, 1.5, 1.5, -1, 0.12, -0.3);
  karte(10, 6, 2, 1.5, 1.5, 0.1, 0.1, 1);
  karte(12, 1.2, 1.8, 7, 1.5, 0.2, 0.18, -1);                  // rotes Leuchtschild
  karte(1.6, 6, 9, 5, 1, -0.3, 0.16, -1);                      // blaues Leuchtschild
  karte(1.2, 0.9, 0.6, 14, 10, 0, 1, 0.1, 30);                 // schwacher Himmelsschein
  const pm = new THREE.PMREMGenerator(renderer);
  ENV = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  return ENV;
}

// ---------------------------------------------------------------------
//  Himmel: Sterne, Mond, Lichtkegel
// ---------------------------------------------------------------------
export function sterne() {
  const n = 700, pos = new Float32Array(n * 3), farbe = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, e = Math.acos(Math.random() * 0.9 + 0.1), r = 120;
    pos[i * 3] = Math.sin(e) * Math.cos(a) * r; pos[i * 3 + 1] = Math.cos(e) * r; pos[i * 3 + 2] = Math.sin(e) * Math.sin(a) * r;
    const h = 0.5 + Math.random() * 0.5, warm = Math.random();
    farbe[i * 3] = h * (0.8 + warm * 0.2); farbe[i * 3 + 1] = h * 0.9; farbe[i * 3 + 2] = h;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(farbe, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
  p.frustumCulled = false;
  return p;
}

export function mond() {
  const c = leinwand(256), g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.12, 'rgba(235,240,255,1)'); gr.addColorStop(0.16, 'rgba(180,200,255,0.5)');
  gr.addColorStop(0.4, 'rgba(110,140,220,0.18)'); gr.addColorStop(1, 'rgba(60,90,180,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(150,160,190,0.35)';
  for (const [x, y, r] of [[116, 120, 7], [138, 108, 5], [128, 138, 9], [112, 100, 4]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, fog: false, depthWrite: false, transparent: true }));
  sp.scale.set(46, 46, 1);
  return sp;
}

/** Weicher Lichtkegel um eine Lampe: leuchtet in der Mitte, wird zu den Rändern und nach unten durchsichtig. */
export function lichtkegel(radius, hoehe, farbe, deckkraft) {
  const geo = new THREE.ConeGeometry(radius, hoehe, 40, 1, true);
  geo.translate(0, -hoehe / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, deckkraft: { value: deckkraft * 6 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); vH = uv.y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 farbe; uniform float deckkraft; varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 3.0) * pow(vH, 1.6) * deckkraft; gl_FragColor = vec4(farbe, a); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  m.renderOrder = 5;
  return m;
}

// ---------------------------------------------------------------------
//  Nachbearbeitung
// ---------------------------------------------------------------------
const FilmShader = {
  uniforms: { tDiffuse: { value: null }, zeit: { value: 0 }, korn: { value: 0.07 }, aberration: { value: 0.0014 }, schock: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float zeit, korn, aberration, schock; varying vec2 vUv;
    float zufall(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + zeit) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float d = dot(c, c);
      vec2 off = c * aberration * (1.0 + schock * 7.0) * (0.4 + d * 5.0);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      float k = zufall(vUv * vec2(1777.0, 1031.0) + zeit * 13.0) - 0.5;
      float hell = dot(col, vec3(0.3333));
      col += k * korn * (1.0 - hell * 0.75);
      col *= 1.0 - smoothstep(0.18, 0.85, d * 1.9) * 0.6;
      col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), 0.1);
      gl_FragColor = vec4(col, 1.0);
    }`
};

export function baueNachbearbeitung(renderer, scene, camera, samples = 4) {
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.samples = samples; composer.renderTarget2.samples = samples;
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.42, 0.6, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);
  return { composer, bloom, film };
}
