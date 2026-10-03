// Menschen und Monster für den Nachtkiosk: Gesicht mit Augen, Nase, Ohren, Brauen,
// Haare, Kleidung, Hände mit Fingern, Gelenke an Knie und Ellbogen.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ENV, T } from './grafik.js';

const wuerfel = a => a[Math.floor(Math.random() * a.length)];
const zufall = (a, b) => a + Math.random() * (b - a);
const klemme = (v, a, b) => Math.max(a, Math.min(b, v));

const MANTEL = [0x2d4a7a, 0x7a2d2d, 0x2f6a3f, 0x6b5a3a, 0x444a55, 0x8a6a2a, 0x5a3a6a, 0x2a6a6a, 0x1f2430, 0x8c8c86];
const HAUT = [0xf1c9a5, 0xe0b08c, 0xc98f68, 0x9a6a48, 0x6e4630, 0xf4d4b8];
const HAAR = [0x2a1d14, 0x4a2e18, 0xb08a4a, 0x111111, 0x8a8a88, 0x8a2a1a, 0x5a3a1c];

let irisTextur = null;
function iris(farbe) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  gr.addColorStop(0, '#000'); gr.addColorStop(0.28, '#000'); gr.addColorStop(0.3, farbe); gr.addColorStop(0.75, farbe); gr.addColorStop(1, '#1a1008');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20); g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const IRIS_FARBEN = ['#5b3a1c', '#2f5d86', '#3f6f3a', '#6a5a3a', '#2a2a2a'];

function hautMaterial(farbe) {
  return new THREE.MeshPhysicalMaterial({
    color: farbe, roughness: 0.58, sheen: 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffc8b0),
    normalMap: T.haut, normalScale: new THREE.Vector2(0.3, 0.3), envMap: ENV, envMapIntensity: 0.35
  });
}
function stoffMaterial(farbe, rauh = 0.92) {
  return new THREE.MeshStandardMaterial({
    color: farbe, roughness: rauh, normalMap: T.stoff, normalScale: new THREE.Vector2(0.7, 0.7), envMap: ENV, envMapIntensity: 0.18
  });
}

function mesh(geo, mat, eltern, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (eltern) eltern.add(m);
  return m;
}
function zylinder(rOben, rUnten, laenge, mat, eltern, y = 0) {
  const geo = new THREE.CylinderGeometry(rOben, rUnten, laenge, 18, 1);
  geo.translate(0, -laenge / 2, 0);
  return mesh(geo, mat, eltern, 0, y, 0);
}
const kugel = (r, mat, eltern, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const m = mesh(new THREE.SphereGeometry(r, 24, 16), mat, eltern, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
};

function hand(haut, eltern, seite) {
  const h = new THREE.Group(); eltern.add(h);
  const handflaeche = mesh(new RoundedBoxGeometry(0.078, 0.095, 0.026, 3, 0.011), haut, h, 0, -0.045, 0);
  const finger = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group(); f.position.set(-0.029 + i * 0.0195, -0.092, 0); h.add(f);
    const laenge = [0.062, 0.07, 0.066, 0.052][i];
    const unten = zylinder(0.0098, 0.0088, laenge * 0.55, haut, f);
    const gelenk = new THREE.Group(); gelenk.position.y = -laenge * 0.55; f.add(gelenk);
    const oben = zylinder(0.0088, 0.0072, laenge * 0.5, haut, gelenk);
    kugel(0.0072, haut, gelenk, 0, -laenge * 0.5, 0);
    f.rotation.x = -0.28 - i * 0.03; gelenk.rotation.x = -0.45;
    finger.push({ f, gelenk, unten, oben });
  }
  const daumen = new THREE.Group(); daumen.position.set(seite * 0.042, -0.04, 0.004); h.add(daumen);
  zylinder(0.0105, 0.009, 0.045, haut, daumen);
  daumen.rotation.set(-0.2, 0, seite * 0.7);
  return { h, handflaeche, finger, daumen };
}

/** Baut einen Menschen. monster = true: trägt versteckte Merkmale (zeichen). */
export function baueFigur(monster, zeichen) {
  const g = new THREE.Group();
  const hautFarbe = wuerfel(HAUT);
  const mantelFarbe = wuerfel(MANTEL);
  const haut = hautMaterial(hautFarbe);
  const mantel = stoffMaterial(mantelFarbe);
  const hose = stoffMaterial(wuerfel([0x23262e, 0x2a2f3a, 0x3a3228, 0x1a1a1c]), 0.88);
  const schuhMat = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.35, envMap: ENV, envMapIntensity: 0.6 });
  const haarFarbe = wuerfel(HAAR);
  const haarMat = new THREE.MeshStandardMaterial({ color: haarFarbe, roughness: 0.5, envMap: ENV, envMapIntensity: 0.4 });
  const lippenMat = new THREE.MeshStandardMaterial({ color: 0xa85a58, roughness: 0.45 });

  // ----- Beine -----
  const beine = [], knie = [];
  for (const s of [-1, 1]) {
    const bein = new THREE.Group(); bein.position.set(s * 0.095, 0.93, 0); g.add(bein);
    zylinder(0.088, 0.064, 0.44, hose, bein);
    kugel(0.064, hose, bein, 0, -0.44, 0);
    const k = new THREE.Group(); k.position.y = -0.44; bein.add(k);
    zylinder(0.062, 0.044, 0.42, hose, k);
    const fuss = new THREE.Group(); fuss.position.y = -0.43; k.add(fuss);
    mesh(new RoundedBoxGeometry(0.1, 0.075, 0.27, 3, 0.03), schuhMat, fuss, 0, -0.025, 0.06);
    beine.push(bein); knie.push(k);
  }

  // ----- Rumpf -----
  const rumpf = new THREE.Group(); rumpf.position.y = 0.93; g.add(rumpf);
  const profil = [[0.001, 0], [0.185, 0], [0.19, 0.12], [0.175, 0.28], [0.185, 0.42], [0.205, 0.52], [0.185, 0.6], [0.1, 0.645], [0.001, 0.655]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const jacke = mesh(new THREE.LatheGeometry(profil, 28), mantel, rumpf);
  jacke.scale.set(1, 1, 0.62);
  const lang = Math.random() < 0.45;
  if (lang) {
    const rock = mesh(new THREE.LatheGeometry([[0.001, -0.32], [0.24, -0.32], [0.215, -0.15], [0.188, 0.02], [0.001, 0.02]].map(([r, y]) => new THREE.Vector2(r, y)), 28), mantel, rumpf);
    rock.scale.set(1, 1, 0.7);
  }
  mesh(new THREE.TorusGeometry(0.1, 0.03, 10, 24), mantel, rumpf, 0, 0.635, 0).rotation.x = Math.PI / 2 - 0.2;
  const gurt = mesh(new THREE.TorusGeometry(0.188, 0.012, 8, 28), stoffMaterial(0x15120e, 0.6), rumpf, 0, 0.1, 0);
  gurt.rotation.x = Math.PI / 2; gurt.scale.set(1, 0.62, 1);
  for (let i = 0; i < 4; i++) kugel(0.011, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 }), rumpf, 0, 0.18 + i * 0.12, 0.123);
  const hals = zylinder(0.05, 0.054, 0.12, haut, rumpf, 0.7);

  // ----- Kopf -----
  const kopf = new THREE.Group(); kopf.position.set(0, 0.8, 0.005); rumpf.add(kopf);
  kugel(0.105, haut, kopf, 0, 0, 0, 0.92, 1.14, 1.02);
  kugel(0.078, haut, kopf, 0, -0.068, 0.025, 1, 0.9, 0.92);                     // Kinn
  kugel(0.018, haut, kopf, 0, -0.012, 0.108, 0.85, 1.25, 1.35);                 // Nase
  kugel(0.011, haut, kopf, -0.012, -0.03, 0.105, 0.9, 0.7, 0.9);
  kugel(0.011, haut, kopf, 0.012, -0.03, 0.105, 0.9, 0.7, 0.9);
  for (const s of [-1, 1]) {
    const ohr = kugel(0.026, haut, kopf, s * 0.097, -0.005, -0.004, 0.45, 1, 0.75);
    ohr.rotation.z = s * 0.15;
    const braue = mesh(new RoundedBoxGeometry(0.046, 0.009, 0.014, 2, 0.004), haarMat, kopf, s * 0.04, 0.047, 0.098);
    braue.rotation.z = -s * 0.12;
    kugel(0.028, haut, kopf, s * 0.04, 0.02, 0.09, 1.05, 0.7, 0.6);              // Augenhöhle
  }
  // Augen
  const augenGruppe = new THREE.Group(); kopf.add(augenGruppe);
  const augen = [], augenWeiss = [];
  irisTextur = iris(wuerfel(IRIS_FARBEN));
  const leuchten = monster && zeichen && zeichen.has('augen');
  const weissMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.25, envMap: ENV, envMapIntensity: 0.5 });
  const hornhaut = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.02, envMap: ENV, envMapIntensity: 2.2 });
  for (const s of [-1, 1]) {
    const aug = new THREE.Group(); aug.position.set(s * 0.039, 0.02, 0.09); augenGruppe.add(aug);
    const ball = kugel(0.0185, weissMat, aug); augenWeiss.push(ball);
    const ir = new THREE.Mesh(new THREE.CircleGeometry(0.0115, 24), leuchten
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.25, 0.1) })
      : new THREE.MeshStandardMaterial({ map: irisTextur, roughness: 0.3 }));
    ir.position.z = 0.0176; aug.add(ir); augen.push(ir);
    kugel(0.0196, hornhaut, aug);
  }
  // Mund (menschlich)
  const lippen = new THREE.Group(); kopf.add(lippen);
  kugel(0.021, lippenMat, lippen, 0, -0.058, 0.098, 1.7, 0.36, 0.55);
  kugel(0.02, lippenMat, lippen, 0, -0.068, 0.097, 1.5, 0.4, 0.55);
  // Maul (Monster): dunkler Rachen, Zähne, Kiefer
  const maul = new THREE.Group(); maul.position.set(0, -0.065, 0.085); maul.visible = false; kopf.add(maul);
  const rachen = kugel(0.04, new THREE.MeshBasicMaterial({ color: 0x180000 }), maul, 0, -0.01, 0.005, 1.15, 0.8, 0.6);
  const kiefer = new THREE.Group(); maul.add(kiefer);
  const zahnMat = new THREE.MeshStandardMaterial({ color: 0xe8e2cc, roughness: 0.4 });
  for (let i = -4; i <= 4; i++) {
    const oben = mesh(new THREE.ConeGeometry(0.0055, 0.026, 6), zahnMat, maul, i * 0.0092, 0.008, 0.02 - Math.abs(i) * 0.0014);
    oben.rotation.x = Math.PI;
    const unten = mesh(new THREE.ConeGeometry(0.005, 0.022, 6), zahnMat, kiefer, i * 0.0092, -0.012, 0.02 - Math.abs(i) * 0.0014);
  }
  // Haare / Mütze
  const stil = Math.floor(Math.random() * 4);
  const haare = new THREE.Group(); kopf.add(haare);
  if (stil === 0 || stil === 1) {
    const kappe = mesh(new THREE.SphereGeometry(0.112, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), haarMat, haare, 0, 0.004, -0.008);
    kappe.scale.set(0.93, 1.16, 1.06); kappe.rotation.x = -0.22;
    if (stil === 1) {
      const hinten = kugel(0.1, haarMat, haare, 0, -0.12, -0.07, 1, 2.1, 0.5);
      hinten.rotation.x = 0.1;
    } else {
      for (let i = -3; i <= 3; i++) kugel(0.02, haarMat, haare, i * 0.03, 0.07, 0.095 - Math.abs(i) * 0.012, 1, 0.8, 0.7);
    }
  } else if (stil === 2) {
    const farbe = wuerfel(MANTEL);
    const m = stoffMaterial(farbe, 0.95);
    const muetze = mesh(new THREE.SphereGeometry(0.122, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), m, haare, 0, 0.02, -0.005);
    muetze.scale.set(0.95, 1.12, 1.08);
    mesh(new THREE.TorusGeometry(0.108, 0.018, 10, 28), m, haare, 0, 0.045, 0).rotation.x = Math.PI / 2 - 0.1;
  } else {
    const kappe = mesh(new THREE.CylinderGeometry(0.108, 0.112, 0.07, 24), stoffMaterial(wuerfel(MANTEL), 0.8), haare, 0, 0.082, -0.005);
    kappe.scale.z = 1.05;
    const schirm = mesh(new RoundedBoxGeometry(0.17, 0.012, 0.11, 2, 0.005), kappe.material, haare, 0, 0.06, 0.1);
    schirm.rotation.x = 0.15;
    kugel(0.1, haarMat, haare, 0, -0.01, -0.075, 1, 1.1, 0.5);
  }
  if (Math.random() < 0.22) kugel(0.062, haarMat, kopf, 0, -0.1, 0.03, 1.1, 0.7, 0.85);   // Bart

  // ----- Arme -----
  const arme = [], ellbogen = [], haende = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.225, 0.6, 0); rumpf.add(arm);
    kugel(0.066, mantel, arm);
    zylinder(0.056, 0.048, 0.29, mantel, arm);
    const e = new THREE.Group(); e.position.y = -0.29; arm.add(e);
    kugel(0.049, mantel, e);
    zylinder(0.046, 0.039, 0.26, mantel, e);
    mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.025, 16), stoffMaterial(0x1c1c20, 0.7), e, 0, -0.255, 0);
    const hg = new THREE.Group(); hg.position.y = -0.27; e.add(hg);
    const h = hand(haut, hg, s);
    arm.rotation.z = s * 0.07; e.rotation.x = -0.16;
    arme.push(arm); ellbogen.push(e); haende.push(h);
  }

  // Größe
  const gross = monster && zeichen && zeichen.has('gross');
  const breite = gross ? 0.86 : zufall(0.95, 1.08);
  g.scale.set(breite, gross ? 1.22 : zufall(0.94, 1.05), breite);

  // kein Schatten, wenn das Merkmal es verlangt
  const wirftSchatten = !(monster && zeichen && zeichen.has('schatten'));
  g.traverse(o => { if (o.isMesh) { o.castShadow = wirftSchatten; o.receiveShadow = true; } });

  return {
    g, kopf, rumpf, hals, augen, augenGruppe, maul, rachen, kiefer, lippen,
    beinL: beine[0], beinR: beine[1], knieL: knie[0], knieR: knie[1],
    armL: arme[0], armR: arme[1], ellL: ellbogen[0], ellR: ellbogen[1], haende,
    mantelMat: mantel, hautMat: haut, wirftSchatten, blinzeln: zufall(2, 5), t: 0, monsterForm: false
  };
}

/** Verwandelt einen Kunden in das Monster. */
export function verwandeln(f) {
  f.monsterForm = true;
  f.g.scale.set(0.98, 1.3, 0.98);
  f.mantelMat.color.set(0x0b0b0d); f.mantelMat.roughness = 1;
  f.hautMat.color.set(0x74806f); f.hautMat.roughness = 0.82; f.hautMat.sheen = 0; f.hautMat.normalScale.set(1.3, 1.3);
  f.augen.forEach(a => { a.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.25, 0.1) }); a.scale.setScalar(1.55); });
  f.augenGruppe.scale.setScalar(1.35);
  f.lippen.visible = false;
  f.maul.visible = true; f.maul.scale.set(1.55, 1.55, 1.2);
  f.kiefer.rotation.x = 0.7;
  f.rumpf.rotation.x = 0.28;
  f.kopf.rotation.x = -0.18;
  for (const e of [f.armL, f.armR]) e.children.forEach(c => { if (c.isMesh && c.geometry.type === 'CylinderGeometry') c.scale.y = 1.45; });
  for (const e of [f.ellL, f.ellR]) e.scale.y = 1.4;
  const kralle = new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 0.4 });
  for (const h of f.haende) {
    h.h.scale.set(1.25, 1.5, 1.2);
    for (const fi of h.finger) {
      const k = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.05, 6), kralle);
      k.position.y = -0.045; k.rotation.x = Math.PI; k.castShadow = true;
      fi.gelenk.add(k);
    }
  }
  f.hals.scale.set(1.2, 1.25, 1.2);
}

/** Gehbewegung. gang = Laufphase, amp 0…1 (Schrittgröße). */
export function gehen(f, gang, amp, gleiten = false) {
  if (gleiten) { ruhe(f, 0); f.rumpf.rotation.x = 0.12; return; }
  const s = Math.sin(gang), c = Math.cos(gang);
  f.beinL.rotation.x = -s * 0.55 * amp;
  f.beinR.rotation.x = s * 0.55 * amp;
  f.knieL.rotation.x = Math.max(0, c) * 0.95 * amp;
  f.knieR.rotation.x = Math.max(0, -c) * 0.95 * amp;
  f.armL.rotation.x = s * 0.5 * amp;
  f.armR.rotation.x = -s * 0.5 * amp;
  f.ellL.rotation.x = -0.16 - Math.max(0, -s) * 0.45 * amp;
  f.ellR.rotation.x = -0.16 - Math.max(0, s) * 0.45 * amp;
  f.rumpf.rotation.y = s * 0.12 * amp;
  f.rumpf.rotation.z = c * 0.025 * amp;
  if (!f.monsterForm) f.rumpf.rotation.x = 0.04 * amp;
}

/** Ruhehaltung mit leichtem Atmen. */
export function ruhe(f, zeit) {
  f.beinL.rotation.x = f.beinR.rotation.x = 0;
  f.knieL.rotation.x = f.knieR.rotation.x = 0;
  f.armL.rotation.x = f.armR.rotation.x = 0;
  f.ellL.rotation.x = f.ellR.rotation.x = -0.16;
  f.rumpf.rotation.y = f.rumpf.rotation.z = 0;
  if (!f.monsterForm) f.rumpf.rotation.x = 0;
  f.rumpf.scale.y = 1 + Math.sin(zeit * 1.9) * 0.008;
}

/** Blinzeln und Blick zum Ziel (weltPos), mit begrenztem Kopfwinkel. */
export function blicken(f, dt, ziel, drehungKopfZ = 0) {
  f.t += dt;
  f.blinzeln -= dt;
  if (f.blinzeln < 0.12) f.augenGruppe.scale.y = f.monsterForm ? 1.35 : Math.max(0.08, Math.abs(f.blinzeln) * 8);
  else f.augenGruppe.scale.y = f.monsterForm ? 1.35 : 1;
  if (f.blinzeln < -0.12) f.blinzeln = zufall(2, 6);
  if (ziel) {
    const dx = ziel.x - f.g.position.x, dz = ziel.z - f.g.position.z;
    let yaw = Math.atan2(dx, dz) - f.g.rotation.y;
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    const dy = ziel.y - (f.g.position.y + 1.72), nick = Math.atan2(dy, Math.hypot(dx, dz));
    f.kopf.rotation.y += (klemme(yaw, -0.85, 0.85) - f.kopf.rotation.y) * Math.min(1, dt * 4);
    f.kopf.rotation.x += (klemme(-nick, -0.35, 0.35) - f.kopf.rotation.x) * Math.min(1, dt * 4);
  }
  f.kopf.rotation.z += (drehungKopfZ - f.kopf.rotation.z) * Math.min(1, dt * 10);
}

export function entferneFigur(f) {
  if (f.g.parent) f.g.parent.remove(f.g);
  f.g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material && !Array.isArray(o.material)) o.material.dispose();
  });
}
