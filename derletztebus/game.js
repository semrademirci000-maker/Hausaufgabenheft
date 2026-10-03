// Der letzte Bus – Nachtkiosk
// Du übernimmst die Nachtschicht im Kiosk an der Endstation. Busse bringen
// Kunden: Sachen aus dem Regal holen, auf die Theke legen, kassieren,
// Wechselgeld geben. Manche Kunden sind keine Menschen – dann Rollladen runter.
// Kommt eines rein: hinten raus und zum Bus rennen!
import * as THREE from 'three';
import { Ton } from './audio.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const zufall = (a, b) => a + Math.random() * (b - a);
const wuerfel = a => a[Math.floor(Math.random() * a.length)];
const euro = ct => (ct < 0 ? '−' : '') + (Math.abs(ct) / 100).toFixed(2).replace('.', ',') + ' €';
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

// ======================================================================
//  Waren, Nächte, Speicher
// ======================================================================
const WAREN = [
  { id: 'wasser', name: 'Wasser', emoji: '💧', preis: 100 },
  { id: 'cola', name: 'Cola', emoji: '🥤', preis: 200 },
  { id: 'chips', name: 'Chips', emoji: '🍟', preis: 250 },
  { id: 'schoko', name: 'Schokolade', emoji: '🍫', preis: 150 },
  { id: 'kaugummi', name: 'Kaugummi', emoji: '🍬', preis: 50 },
  { id: 'zeitung', name: 'Zeitung', emoji: '📰', preis: 300 }
];
const WARE = Object.fromEntries(WAREN.map(w => [w.id, w]));
const SELTSAM = ['rohes Fleisch', 'deine Stimme', 'einen Zahn', 'dein Gesicht', 'kalte Erde', 'DICH', 'deinen Namen', 'Haare'];

const NAECHTE = [
  { monster: 0.25, geduld: 50, lauern: 9, tempo: 3.6, waren: [1, 2], pause: [4, 7] },
  { monster: 0.35, geduld: 42, lauern: 7, tempo: 3.9, waren: [1, 3], pause: [3, 6] },
  { monster: 0.45, geduld: 36, lauern: 5.5, tempo: 4.2, waren: [2, 3], pause: [2.5, 5] }
];
const MIN_PRO_SEK = 1.6;      // Spielminuten pro echter Sekunde (22:00 → 06:00 ≈ 5 Minuten)
const NACHT_LAENGE = 480;     // Minuten von 22 bis 6 Uhr

const SPEICHER = 'derletztebus.kiosk';
function lade() { try { return JSON.parse(localStorage.getItem(SPEICHER)) || {}; } catch (e) { return {}; } }
function speichere(d) { try { localStorage.setItem(SPEICHER, JSON.stringify(d)); } catch (e) { /* egal */ } }

// ======================================================================
//  Grafik
// ======================================================================
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$('spiel').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.FogExp2(0x05070d, 0.05);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 160);
camera.rotation.order = 'YXZ';

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

scene.add(new THREE.HemisphereLight(0x5a6890, 0x0c0a08, 0.55));

// ---------- Texturen aus Canvas ----------
function leinwand(w, h, malen) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  malen(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function wiederholt(t, x, y) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; }
function koernig(g, w, h, menge, a) {
  for (let i = 0; i < menge; i++) {
    g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

const TX = {
  fliesen: wiederholt(leinwand(256, 256, (g, w, h) => {
    g.fillStyle = '#bdb7a8'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? '#a9a395' : '#c8c2b3'; g.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
    }
    koernig(g, w, h, 1500, .12);
  }), 6, 5),
  wand: wiederholt(leinwand(256, 256, (g, w, h) => {
    g.fillStyle = '#7f9c8e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9d3c0'; g.fillRect(0, 150, w, 106);
    g.fillStyle = '#5c6f64'; g.fillRect(0, 146, w, 6);
    koernig(g, w, h, 2500, .1);
  }), 3, 1),
  aussen: wiederholt(leinwand(256, 256, (g, w, h) => {
    g.fillStyle = '#3d4a5e'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = '#2f3a4b'; g.fillRect(x, 0, 3, h); }
    koernig(g, w, h, 3000, .15);
  }), 4, 1),
  asphalt: wiederholt(leinwand(256, 256, (g, w, h) => {
    g.fillStyle = '#1b1c20'; g.fillRect(0, 0, w, h); koernig(g, w, h, 6000, .2);
  }), 30, 3),
  platten: wiederholt(leinwand(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4a4e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#333337'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    koernig(g, w, h, 3000, .15);
  }), 16, 8),
  rollladen: leinwand(128, 256, (g, w, h) => {
    for (let y = 0; y < h; y += 16) {
      const v = g.createLinearGradient(0, y, 0, y + 16);
      v.addColorStop(0, '#9aa0a8'); v.addColorStop(.5, '#c7ccd2'); v.addColorStop(1, '#6f747b');
      g.fillStyle = v; g.fillRect(0, y, w, 16);
    }
  }),
  schild: leinwand(512, 96, (g, w, h) => {
    g.fillStyle = '#120808'; g.fillRect(0, 0, w, h);
    g.font = 'bold 66px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff3355'; g.shadowBlur = 18; g.fillStyle = '#ff5a6e'; g.fillText('KIOSK', 190, 52);
    g.shadowColor = '#40c8ff'; g.fillStyle = '#7fdcff'; g.fillText('24h', 410, 52);
  }),
  busLed: leinwand(512, 96, (g, w, h) => {
    g.fillStyle = '#100a02'; g.fillRect(0, 0, w, h);
    g.font = 'bold 54px monospace'; g.textBaseline = 'middle'; g.fillStyle = '#ffaa2b';
    g.shadowColor = '#ffaa2b'; g.shadowBlur = 10; g.fillText('N13  ENDSTATION', 18, 50);
  }),
  haltestelle: leinwand(128, 160, (g, w, h) => {
    g.fillStyle = '#f3e9b0'; g.beginPath(); g.arc(64, 60, 56, 0, Math.PI * 2); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#2d7a3e'; g.stroke();
    g.fillStyle = '#2d7a3e'; g.font = 'bold 70px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 64, 64);
    g.fillStyle = '#f3efe2'; g.fillRect(4, 124, 120, 32);
    g.fillStyle = '#111'; g.font = 'bold 20px Arial'; g.fillText('Endstation', 64, 141);
  }),
  zeitung: leinwand(128, 160, (g, w, h) => {
    g.fillStyle = '#ecebe4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#222'; g.font = 'bold 22px serif'; g.fillText('MORGEN', 10, 26);
    for (let y = 40; y < h - 8; y += 9) { g.fillStyle = '#9a9a9a'; g.fillRect(10, y, w - 20 - (y % 3) * 10, 4); }
  })
};

function preisSchild(ware) {
  return leinwand(256, 80, (g, w, h) => {
    g.fillStyle = '#fff9e6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e23c2c'; g.fillRect(0, 0, 10, h);
    g.fillStyle = '#1a1a1a'; g.font = 'bold 34px Inter, Arial'; g.textBaseline = 'middle';
    g.fillText(ware.name, 22, 28);
    g.fillStyle = '#c4231a'; g.font = 'bold 32px Inter, Arial'; g.fillText(euro(ware.preis), 22, 62);
  });
}

const M = {
  boden: new THREE.MeshStandardMaterial({ map: TX.fliesen, roughness: .6 }),
  wand: new THREE.MeshStandardMaterial({ map: TX.wand, roughness: .85 }),
  aussen: new THREE.MeshStandardMaterial({ map: TX.aussen, roughness: .8 }),
  dach: new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: .9 }),
  holz: new THREE.MeshStandardMaterial({ color: 0x7a5434, roughness: .7 }),
  theke: new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: .5 }),
  metall: new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: .4, metalness: .6 }),
  dunkel: new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: .8 }),
  asphalt: new THREE.MeshStandardMaterial({ map: TX.asphalt, roughness: .95 }),
  platten: new THREE.MeshStandardMaterial({ map: TX.platten, roughness: .9 }),
  erde: new THREE.MeshStandardMaterial({ color: 0x0d1210, roughness: 1 }),
  unsichtbar: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  roehre: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 2 })
};

function kiste(w, h, d, mat, x, y, z, eltern = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  eltern.add(m);
  return m;
}

// ======================================================================
//  Kollision (alles in der Draufsicht als Rechtecke)
// ======================================================================
const HINDERNISSE = [];
function hindernis(x0, x1, z0, z1, aktiv) { HINDERNISSE.push({ x0, x1, z0, z1, aktiv }); }
function schiebeRaus(p, r) {
  for (const b of HINDERNISSE) {
    if (b.aktiv && !b.aktiv()) continue;
    const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      p.x = cx + dx / d * r; p.z = cz + dz / d * r;
    } else {
      const l = p.x - b.x0, re = b.x1 - p.x, u = p.z - b.z0, o = b.z1 - p.z, m = Math.min(l, re, u, o);
      if (m === l) p.x = b.x0 - r; else if (m === re) p.x = b.x1 + r; else if (m === u) p.z = b.z0 - r; else p.z = b.z1 + r;
    }
  }
  p.x = clamp(p.x, -20, 12);
  p.z = clamp(p.z, -8.3, 8);
}
const KIOSK = { x0: -3.2, x1: 3.2, z0: -2.7, z1: 2.7 };
const drinnen = p => p.x > -3.05 && p.x < 3.05 && p.z > -2.55 && p.z < 2.55;
function siehtDurch(ax, az, bx, bz, box = KIOSK, rand = 0.15) {
  // Schneidet die Strecke a→b das Rechteck? (Slab-Methode)
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  const pruef = (p, q) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  const x0 = box.x0 - rand, x1 = box.x1 + rand, z0 = box.z0 - rand, z1 = box.z1 + rand;
  const trifft = pruef(-dx, ax - x0) && pruef(dx, x1 - ax) && pruef(-dz, az - z0) && pruef(dz, z1 - az);
  return !trifft;
}

// ======================================================================
//  Welt bauen
// ======================================================================
const klickbar = [];
const W = {};   // wichtige Teile der Welt

function baueWelt() {
  // --- Boden draußen ---
  const erde = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M.erde);
  erde.rotation.x = -Math.PI / 2; erde.position.y = -0.02; scene.add(erde);
  const platz = new THREE.Mesh(new THREE.PlaneGeometry(36, 16), M.platten);
  platz.rotation.x = -Math.PI / 2; platz.position.set(-4, -0.01, 1); scene.add(platz);
  const strasse = new THREE.Mesh(new THREE.PlaneGeometry(200, 6), M.asphalt);
  strasse.rotation.x = -Math.PI / 2; strasse.position.set(0, -0.005, -10); scene.add(strasse);
  for (let x = -90; x < 90; x += 6) kiste(3, 0.01, 0.15, new THREE.MeshBasicMaterial({ color: 0x8a8a70 }), x, 0.002, -10);
  kiste(200, 0.15, 0.3, M.metall, 0, 0.07, -7.1);   // Bordstein

  // --- Kiosk ---
  const innenBoden = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), M.boden);
  innenBoden.rotation.x = -Math.PI / 2; innenBoden.position.y = 0.005; scene.add(innenBoden);
  const H = 3;
  // Rückwand
  kiste(6.4, H, 0.2, M.wand, 0, H / 2, 2.6);
  kiste(6.6, H, 0.05, M.aussen, 0, H / 2, 2.73);
  // linke Wand
  kiste(0.2, H, 5.2, M.wand, -3.1, H / 2, 0);
  kiste(0.05, H, 5.5, M.aussen, -3.23, H / 2, 0);
  // rechte Wand mit Hintertür (z 0.4 … 1.6)
  kiste(0.2, H, 2.9, M.wand, 3.1, H / 2, -1.05);
  kiste(0.2, H, 0.9, M.wand, 3.1, H / 2, 2.05);
  kiste(0.2, 0.8, 1.2, M.wand, 3.1, 2.6, 1.0);
  kiste(0.05, H, 2.9, M.aussen, 3.23, H / 2, -1.25);
  kiste(0.05, H, 1.0, M.aussen, 3.23, H / 2, 2.2);
  kiste(0.05, 0.8, 1.2, M.aussen, 3.23, 2.6, 1.0);
  // Vorderwand mit Verkaufsfenster (x −2.1 … 2.1, y 1.0 … 2.3)
  kiste(6.4, 1.0, 0.2, M.wand, 0, 0.5, -2.6);
  kiste(6.6, 1.0, 0.05, M.aussen, 0, 0.5, -2.73);
  kiste(6.4, 0.7, 0.2, M.wand, 0, 2.65, -2.6);
  kiste(6.6, 0.7, 0.05, M.aussen, 0, 2.65, -2.73);
  kiste(1.0, 1.3, 0.2, M.wand, -2.6, 1.65, -2.6);
  kiste(1.0, 1.3, 0.2, M.wand, 2.6, 1.65, -2.6);
  kiste(1.1, 1.3, 0.05, M.aussen, -2.65, 1.65, -2.73);
  kiste(1.1, 1.3, 0.05, M.aussen, 2.65, 1.65, -2.73);
  kiste(6.8, 0.25, 5.8, M.dach, 0, H + 0.12, 0);
  // Theke
  const theke = kiste(4.4, 0.08, 0.75, M.theke, 0, 1.02, -2.2);
  theke.userData = { typ: 'theke' }; klickbar.push(theke);
  kiste(4.4, 1.0, 0.1, M.holz, 0, 0.5, -1.86);
  hindernis(-2.25, 2.25, -2.6, -1.8);
  // Neonröhre und Licht
  W.roehre = kiste(1.6, 0.06, 0.12, M.roehre, 0, 2.94, 0);
  W.licht = new THREE.PointLight(0xfff0d0, 22, 12, 1.6);
  W.licht.position.set(0, 2.7, 0); scene.add(W.licht);
  W.notlicht = new THREE.PointLight(0xff1a10, 0, 10, 1.6);
  W.notlicht.position.set(0, 2.6, 1); scene.add(W.notlicht);
  // Leuchtschild
  const schild = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64), new THREE.MeshBasicMaterial({ map: TX.schild }));
  schild.position.set(0, 3.55, -2.8); schild.rotation.y = Math.PI; scene.add(schild);
  kiste(3.6, 0.8, 0.1, M.dunkel, 0, 3.55, -2.74);
  W.schildLicht = new THREE.PointLight(0xff4060, 6, 8, 1.8);
  W.schildLicht.position.set(0, 3.4, -3.4); scene.add(W.schildLicht);

  // Wände als Hindernisse
  hindernis(-3.25, 3.25, 2.5, 2.78);
  hindernis(-3.25, -3.0, -2.78, 2.78);
  hindernis(3.0, 3.25, -2.78, 0.4);
  hindernis(3.0, 3.25, 1.6, 2.78);
  hindernis(3.0, 3.25, 0.4, 1.6, () => !W.tuerOffen);
  hindernis(-3.25, 3.25, -2.78, -2.5);

  // Hintertür
  W.tuerOffen = false; W.tuerWinkel = 0;
  W.tuer = new THREE.Group(); W.tuer.position.set(3.12, 0, 0.4); scene.add(W.tuer);
  const blatt = kiste(0.07, 2.2, 1.2, new THREE.MeshStandardMaterial({ color: 0x5a3e2a, roughness: .7 }), 0, 1.1, 0.6, W.tuer);
  kiste(0.12, 0.05, 0.15, M.metall, 0, 1.05, 1.0, W.tuer);
  blatt.userData = { typ: 'tuer' };
  W.tuerLicht = new THREE.PointLight(0xffd8a0, 4, 7, 1.8);
  W.tuerLicht.position.set(3.8, 2.4, 1); scene.add(W.tuerLicht);
  kiste(0.3, 0.12, 0.2, M.roehre, 3.35, 2.35, 1);
  // „AUSGANG“-Schild innen über der Tür
  const ausgang = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.2), new THREE.MeshBasicMaterial({
    map: leinwand(256, 72, (g, w, h) => {
      g.fillStyle = '#0a7a2a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8ffe8'; g.font = 'bold 44px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AUSGANG ➜', w / 2, h / 2 + 2);
    })
  }));
  ausgang.position.set(2.98, 2.45, 1.0); ausgang.rotation.y = -Math.PI / 2; scene.add(ausgang);

  // Regale an der Rückwand
  for (const y of [0.45, 0.95, 1.45, 1.95]) kiste(5.4, 0.04, 0.45, M.holz, -0.2, y, 2.27);
  for (const x of [-2.9, -0.95, 1.0, 2.5]) kiste(0.05, 2.0, 0.45, M.holz, x, 1.0, 2.27);
  hindernis(-2.95, 2.55, 2.02, 2.55);
  const plaetze = [
    ['wasser', -1.92, 0.97], ['cola', 0.02, 0.97], ['chips', 1.75, 0.97],
    ['schoko', -1.92, 1.47], ['kaugummi', 0.02, 1.47], ['zeitung', 1.75, 1.47]
  ];
  for (const [id, x, y] of plaetze) {
    const anzahl = id === 'zeitung' ? 3 : 5;
    for (let i = 0; i < anzahl; i++) {
      const w = wareModell(id);
      w.position.set(x - 0.6 + (i + 0.5) * (1.2 / anzahl), y, 2.25 + zufall(-0.04, 0.04));
      w.rotation.y = zufall(-0.15, 0.15);
      scene.add(w);
    }
    const treffer = kiste(1.6, 0.46, 0.5, M.unsichtbar, x, y + 0.2, 2.2);
    treffer.userData = { typ: 'regal', ware: id }; klickbar.push(treffer);
    const preis = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshBasicMaterial({ map: preisSchild(WARE[id]) }));
    preis.position.set(x, y - 0.06, 2.03); preis.rotation.y = Math.PI; scene.add(preis);
  }
  // Kühlschrank links (Deko)
  kiste(0.9, 2.0, 0.7, new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: .3, metalness: .2 }), -2.5, 1.0, 1.4);
  kiste(0.8, 1.6, 0.02, new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x2a6080, emissiveIntensity: .8, transparent: true, opacity: .7 }), -2.5, 1.1, 1.04);
  hindernis(-2.98, -2.02, 1.03, 1.78);

  // Kasse
  W.kasse = new THREE.Group(); W.kasse.position.set(1.55, 1.06, -2.2); scene.add(W.kasse);
  kiste(0.5, 0.14, 0.4, M.dunkel, 0, 0.07, 0, W.kasse);
  const bild = kiste(0.36, 0.22, 0.03, new THREE.MeshStandardMaterial({ color: 0x0a2a10, emissive: 0x2aff60, emissiveIntensity: .6 }), 0, 0.3, 0.05, W.kasse);
  bild.rotation.x = -0.35;
  kiste(0.05, 0.16, 0.05, M.dunkel, 0, 0.18, 0.08, W.kasse);
  const kasseTreffer = kiste(0.7, 0.6, 0.6, M.unsichtbar, 0, 0.25, 0, W.kasse);
  kasseTreffer.userData = { typ: 'kasse' }; klickbar.push(kasseTreffer);

  // Rollladen + Schalter
  W.rollladen = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1, 0.04), new THREE.MeshStandardMaterial({ map: TX.rollladen, roughness: .5, metalness: .4 }));
  W.rollladen.position.set(0, 2.3, -2.76); scene.add(W.rollladen);
  kiste(4.5, 0.3, 0.3, M.metall, 0, 2.42, -2.88);
  W.rollStand = 0; W.rollZiel = 0;
  const schalter = new THREE.Group(); schalter.position.set(-2.95, 1.45, -2.0); scene.add(schalter);
  kiste(0.08, 0.36, 0.26, new THREE.MeshStandardMaterial({ color: 0xf0c020 }), 0, 0, 0, schalter);
  W.schalterKnopf = kiste(0.06, 0.12, 0.12, new THREE.MeshStandardMaterial({ color: 0xd01010, emissive: 0x600000 }), 0.05, 0, 0, schalter);
  const schalterTreffer = kiste(0.5, 0.6, 0.6, M.unsichtbar, 0.1, 0, 0, schalter);
  schalterTreffer.userData = { typ: 'rollladen' }; klickbar.push(schalterTreffer);

  // --- Draußen: Haltestelle, Laternen, Mülleimer, Bäume ---
  const hs = new THREE.Group(); hs.position.set(-11.5, 0, -5.4); scene.add(hs);
  kiste(3.2, 2.2, 0.05, new THREE.MeshStandardMaterial({ color: 0x9fb8c8, transparent: true, opacity: .35, roughness: .1 }), 0, 1.2, 0.5, hs);
  kiste(3.4, 0.08, 1.4, M.dach, 0, 2.35, 0, hs);
  for (const x of [-1.6, 1.6]) kiste(0.08, 2.35, 0.08, M.metall, x, 1.17, 0.5, hs);
  kiste(2.2, 0.06, 0.4, M.holz, 0, 0.5, 0.25, hs);
  hindernis(-13.2, -9.8, -5.0, -4.8);
  kiste(0.08, 2.6, 0.08, M.metall, -8, 1.3, -6.7);
  const hSchild = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.69), new THREE.MeshBasicMaterial({ map: TX.haltestelle }));
  hSchild.position.set(-8, 2.5, -6.65); hSchild.rotation.y = Math.PI; scene.add(hSchild);

  W.laternen = [];
  for (const [x, z] of [[-6, -6.6], [7, -6.6], [-15, 4]]) {
    kiste(0.12, 4.2, 0.12, M.dunkel, x, 2.1, z);
    kiste(0.6, 0.1, 0.25, M.dunkel, x, 4.2, z);
    kiste(0.4, 0.05, 0.2, M.roehre, x, 4.13, z);
    const l = new THREE.PointLight(0xffc477, 26, 16, 1.6); l.position.set(x, 4, z); scene.add(l);
    W.laternen.push(l);
  }
  for (const [x, z] of [[5.2, -4.2], [-4.7, -4.5]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.9, 14), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: .7 }));
    m.position.set(x, 0.45, z); scene.add(m);
    hindernis(x - 0.32, x + 0.32, z - 0.32, z + 0.32);
  }
  const baumMat = new THREE.MeshStandardMaterial({ color: 0x0a120d, roughness: 1 });
  for (let i = 0; i < 40; i++) {
    const seite = i % 2 ? 1 : -1;
    const x = zufall(-60, 60), z = seite > 0 ? zufall(10, 30) : zufall(-16, -40);
    const h = zufall(4, 9);
    const b = new THREE.Mesh(new THREE.ConeGeometry(zufall(1.2, 2.2), h, 7), baumMat);
    b.position.set(x, h / 2, z); scene.add(b);
  }
  // Zaun hinter dem Kiosk
  for (let x = -18; x <= 12; x += 0.6) kiste(0.06, 1.4, 0.06, M.dunkel, x, 0.7, 8.3);
  kiste(30, 0.06, 0.06, M.dunkel, -3, 1.2, 8.3);

  baueBus();
  baueRegen();
}

function wareModell(id) {
  const g = new THREE.Group();
  const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .4, ...extra });
  let m;
  switch (id) {
    case 'wasser':
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 12), std(0x7cc8ff, { transparent: true, opacity: .75, roughness: .1 }));
      m.position.y = 0.11; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 8), std(0x2a6ad0)); m.position.y = 0.235; g.add(m);
      break;
    case 'cola':
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14), std(0xd21c18, { metalness: .5 })); m.position.y = 0.06; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.01, 14), std(0xcccccc, { metalness: .8 })); m.position.y = 0.125; g.add(m);
      break;
    case 'chips':
      m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.06), std(0xf2c230)); m.position.y = 0.11; g.add(m);
      m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.062), std(0xd23a1a)); m.position.y = 0.12; g.add(m);
      break;
    case 'schoko':
      m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.08), std(0x6b3fa0)); m.position.y = 0.0125; g.add(m);
      m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.027, 0.082), std(0xe0e0e0, { metalness: .6 })); m.position.set(0.05, 0.0125, 0); g.add(m);
      break;
    case 'kaugummi':
      m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.035), std(0x3fbf6a)); m.position.y = 0.025; g.add(m);
      break;
    case 'zeitung':
      m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.3), [std(0xdddddd), std(0xdddddd), new THREE.MeshStandardMaterial({ map: TX.zeitung }), std(0xdddddd), std(0xdddddd), std(0xdddddd)]);
      m.position.y = 0.01; g.add(m);
      break;
  }
  return g;
}

// ---------- Bus ----------
function baueBus() {
  const g = new THREE.Group();
  kiste(11, 2.6, 2.6, new THREE.MeshStandardMaterial({ color: 0xe0a020, roughness: .5, metalness: .2 }), 0, 1.7, 0, g);
  kiste(11.02, 0.4, 2.62, new THREE.MeshStandardMaterial({ color: 0x2a2a2a }), 0, 0.55, 0, g);
  W.busFenster = new THREE.MeshStandardMaterial({ color: 0x302810, emissive: 0xffd58a, emissiveIntensity: 1.1 });
  kiste(9.4, 0.95, 2.64, W.busFenster, -0.6, 2.25, 0, g);
  kiste(0.04, 1.2, 2.3, new THREE.MeshStandardMaterial({ color: 0x222233, emissive: 0x554422, emissiveIntensity: .6 }), 5.51, 2.2, 0, g);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.4), new THREE.MeshBasicMaterial({ map: TX.busLed }));
  led.position.set(5.52, 2.85, 0); led.rotation.y = Math.PI / 2; g.add(led);
  for (const z of [-0.85, 0.85]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
    s.position.set(5.5, 0.9, z); g.add(s);
  }
  W.busTuer = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xffd080, emissiveIntensity: 0 });
  kiste(1.1, 2.1, 0.04, W.busTuer, 3.5, 1.45, 1.31, g);
  const rad = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
  for (const [x, z] of [[-3.5, 1.2], [3.5, 1.2], [-3.5, -1.2], [3.5, -1.2]]) {
    const r = new THREE.Mesh(rad, M.dunkel); r.rotation.x = Math.PI / 2; r.position.set(x, 0.5, z); g.add(r);
  }
  W.busLicht = new THREE.PointLight(0xffd090, 10, 9, 1.6);
  W.busLicht.position.set(2, 2.2, 2); g.add(W.busLicht);
  g.position.set(-90, 0, -10);
  scene.add(g);
  W.bus = { g, zustand: 'weg', t: 0, x: -90 };
}
const BUS_HALT = -11.5;   // Tür bei x = −8
const BUS_TUER = new THREE.Vector3(-8, 0, -7.7);

// ---------- Regen ----------
function baueRegen() {
  const n = 1400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) setzeTropfen(pos, i, zufall(0, 14));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  W.regen = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8fa3c8, size: 0.05, transparent: true, opacity: .55, depthWrite: false }));
  W.regen.frustumCulled = false;
  scene.add(W.regen);
}
function setzeTropfen(pos, i, y) {
  let x = zufall(-24, 14);
  const z = zufall(-20, 12);
  if (x > -3.5 && x < 3.5 && z > -3 && z < 3) x += 8;
  pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
}

// ======================================================================
//  Figuren (Kunden und Monster)
// ======================================================================
const MANTEL = [0x2d4a7a, 0x7a2d2d, 0x2f6a3f, 0x6b5a3a, 0x444a55, 0x8a6a2a, 0x5a3a6a, 0x2a6a6a];
const HAUT = [0xf1c9a5, 0xd9a37c, 0xa86f4c, 0x6e4630, 0xe8b896];
const HAAR = [0x2a1d14, 0x5a3a1c, 0xb08a4a, 0x111111, 0x777777, 0x8a2a1a];

function baueFigur(monster, zeichen) {
  const g = new THREE.Group();
  const mantelMat = new THREE.MeshStandardMaterial({ color: wuerfel(MANTEL), roughness: .85 });
  const hautMat = new THREE.MeshStandardMaterial({ color: wuerfel(HAUT), roughness: .7 });
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x22252c, roughness: .9 });
  const haarMat = new THREE.MeshStandardMaterial({ color: wuerfel(HAAR), roughness: .9 });

  const koerper = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 12), mantelMat);
  koerper.position.y = 1.08; g.add(koerper);
  const kopf = new THREE.Group(); kopf.position.y = 1.68; g.add(kopf);
  kopf.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), hautMat));
  const art = Math.floor(Math.random() * 3);
  if (art === 0) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.168, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), haarMat); h.position.y = 0.01; kopf.add(h); }
  if (art === 1) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 14), new THREE.MeshStandardMaterial({ color: wuerfel(MANTEL) }));
    h.position.y = 0.12; kopf.add(h);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.14), h.material); s.position.set(0, 0.07, 0.15); kopf.add(s);
  }
  if (art === 2) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), haarMat); h.rotation.x = -0.3; kopf.add(h); }

  // Augen
  const leuchten = monster && zeichen.has('augen');
  const augeWeiss = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: .3 });
  const pupilleMat = leuchten ? new THREE.MeshBasicMaterial({ color: 0xff2a14 }) : new THREE.MeshStandardMaterial({ color: 0x111111 });
  const augen = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), augeWeiss); a.position.set(s * 0.06, 0.02, 0.135); kopf.add(a);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), pupilleMat); p.position.set(s * 0.06, 0.02, 0.16); kopf.add(p);
    augen.push(p);
  }
  // Maul (nur beim Angriff sichtbar)
  const maul = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.03), new THREE.MeshBasicMaterial({ color: 0x5a0000 }));
  maul.position.set(0, -0.07, 0.145); maul.visible = false; kopf.add(maul);
  for (let i = -3; i <= 3; i++) {
    const z = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4), new THREE.MeshBasicMaterial({ color: 0xf0eee0 }));
    z.position.set(i * 0.026, 0.025, 0.01); z.rotation.x = Math.PI; maul.add(z);
  }

  const glied = (r, l, mat, x, y) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0); g.add(piv);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 8), mat); m.position.y = -l / 2 - r * 0.5; piv.add(m);
    return piv;
  };
  const beinL = glied(0.085, 0.42, hoseMat, -0.1, 0.62), beinR = glied(0.085, 0.42, hoseMat, 0.1, 0.62);
  const armL = glied(0.065, 0.46, mantelMat, -0.3, 1.42), armR = glied(0.065, 0.46, mantelMat, 0.3, 1.42);
  armL.rotation.z = -0.08; armR.rotation.z = 0.08;

  const schatten = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .55, depthWrite: false }));
  schatten.rotation.x = -Math.PI / 2; schatten.position.y = 0.015; g.add(schatten);
  if (monster && zeichen.has('schatten')) schatten.visible = false;

  const gross = monster && zeichen.has('gross');
  const breite = gross ? 0.82 : zufall(0.95, 1.1);
  g.scale.set(breite, gross ? 1.24 : zufall(0.92, 1.06), breite);
  scene.add(g);
  return { g, kopf, augen, maul, beinL, beinR, armL, armR, koerper, mantelMat, hautMat, schatten };
}

function verwandeln(f) {
  f.g.scale.set(0.95, 1.32, 0.95);
  f.mantelMat.color.set(0x0c0c0e);
  f.hautMat.color.set(0x6d7a6a);
  f.augen.forEach(a => { a.material = new THREE.MeshBasicMaterial({ color: 0xff2010 }); a.scale.setScalar(1.6); });
  f.maul.visible = true;
  f.armL.scale.set(1, 1.7, 1); f.armR.scale.set(1, 1.7, 1);
  f.schatten.visible = false;
}

function entferneFigur(f) {
  scene.remove(f.g);
  f.g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
}

// ======================================================================
//  Spielzustand
// ======================================================================
const S = {
  modus: 'titel',        // titel | intro | schicht | kasse | jagd | schreck | uebergang | ende | pause
  vorPause: 'schicht',
  nacht: 0,
  zeit: 0,               // Minuten seit 22:00
  geld: 0,
  herzen: 3,
  kunde: null,
  naechsterIn: 3,
  seitMonster: 0,
  kundenGesamt: 0,
  tragen: [],
  theke: [],             // { id, mesh }
  stat: { bedient: 0, monster: 0, entkommen: 0, verjagt: 0 },
  flackern: 0
};
const spieler = { pos: new THREE.Vector3(0, 0, -0.9), yaw: 0, pitch: -0.05, ausdauer: 1, rennt: false, schrittWeg: 0, wippen: 0 };
const AUGE = 1.6;

// ---------- Anzeige ----------
const hud = {
  uhr: $('uhr'), nacht: $('nacht'), geld: $('geld'), herzen: $('herzen'), ziel: $('ziel'),
  tragen: $('tragen'), blase: $('blase'), toast: $('toast'), ausdauer: $('ausdauer')
};
function uhrText(min) {
  const m = Math.floor(min / 5) * 5;
  const h = (22 + Math.floor(m / 60)) % 24, mm = m % 60;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
function toast(text, farbe = '#fff') {
  hud.toast.textContent = text; hud.toast.style.color = farbe;
  hud.toast.classList.remove('zeigen'); void hud.toast.offsetWidth; hud.toast.classList.add('zeigen');
}
let letzterZiel = '';
function ziel(text, warnung = false) {
  if (text !== letzterZiel) { hud.ziel.textContent = text; letzterZiel = text; }
  hud.ziel.classList.toggle('warnung', warnung);
}
function zeichneTragen() {
  hud.tragen.innerHTML = '';
  S.tragen.forEach((id, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${WARE[id].emoji}</span>${WARE[id].name}<small>✕</small>`;
    b.title = 'Zurücklegen';
    b.addEventListener('pointerdown', e => { e.stopPropagation(); S.tragen.splice(i, 1); Ton.ablegen(); zeichneTragen(); });
    hud.tragen.appendChild(b);
  });
}
function zeichneInfos() {
  hud.uhr.textContent = uhrText(S.zeit);
  hud.nacht.textContent = 'Nacht ' + (S.nacht + 1);
  hud.geld.textContent = euro(S.geld);
  hud.herzen.textContent = '❤️'.repeat(Math.max(0, S.herzen)) + '🖤'.repeat(Math.max(0, 3 - S.herzen));
}

// ======================================================================
//  Kunden
// ======================================================================
function neuerKunde() {
  const N = NAECHTE[S.nacht];
  let monster = Math.random() < N.monster;
  if (S.nacht === 0 && S.kundenGesamt === 0) monster = false;     // der erste Kunde ist immer ein Mensch
  if (S.seitMonster >= 3) monster = true;                          // spätestens jeder vierte
  S.seitMonster = monster ? 0 : S.seitMonster + 1;
  S.kundenGesamt++;

  const zeichen = new Set();
  if (monster) {
    zeichen.add(wuerfel(['augen', 'schatten', 'zucken', 'gross']));
    zeichen.add(wuerfel(['augen', 'schatten', 'zucken', 'gross', 'wunsch', 'wunsch', 'gleiten']));
  }
  const f = baueFigur(monster, zeichen);
  const anzahl = Math.floor(zufall(N.waren[0], N.waren[1] + 1));
  const bestellung = [...WAREN].sort(() => Math.random() - .5).slice(0, anzahl).map(w => w.id);
  const summe = bestellung.reduce((s, id) => s + WARE[id].preis, 0);
  const k = {
    f, monster, zeichen, bestellung, summe,
    zahlt: zahlBetrag(summe),
    wunsch: monster && zeichen.has('wunsch') ? wuerfel(SELTSAM) : null,
    pos: BUS_TUER.clone(), zustand: 'aussteigen', t: 0,
    pfad: [], geduld: N.geduld, geduldMax: N.geduld,
    lauern: N.lauern, gang: 0, zuckT: zufall(1, 2.5), sagt: '', sagtT: 0, sagtRot: false,
    fensterX: zufall(-1.2, 0.9)
  };
  k.f.g.position.copy(k.pos);
  return k;
}
function zahlBetrag(summe) {
  const r = Math.random();
  if (r < 0.2) return summe;                                           // passend
  if (r < 0.45 && summe % 100) return Math.ceil(summe / 100) * 100;    // aufgerundet in Münzen
  for (const s of [500, 1000, 2000]) if (s > summe) return s;
  return 2000;
}
function sag(k, text, sek = 2.5, rot = false) { k.sagt = text; k.sagtT = sek; k.sagtRot = rot; }

function kundeGeht(k, text) {
  if (text) sag(k, text, 2.2);
  k.zustand = 'gehen';
  k.pfad = [new THREE.Vector3(-6, 0, -6.2), new THREE.Vector3(-28, 0, -6.2)];
  raeumeTheke();
  if (S.modus === 'kasse') kasseZu();
}

function updateKunde(k, dt) {
  const N = NAECHTE[S.nacht];
  k.t += dt;
  if (k.sagtT > 0) k.sagtT -= dt;
  const zu = W.rollStand > 0.85;

  // Zucken
  if (k.monster && k.zeichen.has('zucken')) {
    k.zuckT -= dt;
    if (k.zuckT < 0) { k.zuckT = zufall(0.8, 2.2); k.f.kopf.rotation.z = zufall(-0.7, 0.7); k.f.kopf.rotation.y = zufall(-0.8, 0.8); }
    else if (k.zuckT < 0.5) { k.f.kopf.rotation.z *= 0.8; k.f.kopf.rotation.y *= 0.8; }
  }
  // leuchtende Augen pulsieren
  if (k.monster && k.zeichen.has('augen')) k.f.augen.forEach(a => a.scale.setScalar(1.1 + Math.sin(k.t * 6) * 0.3));

  // Monster: Rollladen zu → abgewehrt
  if (k.monster && zu && ['aussteigen', 'laufen', 'lauern'].includes(k.zustand)) {
    const amFenster = k.zustand === 'lauern';
    k.zustand = 'abgewehrt'; k.t = 0;
    sag(k, 'LASS MICH REIN!', 3, true);
    if (amFenster) { Ton.schlag(); setTimeout(() => Ton.schlag(), 450); }
  }

  switch (k.zustand) {
    case 'aussteigen':
      if (k.t > 0.6) {
        k.zustand = 'laufen';
        k.pfad = [new THREE.Vector3(-7, 0, -6.4), new THREE.Vector3(k.fensterX, 0, -3.35)];
        if (k.monster) S.flackern = 1.2;
      }
      break;
    case 'laufen':
      if (gehePfad(k, dt, k.monster && k.zeichen.has('gleiten') ? 1.25 : 1.5)) {
        k.f.g.rotation.y = 0;
        if (k.monster) { k.zustand = 'lauern'; k.t = 0; }
        else if (zu) { k.zustand = 'klopfen'; k.t = 0; sag(k, 'Hallo? Haben Sie noch auf?', 4); Ton.schlag(); }
        else { k.zustand = 'bestellen'; Ton.klingel(); }
      }
      break;
    case 'klopfen':
      if (!zu) { k.zustand = 'bestellen'; k.sagtT = 0; Ton.klingel(); }
      else if (k.t > 5) kundeGeht(k, 'Na toll …');
      break;
    case 'bestellen':
    case 'zahlen':
      k.geduld -= dt * (k.zustand === 'zahlen' ? 0.5 : 1);
      if (zu) {
        S.stat.verjagt++;
        S.geld = Math.max(0, S.geld - 100);
        toast('Kunde verjagt −1,00 €', '#ff8a7a'); Ton.fehler();
        kundeGeht(k, 'Hey! Unverschämt!');
      } else if (k.geduld <= 0) {
        toast('Zu langsam!', '#ff8a7a'); Ton.fehler();
        kundeGeht(k, 'Das dauert mir zu lange!');
      }
      break;
    case 'lauern':
      k.lauern -= dt;
      if (k.lauern <= 0) starteJagd(k);
      break;
    case 'abgewehrt':
      k.f.g.visible = k.t < 1.4 || Math.floor(k.t * 14) % 2 === 0;
      if (k.t > 2.2) {
        Ton.verschwinden();
        S.stat.monster++;
        S.geld += 500;
        toast('Monster abgewehrt! +5,00 €', '#9be37a');
        Ton.gut();
        entferneFigur(k.f);
        S.kunde = null;
        S.naechsterIn = zufall(...N.pause);
        raeumeTheke();
      }
      break;
    case 'gehen':
      if (gehePfad(k, dt, 1.6)) { entferneFigur(k.f); S.kunde = null; S.naechsterIn = zufall(...N.pause); }
      break;
  }
}

function gehePfad(k, dt, tempo) {
  const ziel = k.pfad[0];
  if (!ziel) return true;
  const dx = ziel.x - k.pos.x, dz = ziel.z - k.pos.z, d = Math.hypot(dx, dz);
  const schritt = tempo * dt;
  const gleitet = k.monster && k.zeichen.has('gleiten');
  if (d <= schritt) { k.pos.x = ziel.x; k.pos.z = ziel.z; k.pfad.shift(); }
  else { k.pos.x += dx / d * schritt; k.pos.z += dz / d * schritt; k.f.g.rotation.y = Math.atan2(dx, dz); }
  k.gang += dt * tempo * 5.5;
  const s = gleitet ? 0 : Math.sin(k.gang) * 0.55;
  k.f.beinL.rotation.x = s; k.f.beinR.rotation.x = -s;
  k.f.armL.rotation.x = -s * 0.7; k.f.armR.rotation.x = s * 0.7;
  k.f.g.position.set(k.pos.x, gleitet ? 0.05 : Math.abs(Math.cos(k.gang)) * 0.04, k.pos.z);
  if (k.pfad.length === 0) {
    k.f.beinL.rotation.x = k.f.beinR.rotation.x = k.f.armL.rotation.x = k.f.armR.rotation.x = 0;
    return true;
  }
  return false;
}

// ---------- Sprechblase ----------
const _kopfPos = new THREE.Vector3();
function updateBlase() {
  const k = S.kunde;
  const b = hud.blase;
  if (!k || !['schicht', 'kasse'].includes(S.modus) || !k.f.g.visible) { b.classList.add('weg'); return; }
  const zu = W.rollStand > 0.85;
  const N = NAECHTE[S.nacht];
  let html = '';
  if (k.sagtT > 0) html = `<div class="${k.sagtRot ? 'seltsam' : ''}">${k.sagt}</div>`;
  else if (zu) html = '';
  else if (k.zustand === 'bestellen' || (k.zustand === 'lauern' && !k.wunsch)) {
    const anteil = k.zustand === 'lauern' ? k.lauern / N.lauern : k.geduld / k.geduldMax;
    const waren = k.bestellung.map(id => `<span class="ware ${S.theke.some(t => t.id === id) ? 'ok' : ''}">${WARE[id].emoji} ${WARE[id].name}</span>`).join('');
    html = `Ich hätte gern:<div class="waren">${waren}</div>${geduldBalken(anteil)}`;
  } else if (k.zustand === 'lauern') {
    html = `Ich will …<div class="seltsam">${k.wunsch}</div>${geduldBalken(k.lauern / N.lauern)}`;
  } else if (k.zustand === 'zahlen') {
    html = `Macht ${euro(k.summe)}?<br>Hier, bitte: <b>💶 ${euro(k.zahlt)}</b>${geduldBalken(k.geduld / k.geduldMax)}`;
  }
  if (!html) { b.classList.add('weg'); return; }
  _kopfPos.set(k.pos.x, 2.25 * k.f.g.scale.y, k.pos.z).project(camera);
  if (_kopfPos.z > 1 || k.pos.distanceTo(spieler.pos) > 18) { b.classList.add('weg'); return; }
  b.classList.remove('weg');
  if (b.dataset.html !== html) { b.innerHTML = html; b.dataset.html = html; }
  b.style.left = clamp((_kopfPos.x + 1) / 2 * innerWidth, 90, innerWidth - 90) + 'px';
  b.style.top = clamp((1 - _kopfPos.y) / 2 * innerHeight, 90, innerHeight - 20) + 'px';
}
function geduldBalken(a) {
  const k = a < 0.25 ? 'leer' : a < 0.5 ? 'knapp' : '';
  return `<div class="geduld"><i class="${k}" style="width:${Math.round(clamp(a, 0, 1) * 100)}%"></i></div>`;
}

// ======================================================================
//  Theke, Regal, Kasse, Rollladen
// ======================================================================
function nimmWare(id) {
  if (S.tragen.length >= 4) { toast('Hände voll!', '#ffd27a'); Ton.fehler(); return; }
  S.tragen.push(id); Ton.nehmen(); zeichneTragen();
  toast(WARE[id].emoji + ' ' + WARE[id].name, '#fff');
}

function legeAufTheke() {
  const k = S.kunde;
  if (!S.tragen.length) {
    if (k && k.zustand === 'zahlen') toast('Jetzt zur Kasse!', '#ffd27a');
    else toast('Du hast nichts in der Hand.', '#ccc');
    return;
  }
  if (!k || !['bestellen', 'lauern'].includes(k.zustand)) { toast('Gerade will niemand etwas.', '#ccc'); return; }
  if (k.zustand === 'lauern' && k.wunsch) {
    sag(k, 'Das will ich nicht. Ich will ' + k.wunsch + '.', 3, true);
    S.tragen = []; zeichneTragen(); Ton.fehler();
    return;
  }
  let falsch = 0;
  for (const id of S.tragen) {
    if (!k.bestellung.includes(id) || S.theke.some(t => t.id === id)) { falsch++; continue; }
    const m = wareModell(id);
    m.position.set(-1.6 + S.theke.length * 0.45, 1.06, -2.2 + zufall(-0.08, 0.08));
    m.rotation.y = zufall(-0.4, 0.4);
    scene.add(m);
    S.theke.push({ id, mesh: m });
  }
  S.tragen = []; zeichneTragen();
  if (falsch) { toast('Das hat keiner bestellt!', '#ff8a7a'); Ton.fehler(); sag(k, 'Das wollte ich nicht!', 2); }
  else Ton.ablegen();
  if (k.bestellung.every(id => S.theke.some(t => t.id === id))) {
    if (k.monster) return;            // ein Monster bezahlt nie …
    k.zustand = 'zahlen';
    Ton.klingel();
  }
}
function raeumeTheke() {
  for (const t of S.theke) scene.remove(t.mesh);
  S.theke = [];
}

// ---------- Kasse ----------
let rueck = 0;
function kasseAuf() {
  const k = S.kunde;
  if (!k || k.zustand !== 'zahlen') {
    toast(k && ['bestellen', 'lauern'].includes(k.zustand) ? 'Erst die Sachen auf die Theke legen!' : 'Gerade gibt es nichts zu kassieren.', '#ccc');
    return;
  }
  rueck = 0;
  $('kListe').innerHTML = k.bestellung.map(id => `<div><span>${WARE[id].emoji} ${WARE[id].name}</span><span>${euro(WARE[id].preis)}</span></div>`).join('');
  $('kSumme').textContent = euro(k.summe);
  $('kGegeben').textContent = euro(k.zahlt);
  $('kRueck').textContent = euro(0);
  $('kasse').classList.remove('weg');
  S.modus = 'kasse';
  Ton.kasse();
}
function kasseZu() {
  $('kasse').classList.add('weg');
  if (S.modus === 'kasse') S.modus = 'schicht';
}
function rueckgeldGeben() {
  const k = S.kunde;
  if (!k || k.zustand !== 'zahlen') { kasseZu(); return; }
  const soll = k.zahlt - k.summe;
  if (rueck < soll) {
    Ton.fehler(); sag(k, 'Das ist zu wenig Wechselgeld!', 2.5);
    toast('Zu wenig! Es fehlen ' + euro(soll - rueck), '#ff8a7a');
    return;
  }
  kasseZu();
  Ton.kasse();
  S.stat.bedient++;
  if (rueck > soll) {
    const verlust = rueck - soll;
    S.geld = Math.max(0, S.geld + k.summe - verlust);
    toast(`+${euro(k.summe)}  (${euro(verlust)} zu viel zurück!)`, '#ffd27a');
    kundeGeht(k, 'Oh, danke! Hihi.');
  } else {
    const trinkgeld = Math.random() < 0.35 ? 50 : 0;
    S.geld += k.summe + trinkgeld;
    toast(`+${euro(k.summe + trinkgeld)}${trinkgeld ? ' mit Trinkgeld!' : ''}`, '#9be37a');
    Ton.gut();
    kundeGeht(k, wuerfel(['Danke! Gute Nacht!', 'Stimmt so. Tschüss!', 'Danke schön!', 'Bis morgen!']));
  }
}
document.querySelectorAll('#kGeld button').forEach(b => b.addEventListener('pointerdown', e => {
  e.stopPropagation();
  rueck += Number(b.dataset.ct);
  $('kRueck').textContent = euro(rueck);
  Ton.muenze();
}));
$('kLoeschen').addEventListener('click', () => { rueck = 0; $('kRueck').textContent = euro(0); Ton.ablegen(); });
$('kGeben').addEventListener('click', rueckgeldGeben);
$('kZu').addEventListener('click', kasseZu);

// ---------- Rollladen ----------
function rollladen() {
  if (!['schicht', 'kasse'].includes(S.modus)) return;
  W.rollZiel = W.rollZiel ? 0 : 1;
  Ton.rollladen();
  $('bRollladen').textContent = W.rollZiel ? '⬆ ROLLLADEN AUF' : '⬇ ROLLLADEN';
  $('bRollladen').classList.toggle('zu', !!W.rollZiel);
}
$('bRollladen').addEventListener('pointerdown', e => { e.stopPropagation(); Ton.start(); rollladen(); });

// ======================================================================
//  Jagd
// ======================================================================
const J = { phase: '', t: 0, k: null, start: new THREE.Vector3() };
const TUER_INNEN = new THREE.Vector3(2.4, 0, 1.0), TUER_AUSSEN = new THREE.Vector3(3.95, 0, 1.0);
const ECKEN = [new THREE.Vector3(-3.95, 0, -3.45), new THREE.Vector3(3.95, 0, -3.45), new THREE.Vector3(3.95, 0, 3.45), new THREE.Vector3(-3.95, 0, 3.45)];

function starteJagd(k) {
  if (S.modus === 'kasse') kasseZu();
  S.modus = 'jagd';
  J.phase = 'klettern'; J.t = 0; J.k = k;
  k.zustand = 'jagt';
  k.f.g.visible = true;
  verwandeln(k.f);
  J.start.copy(k.pos);
  Ton.schrei(); Ton.jagd(true);
  W.tuerOffen = true; Ton.tuer();
  W.licht.intensity = 0; M.roehre.emissiveIntensity = 0;
  W.notlicht.intensity = 9;
  W.rollZiel = 0;
  S.tragen = []; zeichneTragen();
  // Der Bus wartet an der Haltestelle
  W.bus.zustand = 'wartet'; W.bus.x = BUS_HALT; W.busTuer.emissiveIntensity = 2.5; Ton.bus(true);
  $('ausdauer').classList.add('an');
  $('rot').style.opacity = 0.6;
  hud.blase.classList.add('weg');
  ziel('LAUF! Hinten rechts raus zum Bus!', true);
}

function monsterZiel(m, p) {
  const mi = drinnen(m), pi = drinnen(p);
  if (mi && pi) return p;
  if (mi && !pi) return m.distanceTo(TUER_INNEN) > 0.5 && m.x < 2.7 ? TUER_INNEN : TUER_AUSSEN;
  // Monster ist draußen
  if (pi && m.distanceTo(TUER_AUSSEN) < 0.5) return TUER_INNEN;
  const zielPunkt = pi ? TUER_AUSSEN : p;
  if (siehtDurch(m.x, m.z, zielPunkt.x, zielPunkt.z)) return zielPunkt;
  let beste = null, besteD = Infinity;
  for (const e of ECKEN) {
    if (m.distanceTo(e) < 0.3 || !siehtDurch(m.x, m.z, e.x, e.z)) continue;
    const d = m.distanceTo(e) + e.distanceTo(zielPunkt) + (siehtDurch(e.x, e.z, zielPunkt.x, zielPunkt.z) ? 0 : 20);
    if (d < besteD) { besteD = d; beste = e; }
  }
  if (beste) return beste;
  // Kein Eck zu sehen (z. B. wenn das Monster noch in der Tür steht): erst durch die Tür, sonst zum nächsten Eck
  if (m.x < 3.9 && Math.abs(m.z - 1.0) < 1.3 && m.distanceTo(TUER_AUSSEN) > 0.3) return TUER_AUSSEN;
  return ECKEN.reduce((a, b) => (m.distanceTo(b) < m.distanceTo(a) ? b : a));
}

function updateJagd(dt) {
  const k = J.k, N = NAECHTE[S.nacht];
  J.t += dt;
  W.notlicht.intensity = 7 + Math.sin(J.t * 9) * 3;
  if (J.phase === 'klettern') {
    const a = clamp(J.t / 1.3, 0, 1);
    k.pos.x = J.start.x * (1 - a * 0.5);
    k.pos.z = -3.35 + a * 1.95;
    k.f.g.position.set(k.pos.x, Math.sin(a * Math.PI) * 1.0, k.pos.z);
    k.f.g.rotation.y = 0;
    k.f.armL.rotation.x = k.f.armR.rotation.x = -2.2;
    if (a >= 1) { J.phase = 'bruellen'; J.t0 = J.t; Ton.schrei(); }
  } else if (J.phase === 'bruellen') {
    // Das Monster brüllt kurz – Zeit zum Wegrennen!
    k.f.g.position.set(k.pos.x, 0, k.pos.z);
    k.f.kopf.rotation.x = -0.5 + Math.sin(J.t * 40) * 0.05;
    k.f.armL.rotation.x = k.f.armR.rotation.x = -2.6;
    if (J.t - J.t0 > 0.9) { J.phase = 'jagen'; J.t0 = J.t; k.f.kopf.rotation.x = 0; k.f.armL.rotation.x = k.f.armR.rotation.x = -1.3; }
  } else {
    const z = monsterZiel(k.pos, spieler.pos);
    const dx = z.x - k.pos.x, dz = z.z - k.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.01) {
      const anlauf = clamp((J.t - J.t0) / 1.6, 0.35, 1);       // läuft erst langsam an
      const s = Math.min(d, N.tempo * anlauf * dt);
      k.pos.x += dx / d * s; k.pos.z += dz / d * s;
      k.f.g.rotation.y = Math.atan2(dx, dz);
    }
    schiebeRaus(k.pos, 0.3);
    k.gang += dt * 16;
    k.f.beinL.rotation.x = Math.sin(k.gang) * 0.9; k.f.beinR.rotation.x = -Math.sin(k.gang) * 0.9;
    k.f.g.position.set(k.pos.x, Math.abs(Math.cos(k.gang)) * 0.08, k.pos.z);
    k.f.kopf.rotation.z = Math.sin(J.t * 23) * 0.15;
    const abstand = Math.hypot(k.pos.x - spieler.pos.x, k.pos.z - spieler.pos.z);
    $('rot').style.opacity = clamp(1.1 - abstand / 8, 0.25, 0.95);
    if (abstand < 0.85) { erwischt(); return; }
  }
  const zumBus = Math.hypot(spieler.pos.x - BUS_TUER.x, spieler.pos.z - BUS_TUER.z);
  ziel(zumBus < 6 ? 'Rein in den Bus!' : drinnen(spieler.pos) ? 'LAUF! Hinten rechts raus (grünes Schild)!' : 'LAUF zum Bus vorne links!', true);
  if (zumBus < 1.7) entkommen();
}

function jagdEnde() {
  Ton.jagd(false);
  $('ausdauer').classList.remove('an');
  $('rot').style.opacity = 0;
  if (J.k) { entferneFigur(J.k.f); J.k = null; }
  if (S.kunde) { entferneFigur(S.kunde.f); S.kunde = null; }
  raeumeTheke();
  S.tragen = []; zeichneTragen();
}

function entkommen() {
  S.modus = 'uebergang';
  S.stat.entkommen++;
  Ton.bustuer(); Ton.sieg();
  toast('Geschafft! Du bist entkommen!', '#9be37a');
  ueberblende(() => {
    jagdEnde();
    kioskZuruecksetzen();
    S.zeit += 20;
    toast('Der Bus hat dich zurückgebracht …', '#ddd');
  });
}

function erwischt() {
  S.modus = 'schreck'; J.t = 0;
  Ton.schreck();
  $('rot').style.opacity = 1;
}
const _vor = new THREE.Vector3();
function updateSchreck(dt) {
  const k = J.k;
  J.t += dt;
  kameraAufSpieler();
  _vor.set(-Math.sin(spieler.yaw), 0, -Math.cos(spieler.yaw));
  const kx = camera.position.x + _vor.x * (0.6 - Math.min(J.t, 0.3)), kz = camera.position.z + _vor.z * (0.6 - Math.min(J.t, 0.3));
  k.f.g.position.set(kx, camera.position.y - 1.72 * k.f.g.scale.y, kz);
  k.f.g.rotation.y = Math.atan2(camera.position.x - kx, camera.position.z - kz);
  k.f.kopf.rotation.z = Math.sin(J.t * 40) * 0.2;
  spieler.pitch += (0 - spieler.pitch) * 0.2;
  camera.position.x += zufall(-0.03, 0.03); camera.position.y += zufall(-0.03, 0.03);
  if (J.t > 1.3) {
    S.modus = 'uebergang';
    S.herzen--;
    ueberblende(() => {
      jagdEnde();
      zeichneInfos();
      if (S.herzen <= 0) { zeigeEnde('verloren'); return; }
      kioskZuruecksetzen();
      S.zeit += 20;
      toast('Du wachst hinter der Theke auf …', '#ff8a7a');
    });
  }
}

function kioskZuruecksetzen() {
  W.tuerOffen = false;
  W.licht.intensity = 22; M.roehre.emissiveIntensity = 2;
  W.notlicht.intensity = 0;
  W.rollZiel = 0; W.rollStand = 0;
  $('bRollladen').textContent = '⬇ ROLLLADEN'; $('bRollladen').classList.remove('zu');
  W.bus.zustand = 'weg'; W.bus.x = -90; W.busTuer.emissiveIntensity = 0;
  spieler.pos.set(0, 0, -0.9); spieler.yaw = 0; spieler.pitch = -0.05; spieler.ausdauer = 1;
  S.naechsterIn = 4;
  S.modus = 'schicht';
}

function ueberblende(mitte) {
  const s = $('schwarz');
  s.style.opacity = 1;
  setTimeout(() => { mitte(); setTimeout(() => { s.style.opacity = 0; }, 350); }, 700);
}

// ======================================================================
//  Bus fahren lassen
// ======================================================================
function updateBus(dt) {
  const b = W.bus;
  b.t += dt;
  if (b.zustand === 'kommt') {
    const rest = BUS_HALT - b.x;
    b.x += Math.max(1.2, Math.min(16, rest * 1.4)) * dt;
    if (b.x >= BUS_HALT - 0.02) {
      b.x = BUS_HALT; b.zustand = 'haelt'; b.t = 0; Ton.bustuer();
      W.busTuer.emissiveIntensity = 2.5;
      if (S.modus === 'schicht' || S.modus === 'kasse') S.kunde = neuerKunde();
    }
  } else if (b.zustand === 'haelt') {
    if (b.t > 2.4 && S.modus !== 'intro') { b.zustand = 'faehrt'; b.t = 0; W.busTuer.emissiveIntensity = 0; Ton.bus(false); }
  } else if (b.zustand === 'faehrt') {
    b.x += Math.min(18, 2 + b.t * 4) * dt;
    if (b.x > 90) b.zustand = 'weg';
  }
  b.g.position.x = b.x;
  const flackert = S.kunde && S.kunde.monster && b.zustand === 'haelt';
  W.busFenster.emissiveIntensity = flackert && Math.random() < .3 ? 0.1 : 1.1;
}

// ======================================================================
//  Spieler und Eingabe
// ======================================================================
const tasten = {};
const stick = { x: 0, y: 0 };
let rennKnopf = false;
addEventListener('keydown', e => {
  tasten[e.code] = true;
  if (e.code === 'KeyR' || e.code === 'KeyQ') rollladen();
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); tippen(innerWidth / 2, innerHeight / 2); }
  if (e.code === 'Escape') { if (S.modus === 'kasse') kasseZu(); else pause(); }
});
addEventListener('keyup', e => { tasten[e.code] = false; });

// Ziehen = umsehen, kurz tippen = benutzen
(function zeigen() {
  const el = renderer.domElement;
  let id = null, sx = 0, sy = 0, lx = 0, ly = 0, t0 = 0, gezogen = false;
  el.addEventListener('pointerdown', e => {
    Ton.start();
    if (id !== null) return;
    id = e.pointerId; el.setPointerCapture(e.pointerId);
    sx = lx = e.clientX; sy = ly = e.clientY; t0 = performance.now(); gezogen = false;
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) gezogen = true;
    if (['schicht', 'jagd'].includes(S.modus)) {
      const k = isTouch ? 0.006 : 0.004;
      spieler.yaw -= (e.clientX - lx) * k;
      spieler.pitch = clamp(spieler.pitch - (e.clientY - ly) * k, -1.2, 1.2);
    }
    lx = e.clientX; ly = e.clientY;
  });
  const ende = e => {
    if (e.pointerId !== id) return;
    id = null;
    if (!gezogen && performance.now() - t0 < 450) tippen(e.clientX, e.clientY);
  };
  el.addEventListener('pointerup', ende);
  el.addEventListener('pointercancel', e => { if (e.pointerId === id) id = null; });
})();

(function steuerknueppel() {
  const s = $('stick'), k = $('knauf');
  let id = null, mx = 0, my = 0;
  const beweg = e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - mx, dy = e.clientY - my;
    const d = Math.hypot(dx, dy), max = 50;
    if (d > max) { dx *= max / d; dy *= max / d; }
    k.style.transform = `translate(${dx}px, ${dy}px)`;
    stick.x = dx / max; stick.y = dy / max;
  };
  s.addEventListener('pointerdown', e => {
    Ton.start();
    id = e.pointerId; s.setPointerCapture(e.pointerId);
    const r = s.getBoundingClientRect(); mx = r.left + r.width / 2; my = r.top + r.height / 2;
    beweg(e);
  });
  s.addEventListener('pointermove', beweg);
  const los = e => { if (e.pointerId !== id) return; id = null; stick.x = stick.y = 0; k.style.transform = ''; };
  s.addEventListener('pointerup', los); s.addEventListener('pointercancel', los);
  const r = $('bRennen');
  r.addEventListener('pointerdown', e => { e.preventDefault(); rennKnopf = true; r.classList.add('aktiv'); });
  const aus = () => { rennKnopf = false; r.classList.remove('aktiv'); };
  r.addEventListener('pointerup', aus); r.addEventListener('pointercancel', aus); r.addEventListener('pointerleave', aus);
})();

const strahl = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
function tippen(x, y) {
  if (S.modus !== 'schicht') return;
  _ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  strahl.setFromCamera(_ndc, camera);
  const treffer = strahl.intersectObjects(klickbar, false)[0];
  if (!treffer) return;
  if (treffer.distance > 2.8) { toast('Geh näher ran!', '#ccc'); return; }
  const d = treffer.object.userData;
  if (d.typ === 'regal') nimmWare(d.ware);
  else if (d.typ === 'theke') legeAufTheke();
  else if (d.typ === 'kasse') kasseAuf();
  else if (d.typ === 'rollladen') rollladen();
}

function updateSpieler(dt) {
  let vx = 0, vz = 0;
  if (tasten.KeyW || tasten.ArrowUp) vz += 1;
  if (tasten.KeyS || tasten.ArrowDown) vz -= 1;
  if (tasten.KeyA || tasten.ArrowLeft) vx -= 1;
  if (tasten.KeyD || tasten.ArrowRight) vx += 1;
  vx += stick.x; vz -= stick.y;
  const laenge = Math.hypot(vx, vz);
  if (laenge > 1) { vx /= laenge; vz /= laenge; }
  const willRennen = (tasten.ShiftLeft || tasten.ShiftRight || rennKnopf) && laenge > 0.2;
  spieler.rennt = willRennen && spieler.ausdauer > 0.02 && (spieler.rennt || spieler.ausdauer > 0.2);
  spieler.ausdauer = clamp(spieler.ausdauer + (spieler.rennt ? -0.28 : 0.2) * dt, 0, 1);
  $('ausdauer').firstElementChild.style.width = Math.round(spieler.ausdauer * 100) + '%';
  const tempo = spieler.rennt ? 5.6 : 3.2;
  const vorX = -Math.sin(spieler.yaw), vorZ = -Math.cos(spieler.yaw);
  const reX = Math.cos(spieler.yaw), reZ = -Math.sin(spieler.yaw);
  const bx = (vorX * vz + reX * vx) * tempo * dt, bz = (vorZ * vz + reZ * vx) * tempo * dt;
  const weg = Math.hypot(bx, bz);
  // In kleinen Schritten bewegen, damit man auch bei Ruckeln nie durch eine Wand rutscht
  const teile = Math.max(1, Math.ceil(weg / 0.12));
  for (let i = 0; i < teile; i++) {
    spieler.pos.x += bx / teile; spieler.pos.z += bz / teile;
    schiebeRaus(spieler.pos, 0.3);
  }
  spieler.schrittWeg += weg;
  spieler.wippen += weg * 3.2;
  if (spieler.schrittWeg > (spieler.rennt ? 0.9 : 0.7)) { spieler.schrittWeg = 0; Ton.schritt(); }
  kameraAufSpieler();
}
function kameraAufSpieler() {
  camera.position.set(spieler.pos.x, AUGE + Math.sin(spieler.wippen) * 0.035, spieler.pos.z);
  camera.rotation.set(spieler.pitch, spieler.yaw, 0);
}

// ======================================================================
//  Schicht-Ablauf
// ======================================================================
function updateSchicht(dt) {
  S.zeit += dt * MIN_PRO_SEK;
  if (S.zeit >= NACHT_LAENGE && (!S.kunde || !S.kunde.monster)) { zeigeEnde('geschafft'); return; }

  if (!S.kunde && W.bus.zustand === 'weg') {
    S.naechsterIn -= dt;
    if (S.naechsterIn <= 0 && S.zeit < NACHT_LAENGE - 15) { W.bus.zustand = 'kommt'; W.bus.x = -90; W.bus.t = 0; Ton.bus(true); }
  }
  if (S.kunde) updateKunde(S.kunde, dt);
  if (S.modus === 'jagd') return;

  // Hinweise oben
  const k = S.kunde;
  if (W.rollZiel && (!k || !k.monster)) ziel('Der Rollladen ist unten. Mach ihn wieder auf!', true);
  else if (!k) ziel(W.bus.zustand === 'kommt' ? 'Ein Bus kommt …' : 'Warte auf den nächsten Bus …');
  else if (k.zustand === 'laufen' || k.zustand === 'aussteigen') ziel('Ein Kunde kommt. Mensch … oder Monster?');
  else if (k.zustand === 'bestellen' || (k.zustand === 'lauern' && !k.wunsch)) {
    const fehlt = k.bestellung.filter(id => !S.theke.some(t => t.id === id));
    ziel(fehlt.every(id => S.tragen.includes(id)) ? 'Leg die Sachen auf die Theke (Theke antippen)' : 'Hol die Sachen aus dem Regal hinten');
  } else if (k.zustand === 'lauern') ziel('Was will der da?!');
  else if (k.zustand === 'zahlen') ziel('Tippe auf die Kasse und gib das Wechselgeld raus');
  else ziel('');
}

function updateWelt(dt) {
  // Regen
  const pos = W.regen.geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + 1] -= 13 * dt;
    if (pos[i + 1] < 0) setzeTropfen(pos, i / 3, 14);
  }
  W.regen.geometry.attributes.position.needsUpdate = true;
  // Rollladen
  W.rollStand += clamp(W.rollZiel - W.rollStand, -dt * 1.4, dt * 1.4);
  const h = Math.max(0.02, W.rollStand * 1.32);
  W.rollladen.scale.y = h; W.rollladen.position.y = 2.32 - h / 2;
  W.schalterKnopf.material.emissive.setHex(W.rollZiel ? 0x00a000 : 0x600000);
  // Tür
  W.tuerWinkel += ((W.tuerOffen ? Math.PI * 0.55 : 0) - W.tuerWinkel) * Math.min(1, dt * 5);
  W.tuer.rotation.y = W.tuerWinkel;
  // Flackern der Röhre
  if (S.flackern > 0 && S.modus !== 'jagd') {
    S.flackern -= dt;
    const an = Math.random() > 0.45 || S.flackern <= 0;
    W.licht.intensity = an ? 22 : 2; M.roehre.emissiveIntensity = an ? 2 : 0.1;
  }
  Ton.atmosphaere(S.modus === 'titel' ? 0.6 : 1, drinnen(spieler.pos) && ['schicht', 'kasse'].includes(S.modus) ? 1 : 0);
}

// ======================================================================
//  Titel, Geschichte, Ende
// ======================================================================
const daten = lade();
let gewaehlt = 0;
function zeigeTitel() {
  S.modus = 'titel';
  document.body.classList.remove('spielt');
  ['hud', 'touch', 'ende', 'pause', 'kasse', 'intro'].forEach(id => $(id).classList.add('weg'));
  $('titel').classList.remove('weg');
  const frei = daten.frei || 1;
  gewaehlt = Math.min(gewaehlt, frei - 1);
  const n = $('naechte'); n.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('button');
    b.textContent = 'Nacht ' + (i + 1) + (i < frei ? '' : ' 🔒');
    b.disabled = i >= frei;
    b.classList.toggle('gewaehlt', i === gewaehlt);
    b.onclick = () => { gewaehlt = i; zeigeTitel(); };
    n.appendChild(b);
  }
  $('steuerung').textContent = isTouch
    ? 'Links laufen · Wischen zum Umsehen · Antippen zum Benutzen'
    : 'WASD laufen · Maus ziehen zum Umsehen · Klicken/E benutzen · Shift rennen · R Rollladen';
  Ton.jagd(false);
}

function starteNacht(n) {
  S.nacht = n;
  S.zeit = 0; S.geld = 0; S.herzen = 3;
  jagdEnde();
  S.naechsterIn = 3; S.seitMonster = 0; S.kundenGesamt = 0;
  S.stat = { bedient: 0, monster: 0, entkommen: 0, verjagt: 0 };
  kioskZuruecksetzen();
  ['titel', 'ende', 'intro', 'pause'].forEach(id => $(id).classList.add('weg'));
  $('hud').classList.remove('weg');
  $('touch').classList.toggle('weg', !isTouch);
  $('fadenkreuz').classList.toggle('weg', isTouch);
  document.body.classList.add('spielt');
  zeichneInfos();
  toast('Nacht ' + (n + 1), '#ffaa2b');
}

const INTRO = [
  'Es ist 22 Uhr. Du sitzt ganz allein im letzten Bus. Auf der Anzeige: N13 – ENDSTATION.',
  'Der Bus hält. Der Fahrer dreht sich nicht um. „Endstation. Raus hier.“',
  'Hier ist nichts. Keine Häuser, keine Menschen. Nur ein kleiner Kiosk, der in der Dunkelheit leuchtet.',
  'An der Tür klebt ein Zettel:',
  null,
  'Die Tür fällt hinter dir ins Schloss. Deine Schicht beginnt.'
];
let introSeite = 0, introTimer = null;
function zeigeIntro() {
  S.modus = 'intro'; introSeite = 0;
  $('titel').classList.add('weg');
  $('intro').classList.remove('weg');
  W.bus.zustand = 'kommt'; W.bus.x = -40; W.bus.t = 0; Ton.bus(true);
  camera.position.set(-8.5, 1.9, -8.6);
  introSeiteZeigen();
}
function introSeiteZeigen() {
  const text = INTRO[introSeite];
  clearInterval(introTimer);
  $('notiz').classList.toggle('weg', text !== null);
  const el = $('introText');
  if (text === null) { el.textContent = ''; return; }
  let i = 0; el.textContent = '';
  introTimer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(introTimer); }, 28);
}
$('iWeiter').addEventListener('click', () => {
  const text = INTRO[introSeite];
  if (text && $('introText').textContent.length < text.length) { clearInterval(introTimer); $('introText').textContent = text; return; }
  introSeite++;
  if (introSeite >= INTRO.length) { introFertig(); return; }
  introSeiteZeigen();
});
$('iSkip').addEventListener('click', () => introFertig());
function introFertig() {
  if (S.modus !== 'intro') return;
  S.modus = 'uebergang';
  clearInterval(introTimer);
  daten.introGesehen = true; speichere(daten);
  ueberblende(() => { starteNacht(0); });
}
const INTRO_KAMERA = [
  [new THREE.Vector3(-9.5, 2.0, -9.8), new THREE.Vector3(0, 1.8, -2)],
  [new THREE.Vector3(-8, 1.7, -7.2), new THREE.Vector3(0, 1.8, -2)],
  [new THREE.Vector3(-4, 1.7, -6), new THREE.Vector3(0, 2.6, -2.7)],
  [new THREE.Vector3(5.6, 1.7, -1.2), new THREE.Vector3(3.2, 1.5, 1)],
  [new THREE.Vector3(5.2, 1.7, -0.2), new THREE.Vector3(3.2, 1.4, 1)],
  [new THREE.Vector3(1.5, 1.6, 0.6), new THREE.Vector3(0, 1.2, -2.4)]
];
const _blick = new THREE.Vector3();
function updateIntro(dt) {
  const [p, blick] = INTRO_KAMERA[Math.min(introSeite, INTRO_KAMERA.length - 1)];
  camera.position.lerp(p, Math.min(1, dt * 1.2));
  _blick.set(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(4).add(camera.position);
  _blick.lerp(blick, Math.min(1, dt * 2.5));
  camera.lookAt(_blick);
  W.tuerOffen = introSeite >= 3 && introSeite < 5;
}

function updateTitel(dt) {
  const t = performance.now() / 1000;
  const a = -0.55 + Math.sin(t * 0.12) * 0.35;
  camera.position.set(Math.sin(a) * 10 - 2, 2.3 + Math.sin(t * 0.3) * 0.2, -Math.cos(a) * 10 - 1);
  camera.lookAt(-1, 1.7, -2);
  if (W.bus.zustand === 'weg' && Math.random() < dt * 0.08) { W.bus.zustand = 'kommt'; W.bus.x = -90; W.bus.t = 0; }
}

function zeigeEnde(art) {
  S.modus = 'ende';
  Ton.jagd(false);
  if (S.kunde) { entferneFigur(S.kunde.f); S.kunde = null; }
  kasseZu();
  hud.blase.classList.add('weg');
  $('ende').classList.remove('weg');
  const werte = [
    ['Verdient', euro(S.geld)],
    ['Kunden bedient', S.stat.bedient],
    ['Monster abgewehrt', S.stat.monster],
    ['Monstern entkommen', S.stat.entkommen]
  ];
  $('eWerte').innerHTML = werte.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
  const knopf = $('eWeiter');
  if (art === 'verloren') {
    $('eTitel').textContent = 'Erwischt!';
    $('eText').textContent = 'Die Nacht hat dich verschluckt. Der Kiosk wartet auf die nächste Aushilfe …';
    knopf.textContent = 'Nacht ' + (S.nacht + 1) + ' nochmal';
    knopf.onclick = () => starteNacht(S.nacht);
  } else if (S.nacht < 2) {
    daten.frei = Math.max(daten.frei || 1, S.nacht + 2); speichere(daten);
    $('eTitel').textContent = '06:00 – Geschafft!';
    $('eText').textContent = 'Die Sonne geht auf. Die Monster verschwinden im Nebel. Aber heute Nacht kommen mehr …';
    knopf.textContent = 'Weiter zu Nacht ' + (S.nacht + 2);
    knopf.onclick = () => starteNacht(S.nacht + 1);
    Ton.sieg();
  } else {
    daten.frei = 3; daten.gewonnen = true; speichere(daten);
    $('eTitel').textContent = 'Du hast es geschafft!';
    $('eText').textContent = 'Drei Nächte. Der letzte Bus hält vor dem Kiosk. Der Fahrer dreht sich zum ersten Mal um und lächelt: „Du darfst jetzt nach Hause.“';
    knopf.textContent = 'Nochmal von vorn';
    knopf.onclick = () => starteNacht(0);
    Ton.sieg();
  }
}
$('eMenue').addEventListener('click', zeigeTitel);

function pause() {
  if (!['schicht', 'jagd'].includes(S.modus)) return;
  S.vorPause = S.modus; S.modus = 'pause';
  $('pause').classList.remove('weg');
}
$('bPause').addEventListener('pointerdown', e => { e.stopPropagation(); pause(); });
$('pWeiter').addEventListener('click', () => { $('pause').classList.add('weg'); S.modus = S.vorPause; });
$('pMenue').addEventListener('click', () => { $('pause').classList.add('weg'); jagdEnde(); kioskZuruecksetzen(); zeigeTitel(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

$('start').addEventListener('click', () => {
  Ton.start();
  if (gewaehlt === 0) zeigeIntro();
  else starteNacht(gewaehlt);
});

const tonKnopf = $('ton');
tonKnopf.classList.toggle('aus', Ton.stumm);
tonKnopf.addEventListener('click', () => { Ton.start(); tonKnopf.classList.toggle('aus', Ton.umschalten()); });

// ======================================================================
//  Hauptschleife
// ======================================================================
baueWelt();
zeigeTitel();
let zuletzt = performance.now();
const DT_MAX = location.search.includes('test') ? 0.2 : 0.05;   // ?test: für Browser ohne Grafikkarte
function schleife(jetzt) {
  requestAnimationFrame(schleife);
  const dt = Math.min(DT_MAX, (jetzt - zuletzt) / 1000);
  zuletzt = jetzt;
  if (S.modus !== 'pause') {
    updateWelt(dt);
    updateBus(dt);
  }
  switch (S.modus) {
    case 'titel': updateTitel(dt); break;
    case 'intro': updateIntro(dt); break;
    case 'schicht': updateSpieler(dt); updateSchicht(dt); break;
    case 'kasse': kameraAufSpieler(); updateSchicht(dt); break;
    case 'jagd': updateSpieler(dt); updateJagd(dt); S.zeit += dt * MIN_PRO_SEK; break;
    case 'schreck': updateSchreck(dt); break;
  }
  if (['schicht', 'kasse', 'jagd'].includes(S.modus)) zeichneInfos();
  updateBlase();
  renderer.render(scene, camera);
}
requestAnimationFrame(schleife);

// Für automatische Tests
window.__kiosk = { S, W, spieler, J, nimmWare, legeAufTheke, kasseAuf, rollladen, rueckgeldGeben, starteNacht, starteJagd, kameraAufSpieler, setzeRueck: v => { rueck = v; } };
