// Weitere Figuren: The Tailor (hält alle Fäden in der Hand), die Stoffpuppe Mila und kleine Zipper-Plüschtiere.
import * as THREE from 'three';

const bone = new THREE.MeshStandardMaterial({ color: 0xcfc4ab, roughness: 0.55, metalness: 0.05 });
const boneDark = new THREE.MeshStandardMaterial({ color: 0x8c8270, roughness: 0.7 });
const steel = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.35, metalness: 0.9 });
const rust = new THREE.MeshStandardMaterial({ color: 0x5a3421, roughness: 0.7, metalness: 0.6 });
const cable = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.6 });

function seg(r1, r2, len, mat) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 10), mat);
  m.position.y = -len / 2; m.castShadow = true; g.add(m);
  const j = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r1, r2) * 1.3, 10, 8), steel);
  j.castShadow = true; g.add(j);
  const end = new THREE.Group(); end.position.y = -len; g.add(end);
  g.userData.end = end;
  return g;
}

// ---------------------------------------------------------------------
//  The Tailor: ein Skelett aus Spielzeug- und Nähmaschinenteilen mit riesiger Metallklaue
// ---------------------------------------------------------------------
export class TailorModel {
  constructor() {
    const root = this.root = new THREE.Group();
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });

    const hips = this.hips = new THREE.Group(); hips.position.y = 1.5; root.add(hips);
    const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16), bone);
    pelvis.rotation.x = Math.PI / 2; pelvis.castShadow = true; hips.add(pelvis);

    // Beine (dünn, knochig)
    this.legs = [-1, 1].map(s => {
      const up = seg(0.05, 0.07, 0.8, bone); up.position.set(0.18 * s, 0, 0); hips.add(up);
      const lo = seg(0.04, 0.05, 0.75, boneDark); up.userData.end.add(lo);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.34), steel);
      foot.position.set(0, -0.02, 0.1); lo.userData.end.add(foot);
      up.rotation.x = -0.3; lo.rotation.x = 0.5;
      return { up, lo };
    });

    // Wirbelsäule, gekrümmt
    const spine = this.spine = new THREE.Group(); hips.add(spine);
    let prev = spine;
    this.vert = [];
    for (let i = 0; i < 9; i++) {
      const v = new THREE.Group(); v.position.y = i ? 0.13 : 0.05; v.rotation.x = 0.05; prev.add(v);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.09, 8), i % 3 ? bone : steel);
      m.castShadow = true; v.add(m);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 5), boneDark);
      sp.position.z = -0.08; sp.rotation.x = -Math.PI / 2; v.add(sp);
      this.vert.push(v); prev = v;
    }
    // Rippen
    for (let i = 0; i < 6; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.2 - Math.abs(i - 2) * 0.012, 0.018, 6, 18, Math.PI * 1.5), bone);
      rib.rotation.set(Math.PI / 2, 0, Math.PI * 0.25); rib.scale.set(1.05, 0.8, 1);
      rib.position.set(0, 0, 0.1); rib.castShadow = true;
      this.vert[2 + i].add(rib);
    }
    // Kabel, die aus dem Brustkorb hängen
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6 + i * 0.1, 5), cable);
      c.position.set(-0.1 + i * 0.07, -0.25, 0.08); c.rotation.z = (i - 1.5) * 0.15;
      this.vert[4].add(c);
    }

    const top = this.vert[this.vert.length - 1];
    // Schultern
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), steel);
    sh.rotation.z = Math.PI / 2; top.add(sh);

    // linker Arm: dürr
    this.leftArm = seg(0.035, 0.045, 0.75, bone); this.leftArm.position.set(0.4, 0, 0); top.add(this.leftArm);
    const lfa = seg(0.03, 0.035, 0.7, boneDark); this.leftArm.userData.end.add(lfa);
    this.leftArm.rotation.set(0.2, 0, 0.15); lfa.rotation.x = -0.6;
    for (let f = 0; f < 3; f++) {
      const fi = seg(0.012, 0.015, 0.16, bone); fi.position.x = (f - 1) * 0.03; fi.rotation.x = -0.4; lfa.userData.end.add(fi);
    }

    // rechter Arm: die berühmte Metallklaue
    this.clawArm = seg(0.07, 0.09, 0.8, steel); this.clawArm.position.set(-0.42, 0, 0); top.add(this.clawArm);
    const pist = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), rust);
    pist.position.set(0.1, -0.4, 0.05); this.clawArm.add(pist);
    this.clawFore = seg(0.06, 0.08, 0.85, steel); this.clawArm.userData.end.add(this.clawFore);
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.12, 12), rust);
    wrist.position.y = -0.85; this.clawFore.add(wrist);
    this.claws = [];
    for (let f = 0; f < 4; f++) {
      const base = new THREE.Group();
      const a = (f / 4) * Math.PI * 2;
      base.position.set(Math.cos(a) * 0.08, -0.9, Math.sin(a) * 0.08);
      base.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      this.clawFore.add(base);
      let p = base; const parts = [];
      for (let k = 0; k < 3; k++) {
        const s2 = seg(0.02 - k * 0.004, 0.025 - k * 0.005, 0.32 - k * 0.06, k === 2 ? bone : steel);
        p.add(s2); p = s2 === base ? p : s2.userData.end; parts.push(s2);
      }
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.14, 6), bone);
      tip.rotation.x = Math.PI; tip.position.y = -0.07; p.add(tip);
      this.claws.push({ base, parts });
    }
    this.clawArm.rotation.set(-0.9, 0, -0.25);
    this.clawFore.rotation.x = -0.8;

    // Kopf: Schädel aus Spielzeugteilen
    this.head = new THREE.Group(); this.head.position.y = 0.3; top.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), bone);
    skull.scale.set(0.9, 1.1, 1); skull.castShadow = true; this.head.add(skull);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.18), boneDark);
    jaw.position.set(0, -0.17, 0.05); this.head.add(jaw);
    for (let i = 0; i < 6; i++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 4), bone);
      t.position.set(-0.07 + i * 0.028, -0.12, 0.14); t.rotation.x = Math.PI; this.head.add(t);
    }
    for (const s of [-1, 1]) {
      const sock = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: 0x050403 }));
      sock.position.set(0.07 * s, 0.03, 0.15); sock.scale.z = 0.5; this.head.add(sock);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), this.eyeMat);
      eye.position.set(0.07 * s, 0.03, 0.18); this.head.add(eye);
    }
    // Garnspule mit rotem Faden und eine riesige Nähnadel quer durch den Kopf
    const spool = new THREE.Group(); spool.position.y = 0.26; this.head.add(spool);
    for (const y of [-0.05, 0.05]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), rust); d.position.y = y; spool.add(d); }
    spool.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.09, 16), new THREE.MeshStandardMaterial({ color: 0x9a1420, roughness: 0.8 })));
    const bigNeedle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.7, 8), steel);
    bigNeedle.rotation.z = 1.2; bigNeedle.position.set(0.05, 0.05, 0); this.head.add(bigNeedle);
    // lose rote Fäden, die von der Spule herabhängen – er „zieht die Fäden“
    for (let i = 0; i < 3; i++) {
      const th = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2 + i * 0.3, 4), new THREE.MeshStandardMaterial({ color: 0x9a1420 }));
      th.position.set(-0.08 + i * 0.08, -0.35 - i * 0.15, 0.08); this.head.add(th);
    }

    this.t = Math.random() * 10;
    this.lunge = 0;
  }

  // lookYaw: Winkel zum Spieler (lokal), strike: 0..1 Angriff gegen die Gitterstäbe
  animate(dt, lookYaw, strike) {
    this.t += dt;
    const breath = Math.sin(this.t * 1.3);
    this.vert.forEach((v, i) => { v.rotation.x = 0.05 + breath * 0.008 + (i > 5 ? 0.04 : 0) + strike * 0.03; });
    this.head.rotation.y += (lookYaw * 0.8 - this.head.rotation.y) * Math.min(1, dt * 2);
    this.head.rotation.z = Math.sin(this.t * 0.7) * 0.15;
    this.clawArm.rotation.x = -0.9 - strike * 0.9 + Math.sin(this.t * 0.5) * 0.05;
    this.clawFore.rotation.x = -0.8 + strike * 0.7;
    this.claws.forEach((c, i) => {
      const flex = 0.3 + Math.sin(this.t * 1.7 + i) * 0.25 - strike * 0.3;
      c.parts.forEach(p => { p.rotation.x = flex; });
    });
    this.eyeMat.color.setScalar(0.7 + Math.random() * 0.3);
  }
}

// ---------------------------------------------------------------------
//  Mila – Stoffpuppe mit türkisem Wollhaar, gelbem Kleid und Knopfaugen
// ---------------------------------------------------------------------
export function makeMilaDoll() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xefd9c2, roughness: 0.85 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2aa3a8, roughness: 0.95 });
  const dress = new THREE.MeshStandardMaterial({ color: 0xe0b22a, roughness: 0.9 });
  const patch = new THREE.MeshStandardMaterial({ color: 0x7a2f3a, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.8 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.2, clearcoat: 1 });
  const thread = new THREE.MeshStandardMaterial({ color: 0xa3121c });

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 20, 1, true), dress);
  skirt.position.y = 0.3; skirt.material.side = THREE.DoubleSide; g.add(skirt);
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.06), patch); p1.position.set(0.07, 0.3, 0.155); p1.rotation.set(-0.5, 0.4, 0.2); g.add(p1);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.16, 16), dress);
  torso.position.y = 0.48; g.add(torso);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 16), white);
  collar.rotation.x = Math.PI / 2; collar.position.y = 0.56; g.add(collar);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x23706e, roughness: 0.9 }));
    leg.position.set(0.06 * s, 0.1, 0); g.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), black);
    shoe.scale.set(1, 0.6, 1.5); shoe.position.set(0.06 * s, 0.01, 0.02); g.add(shoe);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.15, 4, 8), skin);
    arm.position.set(0.11 * s, 0.44, 0.02); arm.rotation.z = 0.35 * s; g.add(arm);
  }
  const head = new THREE.Group(); head.position.y = 0.68; g.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), skin); face.scale.set(1, 0.95, 0.9); head.add(face);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.01, 12), black);
    eye.rotation.x = Math.PI / 2; eye.position.set(0.035 * s, 0.01, 0.088); head.add(eye);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), new THREE.MeshBasicMaterial({ color: 0xe07a7a, transparent: true, opacity: 0.5 }));
    blush.position.set(0.055 * s, -0.03, 0.08); blush.rotation.y = 0.5 * s; head.add(blush);
  }
  // genähter Mund
  for (let i = 0; i < 4; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.004), thread);
    st.position.set(-0.018 + i * 0.012, -0.045 + Math.abs(i - 1.5) * 0.004, 0.09); head.add(st);
  }
  // Wollhaar: dicke türkise Strähnen
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    if (Math.cos(a) > 0.55) continue; // Gesicht frei lassen
    const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 4, 8), hair);
    c.position.set(Math.sin(a) * 0.1, 0.02, Math.cos(a) * 0.1 - 0.01);
    c.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4); head.add(c);
  }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), hair);
  top.position.y = 0.01; head.add(top);
  for (const s of [-1, 1]) {
    const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.16, 4, 8), hair);
    braid.position.set(0.12 * s, -0.08, -0.02); braid.rotation.z = 0.2 * s; head.add(braid);
  }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// Kleines Zipper-Plüschtier als Deko (Flicken, Knopfaugen, Reißverschluss-Grinsen)
let miniMats = null;
export function makeMiniZipper(color = 0x5a2a7a) {
  if (!miniMats) miniMats = {
    patch: new THREE.MeshStandardMaterial({ color: 0xb88a24, roughness: 0.95 }),
    sock: new THREE.MeshStandardMaterial({ color: 0x23706e, roughness: 0.95 }),
    zip: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.9 }),
    eye: new THREE.MeshPhysicalMaterial({ color: 0xe8e0cc, roughness: 0.25, clearcoat: 1 }),
    eye2: new THREE.MeshPhysicalMaterial({ color: 0xb3121c, roughness: 0.25, clearcoat: 1 }),
    furs: {},
  };
  const M = miniMats;
  const fur = M.furs[color] || (M.furs[color] = new THREE.MeshPhysicalMaterial({ color, roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color(color).multiplyScalar(1.6) }));
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), fur); body.scale.set(1, 1.25, 0.9); body.position.y = 0.14; g.add(body);
  const patch = new THREE.Mesh(new THREE.CircleGeometry(0.035, 6), M.patch); patch.position.set(0.03, 0.17, 0.09); g.add(patch);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), fur); head.scale.set(1.15, 0.92, 0.95); head.position.y = 0.33; g.add(head);
  for (const [x, r, m] of [[-0.04, 0.026, M.eye], [0.045, 0.018, M.eye2]]) {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.01, 12), m); e.rotation.x = Math.PI / 2; e.position.set(x, 0.35, 0.09); g.add(e);
  }
  const zip = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 16, Math.PI), M.zip);
  zip.position.set(0, 0.315, 0.085); zip.rotation.z = Math.PI; zip.scale.y = 0.5; g.add(zip);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.2, 4, 8), fur); arm.position.set(0.11 * s, 0.1, 0.03); arm.rotation.z = 0.3 * s; g.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.08, 4, 8), fur); leg.position.set(0.045 * s, 0.03, 0.08); leg.rotation.x = Math.PI / 2; g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), M.sock); foot.position.set(0.045 * s, 0.03, 0.15); g.add(foot);
  }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------------
//  Die Klauenhand von The Tailor (groß, für das Titelbild im Menü)
//  Aufbau: Unterarm zeigt nach unten (-y), Finger nach oben (+y), Handfläche nach vorn (+z)
// ---------------------------------------------------------------------
const boneOld = new THREE.MeshStandardMaterial({ color: 0xb9ab8e, roughness: 0.6, metalness: 0.05 });
const steelWorn = new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.45, metalness: 0.85 });

function up(r1, r2, len, mat) {
  // Segment, das von y=0 nach oben wächst
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 14), mat);
  m.position.y = len / 2; m.castShadow = true; g.add(m);
  const end = new THREE.Group(); end.position.y = len; g.add(end);
  g.userData.end = end;
  return g;
}

export class TailorHand {
  constructor() {
    const root = this.root = new THREE.Group();

    // ---- Unterarm: Stahlrohr mit Kolben, Knochenstreben und Kabeln ----
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.9, 20), steel);
    arm.position.y = -1.15; arm.castShadow = true; root.add(arm);
    for (const y of [-0.45, -0.95, -1.5]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 24), rust);
      band.rotation.x = Math.PI / 2; band.position.y = y; root.add(band);
      for (let i = 0; i < 6; i++) {
        const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), steelWorn);
        const a = i / 6 * Math.PI * 2; bolt.position.set(Math.cos(a) * 0.205, y, Math.sin(a) * 0.205); root.add(bolt);
      }
    }
    for (const s of [-1, 1]) {
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 10), steelWorn);
      piston.position.set(0.22 * s, -1.0, 0.06); piston.rotation.z = 0.05 * s; root.add(piston);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 10), rust);
      sleeve.position.set(0.23 * s, -1.45, 0.06); root.add(sleeve);
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.6, 8), boneOld);
      strut.position.set(0.12 * s, -1.1, -0.17); strut.rotation.z = -0.06 * s; root.add(strut);
    }
    // herabhängende Kabel
    this.cables = [];
    for (let i = 0; i < 5; i++) {
      const x0 = -0.15 + i * 0.075;
      const pts = [new THREE.Vector3(x0, -0.3, -0.12), new THREE.Vector3(x0 * 1.6, -0.9, -0.3 - i * 0.03), new THREE.Vector3(x0 * 2.2, -1.6, -0.15), new THREE.Vector3(x0 * 2.5, -2.3, -0.35)];
      const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012 + (i % 2) * 0.006, 6), i === 2 ? new THREE.MeshStandardMaterial({ color: 0x8a1a1a, roughness: 0.5 }) : cable);
      root.add(c); this.cables.push(c);
    }

    // ---- Handgelenk ----
    this.wrist = new THREE.Group(); this.wrist.position.y = -0.1; root.add(this.wrist);
    const wj = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), rust); wj.castShadow = true; this.wrist.add(wj);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 20), steelWorn); collar.position.y = -0.12; this.wrist.add(collar);

    // ---- Handfläche: Metallplatte + Mittelhandknochen ----
    const palm = new THREE.Group(); palm.position.y = 0.12; this.wrist.add(palm);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.5, 0.1), steel); plate.position.set(0, 0.24, -0.05); plate.castShadow = true; palm.add(plate);
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), steelWorn);
      b.position.set(-0.21 + (i % 4) * 0.14, i < 4 ? 0.06 : 0.42, 0.0); palm.add(b);
    }
    this.fingers = [];
    const spread = [-0.2, -0.07, 0.07, 0.2];
    const lens = [[0.38, 0.3, 0.24], [0.46, 0.36, 0.28], [0.44, 0.34, 0.27], [0.36, 0.28, 0.22]];
    spread.forEach((x, i) => {
      // Mittelhandknochen
      const mc = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.46, 10), boneOld);
      mc.position.set(x * 0.8, 0.23, 0.03); mc.rotation.z = -x * 0.3; mc.castShadow = true; palm.add(mc);
      const base = new THREE.Group(); base.position.set(x * 1.1, 0.47, 0.03); base.rotation.z = -x * 1.7; palm.add(base);
      const segs = []; let p = base;
      lens[i].forEach((len, k) => {
        const joint = new THREE.Mesh(new THREE.SphereGeometry(0.062 - k * 0.01, 14, 10), k === 0 ? rust : steelWorn);
        joint.castShadow = true; p.add(joint);
        const sg = up(0.05 - k * 0.01, 0.042 - k * 0.009, len, k === 2 ? boneOld : steel);
        p.add(sg); segs.push(sg);
        // kleine Hydraulik auf dem Fingerrücken
        if (k < 2) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len * 0.8, 6), rust); h.position.set(0, len / 2, -0.04); sg.add(h); }
        p = sg.userData.end;
      });
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.22, 10), boneOld);
      tip.position.y = 0.1; tip.castShadow = true; p.add(tip);
      this.fingers.push({ base, segs, phase: i * 1.3 });
    });
    // Daumen
    const tb = new THREE.Group(); tb.position.set(-0.27, 0.12, 0.06); tb.rotation.set(0.4, 0, 0.9); palm.add(tb);
    const tsegs = []; let tp = tb;
    [0.3, 0.24, 0.2].forEach((len, k) => {
      const j = new THREE.Mesh(new THREE.SphereGeometry(0.045 - k * 0.008, 10, 8), rust); tp.add(j);
      const sg = up(0.034 - k * 0.006, 0.028 - k * 0.006, len, k === 2 ? boneOld : steel); tp.add(sg); tsegs.push(sg); tp = sg.userData.end;
    });
    const tt = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.18, 8), boneOld); tt.position.y = 0.09; tp.add(tt);
    this.thumb = tsegs;

    this.t = 0; this.twitch = 0; this.jolt = 0;
  }

  // curl: 0 = offen, 1 = greift zu
  animate(dt, curlBias = 0) {
    this.t += dt;
    this.twitch -= dt;
    if (this.twitch <= 0) { this.twitch = 2.5 + Math.random() * 4; this.jolt = 1; this.onTwitch?.(); }
    this.jolt = Math.max(0, this.jolt - dt * 3);
    const j = this.jolt * this.jolt;
    this.fingers.forEach((f, i) => {
      const curl = 0.28 + Math.sin(this.t * 0.55 + f.phase) * 0.2 + curlBias + j * 0.5 + Math.sin(this.t * 23 + i) * 0.01;
      f.segs.forEach((sg, k) => { sg.rotation.x = curl * (0.8 + k * 0.35); });
    });
    this.thumb.forEach((sg, k) => { sg.rotation.x = 0.2 + Math.sin(this.t * 0.5) * 0.12 + j * 0.3 + k * 0.1; });
    this.wrist.rotation.x = -0.15 + Math.sin(this.t * 0.35) * 0.08 - j * 0.12;
    this.wrist.rotation.z = Math.sin(this.t * 0.27) * 0.06;
    this.root.position.x = this.baseX + Math.sin(this.t * 0.3) * 0.05 + (Math.random() - 0.5) * j * 0.04;
    this.root.position.y = this.baseY + Math.sin(this.t * 0.45) * 0.04;
  }
}
