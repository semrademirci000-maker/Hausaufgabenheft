import * as THREE from 'three';
import { MAP } from './map.js';
import { AudioEngine } from './audio.js';
import * as TX from './textures.js';
import { MonsterModel } from './monster.js';
import { TailorModel, makeMilaDoll, makeMiniZipper } from './characters.js';
import { buildMenuStage } from './menuStage.js';
import { EffectComposer } from './vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from './vendor/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from './vendor/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from './vendor/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/jsm/geometries/RoundedBoxGeometry.js';

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

const NOTES_PART2 = [
  { title: 'Aushang Nähstube', body: 'Hier werden die Neuen zusammengenäht.\nNur mit Schlüsselkarte in den Aufzug!\n\nKarte NIEMALS aus dem Kartenraum nehmen,\nsolange die Lüftung offen ist.' },
  { title: 'Tagebuch einer Näherin', body: 'Heute hat Zipper durch das Lüftungsgitter geschaut.\nEr hat gelächelt. Mit dem Reißverschluss.\n\nThe Tailor sagt, er passt überall durch.\nEr ist ja nur aus Stoff.' },
  { title: 'Zettel am Aufzug', body: 'Wenn du das liest: Du bist fast draußen.\nKarte an die gelbe Tür halten, dann rein in den Aufzug.\n\nUnd dreh dich nicht um. – M.' },
];
const NOTES = [
  { title: 'Verlegungsbericht – Zelle 0', body: 'The Tailor wurde in die Sicherheitszelle auf Ebene 9 verlegt.\nDie Gitter halten. Vorerst.\n\nEr hat die Spielzeuge hier unten zusammengenäht. Er zieht ihre Fäden.\nNiemand geht allein an seinem Käfig vorbei.' },
  { title: 'Versuchsreihe G-7 – Zipper', body: 'Ursprünglich ein Kuscheltier mit Reißverschluss-Mund, 60 cm.\nNach der Behandlung: 3,2 m. Finger aus Nähnadeln.\n\nReagiert auf Licht und schnelle Bewegungen.\nEr sieht schlecht im Dunkeln – Taschenlampe AUS, wenn er in der Nähe ist.' },
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
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
TX.setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030304);
scene.fog = new THREE.FogExp2(0x100a07, 0.046); // warmer, staubiger Dunst
scene.environment = envMap;

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 120);
camera.rotation.order = 'YXZ';
scene.add(camera);
const hemi = new THREE.HemisphereLight(0x9a8a78, 0x1a1008, 0.2);
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

// Viewmodel (Gripper) in eigener Szene, damit es nie in Wände ragt
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.01, 10);
vmScene.add(vmCam);
const vmHemi = new THREE.HemisphereLight(0xaab0c8, 0x201810, 0.5);
vmScene.add(vmHemi);
vmScene.environment = envMap;
const vmKey = new THREE.PointLight(0xfff0d8, 0.8, 3, 2);
vmKey.position.set(0.2, 0.25, 0.1);
vmCam.add(vmKey);

const audio = new AudioEngine();
audio.volume = settings.vol;

// ======================================================================
//  Materialien (einmal erzeugt, in allen Durchläufen wiederverwendet)
// ======================================================================
const MAT = {
  // Wandtypen: Tapete, bemalte Holzbretter (Spielhalle), Beton
  walls: [TX.wallTexture(0), TX.plankWallTexture(0), TX.concreteTexture(), TX.plankWallTexture(1), TX.wallTexture(1), TX.plankWallTexture(2)]
    .map(t => new THREE.MeshStandardMaterial({ map: t, normalMap: TX.normalFrom(t, 3.5), roughnessMap: TX.roughFrom(t, 0.85, 0.3), envMapIntensity: 0.25 })),
  paper: new THREE.MeshStandardMaterial({ map: TX.paperTexture(), roughness: 0.95, side: THREE.DoubleSide, emissive: 0x14100a }),
  mat: (() => { const t = TX.matTexture(); return new THREE.MeshStandardMaterial({ map: t, normalMap: TX.normalFrom(t, 2), roughness: 0.75 }); })(),
  rigFrame: new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.5, metalness: 0.8 }),
  floor: (() => { const t = TX.floorTexture(COLS, ROWS); return new THREE.MeshStandardMaterial({ map: t, normalMap: TX.normalFrom(t, 4), roughnessMap: TX.roughFrom(t, 0.55, 0.9), metalness: 0.05, envMapIntensity: 0.6 }); })(),
  ceil: new THREE.MeshStandardMaterial({ map: TX.ceilingTexture(COLS, ROWS), roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ map: TX.woodTexture(), roughness: 0.9 }),
  metal: (() => { const t = TX.metalTexture('#5d6266'); return new THREE.MeshStandardMaterial({ map: t, normalMap: TX.normalFrom(t, 2), roughness: 0.5, metalness: 0.7 }); })(),
  keyDoor: (() => { const t = TX.metalTexture('#8a7a1c', true, 'KARTE'); return new THREE.MeshStandardMaterial({ map: t, normalMap: TX.normalFrom(t, 2), roughness: 0.5, metalness: 0.6 }); })(),
  door: (() => { const t = TX.metalTexture('#565b5f', true); return new THREE.MeshStandardMaterial({ map: t, normalMap: TX.normalFrom(t, 2), roughness: 0.55, metalness: 0.6 }); })(),
  beam: new THREE.MeshStandardMaterial({ color: 0x3d4247, roughness: 0.45, metalness: 0.85 }),
  hazard: new THREE.MeshStandardMaterial({ map: TX.metalTexture('#222', true), roughness: 0.6, metalness: 0.4 }),
  vent: new THREE.MeshStandardMaterial({ map: TX.ventTexture(), roughness: 0.5, metalness: 0.7 }),
  belt: new THREE.MeshStandardMaterial({ map: TX.beltTexture(), roughness: 0.8 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 0.8, depthWrite: false }),
  cageBar: new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.35, metalness: 0.9 }),
  shutter: new THREE.MeshStandardMaterial({ map: TX.shutterTexture(), roughness: 0.6, metalness: 0.4 }),
  gen: new THREE.MeshStandardMaterial({ map: TX.metalTexture('#4a5a50', true, 'GEN-06'), roughness: 0.5, metalness: 0.6 }),
  locker: new THREE.MeshStandardMaterial({ map: TX.lockerTexture(), roughness: 0.55, metalness: 0.5 }),
  lockerSide: new THREE.MeshStandardMaterial({ color: 0x33483b, roughness: 0.6, metalness: 0.5 }),
  note: new THREE.MeshStandardMaterial({ map: TX.noteTexture(), emissive: 0x332a18, roughness: 1, side: THREE.DoubleSide }),
  pipe: new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.5, metalness: 0.7 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7, metalness: 0.4 }),
  shade: new THREE.MeshStandardMaterial({ color: 0x2a2d2a, emissive: 0x3a2a14, roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide }),
  puddle: new THREE.MeshPhysicalMaterial({ color: 0x1a1816, roughness: 0.02, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false, envMapIntensity: 1.2 }),
  posters: [0, 1, 2].map(k => new THREE.MeshStandardMaterial({ map: TX.posterTexture(k), roughness: 0.95, transparent: true, alphaTest: 0.5 })),
  shaft: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }),
  batteryBody: new THREE.MeshStandardMaterial({ color: 0x2a6cff, emissive: 0x1b4dff, emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.3 }),
  batteryCap: new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.9 }),
};
const GLOW = TX.glowTexture();
const SCRAWLS = ['LAUF', 'ES LÄCHELT', 'NICHT RENNEN'].map(t => new THREE.MeshBasicMaterial({ map: TX.scrawlTexture(t), transparent: true, depthWrite: false, fog: true }));

// ======================================================================
//  Bausteine
// ======================================================================
// Gripper-Hand: glänzendes Plastik, abgerundete Finger mit zwei Gliedern
const handGeo = {
  palm: new RoundedBoxGeometry(0.1, 0.038, 0.11, 3, 0.016),
  seg1: new THREE.CapsuleGeometry(0.0125, 0.034, 6, 12),
  seg2: new THREE.CapsuleGeometry(0.012, 0.03, 6, 12),
};
function makeHand(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.12, sheen: 0.3, sheenColor: new THREE.Color(color) });
  g.add(new THREE.Mesh(handGeo.palm, mat));
  const lens = [1, 1.1, 1.05, 0.88];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    f.position.set((i - 1.5) * 0.025, -0.002, -0.052); f.rotation.y = (i - 1.5) * -0.07; f.rotation.x = 0.12;
    const a = new THREE.Mesh(handGeo.seg1, mat); a.rotation.x = Math.PI / 2; a.position.z = -0.024 * lens[i]; a.scale.y = lens[i]; f.add(a);
    const k = new THREE.Group(); k.position.z = -0.05 * lens[i]; k.rotation.x = 0.25; f.add(k);
    const b = new THREE.Mesh(handGeo.seg2, mat); b.rotation.x = Math.PI / 2; b.position.z = -0.02 * lens[i]; b.scale.y = lens[i]; k.add(b);
    g.add(f);
  }
  const t = new THREE.Group(); t.position.set(0.052, -0.004, 0.0); t.rotation.y = -0.85; t.rotation.z = 0.2;
  const ta = new THREE.Mesh(handGeo.seg1, mat); ta.rotation.x = Math.PI / 2; ta.position.z = -0.028; t.add(ta);
  g.add(t);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.05, 16), MAT.batteryCap);
  cuff.rotation.x = Math.PI / 2; cuff.position.z = 0.075; g.add(cuff);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.006, 8, 20), new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.4, metalness: 0.8 }));
  ring.position.z = 0.055; g.add(ring);
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
  // Süden zuerst: Generator, Start und Käfig schauen möglichst in den Raum „nach unten“
  for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const k = ch(c + dx, r + dz); if (k !== '#' && k !== 'G') return [dx, dz]; }
  return [0, 1];
}
const yawFacing = (dx, dz) => Math.atan2(dx, dz); // Objekt schaut in Richtung (dx,dz)

// ======================================================================
//  Welt aufbauen
// ======================================================================
let W = null;

// Die Umgebungsreflexion (RoomEnvironment) ist hell – für den Horror stark abdunkeln
const ENV_SCALE = 0.1;
function tuneEnv(root, scale = ENV_SCALE) {
  root.traverse(o => {
    if (!o.material) return;
    for (const m of [].concat(o.material)) {
      if (m.userData.envTuned || !('envMapIntensity' in m)) continue;
      m.userData.envTuned = true; m.envMapIntensity *= scale;
    }
  });
}

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
    rayTargets: [], gen: null, gate: null, exitCell: null, part2Cell: null, key: null, vent: null, start: null, startYaw: 0, monsterStart: null, lightPool: [], beams: [], proto: null, papers: [], planks: [],
  };
  const addBox = (x0, x1, z0, z1) => { const b = { x0, x1, z0, z1, on: true }; w.boxes.push(b); return b; };
  const ref = (mesh, obj) => { mesh.userData.ref = obj; w.rayTargets.push(mesh); };

  // --- Wände (instanziert, drei Tapeten-Varianten nach Bereich) ---
  const wallCells = MAT.walls.map(() => []);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== '#') continue;
    let near = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = MAP[r + dz]?.[c + dx]; if (k && k !== '#') near = true; }
    if (!near) continue;
    wallCells[(Math.floor(c / 6) + Math.floor(r / 5) * 2) % MAT.walls.length].push([c, r]);
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
    if (k === 'L' || k === 'F') {
      const warm = rng() < 0.25 ? 0xff4a30 : 0xffa860; // meist orange, manchmal rot – wie in den Spielhallen
      const lamp = { pos: new THREE.Vector3(cc.x, WALL_H - 0.75, cc.z), level: 1, flicker: k === 'L' && rng() < 0.35, base: k === 'F' ? 26 : 22, color: new THREE.Color(k === 'F' ? 0xbfffd8 : warm), ft: 0, glows: [] };
      const corridor = (ch(c - 1, r) === '#' && ch(c + 1, r) === '#') || (ch(c, r - 1) === '#' && ch(c, r + 1) === '#');
      const rig = k === 'L' && !corridor;
      lamp.bulbMat = new THREE.MeshBasicMaterial({ color: lamp.color.clone() });
      const addGlow = (x, y, z, size) => {
        const m = new THREE.SpriteMaterial({ map: GLOW, color: lamp.color.clone(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 });
        const sp = new THREE.Sprite(m); sp.position.set(x, y, z); sp.scale.setScalar(size); group.add(sp); lamp.glows.push(m);
      };
      if (rig) {
        // Flutlicht-Gestell mit vier runden Scheinwerfern (wie in den großen Werkshallen)
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.08), MAT.rigFrame); frame.position.set(cc.x, WALL_H - 0.45, cc.z); group.add(frame);
        const frame2 = frame.clone(); frame2.position.y = WALL_H - 0.95; group.add(frame2);
        for (const sx of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), MAT.rigFrame); post.position.set(cc.x + sx * 0.62, WALL_H - 0.7, cc.z); group.add(post);
          const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45), MAT.dark); hang.position.set(cc.x + sx * 0.5, WALL_H - 0.22, cc.z); group.add(hang);
        }
        for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
          const lg = new THREE.Group(); lg.position.set(cc.x + sx * 0.3, WALL_H - 0.7 + sy * 0.2, cc.z); lg.rotation.x = 0.9; group.add(lg);
          const can = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.16, 20, 1, true), MAT.rigFrame); can.material.side = THREE.DoubleSide; lg.add(can);
          const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), lamp.bulbMat); lens.rotation.x = Math.PI / 2; lens.position.y = -0.07; lg.add(lens);
          const lens2 = lens.clone(); lens2.rotation.x = -Math.PI / 2; lg.add(lens2);
          addGlow(cc.x + sx * 0.3, WALL_H - 0.78 + sy * 0.2, cc.z, 1.3);
        }
        lamp.pos.y = WALL_H - 1.0; lamp.base = 16;
      }
      if (k === 'L' && !rig) {
        // Industrielampe mit Schirm und Drahtkorb
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.4, 24, 1, true), MAT.shade);
        shade.position.set(cc.x, WALL_H - 0.55, cc.z); group.add(shade);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 6, 24), MAT.beam);
        rim.rotation.x = Math.PI / 2; rim.position.set(cc.x, WALL_H - 0.75, cc.z); group.add(rim);
        const cageRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 4, 16), MAT.beam);
        cageRing.rotation.x = Math.PI / 2; cageRing.position.set(cc.x, WALL_H - 0.93, cc.z); group.add(cageRing);
        for (let i = 0; i < 4; i++) {
          const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 4), MAT.beam);
          const a = i * Math.PI / 2; wire.position.set(cc.x + Math.cos(a) * 0.19, WALL_H - 0.82, cc.z + Math.sin(a) * 0.19);
          group.add(wire);
        }
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35), MAT.dark);
        cord.position.set(cc.x, WALL_H - 0.18, cc.z); group.add(cord);
      }
      if (!rig) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lamp.bulbMat);
        bulb.position.copy(lamp.pos).y += 0.05; group.add(bulb);
        addGlow(lamp.pos.x, lamp.pos.y, lamp.pos.z, 2.2);
      }
      lamp.shaftMat = MAT.shaft.clone();
      if (!rig) {
        const shaft = new THREE.Mesh(new THREE.ConeGeometry(1.5, WALL_H - 0.8, 20, 1, true), lamp.shaftMat);
        shaft.position.set(cc.x, (WALL_H - 0.8) / 2, cc.z); group.add(shaft);
      }
      w.lamps.push(lamp);
    }

    // ----- Müll und Trümmer am Boden (verlassene Spielhalle) -----
    if (k !== '#' && k !== 'O' && k !== 'G' && !'123EZF'.includes(k)) {
      const n = Math.floor(rng() * 7);
      for (let i = 0; i < n; i++) w.papers.push([cc.x + (rng() - 0.5) * 3.6, cc.z + (rng() - 0.5) * 3.6, rng() * 6.28, rng()]);
      if (rng() < 0.35) for (let i = 0; i < 1 + rng() * 2; i++) w.planks.push([cc.x + (rng() - 0.5) * 3, cc.z + (rng() - 0.5) * 3, rng() * 6.28, rng()]);
      if (k === '.' && rng() < 0.07) {
        // Holzpalette
        const pg = new THREE.Group(); pg.position.set(cc.x + (rng() - 0.5) * 2, 0, cc.z + (rng() - 0.5) * 2); pg.rotation.y = rng() * 3;
        for (let i = 0; i < 5; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.16), MAT.wood); sl.position.set(0, 0.14, (i - 2) * 0.25); sl.castShadow = sl.receiveShadow = true; pg.add(sl); }
        for (let i = 0; i < 3; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.1), MAT.wood); bl.position.set(0, 0.06, (i - 1) * 0.5); pg.add(bl); }
        group.add(pg);
      }
      if (k === '.' && rng() < 0.08) {
        // umgekippte Spielmatte
        const m = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.25, 1.6, 3, 0.1), MAT.mat);
        m.position.set(cc.x + (rng() - 0.5) * 2, 0.13, cc.z + (rng() - 0.5) * 2);
        m.rotation.set(0, rng() * 3, (rng() - 0.5) * 0.08);
        m.castShadow = m.receiveShadow = true; group.add(m);
      }
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
    if ('123EZ'.includes(k)) {
      const alongX = ch(c - 1, r) === '#' && ch(c + 1, r) === '#';
      const geo = alongX ? new THREE.BoxGeometry(CELL, WALL_H, 0.35) : new THREE.BoxGeometry(0.35, WALL_H, CELL);
      const mesh = new THREE.Mesh(geo, k === 'E' ? MAT.shutter : k === 'Z' ? MAT.keyDoor : MAT.door);
      mesh.position.set(cc.x, WALL_H / 2, cc.z); mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      const box = alongX ? addBox(cc.x - 2, cc.x + 2, cc.z - 0.2, cc.z + 0.2) : addBox(cc.x - 0.2, cc.x + 0.2, cc.z - 2, cc.z + 2);
      const indMat = new THREE.MeshBasicMaterial({ color: k === 'E' ? 0xff2020 : k === 'Z' ? 0xffd21a : DOOR_COLORS[k] });
      const ind = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.5 : 0.4, 0.18, alongX ? 0.4 : 0.5), indMat);
      ind.position.set(cc.x, WALL_H - 0.3, cc.z); group.add(ind);
      // Türrahmen mit Warnstreifen
      for (const s2 of [-1, 1]) {
        const post = new THREE.Mesh(alongX ? new THREE.BoxGeometry(0.3, WALL_H, 0.7) : new THREE.BoxGeometry(0.7, WALL_H, 0.3), MAT.hazard);
        const px = alongX ? cc.x + s2 * 1.85 : cc.x, pz = alongX ? cc.z : cc.z + s2 * 1.85;
        post.position.set(px, WALL_H / 2, pz); post.castShadow = post.receiveShadow = true; group.add(post);
        alongX ? addBox(px - 0.15, px + 0.15, pz - 0.35, pz + 0.35) : addBox(px - 0.35, px + 0.35, pz - 0.15, pz + 0.15);
      }
      const d = { kind: k === 'E' ? 'gate' : k === 'Z' ? 'keydoor' : 'door', id: k, mesh, box, open: false, opening: false, t: 0, indMat };
      ref(mesh, d);
      if (k === 'E') w.gate = d; else w.doors[k] = d;
    }
    if (k === 'X') w.part2Cell = [c, r];
    if (k === 'F') {
      // Aufzug: Metallkabine mit offener Schiebetür, das Ziel von Kapitel 1
      w.exitCell = [c, r];
      const lift = new THREE.Group(); lift.position.copy(cc); group.add(lift);
      for (const sx of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.15, WALL_H - 0.4, 3.4), MAT.metal); side.position.set(sx * 1.7, (WALL_H - 0.4) / 2, 0); lift.add(side);
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(3.4, WALL_H - 0.4, 0.15), MAT.metal); back.position.set(0, (WALL_H - 0.4) / 2, 1.7); lift.add(back);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshBasicMaterial({ map: TX.metalTexture('#1c5a2e', false, 'AUFZUG'), color: 0xbfffcf }));
      sign.position.set(0, WALL_H - 0.7, -1.7); sign.rotation.y = Math.PI; lift.add(sign);
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x40ff90).multiplyScalar(2) }));
      arrow.position.set(0, WALL_H - 1.2, -1.65); lift.add(arrow);
    }
    // ----- Schlüsselkarte -----
    if (k === 'Q') {
      const [dx, dz] = wallDir(c, r);
      const px = cc.x + dx * 1.1, pz = cc.z + dz * 1.1;
      const table = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), MAT.wood);
      table.position.set(px, 0.45, pz); table.castShadow = table.receiveShadow = true; group.add(table);
      addBox(px - 0.5, px + 0.5, pz - 0.5, pz + 0.5); w.rayTargets.push(table);
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.22), new THREE.MeshStandardMaterial({ color: 0xffd21a, emissive: 0xffb000, emissiveIntensity: 0.9, roughness: 0.4 }));
      card.position.set(px, 1.0, pz); card.rotation.y = 0.4; group.add(card);
      const glow = new THREE.PointLight(0xffc830, 2.5, 3.5, 2); glow.position.set(px, 1.4, pz); group.add(glow);
      const key = { kind: 'key', mesh: card, glow, taken: false };
      ref(card, key); w.key = key;
    }
    // ----- Lüftungsschacht, aus dem Zipper kommt -----
    if (k === 'V') {
      const [dx, dz] = wallDir(c, r);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), MAT.vent);
      v.position.set(cc.x + dx * (CELL / 2 - 0.02), 0.8, cc.z + dz * (CELL / 2 - 0.02)); v.rotation.y = yawFacing(-dx, -dz);
      group.add(v); w.vent = { pos: cc.clone(), mesh: v, dir: [dx, dz] };
    }

    // ----- Hebel -----
    if ('abc'.includes(k)) {
      const [dx, dz] = wallDir(c, r);
      const lg = new THREE.Group();
      // direkt neben die passende Tür rücken (wie im echten Spiel)
      const nd = DIRS.find(([ex, ez]) => ch(c + ex, r + ez) === LEVER_DOOR[k]) || [0, 0];
      lg.position.set(cc.x + dx * (CELL / 2 - 0.06) + nd[0] * 1.45, 1.35, cc.z + dz * (CELL / 2 - 0.06) + nd[1] * 1.45);
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
      const n = { kind: 'note', idx: noteIdx++, mesh: m, read: false };
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
        else if (rng() < 0.45) {
          const toy = makeMiniZipper(rng() < 0.5 ? 0x5a2a7a : 0x23706e); toy.position.set(px, s, pz); toy.rotation.y = yawFacing(-dx, -dz) + (rng() - 0.5); toy.scale.setScalar(1.3); group.add(toy);
        }
        addBox(px - s / 2, px + s / 2, pz - s / 2, pz + s / 2);
      }
      if (walls.length && rng() < 0.16) {
        const [dx, dz] = walls[Math.floor(rng() * walls.length)];
        const p = new THREE.Mesh(posterGeo, MAT.posters[Math.floor(rng() * 3)]);
        p.position.set(cc.x + dx * (CELL / 2 - 0.015), 2.1, cc.z + dz * (CELL / 2 - 0.015));
        p.rotation.y = yawFacing(-dx, -dz); p.rotation.z = (rng() - 0.5) * 0.12;
        group.add(p);
      }
      if (walls.length && rng() < 0.12) {
        // Lüftungsgitter unten an der Wand
        const [dx, dz] = walls[Math.floor(rng() * walls.length)];
        const v = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6), MAT.vent);
        v.position.set(cc.x + dx * (CELL / 2 - 0.012), 0.45, cc.z + dz * (CELL / 2 - 0.012));
        v.rotation.y = yawFacing(-dx, -dz); group.add(v);
      }
      if (walls.length === 2 && rng() < 0.18) {
        // Förderband entlang der Wand (typisch für die Spielzeugfabrik)
        const [dx, dz] = walls[0];
        const along = dx !== 0 ? 'z' : 'x';
        const bx = cc.x + dx * 1.45, bz = cc.z + dz * 1.45;
        const frame = new THREE.Mesh(along === 'z' ? new THREE.BoxGeometry(0.9, 0.75, CELL) : new THREE.BoxGeometry(CELL, 0.75, 0.9), MAT.beam);
        frame.position.set(bx, 0.375, bz); frame.castShadow = frame.receiveShadow = true; group.add(frame);
        const belt = new THREE.Mesh(new THREE.PlaneGeometry(0.8, CELL), MAT.belt);
        belt.rotation.x = -Math.PI / 2; if (along === 'x') belt.rotation.z = Math.PI / 2;
        belt.position.set(bx, 0.76, bz); group.add(belt);
        for (let i = 0; i < 2; i++) {
          const toy = rng() < 0.5 ? makeMiniZipper(rng() < 0.5 ? 0x5a2a7a : 0x8a3a2a) : new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.3, 0.3, 2, 0.04), new THREE.MeshStandardMaterial({ color: [0xd23a3a, 0x3a6ad2, 0xe8c040][Math.floor(rng() * 3)], roughness: 0.5 }));
          const o = (i - 0.5) * 1.8 + (rng() - 0.5);
          toy.position.set(bx + (along === 'x' ? o : 0), 0.76 + (toy.isMesh ? 0.15 : 0), bz + (along === 'z' ? o : 0));
          toy.rotation.y = rng() * 6; group.add(toy);
        }
        along === 'z' ? addBox(bx - 0.45, bx + 0.45, cc.z - 2, cc.z + 2) : addBox(cc.x - 2, cc.x + 2, bz - 0.45, bz + 0.45);
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

    // ----- Käfig mit The Tailor -----
    if (k === 'O') {
      for (const [dx, dz] of DIRS) {
        if (ch(c + dx, r + dz) === '#') continue;
        for (let i = 0; i < 11; i++) {
          const o = -1.8 + i * 0.36;
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, WALL_H, 8), MAT.cageBar);
          bar.position.set(cc.x + dx * 1.95 + (dz ? o : 0), WALL_H / 2, cc.z + dz * 1.95 + (dx ? o : 0));
          bar.castShadow = true; group.add(bar);
        }
        for (const y of [0.1, 2.2, WALL_H - 0.1]) {
          const rail = new THREE.Mesh(dx ? new THREE.BoxGeometry(0.12, 0.12, CELL) : new THREE.BoxGeometry(CELL, 0.12, 0.12), MAT.cageBar);
          rail.position.set(cc.x + dx * 1.95, y, cc.z + dz * 1.95); group.add(rail);
        }
      }
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshStandardMaterial({ map: TX.metalTexture('#8a1a1a', false, 'ZELLE 0'), roughness: 0.6 }));
      const [ox, oz] = openDir(c, r);
      sign.position.set(cc.x + ox * 2.05, 2.8, cc.z + oz * 2.05); sign.rotation.y = yawFacing(ox, oz); group.add(sign);
      const proto = new TailorModel();
      proto.root.position.set(cc.x - ox * 0.4, 0, cc.z - oz * 0.4); proto.root.rotation.y = yawFacing(ox, oz); proto.root.scale.setScalar(1.3);
      group.add(proto.root);
      w.proto = { model: proto, pos: proto.root.position.clone(), yaw: proto.root.rotation.y, seen: false, strike: 0, strikeT: 0 };
      w.lamps.push({ pos: new THREE.Vector3(cc.x, WALL_H - 0.6, cc.z), level: 1, flicker: true, base: 14, color: new THREE.Color(0xff3322), ft: 0,
        bulbMat: new THREE.MeshBasicMaterial({ color: 0xff3322 }), shaftMat: MAT.shaft.clone() });
      addBox(c * CELL, (c + 1) * CELL, r * CELL, (r + 1) * CELL);
    }

    // ----- Vitrine mit Mila -----
    if (k === 'Y') {
      const [dx, dz] = wallDir(c, r);
      const px = cc.x + dx * 1.35, pz = cc.z + dz * 1.35;
      const vg = new THREE.Group(); vg.position.set(px, 0, pz); vg.rotation.y = yawFacing(-dx, -dz); group.add(vg);
      const ped = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.9, 1.0, 2, 0.04), MAT.wood); ped.position.y = 0.45; ped.castShadow = ped.receiveShadow = true; vg.add(ped);
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.18), new THREE.MeshStandardMaterial({ map: TX.metalTexture('#b08a3a', false, 'MILA'), metalness: 0.8, roughness: 0.3 }));
      plaque.position.set(0, 0.7, 0.505); vg.add(plaque);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 0.95), MAT.glass); glass.position.y = 1.475; vg.add(glass);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 1.0), MAT.wood); lid.position.y = 2.08; vg.add(lid);
      const doll = makeMilaDoll(); doll.position.y = 0.9; doll.scale.setScalar(1.35); vg.add(doll);
      w.lamps.push({ pos: new THREE.Vector3(px, 2.6, pz), level: 1, flicker: false, base: 3, color: new THREE.Color(0xfff0d0), ft: 0,
        bulbMat: new THREE.MeshBasicMaterial({ color: 0xfff0d0 }), shaftMat: MAT.shaft.clone() });
      addBox(px - 0.5, px + 0.5, pz - 0.5, pz + 0.5);
      w.rayTargets.push(ped);
    }

    // ----- Stahlträger unter der Decke -----
    if (k !== '#' && k !== 'O') {
      w.beams.push([cc.x, cc.z, ch(c, r - 1) === '#' && ch(c, r + 1) === '#']);
    }

    // ----- Rohre an der Decke in Gängen -----
    const nsCorr = ch(c - 1, r) === '#' && ch(c + 1, r) === '#';
    const ewCorr = ch(c, r - 1) === '#' && ch(c, r + 1) === '#';
    if ((nsCorr || ewCorr) && !'123EZ'.includes(k)) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, CELL, 8), MAT.pipe);
      if (nsCorr) { pipe.rotation.x = Math.PI / 2; pipe.position.set(cc.x + 1.55, WALL_H - 0.3, cc.z); }
      else { pipe.rotation.z = Math.PI / 2; pipe.position.set(cc.x, WALL_H - 0.3, cc.z + 1.55); }
      group.add(pipe);
    }
  }

  // Stahlträger als Instanzen (ein Draw-Call)
  const beamGeo = new THREE.BoxGeometry(CELL, 0.28, 0.16);
  const beams = new THREE.InstancedMesh(beamGeo, MAT.beam, w.beams.length);
  const q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  w.beams.forEach(([x, z, rot], i) => {
    q.setFromAxisAngle(up, rot ? Math.PI / 2 : 0);
    m4.compose(new THREE.Vector3(x, WALL_H - 0.14, z), q, one); beams.setMatrixAt(i, m4);
  });
  beams.castShadow = true; group.add(beams);

  // Papier und Bretter als Instanzen (hunderte Stück, trotzdem schnell)
  const paperIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.32, 0.42), MAT.paper, w.papers.length);
  const e = new THREE.Euler(), sc = new THREE.Vector3();
  w.papers.forEach(([x, z, rot, t], i) => {
    e.set(-Math.PI / 2 + (t - 0.5) * 0.15, 0, rot); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, 0.012 + t * 0.01, z), q, one); paperIM.setMatrixAt(i, m4);
  });
  paperIM.receiveShadow = true; group.add(paperIM);
  const plankIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.05, 0.16), MAT.wood, w.planks.length);
  w.planks.forEach(([x, z, rot, t], i) => {
    e.set(0, rot, (t - 0.5) * 0.35); q.setFromEuler(e); sc.set(0.6 + t * 0.8, 1, 1);
    m4.compose(new THREE.Vector3(x, 0.03 + t * 0.2, z), q, sc); plankIM.setMatrixAt(i, m4);
  });
  plankIM.castShadow = plankIM.receiveShadow = true; group.add(plankIM);

  tuneEnv(group);

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
  if (k === '#' || k === 'G' || k === 'O') return false;
  if (k === '1' || k === '2' || k === '3' || k === 'Z') return W.doors[k].open;
  if (k === 'E') return W.gate.open;
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
  noise: null, chase: 0, blackout: 0, focus: null, events: [], leversPulled: 0, lastNoteT: 0, shake: 0,
};
const P = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, eye: EYE, crouch: false,
  stamina: 100, exhausted: false, staminaDelay: 0, bob: 0, step: 0, hidden: null, lookOffset: 0, lookPitch: 0,
};

// ----- Monster -----
const monster = new MonsterModel();
tuneEnv(monster.root, 0.3);
scene.add(monster.root);
const M = {
  pos: new THREE.Vector3(), yaw: 0, state: 'dormant', path: null, pathT: 0, target: null, wait: 0,
  aware: 0, lastSeen: new THREE.Vector3(), lost: 0, search: 0, sees: false, sawHide: false, growlT: 8,
  speed: 0, stepIdx: 0, lookYaw: 0, stuck: 0, lastPos: new THREE.Vector3(), heartT: 0,
};

// ----- Gripper-Hände -----
const GP = {
  blue: new THREE.MeshStandardMaterial({ color: 0x2c5f86, roughness: 0.35, metalness: 0.8, envMapIntensity: 0.4 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xd9a52a, roughness: 0.3, metalness: 0.85, envMapIntensity: 0.4 }),
  hose: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.55 }),
};
const hands = [0, 1].map(side => {
  const color = side ? 0xf0801c : 0x3fae4a; // linke Hand grün, rechte orange
  const vm = new THREE.Group();
  // Werfer: blauer Stahl, gelbe Metallbänder, schwarzer Schlauch
  const launcher = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.42, 16), GP.blue);
  launcher.rotation.x = Math.PI / 2; launcher.position.z = 0.12; vm.add(launcher);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.07, 16), GP.yellow);
  muzzle.rotation.x = Math.PI / 2; muzzle.position.z = -0.08; vm.add(muzzle);
  for (const z of [0.02, 0.16, 0.28]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.061, 0.061, 0.03, 16), GP.yellow);
    band.rotation.x = Math.PI / 2; band.position.z = z; vm.add(band);
  }
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.03, 0.16, 2, 0.008), GP.yellow);
  plate.position.set(0, 0.058, 0.1); vm.add(plate);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x40ff90).multiplyScalar(2) }));
  screen.rotation.x = -Math.PI / 2; screen.position.set(0, 0.0735, 0.08); vm.add(screen);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(side ? -0.05 : 0.05, 0.02, 0.0), new THREE.Vector3(side ? -0.09 : 0.09, 0.07, 0.16), new THREE.Vector3(side ? -0.06 : 0.06, 0.02, 0.36)]), 16, 0.014, 8), GP.hose);
  vm.add(hose);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3) }));
  led.position.set(side ? -0.045 : 0.045, 0.04, -0.02); vm.add(led);
  const hand = makeHand(color);
  // Wie im Original: Finger zeigen nach oben, Handfläche nach vorn, Daumen nach innen
  hand.position.set(0, 0.085, -0.19); hand.rotation.set(Math.PI / 2 - 0.1, 0, side ? 0.14 : -0.14);
  hand.scale.set(side ? -1.15 : 1.15, 1.15, 1.15); vm.add(hand);
  const carryBat = makeBattery(); carryBat.scale.setScalar(0.55); carryBat.rotation.x = Math.PI / 2;
  carryBat.position.set(0, 0.1, -0.26); carryBat.visible = false; vm.add(carryBat);
  const rest = new THREE.Vector3(side ? 0.3 : -0.3, -0.34, -0.58);
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
  const colors = { MILA: '#6fe0d8', TAILOR: '#ff4a3a', ZIPPER: '#c08aff', DURCHSAGE: '#cfd8dc' };
  const label = who === 'TAILOR' ? 'THE TAILOR' : who;
  hud.sub.innerHTML = who ? `<b style="color:${colors[who] || '#ffcc33'}">${label}:</b> ${text}` : text;
  hud.sub.style.opacity = 1; subTimer = dur;
  if (who === 'MILA') { audio.radio(); audio.speak(text, 'MILA'); }
  if (who === 'TAILOR') { audio.growl(0.5); audio.speak(text, 'TAILOR'); }
  if (who === 'ZIPPER') { audio.zipper(); audio.speak(text, 'ZIPPER', { urgent: true }); }
  if (who === 'DURCHSAGE') { audio.chime(); setTimeout(() => audio.speak(text, 'DURCHSAGE'), 900); }
}
function objective(t) { hud.obj.textContent = t; }
function updateBatteryHud() { [...hud.bats.children].forEach((el, i) => el.classList.toggle('on', i < G.placed)); }
function schedule(delay, fn) { G.events.push({ t: G.time + delay, fn }); }

// ======================================================================
//  Spielablauf
// ======================================================================
function resetGame() {
  buildWorld();
  Object.assign(G, { time: 0, flash: true, placed: 0, powered: false, monsterAwake: false, noise: null, chase: 0, blackout: 0, focus: null, events: [], leversPulled: 0, shake: 0, part2: false, hasKey: false });
  audio.alarm = false;
  P.pos.copy(W.start); P.vel.set(0, 0, 0); P.yaw = W.startYaw; P.pitch = 0; P.eye = EYE; P.stamina = 100; P.hidden = null; P.exhausted = false;
  M.pos.copy(W.monsterStart); M.yaw = Math.atan2(W.start.x - W.monsterStart.x, W.start.z - W.monsterStart.z); M.state = 'dormant'; M.path = null; M.aware = 0; M.lost = 0; M.sawHide = false; M.speed = 0; M.growlT = 8;
  monster.root.visible = true; monster.setAngry(false); monster.setMouth(false);
  monster.root.position.copy(M.pos); monster.root.rotation.set(0, M.yaw, 0);
  for (const h of hands) { h.state = 'idle'; h.carrying = null; h.grabbing = null; h.carryBat.visible = false; h.world.visible = false; h.cable.visible = false; h.vm.visible = true; }
  lockerView.classList.add('hidden');
  updateBatteryHud();
  objective('Finde einen Weg nach draußen.');
  hud.sub.style.opacity = 0;
  // Intro
  schedule(0.6, () => say('Willkommen bei Joyworks, Ebene neun. Notbetrieb aktiv. Bitte bleiben Sie ruhig.', 5, 'DURCHSAGE'));
  schedule(6.5, () => say('Kannst du mich hören? Gut … du lebst noch.', 4, 'MILA'));
  schedule(10.7, () => say('Der Aufzug ist abgestürzt. So tief unten war noch nie ein Mitarbeiter.', 4.5, 'MILA'));
  schedule(15.5, () => { say('Das Ausgangstor braucht Strom. Finde drei Batterien und bring sie zum Generator.', 5, 'MILA'); objective('Finde 3 Batterien für den Generator (0/3)'); });
  schedule(21, () => say('Und … sei leise. Hier unten wohnt <b>Zipper</b>. Er hat noch nie jemanden gehen lassen.', 5, 'MILA'));
  schedule(27, () => say(isTouch ? 'Tipp: Tippe auf die grüne oder orange Hand, um den Gripper zu schießen.' : 'Tipp: Linke/rechte Maustaste schießt die Gripper-Hände.', 4));
}

// ======================================================================
//  Speicherpunkte: automatisch an wichtigen Stellen, „Fortsetzen“ im Menü
// ======================================================================
const SAVE_KEY = 'stitched-save-v1';
function readSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* egal */ } updateContinueBtn(); }
let saveTagT = 0;
function checkpoint() {
  if (!W || G.mode !== 'playing') return;
  const data = {
    placed: G.placed,
    taken: W.batteries.map((b, i) => (b.taken ? i : -1)).filter(i => i >= 0),
    carrying: hands.map(h => { const b = h.carrying || h.grabbing; return b ? W.batteries.indexOf(b) : -1; }),
    levers: W.levers.filter(l => l.pulled).map(l => l.id),
    awake: G.monsterAwake, part2: !!G.part2, key: !!G.hasKey, keyDoor: !!W.doors['Z']?.open,
    pos: [P.pos.x, P.pos.z], yaw: P.yaw, time: G.time,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { return; }
  $('saveTag').classList.add('on'); saveTagT = 2.2;
  updateContinueBtn();
}
function updateContinueBtn() { $('btnContinue').classList.toggle('hidden', !readSave()); }

// Spielstand in die frisch gebaute Welt übernehmen (unsichtbarer Respawn)
function applySave(d) {
  G.events = []; hud.sub.style.opacity = 0; audio.stopSpeech();
  G.time = d.time || 0; G.monsterAwake = !!d.awake;
  for (const i of d.taken) {
    const b = W.batteries[i]; if (!b) continue;
    b.taken = true; b.glow.visible = false; b.mesh.visible = false;
    W.rayTargets = W.rayTargets.filter(m => m.userData.ref !== b);
  }
  for (let k = 0; k < d.placed; k++) { W.gen.slots[k].bat.visible = true; W.gen.slots[k].ind.color.set(0x30ff60); }
  G.placed = d.placed; updateBatteryHud();
  d.carrying.forEach((i, side) => { if (i >= 0 && W.batteries[i]) { hands[side].carrying = W.batteries[i]; hands[side].carryBat.visible = true; } });
  for (const id of d.levers) {
    const lv = W.levers.find(l => l.id === id); if (!lv) continue;
    lv.pulled = true; lv.t = 1; lv.pivot.rotation.x = 0.5 + 2.1;
    const door = W.doors[LEVER_DOOR[id]];
    door.open = true; door.opening = true; door.t = 1; door.box.on = false;
    door.mesh.position.y = WALL_H / 2 + (WALL_H - 0.35); door.indMat.color.set(0x30ff60);
  }
  G.leversPulled = d.levers.length;
  if (d.part2) {
    G.part2 = true; G.powered = true;
    if (d.key) { const k = W.key; k.taken = true; k.mesh.visible = false; k.glow.visible = false; G.hasKey = true; W.rayTargets = W.rayTargets.filter(m => m.userData.ref !== k); }
    if (d.keyDoor) { const z = W.doors['Z']; z.open = true; z.opening = true; z.t = 1; z.box.on = false; z.mesh.position.y = WALL_H / 2 + (WALL_H - 0.35); z.indMat.color.set(0x30ff60); }
    if (!d.key) { monster.root.visible = false; M.state = 'patrol'; M.pos.copy(W.monsterStart); }
  }
  P.pos.set(d.pos[0], 0, d.pos[1]); P.yaw = d.yaw; collide(P.pos, PR);
  // Zipper weit weg und ruhig starten lassen, damit man nicht sofort wieder erwischt wird
  if (G.monsterAwake && (!d.part2 || d.key)) {
    let best = null, bestD = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!passable(c, r) || '.KNL'.indexOf(ch(c, r)) < 0) continue;
      const cc = center(c, r), dd = cc.distanceTo(P.pos);
      if (dd > bestD && !los(cc, P.pos) && (!d.part2 || r >= 14) && findPath([c, r], toCell(P.pos.x, P.pos.z))) { bestD = dd; best = cc; }
    }
    if (best) M.pos.copy(best);
    else if (d.part2 && W.vent) M.pos.set(W.vent.pos.x, 0, W.vent.pos.z); // Notfall: an der Lüftung warten
    if (d.part2) monster.root.visible = true;
    M.state = 'patrol'; M.wait = 5; M.path = null; M.aware = 0; monster.setAngry(false);
  }
  monster.root.position.set(M.pos.x, 0, M.pos.z);
  const carrying = hands.some(h => h.carrying);
  objective(carrying ? 'Bring die Batterie zum Generator.' : `Finde 3 Batterien für den Generator (${G.placed}/3)`);
  say('Letzter Speicherpunkt geladen.', 2.5);
  if (d.part2) objective(d.keyDoor ? 'Schnell in den Aufzug!' : d.key ? 'Öffne die gelbe Sicherheitstür mit der Karte!' : 'Finde die Schlüsselkarte in der Nähstube.');
  else if (G.placed >= 3) powerOn();
}

function startGame(fromSave) {
  const save = fromSave ? readSave() : null;
  audio.init();
  audio.setMenuMusic(false);
  audio.primeSpeech();
  audio.stopSpeech();
  audio.setVolume(settings.vol);
  audio.setAmbience(true);
  resetGame();
  if (save) applySave(save);
  showScreen(null);
  $('hud').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
  G.mode = 'playing';
  if (!save) { clearSave(); checkpoint(); } // neues Spiel: erster Speicherpunkt am Start
  lockPointer();
  if (isTouch) { try { document.documentElement.requestFullscreen?.()?.catch?.(() => {}); } catch (e) { /* iOS */ } }
}

// Zipper sieht dich direkt: kein Stromausfall, sondern sofort Gebrüll und Jagd
function grinselAmbush() {
  if (G.monsterAwake) return;
  G.monsterAwake = true;
  M.state = 'ambush'; M.ambushT = 1.1;
  monster.setAngry(true);
  audio.setMonsterPos(M.pos); audio.roar();
  G.shake = 0.8;
  schedule(0.3, () => say('Das ist Zipper! <b>LAUF!</b> Versteck dich in einem Spind!', 4, 'MILA'));
}

function wakeMonster() {
  if (G.monsterAwake) return;
  G.monsterAwake = true;
  G.blackout = 2.2;
  audio.powerDown();
  schedule(1.2, () => { audio.setMonsterPos(M.pos); audio.roar(); });
  schedule(2.4, () => say('Oh nein. Die Lichter … Es ist wach. VERSTECK DICH, wenn es kommt!', 5, 'MILA'));
  schedule(2.2, () => { M.state = 'investigate'; M.target = toCell(P.pos.x, P.pos.z); M.path = null; });
}

function insertBattery(h) {
  const slot = W.gen.slots[G.placed];
  slot.bat.visible = true; slot.ind.color.set(0x30ff60);
  h.carrying = null; h.carryBat.visible = false;
  G.placed++; updateBatteryHud(); audio.insertBattery();
  checkpoint();
  if (G.placed < 3) {
    objective(`Finde 3 Batterien für den Generator (${G.placed}/3)`);
    if (G.placed === 2) say('Noch eine. Es ist nicht schlau – brich den Sichtkontakt ab, dann verliert es dich.', 5, 'MILA');
    else say(`Batterie eingesetzt (${G.placed}/3).`, 3);
  } else powerOn();
}

function powerOn() {
  G.powered = true;
  say('Achtung. Generator sechs läuft. Ausgangstor wird geöffnet.', 3, 'DURCHSAGE');
  audio.powerUp();
  objective('Der Generator läuft …');
  schedule(2.5, () => {
    W.gate.opening = true; audio.door(); audio.alarm = true;
    W.gate.indMat.color.set(0x30ff60);
    for (const l of W.lamps) if (l.base < 26) { l.color.set(0xff2a18); l.bulbMat.color.set(0xff2a18); l.shaftMat.color.set(0xff3020); l.flicker = true; }
    say('Der Generator läuft! Das Tor ist offen – <b>LAUF!</b>', 5, 'MILA');
    schedule(5.5, () => say('Lauf nur. Du kannst mir nicht entkommen. Ich halte alle Fäden.', 5, 'TAILOR'));
    objective('FLIEH DURCH DAS AUSGANGSTOR!');
    // Finale: Zipper weiß genau, wo du bist
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

// Bereich „Die Nähstube“ (Kapitel 1): Tor kracht hinter dir zu, Zipper ist ausgesperrt
function enterPart2() {
  if (G.part2) return;
  G.part2 = true;
  const g = W.gate; g.opening = false; g.closing = true; g.open = false; g.box.on = true;
  g.indMat.color.set(0xff2020);
  audio.alarm = false; audio.door();
  for (const l of W.lamps) if (l.base < 26) { l.color.set(0xffa860); l.bulbMat.color.set(0xffa860); l.shaftMat.color.set(0xffd9a0); l.flicker = Math.random() < 0.3; }
  // Zipper bleibt hinter dem Tor zurück
  M.pos.copy(W.monsterStart); M.state = 'patrol'; M.path = null; M.wait = 4; M.aware = 0; M.lost = 0; M.sawHide = false;
  monster.setAngry(false); monster.root.visible = false;
  objective('Finde die Schlüsselkarte in der Nähstube.');
  say('Das Tor ist zu! Zipper kommt da nicht durch.', 4, 'MILA');
  schedule(4.5, () => say('Du hast es fast geschafft. Der Aufzug nach oben braucht eine <b>Schlüsselkarte</b>.', 5, 'MILA'));
  schedule(10, () => say('Sie liegt in der Nähstube, hinter der lila Tür. Zieh den Hebel daneben.', 5, 'MILA'));
  schedule(16, () => say('Die Nähstube … Hier habe ich euch alle zusammengenäht. Willkommen zu Hause.', 5, 'TAILOR'));
  schedule(0.8, checkpoint);
}

function takeKey() {
  const k = W.key; if (!k || k.taken) return;
  k.taken = true; k.mesh.visible = false; k.glow.visible = false; G.hasKey = true;
  W.rayTargets = W.rayTargets.filter(m => m.userData.ref !== k);
  audio.pickup();
  objective('Öffne die gelbe Sicherheitstür mit der Karte!');
  say('Du hast die Karte!', 2.5);
  checkpoint();
  zipperFromVent();
}

// Das Licht geht aus – und Zipper kriecht aus der Lüftung
function zipperFromVent() {
  G.blackout = 2.5; audio.powerDown();
  schedule(1.3, () => {
    const v = W.vent;
    M.pos.set(v.pos.x + v.dir[0] * 1.2, 0, v.pos.z + v.dir[1] * 1.2);
    M.yaw = Math.atan2(-v.dir[0], -v.dir[1]);
    monster.root.visible = true; monster.root.position.set(M.pos.x, 0, M.pos.z);
    audio.setMonsterPos(M.pos); audio.metalBang(); audio.zipper();
    G.monsterAwake = true;
  });
  schedule(2.6, () => { say('Er ist in der Lüftung! <b>LAUF ZUM AUFZUG!</b>', 4, 'MILA'); startChase(true); audio.roar(); });
  schedule(7, () => say('Ich näh dich fest … ganz fest …', 3, 'ZIPPER'));
}

function openKeyDoor() {
  const d = W.doors['Z'];
  if (!d || d.open || d.opening) return;
  d.opening = true; audio.door(); d.indMat.color.set(0x30ff60);
  objective('Schnell in den Aufzug!');
  say('Die Tür geht auf – rein in den Aufzug!', 3, 'MILA');
}

const ZIPPER_LINES = ['Ich näh dich fest …', 'Zipper hat dich gefunden …', 'Bleib bei mir … für immer.', 'Komm her … lächle für mich.', 'Wir spielen für immer.'];
function startChase(silent) {
  if (M.state !== 'chase' && !silent) {
    audio.setMonsterPos(M.pos); audio.roar();
    if (G.time - (G.lastZipper ?? -99) > 16) {
      G.lastZipper = G.time;
      schedule(0.9, () => say(ZIPPER_LINES[Math.floor(Math.random() * ZIPPER_LINES.length)], 3, 'ZIPPER'));
    }
  }
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
  schedule(0.5, checkpoint);
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
  const all = [...NOTES, ...NOTES_PART2], note = all[n.idx % all.length];
  $('noteTitle').textContent = note.title;
  $('noteBody').textContent = note.body;
  $('note').classList.remove('hidden');
}
function closeNote() { $('note').classList.add('hidden'); G.mode = 'playing'; }

function die() {
  audio.stopSpeech();
  G.mode = 'jumpscare'; G.jsT = 0;
  if (P.hidden) { P.hidden = null; lockerView.classList.add('hidden'); }
  audio.jumpscare(); audio.alarm = false;
  monster.setAngry(true); monster.setMouth(true);
  $('damage').style.opacity = 1;
  for (const h of hands) h.vm.visible = false;
}

function win() {
  audio.stopSpeech();
  clearSave(); // geschafft – nächstes Mal wieder von vorn
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
    if (o.kind === 'battery' && !o.taken) { hot = true; text = d < 2.6 ? '[E] / Hand: Batterie nehmen' : 'Hand schießen: Batterie greifen'; }
    else if (o.kind === 'lever' && !o.pulled) { hot = true; text = 'Hand schießen: Hebel ziehen'; }
    else if (o.kind === 'generator' && d < 5) { hot = true; text = carrying && G.placed < 3 ? '[E] Batterie einsetzen' : `Generator · ${G.placed}/3 Batterien`; }
    else if (o.kind === 'locker' && d < 2.8) { hot = true; text = '[E] Im Spind verstecken'; }
    else if (o.kind === 'note' && d < 3) { hot = true; text = '[E] Lesen'; }
    else if (o.kind === 'gate' && !o.open && d < 6) text = G.powered ? 'Das Tor öffnet sich …' : 'Kein Strom. Der Generator braucht 3 Batterien.';
    else if (o.kind === 'key' && !o.taken) { hot = true; text = d < 2.6 ? '[E] / Hand: Schlüsselkarte nehmen' : 'Hand schießen: Schlüsselkarte greifen'; }
    else if (o.kind === 'keydoor' && !o.open && !o.opening && d < 5) { hot = G.hasKey; text = G.hasKey ? '[E] Karte an die Tür halten' : 'Gesperrt. Hier brauchst du die Schlüsselkarte.'; }
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
  } else if (o.kind === 'key' && !o.taken && a.dist < 2.6) {
    takeKey();
  } else if (o.kind === 'keydoor' && G.hasKey && a.dist < 5) {
    openKeyDoor();
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
    schedule(0.1, checkpoint);
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
  h.hit = a && a.obj && ['battery', 'lever', 'key'].includes(a.obj.kind) ? a.obj : null;
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
          if (h.hit.kind === 'key') takeKey();
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
          schedule(0.1, checkpoint);
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
  if (sprint) { P.stamina -= 16 * dt; P.staminaDelay = 0.9; if (P.stamina <= 0) { P.stamina = 0; P.exhausted = true; sprint = false; } }
  else { P.staminaDelay -= dt; if (P.staminaDelay <= 0) P.stamina = Math.min(100, P.stamina + 24 * dt); if (P.stamina > 30) P.exhausted = false; }

  let speed = P.crouch ? 3.0 : sprint ? 6.4 : 4.0; // geduckt fast so schnell wie gehen
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
  const shake = (G.chase > 0.5 ? Math.max(0, 1 - M.pos.distanceTo(P.pos) / 10) * 0.01 : 0) + G.shake * 0.04;
  camera.rotation.set(P.pitch + (Math.random() - 0.5) * shake, P.yaw + (Math.random() - 0.5) * shake, Math.cos(P.bob) * 0.006 * bobA);

  // Geräusche, die das Monster hören kann
  if (moving && sprint) G.noise = { pos: P.pos.clone(), radius: 12, t: 0 };
  else if (moving && !P.crouch && v > 2) { if (!G.noise || G.noise.radius < 6) G.noise = { pos: P.pos.clone(), radius: 5, t: 0 }; }

  // Ausgang erreicht?
  const [c, r] = toCell(P.pos.x, P.pos.z);
  if (W.part2Cell && !G.part2 && c === W.part2Cell[0] && r === W.part2Cell[1]) enterPart2();
  if (W.exitCell && c === W.exitCell[0] && r === W.exitCell[1] && W.doors['Z']?.open) win();
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
    let range = lit > 0.6 ? 20 : 10;
    if (P.crouch) range = G.flash ? 6 : 4; // geduckt sieht er dich nur ganz aus der Nähe
    if (M.state === 'chase') range = 32;
    if (dist < range && (da < 1.1 || dist < (P.crouch ? 2.5 : 4) || M.state === 'chase')) M.sees = true;
  }
  if (M.state !== 'dormant' && M.state !== 'chase' && M.state !== 'ambush') {
    if (M.sees) {
      M.aware += dt * (0.6 + 4 / Math.max(dist, 1)); // er braucht etwas, bis er sicher ist
      M.lookYaw = 0;
      if (M.aware >= 1) startChase();
    } else M.aware = Math.max(0, M.aware - dt * 0.5);
    if (G.noise && M.state !== 'chase') {
      const nd = G.noise.pos.distanceTo(M.pos);
      if (nd < G.noise.radius) { M.state = 'investigate'; monsterGoTo(toCell(G.noise.pos.x, G.noise.pos.z)); M.aware = Math.max(M.aware, 0.35); }
    }
  }

  // ---- Zustände ----
  let speed = 0, dest = null;
  if (M.state === 'dormant') {
    // steht still, der Kopf folgt dir … bis du zu nah kommst
    const seen = dist < 20 && !P.hidden && los(M.pos, P.pos);
    const want = seen ? clamp(((Math.atan2(toP.x, toP.z) - M.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -1.2, 1.2) : 0;
    M.lookYaw += (want - M.lookYaw) * Math.min(1, dt * 1.5);
    if (seen && dist < (P.crouch ? 5 : 11)) grinselAmbush(); // geduckt kann man sich an ihm vorbeischleichen
  } else if (M.state === 'ambush') {
    // kurzer Schreckmoment: dreht sich zu dir, reißt das Maul auf – dann rennt er los
    const want = Math.atan2(toP.x, toP.z);
    const diff = ((want - M.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    M.yaw += clamp(diff, -5 * dt, 5 * dt);
    M.lookYaw *= 0.9;
    M.ambushT -= dt;
    if (M.ambushT <= 0) startChase(true);
  } else if (M.state === 'patrol') {
    if (!M.path || !M.path.length) {
      M.wait -= dt;
      if (M.wait <= 0) {
        const [pc, pr] = toCell(P.pos.x, P.pos.z);
        const cell = Math.random() < 0.5 ? randomFloorNear(pc, pr, 5) : randomFloorNear(mc, mr, 8);
        monsterGoTo(cell); M.wait = 1 + Math.random() * 2.5;
      }
    }
    speed = 1.8;
  } else if (M.state === 'investigate') {
    speed = 2.6;
    if (!M.path || !M.path.length) { M.state = 'search'; M.search = 6; M.path = null; }
  } else if (M.state === 'search') {
    speed = 2.2;
    M.search -= dt;
    if (!M.path || !M.path.length) { const [lc, lr] = toCell(M.lastSeen.x, M.lastSeen.z); monsterGoTo(randomFloorNear(lc, lr, 3)); }
    if (M.search <= 0) { M.state = 'patrol'; monster.setAngry(false); M.path = null; }
  } else if (M.state === 'chase') {
    speed = G.powered ? 4.4 : 3.9; // langsamer als der Spieler beim Rennen (6.4)
    if (M.sees) { M.lastSeen.copy(P.pos); M.lost = 0; }
    else M.lost += dt * (P.hidden && !M.sawHide ? 2.5 : 1);
    if (P.hidden && M.sawHide) {
      // hat dich reinklettern sehen …
      const fr = P.hidden.front;
      if (M.pos.distanceTo(fr) < 3) dest = fr;
      else { M.pathT -= dt; if (M.pathT <= 0 || !M.path) { M.pathT = 0.3; monsterGoTo(toCell(fr.x, fr.z)); } }
      if (M.pos.distanceTo(fr) < 1.3) { die(); return; }
    } else if (M.lost > (G.powered ? 5 : 3)) {
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
  if (M.state !== 'dormant' && M.state !== 'chase' && M.state !== 'ambush') M.lookYaw = Math.sin(G.time * 0.8) * 0.5;
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
  monster.animate(dt, M.speed, M.state === 'chase' || M.state === 'ambush', M.lookYaw, 0);
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
      'Tipp: Mach die Taschenlampe (F) aus, wenn Zipper in der Nähe ist. Im Dunkeln sieht er schlecht.',
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
// The Tailor im Käfig: folgt dir mit dem Kopf, schlägt gegen die Gitter und redet
function updateProto(dt) {
  const pr = W.proto;
  if (!pr) return;
  const dx = P.pos.x - pr.pos.x, dz = P.pos.z - pr.pos.z, d = Math.hypot(dx, dz);
  const ang = clamp(((Math.atan2(dx, dz) - pr.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -1.2, 1.2);
  pr.strikeT -= dt;
  if (d < 4.6 && pr.strikeT <= 0 && !P.hidden) {
    pr.strikeT = 2.8 + Math.random() * 2; pr.strike = 1; G.shake = 0.6;
    audio.cageHit();
  }
  pr.strike = Math.max(0, pr.strike - dt * 1.6);
  const s = pr.strike > 0.7 ? (1 - pr.strike) / 0.3 : pr.strike / 0.7;
  pr.model.animate(dt, d < 16 ? ang : 0, s);
  if (!pr.seen && d < 11) {
    camera.getWorldDirection(_fwd);
    if ((_fwd.x * -dx + _fwd.z * -dz) / d > 0.6) {
      pr.seen = true;
      say('Endlich … Besuch.', 3.5, 'TAILOR');
      schedule(4.2, () => say('Nimm dir ruhig die Batterie. Lauf nur. Zipper näht dich sowieso fest.', 5.5, 'TAILOR'));
    }
  }
}

function updateWorld(dt) {
  for (const d of [...Object.values(W.doors), W.gate]) {
    if (d.closing && d.t > 0) {
      d.t = Math.max(0, d.t - dt / 0.8); // fällt schwer herunter
      d.mesh.position.y = WALL_H / 2 + (WALL_H - 0.35) * d.t * d.t;
      if (d.t === 0) { d.closing = false; audio.slam(); G.shake = 1; }
    }
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
    l.bulbMat.color.copy(l.color).multiplyScalar(0.3 + lvl * 3.5); // > 1 = leuchtet (Bloom)
    if (l.glows) for (const gm of l.glows) { gm.opacity = 0.08 + lvl * 0.6; gm.color.copy(l.color); }
    l.shaftMat.opacity = 0.03 * lvl;
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

  // Taschenlampe (flackert, wenn Zipper nah ist)
  let fl = G.flash && (G.mode === 'playing' || G.mode === 'jumpscare' || G.mode === 'photo') ? 36 : 0; // photo = Foto-Modus ohne Hände
  if (G.mode === 'menu') fl = 30;
  const md = M.pos.distanceTo(P.pos);
  if (fl && G.monsterAwake && md < 9 && Math.random() < 0.12) fl *= Math.random() * 0.3;
  flashlight.intensity = fl;

  // Viewmodel-Helligkeit an Umgebung anpassen
  const env = Math.min(1.2, lightAt(camera.position));
  vmHemi.intensity = 0.12 + env * 0.5;
  vmKey.intensity = G.flash ? 0.7 : 0.1;
}

// ======================================================================
//  Menü-Kamera: Blick auf den schlafenden Zipper
// ======================================================================
const menuCam = { t: 0 };
// ----- Titelbild: unheimliche Teeparty bei Kerzenlicht (eigene 3D-Szene) -----
const menuStage = buildMenuStage({
  envMap, glow: GLOW, tuneEnv,
  onTwitch: () => { if (G.mode === 'menu' && !G.intro) audio.servo(); },
});
const stage = menuStage.scene, stageCam = menuStage.camera;
function updateStage(dt) { menuStage.update(dt); }

function updateMenu(dt) {
  updateStage(dt);
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
const screens = ['intro', 'menu', 'credits', 'controls', 'settings', 'pause', 'dead', 'win', 'loading'];
function showScreen(id) { screens.forEach(s => $(s).classList.toggle('hidden', s !== id)); }

function pause() {
  if (G.mode !== 'playing') return;
  G.mode = 'paused'; unlock(); showScreen('pause');
  audio.ctx?.suspend(); audio.pauseSpeech(true);
}
function resume() {
  showScreen(null); G.mode = 'playing'; lockPointer(); audio.unlock(); audio.pauseSpeech(false);
}
function toMenu() {
  updateContinueBtn();
  audio.setMenuMusic(true);
  unlock(); audio.alarm = false; audio.setAmbience(false); audio.ctx?.resume(); audio.stopSpeech();
  resetGame(); G.mode = 'menu';
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  showScreen('menu');
}

let lastScreen = 'menu';
$('btnPlay').onclick = () => startGame(false);
$('btnContinue').onclick = () => startGame(true);
$('btnControls').onclick = () => { lastScreen = 'menu'; showScreen('controls'); };
$('btnSettings').onclick = () => { lastScreen = 'menu'; showScreen('settings'); };
$('btnCredits').onclick = () => { lastScreen = 'menu'; showScreen('credits'); };
// „Beenden“: Ein Browser-Tab darf sich nicht selbst schließen – also zurück zum Startbildschirm
$('btnQuitGame').onclick = () => {
  audio.setMenuMusic(false); audio.stopSpeech();
  introStep = 0; G.intro = true;
  $('studio').classList.add('hidden'); $('studio').classList.remove('wiping');
  $('wipebar').classList.remove('go'); $('tapStart').classList.remove('hidden');
  $('menu').classList.remove('appear');
  showScreen('intro');
};
document.querySelectorAll('.back').forEach(b => b.onclick = () => showScreen(lastScreen));
$('btnResume').onclick = resume;
$('btnRestart').onclick = () => { audio.ctx?.resume(); startGame(true); };
$('btnQuit').onclick = toMenu;
$('btnRetry').onclick = () => startGame(true); // unsichtbarer Respawn am letzten Speicherpunkt
document.querySelectorAll('.toMenu').forEach(b => b.onclick = toMenu);

$('sens').value = settings.sens; $('vol').value = settings.vol; $('quality').value = settings.quality;
$('sens').oninput = e => { settings.sens = +e.target.value; saveSettings(); };
$('vol').oninput = e => { settings.vol = +e.target.value; audio.setVolume(settings.vol); saveSettings(); };
$('quality').onchange = e => { settings.quality = e.target.value; saveSettings(); applyQuality(true); };

// ----- Eigenes Menübild (bleibt nur im Browser dieses Geräts, in IndexedDB) -----
const bgStore = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('pp6', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async get() { const db = await this.open(); return new Promise(res => { const q = db.transaction('kv').objectStore('kv').get('menuBg'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); },
  async set(v) { const db = await this.open(); return new Promise(res => { const t = db.transaction('kv', 'readwrite'); v ? t.objectStore('kv').put(v, 'menuBg') : t.objectStore('kv').delete('menuBg'); t.oncomplete = t.onerror = () => res(); }); },
};
let bgUrl = null;
function applyMenuBg(blob) {
  if (bgUrl) URL.revokeObjectURL(bgUrl);
  bgUrl = blob ? URL.createObjectURL(blob) : null;
  $('menuBg').style.backgroundImage = bgUrl ? `url(${bgUrl})` : '';
  $('menu').classList.toggle('customBg', !!bgUrl);
}
bgStore.get().then(applyMenuBg).catch(() => {});
$('bgFile').onchange = async e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  applyMenuBg(f);
  $('bgHint').textContent = 'Menübild gesetzt. Geh zurück ins Menü, um es zu sehen.';
  try { await bgStore.set(f); } catch (err) { $('bgHint').textContent = 'Menübild gesetzt, aber es konnte nicht gespeichert werden – nach dem Neuladen ist es wieder weg.'; }
  e.target.value = '';
};
// Stimmen testen – muss direkt im Tippen passieren, damit iOS die Sprachausgabe freigibt
$('voiceTest').onclick = () => {
  audio.init(); audio.primeSpeech();
  audio.speak('Hallo! Ich bin Mila. Kannst du mich hören?', 'MILA', { urgent: true });
  const S = window.speechSynthesis;
  const n = S ? S.getVoices().filter(v => (v.lang || '').toLowerCase().startsWith('de')).length : 0;
  $('bgHint').textContent = !S ? 'Dieser Browser kann leider nicht sprechen.'
    : n ? `Mila spricht jetzt (${n} deutsche Stimmen gefunden). Nichts gehört? Lautlos-Modus aus und lauter drehen.`
      : 'Keine deutsche Stimme gefunden. Am iPad: Einstellungen > Bedienungshilfen > Gesprochene Inhalte > Stimmen > Deutsch > eine Stimme laden.';
};
$('bgReset').onclick = async () => {
  applyMenuBg(null);
  $('bgHint').textContent = 'Standard-Menübild (Teeparty) ist wieder aktiv.';
  try { await bgStore.set(null); } catch (err) { /* egal */ }
};

// ----- Nachbearbeitung: Bloom-Leuchten + Film-Look (Korn, Vignette, Farbsäume) -----
const FilmShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: 0.05 }, vignette: { value: 0.95 }, aberration: { value: 0.004 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, vignette, aberration; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5; float r = dot(d, d);
      vec2 off = d * aberration * (1.0 + r * 6.0);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      col *= 1.0 - vignette * smoothstep(0.08, 0.7, r * 1.6);
      col += (rand(vUv * 1000.0 + time) - 0.5) * grain * (0.3 + dot(col, vec3(0.3)));
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};
let composer = null, filmPass = null, bloomPass = null, renderPass = null;
function setupComposer(on) {
  if (!on) { composer?.dispose(); composer = null; $('grain').style.display = ''; $('vignette').style.display = ''; return; }
  if (composer) return;
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.42, 0.5, 0.97);
  composer.addPass(bloomPass);
  filmPass = new ShaderPass(FilmShader);
  composer.addPass(filmPass);
  composer.addPass(new OutputPass());
  $('grain').style.display = 'none'; $('vignette').style.display = 'none';
}

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
  setupComposer(q !== 'low');
  if (rebuild && G.mode === 'menu') resetGame();
  resize();
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
  camera.aspect = vmCam.aspect = w / h;
  menuStage.resize(w, h);
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
  if (composer) {
    filmPass.uniforms.time.value = (performance.now() / 1000) % 100;
    const onStage = G.mode === 'menu';
    renderPass.scene = onStage ? stage : scene; renderPass.camera = onStage ? stageCam : camera;
    composer.render();
  } else {
    renderer.clear();
    if (G.mode === 'menu') renderer.render(stage, stageCam); else renderer.render(scene, camera);
  }
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
    updateProto(dt);
    G.shake = Math.max(0, (G.shake || 0) - dt * 1.5);
    if (G.mode === 'playing') updateFocus();
    if (G.noise) { G.noise.t -= dt; if (G.noise.t < 0) G.noise = null; }
    subTimer -= dt; if (subTimer <= 0) hud.sub.style.opacity = 0;
    if (saveTagT > 0) { saveTagT -= dt; if (saveTagT <= 0) $('saveTag').classList.remove('on'); }
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
  audio.update(dt, { chase: G.mode === 'playing' ? G.chase : 0, playing: G.mode === 'playing', menu: G.mode === 'menu' && !G.intro });
  camera.getWorldDirection(_fwd);
  audio.setListener(camera.position, _fwd);
}

// ======================================================================
//  Start
// ======================================================================
applyQuality(false);
resetGame();
G.mode = 'menu';
// ======================================================================
//  Intro: „by Muaz“ → Wischen → Hauptmenü
// ======================================================================
G.intro = true;
showScreen('intro');
updateContinueBtn();
let introStep = 0;
const introTimers = [];
function runIntro() {
  if (introStep === 1) { finishIntro(); return; } // zweites Tippen überspringt
  if (introStep !== 0) return;
  introStep = 1;
  audio.init(); audio.setVolume(settings.vol); audio.primeSpeech();
  audio.setMenuMusic(true);
  $('tapStart').classList.add('hidden');
  $('studio').classList.remove('hidden');
  audio.boom();
  introTimers.push(setTimeout(() => audio.glitch(), 1300), setTimeout(() => audio.glitch(), 2400));
  introTimers.push(setTimeout(() => {
    audio.whoosh();
    $('studio').classList.add('wiping');
    $('wipebar').classList.add('go');
  }, 3500));
  introTimers.push(setTimeout(finishIntro, 4400));
}
function finishIntro() {
  if (introStep === 2) return;
  introStep = 2;
  introTimers.forEach(clearTimeout);
  G.intro = false;
  const intro = $('intro');
  intro.classList.add('fadeOut');
  $('menu').classList.remove('hidden');
  $('menu').classList.add('appear');
  setTimeout(() => { intro.classList.add('hidden'); intro.classList.remove('fadeOut'); }, 900);
}
$('intro').addEventListener('click', runIntro);
addEventListener('keydown', e => { if (G.intro && (e.code === 'Enter' || e.code === 'Space')) runIntro(); });

frame();
// Menü-Musik erst nach der ersten Berührung (Browser-Regel)
// iOS gibt Ton nur bei touchend/click frei (nicht bei pointerdown) – deshalb bei jeder Geste entsperren
const unlockAudio = () => {
  if (G.mode === 'paused') return;
  if (!audio.ctx) { audio.init(); audio.setVolume(settings.vol); } else audio.unlock();
  audio.primeSpeech();
};
for (const ev of ['touchend', 'click', 'keydown']) addEventListener(ev, unlockAudio, { capture: true });

// Für Tests / Debug
window.__pp6 = { THREE, G, P, M, audio, monster, W: () => W, hands, camera, fire, interact, aim, simulate: (sec) => { for (let t = 0; t < sec; t += 1 / 60) { scene.updateMatrixWorld(); tick(1 / 60); } } };
