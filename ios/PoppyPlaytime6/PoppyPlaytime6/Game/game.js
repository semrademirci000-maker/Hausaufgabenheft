import * as THREE from 'three';
import { MAP } from './map.js';
import { AudioEngine } from './audio.js';
import * as TX from './textures.js';
import { MonsterModel } from './monster.js';

window.__gameLoaded = true;

// ======================================================================
//  Grundlagen
// ======================================================================
const CELL = 4, WALL_H = 4.2, EYE = 1.62, CROUCH_EYE = 1.0, PR = 0.32;
const ROWS = MAP.length, COLS = MAP[0].length;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ch = (c, r) => (MAP[r] && MAP[r][c]) || '#';
const toCell = (x, z) => [Math.floor(x / CELL), Math.floor(z / CELL)];
const center = (c, r, y = 0) => new THREE.Vector3(c * CELL + CELL / 2, y, r * CELL + CELL / 2);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
let rngSeed = 424242;
const rng = () => { rngSeed = (rngSeed * 16807) % 2147483647; return (rngSeed - 1) / 2147483646; };

const settings = { sens: 1, vol: 0.8, quality: 'mid' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('pp6-settings') || '{}')); } catch (e) { /* kein Speicher */ }
const saveSettings = () => { try { localStorage.setItem('pp6-settings', JSON.stringify(settings)); } catch (e) { /* egal */ } };

const DOOR_COLORS = { 1: 0xffc233, 2: 0x3fdc6a, 3: 0xb46bff };
const LEVER_DOOR = { a: '1', b: '2', c: '3' };

const NOTES = [
  { title: 'Schichtbericht – Ebene 9', body: 'Die Nachtschicht meldet wieder Schritte über den Lüftungsschächten.\nLaut Direktion ist das „nur das alte Rohrsystem“.\n\nDas Rohrsystem lacht aber nicht.' },
  { title: 'Experiment 1170 – „Langbein“', body: 'Ursprünglich ein Kuscheltier für Kleinkinder, 2,1 m.\nNach der Behandlung: 3,4 m. Arme über 2 m.\n\nReagiert auf Licht und schnelle Bewegungen.\nEr sieht schlecht im Dunkeln – Taschenlampe AUS, wenn er in der Nähe ist.' },
  { title: 'Hastig gekritzelter Zettel', body: 'DIE SPINDE!\nEr macht sie nur auf, wenn er dich hineinklettern SIEHT.\nWarte, bis das Stampfen leiser wird.\n\nUnd renn niemals, wenn er dich noch nicht bemerkt hat. Er HÖRT dich.' },
];

// ======================================================================
//  Renderer, Szene, Kameras
// ======================================================================
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = settings.quality !== 'low';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;
$('game').appendChild(renderer.domElement);
TX.setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030304);
scene.fog = new THREE.FogExp2(0x050506, 0.052);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 120);
camera.rotation.order = 'YXZ';
scene.add(camera);
const hemi = new THREE.HemisphereLight(0x8a90a8, 0x1a1410, 0.25);
scene.add(hemi);

const flashlight = new THREE.SpotLight(0xfff1dd, 0, 34, 0.48, 0.6, 1.3);
flashlight.position.set(0.2, -0.15, 0.1);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(1024, 1024);
flashlight.shadow.camera.near = 0.3; flashlight.shadow.camera.far = 34;
flashlight.shadow.bias = -0.0008;
camera.add(flashlight);
flashlight.target.position.set(0, -0.2, -6);
camera.add(flashlight.target);

// Viewmodel (GrabPack) in eigener Szene, damit es nie in Wände ragt
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.01, 10);
vmScene.add(vmCam);
const vmHemi = new THREE.HemisphereLight(0xaab0c8, 0x201810, 0.5);
vmScene.add(vmHemi);
const vmKey = new THREE.PointLight(0xfff0d8, 1.2, 3, 2);
vmKey.position.set(0.2, 0.25, 0.1);
vmCam.add(vmKey);

const audio = new AudioEngine();
audio.volume = settings.vol;

// ======================================================================
//  Materialien (einmal erzeugt, in allen Durchläufen wiederverwendet)
// ======================================================================
const MAT = {
  walls: [0, 1, 2].map(v => { const t = TX.wallTexture(v); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.6, roughness: 0.92 }); }),
  floor: new THREE.MeshStandardMaterial({ map: TX.floorTexture(COLS, ROWS), roughness: 0.78, metalness: 0.05 }),
  ceil: new THREE.MeshStandardMaterial({ map: TX.ceilingTexture(COLS, ROWS), roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ map: TX.woodTexture(), roughness: 0.9 }),
  metal: new THREE.MeshStandardMaterial({ map: TX.metalTexture('#5d6266'), roughness: 0.55, metalness: 0.6 }),
  door: new THREE.MeshStandardMaterial({ map: TX.metalTexture('#565b5f', true), roughness: 0.6, metalness: 0.5 }),
  shutter: new THREE.MeshStandardMaterial({ map: TX.shutterTexture(), roughness: 0.6, metalness: 0.4 }),
  gen: new THREE.MeshStandardMaterial({ map: TX.metalTexture('#4a5a50', true, 'GEN-06'), roughness: 0.5, metalness: 0.6 }),
  locker: new THREE.MeshStandardMaterial({ map: TX.lockerTexture(), roughness: 0.55, metalness: 0.5 }),
  lockerSide: new THREE.MeshStandardMaterial({ color: 0x33483b, roughness: 0.6, metalness: 0.5 }),
  note: new THREE.MeshStandardMaterial({ map: TX.noteTexture(), emissive: 0x332a18, roughness: 1, side: THREE.DoubleSide }),
  pipe: new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.5, metalness: 0.7 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7, metalness: 0.4 }),
  shade: new THREE.MeshStandardMaterial({ color: 0x2a2d2a, emissive: 0x3a2a14, roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide }),
  puddle: new THREE.MeshStandardMaterial({ color: 0x3a3630, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.35, depthWrite: false }),
  posters: [0, 1, 2].map(k => new THREE.MeshStandardMaterial({ map: TX.posterTexture(k), roughness: 0.95, transparent: true, alphaTest: 0.5 })),
  shaft: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }),
  batteryBody: new THREE.MeshStandardMaterial({ color: 0x2a6cff, emissive: 0x1b4dff, emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.3 }),
  batteryCap: new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.9 }),
};
const SCRAWLS = ['LAUF', 'ES LÄCHELT', 'NICHT RENNEN'].map(t => new THREE.MeshBasicMaterial({ map: TX.scrawlTexture(t), transparent: true, depthWrite: false, fog: true }));

// ======================================================================
//  Bausteine
// ======================================================================
function makeHand(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 });
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.11), mat);
  g.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.024, 0.075), mat);
    f.position.set((i - 1.5) * 0.026, -0.004, -0.088);
    f.rotation.x = 0.25; f.rotation.y = (i - 1.5) * -0.06;
    g.add(f);
  }
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.024, 0.06), mat);
  thumb.position.set(0.062, -0.006, -0.02); thumb.rotation.y = -0.7;
  g.add(thumb);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 10), MAT.batteryCap);
  wrist.rotation.x = Math.PI / 2; wrist.position.z = 0.075;
  g.add(wrist);
  return g;
}

function makeBattery() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 16), MAT.batteryBody);
  g.add(body);
  for (const y of [-0.23, 0.23]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16), MAT.batteryCap);
    cap.position.y = y; g.add(cap);
  }
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), MAT.batteryCap);
  tip.position.y = 0.28; g.add(tip);
  return g;
}

// Richtung zur ersten angrenzenden Wand
function wallDir(c, r) {
  for (const [dx, dz] of DIRS) if (ch(c + dx, r + dz) === '#') return [dx, dz];
  return [0, -1];
}
function openDir(c, r) {
  for (const [dx, dz] of DIRS) { const k = ch(c + dx, r + dz); if (k !== '#' && k !== 'G') return [dx, dz]; }
  return [0, 1];
}
const yawFacing = (dx, dz) => Math.atan2(dx, dz); // Objekt schaut in Richtung (dx,dz)

// ======================================================================
//  Welt aufbauen
// ======================================================================
let W = null;

function buildWorld() {
  if (W) {
    scene.remove(W.group);
    W.lightPool.forEach(l => scene.remove(l));
    W.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  rngSeed = 424242;
  const group = new THREE.Group();
  scene.add(group);
  const w = W = {
    group, doors: {}, levers: [], batteries: [], lockers: [], notes: [], lamps: [], boxes: [],
    rayTargets: [], gen: null, gate: null, exitCell: null, start: null, startYaw: 0, monsterStart: null, lightPool: [],
  };
  const addBox = (x0, x1, z0, z1) => { const b = { x0, x1, z0, z1, on: true }; w.boxes.push(b); return b; };
  const ref = (mesh, obj) => { mesh.userData.ref = obj; w.rayTargets.push(mesh); };

  // --- Wände (instanziert, drei Tapeten-Varianten nach Bereich) ---
  const wallCells = [[], [], []];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== '#') continue;
    let near = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = MAP[r + dz]?.[c + dx]; if (k && k !== '#') near = true; }
    if (!near) continue;
    wallCells[(Math.floor(c / 8) + Math.floor(r / 7)) % 3].push([c, r]);
  }
  const wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
  const m4 = new THREE.Matrix4();
  wallCells.forEach((cells, v) => {
    const im = new THREE.InstancedMesh(wallGeo, MAT.walls[v], cells.length);
    cells.forEach(([c, r], i) => { m4.makeTranslation(c * CELL + CELL / 2, WALL_H / 2, r * CELL + CELL / 2); im.setMatrixAt(i, m4); });
    im.castShadow = true; im.receiveShadow = true;
    group.add(im); w.rayTargets.push(im);
  });

  // --- Boden & Decke ---
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL), MAT.floor);
  floor.rotation.x = -Math.PI / 2; floor.position.set(COLS * CELL / 2, 0, ROWS * CELL / 2);
  floor.receiveShadow = true; group.add(floor); w.rayTargets.push(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL), MAT.ceil);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(COLS * CELL / 2, WALL_H, ROWS * CELL / 2);
  group.add(ceil);

  let noteIdx = 0;
  const posterGeo = new THREE.PlaneGeometry(0.9, 1.27);

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = ch(c, r);
    if (k === '#') continue;
    const cc = center(c, r);

    if (k === 'P') { w.start = cc.clone(); const [dx, dz] = openDir(c, r); w.startYaw = Math.atan2(-dx, -dz); }
    if (k === 'M') w.monsterStart = cc.clone();

    // ----- Lampen -----
    if (k === 'L' || k === 'X') {
      const lamp = { pos: new THREE.Vector3(cc.x, WALL_H - 0.75, cc.z), level: 1, flicker: k === 'L' && rng() < 0.35, base: k === 'X' ? 26 : 20, color: new THREE.Color(k === 'X' ? 0xbfd8ff : 0xffcf95), ft: 0 };
      if (k === 'L') {
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.4, 16, 1, true), MAT.shade);
        shade.position.set(cc.x, WALL_H - 0.55, cc.z); group.add(shade);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35), MAT.dark);
        cord.position.set(cc.x, WALL_H - 0.18, cc.z); group.add(cord);
      }
      lamp.bulbMat = new THREE.MeshBasicMaterial({ color: lamp.color.clone() });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lamp.bulbMat);
      bulb.position.copy(lamp.pos).y += 0.05; group.add(bulb);
      lamp.shaftMat = MAT.shaft.clone();
      const shaft = new THREE.Mesh(new THREE.ConeGeometry(1.7, WALL_H - 0.8, 20, 1, true), lamp.shaftMat);
      shaft.position.set(cc.x, (WALL_H - 0.8) / 2, cc.z); group.add(shaft);
      w.lamps.push(lamp);
    }

    // ----- Batterie auf einer Kiste -----
    if (k === 'B') {
      const [dx, dz] = wallDir(c, r);
      const px = cc.x + dx * 1.1, pz = cc.z + dz * 1.1;
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), MAT.wood);
      crate.position.set(px, 0.475, pz); crate.castShadow = crate.receiveShadow = true; group.add(crate);
      addBox(px - 0.48, px + 0.48, pz - 0.48, pz + 0.48);
      w.rayTargets.push(crate);
      const bat = makeBattery();
      bat.position.set(px, 1.2, pz); bat.rotation.z = 0.1;
      group.add(bat);
      const glow = new THREE.PointLight(0x3a6cff, 3, 3.5, 2);
      glow.position.set(px, 1.4, pz); group.add(glow);
      const b = { kind: 'battery', mesh: bat, glow, taken: false, home: bat.position.clone() };
      bat.traverse(m => { if (m.isMesh) ref(m, b); });
      w.batteries.push(b);
    }

    // ----- Generator -----
    if (k === 'G') {
      const [ox, oz] = openDir(c, r);
      const gg = new THREE.Group(); gg.position.copy(cc); gg.rotation.y = yawFacing(ox, oz); group.add(gg);
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.5, 2.4), MAT.gen);
      body.position.y = 1.25; body.castShadow = body.receiveShadow = true; gg.add(body);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, WALL_H - 2.5, 12), MAT.pipe);
      top.position.set(-0.8, 2.5 + (WALL_H - 2.5) / 2, 0); gg.add(top);
      const top2 = top.clone(); top2.position.x = 0.8; gg.add(top2);
      const gen = { kind: 'generator', group: gg, slots: [], placed: 0 };
      for (let i = 0; i < 3; i++) {
        const sx = (i - 1) * 0.75;
        const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 14), MAT.dark);
        sock.position.set(sx, 1.2, 1.25); gg.add(sock);
        const ind = new THREE.MeshBasicMaterial({ color: 0xff2020 });
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), ind);
        lamp.position.set(sx, 1.75, 1.22); gg.add(lamp);
        const bat = makeBattery(); bat.position.set(sx, 1.2, 1.3); bat.visible = false; gg.add(bat);
        gen.slots.push({ ind, bat });
      }
      gg.traverse(m => { if (m.isMesh) ref(m, gen); });
      const half = 1.4;
      addBox(cc.x - half, cc.x + half, cc.z - half, cc.z + half);
      w.gen = gen;
    }

    // ----- Türen & Ausgangstor -----
    if ('123E'.includes(k)) {
      const alongX = ch(c - 1, r) === '#' && ch(c + 1, r) === '#';
      const geo = alongX ? new THREE.BoxGeometry(CELL, WALL_H, 0.35) : new THREE.BoxGeometry(0.35, WALL_H, CELL);
      const mesh = new THREE.Mesh(geo, k === 'E' ? MAT.shutter : MAT.door);
      mesh.position.set(cc.x, WALL_H / 2, cc.z); mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      const box = alongX ? addBox(cc.x - 2, cc.x + 2, cc.z - 0.2, cc.z + 0.2) : addBox(cc.x - 0.2, cc.x + 0.2, cc.z - 2, cc.z + 2);
      const indMat = new THREE.MeshBasicMaterial({ color: k === 'E' ? 0xff2020 : DOOR_COLORS[k] });
      const ind = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.5 : 0.4, 0.18, alongX ? 0.4 : 0.5), indMat);
      ind.position.set(cc.x, WALL_H - 0.3, cc.z); group.add(ind);
      const d = { kind: k === 'E' ? 'gate' : 'door', id: k, mesh, box, open: false, opening: false, t: 0, indMat };
      ref(mesh, d);
      if (k === 'E') w.gate = d; else w.doors[k] = d;
    }
    if (k === 'X') w.exitCell = [c, r];

    // ----- Hebel -----
    if ('abc'.includes(k)) {
      const [dx, dz] = wallDir(c, r);
      const lg = new THREE.Group();
      lg.position.set(cc.x + dx * (CELL / 2 - 0.06), 1.35, cc.z + dz * (CELL / 2 - 0.06));
      lg.rotation.y = yawFacing(-dx, -dz); group.add(lg);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.1), MAT.metal); lg.add(plate);
      const pivot = new THREE.Group(); pivot.position.z = 0.06; pivot.rotation.x = 0.5; lg.add(pivot);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), MAT.batteryCap);
      stick.position.y = 0.25; pivot.add(stick);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshStandardMaterial({ color: DOOR_COLORS[LEVER_DOOR[k]], emissive: DOOR_COLORS[LEVER_DOOR[k]], emissiveIntensity: 0.5 }));
      knob.position.y = 0.52; pivot.add(knob);
      const lv = { kind: 'lever', id: k, pivot, pulled: false, t: 0 };
      [plate, stick, knob].forEach(m => ref(m, lv));
      w.levers.push(lv);
    }

    // ----- Spinde -----
    if (k === 'K') {
      const [dx, dz] = wallDir(c, r);
      const lg = new THREE.Group();
      const px = cc.x + dx * (CELL / 2 - 0.4), pz = cc.z + dz * (CELL / 2 - 0.4);
      lg.position.set(px, 0, pz); lg.rotation.y = yawFacing(-dx, -dz); group.add(lg);
      const shell = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.3, 0.75), MAT.lockerSide);
      shell.position.y = 1.15; shell.castShadow = shell.receiveShadow = true; lg.add(shell);
      const front = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 2.26), MAT.locker);
      front.position.set(0, 1.15, 0.376); lg.add(front);
      const lk = {
        kind: 'locker', group: lg,
        inside: new THREE.Vector3(px - dx * 0.1, 0, pz - dz * 0.1),
        front: new THREE.Vector3(px - dx * 1.05, 0, pz - dz * 1.05),
        yaw: Math.atan2(dx, dz),
      };
      [shell, front].forEach(m => ref(m, lk));
      const hw = dx !== 0 ? 0.38 : 0.5, hd = dx !== 0 ? 0.5 : 0.38;
      addBox(px - hw, px + hw, pz - hd, pz + hd);
      w.lockers.push(lk);
    }

    // ----- Notizen -----
    if (k === 'N') {
      const [dx, dz] = wallDir(c, r);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), MAT.note);
      m.position.set(cc.x + dx * (CELL / 2 - 0.02), 1.55, cc.z + dz * (CELL / 2 - 0.02));
      m.rotation.y = yawFacing(-dx, -dz); m.rotation.z = (rng() - 0.5) * 0.2;
      group.add(m);
      const n = { kind: 'note', idx: noteIdx++ % NOTES.length, mesh: m, read: false };
      ref(m, n); w.notes.push(n);
    }

    // ----- Deko auf freien Feldern -----
    if (k === '.') {
      const walls = DIRS.filter(([dx, dz]) => ch(c + dx, r + dz) === '#');
      if (walls.length && rng() < 0.2) {
        const [dx, dz] = walls[Math.floor(rng() * walls.length)];
        const side = rng() < 0.5 ? -1 : 1;
        const s = 0.7 + rng() * 0.4;
        const px = cc.x + dx * (CELL / 2 - s / 2 - 0.05) + (dz ? side * 1.1 : 0);
        const pz = cc.z + dz * (CELL / 2 - s / 2 - 0.05) + (dx ? side * 1.1 : 0);
        const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), MAT.wood);
        crate.position.set(px, s / 2, pz); crate.rotation.y = (rng() - 0.5) * 0.3;
        crate.castShadow = crate.receiveShadow = true; group.add(crate); w.rayTargets.push(crate);
        if (rng() < 0.4) { const c2 = crate.clone(); c2.scale.setScalar(0.75); c2.position.y = s + s * 0.375; c2.rotation.y += 0.5; group.add(c2); }
        addBox(px - s / 2, px + s / 2, pz - s / 2, pz + s / 2);
      }
      if (walls.length && rng() < 0.16) {
        const [dx, dz] = walls[Math.floor(rng() * walls.length)];
        const p = new THREE.Mesh(posterGeo, MAT.posters[Math.floor(rng() * 3)]);
        p.position.set(cc.x + dx * (CELL / 2 - 0.015), 2.1, cc.z + dz * (CELL / 2 - 0.015));
        p.rotation.y = yawFacing(-dx, -dz); p.rotation.z = (rng() - 0.5) * 0.12;
        group.add(p);
      }
      if (walls.length && rng() < 0.05) {
        const [dx, dz] = walls[Math.floor(rng() * walls.length)];
        const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), SCRAWLS[Math.floor(rng() * SCRAWLS.length)]);
        p.position.set(cc.x + dx * (CELL / 2 - 0.02), 1.9, cc.z + dz * (CELL / 2 - 0.02));
        p.rotation.y = yawFacing(-dx, -dz); group.add(p);
      }
      if (rng() < 0.1) {
        const p = new THREE.Mesh(new THREE.CircleGeometry(0.5 + rng() * 0.8, 20), MAT.puddle);
        p.rotation.x = -Math.PI / 2; p.scale.x = 1 + rng();
        p.position.set(cc.x + (rng() - 0.5) * 2, 0.01, cc.z + (rng() - 0.5) * 2); group.add(p);
      }
      if (rng() < 0.12) {
        // verstreute Spielzeugwürfel
        const colors = [0xd23a3a, 0x3a6ad2, 0xe8c040, 0x3aa860];
        for (let i = 0; i < 3; i++) {
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: colors[Math.floor(rng() * 4)], roughness: 0.6 }));
          b.position.set(cc.x + (rng() - 0.5) * 2.6, 0.11, cc.z + (rng() - 0.5) * 2.6); b.rotation.y = rng() * 3;
          b.castShadow = true; group.add(b);
        }
      }
    }

    // ----- Rohre an der Decke in Gängen -----
    const nsCorr = ch(c - 1, r) === '#' && ch(c + 1, r) === '#';
    const ewCorr = ch(c, r - 1) === '#' && ch(c, r + 1) === '#';
    if ((nsCorr || ewCorr) && !'123E'.includes(k)) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, CELL, 8), MAT.pipe);
      if (nsCorr) { pipe.rotation.x = Math.PI / 2; pipe.position.set(cc.x + 1.55, WALL_H - 0.3, cc.z); }
      else { pipe.rotation.z = Math.PI / 2; pipe.position.set(cc.x, WALL_H - 0.3, cc.z + 1.55); }
      group.add(pipe);
    }
  }

  // Lichtpool: nur die nächsten Lampen bekommen echte Lichtquellen (schnell auf dem iPad)
  const poolSize = settings.quality === 'low' ? 4 : settings.quality === 'mid' ? 6 : 8;
  for (let i = 0; i < poolSize; i++) {
    const l = new THREE.PointLight(0xffcf95, 0, 14, 1.6);
    scene.add(l); w.lightPool.push(l);
  }
  return w;
}

// ======================================================================
//  Kollision, Sichtlinie, Wegfindung
// ======================================================================
function pushOut(pos, rad, b) {
  const nx = clamp(pos.x, b.x0, b.x1), nz = clamp(pos.z, b.z0, b.z1);
  const dx = pos.x - nx, dz = pos.z - nz, d2 = dx * dx + dz * dz;
  if (d2 >= rad * rad) return;
  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    pos.x += dx / d * (rad - d); pos.z += dz / d * (rad - d);
  } else {
    const l = pos.x - b.x0, r = b.x1 - pos.x, t = pos.z - b.z0, bo = b.z1 - pos.z, m = Math.min(l, r, t, bo);
    if (m === l) pos.x = b.x0 - rad; else if (m === r) pos.x = b.x1 + rad; else if (m === t) pos.z = b.z0 - rad; else pos.z = b.z1 + rad;
  }
}
const _cb = { x0: 0, x1: 0, z0: 0, z1: 0 };
function collide(pos, rad) {
  const [cx, cz] = toCell(pos.x, pos.z);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    if (ch(cx + dx, cz + dz) !== '#') continue;
    _cb.x0 = (cx + dx) * CELL; _cb.x1 = _cb.x0 + CELL; _cb.z0 = (cz + dz) * CELL; _cb.z1 = _cb.z0 + CELL;
    pushOut(pos, rad, _cb);
  }
  for (const b of W.boxes) if (b.on && Math.abs((b.x0 + b.x1) / 2 - pos.x) < 4 && Math.abs((b.z0 + b.z1) / 2 - pos.z) < 4) pushOut(pos, rad, b);
}

function passable(c, r) {
  const k = ch(c, r);
  if (k === '#' || k === 'G') return false;
  if (k === '1' || k === '2' || k === '3') return W.doors[k].open;
  if (k === 'E') return W.gate.open;
  if (k === 'X') return W.gate.open;
  return true;
}
function los(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), n = Math.ceil(d / 0.35);
  for (let i = 1; i < n; i++) {
    const [c, r] = toCell(a.x + dx * i / n, a.z + dz * i / n);
    if (!passable(c, r)) return false;
  }
  return true;
}
function findPath(from, to) {
  const N = ROWS * COLS, prev = new Int32Array(N).fill(-1);
  const s = from[1] * COLS + from[0], t = to[1] * COLS + to[0];
  prev[s] = s;
  const q = [s];
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    if (cur === t) break;
    const c = cur % COLS, r = (cur / COLS) | 0;
    for (const [dx, dz] of DIRS) {
      const nc = c + dx, nr = r + dz, ni = nr * COLS + nc;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || prev[ni] !== -1 || !passable(nc, nr)) continue;
      prev[ni] = cur; q.push(ni);
    }
  }
  if (prev[t] === -1) return null;
  const path = [];
  for (let cur = t; cur !== s; cur = prev[cur]) path.push([cur % COLS, (cur / COLS) | 0]);
  return path.reverse();
}
function randomFloorNear(c0, r0, radius) {
  for (let i = 0; i < 40; i++) {
    const c = c0 + Math.round((Math.random() * 2 - 1) * radius), r = r0 + Math.round((Math.random() * 2 - 1) * radius);
    const k = ch(c, r);
    if (passable(c, r) && k !== 'X' && k !== 'E') return [c, r];
  }
  return [c0, r0];
}

// ======================================================================
//  Spielzustand
// ======================================================================
const G = {
  mode: 'menu', time: 0, flash: true, placed: 0, powered: false, monsterAwake: false,
  noise: null, chase: 0, blackout: 0, focus: null, events: [], leversPulled: 0, lastNoteT: 0,
};
const P = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, eye: EYE, crouch: false,
  stamina: 100, exhausted: false, staminaDelay: 0, bob: 0, step: 0, hidden: null, lookOffset: 0, lookPitch: 0,
};

// ----- Monster -----
const monster = new MonsterModel();
scene.add(monster.root);
const M = {
  pos: new THREE.Vector3(), yaw: 0, state: 'dormant', path: null, pathT: 0, target: null, wait: 0,
  aware: 0, lastSeen: new THREE.Vector3(), lost: 0, search: 0, sees: false, sawHide: false, growlT: 8,
  speed: 0, stepIdx: 0, lookYaw: 0, stuck: 0, lastPos: new THREE.Vector3(), heartT: 0,
};

// ----- GrabPack-Hände -----
const hands = [0, 1].map(side => {
  const color = side ? 0xe23434 : 0x2f6cf0;
  const vm = new THREE.Group();
  const launcher = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.36, 12), MAT.metal);
  launcher.rotation.x = Math.PI / 2; launcher.position.z = 0.1; vm.add(launcher);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.05, 14), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.4 }));
  ring.rotation.x = Math.PI / 2; ring.position.z = -0.07; vm.add(ring);
  const hand = makeHand(color);
  // Wie im Original: Finger zeigen nach oben, Handfläche nach vorn, Daumen nach innen
  hand.position.set(0, 0.07, -0.2); hand.rotation.set(Math.PI / 2 - 0.12, 0, side ? 0.12 : -0.12);
  hand.scale.set(side ? -1.25 : 1.25, 1.25, 1.25); vm.add(hand);
  const carryBat = makeBattery(); carryBat.scale.setScalar(0.55); carryBat.rotation.x = Math.PI / 2;
  carryBat.position.set(0, 0.1, -0.26); carryBat.visible = false; vm.add(carryBat);
  const rest = new THREE.Vector3(side ? 0.24 : -0.24, -0.27, -0.6);
  vm.position.copy(rest); vm.rotation.set(0.05, side ? -0.08 : 0.08, side ? -0.1 : 0.1);
  vmCam.add(vm);

  const world = makeHand(color); world.scale.setScalar(1.6); world.visible = false; scene.add(world);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.6 }));
  cable.visible = false; scene.add(cable);
  return {
    side, vm, hand, carryBat, rest, world, cable, state: 'idle', pos: new THREE.Vector3(), target: new THREE.Vector3(),
    hit: null, grabbing: null, carrying: null, kick: 0, muzzleLocal: new THREE.Vector3(side ? 0.28 : -0.28, -0.25, -0.5),
  };
});

// ======================================================================
//  HUD & Texte
// ======================================================================
const hud = {
  obj: $('objText'), prompt: $('prompt'), sub: $('subtitle'), stamina: $('stamina'), staminaWrap: $('staminaWrap'),
  cross: $('crosshair'), hidden: $('hiddenTag'), flash: $('flashTag'), bats: $('batteries'),
};
hud.bats.innerHTML = '<i></i><i></i><i></i>';
const lockerView = document.createElement('div');
lockerView.id = 'lockerView'; lockerView.className = 'hidden';
document.body.appendChild(lockerView);

let subTimer = 0;
function say(text, dur = 4, who = '') {
  hud.sub.innerHTML = who ? `<b style="color:${who === 'POPPY' ? '#ff9ec8' : '#ffcc33'}">${who}:</b> ${text}` : text;
  hud.sub.style.opacity = 1; subTimer = dur;
  if (who === 'POPPY') audio.radio();
}
function objective(t) { hud.obj.textContent = t; }
function updateBatteryHud() { [...hud.bats.children].forEach((el, i) => el.classList.toggle('on', i < G.placed)); }
function schedule(delay, fn) { G.events.push({ t: G.time + delay, fn }); }

// ======================================================================
//  Spielablauf
// ======================================================================
function resetGame() {
  buildWorld();
  Object.assign(G, { time: 0, flash: true, placed: 0, powered: false, monsterAwake: false, noise: null, chase: 0, blackout: 0, focus: null, events: [], leversPulled: 0 });
  audio.alarm = false;
  P.pos.copy(W.start); P.vel.set(0, 0, 0); P.yaw = W.startYaw; P.pitch = 0; P.eye = EYE; P.stamina = 100; P.hidden = null; P.exhausted = false;
  M.pos.copy(W.monsterStart); M.yaw = Math.PI; M.state = 'dormant'; M.path = null; M.aware = 0; M.lost = 0; M.sawHide = false; M.speed = 0; M.growlT = 8;
  monster.root.visible = true; monster.setAngry(false); monster.setMouth(false);
  monster.root.position.copy(M.pos); monster.root.rotation.set(0, M.yaw, 0);
  for (const h of hands) { h.state = 'idle'; h.carrying = null; h.grabbing = null; h.carryBat.visible = false; h.world.visible = false; h.cable.visible = false; h.vm.visible = true; }
  lockerView.classList.add('hidden');
  updateBatteryHud();
  objective('Finde einen Weg nach draußen.');
  hud.sub.style.opacity = 0;
  // Intro
  schedule(1.0, () => say('Kannst du mich hören? Gut … du lebst noch.', 4, 'POPPY'));
  schedule(5.2, () => say('Der Aufzug ist abgestürzt. So tief unten war noch nie ein Mitarbeiter.', 4.5, 'POPPY'));
  schedule(10, () => { say('Das Ausgangstor braucht Strom. Finde drei Batterien und bring sie zum Generator.', 5, 'POPPY'); objective('Finde 3 Batterien für den Generator (0/3)'); });
  schedule(15.5, () => say('Und … sei leise. Hier unten schläft etwas. Wir nannten es <b>Langbein</b>.', 5, 'POPPY'));
  schedule(21, () => say(isTouch ? 'Tipp: Tippe auf ✋, um die GrabPack-Hand zu schießen.' : 'Tipp: Linke/rechte Maustaste schießt die GrabPack-Hände.', 4));
}

function startGame() {
  audio.init();
  audio.setVolume(settings.vol);
  audio.setAmbience(true);
  resetGame();
  showScreen(null);
  $('hud').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
  G.mode = 'playing';
  lockPointer();
  if (isTouch) { try { document.documentElement.requestFullscreen?.(); } catch (e) { /* iOS */ } }
}

function wakeMonster() {
  if (G.monsterAwake) return;
  G.monsterAwake = true;
  G.blackout = 2.2;
  audio.powerDown();
  schedule(1.2, () => { audio.setMonsterPos(M.pos); audio.roar(); });
  schedule(2.4, () => say('Oh nein. Die Lichter … Es ist wach. VERSTECK DICH, wenn es kommt!', 5, 'POPPY'));
  schedule(2.2, () => { M.state = 'investigate'; M.target = toCell(P.pos.x, P.pos.z); M.path = null; });
}

function insertBattery(h) {
  const slot = W.gen.slots[G.placed];
  slot.bat.visible = true; slot.ind.color.set(0x30ff60);
  h.carrying = null; h.carryBat.visible = false;
  G.placed++; updateBatteryHud(); audio.insertBattery();
  if (G.placed < 3) {
    objective(`Finde 3 Batterien für den Generator (${G.placed}/3)`);
    if (G.placed === 2) say('Noch eine. Es ist nicht schlau – brich den Sichtkontakt ab, dann verliert es dich.', 5, 'POPPY');
    else say(`Batterie eingesetzt (${G.placed}/3).`, 3);
  } else powerOn();
}

function powerOn() {
  G.powered = true;
  audio.powerUp();
  objective('Der Generator läuft …');
  schedule(2.5, () => {
    W.gate.opening = true; audio.door(); audio.alarm = true;
    W.gate.indMat.color.set(0x30ff60);
    for (const l of W.lamps) if (l.base < 26) { l.color.set(0xff2a18); l.bulbMat.color.set(0xff2a18); l.shaftMat.color.set(0xff3020); l.flicker = true; }
    say('Der Generator läuft! Das Tor ist offen – <b>LAUF!</b>', 5, 'POPPY');
    objective('FLIEH DURCH DAS AUSGANGSTOR!');
    // Finale: Langbein weiß genau, wo du bist
    if (M.pos.distanceTo(P.pos) > 26) {
      for (let i = 0; i < 30; i++) {
        const cc = center(...randomFloorNear(...toCell(P.pos.x, P.pos.z), 7));
        if (cc.distanceTo(P.pos) > 14 && !los(cc, P.pos)) { M.pos.copy(cc); M.path = null; break; }
      }
    }
    startChase(true);
    audio.setMonsterPos(M.pos); audio.roar();
  });
}

function startChase(silent) {
  if (M.state !== 'chase' && !silent) { audio.setMonsterPos(M.pos); audio.roar(); }
  M.state = 'chase'; M.lost = 0; M.aware = 1; M.path = null; M.pathT = 0;
  M.lastSeen.copy(P.pos);
  monster.setAngry(true);
}

function pullLever(lv) {
  if (lv.pulled) return;
  lv.pulled = true; audio.lever();
  const d = W.doors[LEVER_DOOR[lv.id]];
  schedule(0.4, () => { d.opening = true; audio.door(); d.indMat.color.set(0x30ff60); });
  G.leversPulled++;
  say(G.leversPulled === 1 ? 'Irgendwo hat sich eine schwere Tür geöffnet. Achte auf die Farbe über der Tür.' : 'Eine weitere Tür öffnet sich.', 4);
  G.noise = { pos: P.pos.clone(), radius: 18, t: 0.2 };
}

function toggleLocker(lk) {
  if (P.hidden) {
    const l = P.hidden; P.hidden = null;
    P.pos.copy(l.front); P.yaw = l.yaw;
    audio.locker(true); lockerView.classList.add('hidden');
    return;
  }
  P.hidden = lk; P.pos.copy(lk.inside); P.yaw = lk.yaw; P.pitch = 0; P.lookOffset = 0; P.lookPitch = 0;
  P.vel.set(0, 0, 0);
  M.sawHide = M.state === 'chase' && M.sees && M.pos.distanceTo(P.pos) < 11;
  audio.locker(false); lockerView.classList.remove('hidden');
}

function openNote(n) {
  G.mode = 'note'; n.read = true; audio.paper();
  $('noteTitle').textContent = NOTES[n.idx].title;
  $('noteBody').textContent = NOTES[n.idx].body;
  $('note').classList.remove('hidden');
}
function closeNote() { $('note').classList.add('hidden'); G.mode = 'playing'; }

function die() {
  G.mode = 'jumpscare'; G.jsT = 0;
  if (P.hidden) { P.hidden = null; lockerView.classList.add('hidden'); }
  audio.jumpscare(); audio.alarm = false;
  monster.setAngry(true); monster.setMouth(true);
  $('damage').style.opacity = 1;
  for (const h of hands) h.vm.visible = false;
}

function win() {
  G.mode = 'win'; audio.alarm = false; audio.setAmbience(false);
  const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60);
  $('winTime').textContent = `Zeit: ${m}:${String(s).padStart(2, '0')}`;
  unlock(); showScreen('win');
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
}

// ======================================================================
//  Eingabe
// ======================================================================
const keys = {};
const touch = { move: new THREE.Vector2(), run: false, crouch: false };

function lockPointer() { if (!isTouch && renderer.domElement.requestPointerLock) { try { renderer.domElement.requestPointerLock(); } catch (e) { /* egal */ } } }
function unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (G.mode === 'note' && (e.code === 'KeyE' || e.code === 'Escape' || e.code === 'Space')) { closeNote(); return; }
  if (G.mode !== 'playing') return;
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyF') toggleFlash();
  if (e.code === 'KeyQ') fire(0);
  if (e.code === 'KeyR') fire(1);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

renderer.domElement.addEventListener('mousedown', e => {
  if (isTouch) return;
  if (G.mode === 'note') { closeNote(); return; }
  if (G.mode !== 'playing') return;
  if (!document.pointerLockElement) { lockPointer(); return; }
  if (e.button === 0) fire(0);
  if (e.button === 2) fire(1);
});
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (!document.pointerLockElement || G.mode !== 'playing') return;
  look(e.movementX, e.movementY, 0.0022);
});
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && G.mode === 'playing' && !isTouch) pause();
});

function look(dx, dy, k) {
  const s = k * settings.sens;
  if (P.hidden) {
    P.lookOffset = clamp(P.lookOffset - dx * s, -0.6, 0.6);
    P.lookPitch = clamp(P.lookPitch - dy * s, -0.4, 0.4);
  } else {
    P.yaw -= dx * s;
    P.pitch = clamp(P.pitch - dy * s, -1.45, 1.45);
  }
  vmSway.x += dx * 0.00012; vmSway.y -= dy * 0.00012;
}
const vmSway = new THREE.Vector2();

function toggleFlash() { G.flash = !G.flash; audio.flashClick(); }

// ----- Touch -----
(function setupTouch() {
  const stick = $('stick'), knob = $('knob'), pad = $('lookpad');
  let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
  stick.addEventListener('pointerdown', e => {
    stickId = e.pointerId; stick.setPointerCapture(e.pointerId);
    const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2;
    moveStick(e);
  });
  const moveStick = e => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - sx, dy = e.clientY - sy;
    const d = Math.hypot(dx, dy), max = 55;
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.move.set(dx / max, dy / max);
  };
  stick.addEventListener('pointermove', moveStick);
  const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; touch.move.set(0, 0); knob.style.transform = ''; };
  stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);

  pad.addEventListener('pointerdown', e => {
    if (G.mode === 'note') { closeNote(); return; }
    lookId = e.pointerId; pad.setPointerCapture(e.pointerId); lx = e.clientX; ly = e.clientY;
  });
  pad.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId || G.mode !== 'playing') return;
    look(e.clientX - lx, e.clientY - ly, 0.0045); lx = e.clientX; ly = e.clientY;
  });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; };
  pad.addEventListener('pointerup', endLook); pad.addEventListener('pointercancel', endLook);

  const btn = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (G.mode === 'note') { closeNote(); return; } if (G.mode === 'playing') fn(e.currentTarget); });
  btn('tLeft', () => fire(0));
  btn('tRight', () => fire(1));
  btn('tUse', () => interact());
  btn('tFlash', () => toggleFlash());
  btn('tRun', el => { touch.run = !touch.run; if (touch.run) { touch.crouch = false; $('tCrouch').classList.remove('active'); } el.classList.toggle('active', touch.run); });
  btn('tCrouch', el => { touch.crouch = !touch.crouch; if (touch.crouch) { touch.run = false; $('tRun').classList.remove('active'); } el.classList.toggle('active', touch.crouch); });
  btn('tPause', () => pause());
  $('note').addEventListener('pointerdown', () => { if (G.mode === 'note') closeNote(); });
})();

// ======================================================================
//  Zielen & Interaktion
// ======================================================================
const ray = new THREE.Raycaster();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _fwd = new THREE.Vector3();

function aim(range) {
  camera.getWorldDirection(_fwd);
  ray.set(camera.position, _fwd); ray.far = range;
  const hits = ray.intersectObjects(W.rayTargets, false);
  if (!hits.length) return null;
  const h = hits[0];
  return { point: h.point, dist: h.distance, obj: h.object.userData.ref || null };
}

function updateFocus() {
  const a = aim(16);
  let text = '', hot = false;
  const carrying = hands.some(h => h.carrying);
  G.focus = a;
  if (P.hidden) text = isTouch ? 'E: Spind verlassen' : '[E] Spind verlassen';
  else if (a && a.obj) {
    const o = a.obj, d = a.dist;
    if (o.kind === 'battery' && !o.taken) { hot = true; text = d < 2.6 ? '[E] / ✋ Batterie nehmen' : '✋ Hand schießen: Batterie greifen'; }
    else if (o.kind === 'lever' && !o.pulled) { hot = true; text = '✋ Hand schießen: Hebel ziehen'; }
    else if (o.kind === 'generator' && d < 5) { hot = true; text = carrying && G.placed < 3 ? '[E] Batterie einsetzen' : `Generator · ${G.placed}/3 Batterien`; }
    else if (o.kind === 'locker' && d < 2.8) { hot = true; text = '[E] Im Spind verstecken'; }
    else if (o.kind === 'note' && d < 3) { hot = true; text = '[E] Lesen'; }
    else if (o.kind === 'gate' && !o.open && d < 6) text = G.powered ? 'Das Tor öffnet sich …' : 'Kein Strom. Der Generator braucht 3 Batterien.';
    else if (o.kind === 'door' && !o.open && !o.opening && d < 6) text = 'Verschlossen. Irgendwo muss ein Hebel mit dieser Farbe sein.';
  }
  if (isTouch) text = text.replace('[E] / ', '').replace('[E]', 'E:');
  hud.prompt.textContent = text;
  hud.cross.classList.toggle('hot', hot);
}

function interact() {
  if (P.hidden) { toggleLocker(); return; }
  const a = G.focus;
  if (!a || !a.obj) return;
  const o = a.obj;
  if (o.kind === 'locker' && a.dist < 2.8) toggleLocker(o);
  else if (o.kind === 'note' && a.dist < 3) openNote(o);
  else if (o.kind === 'generator' && a.dist < 5) {
    const h = hands.find(x => x.carrying);
    if (h && G.placed < 3) insertBattery(h);
  } else if (o.kind === 'battery' && !o.taken && a.dist < 2.6) {
    const h = hands.find(x => !x.carrying && x.state === 'idle');
    if (h) takeBattery(o, h, true);
  }
}

function takeBattery(b, h, direct) {
  b.taken = true; b.glow.visible = false;
  W.rayTargets = W.rayTargets.filter(m => m.userData.ref !== b);
  if (direct) {
    b.mesh.visible = false; h.carrying = b; h.carryBat.visible = true; audio.pickup();
    say(G.placed === 0 && !G.monsterAwake ? 'Eine Batterie! Bring sie zum Generator.' : 'Batterie eingesammelt. Zum Generator!', 3);
    objective('Bring die Batterie zum Generator.');
  } else h.grabbing = b;
  if (!G.monsterAwake) wakeMonster();
}

function fire(side) {
  if (P.hidden || G.mode !== 'playing') return;
  const h = hands[side];
  if (h.state !== 'idle') return;
  if (h.carrying) {
    const a = aim(5);
    if (a && a.obj && a.obj.kind === 'generator' && G.placed < 3) insertBattery(h);
    else say('Diese Hand hält eine Batterie. Bring sie zum Generator.', 2.5);
    return;
  }
  const a = aim(15);
  camera.getWorldDirection(_fwd);
  h.target.copy(a ? a.point : _v.copy(camera.position).addScaledVector(_fwd, 15));
  h.hit = a && a.obj && ['battery', 'lever'].includes(a.obj.kind) ? a.obj : null;
  h.pos.copy(camera.localToWorld(_v2.copy(h.muzzleLocal)));
  h.state = 'out'; h.kick = 1;
  h.hand.visible = false;
  h.world.visible = true; h.cable.visible = true;
  audio.grabFire();
  G.noise = { pos: P.pos.clone(), radius: 7, t: 0.2 };
}

const _up = new THREE.Vector3(0, 1, 0);
function updateHands(dt) {
  camera.updateMatrixWorld();
  for (const h of hands) {
    h.kick = Math.max(0, h.kick - dt * 4);
    const muzzle = camera.localToWorld(_v2.copy(h.muzzleLocal));
    if (h.state === 'out') {
      _v.subVectors(h.target, h.pos); const d = _v.length(), step = 42 * dt;
      if (d <= step) {
        h.pos.copy(h.target); h.state = 'back'; audio.grabHit();
        if (h.hit) {
          if (h.hit.kind === 'battery' && !h.hit.taken) takeBattery(h.hit, h, false);
          if (h.hit.kind === 'lever') pullLever(h.hit);
        }
        h.hit = null;
        audio.grabReturn();
      } else h.pos.addScaledVector(_v, step / d);
      h.world.lookAt(h.target); h.world.rotateY(Math.PI);
    } else if (h.state === 'back') {
      _v.subVectors(muzzle, h.pos); const d = _v.length(), step = 46 * dt;
      if (d <= Math.max(step, 0.25)) {
        h.state = 'idle'; h.world.visible = false; h.cable.visible = false; h.hand.visible = true;
        if (h.grabbing) {
          const b = h.grabbing; h.grabbing = null; b.mesh.visible = false; h.carrying = b; h.carryBat.visible = true;
          audio.pickup();
          say(G.placed === 0 && G.time < 200 ? 'Eine Batterie! Bring sie zum Generator.' : 'Batterie eingesammelt. Zum Generator!', 3);
          objective('Bring die Batterie zum Generator.');
        }
      } else h.pos.addScaledVector(_v, step / d);
      h.world.lookAt(muzzle);
    }
    if (h.state !== 'idle') {
      h.world.position.copy(h.pos);
      if (h.grabbing) { h.grabbing.mesh.position.copy(h.pos); h.grabbing.mesh.position.y -= 0.12; }
      // Kabel
      _v.subVectors(h.pos, muzzle); const len = _v.length();
      h.cable.position.copy(muzzle).addScaledVector(_v, 0.5);
      h.cable.scale.set(1, len, 1);
      h.cable.quaternion.setFromUnitVectors(_up, _v.normalize());
    }
    // Viewmodel-Bewegung
    const speed = Math.hypot(P.vel.x, P.vel.z);
    const bobA = P.hidden ? 0 : Math.min(1, speed / 4);
    h.vm.position.set(
      h.rest.x + Math.cos(P.bob) * 0.012 * bobA - vmSway.x,
      h.rest.y + Math.abs(Math.sin(P.bob)) * 0.014 * bobA - vmSway.y - (P.hidden ? 0.25 : 0),
      h.rest.z + h.kick * 0.07,
    );
  }
  vmSway.multiplyScalar(Math.pow(0.001, dt));
  vmSway.clampScalar(-0.05, 0.05);
}

// ======================================================================
//  Spieler
// ======================================================================
function updatePlayer(dt) {
  if (P.hidden) {
    const l = P.hidden;
    P.stamina = Math.min(100, P.stamina + dt * 20);
    camera.position.set(l.inside.x, EYE - 0.05 + Math.sin(G.time * 1.6) * 0.01, l.inside.z);
    camera.rotation.set(P.lookPitch, P.yaw + P.lookOffset, 0);
    G.noise = null;
    return;
  }
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  ix += touch.move.x; iz += touch.move.y;
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  const moving = il > 0.1;

  P.crouch = !!(keys.KeyC || touch.crouch);
  let sprint = !!(keys.ShiftLeft || keys.ShiftRight || touch.run) && moving && !P.crouch && !P.exhausted;
  if (sprint) { P.stamina -= 24 * dt; P.staminaDelay = 0.9; if (P.stamina <= 0) { P.stamina = 0; P.exhausted = true; sprint = false; } }
  else { P.staminaDelay -= dt; if (P.staminaDelay <= 0) P.stamina = Math.min(100, P.stamina + 17 * dt); if (P.stamina > 35) P.exhausted = false; }

  let speed = P.crouch ? 1.9 : sprint ? 6.4 : 3.6;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const tx = (fx * -iz + rx * ix) * speed, tz = (fz * -iz + rz * ix) * speed;
  const k = 1 - Math.exp(-11 * dt);
  P.vel.x += (tx - P.vel.x) * k; P.vel.z += (tz - P.vel.z) * k;
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
  collide(P.pos, PR);

  P.eye += ((P.crouch ? CROUCH_EYE : EYE) - P.eye) * (1 - Math.exp(-10 * dt));
  const v = Math.hypot(P.vel.x, P.vel.z);
  if (v > 0.4) {
    P.bob += dt * (4 + v * 1.25);
    const st = Math.floor(P.bob / Math.PI);
    if (st !== P.step) { P.step = st; audio.footstep(P.crouch ? 0.3 : sprint ? 1.3 : 0.75); }
  }
  const bobA = Math.min(1, v / 4) * (sprint ? 1.4 : 1);
  camera.position.set(
    P.pos.x + Math.cos(P.bob) * 0.03 * bobA * Math.cos(P.yaw),
    P.eye + Math.abs(Math.sin(P.bob)) * 0.06 * bobA,
    P.pos.z - Math.cos(P.bob) * 0.03 * bobA * Math.sin(P.yaw),
  );
  const shake = G.chase > 0.5 ? Math.max(0, 1 - M.pos.distanceTo(P.pos) / 10) * 0.01 : 0;
  camera.rotation.set(P.pitch + (Math.random() - 0.5) * shake, P.yaw + (Math.random() - 0.5) * shake, Math.cos(P.bob) * 0.006 * bobA);

  // Geräusche, die das Monster hören kann
  if (moving && sprint) G.noise = { pos: P.pos.clone(), radius: 17, t: 0 };
  else if (moving && !P.crouch && v > 2) { if (!G.noise || G.noise.radius < 6) G.noise = { pos: P.pos.clone(), radius: 5, t: 0 }; }

  // Ausgang erreicht?
  const [c, r] = toCell(P.pos.x, P.pos.z);
  if (W.exitCell && c === W.exitCell[0] && r === W.exitCell[1]) win();
}

function lightAt(pos) {
  let l = 0;
  for (const lamp of W.lamps) {
    const d = Math.hypot(lamp.pos.x - pos.x, lamp.pos.z - pos.z);
    if (d < 9) l += (1 - d / 9) * lamp.level;
  }
  return l;
}

// ======================================================================
//  Monster-KI
// ======================================================================
function monsterGoTo(cell) { M.target = cell; M.path = findPath(toCell(M.pos.x, M.pos.z), cell); }

function updateMonster(dt) {
  const toP = _v.subVectors(P.pos, M.pos); toP.y = 0;
  const dist = toP.length();
  const [mc, mr] = toCell(M.pos.x, M.pos.z);

  // ---- Wahrnehmung ----
  M.sees = false;
  if (M.state !== 'dormant' && !P.hidden && dist < 32 && los(M.pos, P.pos)) {
    const fwdAng = Math.atan2(toP.x, toP.z);
    let da = Math.abs(((fwdAng - M.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const lit = (G.flash ? 1 : 0) + lightAt(P.pos);
    let range = lit > 0.6 ? 24 : 11;
    if (P.crouch) range *= 0.6;
    if (M.state === 'chase') range = 32;
    if (dist < range && (da < 1.3 || dist < 4.5 || M.state === 'chase')) M.sees = true;
  }
  if (M.state !== 'dormant' && M.state !== 'chase') {
    if (M.sees) {
      M.aware += dt * (1.3 + 10 / Math.max(dist, 1));
      M.lookYaw = 0;
      if (M.aware >= 1) startChase();
    } else M.aware = Math.max(0, M.aware - dt * 0.25);
    if (G.noise && M.state !== 'chase') {
      const nd = G.noise.pos.distanceTo(M.pos);
      if (nd < G.noise.radius) { M.state = 'investigate'; monsterGoTo(toCell(G.noise.pos.x, G.noise.pos.z)); M.aware = Math.max(M.aware, 0.35); }
    }
  }

  // ---- Zustände ----
  let speed = 0, dest = null;
  if (M.state === 'dormant') {
    // steht still, der Kopf folgt dir …
    const want = dist < 20 && los(M.pos, P.pos) ? clamp(((Math.atan2(toP.x, toP.z) - M.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -1.2, 1.2) : 0;
    M.lookYaw += (want - M.lookYaw) * Math.min(1, dt * 1.5);
  } else if (M.state === 'patrol') {
    if (!M.path || !M.path.length) {
      M.wait -= dt;
      if (M.wait <= 0) {
        const [pc, pr] = toCell(P.pos.x, P.pos.z);
        const cell = Math.random() < 0.5 ? randomFloorNear(pc, pr, 5) : randomFloorNear(mc, mr, 8);
        monsterGoTo(cell); M.wait = 1 + Math.random() * 2.5;
      }
    }
    speed = 2.1;
  } else if (M.state === 'investigate') {
    speed = 3.2;
    if (!M.path || !M.path.length) { M.state = 'search'; M.search = 6; M.path = null; }
  } else if (M.state === 'search') {
    speed = 2.6;
    M.search -= dt;
    if (!M.path || !M.path.length) { const [lc, lr] = toCell(M.lastSeen.x, M.lastSeen.z); monsterGoTo(randomFloorNear(lc, lr, 3)); }
    if (M.search <= 0) { M.state = 'patrol'; monster.setAngry(false); M.path = null; }
  } else if (M.state === 'chase') {
    speed = G.powered ? 5.5 : 5.0;
    if (M.sees) { M.lastSeen.copy(P.pos); M.lost = 0; }
    else M.lost += dt * (P.hidden && !M.sawHide ? 2.5 : 1);
    if (P.hidden && M.sawHide) {
      // hat dich reinklettern sehen …
      const fr = P.hidden.front;
      if (M.pos.distanceTo(fr) < 3) dest = fr;
      else { M.pathT -= dt; if (M.pathT <= 0 || !M.path) { M.pathT = 0.3; monsterGoTo(toCell(fr.x, fr.z)); } }
      if (M.pos.distanceTo(fr) < 1.3) { die(); return; }
    } else if (M.lost > (G.powered ? 8 : 4)) {
      M.state = 'search'; M.search = 8; M.path = null;
      monsterGoTo(toCell(M.lastSeen.x, M.lastSeen.z));
      if (!G.powered) say('Es hat dich verloren … vorerst.', 3);
    } else if (M.sees && dist < 4) {
      dest = P.pos;
    } else {
      M.pathT -= dt;
      if (M.pathT <= 0 || !M.path) { M.pathT = 0.3; const tgt = G.powered || M.sees ? P.pos : M.lastSeen; monsterGoTo(toCell(tgt.x, tgt.z)); }
    }
    if (!P.hidden && dist < 1.3) { die(); return; }
  }

  // Hat dich bemerkt, ist sich aber noch nicht sicher: bleibt stehen und starrt
  if (M.sees && M.state !== 'chase' && M.state !== 'dormant') {
    const want = Math.atan2(toP.x, toP.z);
    const diff = ((want - M.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    M.yaw += clamp(diff, -3 * dt, 3 * dt);
    speed = 0; dest = null;
  }

  // ---- Bewegung ----
  if (!dest && M.path && M.path.length) {
    const [c, r] = M.path[0];
    dest = center(c, r);
    if (Math.hypot(dest.x - M.pos.x, dest.z - M.pos.z) < 0.4) { M.path.shift(); dest = M.path.length ? center(...M.path[0]) : null; }
  }
  if (dest && speed > 0) {
    const dx = dest.x - M.pos.x, dz = dest.z - M.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const want = Math.atan2(dx, dz);
      let diff = ((want - M.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      M.yaw += clamp(diff, -7 * dt, 7 * dt);
      const s = Math.min(d, speed * dt) * (Math.abs(diff) > 1.4 ? 0.3 : 1);
      M.pos.x += dx / d * s; M.pos.z += dz / d * s;
      collide(M.pos, 0.45);
    }
    M.speed += (speed - M.speed) * Math.min(1, dt * 5);
    // steckt fest?
    if (M.lastPos.distanceTo(M.pos) < speed * dt * 0.2) { M.stuck += dt; if (M.stuck > 1.2) { M.path = null; M.stuck = 0; } } else M.stuck = 0;
  } else M.speed *= Math.pow(0.02, dt);
  M.lastPos.copy(M.pos);
  if (M.state !== 'dormant' && M.state !== 'chase') M.lookYaw = Math.sin(G.time * 0.8) * 0.5;
  if (M.state === 'chase') M.lookYaw *= 0.9;

  // ---- Sound ----
  audio.setMonsterPos(_v2.set(M.pos.x, 2.8, M.pos.z));
  const stepIdx = Math.floor(monster.phase / Math.PI);
  if (stepIdx !== M.stepIdx) { M.stepIdx = stepIdx; if (M.speed > 0.3) audio.monsterStep(M.state === 'chase' ? 1.2 : 0.7); }
  if (M.state !== 'dormant') {
    M.growlT -= dt;
    if (M.growlT <= 0) { M.growlT = (M.state === 'chase' ? 3 : 7) + Math.random() * 8; audio.growl(M.state === 'chase' ? 1.2 : 0.6); }
    M.heartT -= dt;
    if (dist < 14 && M.heartT <= 0) { M.heartT = 0.45 + dist / 14 * 0.9; audio.heartbeat(clamp(1.2 - dist / 14, 0.2, 1)); }
  }
  G.chase = M.state === 'chase' ? 1 : M.state === 'search' ? 0.35 : 0;

  // ---- Modell ----
  monster.root.position.set(M.pos.x, 0, M.pos.z);
  monster.root.rotation.y = M.yaw;
  monster.animate(dt, M.speed, M.state === 'chase', M.lookYaw, 0);
}

function updateJumpscare(dt) {
  G.jsT += dt;
  camera.getWorldDirection(_fwd); _fwd.y = 0; _fwd.normalize();
  const lunge = clamp(G.jsT / 0.18, 0, 1);
  const dist = 2.6 - lunge * 1.35;
  monster.root.position.set(camera.position.x + _fwd.x * dist, camera.position.y - 3.05, camera.position.z + _fwd.z * dist);
  monster.root.rotation.y = Math.atan2(-_fwd.x, -_fwd.z);
  monster.spine.rotation.x = 0.35; monster.neck.rotation.set(-0.2, 0, 0);
  monster.head.rotation.z = Math.sin(G.jsT * 60) * 0.1;
  monster.arms.forEach((a, i) => { a.up.rotation.x = -1.6; a.up.rotation.z = (i ? 1 : -1) * 0.6; a.lo.rotation.x = -0.5; });
  const sh = G.jsT < 1.1 ? 0.05 : 0;
  camera.rotation.set(P.pitch * 0.9 + (Math.random() - 0.5) * sh, P.yaw + (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  P.pitch *= 0.9;
  if (G.jsT > 1.35) {
    G.mode = 'dead';
    unlock();
    $('damage').style.opacity = 0;
    const tips = [
      'Tipp: Brich die Sichtlinie ab und versteck dich in einem Spind – aber nicht, während es dich sieht.',
      'Tipp: Mach die Taschenlampe (F) aus, wenn Langbein in der Nähe ist. Im Dunkeln sieht es schlecht.',
      'Tipp: Rennen ist laut. Geduckt (C) schleichst du fast lautlos.',
      'Tipp: Dein Atem reicht nicht ewig. Renn nur, wenn es dich jagt.',
    ];
    $('deadTip').textContent = tips[Math.floor(Math.random() * tips.length)];
    showScreen('dead');
    $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
    audio.setAmbience(false);
  }
}

// ======================================================================
//  Welt-Updates: Lampen, Türen, Batterien
// ======================================================================
function updateWorld(dt) {
  for (const d of [...Object.values(W.doors), W.gate]) {
    if (d.opening && d.t < 1) {
      d.t = Math.min(1, d.t + dt / 2.2);
      d.mesh.position.y = WALL_H / 2 + (WALL_H - 0.35) * (1 - Math.pow(1 - d.t, 2));
      if (d.t > 0.55 && !d.open) { d.open = true; d.box.on = false; }
    }
  }
  for (const lv of W.levers) if (lv.pulled && lv.t < 1) { lv.t = Math.min(1, lv.t + dt * 4); lv.pivot.rotation.x = 0.5 + lv.t * 2.1; }
  const pulse = 1 + Math.sin(G.time * 4) * 0.35;
  MAT.batteryBody.emissiveIntensity = pulse;
  for (const b of W.batteries) if (!b.taken) { b.mesh.rotation.y += dt * 0.6; b.glow.intensity = 2.5 * pulse; }
}

const _lampSort = [];
function updateLights(dt) {
  if (!W) return;
  G.blackout = Math.max(0, G.blackout - dt);
  for (const l of W.lamps) {
    let lvl = 1;
    if (l.flicker) {
      l.ft -= dt;
      if (l.ft <= 0) { l.ft = Math.random() < 0.8 ? 0.05 + Math.random() * 0.12 : 1 + Math.random() * 4; l.fv = Math.random() < 0.45 ? Math.random() * 0.2 : 1; }
      lvl = l.fv ?? 1;
    }
    if (G.blackout > 0) lvl = G.blackout < 0.3 ? Math.random() : 0;
    l.level = lvl;
    l.bulbMat.color.copy(l.color).multiplyScalar(0.25 + lvl * 0.9);
    l.shaftMat.opacity = 0.045 * lvl;
  }
  const cp = camera.position;
  _lampSort.length = 0;
  for (const l of W.lamps) { l._d = (l.pos.x - cp.x) ** 2 + (l.pos.z - cp.z) ** 2; _lampSort.push(l); }
  _lampSort.sort((a, b) => a._d - b._d);
  W.lightPool.forEach((pl, i) => {
    const l = _lampSort[i];
    if (!l) { pl.intensity = 0; return; }
    pl.position.copy(l.pos); pl.color.copy(l.color);
    pl.intensity = l.base * l.level;
  });

  // Taschenlampe (flackert, wenn Langbein nah ist)
  let fl = G.flash && (G.mode === 'playing' || G.mode === 'jumpscare') ? 55 : 0;
  if (G.mode === 'menu') fl = 30;
  const md = M.pos.distanceTo(P.pos);
  if (fl && G.monsterAwake && md < 9 && Math.random() < 0.12) fl *= Math.random() * 0.3;
  flashlight.intensity = fl;

  // Viewmodel-Helligkeit an Umgebung anpassen
  const env = Math.min(1.2, lightAt(camera.position));
  vmHemi.intensity = 0.12 + env * 0.5;
  vmKey.intensity = G.flash ? 1.3 : 0.15;
}

// ======================================================================
//  Menü-Kamera: Blick auf den schlafenden Langbein
// ======================================================================
const menuCam = { t: 0 };
function updateMenu(dt) {
  menuCam.t += dt;
  const mp = W.monsterStart;
  camera.position.set(mp.x + Math.sin(menuCam.t * 0.12) * 0.6, 1.7 + Math.sin(menuCam.t * 0.5) * 0.03, mp.z + 11.5);
  camera.lookAt(mp.x, 2.3, mp.z);
  M.pos.copy(mp); M.yaw = 0;
  monster.root.position.set(mp.x, 0, mp.z); monster.root.rotation.y = 0;
  monster.animate(dt, 0, false, Math.sin(menuCam.t * 0.3) * 0.3, 0);
  P.pos.copy(camera.position);
}

// ======================================================================
//  Bildschirme
// ======================================================================
const screens = ['menu', 'controls', 'settings', 'pause', 'dead', 'win', 'loading'];
function showScreen(id) { screens.forEach(s => $(s).classList.toggle('hidden', s !== id)); }

function pause() {
  if (G.mode !== 'playing') return;
  G.mode = 'paused'; unlock(); showScreen('pause');
  audio.ctx?.suspend();
}
function resume() {
  showScreen(null); G.mode = 'playing'; lockPointer(); audio.ctx?.resume();
}
function toMenu() {
  unlock(); audio.alarm = false; audio.setAmbience(false); audio.ctx?.resume();
  resetGame(); G.mode = 'menu';
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  showScreen('menu');
}

let lastScreen = 'menu';
$('btnPlay').onclick = () => startGame();
$('btnControls').onclick = () => { lastScreen = 'menu'; showScreen('controls'); };
$('btnSettings').onclick = () => { lastScreen = 'menu'; showScreen('settings'); };
document.querySelectorAll('.back').forEach(b => b.onclick = () => showScreen(lastScreen));
$('btnResume').onclick = resume;
$('btnRestart').onclick = () => { audio.ctx?.resume(); startGame(); };
$('btnQuit').onclick = toMenu;
$('btnRetry').onclick = () => startGame();
document.querySelectorAll('.toMenu').forEach(b => b.onclick = toMenu);

$('sens').value = settings.sens; $('vol').value = settings.vol; $('quality').value = settings.quality;
$('sens').oninput = e => { settings.sens = +e.target.value; saveSettings(); };
$('vol').oninput = e => { settings.vol = +e.target.value; audio.setVolume(settings.vol); saveSettings(); };
$('quality').onchange = e => { settings.quality = e.target.value; saveSettings(); applyQuality(true); };

function applyQuality(rebuild) {
  const q = settings.quality, dpr = devicePixelRatio || 1;
  renderer.setPixelRatio(q === 'low' ? Math.min(dpr, 1) * 0.75 : q === 'mid' ? Math.min(dpr, 1.35) : Math.min(dpr, 2));
  const shadows = q !== 'low';
  if (renderer.shadowMap.enabled !== shadows) {
    renderer.shadowMap.enabled = shadows;
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
  }
  flashlight.shadow.mapSize.set(q === 'high' ? 1024 : 512, q === 'high' ? 1024 : 512);
  flashlight.shadow.map?.dispose(); flashlight.shadow.map = null;
  if (rebuild && G.mode === 'menu') resetGame();
  resize();
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = vmCam.aspect = w / h;
  camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ======================================================================
//  Filmkorn
// ======================================================================
const grain = $('grain'), gctx = grain.getContext('2d');
grain.width = 160; grain.height = 100;
const gimg = gctx.createImageData(160, 100);
let grainT = 0;
function updateGrain(dt) {
  grainT -= dt; if (grainT > 0) return; grainT = 0.05;
  const d = gimg.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  gctx.putImageData(gimg, 0, 0);
}

// Staub in der Luft (Weltkoordinaten, wird um die Kamera herumgewickelt)
const DUST = 350, dustPos = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) { dustPos[i * 3] = Math.random() * 16; dustPos[i * 3 + 1] = Math.random() * WALL_H; dustPos[i * 3 + 2] = Math.random() * 16; }
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xb8a890, size: 0.025, transparent: true, opacity: 0.55, depthWrite: false }));
dust.frustumCulled = false;
scene.add(dust);
function updateDust(dt) {
  const cx = camera.position.x, cz = camera.position.z, t = performance.now() / 1000;
  for (let i = 0; i < DUST; i++) {
    const j = i * 3;
    dustPos[j + 1] -= dt * 0.05;
    if (dustPos[j + 1] < 0) dustPos[j + 1] += WALL_H;
    dustPos[j] += Math.sin(t * 0.3 + i) * dt * 0.03;
    if (dustPos[j] - cx > 8) dustPos[j] -= 16; else if (dustPos[j] - cx < -8) dustPos[j] += 16;
    if (dustPos[j + 2] - cz > 8) dustPos[j + 2] -= 16; else if (dustPos[j + 2] - cz < -8) dustPos[j + 2] += 16;
  }
  dustGeo.attributes.position.needsUpdate = true;
}

// ======================================================================
//  Hauptschleife
// ======================================================================
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  tick(Math.min(clock.getDelta(), 0.05));
  renderer.clear();
  renderer.render(scene, camera);
  if (G.mode === 'playing' || G.mode === 'note') {
    renderer.clearDepth();
    renderer.render(vmScene, vmCam);
  }
}

function tick(dt) {
  if (G.mode === 'playing') {
    G.time += dt;
    for (let i = G.events.length - 1; i >= 0; i--) if (G.time >= G.events[i].t) { const e = G.events[i]; G.events.splice(i, 1); e.fn(); }
    updatePlayer(dt);
    if (G.mode === 'playing') updateHands(dt);
    if (G.mode === 'playing') updateMonster(dt);
    updateWorld(dt);
    if (G.mode === 'playing') updateFocus();
    if (G.noise) { G.noise.t -= dt; if (G.noise.t < 0) G.noise = null; }
    subTimer -= dt; if (subTimer <= 0) hud.sub.style.opacity = 0;
    hud.stamina.style.width = P.stamina + '%';
    hud.staminaWrap.style.opacity = P.stamina < 99 ? 1 : 0;
    hud.stamina.style.background = P.exhausted ? '#c0392b' : '#e8e2d6';
    hud.hidden.classList.toggle('on', !!P.hidden);
    hud.flash.classList.toggle('on', G.flash);
  } else if (G.mode === 'jumpscare') {
    updateJumpscare(dt);
  } else if (G.mode === 'menu') {
    updateMenu(dt);
  }

  updateLights(dt);
  updateDust(dt);
  updateGrain(dt);
  audio.update(dt, { chase: G.mode === 'playing' ? G.chase : 0, playing: G.mode === 'playing', menu: G.mode === 'menu' });
  camera.getWorldDirection(_fwd);
  audio.setListener(camera.position, _fwd);
}

// ======================================================================
//  Start
// ======================================================================
applyQuality(false);
resetGame();
G.mode = 'menu';
showScreen('menu');
frame();
// Menü-Musik erst nach der ersten Berührung (Browser-Regel)
const firstTouch = () => { audio.init(); audio.setVolume(settings.vol); removeEventListener('pointerdown', firstTouch); };
addEventListener('pointerdown', firstTouch);

// Für Tests / Debug
window.__pp6 = { G, P, M, W: () => W, hands, camera, fire, interact, aim, simulate: (sec) => { for (let t = 0; t < sec; t += 1 / 60) { scene.updateMatrixWorld(); tick(1 / 60); } } };
