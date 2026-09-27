// Titelbild im Hauptmenü: eine verlassene, unheimliche Teeparty bei Kerzenlicht.
// Spielzeug sitzt auf den Stühlen, lila Lametta hängt von der Decke, Fäden laufen
// über den Tisch – und hinten im Schatten lauert die Klaue von The Tailor.
import * as THREE from 'three';
import { TailorHand, makeMilaDoll, makeMiniZipper } from './characters.js';

export function buildMenuStage({ envMap, glow, tuneEnv, onTwitch }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05030a);
  scene.fog = new THREE.FogExp2(0x0b0714, 0.075);
  scene.environment = envMap;
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 60);

  const M = {
    cloth: new THREE.MeshStandardMaterial({ color: 0x463c56, roughness: 0.95, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.7 }),
    china: new THREE.MeshPhysicalMaterial({ color: 0xd8d2e6, roughness: 0.25, clearcoat: 0.8 }),
    wax: new THREE.MeshStandardMaterial({ color: 0xf0e2b8, roughness: 0.6, emissive: 0x3a2a10 }),
    silver: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.9 }),
    tinsel: new THREE.MeshStandardMaterial({ color: 0x5a2a9a, roughness: 0.25, metalness: 0.8, emissive: 0x12061e }),
    string: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.8 }),
    velvet: [0x5a3a8a, 0x8a3a6a, 0x3a4a8a, 0x6a3a7a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })),
    cake: new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.8 }),
  };
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };

  // ---- Boden ----
  const floor = add(new THREE.Mesh(new THREE.CircleGeometry(12, 40), new THREE.MeshStandardMaterial({ color: 0x1a1220, roughness: 0.9 })), 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;

  // ---- Runder Tisch mit fleckiger Tischdecke ----
  const T = { x: 0.6, z: 0, r: 2.1, h: 1.0 };
  add(new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, 0.08, 48), M.wood), T.x, T.h, T.z);
  const cloth = add(new THREE.Mesh(new THREE.CylinderGeometry(T.r + 0.05, T.r + 0.35, 0.75, 48, 4, true), M.cloth), T.x, T.h - 0.33, T.z);
  // Falten in die Tischdecke drücken
  const cp = cloth.geometry.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), z = cp.getZ(i), y = cp.getY(i), a = Math.atan2(z, x), k = 1 + Math.sin(a * 22) * 0.025 * (0.5 - y);
    cp.setX(i, x * k); cp.setZ(i, z * k);
  }
  cloth.geometry.computeVertexNormals();
  add(new THREE.Mesh(new THREE.CylinderGeometry(T.r + 0.05, T.r + 0.05, 0.02, 48), M.cloth), T.x, T.h + 0.05, T.z);

  // ---- Geschirr ----
  const plate = new THREE.CylinderGeometry(0.28, 0.22, 0.03, 28);
  const cup = new THREE.CylinderGeometry(0.09, 0.07, 0.12, 20, 1, true);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3, r = T.r - 0.45;
    const px = T.x + Math.cos(a) * r, pz = T.z + Math.sin(a) * r;
    add(new THREE.Mesh(plate, M.china), px, T.h + 0.08, pz);
    if (i % 2) add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.1, 16), M.cake), px, T.h + 0.14, pz);
    const c = add(new THREE.Mesh(cup, M.china), px + Math.cos(a + 0.5) * 0.35, T.h + 0.12, pz + Math.sin(a + 0.5) * 0.35);
    c.material = M.china;
    const fork = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.3), M.silver), px + Math.cos(a - 0.6) * 0.38, T.h + 0.07, pz + Math.sin(a - 0.6) * 0.38);
    fork.rotation.y = -a;
  }

  // ---- Obstschale mit Früchten ----
  const bowlPts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; bowlPts.push(new THREE.Vector2(0.15 + Math.sin(t * Math.PI / 2) * 0.55, t * 0.45)); }
  const bowl = add(new THREE.Mesh(new THREE.LatheGeometry(bowlPts.map(v => v.clone().multiplyScalar(1.25)), 32), new THREE.MeshPhysicalMaterial({ color: 0xb8b0d0, roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide })), T.x + 0.2, T.h + 0.35, T.z - 0.2);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.3, 16), bowl.material), T.x + 0.2, T.h + 0.2, T.z - 0.2);
  const fruit = (color, r, x, y, z) => add(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6 })), T.x + 0.2 + x, T.h + 0.8 + y, T.z - 0.2 + z);
  fruit(0xb3121c, 0.14, -0.25, 0, 0.2); fruit(0xc4161c, 0.13, 0.25, 0.02, 0.25); fruit(0xe07a1a, 0.15, 0.05, 0.06, -0.15);
  for (let i = 0; i < 9; i++) fruit(0x4a1a5a, 0.055, 0.3 + (i % 3) * 0.08, -0.05 + Math.floor(i / 3) * 0.07, -0.05);
  const banana = add(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 10, 20, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: 0xe8c43a, roughness: 0.6 })), T.x - 0.05, T.h + 0.9, T.z - 0.25);
  banana.rotation.set(0.3, 0.4, 0.8);
  const pine = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), new THREE.MeshStandardMaterial({ color: 0xa8741e, roughness: 0.8 })), T.x + 0.35, T.h + 1.0, T.z - 0.4);
  pine.scale.set(1, 1.35, 1);
  for (let i = 0; i < 7; i++) {
    const leaf = add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0x2f6a2a, roughness: 0.7 })), T.x + 0.35, T.h + 1.45, T.z - 0.4);
    leaf.rotation.set(Math.cos(i) * 0.5, 0, Math.sin(i * 1.7) * 0.5);
  }

  // ---- Kerzen mit flackernden Flammen ----
  const candles = [];
  const candleSpots = [[-0.9, 0.5, 0.45], [-0.6, 0.9, 0.3], [1.3, 0.6, 0.55], [1.55, -0.3, 0.3], [-0.2, -1.1, 0.35]];
  for (const [x, z, hgt] of candleSpots) {
    const cx = T.x + x, cz = T.z + z;
    const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, hgt, 16), M.wax), cx, T.h + 0.06 + hgt / 2, cz);
    // Wachstropfen
    for (let k = 0; k < 4; k++) {
      const d = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.05 + Math.random() * 0.1, 4, 6), M.wax), cx + Math.cos(k * 1.6) * 0.07, T.h + 0.1 + hgt * (0.4 + Math.random() * 0.5), cz + Math.sin(k * 1.6) * 0.07);
      d.castShadow = false;
    }
    const top = T.h + 0.06 + hgt;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.3).multiplyScalar(4) }));
    flame.position.set(cx, top + 0.06, cz); scene.add(flame);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffa040, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 }));
    halo.position.set(cx, top + 0.07, cz); halo.scale.setScalar(0.55); scene.add(halo);
    const light = new THREE.PointLight(0xff9a40, 2.2, 5, 1.6);
    light.position.set(cx, top + 0.2, cz); scene.add(light);
    candles.push({ flame, halo, light, seed: Math.random() * 10 });
    c.castShadow = false;
  }
  candles[0].light.castShadow = true; candles[0].light.shadow.mapSize.set(512, 512);

  // ---- Stühle mit Spielzeug-Gästen ----
  const chair = (a, velvet) => {
    const g = new THREE.Group();
    const r = T.r + 0.55;
    g.position.set(T.x + Math.cos(a) * r, 0, T.z + Math.sin(a) * r);
    g.rotation.y = Math.PI / 2 - a; // Sitzfläche zeigt zur Tischmitte
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.75), velvet); seat.position.y = 0.75; g.add(seat);
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.7, 6, 16), velvet);
    back.scale.set(1, 1, 0.22); back.position.set(0, 1.55, 0.36); g.add(back);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 30), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.8, roughness: 0.35 }));
    trim.position.set(0, 1.9, 0.33); g.add(trim);
    for (const [lx, lz] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.75, 8), M.wood); leg.position.set(lx, 0.375, lz); g.add(leg);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    return g;
  };
  const guests = [];
  // Mila, die Stoffpuppe
  const c1 = chair(Math.PI * 1.25, M.velvet[0]);
  const mila = makeMilaDoll(); mila.scale.setScalar(1.6); mila.position.set(0, 0.81, 0.05); c1.add(mila); guests.push(mila);
  // Zipper (Plüsch)
  const c2 = chair(Math.PI * 1.62, M.velvet[1]);
  const grinsel = makeMiniZipper(); grinsel.scale.setScalar(2.4); grinsel.position.set(0, 0.81, 0.05); c2.add(grinsel); guests.push(grinsel);
  // noch ein Zipper, in Türkis
  const c3 = chair(Math.PI * 1.95, M.velvet[2]);
  const grinsel2 = makeMiniZipper(0x23706e); grinsel2.scale.setScalar(2.4); grinsel2.position.set(0, 0.81, 0.05); c3.add(grinsel2); guests.push(grinsel2);
  for (const gst of guests) gst.rotation.y = Math.PI; // Gäste schauen zum Tisch
  // dunkler Stuhl ganz vorn links am Bildrand
  chair(Math.PI * 1.02, M.velvet[3]);

  // ---- Lila Lametta-Girlanden von der Decke ----
  const garland = (pts, r) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, r, 8), M.tinsel);
    scene.add(tube);
    // glitzernde Fransen
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const p = curve.getPoint(i / n);
      pos[i * 3] = p.x + (Math.random() - 0.5) * r * 5; pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * r * 5; pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * r * 5;
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts2 = new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xb070ff, size: 0.022, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(pts2);
    return pts2;
  };
  const sparkles = [
    garland([new THREE.Vector3(-4, 4.2, -2), new THREE.Vector3(-1, 3.1, -1.5), new THREE.Vector3(1.5, 3.4, -2), new THREE.Vector3(4, 3.0, -1)], 0.09),
    garland([new THREE.Vector3(-2, 4.5, 1), new THREE.Vector3(0.5, 3.6, 0.2), new THREE.Vector3(3, 3.9, 0.5), new THREE.Vector3(5, 3.2, 1.5)], 0.08),
    garland([new THREE.Vector3(2.4, 0.9, 1.9), new THREE.Vector3(3.2, 1.2, 1.2), new THREE.Vector3(3.6, 0.8, 0.2)], 0.1),
    // dichte Girlanden quer durchs obere Bild (wie auf dem Kapitel-Titelbild)
    garland([new THREE.Vector3(-3, 4.3, 0.8), new THREE.Vector3(-0.5, 3.6, 0.2), new THREE.Vector3(1.8, 3.9, -0.3), new THREE.Vector3(4.5, 3.4, -0.4)], 0.13),
    garland([new THREE.Vector3(-1.5, 3.8, -0.5), new THREE.Vector3(1, 3.0, -1.2), new THREE.Vector3(3, 3.3, -1.6), new THREE.Vector3(5, 2.8, -1.2)], 0.12),
    garland([new THREE.Vector3(0.5, 4.4, 0.9), new THREE.Vector3(2.2, 3.7, 0.3), new THREE.Vector3(3.8, 4.0, -0.2)], 0.12),
    // Lametta, das vorn rechts über die Tischkante hängt
    garland([new THREE.Vector3(1.2, 1.12, 1.9), new THREE.Vector3(1.9, 1.08, 1.6), new THREE.Vector3(2.4, 0.95, 1.1), new THREE.Vector3(2.7, 0.7, 0.5)], 0.14),
  ];

  // ---- Fäden, die von oben auf den Tisch hängen (The Tailor zieht die Fäden) ----
  for (let i = 0; i < 26; i++) {
    const x = T.x + (Math.random() - 0.5) * 2.4, z = T.z + (Math.random() - 0.5) * 2.0;
    const len = 3.5 + Math.random();
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 4), M.string);
    s.position.set(x, T.h + 0.1 + len / 2, z); s.rotation.set((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08);
    scene.add(s);
  }

  // ---- Die Klaue von The Tailor im Schatten hinter dem Tisch ----
  const hand = new TailorHand();
  hand.root.scale.setScalar(1.5);
  hand.baseX = 3.6; hand.baseY = 0.6;
  hand.root.position.set(hand.baseX, hand.baseY, -2.6);
  hand.root.rotation.set(0.1, -0.5, 0.3);
  hand.onTwitch = onTwitch;
  scene.add(hand.root);

  // ---- Licht: lila Grundstimmung, Kerzen, kaltes Gegenlicht ----
  scene.add(new THREE.HemisphereLight(0x4a2a7a, 0x0a0610, 0.42));
  const rim = new THREE.SpotLight(0x8a5aff, 30, 20, 0.6, 0.8, 1.5);
  rim.position.set(3, 5, -4); rim.target.position.set(0.6, 1, 0); scene.add(rim, rim.target);
  const handLight = new THREE.SpotLight(0xff3020, 25, 10, 0.4, 0.8, 1.5);
  handLight.position.set(2, 0.5, -0.5); handLight.target.position.set(3.6, 1.8, -2.6); scene.add(handLight, handLight.target);

  // Staub
  const dg = new THREE.BufferGeometry(), dp = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) { dp[i * 3] = (Math.random() - 0.5) * 9; dp[i * 3 + 1] = Math.random() * 4.5; dp[i * 3 + 2] = (Math.random() - 0.5) * 7; }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffd0a0, size: 0.015, transparent: true, opacity: 0.5, depthWrite: false })));

  tuneEnv(scene, 0.15);

  function update(dt) {
    const t = performance.now() / 1000;
    hand.animate(dt);
    for (const c of candles) {
      const f = 0.8 + Math.sin(t * 11 + c.seed) * 0.08 + Math.sin(t * 23 + c.seed * 2) * 0.06 + (Math.random() - 0.5) * 0.08;
      c.light.intensity = 2.2 * f; c.halo.material.opacity = 0.55 * f; c.flame.scale.set(1, f, 1);
      c.flame.position.x += (Math.sin(t * 3 + c.seed) * 0.002);
    }
    sparkles.forEach((s, i) => { s.material.opacity = 0.55 + Math.sin(t * 2 + i) * 0.25; });
    // Gäste zucken manchmal den Kopf
    guests.forEach((g, i) => { g.rotation.y = Math.PI + Math.sin(t * 0.3 + i * 2) * 0.08 + (Math.sin(t * 0.7 + i) > 0.97 ? 0.4 : 0); });
    for (let i = 0; i < 400; i++) { dp[i * 3 + 1] -= dt * 0.04; if (dp[i * 3 + 1] < 0) dp[i * 3 + 1] = 4.5; }
    dg.attributes.position.needsUpdate = true;
    // Kamera wie auf dem Titelbild: seitlich, leicht erhöht, langsames Schweben
    const wide = camera.aspect < 1.2;
    camera.position.set(-2.9 + Math.sin(t * 0.08) * 0.15, 2.75 + Math.sin(t * 0.13) * 0.04, wide ? 5.6 : 3.7);
    camera.lookAt(0.55, 1.05, -0.7);
  }
  function resize(w, h) {
    camera.aspect = w / h;
    camera.fov = w / h < 1.2 ? 58 : 42;
    camera.updateProjectionMatrix();
  }
  return { scene, camera, update, resize };
}
