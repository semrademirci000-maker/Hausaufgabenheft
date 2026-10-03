// Der letzte Bus – Nachtkiosk
// Du übernimmst die Nachtschicht im Kiosk an der Endstation. Busse bringen
// Kunden: Sachen aus dem Regal holen, auf die Theke legen, kassieren,
// Wechselgeld geben. Manche Kunden sind keine Menschen – dann Rollladen runter.
// Kommt eines rein: hinten raus und zum Bus rennen!
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Ton } from './audio.js';
import { ENV, T, initTexturen, baueUmgebung, sterne, mond, lichtkegel, baueNachbearbeitung } from './grafik.js';
import * as Fig from './figuren.js';
import { ikone, IKONEN } from './ikonen.js';

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
  { id: 'wasser', name: 'Wasser', preis: 100 },
  { id: 'cola', name: 'Cola', preis: 200 },
  { id: 'chips', name: 'Chips', preis: 250 },
  { id: 'schoko', name: 'Schokolade', preis: 150 },
  { id: 'kaugummi', name: 'Kaugummi', preis: 50 },
  { id: 'zeitung', name: 'Zeitung', preis: 300 }
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
const HOCH = (() => { try { return localStorage.getItem('derletztebus.grafik') !== 'niedrig'; } catch (e) { return true; } })();
const renderer = new THREE.WebGLRenderer({ antialias: !HOCH, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio, HOCH ? (isTouch ? 1.5 : 2) : 1);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = HOCH;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('spiel').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03050a);
scene.fog = new THREE.FogExp2(0x070b14, 0.021);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 220);
camera.rotation.order = 'YXZ';

initTexturen();
baueUmgebung(renderer);

let post = HOCH ? baueNachbearbeitung(renderer, scene, camera, isTouch ? 0 : 4) : null;
if (post) $('vignette').style.display = 'none';

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (post) { post.composer.setSize(innerWidth, innerHeight); post.bloom.resolution.set(innerWidth / 2, innerHeight / 2); }
});

const himmelLicht = new THREE.HemisphereLight(0x4a5a88, 0x0c0a08, 0.5);
scene.add(himmelLicht);

// ---------- Materialien ----------
const wiederhole = (s, x, y) => { for (const t of [s.map, s.normalMap, s.roughnessMap]) t.repeat.set(x, y); };
const pbr = (s, extra = {}) => new THREE.MeshStandardMaterial({
  map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1,
  normalScale: new THREE.Vector2(1, 1), envMap: ENV, envMapIntensity: 0.7, ...extra
});
const std = (farbe, extra = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.6, envMap: ENV, envMapIntensity: 0.5, ...extra });
const leinwand = (w, h, malen) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  malen(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
};

wiederhole(T.fliesen, 3.75, 3.1);
wiederhole(T.wand, 2.2, 1);
wiederhole(T.aussen, 3, 1.2);
wiederhole(T.asphalt, 50, 1.5);
wiederhole(T.platten, 24, 10.7);
wiederhole(T.decke, 3, 2.5);
const M = {
  boden: pbr(T.fliesen, { envMapIntensity: 1 }),
  wand: pbr(T.wand),
  aussen: pbr(T.aussen, { metalness: 0.5, envMapIntensity: 0.9 }),
  decke: pbr(T.decke, { envMapIntensity: 0.2 }),
  dach: std(0x23262d, { roughness: 0.8 }),
  holz: pbr(T.holz, { envMapIntensity: 0.35 }),
  theke: std(0x7d786b, { roughness: 0.38, envMapIntensity: 0.7 }),
  metall: pbr(T.metall, { metalness: 0.9, envMapIntensity: 1.1 }),
  dunkel: std(0x15171c, { roughness: 0.7 }),
  asphalt: pbr(T.asphalt, { envMapIntensity: 1.3 }),
  platten: pbr(T.platten, { envMapIntensity: 1.2 }),
  erde: new THREE.MeshStandardMaterial({ color: 0x0b100e, roughness: 1 }),
  unsichtbar: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  roehre: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 2.2 })
};

function kiste(w, h, d, mat, x, y, z, eltern = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (mat !== M.unsichtbar) { m.castShadow = true; m.receiveShadow = true; }
  eltern.add(m);
  return m;
}
function rundkiste(w, h, d, r, mat, x, y, z, eltern = scene) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
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
const FENSTER_RAUS = new THREE.Vector3(0, 0, -3.1);
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
const W = { himmelLicht };   // wichtige Teile der Welt
const KEIN_LICHT = () => ({ intensity: 0, position: new THREE.Vector3(), color: new THREE.Color() });

function spot(farbe, staerke, reichweite, winkel, halbschatten, abnahme, pos, ziel, schatten, karte = 512, eltern = scene) {
  const l = new THREE.SpotLight(farbe, staerke, reichweite, winkel, halbschatten, abnahme);
  l.position.copy(pos); l.target.position.copy(ziel);
  eltern.add(l); eltern.add(l.target);
  if (schatten && HOCH) {
    l.castShadow = true; l.shadow.mapSize.set(karte, karte);
    l.shadow.bias = -0.0006; l.shadow.normalBias = 0.025; l.shadow.camera.near = 0.3; l.shadow.camera.far = reichweite;
  }
  return l;
}

// ---------- Etiketten und Waren ----------
const ET = {};
function etikett(id) {
  if (ET[id]) return ET[id];
  const schrift = (g, text, x, y, groesse, farbe) => {
    g.font = `800 ${groesse}px Inter, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = farbe; g.fillText(text, x, y);
  };
  const malen = {
    cola: () => leinwand(256, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ec2a30'); gr.addColorStop(1, '#a30f18');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, h * 0.6); g.bezierCurveTo(w * 0.3, h * 0.3, w * 0.6, h * 0.95, w, h * 0.5);
      g.lineTo(w, h * 0.66); g.bezierCurveTo(w * 0.6, h * 1.1, w * 0.3, h * 0.48, 0, h * 0.76); g.fill();
      schrift(g, 'COLA', 64, 34, 38, '#fff'); schrift(g, 'COLA', 192, 34, 38, '#fff');
    }),
    wasser: () => leinwand(256, 64, (g, w, h) => {
      g.fillStyle = '#e9f4ff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2f7fd0'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
      schrift(g, 'WASSER', 64, 32, 28, '#1b5aa5'); schrift(g, 'WASSER', 192, 32, 28, '#1b5aa5');
    }),
    chips: () => leinwand(256, 384, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd23a'); gr.addColorStop(1, '#f2a010');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d3281c'; g.beginPath(); g.ellipse(w / 2, h * 0.45, w * 0.46, h * 0.2, 0, 0, Math.PI * 2); g.fill();
      schrift(g, 'KNUSPER', w / 2, h * 0.45, 46, '#fff6d8'); schrift(g, 'PAPRIKA', w / 2, h * 0.58, 26, '#ffe9a0');
      g.fillStyle = '#f6c14a';
      for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(40 + i * 30, h * 0.8 + (i % 2) * 24, 18, 11, i, 0, Math.PI * 2); g.fill(); }
    }),
    schoko: () => leinwand(128, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#7d3cc0'); gr.addColorStop(1, '#4e1f86');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e6c04a'; g.fillRect(0, 70, w, 9); g.fillRect(0, 136, w, 9);
      g.fillStyle = '#f6e08a'; g.beginPath(); g.arc(w / 2, 107, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a2a96'; g.beginPath(); g.moveTo(w / 2 - 8, 112); g.lineTo(w / 2, 97); g.lineTo(w / 2 + 8, 112); g.fill();
      schrift(g, 'SCHOKO', w / 2, 40, 28, '#f6e08a'); schrift(g, 'VOLLMILCH', w / 2, 58, 12, '#e6d7f6');
      g.fillStyle = '#d7dbe0'; g.beginPath(); g.moveTo(0, 168); g.lineTo(w, 154); g.lineTo(w, 176); g.lineTo(0, 190); g.fill();
      g.fillStyle = '#5b3420'; g.fillRect(0, 190, w, 66);
      g.strokeStyle = '#3b2113'; g.lineWidth = 3;
      for (let x = 32; x < w; x += 32) { g.beginPath(); g.moveTo(x, 186); g.lineTo(x, h); g.stroke(); }
      g.beginPath(); g.moveTo(0, 222); g.lineTo(w, 222); g.stroke();
    }),
    kaugummi: () => leinwand(128, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#53d98a'); gr.addColorStop(1, '#1f9c5a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      schrift(g, 'FRISCH', w / 2, h * 0.4, 28, '#fff'); schrift(g, 'MINZE', w / 2, h * 0.68, 20, '#d6ffe6');
    }),
    zeitung: () => leinwand(160, 200, (g, w, h) => {
      g.fillStyle = '#ecebe3'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1c1c1c'; g.font = 'bold 30px serif'; g.textAlign = 'left'; g.fillText('MORGEN', 10, 34);
      g.fillRect(8, 42, w - 16, 3);
      g.fillStyle = '#555'; g.fillRect(10, 54, w - 20, 62);
      for (let y = 126; y < h - 8; y += 9) { g.fillStyle = '#8a8a8a'; g.fillRect(10, y, w - 20 - (y % 3) * 14, 4); }
    })
  };
  ET[id] = malen[id]();
  return ET[id];
}

function wareModell(id) {
  const g = new THREE.Group();
  const folie = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.3, metalness: 0.45, envMap: ENV, envMapIntensity: 1, ...extra });
  const alu = std(0xb8bcc2, { metalness: 0.9, roughness: 0.28, envMapIntensity: 1.2 });
  let m;
  switch (id) {
    case 'cola': {
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.122, 24), [folie(etikett('cola'), { metalness: 0.6, roughness: 0.25 }), alu, alu]);
      m.position.y = 0.061; g.add(m);
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.0315, 0.002, 6, 24), alu); r.rotation.x = Math.PI / 2; r.position.y = 0.122; g.add(r);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.001, 0.02), alu); l.position.set(0.004, 0.1225, 0); g.add(l);
      break;
    }
    case 'wasser': {
      const profil = [[0.001, 0], [0.034, 0], [0.037, 0.012], [0.037, 0.15], [0.033, 0.18], [0.017, 0.2], [0.016, 0.222], [0.001, 0.222]].map(([r, y]) => new THREE.Vector2(r, y));
      const glas = new THREE.MeshPhysicalMaterial({ color: 0xd2ecff, transparent: true, opacity: 0.4, roughness: 0.05, envMap: ENV, envMapIntensity: 1.6 });
      m = new THREE.Mesh(new THREE.LatheGeometry(profil, 24), glas); g.add(m);
      const wasser = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.14, 20), new THREE.MeshStandardMaterial({ color: 0x9cc8ee, transparent: true, opacity: 0.35, roughness: 0.1 }));
      wasser.position.y = 0.08; g.add(wasser);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0375, 0.0375, 0.07, 24, 1, true), new THREE.MeshStandardMaterial({ map: etikett('wasser'), roughness: 0.5, side: THREE.DoubleSide }));
      band.position.y = 0.09; g.add(band);
      const kappe = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.02, 16), std(0x2f7fd0, { roughness: 0.4 })); kappe.position.y = 0.232; g.add(kappe);
      break;
    }
    case 'chips': {
      const geo = new THREE.BoxGeometry(0.15, 0.23, 0.05, 10, 14, 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i); let y = p.getY(i), z = p.getZ(i);
        const t = y / 0.115, rand = Math.abs(t);
        z *= 1 + 0.55 * (1 - t * t);
        const naht = Math.min(1, Math.max(0, (rand - 0.8) / 0.17));
        z *= 1 - naht * 0.92;
        if (rand > 0.93) y += Math.sin(x * 260) * 0.0022 * Math.sign(t);
        p.setXYZ(i, x * (1 - 0.04 * (1 - t * t)), y, z);
      }
      geo.computeVertexNormals(); geo.translate(0, 0.115, 0);
      m = new THREE.Mesh(geo, folie(etikett('chips'), { metalness: 0.55, roughness: 0.28 })); g.add(m);
      break;
    }
    case 'schoko': {
      m = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.17, 0.014, 2, 0.004), folie(etikett('schoko'), { metalness: 0.2, roughness: 0.45 }));
      m.position.y = 0.085; m.rotation.x = -0.08; g.add(m);
      break;
    }
    case 'kaugummi': {
      m = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.085, 0.02, 2, 0.005), folie(etikett('kaugummi'), { metalness: 0.15, roughness: 0.4 }));
      m.position.y = 0.0425; g.add(m);
      break;
    }
    case 'zeitung': {
      const papier = std(0xe4e2d8, { roughness: 0.85 });
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.004, 0.3), i === 3
          ? [papier, papier, new THREE.MeshStandardMaterial({ map: etikett('zeitung'), roughness: 0.85 }), papier, papier, papier] : papier);
        b.position.set(zufall(-0.004, 0.004), 0.002 + i * 0.0045, zufall(-0.004, 0.004)); b.rotation.y = zufall(-0.05, 0.05); g.add(b);
      }
      break;
    }
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function preisSchild(ware) {
  return leinwand(256, 80, (g, w, h) => {
    g.fillStyle = '#fff9e6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e23c2c'; g.fillRect(0, 0, 10, h);
    g.fillStyle = '#1a1a1a'; g.font = 'bold 34px Inter, Arial'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(ware.name, 22, 28);
    g.fillStyle = '#c4231a'; g.font = 'bold 32px Inter, Arial'; g.fillText(euro(ware.preis), 22, 62);
  });
}

function plakat(breite, hoehe, malen, x, y, z, drehung) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(breite, hoehe), new THREE.MeshStandardMaterial({ map: leinwand(256, Math.round(256 * hoehe / breite), malen), roughness: 0.55, envMap: ENV, envMapIntensity: 0.3 }));
  m.position.set(x, y, z); m.rotation.y = drehung; m.receiveShadow = true;
  scene.add(m);
  return m;
}

function baueWelt() {
  // ---------------------------------------------------------------- Himmel
  scene.add(sterne());
  const mondRichtung = new THREE.Vector3(-0.45, 0.6, -0.66).normalize();
  const mondSprite = mond(); mondSprite.position.copy(mondRichtung).multiplyScalar(150); scene.add(mondSprite);
  const horizont = new THREE.Mesh(new THREE.CylinderGeometry(160, 160, 70, 40, 1, true), new THREE.MeshBasicMaterial({
    map: leinwand(4, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(70,50,60,0.25)'); gr.addColorStop(0.9, 'rgba(150,90,60,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }), side: THREE.BackSide, transparent: true, depthWrite: false, fog: false
  }));
  horizont.position.y = 20; scene.add(horizont);
  if (HOCH) {
    W.mond = new THREE.DirectionalLight(0x8197d6, 0.6);
    W.mond.position.copy(mondRichtung).multiplyScalar(40);
    W.mond.castShadow = true; W.mond.shadow.mapSize.set(2048, 2048);
    const sc = W.mond.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 5; sc.far = 90;
    W.mond.shadow.bias = -0.0004; W.mond.shadow.normalBias = 0.03;
    scene.add(W.mond, W.mond.target);
  }

  // Skyline in der Ferne
  {
    const fenster = leinwand(128, 256, (g, w, h) => {
      g.fillStyle = '#05070b'; g.fillRect(0, 0, w, h);
      for (let y = 6; y < h - 6; y += 14) for (let x = 6; x < w - 6; x += 12) {
        if (Math.random() < 0.22) { g.fillStyle = Math.random() < 0.8 ? '#ffd9a0' : '#a8c8ff'; g.fillRect(x, y, 6, 8); }
      }
    });
    const hMat = new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 1, emissive: 0xffffff, emissiveMap: fenster, emissiveIntensity: 0.9 });
    for (let i = 0; i < 16; i++) {
      const b = zufall(8, 18), h = zufall(14, 38), x = -70 + i * 9.5 + zufall(-3, 3), z = zufall(-62, -48);
      const geo = new THREE.BoxGeometry(b, h, zufall(8, 14));
      const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * b / 10, uv.getY(k) * h / 20);
      const m = new THREE.Mesh(geo, hMat); m.position.set(x, h / 2 - 1, z); scene.add(m);
    }
  }

  // ---------------------------------------------------------------- Boden draußen
  const erde = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), M.erde);
  erde.rotation.x = -Math.PI / 2; erde.position.y = -0.02; erde.receiveShadow = true; scene.add(erde);
  const platz = new THREE.Mesh(new THREE.PlaneGeometry(36, 16), M.platten);
  platz.rotation.x = -Math.PI / 2; platz.position.set(-4, -0.01, 1); platz.receiveShadow = true; scene.add(platz);
  const strasse = new THREE.Mesh(new THREE.PlaneGeometry(200, 6), M.asphalt);
  strasse.rotation.x = -Math.PI / 2; strasse.position.set(0, -0.005, -10); strasse.receiveShadow = true; scene.add(strasse);
  const strich = new THREE.MeshStandardMaterial({ color: 0x9a9a80, roughness: 0.5, envMap: ENV, envMapIntensity: 0.8 });
  for (let x = -90; x < 90; x += 6) kiste(3, 0.01, 0.15, strich, x, 0.002, -10).castShadow = false;
  kiste(200, 0.16, 0.3, std(0x5a5c60, { roughness: 0.8 }), 0, 0.07, -7.1);   // Bordstein
  const gully = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20), M.metall);
  gully.rotation.x = -Math.PI / 2; gully.position.set(-4.6, 0.003, -9); scene.add(gully);

  // Pfützen spiegeln die Lichter
  const wasserMat = new THREE.MeshStandardMaterial({
    color: 0x05070b, roughness: 0.03, metalness: 0, envMap: ENV, envMapIntensity: 1.8,
    normalMap: T.wasser, normalScale: new THREE.Vector2(0.12, 0.12), transparent: true, opacity: 0.94
  });
  W.pfuetzen = wasserMat;
  for (const [x, z, rx, rz] of [[2.2, -5.0, 1.5, 0.75], [-3.2, -5.7, 1.2, 0.6], [6.4, -2.2, 1.0, 1.5], [-8.6, -6.3, 1.7, 0.7], [-0.4, -8.2, 2.4, 0.8], [5.0, 2.0, 1.2, 0.9], [-6.5, -3.0, 1.0, 1.2]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1, 36), wasserMat);
    p.rotation.x = -Math.PI / 2; p.scale.set(rx, rz, 1); p.position.set(x, 0.007, z); scene.add(p);
  }

  // ---------------------------------------------------------------- Kiosk
  const innenBoden = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), M.boden);
  innenBoden.rotation.x = -Math.PI / 2; innenBoden.position.y = 0.005; innenBoden.receiveShadow = true; scene.add(innenBoden);
  const decke = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), M.decke);
  decke.rotation.x = Math.PI / 2; decke.position.y = 2.99; decke.receiveShadow = true; scene.add(decke);
  const H = 3;
  kiste(6.4, H, 0.2, M.wand, 0, H / 2, 2.6);
  kiste(6.6, H, 0.05, M.aussen, 0, H / 2, 2.73);
  kiste(0.2, H, 5.2, M.wand, -3.1, H / 2, 0);
  kiste(0.05, H, 5.5, M.aussen, -3.23, H / 2, 0);
  kiste(0.2, H, 2.9, M.wand, 3.1, H / 2, -1.05);
  kiste(0.2, H, 0.9, M.wand, 3.1, H / 2, 2.05);
  kiste(0.2, 0.8, 1.2, M.wand, 3.1, 2.6, 1.0);
  kiste(0.05, H, 2.9, M.aussen, 3.23, H / 2, -1.25);
  kiste(0.05, H, 1.0, M.aussen, 3.23, H / 2, 2.2);
  kiste(0.05, 0.8, 1.2, M.aussen, 3.23, 2.6, 1.0);
  kiste(6.4, 1.0, 0.2, M.wand, 0, 0.5, -2.6);
  kiste(6.6, 1.0, 0.05, M.aussen, 0, 0.5, -2.73);
  kiste(6.4, 0.7, 0.2, M.wand, 0, 2.65, -2.6);
  kiste(6.6, 0.7, 0.05, M.aussen, 0, 2.65, -2.73);
  kiste(1.0, 1.3, 0.2, M.wand, -2.6, 1.65, -2.6);
  kiste(1.0, 1.3, 0.2, M.wand, 2.6, 1.65, -2.6);
  kiste(1.1, 1.3, 0.05, M.aussen, -2.65, 1.65, -2.73);
  kiste(1.1, 1.3, 0.05, M.aussen, 2.65, 1.65, -2.73);
  // Rahmen des Verkaufsfensters
  kiste(4.3, 0.05, 0.12, M.metall, 0, 2.33, -2.78);
  kiste(0.05, 1.3, 0.12, M.metall, -2.12, 1.65, -2.78);
  kiste(0.05, 1.3, 0.12, M.metall, 2.12, 1.65, -2.78);
  // Dach mit Aufbauten
  rundkiste(6.9, 0.22, 5.9, 0.04, M.dach, 0, H + 0.12, 0);
  kiste(6.9, 0.18, 0.06, std(0x3a3d44, { roughness: 0.5 }), 0, H + 0.34, -2.95);
  kiste(0.06, 0.18, 5.9, std(0x3a3d44, { roughness: 0.5 }), -3.45, H + 0.34, 0);
  kiste(0.06, 0.18, 5.9, std(0x3a3d44, { roughness: 0.5 }), 3.45, H + 0.34, 0);
  for (const [x, z] of [[-1.6, 0.8], [1.9, -0.5]]) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.4, 16), M.metall); v.position.set(x, H + 0.4, z); v.castShadow = true; scene.add(v);
    const d = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.14, 16), M.metall); d.position.set(x, H + 0.67, z); scene.add(d);
  }
  const fallrohr = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.1, 10), std(0x4a4d55, { roughness: 0.4, metalness: 0.5 }));
  fallrohr.position.set(3.4, 1.5, -2.85); fallrohr.castShadow = true; scene.add(fallrohr);

  // Theke
  const theke = rundkiste(4.4, 0.08, 0.75, 0.02, M.theke, 0, 1.02, -2.2);
  theke.userData = { typ: 'theke' }; klickbar.push(theke);
  kiste(4.4, 1.0, 0.1, M.holz, 0, 0.5, -1.86);
  kiste(4.4, 0.06, 0.2, M.metall, 0, 0.03, -1.8);
  kiste(0.1, 1.0, 0.75, M.holz, -2.2, 0.5, -2.2);
  kiste(0.1, 1.0, 0.75, M.holz, 2.2, 0.5, -2.2);
  kiste(4.4, 0.03, 0.06, M.metall, 0, 1.065, -1.84);
  hindernis(-2.25, 2.25, -2.6, -1.8, () => !W.fensterFrei);

  // Leuchtstoffröhren und Licht
  rundkiste(1.5, 0.07, 0.3, 0.02, std(0xdcdcd6, { roughness: 0.5 }), 0, 2.955, 0);
  W.roehre = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 12), M.roehre);
  W.roehre.rotation.z = Math.PI / 2; W.roehre.position.set(0, 2.915, -0.07); scene.add(W.roehre);
  const roehre2 = new THREE.Mesh(W.roehre.geometry, M.roehre); roehre2.rotation.z = Math.PI / 2; roehre2.position.set(0, 2.915, 0.07); scene.add(roehre2);
  W.licht = spot(0xfff0d8, 34, 15, 1.25, 0.95, 1.3, new THREE.Vector3(0, 2.88, 0), new THREE.Vector3(0, 0, 0), true, 1024);
  // Weiches Fensterlicht: leuchtet mit der Deckenlampe und beleuchtet die Gesichter der Kunden draußen
  W.fensterLicht = new THREE.PointLight(0xffe2b8, 10, 8, 1.5);
  W.fensterLicht.position.set(0, 2.3, -1.5); scene.add(W.fensterLicht);
  {
    let staerke = 34;
    Object.defineProperty(W.licht, 'intensity', {
      configurable: true,
      get: () => staerke,
      set: v => { staerke = v; W.fensterLicht.intensity = v * 0.3; }
    });
  }
  W.notlicht = new THREE.PointLight(0xff1a10, 0, 10, 1.6);
  W.notlicht.position.set(0, 2.6, 1); scene.add(W.notlicht);
  W.monsterLicht = HOCH ? new THREE.PointLight(0xff2a14, 0, 6, 2) : KEIN_LICHT();
  if (HOCH) scene.add(W.monsterLicht);

  // Leuchtschild „KIOSK 24/7“ oben auf dem Dach – komplett sichtbar
  W.schildMat = new THREE.MeshBasicMaterial({ map: leinwand(640, 128, (g, w, h) => {
    g.fillStyle = '#120808'; g.fillRect(0, 0, w, h);
    g.font = 'bold 86px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff3355'; g.shadowBlur = 22; g.fillStyle = '#ff6a7e'; g.fillText('KIOSK', 220, 68);
    g.shadowColor = '#40c8ff'; g.fillStyle = '#9fe4ff'; g.fillText('24/7', 500, 68);
  }) });
  const schild = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.76), W.schildMat);
  schild.position.set(0, 4.02, -2.99); schild.rotation.y = Math.PI; scene.add(schild);
  rundkiste(4.0, 0.92, 0.12, 0.03, M.dunkel, 0, 4.02, -2.91);
  for (const x of [-1.6, 1.6]) kiste(0.08, 0.6, 0.08, M.metall, x, 3.4, -2.9);
  W.schildLicht = HOCH ? new THREE.PointLight(0xff4466, 5, 7, 1.8) : KEIN_LICHT();
  if (HOCH) { W.schildLicht.position.set(0, 3.7, -3.8); scene.add(W.schildLicht); }

  // Wände als Hindernisse
  hindernis(-3.25, 3.25, 2.5, 2.78);
  hindernis(-3.25, -3.0, -2.78, 2.78);
  hindernis(3.0, 3.25, -2.78, 0.4);
  hindernis(3.0, 3.25, 1.6, 2.78);
  hindernis(3.0, 3.25, 0.4, 1.6, () => !W.tuerOffen);
  hindernis(-3.25, -2.1, -2.78, -2.5);
  hindernis(2.1, 3.25, -2.78, -2.5);
  hindernis(-2.1, 2.1, -2.78, -2.5, () => !(W.fensterFrei && W.rollStand < 0.5));

  // Hintertür mit Rahmen, Klinke und Lampe
  W.tuerOffen = false; W.tuerWinkel = 0;
  kiste(0.1, 2.3, 0.08, M.metall, 3.1, 1.15, 0.36);
  kiste(0.1, 2.3, 0.08, M.metall, 3.1, 1.15, 1.64);
  kiste(0.1, 0.08, 1.3, M.metall, 3.1, 2.3, 1.0);
  W.tuer = new THREE.Group(); W.tuer.position.set(3.12, 0, 0.4); scene.add(W.tuer);
  const tuerMat = std(0x4b5d54, { roughness: 0.45, metalness: 0.35, envMapIntensity: 0.9 });
  const tuerBlatt = kiste(0.06, 2.2, 1.2, tuerMat, 0, 1.1, 0.6, W.tuer);
  tuerBlatt.userData = { typ: 'tuer' }; klickbar.push(tuerBlatt);
  // Taser in der Ladestation an der Wand neben der Hintertür
  {
    const st = new THREE.Group(); st.position.set(2.96, 1.35, -0.35); st.rotation.y = -Math.PI / 2; scene.add(st);
    rundkiste(0.3, 0.42, 0.06, 0.02, std(0x24262c, { roughness: 0.5 }), 0, 0, 0, st);
    const lampe = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 3, 0.4) }));
    lampe.position.set(0.1, 0.16, 0.035); st.add(lampe); W.taserLampe = lampe;
    W.taserWand = baueTaser(); W.taserWand.position.set(0, -0.02, 0.06); W.taserWand.rotation.z = Math.PI / 2; st.add(W.taserWand);
    const schildT = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), new THREE.MeshBasicMaterial({ map: leinwand(256, 64, (g, w, h) => {
      g.fillStyle = '#f0c020'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = 'bold 40px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TASER', w / 2, h / 2 + 2);
    }) }));
    schildT.position.set(0, 0.25, 0.035); st.add(schildT);
    const treffer = kiste(0.5, 0.6, 0.4, M.unsichtbar, 0, 0, 0.1, st);
    treffer.userData = { typ: 'taser' }; klickbar.push(treffer);
  }
  kiste(0.08, 0.5, 0.9, std(0x3b4a43, { roughness: 0.5, metalness: 0.3 }), 0, 0.5, 0.6, W.tuer);
  kiste(0.12, 0.04, 0.16, M.metall, 0, 1.05, 1.0, W.tuer);
  W.tuerLicht = new THREE.PointLight(0xffd8a0, 4, 8, 1.8);
  W.tuerLicht.position.set(3.9, 2.4, 1); scene.add(W.tuerLicht);
  rundkiste(0.34, 0.14, 0.22, 0.03, M.dunkel, 3.38, 2.5, 1);
  kiste(0.3, 0.05, 0.18, M.roehre, 3.38, 2.42, 1).castShadow = false;
  const ausgang = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.2), new THREE.MeshBasicMaterial({
    map: leinwand(256, 72, (g, w, h) => {
      g.fillStyle = '#0a8a30'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8ffe8'; g.font = 'bold 44px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AUSGANG ➜', w / 2, h / 2 + 2);
    })
  }));
  ausgang.position.set(2.98, 2.55, 1.0); ausgang.rotation.y = -Math.PI / 2; scene.add(ausgang);

  // Regale an der Rückwand (links davon steht der Kühlschrank in der Ecke)
  for (const y of [0.45, 0.95, 1.45, 1.95]) kiste(4.5, 0.04, 0.45, M.holz, 0.325, y, 2.27);
  for (const x of [-1.9, -0.43, 1.05, 2.55]) kiste(0.05, 2.0, 0.45, M.holz, x, 1.0, 2.27);
  kiste(4.6, 2.0, 0.02, std(0x2a2118, { roughness: 0.9 }), 0.325, 1.0, 2.49);
  hindernis(-1.95, 2.6, 2.02, 2.55);
  const regal = [
    ['wasser', -1.165, 0.97, 7, 0.17], ['cola', 0.31, 0.97, 11, 0.115], ['chips', 1.8, 0.97, 5, 0.26],
    ['schoko', -1.165, 1.47, 9, 0.14], ['kaugummi', 0.31, 1.47, 11, 0.115], ['zeitung', 1.8, 1.47, 3, 0.4]
  ];
  for (const [id, x, y, anzahl, abstand] of regal) {
    for (let reihe = 0; reihe < (HOCH ? 2 : 1); reihe++) {
      if (id === 'zeitung' && reihe) continue;
      const n = anzahl - reihe;
      for (let i = 0; i < n; i++) {
        const w = wareModell(id);
        w.position.set(x + (i - (n - 1) / 2) * abstand + reihe * abstand * 0.5 * (i < n - 1 ? 1 : 0), y, reihe ? 2.36 : 2.2);
        w.rotation.y = zufall(-0.3, 0.3) + (id === 'zeitung' ? 0 : Math.PI);
        scene.add(w);
      }
    }
    const treffer = kiste(1.4, 0.46, 0.5, M.unsichtbar, x, y + 0.2, 2.2);
    treffer.userData = { typ: 'regal', ware: id }; klickbar.push(treffer);
    const preis = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshBasicMaterial({ map: preisSchild(WARE[id]) }));
    preis.position.set(x, y - 0.06, 2.03); preis.rotation.y = Math.PI; scene.add(preis);
  }
  // Kartons oben und Wasserkisten unten
  const karton = std(0xa88456, { roughness: 0.85 });
  for (const [x, y, b, h, t] of [[-1.35, 2.12, 0.55, 0.3, 0.38], [-0.4, 2.12, 0.45, 0.26, 0.35], [0.7, 2.14, 0.6, 0.32, 0.4], [2.0, 2.1, 0.5, 0.24, 0.36]]) {
    const k = rundkiste(b, h, t, 0.01, karton, x, y, 2.28); k.rotation.y = zufall(-0.08, 0.08);
    kiste(b * 0.18, 0.002, t + 0.01, std(0xc8b48a, { roughness: 0.4 }), x, y + h / 2 + 0.001, 2.28);
  }
  for (let i = 0; i < 3; i++) rundkiste(0.45, 0.28, 0.34, 0.015, std(0x2a5ea0, { roughness: 0.5 }), -1.4 + i * 0.5, 0.6, 2.25);

  // Getränke-Kühlschrank hinten links in der Ecke: Glastür, Licht, echte Flaschen und Dosen
  {
    const kx = -2.47, kz = 2.14, kb = 1.0, kt = 0.72, kh = 2.0;
    const gehaeuse = std(0xe3e6ea, { roughness: 0.25, metalness: 0.35, envMapIntensity: 1 });
    const innen = new THREE.MeshStandardMaterial({ color: 0xdfeaf2, emissive: 0xcfe8ff, emissiveIntensity: 0.18, roughness: 0.4 });
    kiste(0.04, kh, kt, gehaeuse, kx - kb / 2 + 0.02, kh / 2, kz);
    kiste(0.04, kh, kt, gehaeuse, kx + kb / 2 - 0.02, kh / 2, kz);
    kiste(kb, 0.05, kt, gehaeuse, kx, kh - 0.025, kz);
    kiste(kb, 0.2, kt, std(0x2a2d33, { roughness: 0.6 }), kx, 0.1, kz);
    kiste(kb - 0.08, kh - 0.25, 0.02, innen, kx, 1.1, kz + kt / 2 - 0.03);
    // Kopfteil mit Leuchtschrift
    const kopf = new THREE.Mesh(new THREE.PlaneGeometry(kb - 0.06, 0.2), new THREE.MeshBasicMaterial({ map: leinwand(256, 52, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#0b5fa8'); gr.addColorStop(1, '#1789d8');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.font = 'bold 30px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EISKALT', w / 2, h / 2 + 1);
    }) }));
    kopf.position.set(kx, kh - 0.16, kz - kt / 2 - 0.005); kopf.rotation.y = Math.PI; scene.add(kopf);
    // Licht-Leiste innen
    kiste(kb - 0.1, 0.02, 0.02, std(0xffffff, { emissive: 0xdff0ff, emissiveIntensity: 0.9 }), kx, kh - 0.3, kz - kt / 2 + 0.08).castShadow = false;
    if (HOCH) { const l = new THREE.PointLight(0xdcefff, 1.1, 2.0, 1.8); l.position.set(kx, 1.4, kz - 0.1); scene.add(l); }
    // Gitterböden mit Getränken
    const boeden = [0.3, 0.7, 1.1, 1.5];
    boeden.forEach((y, r) => {
      kiste(kb - 0.1, 0.012, kt - 0.1, M.metall, kx, y, kz).castShadow = false;
      const id = r < 2 ? 'cola' : 'wasser';
      const abstand = id === 'cola' ? 0.1 : 0.12, n = id === 'cola' ? 8 : 7;
      for (let reihe = 0; reihe < (HOCH ? 2 : 1); reihe++) {
        for (let i = 0; i < n - reihe; i++) {
          const w = wareModell(id);
          w.position.set(kx + (i - (n - 1 - reihe) / 2) * abstand, y + 0.006, kz - 0.18 + reihe * 0.2);
          w.rotation.y = Math.PI + zufall(-0.25, 0.25);
          w.traverse(o => { if (o.isMesh) o.castShadow = false; });
          scene.add(w);
        }
      }
    });
    // Glastür mit Rahmen und Griff
    const tuerZ = kz - kt / 2 - 0.012;
    const glas = new THREE.Mesh(new THREE.PlaneGeometry(kb - 0.08, kh - 0.42), new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.03, envMap: ENV, envMapIntensity: 1.8, depthWrite: false
    }));
    glas.position.set(kx, 1.03, tuerZ); glas.rotation.y = Math.PI; glas.renderOrder = 3; scene.add(glas);
    const rahmen = std(0xcfd3d8, { roughness: 0.3, metalness: 0.6 });
    kiste(kb, 0.04, 0.03, rahmen, kx, 0.22, tuerZ);
    kiste(kb, 0.04, 0.03, rahmen, kx, 1.84, tuerZ);
    kiste(0.04, 1.62, 0.03, rahmen, kx - kb / 2 + 0.02, 1.03, tuerZ);
    kiste(0.04, 1.62, 0.03, rahmen, kx + kb / 2 - 0.02, 1.03, tuerZ);
    kiste(0.03, 0.5, 0.04, M.metall, kx + kb / 2 - 0.08, 1.1, tuerZ - 0.03);
    // Antippen: oben Wasser, unten Cola
    const oben = kiste(kb, 0.8, 0.5, M.unsichtbar, kx, 1.45, kz - 0.15); oben.userData = { typ: 'regal', ware: 'wasser' }; klickbar.push(oben);
    const unten = kiste(kb, 0.8, 0.5, M.unsichtbar, kx, 0.6, kz - 0.15); unten.userData = { typ: 'regal', ware: 'cola' }; klickbar.push(unten);
    hindernis(kx - kb / 2 - 0.02, kx + kb / 2, kz - kt / 2 - 0.03, 2.55);
  }

  // Kasse mit Bildschirm
  W.kasse = new THREE.Group(); W.kasse.position.set(1.55, 1.06, -2.2); scene.add(W.kasse);
  rundkiste(0.5, 0.14, 0.4, 0.025, std(0x1a1c20, { roughness: 0.45 }), 0, 0.07, 0, W.kasse);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) kiste(0.04, 0.012, 0.04, std(r === 0 ? 0xcc3333 : 0x888c92, { roughness: 0.4 }), -0.1 + c * 0.05, 0.145, 0.02 + r * 0.05 - 0.05, W.kasse);
  W.kasseCanvas = document.createElement('canvas'); W.kasseCanvas.width = 128; W.kasseCanvas.height = 64;
  W.kasseTextur = new THREE.CanvasTexture(W.kasseCanvas); W.kasseTextur.colorSpace = THREE.SRGBColorSpace;
  W.zeigeKasse = text => {
    const g = W.kasseCanvas.getContext('2d');
    g.fillStyle = '#052a10'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#5dff8a'; g.font = 'bold 30px monospace'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(text, 120, 32);
    W.kasseTextur.needsUpdate = true;
  };
  W.zeigeKasse('0,00');
  const bild = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: W.kasseTextur }));
  bild.position.set(0, 0.3, 0.067); bild.rotation.x = -0.35; W.kasse.add(bild);
  rundkiste(0.38, 0.21, 0.03, 0.01, M.dunkel, 0, 0.3, 0.075, W.kasse).rotation.x = -0.35;
  const kasseTreffer = kiste(0.7, 0.6, 0.6, M.unsichtbar, 0, 0.25, 0, W.kasse);
  kasseTreffer.userData = { typ: 'kasse' }; klickbar.push(kasseTreffer);

  // Theken-Deko: Klingel, Trinkgeld-Glas, Notizblock
  {
    const klingel = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd8b04a, { metalness: 0.9, roughness: 0.25, envMapIntensity: 1.5 }));
    klingel.position.set(-1.2, 1.06, -2.3); klingel.castShadow = true; scene.add(klingel);
    kiste(0.01, 0.025, 0.01, M.metall, -1.2, 1.1, -2.3);
    const glasKrug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 18, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.3, roughness: 0.05, envMap: ENV, envMapIntensity: 1.6, side: THREE.DoubleSide }));
    glasKrug.position.set(-0.7, 1.115, -2.38); scene.add(glasKrug);
    for (let i = 0; i < 6; i++) { const mz = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.003, 12), std(0xd9b04a, { metalness: 0.9, roughness: 0.3 })); mz.position.set(-0.7 + zufall(-0.03, 0.03), 1.065 + i * 0.003, -2.38 + zufall(-0.03, 0.03)); scene.add(mz); }
    rundkiste(0.14, 0.012, 0.2, 0.003, std(0xf2eed8, { roughness: 0.9 }), -0.1, 1.067, -2.0).rotation.y = 0.2;
  }

  // Wanduhr (zeigt die Spielzeit)
  {
    const c = document.createElement('canvas'); c.width = c.height = 256; W.uhrCanvas = c;
    W.uhrTextur = new THREE.CanvasTexture(c); W.uhrTextur.colorSpace = THREE.SRGBColorSpace; W.uhrTextur.anisotropy = 8;
    const ziffer = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), new THREE.MeshStandardMaterial({ map: W.uhrTextur, roughness: 0.4, envMap: ENV, envMapIntensity: 0.5 }));
    ziffer.position.set(0.95, 2.62, 2.485); ziffer.rotation.y = Math.PI; scene.add(ziffer);
    const rahmen = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.016, 10, 48), std(0x15171c, { roughness: 0.4 }));
    rahmen.position.set(0.95, 2.62, 2.48); scene.add(rahmen);
    W.uhrMinute = -1;
    W.zeichneUhr = minuten => {
      const m5 = Math.floor(minuten / 5);
      if (m5 === W.uhrMinute) return;
      W.uhrMinute = m5;
      const g = c.getContext('2d'), r = 128;
      g.fillStyle = '#f2efe4'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#1a1a1a'; g.fillStyle = '#1a1a1a'; g.lineCap = 'round';
      for (let i = 0; i < 60; i++) {
        const a = i / 60 * Math.PI * 2, l = i % 5 ? 6 : 16;
        g.lineWidth = i % 5 ? 2 : 5;
        g.beginPath(); g.moveTo(r + Math.sin(a) * (r - 8), r - Math.cos(a) * (r - 8)); g.lineTo(r + Math.sin(a) * (r - 8 - l), r - Math.cos(a) * (r - 8 - l)); g.stroke();
      }
      g.font = 'bold 30px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const z of [12, 3, 6, 9]) { const a = z / 12 * Math.PI * 2; g.fillText(String(z), r + Math.sin(a) * 86, r - Math.cos(a) * 86); }
      const gesamt = 22 * 60 + m5 * 5, std12 = (gesamt / 60) % 12, mi = gesamt % 60;
      const zeiger = (winkel, laenge, dicke, farbe) => {
        g.strokeStyle = farbe; g.lineWidth = dicke;
        g.beginPath(); g.moveTo(r - Math.sin(winkel) * 14, r + Math.cos(winkel) * 14); g.lineTo(r + Math.sin(winkel) * laenge, r - Math.cos(winkel) * laenge); g.stroke();
      };
      zeiger(std12 / 12 * Math.PI * 2, 58, 9, '#1a1a1a');
      zeiger(mi / 60 * Math.PI * 2, 88, 6, '#1a1a1a');
      g.fillStyle = '#b01818'; g.beginPath(); g.arc(r, r, 8, 0, Math.PI * 2); g.fill();
      W.uhrTextur.needsUpdate = true;
    };
    W.zeichneUhr(0);
  }

  // Plakate und Schilder
  plakat(0.6, 0.85, (g, w, h) => {
    g.fillStyle = '#143c8c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd23a'; g.font = 'bold 54px Inter, Arial'; g.textAlign = 'center'; g.fillText('LOTTO', w / 2, 62);
    g.fillStyle = '#fff'; g.font = 'bold 20px Inter, Arial'; g.fillText('JACKPOT', w / 2, 100);
    g.fillStyle = '#ffd23a'; g.font = 'bold 74px Inter, Arial'; g.fillText('9 Mio', w / 2, 190);
    for (let i = 0; i < 6; i++) { g.fillStyle = '#fff'; g.beginPath(); g.arc(36 + i * 36, 250, 15, 0, Math.PI * 2); g.fill(); g.fillStyle = '#143c8c'; g.font = 'bold 16px Inter'; g.fillText(String(7 + i * 7), 36 + i * 36, 256); }
  }, -2.985, 1.95, -0.7, Math.PI / 2);
  plakat(0.5, 0.7, (g, w, h) => {
    g.fillStyle = '#ffe9f0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e2437d'; g.beginPath(); g.arc(w / 2, 120, 62, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c9a063'; g.beginPath(); g.moveTo(w / 2 - 44, 150); g.lineTo(w / 2 + 44, 150); g.lineTo(w / 2, 280); g.fill();
    g.fillStyle = '#e2437d'; g.font = 'bold 46px Inter, Arial'; g.textAlign = 'center'; g.fillText('EIS', w / 2, 40 + 270);
  }, -2.985, 1.7, 0.35, Math.PI / 2);
  plakat(0.42, 0.3, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c4231a'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#c4231a'; g.font = 'bold 34px Inter, Arial'; g.textAlign = 'center'; g.fillText('BITTE', w / 2, 56);
    g.fillStyle = '#1a1a1a'; g.font = 'bold 22px Inter, Arial'; g.fillText('RICHTIG', w / 2, 100); g.fillText('WECHSELN!', w / 2, 128);
  }, 2.62, 1.7, -2.49, 0);
  // Fußmatte am Fenster
  rundkiste(2.2, 0.02, 0.7, 0.01, std(0x1a1a1c, { roughness: 0.95 }), 0, 0.015, -1.15);
  // Mülleimer
  {
    const eimer = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.5, 18), std(0x394a3e, { roughness: 0.5 }));
    eimer.position.set(2.72, 0.25, 2.2); eimer.castShadow = true; scene.add(eimer);
    hindernis(2.5, 2.95, 1.95, 2.45);
  }
  // Überwachungskamera mit blinkender LED
  {
    const kam = new THREE.Group(); kam.position.set(-2.88, 2.72, -2.2); scene.add(kam);
    rundkiste(0.12, 0.1, 0.22, 0.02, std(0xdcdcd8, { roughness: 0.4 }), 0, 0, 0, kam);
    const linse = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 14), M.dunkel); linse.rotation.x = Math.PI / 2; linse.position.z = 0.13; kam.add(linse);
    W.kamLed = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.1, 0.1) }));
    W.kamLed.position.set(0.04, 0.03, 0.11); kam.add(W.kamLed);
    kam.rotation.y = 0.6; kam.rotation.x = 0.25;
  }
  // Lüfter an der Wand
  {
    W.luefter = new THREE.Group(); W.luefter.position.set(2.96, 2.55, -1.3); scene.add(W.luefter);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 28), std(0xc8c8c4, { roughness: 0.4 })); ring.rotation.y = Math.PI / 2; W.luefter.add(ring);
    const flug = new THREE.Group(); W.luefter.add(flug); W.luefterFlug = flug;
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.17, 0.07), std(0x8a8d92, { roughness: 0.5, metalness: 0.5 }));
      b.position.y = 0.09; b.rotation.y = 0.5; const arm = new THREE.Group(); arm.add(b); arm.rotation.x = i * Math.PI / 2; flug.add(arm);
    }
    const dunkelGitter = new THREE.Mesh(new THREE.CircleGeometry(0.19, 20), new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    dunkelGitter.rotation.y = Math.PI / 2; dunkelGitter.position.x = 0.01; W.luefter.add(dunkelGitter);
  }
  // Staub, der im Licht schwebt
  {
    const n = 140, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = zufall(-2.9, 2.9); pos[i * 3 + 1] = zufall(0.3, 2.8); pos[i * 3 + 2] = zufall(-2.3, 2.3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    W.staub = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff2d8, size: 0.014, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    W.staub.frustumCulled = false; scene.add(W.staub);
  }

  // Rollladen + Schalter
  W.rollladen = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1, 0.04), pbr(T.rollladen, { metalness: 0.7, envMapIntensity: 1 }));
  W.rollladen.position.set(0, 2.3, -2.76); W.rollladen.castShadow = true; scene.add(W.rollladen);
  rundkiste(4.5, 0.3, 0.3, 0.05, M.metall, 0, 2.42, -2.9);
  W.rollStand = 0; W.rollZiel = 0;
  const schalter = new THREE.Group(); schalter.position.set(-2.95, 1.45, -2.0); scene.add(schalter);
  rundkiste(0.08, 0.36, 0.26, 0.012, std(0xf0c020, { roughness: 0.4 }), 0, 0, 0, schalter);
  W.schalterKnopf = rundkiste(0.06, 0.12, 0.12, 0.01, new THREE.MeshStandardMaterial({ color: 0xd01010, emissive: 0x600000, roughness: 0.3 }), 0.05, 0, 0, schalter);
  const schalterTreffer = kiste(0.5, 0.6, 0.6, M.unsichtbar, 0.1, 0, 0, schalter);
  schalterTreffer.userData = { typ: 'rollladen' }; klickbar.push(schalterTreffer);

  // ---------------------------------------------------------------- Draußen
  // Haltestelle mit Leuchtkasten
  {
    const hs = new THREE.Group(); hs.position.set(-11.5, 0, -5.4); scene.add(hs);
    kiste(3.2, 2.2, 0.05, new THREE.MeshPhysicalMaterial({ color: 0xa8c4d4, transparent: true, opacity: 0.22, roughness: 0.05, envMap: ENV, envMapIntensity: 1.6 }), 0, 1.2, 0.5, hs).castShadow = false;
    rundkiste(3.5, 0.1, 1.5, 0.03, M.dach, 0, 2.35, 0, hs);
    for (const x of [-1.6, 1.6]) kiste(0.08, 2.35, 0.08, M.metall, x, 1.17, 0.5, hs);
    rundkiste(2.2, 0.06, 0.4, 0.02, M.holz, 0, 0.5, 0.25, hs);
    kiste(0.06, 0.5, 0.06, M.metall, -0.9, 0.25, 0.25, hs); kiste(0.06, 0.5, 0.06, M.metall, 0.9, 0.25, 0.25, hs);
    const kasten = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshStandardMaterial({
      color: 0x111111, emissive: 0xffffff, emissiveIntensity: 0.95,
      emissiveMap: leinwand(200, 280, (g, w, h) => {
        g.fillStyle = '#eef4ff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2d7a3e'; g.fillRect(0, 0, w, 44); g.fillStyle = '#fff'; g.font = 'bold 26px Inter, Arial'; g.textAlign = 'left'; g.fillText('N13 Fahrplan', 10, 31);
        g.fillStyle = '#222'; g.font = '18px Inter, Arial';
        ['22:00', '22:45', '23:30', '00:15', '01:00', '— — —'].forEach((z, i) => g.fillText(z + '   Endstation', 12, 80 + i * 28));
      })
    }));
    kasten.position.set(0, 1.35, 0.46); kasten.rotation.y = Math.PI; hs.add(kasten);
    W.hsLicht = HOCH ? new THREE.PointLight(0xdfeaff, 3.5, 6, 2) : KEIN_LICHT();
    if (HOCH) { W.hsLicht.position.set(-11.5, 1.9, -4.4); scene.add(W.hsLicht); }
    hindernis(-13.2, -9.8, -5.0, -4.8);
  }
  kiste(0.08, 2.6, 0.08, M.metall, -8, 1.3, -6.7);
  const hSchild = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.69), new THREE.MeshBasicMaterial({
    map: leinwand(128, 160, (g, w, h) => {
      g.fillStyle = '#f3e9b0'; g.beginPath(); g.arc(64, 60, 56, 0, Math.PI * 2); g.fill();
      g.lineWidth = 10; g.strokeStyle = '#2d7a3e'; g.stroke();
      g.fillStyle = '#2d7a3e'; g.font = 'bold 70px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 64, 64);
      g.fillStyle = '#f3efe2'; g.fillRect(4, 124, 120, 32);
      g.fillStyle = '#111'; g.font = 'bold 20px Arial'; g.fillText('Endstation', 64, 141);
    })
  }));
  hSchild.position.set(-8, 2.5, -6.65); hSchild.rotation.y = Math.PI; scene.add(hSchild);

  // Straßenlaternen mit Lichtkegel und Schatten
  W.laternen = [];
  [[-6, -6.6, true], [7, -6.6, true], [-15, 4, false]].forEach(([x, z, echt], idx) => {
    kiste(0.12, 4.2, 0.12, M.dunkel, x, 2.1, z);
    rundkiste(0.14, 0.14, 0.14, 0.04, M.dunkel, x, 0.07, z);
    kiste(0.6, 0.08, 0.14, M.dunkel, x, 4.2, z);
    rundkiste(0.55, 0.12, 0.3, 0.05, M.dunkel, x, 4.12, z);
    const lins = kiste(0.42, 0.03, 0.22, M.roehre, x, 4.04, z); lins.castShadow = false;
    if (echt && (HOCH || idx === 0)) {
      const l = spot(0xffc477, 70, 22, 0.95, 0.85, 1.4, new THREE.Vector3(x, 4.0, z), new THREE.Vector3(x, 0, z + (z < 0 ? 1 : -1)), idx < 2, 1024);
      W.laternen.push(l);
      if (HOCH) { const k = lichtkegel(2.3, 4, 0xffc477, 0.055); k.position.set(x, 4.0, z); scene.add(k); }
    }
  });
  for (const [x, z] of [[5.2, -4.2], [-4.7, -4.5]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.9, 18), std(0x2f5a3a, { roughness: 0.55 }));
    m.position.set(x, 0.45, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    const deckel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 18), std(0x26492f, { roughness: 0.5 })); deckel.position.set(x, 0.93, z); deckel.castShadow = true; scene.add(deckel);
    hindernis(x - 0.32, x + 0.32, z - 0.32, z + 0.32);
  }
  // Paletten und Kisten neben dem Kiosk
  for (let i = 0; i < 3; i++) rundkiste(1.1, 0.14, 0.9, 0.01, M.holz, 5.0, 0.07 + i * 0.5, 2.8).rotation.y = i * 0.2;
  rundkiste(1.0, 0.4, 0.8, 0.02, std(0x2a5ea0, { roughness: 0.5 }), 5.0, 0.2, 2.8);
  hindernis(4.4, 5.7, 2.3, 3.3);
  for (let i = 0; i < 3; i++) { const sack = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), std(0x0c0c0e, { roughness: 0.25, metalness: 0.1, envMapIntensity: 1.2 })); sack.scale.set(1, 0.9, 1); sack.position.set(4.2 + i * 0.3, 0.28, -1.4 + i * 0.35); sack.castShadow = true; scene.add(sack); }

  // Bäume
  const stamm = std(0x1a120c, { roughness: 1 }), nadel = std(0x07100b, { roughness: 1, envMapIntensity: 0.2 });
  for (let i = 0; i < 46; i++) {
    const seite = i % 2 ? 1 : -1;
    const x = zufall(-70, 70), z = seite > 0 ? zufall(12, 40) : zufall(-45, -18), h = zufall(6, 12);
    const baum = new THREE.Group(); baum.position.set(x, 0, z);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, h * 0.4, 7), stamm); s.position.y = h * 0.2; baum.add(s);
    for (let k = 0; k < 4; k++) {
      const kegel = new THREE.Mesh(new THREE.ConeGeometry(zufall(2.2, 3) - k * 0.45, h * 0.42, 8), nadel);
      kegel.position.y = h * 0.35 + k * h * 0.2; kegel.castShadow = HOCH && Math.abs(x) < 25; baum.add(kegel);
    }
    scene.add(baum);
  }
  // Zaun hinter dem Kiosk
  for (let x = -18; x <= 12; x += 0.6) kiste(0.06, 1.4, 0.06, M.dunkel, x, 0.7, 8.3);
  kiste(30, 0.06, 0.06, M.dunkel, -3, 1.2, 8.3);
  kiste(30, 0.06, 0.06, M.dunkel, -3, 0.35, 8.3);

  baueBus();
  baueRegen();
  baueKamera();
}

// ---------- Bus ----------
function baueBus() {
  const g = new THREE.Group();
  const lack = new THREE.MeshStandardMaterial({ color: 0xe0a20e, roughness: 0.3, metalness: 0.35, envMap: ENV, envMapIntensity: 1.2 });
  const unten = std(0x24262b, { roughness: 0.5 });
  rundkiste(11, 2.6, 2.6, 0.2, lack, 0, 1.7, 0, g).castShadow = false;
  rundkiste(11.04, 0.55, 2.64, 0.12, unten, 0, 0.7, 0, g).castShadow = false;
  rundkiste(11.03, 0.1, 2.63, 0.03, std(0x1a1a1a, { roughness: 0.6 }), 0, 1.14, 0, g).castShadow = false;
  const fensterTex = leinwand(1024, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe2b0'); gr.addColorStop(1, '#ffb866');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(70,45,20,0.9)';
    for (let x = 40; x < w - 120; x += 96) {
      c.fillRect(x, h - 62, 44, 62); c.beginPath(); c.arc(x + 22, h - 70, 0, 0, 6.3); c.fill();
      c.fillRect(x + 48, h - 56, 6, 56);
    }
    c.fillStyle = '#2a1c0e';
    c.beginPath(); c.arc(w - 70, 52, 22, 0, Math.PI * 2); c.fill();
    c.fillRect(w - 100, 74, 60, 54);
    c.fillStyle = 'rgba(30,22,12,0.95)';
    for (let x = 0; x <= w; x += 160) c.fillRect(x - 5, 0, 10, h);
    c.fillRect(0, 0, w, 6);
  });
  W.busFenster = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0xffffff, emissiveMap: fensterTex, emissiveIntensity: 1.1, roughness: 0.08, envMap: ENV, envMapIntensity: 1.4 });
  kiste(9.4, 0.95, 2.64, W.busFenster, -0.6, 2.3, 0, g).castShadow = false;
  kiste(0.04, 1.2, 2.3, std(0x151a26, { roughness: 0.05, emissive: 0x6a5230, emissiveIntensity: 0.55, envMapIntensity: 1.6 }), 5.51, 2.2, 0, g);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.4), new THREE.MeshBasicMaterial({ map: leinwand(512, 96, (c, w, h) => {
    c.fillStyle = '#100a02'; c.fillRect(0, 0, w, h);
    c.font = 'bold 54px monospace'; c.textBaseline = 'middle'; c.fillStyle = '#ffaa2b'; c.shadowColor = '#ffaa2b'; c.shadowBlur = 10; c.fillText('N13  ENDSTATION', 18, 50);
  }) }));
  led.position.set(5.53, 2.9, 0); led.rotation.y = Math.PI / 2; g.add(led);
  for (const z of [-0.85, 0.85]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.8, 3) }));
    s.position.set(5.5, 0.95, z); s.scale.x = 0.5; g.add(s);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.1) }));
    r.position.set(-5.5, 1.0, z); g.add(r);
    kiste(0.08, 0.3, 0.18, M.dunkel, 5.3, 1.9, z * 1.6, g);
  }
  W.busTuer = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xffd080, emissiveIntensity: 0, roughness: 0.2, envMap: ENV, envMapIntensity: 1 });
  kiste(1.1, 2.1, 0.04, W.busTuer, 3.5, 1.45, 1.31, g).castShadow = false;
  for (const x of [2.93, 4.07]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 10), std(0xe0c030, { roughness: 0.3, metalness: 0.6 })); h.position.set(x, 1.45, 1.36); g.add(h); }
  const reifen = std(0x0c0c0e, { roughness: 0.95 });
  for (const [x, z] of [[-3.5, 1.2], [3.5, 1.2], [-3.5, -1.2], [3.5, -1.2]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 24), reifen); r.rotation.x = Math.PI / 2; r.position.set(x, 0.52, z); g.add(r);
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.32, 18), M.metall); n.rotation.x = Math.PI / 2; n.position.set(x, 0.52, z); g.add(n);
  }
  W.busLicht = HOCH
    ? spot(0xfff2d0, 80, 40, 0.55, 0.7, 1.2, new THREE.Vector3(5.6, 0.95, 0), new THREE.Vector3(14, 0.1, 0), false, 512, g)
    : KEIN_LICHT();
  if (HOCH) {
    W.busInnen = new THREE.PointLight(0xffc880, 7, 9, 1.6); W.busInnen.position.set(2, 2.2, 2.6); g.add(W.busInnen);
  }
  g.position.set(-90, 0, -10);
  scene.add(g);
  W.bus = { g, zustand: 'weg', t: 0, x: -90 };
}
const BUS_HALT = -11.5;   // Tür bei x = −8
const BUS_TUER = new THREE.Vector3(-8, 0, -7.7);

// ---------- Regen: feine Streifen, die im Licht glitzern ----------
const REGEN_N = HOCH ? 2600 : 1200, TRAUFE_N = 90, REGEN_W = 30;
const LAMPEN_REGEN = [new THREE.Vector3(-6, 3.6, -6.6), new THREE.Vector3(7, 3.6, -6.6), new THREE.Vector3(-15, 3.6, 4), new THREE.Vector3(0, 3.3, -3.4), new THREE.Vector3(3.9, 2.3, 1), new THREE.Vector3(-11.5, 1.6, -4.6)];
function baueRegen() {
  const n = REGEN_N + TRAUFE_N;
  const pos = new Float32Array(n * 12), alpha = new Float32Array(n * 4), seite = new Float32Array(n * 4), index = [];
  W.regenV = new Float32Array(n); W.regenL = new Float32Array(n);
  W.regenX = new Float32Array(n); W.regenY = new Float32Array(n); W.regenZ = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const traufe = i >= REGEN_N;
    W.regenV[i] = traufe ? zufall(5.5, 7.5) : zufall(9, 13);
    W.regenL[i] = traufe ? zufall(0.08, 0.16) : zufall(0.35, 0.7);
    W.regenX[i] = traufe ? zufall(-3.4, 3.4) : zufall(-REGEN_W / 2, REGEN_W / 2);
    W.regenY[i] = traufe ? zufall(0, 3.1) : zufall(0, 14);
    W.regenZ[i] = traufe ? zufall(-3.02, -2.95) : zufall(-REGEN_W / 2, REGEN_W / 2);
    // vier Ecken: Kopf links/rechts (hell), Schwanz links/rechts (durchsichtig)
    alpha.set([1, 1, 0, 0], i * 4); seite.set([-1, 1, -1, 1], i * 4);
    const v = i * 4; index.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('seite', new THREE.BufferAttribute(seite, 1));
  geo.setIndex(index);
  W.regenMat = new THREE.ShaderMaterial({
    uniforms: { lampen: { value: LAMPEN_REGEN }, blitz: { value: 0 }, dichte: { value: scene.fog.density } },
    vertexShader: `
      attribute float alpha; attribute float seite;
      varying float vA; varying vec3 vW; varying float vD;
      void main(){
        vA = alpha;
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vec4 mv = viewMatrix * w;
        vD = -mv.z;
        mv.x += seite * max(0.0022, vD * 0.0011);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 lampen[6]; uniform float blitz; uniform float dichte;
      varying float vA; varying vec3 vW; varying float vD;
      void main(){
        float licht = 0.12 + blitz * 1.2;
        for (int i = 0; i < 6; i++) { vec3 d = vW - lampen[i]; licht += 1.1 * exp(-dot(d, d) / 7.0); }
        float nebel = exp(-pow(vD * dichte, 2.0));
        float a = vA * clamp(licht, 0.0, 1.4) * 0.55 * nebel;
        gl_FragColor = vec4(vec3(0.78, 0.84, 0.95) * (0.7 + licht * 0.5), a);
      }`,
    transparent: true, depthWrite: false
  });
  W.regen = new THREE.Mesh(geo, W.regenMat);
  W.regen.frustumCulled = false; W.regen.renderOrder = 6;
  scene.add(W.regen);

  // Ringe und Spritzer am Boden
  W.ringe = [];
  const ringGeo = new THREE.RingGeometry(0.7, 1, 24);
  ringGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < (HOCH ? 90 : 40); i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xc8d8f0, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.renderOrder = 4; scene.add(m);
    W.ringe.push({ m, t: 1, dauer: 0.5 });
  }
  W.ringIndex = 0;
}
function spritzer(x, z, gross = 1) {
  const r = W.ringe[W.ringIndex = (W.ringIndex + 1) % W.ringe.length];
  r.m.position.set(x, 0.012, z); r.t = 0; r.dauer = zufall(0.35, 0.6); r.gross = gross * zufall(0.12, 0.22);
  r.m.visible = true;
}
function updateRegen(dt) {
  const pos = W.regen.geometry.attributes.position.array, cx = camera.position.x, cz = camera.position.z;
  const wind = 0.9;
  const imKiosk = (x, z) => x > -3.4 && x < 3.4 && z > -2.9 && z < 2.95;
  for (let i = 0; i < REGEN_N + TRAUFE_N; i++) {
    const traufe = i >= REGEN_N;
    let x = W.regenX[i], y = W.regenY[i] - W.regenV[i] * dt, z = W.regenZ[i];
    if (!traufe) {
      x += wind * dt * 0.35;
      if (x - cx > REGEN_W / 2) x -= REGEN_W; else if (x - cx < -REGEN_W / 2) x += REGEN_W;
      if (z - cz > REGEN_W / 2) z -= REGEN_W; else if (z - cz < -REGEN_W / 2) z += REGEN_W;
    }
    if (y < 0 || (!traufe && imKiosk(x, z) && y < 3.35)) {
      if (y < 0 && (traufe || Math.random() < 0.06) && Math.hypot(x - cx, z - cz) < 11 && !imKiosk(x, z)) spritzer(x, z, traufe ? 1.3 : 1);
      if (traufe) { y = 3.1; x = zufall(-3.4, 3.4); }
      else {
        y = zufall(11, 14);
        x = cx + zufall(-REGEN_W / 2, REGEN_W / 2); z = cz + zufall(-REGEN_W / 2, REGEN_W / 2);
      }
    }
    W.regenX[i] = x; W.regenY[i] = y; W.regenZ[i] = z;
    const l = W.regenL[i], sx = traufe ? 0 : wind * 0.035 * l, j = i * 12;
    pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
    pos[j + 3] = x; pos[j + 4] = y; pos[j + 5] = z;
    pos[j + 6] = x - sx; pos[j + 7] = y + l; pos[j + 8] = z;
    pos[j + 9] = x - sx; pos[j + 10] = y + l; pos[j + 11] = z;
  }
  W.regen.geometry.attributes.position.needsUpdate = true;
  // zusätzliche Ringe in Pfützen und auf dem Platz
  const anzahl = Math.random() < dt * (HOCH ? 70 : 30) ? 1 : 0;
  for (let i = 0; i < anzahl; i++) {
    const x = cx + zufall(-8, 8), z = cz + zufall(-8, 8);
    if (!imKiosk(x, z)) spritzer(x, z);
  }
  for (const r of W.ringe) {
    if (!r.m.visible) continue;
    r.t += dt;
    const a = r.t / r.dauer;
    if (a >= 1) { r.m.visible = false; continue; }
    r.m.scale.setScalar(r.gross * (0.3 + a * 1.4));
    r.m.material.opacity = (1 - a) * 0.45;
  }
}

// ---------- Taser ----------
function baueTaser() {
  const g = new THREE.Group();
  rundkiste(0.05, 0.16, 0.04, 0.012, std(0xf0c020, { roughness: 0.4 }), 0, 0, 0, g);
  rundkiste(0.052, 0.06, 0.042, 0.01, std(0x1a1a1c, { roughness: 0.5 }), 0, -0.06, 0, g);
  for (const x of [-0.013, 0.013]) kiste(0.006, 0.03, 0.006, M.metall, x, 0.094, 0, g);
  return g;
}
// Taser in der Hand (hängt an der Kamera)
const handTaser = baueTaser();
handTaser.position.set(0.17, -0.17, -0.38); handTaser.rotation.set(-1.35, 0.15, 0.1); handTaser.visible = false;
camera.add(handTaser); scene.add(camera);
const blitzGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
const blitzStrahl = new THREE.Line(blitzGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(2.5, 3.5, 8), transparent: true }));
blitzStrahl.frustumCulled = false; blitzStrahl.visible = false; scene.add(blitzStrahl);
const TASER_LADUNG = 3;

function taserNehmen() {
  if (S.taser) { toast('Du hast den Taser schon.', '#ccc'); return; }
  S.taser = true; S.ladung = TASER_LADUNG;
  W.taserWand.visible = false; W.taserLampe.material.color.setRGB(3, 0.2, 0.1);
  handTaser.visible = true;
  Ton.nehmen(); toast('Taser genommen! (3 Schüsse)', '#8fd4ff');
  zeichneTaser();
}
function zeichneTaser() {
  const b = $('bTaser');
  b.classList.toggle('weg', !S.taser);
  $('taserLadung').textContent = S.ladung + '/' + TASER_LADUNG;
  b.classList.toggle('leer', S.ladung <= 0);
}
// Hat der Spieler freie Sicht auf das Ziel? (durch offene Tür oder offenes Fenster)
function freieSicht(a, b) {
  const ai = drinnen(a), bi = drinnen(b);
  if (ai === bi) return ai || siehtDurch(a.x, a.z, b.x, b.z);
  const draussen = ai ? b : a;
  if (W.tuerOffen && draussen.x > 3 && Math.abs(draussen.z - 1.0) < 2.2) return true;
  if (W.rollStand < 0.4 && draussen.z < -2.5 && Math.abs(draussen.x) < 2.6) return true;
  return false;
}
function schocken() {
  if (!['schicht', 'jagd'].includes(S.modus)) return;
  if (!S.taser) { toast('Hol den Taser von der Wand neben der Hintertür!', '#ffd27a'); return; }
  if (S.ladung <= 0) { toast('Der Taser ist leer!', '#ff8a7a'); Ton.fehler(); return; }
  S.ladung--; zeichneTaser();
  Ton.taser();
  // Ziel: das Monster (oder ein Kunde) vor dir
  const vor = new THREE.Vector3(-Math.sin(spieler.yaw), 0, -Math.cos(spieler.yaw));
  const k = J.k || S.kunde;
  let treffer = false;
  const start = new THREE.Vector3(); handTaser.getWorldPosition(start);
  let ende = camera.position.clone().addScaledVector(vor, 3.5);
  if (k && k.f.g.visible) {
    const d = new THREE.Vector3(k.pos.x - spieler.pos.x, 0, k.pos.z - spieler.pos.z);
    const abstand = d.length(), winkel = d.normalize().dot(vor);
    if (abstand < 3.6 && winkel > 0.72 && freieSicht(spieler.pos, k.pos)) {
      treffer = true;
      ende = new THREE.Vector3(k.pos.x, 1.3 * k.f.g.scale.y, k.pos.z);
    }
  }
  W.blitzZeit = 0.45; W.blitzStart = start; W.blitzEnde = ende;
  if (!treffer) { toast('Daneben!', '#ccc'); return; }
  if (S.modus === 'jagd') {
    J.betaeubt = 3.5;
    toast('Geschockt! Schnell weg!', '#8fd4ff');
  } else if (k.monster) {
    k.zustand = 'geschockt'; k.t = 0;
    sag(k, 'AAAARGH!', 1.5, true);
  } else {
    S.geld = Math.max(0, S.geld - 300);
    toast('Das war ein Mensch! −3,00 €', '#ff8a7a'); Ton.fehler();
    kundeGeht(k, 'AUA! Spinnst du?!');
  }
}
function updateTaser(dt) {
  if (W.blitzZeit > 0) {
    W.blitzZeit -= dt;
    const p = blitzGeo.attributes.position.array, a = W.blitzStart, b = W.blitzEnde;
    for (let i = 0; i < 14; i++) {
      const t = i / 13, wackeln = Math.sin(t * Math.PI) * 0.12;
      p[i * 3] = a.x + (b.x - a.x) * t + zufall(-1, 1) * wackeln;
      p[i * 3 + 1] = a.y + (b.y - a.y) * t + zufall(-1, 1) * wackeln;
      p[i * 3 + 2] = a.z + (b.z - a.z) * t + zufall(-1, 1) * wackeln;
    }
    blitzGeo.attributes.position.needsUpdate = true;
    blitzStrahl.visible = Math.random() > 0.2;
    handTaser.position.z = -0.38 + zufall(-0.01, 0.01);
  } else blitzStrahl.visible = false;
}
function tuerUmschalten() {
  if (S.modus !== 'schicht') return;
  W.tuerOffen = !W.tuerOffen;
  Ton.tuer();
  $('tuerText').textContent = W.tuerOffen ? 'ZU' : 'AUF';
  const k = S.kunde;
  // Wer die Tür öffnet, während ein Monster davor steht, sollte schnell sein …
  if (W.tuerOffen && k && k.monster && k.zustand === 'tuerKlopfen') { k.lauern = Math.min(k.lauern, 1.6); sag(k, 'ENDLICH …', 1.5, true); }
}

// ---------- Überwachungskamera ----------
const CAMS = [
  { name: 'VORNE', pos: [0.6, 3.25, -3.2], ziel: [0.2, 0.9, -8.5], fov: 72 },
  { name: 'HINTERTÜR', pos: [3.55, 3.05, -1.4], ziel: [5.2, 0.4, 1.4], fov: 74 },
  { name: 'HALTESTELLE', pos: [-3.45, 3.25, -3.0], ziel: [-10.5, 0.8, -6.4], fov: 68 }
];
const CCTV = { nr: 0, an: true, t: 1, cam: new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 140) };
const CCTV_SHADER = {
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tex; uniform float zeit; uniform float linear; uniform float alarm; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + zeit) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      uv.x += (h(vec2(floor(uv.y * 70.0), floor(zeit * 8.0))) - 0.5) * 0.004;
      vec3 c = texture2D(tex, uv).rgb;
      float L = dot(c, vec3(0.299, 0.587, 0.114));
      float v = 1.0 - exp(-L * 9.0);
      v *= 0.86 + 0.14 * sin(uv.y * 520.0 + zeit * 4.0);
      v += (h(uv * 500.0) - 0.5) * 0.14;
      v *= smoothstep(1.15, 0.35, length(uv - 0.5) * 1.45);
      vec3 col = mix(vec3(0.6, 1.0, 0.66), vec3(1.0, 0.55, 0.5), alarm) * v;
      if (linear > 0.5) col = pow(max(col, 0.0), vec3(2.2));
      gl_FragColor = vec4(col, 1.0);
    }`
};
function baueKamera() {
  CCTV.rt = new THREE.WebGLRenderTarget(HOCH ? 480 : 320, HOCH ? 270 : 180, { type: THREE.HalfFloatType });
  const uni = () => ({ tex: { value: CCTV.rt.texture }, zeit: { value: 0 }, linear: { value: 0 }, alarm: { value: 0 } });
  CCTV.matSchirm = new THREE.ShaderMaterial({ uniforms: uni(), ...CCTV_SHADER, depthTest: false, depthWrite: false });
  CCTV.matMonitor = new THREE.ShaderMaterial({ uniforms: uni(), ...CCTV_SHADER });
  CCTV.matMonitor.uniforms.linear.value = 1;
  CCTV.szene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), CCTV.matSchirm); quad.frustumCulled = false;
  CCTV.szene.add(quad);
  CCTV.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // kleine Kameras außen am Kiosk
  for (const c of CAMS) {
    const g = new THREE.Group(); g.position.set(...c.pos); scene.add(g);
    rundkiste(0.12, 0.1, 0.2, 0.02, std(0xdcdcd8, { roughness: 0.4 }), 0, 0, 0, g);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.1, 0.1) }));
    led.position.set(0.03, 0.04, 0.08); g.add(led);
    g.lookAt(...c.ziel);
  }
  // Monitor auf der Theke
  const m = new THREE.Group(); m.position.set(-1.8, 1.06, -2.3); scene.add(m);
  rundkiste(0.14, 0.02, 0.1, 0.008, M.dunkel, 0, 0.01, 0, m);
  kiste(0.03, 0.12, 0.03, M.dunkel, 0, 0.07, 0, m);
  const gehaeuse = rundkiste(0.48, 0.3, 0.05, 0.015, std(0x1b1d22, { roughness: 0.5 }), 0, 0.27, 0, m);
  gehaeuse.rotation.x = -0.12;
  const bild = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.242), CCTV.matMonitor);
  bild.position.set(0, 0.272, 0.027); bild.rotation.x = -0.12; m.add(bild);
  m.rotation.y = 0.25;
}
function updateKamera(dt) {
  if (!['schicht', 'kasse', 'jagd', 'schreck'].includes(S.modus)) return;
  const k = S.kunde || J.k;
  const alarm = k && k.monster && ['lauern', 'schleichen', 'tuerKlopfen', 'jagt'].includes(k.zustand) ? 1 : 0;
  const zeit = performance.now() / 1000;
  for (const m of [CCTV.matSchirm, CCTV.matMonitor]) { m.uniforms.zeit.value = zeit % 100; m.uniforms.alarm.value = alarm * (0.5 + 0.5 * Math.sin(zeit * 8)) * 0.6; }
  $('kamera').classList.toggle('alarm', !!alarm);
  $('kamZeit').textContent = uhrText(S.zeit);
  CCTV.t += dt;
  if (CCTV.t < (HOCH ? 0.07 : 0.16)) return;
  CCTV.t = 0;
  const c = CAMS[CCTV.nr];
  CCTV.cam.fov = c.fov; CCTV.cam.updateProjectionMatrix();
  CCTV.cam.position.set(...c.pos); CCTV.cam.lookAt(...c.ziel);
  const vorher = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;     // Schatten vom Hauptbild wiederverwenden
  renderer.setRenderTarget(CCTV.rt);
  renderer.render(scene, CCTV.cam);
  renderer.setRenderTarget(null);
  renderer.shadowMap.autoUpdate = vorher;
}
function zeichneKameraBild() {
  if (!CCTV.an || !['schicht', 'kasse', 'jagd'].includes(S.modus)) return;
  const r = $('kamera').getBoundingClientRect();
  if (!r.width) return;
  const x = r.left + 2, y = innerHeight - r.bottom + 2, w = r.width - 4, h = r.height - 4;
  renderer.autoClear = false;
  renderer.setScissorTest(true);
  renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
  renderer.render(CCTV.szene, CCTV.ortho);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, innerWidth, innerHeight);
  renderer.autoClear = true;
}
function kameraWechseln() {
  CCTV.nr = (CCTV.nr + 1) % CAMS.length;
  $('kamName').textContent = `CAM ${CCTV.nr + 1} · ${CAMS[CCTV.nr].name}`;
  CCTV.t = 1;
  Ton.klick();
}
document.querySelector('#bRollladen .rl-ik').innerHTML = IKONEN.rollladen;
document.querySelector('#bTaser .blitz').innerHTML = IKONEN.blitz;
$('bTaser').addEventListener('pointerdown', e => { e.stopPropagation(); Ton.start(); schocken(); });
$('bTuer').addEventListener('pointerdown', e => { e.stopPropagation(); Ton.start(); tuerUmschalten(); });
$('kamera').addEventListener('pointerdown', e => { e.stopPropagation(); kameraWechseln(); });
$('bKamera').addEventListener('pointerdown', e => {
  e.stopPropagation();
  CCTV.an = !CCTV.an;
  $('kamera').classList.toggle('weg2', !CCTV.an);
  Ton.klick();
});

// ======================================================================
//  Figuren (Kunden und Monster)
// ======================================================================
function baueFigur(monster, zeichen) {
  const f = Fig.baueFigur(monster, zeichen);
  scene.add(f.g);
  return f;
}
const verwandeln = Fig.verwandeln;
const entferneFigur = Fig.entferneFigur;

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
    b.innerHTML = `${ikone(id)}${WARE[id].name}<small>✕</small>`;
    b.title = 'Zurücklegen';
    b.addEventListener('pointerdown', e => { e.stopPropagation(); S.tragen.splice(i, 1); Ton.ablegen(); zeichneTragen(); });
    hud.tragen.appendChild(b);
  });
}
function zeichneInfos() {
  hud.uhr.textContent = uhrText(S.zeit);
  hud.nacht.textContent = 'Nacht ' + (S.nacht + 1);
  hud.geld.textContent = euro(S.geld);
  const herzHtml = ikone('herz').repeat(Math.max(0, S.herzen)) + ikone('herzLeer').repeat(Math.max(0, 3 - S.herzen));
  if (hud.herzen.dataset.h !== herzHtml) { hud.herzen.innerHTML = herzHtml; hud.herzen.dataset.h = herzHtml; }
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
    angriff: monster && Math.random() < [0, 0.35, 0.5][S.nacht] ? 'hinten' : 'fenster',
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
  k.zuckZ = k.zuckZ || 0;
  if (k.monster && k.zeichen.has('zucken')) {
    k.zuckT -= dt;
    if (k.zuckT < 0) { k.zuckT = zufall(0.8, 2.2); k.zuckZ = zufall(-0.7, 0.7); k.f.kopf.rotation.y = zufall(-0.9, 0.9); }
    else if (k.zuckT < 0.5) k.zuckZ *= 0.85;
  }
  // leuchtende Augen pulsieren
  if (k.monster && k.zeichen.has('augen')) k.f.augen.forEach(a => a.scale.setScalar(1.1 + Math.sin(k.t * 6) * 0.3));

  // Monster: Rollladen zu → abgewehrt
  if (k.monster && zu && k.angriff === 'fenster' && ['aussteigen', 'laufen', 'lauern'].includes(k.zustand)) {
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
    case 'lauern': {
      k.lauern -= dt;
      // je näher der Angriff, desto wilder flippt es aus
      const wut = clamp(1 - k.lauern / N.lauern, 0, 1);
      if (wut > 0.45) {
        const w = (wut - 0.45) / 0.55;
        k.f.g.position.set(k.pos.x + zufall(-1, 1) * 0.03 * w, 0, k.pos.z + zufall(-1, 1) * 0.02 * w);
        k.f.g.rotation.y = zufall(-1, 1) * 0.12 * w;
        k.zuckZ = Math.sin(k.t * 23) * 0.5 * w;
        k.f.armL.rotation.x = -1.2 - Math.sin(k.t * 15) * 0.6 * w; k.f.armR.rotation.x = -1.2 - Math.cos(k.t * 13) * 0.6 * w;
        k.f.augen.forEach(a => a.scale.setScalar(1 + w * 0.6));
      }
      if (k.angriff === 'hinten' && k.t > 2.5) {
        k.zustand = 'schleichen'; k.t = 0; k.sagtT = 0;
        k.pfad = [new THREE.Vector3(3.95, 0, -3.5), new THREE.Vector3(4.1, 0, -0.6), new THREE.Vector3(4.05, 0, 1.0)];
      } else if (k.lauern <= 0) starteJagd(k, 'fenster');
      break;
    }
    case 'schleichen':
      if (gehePfad(k, dt, 2.1)) { k.zustand = 'tuerKlopfen'; k.t = 0; k.klopfen = 0; k.lauern = N.lauern * 2.2; k.f.g.rotation.y = -Math.PI / 2; }
      break;
    case 'tuerKlopfen':
      k.lauern -= dt; k.klopfen -= dt;
      k.f.armL.rotation.x = k.f.armR.rotation.x = -1.4 - Math.max(0, Math.sin(k.t * 9)) * 0.6;
      if (k.klopfen <= 0) { k.klopfen = zufall(0.45, 0.8); Ton.schlag(); W.tuerZittern = 0.12; }
      if (k.lauern <= 0) starteJagd(k, 'tuer');
      break;
    case 'geschockt':
      // zappelt unter Strom und löst sich dann auf
      k.f.g.position.set(k.pos.x + zufall(-0.04, 0.04), zufall(0, 0.04), k.pos.z + zufall(-0.04, 0.04));
      k.f.armL.rotation.x = zufall(-2.5, 0); k.f.armR.rotation.x = zufall(-2.5, 0); k.zuckZ = zufall(-0.8, 0.8);
      k.f.g.visible = k.t < 1.2 || Math.floor(k.t * 16) % 2 === 0;
      if (k.t > 1.9) {
        Ton.verschwinden(); Ton.gut();
        S.stat.monster++; S.geld += 700;
        toast('Monster weggeschockt! +7,00 €', '#8fd4ff');
        entferneFigur(k.f); S.kunde = null; S.naechsterIn = zufall(...N.pause); raeumeTheke();
        return;
      }
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
      if (gehePfad(k, dt, 1.6)) { entferneFigur(k.f); S.kunde = null; S.naechsterIn = zufall(...N.pause); return; }
      break;
  }
  // Haltung und Blick: Wer wartet, steht ruhig, atmet, blinzelt und schaut dich an
  if (['bestellen', 'zahlen', 'klopfen', 'abgewehrt'].includes(k.zustand)) {
    Fig.ruhe(k.f, k.t);
    Fig.blicken(k.f, dt, camera.position, k.zuckZ);
  } else if (['lauern', 'tuerKlopfen'].includes(k.zustand)) {
    Fig.blicken(k.f, dt, camera.position, k.zuckZ);
  } else if (k.zustand !== 'jagt') {
    Fig.blicken(k.f, dt, null, k.zuckZ);
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
  k.gang += dt * tempo * 5.2;
  Fig.gehen(k.f, k.gang, clamp(tempo / 1.5, 0.3, 1.2), gleitet);
  k.f.g.position.set(k.pos.x, gleitet ? 0.05 : Math.abs(Math.cos(k.gang)) * 0.025, k.pos.z);
  if (k.pfad.length === 0) { Fig.ruhe(k.f, k.t); return true; }
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
    const waren = k.bestellung.map(id => `<span class="ware ${S.theke.some(t => t.id === id) ? 'ok' : ''}">${ikone(id)}${WARE[id].name}</span>`).join('');
    html = `Ich hätte gern:<div class="waren">${waren}</div>${geduldBalken(anteil)}`;
  } else if (k.zustand === 'lauern') {
    html = `Ich will …<div class="seltsam">${k.wunsch}</div>${geduldBalken(k.lauern / N.lauern)}`;
  } else if (k.zustand === 'zahlen') {
    html = `Macht ${euro(k.summe)}?<br>Hier, bitte: <b class="geldschein">${ikone('schein')}${euro(k.zahlt)}</b>${geduldBalken(k.geduld / k.geduldMax)}`;
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
  toast(WARE[id].name, '#fff');
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
  $('kListe').innerHTML = k.bestellung.map(id => `<div><span>${ikone(id)} ${WARE[id].name}</span><span>${euro(WARE[id].preis)}</span></div>`).join('');
  $('kSumme').textContent = euro(k.summe);
  $('kGegeben').textContent = euro(k.zahlt);
  $('kRueck').textContent = euro(0);
  W.zeigeKasse(euro(k.summe).replace(' €', ''));
  $('kasse').classList.remove('weg');
  S.modus = 'kasse';
  Ton.kasse();
}
function kasseZu() {
  W.zeigeKasse('0,00');
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
  W.zeigeKasse(euro(rueck).replace(' €', ''));
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
  $('rlText').textContent = W.rollZiel ? 'HOCH' : 'RUNTER';
  $('bRollladen').classList.toggle('zu', !!W.rollZiel);
}
$('bRollladen').addEventListener('pointerdown', e => { e.stopPropagation(); Ton.start(); rollladen(); });

// ======================================================================
//  Jagd
// ======================================================================
const J = { phase: '', t: 0, k: null, start: new THREE.Vector3() };
const TUER_INNEN = new THREE.Vector3(2.4, 0, 1.0), TUER_AUSSEN = new THREE.Vector3(3.95, 0, 1.0);
const ECKEN = [new THREE.Vector3(-3.95, 0, -3.45), new THREE.Vector3(3.95, 0, -3.45), new THREE.Vector3(3.95, 0, 3.45), new THREE.Vector3(-3.95, 0, 3.45)];

function starteJagd(k, ort = 'fenster') {
  if (S.modus === 'kasse') kasseZu();
  S.modus = 'jagd';
  J.phase = 'klettern'; J.t = 0; J.k = k; J.ort = ort;
  W.fensterFrei = ort === 'tuer';
  if (ort === 'tuer') { k.pos.set(4.05, 0, 1.0); Ton.schlag(); }
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
  ziel(ort === 'tuer' ? 'Es kommt durch die Hintertür! LAUF – über die Theke aus dem Fenster!' : 'LAUF! Hinten rechts raus zum Bus!', true);
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
  if (J.betaeubt > 0) {
    J.betaeubt -= dt;
    k.f.g.position.set(k.pos.x + zufall(-0.04, 0.04), zufall(0, 0.05), k.pos.z + zufall(-0.04, 0.04));
    k.f.armL.rotation.x = zufall(-2.5, 0); k.f.armR.rotation.x = zufall(-2.5, 0);
    k.f.kopf.rotation.z = zufall(-0.6, 0.6);
    W.monsterLicht.intensity = Math.random() * 6;
    const zb = Math.hypot(spieler.pos.x - BUS_TUER.x, spieler.pos.z - BUS_TUER.z);
    ziel('Es ist betäubt – LAUF zum Bus!', true);
    if (zb < 1.7) entkommen();
    return;
  }
  W.notlicht.intensity = 7 + Math.sin(J.t * 9) * 3;
  W.monsterLicht.position.set(k.pos.x, 1.9, k.pos.z + 0.3);
  W.monsterLicht.intensity = 6 + Math.sin(J.t * 14) * 2;
  if (J.phase === 'klettern' && J.ort === 'tuer') {
    // stürmt durch die Hintertür herein
    const a = clamp(J.t / 1.0, 0, 1);
    k.pos.set(4.05 - a * 1.6, 0, 1.0);
    k.f.g.position.set(k.pos.x, 0, k.pos.z);
    k.f.g.rotation.y = -Math.PI / 2;
    k.f.armL.rotation.x = k.f.armR.rotation.x = -1.8;
    if (a >= 1) { J.phase = 'bruellen'; J.t0 = J.t; Ton.schrei(); }
  } else if (J.phase === 'klettern') {
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
    k.gang += dt * 15;
    Fig.gehen(k.f, k.gang, 1.35);
    k.f.armL.rotation.x = -1.3 + Math.sin(k.gang) * 0.5; k.f.armR.rotation.x = -1.3 - Math.sin(k.gang) * 0.5;
    k.f.g.position.set(k.pos.x, Math.abs(Math.cos(k.gang)) * 0.07, k.pos.z);
    k.f.kopf.rotation.z = Math.sin(J.t * 23) * 0.15;
    k.f.kiefer.rotation.x = 0.55 + Math.sin(J.t * 18) * 0.25;
    const abstand = Math.hypot(k.pos.x - spieler.pos.x, k.pos.z - spieler.pos.z);
    $('rot').style.opacity = clamp(1.1 - abstand / 8, 0.25, 0.95);
    if (abstand < 0.85) { erwischt(); return; }
  }
  const zumBus = Math.hypot(spieler.pos.x - BUS_TUER.x, spieler.pos.z - BUS_TUER.z);
  ziel(zumBus < 6 ? 'Rein in den Bus!' : drinnen(spieler.pos) ? (J.ort === 'tuer' ? 'LAUF! Über die Theke durchs Fenster!' : 'LAUF! Hinten rechts raus (grünes Schild)!') : 'LAUF zum Bus vorne links!', true);
  if (zumBus < 1.7) entkommen();
}

function jagdEnde() {
  Ton.jagd(false);
  W.monsterLicht.intensity = 0;
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
  k.f.g.position.set(kx, camera.position.y - 1.74 * k.f.g.scale.y, kz);
  k.f.kiefer.rotation.x = 0.9 + Math.sin(J.t * 35) * 0.15;
  W.monsterLicht.position.set(kx, camera.position.y, kz); W.monsterLicht.intensity = 10;
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
  W.tuerOffen = false; W.fensterFrei = false; J.betaeubt = 0;
  if ($('tuerText')) $('tuerText').textContent = 'AUF';
  W.licht.intensity = 34; M.roehre.emissiveIntensity = 2.2;
  W.notlicht.intensity = 0;
  W.rollZiel = 0; W.rollStand = 0;
  $('rlText').textContent = 'RUNTER'; $('bRollladen').classList.remove('zu');
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
  if (e.code === 'KeyC') kameraWechseln();
  if (e.code === 'KeyF') schocken();
  if (e.code === 'KeyT') tuerUmschalten();
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
  else if (d.typ === 'taser') taserNehmen();
  else if (d.typ === 'tuer') tuerUmschalten();
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
  if (k && k.zustand === 'schleichen') ziel('Es geht ums Haus herum! Schau auf die Kamera!', true);
  else if (k && k.zustand === 'tuerKlopfen') ziel(S.taser ? 'Es steht vor der Hintertür! Tür auf und SCHOCKEN!' : 'Es hämmert an der Hintertür! Hol den Taser (Wand neben der Tür)!', true);
  else if (W.rollZiel && (!k || !k.monster)) ziel('Der Rollladen ist unten. Mach ihn wieder auf!', true);
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
  const t = performance.now() / 1000;
  updateRegen(dt);
  // Blitz und Donner ab und zu
  W.blitzIn = (W.blitzIn ?? zufall(20, 40)) - dt;
  if (W.blitzIn < 0 && ['titel', 'schicht', 'kasse'].includes(S.modus)) {
    W.blitzIn = zufall(25, 55); W.blitz = 1; W.blitzZweiter = Math.random() < 0.6 ? 0.18 : -1;
    setTimeout(() => Ton.donner(), zufall(500, 2200));
  }
  if (W.blitz > 0 || W.blitzZweiter > 0) {
    if (W.blitzZweiter > 0) { W.blitzZweiter -= dt; if (W.blitzZweiter <= 0) W.blitz = 0.8; }
    W.blitz = Math.max(0, W.blitz - dt * 5);
    W.himmelLicht.intensity = 0.5 + W.blitz * 6;
    scene.background.setRGB(0.012 + W.blitz * 0.25, 0.02 + W.blitz * 0.27, 0.04 + W.blitz * 0.35);
  }
  W.regenMat.uniforms.blitz.value = W.blitz || 0;
  // Staub im Licht
  {
    const p = W.staub.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      p[i] += Math.sin(t * 0.3 + i) * 0.02 * dt; p[i + 1] += Math.sin(t * 0.2 + i * 0.7) * 0.015 * dt - 0.004 * dt; p[i + 2] += Math.cos(t * 0.25 + i) * 0.02 * dt;
      if (p[i + 1] < 0.2) p[i + 1] = 2.8;
    }
    W.staub.geometry.attributes.position.needsUpdate = true;
  }
  W.luefterFlug.rotation.x += dt * 9;
  W.kamLed.visible = Math.floor(t * 1.2) % 2 === 0;
  W.pfuetzen.normalMap.offset.set((t * 0.02) % 1, (t * 0.013) % 1);
  // Leuchtschild: ab und zu ein kurzes Flackern
  W.schildMat.color.setScalar(Math.sin(t * 17) + Math.sin(t * 5.3) > 1.8 ? 0.35 : 1);
  // Rollladen
  W.rollStand += clamp(W.rollZiel - W.rollStand, -dt * 2.6, dt * 2.6);
  const h = Math.max(0.02, W.rollStand * 1.32);
  W.rollladen.scale.y = h; W.rollladen.position.y = 2.32 - h / 2;
  W.schalterKnopf.material.emissive.setHex(W.rollZiel ? 0x00a000 : 0x600000);
  // Tür
  W.tuerWinkel += ((W.tuerOffen ? Math.PI * 0.55 : 0) - W.tuerWinkel) * Math.min(1, dt * 5);
  W.tuerZittern = Math.max(0, (W.tuerZittern || 0) - dt * 0.5);
  W.tuer.rotation.y = W.tuerWinkel + (W.tuerZittern ? zufall(-1, 1) * W.tuerZittern : 0);
  // Flackern der Röhre
  if (S.flackern > 0 && S.modus !== 'jagd') {
    S.flackern -= dt;
    const an = Math.random() > 0.45 || S.flackern <= 0;
    W.licht.intensity = an ? 34 : 3; M.roehre.emissiveIntensity = an ? 2.2 : 0.1;
  }
  W.zeichneUhr(S.zeit);
  const kw = S.kunde;
  $('bRollladen').classList.toggle('warnen', !!(kw && kw.monster && kw.angriff === 'fenster' && kw.zustand === 'lauern' && !W.rollZiel)
    || !!(kw && kw.zustand === 'tuerKlopfen' && W.rollZiel));
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
    b.textContent = 'Nacht ' + (i + 1) + (i < frei ? '' : ' (gesperrt)');
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
  S.taser = false; S.ladung = 0; handTaser.visible = false;
  W.taserWand.visible = true; W.taserLampe.material.color.setRGB(0.2, 3, 0.4); zeichneTaser();
  kioskZuruecksetzen();
  ['titel', 'ende', 'intro', 'pause'].forEach(id => $(id).classList.add('weg'));
  $('hud').classList.remove('weg');
  $('touch').classList.toggle('weg', !isTouch);
  document.body.classList.toggle('touch', isTouch);
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
  camera.position.set(-1 + Math.sin(t * 0.1) * 1.8, 1.9 + Math.sin(t * 0.3) * 0.1, -14.5);
  camera.lookAt(0.2 + Math.sin(t * 0.07) * 0.5, 2.0, -2.5);
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

const grafikKnopf = $('grafik');
{
  let hoch = true; try { hoch = localStorage.getItem('derletztebus.grafik') !== 'niedrig'; } catch (e) { /* egal */ }
  grafikKnopf.textContent = 'Grafik: ' + (hoch ? 'Hoch (Schatten, Spiegelungen)' : 'Niedrig (schneller)');
  grafikKnopf.addEventListener('click', () => {
    try { localStorage.setItem('derletztebus.grafik', hoch ? 'niedrig' : 'hoch'); } catch (e) { /* egal */ }
    location.reload();
  });
}

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
const DT_MAX = location.search.includes('test') ? 0.35 : 0.05;   // ?test: für Browser ohne Grafikkarte
// Wenn das Gerät zu langsam ist, schaltet das Spiel von selbst auf einfachere Grafik
let leistung = { zeit: 0, bilder: 0 };
function pruefeLeistung(roh) {
  if (!post || location.search.includes('test') || !['schicht', 'kasse', 'jagd'].includes(S.modus)) return;
  leistung.zeit += roh; leistung.bilder++;
  if (leistung.zeit < 5) return;
  const fps = leistung.bilder / leistung.zeit;
  leistung = { zeit: 0, bilder: 0 };
  if (fps < 22) {
    try { localStorage.setItem('derletztebus.grafik', 'niedrig'); } catch (e) { /* egal */ }
    post.composer.dispose(); post = null;
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight);
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
    $('vignette').style.display = '';
    toast('Grafik vereinfacht, damit es flüssig läuft', '#ffd27a');
  }
}

function zeichne(dt) {
  if (post) {
    const u = post.film.uniforms;
    u.zeit.value = (performance.now() / 1000) % 100;
    const schock = S.modus === 'schreck' ? 1 : S.modus === 'jagd' ? 0.35 : 0;
    u.schock.value += (schock - u.schock.value) * Math.min(1, dt * 6);
    post.composer.render(dt);
  } else renderer.render(scene, camera);
}

function schleife(jetzt) {
  requestAnimationFrame(schleife);
  const roh = (jetzt - zuletzt) / 1000;
  const dt = Math.min(DT_MAX, roh);
  zuletzt = jetzt;
  pruefeLeistung(roh);
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
  zeichne(dt);
  updateKamera(dt);
  updateTaser(dt);
  zeichneKameraBild();
}
requestAnimationFrame(schleife);

// Für automatische Tests
window.__kiosk = { S, W, spieler, J, nimmWare, legeAufTheke, kasseAuf, rollladen, rueckgeldGeben, starteNacht, starteJagd, kameraAufSpieler, setzeRueck: v => { rueck = v; } };
