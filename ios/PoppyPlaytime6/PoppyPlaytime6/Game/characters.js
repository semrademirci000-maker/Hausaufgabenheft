// Weitere Figuren: der Prototyp (Experiment 1006), die Poppy-Puppe und kleine Huggy-Plüschtiere.
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
//  Der Prototyp: ein Skelett aus Spielzeugteilen mit riesiger Metallklaue
// ---------------------------------------------------------------------
export class PrototypeModel {
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
    const eyeGlow = new THREE.PointLight(0xffe6a0, 0.8, 2.5, 2); eyeGlow.position.set(0, 0.03, 0.35); this.head.add(eyeGlow);

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
//  Poppy-Puppe (Porzellan, rote Locken, blaues Kleid)
// ---------------------------------------------------------------------
export function makePoppyDoll() {
  const g = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xf3dccb, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const hair = new THREE.MeshStandardMaterial({ color: 0xa3121c, roughness: 0.7 });
  const dress = new THREE.MeshStandardMaterial({ color: 0x2f5bb8, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.8 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.2, clearcoat: 1 });

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 20, 1, true), dress);
  skirt.position.y = 0.3; skirt.material.side = THREE.DoubleSide; g.add(skirt);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.16, 16), dress);
  torso.position.y = 0.48; g.add(torso);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 16), white);
  collar.rotation.x = Math.PI / 2; collar.position.y = 0.56; g.add(collar);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), white);
    leg.position.set(0.06 * s, 0.1, 0); g.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), black);
    shoe.scale.set(1, 0.6, 1.5); shoe.position.set(0.06 * s, 0.01, 0.02); g.add(shoe);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.15, 4, 8), skin);
    arm.position.set(0.11 * s, 0.44, 0.02); arm.rotation.z = 0.35 * s; g.add(arm);
  }
  const head = new THREE.Group(); head.position.y = 0.68; g.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), skin); head.add(face);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x2a5fc2, clearcoat: 1, roughness: 0.1 }));
    eye.position.set(0.035 * s, 0.01, 0.088); head.add(eye);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), new THREE.MeshBasicMaterial({ color: 0xe07a7a, transparent: true, opacity: 0.5 }));
    blush.position.set(0.055 * s, -0.03, 0.083); blush.rotation.y = 0.5 * s; head.add(blush);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0xa3121c }));
  mouth.position.set(0, -0.04, 0.095); mouth.rotation.z = Math.PI; head.add(mouth);
  // Locken
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, up = i % 2 ? 0.05 : -0.02;
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), hair);
    const r = 0.1;
    c.position.set(Math.sin(a) * r, 0.04 + up + Math.max(0, Math.cos(a)) * -0.03, Math.cos(a) * r * (Math.cos(a) > 0.3 ? 0.4 : 1) - 0.02);
    if (Math.cos(a) > 0.6) c.position.y += 0.06;
    head.add(c);
  }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), hair);
    c.position.set(0.11 * s, -0.04 - k * 0.05, -0.01); head.add(c);
  }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// Kleines Huggy-Wuggy-Plüschtier als Deko
let miniMats = null;
export function makeMiniHuggy() {
  if (!miniMats) miniMats = {
    fur: new THREE.MeshPhysicalMaterial({ color: 0x1d49c9, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0x7fa6ff) }),
    yel: new THREE.MeshPhysicalMaterial({ color: 0xe9b91f, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xfff0a0) }),
    lip: new THREE.MeshPhysicalMaterial({ color: 0xc8102e, roughness: 0.3, clearcoat: 0.6 }),
    eye: new THREE.MeshPhysicalMaterial({ color: 0x050508, roughness: 0.1, clearcoat: 1 }),
  };
  const M = miniMats, g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.12, 4, 10), M.fur); body.position.y = 0.15; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), M.fur); head.position.y = 0.33; g.add(head);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), M.eye); e.position.set(0.035 * s, 0.35, 0.075); g.add(e);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.2, 4, 8), M.fur); arm.position.set(0.1 * s, 0.1, 0.03); arm.rotation.z = 0.3 * s; g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.yel); hand.position.set(0.13 * s, -0.01, 0.03); g.add(hand);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.08, 4, 8), M.fur); leg.position.set(0.04 * s, 0.03, 0.08); leg.rotation.x = Math.PI / 2; g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.yel); foot.position.set(0.04 * s, 0.03, 0.15); g.add(foot);
  }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16, Math.PI), M.lip);
  lip.position.set(0, 0.31, 0.07); lip.rotation.z = Math.PI; lip.scale.y = 0.5; g.add(lip);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}
