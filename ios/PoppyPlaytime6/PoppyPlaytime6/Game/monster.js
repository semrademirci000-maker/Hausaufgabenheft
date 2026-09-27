// Huggy Wuggy (Experiment 1170) – blaues Fell, riesige rote Lippen, Zahnreihen, gelbe Hände und Füße.
// Fan-Nachbau aus einfachen 3D-Formen; alle Texturen werden im Code gemalt.
import * as THREE from 'three';
import { furTexture, normalFrom } from './textures.js';

const FUR_BLUE = '#1d49c9';
const FUR_YELLOW = '#e9b91f';

function furMat(color, sheen) {
  const map = furTexture(color);
  return new THREE.MeshPhysicalMaterial({
    map, normalMap: normalFrom(map, 5), normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.9, metalness: 0, sheen: 0.35, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.7, envMapIntensity: 0.3,
  });
}

// Glied, das oben aufgehängt ist und nach unten zeigt
function limb(r, len, mat, r2 = r) {
  const pivot = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, 14, 4), mat);
  m.position.y = -len / 2; m.castShadow = true; pivot.add(m);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 14, 10), mat);
  joint.castShadow = true; pivot.add(joint);
  const end = new THREE.Group(); end.position.y = -len; pivot.add(end);
  pivot.userData.end = end;
  return pivot;
}

// Rohr entlang einer Kurve (für Lippen)
function tube(points, radius, mat) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 40, radius, 10, false), mat);
}

export class MonsterModel {
  constructor() {
    this.fur = furMat(FUR_BLUE, 0x3a64d8);
    this.furYellow = furMat(FUR_YELLOW, 0xd8b030);
    const lipMat = new THREE.MeshPhysicalMaterial({ color: 0xc8102e, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1a0306, roughness: 0.9 });
    const gumMat = new THREE.MeshStandardMaterial({ color: 0x6a0f1c, roughness: 0.6 });
    const toothMat = new THREE.MeshPhysicalMaterial({ color: 0xf1ead6, roughness: 0.28, clearcoat: 0.4 });
    this.eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x050508, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x000000 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stitchMat = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.8 });

    const root = this.root = new THREE.Group();
    const body = this.body = new THREE.Group();
    root.add(body);

    // ---- Hüfte & Beine ----
    this.hips = new THREE.Group(); this.hips.position.y = 1.62; body.add(this.hips);
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), this.fur);
    pelvis.scale.set(1.05, 0.75, 0.8); pelvis.castShadow = true; this.hips.add(pelvis);
    this.legs = [-1, 1].map(s => {
      const up = limb(0.13, 0.78, this.fur, 0.16); up.position.set(0.17 * s, -0.05, 0); this.hips.add(up);
      const lo = limb(0.1, 0.78, this.fur, 0.125); up.userData.end.add(lo);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), this.furYellow);
      foot.scale.set(1, 0.55, 1.7); foot.position.set(0, -0.02, 0.12); foot.castShadow = true;
      lo.userData.end.add(foot);
      return { up, lo };
    });

    // ---- Oberkörper: schlank, leicht gebeugt ----
    this.spine = new THREE.Group(); this.hips.add(this.spine);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.9, 8, 20), this.fur);
    torso.position.y = 0.62; torso.scale.set(1, 1, 0.78); torso.castShadow = true; this.spine.add(torso);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.37, 20, 16), this.fur);
    chest.position.set(0, 1.0, 0.02); chest.scale.set(1.15, 0.8, 0.85); chest.castShadow = true; this.spine.add(chest);
    // grobe Naht (er wurde nach dem Sturz wieder zusammengeflickt)
    for (let i = 0; i < 9; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.014), stitchMat);
      st.position.set(0.02 * Math.sin(i), 0.28 + i * 0.09, 0.27); st.rotation.z = 0.5 * (i % 2 ? 1 : -1);
      this.spine.add(st);
    }

    // ---- Arme: extrem lang, gelbe Hände ----
    this.shoulders = new THREE.Group(); this.shoulders.position.y = 1.12; this.spine.add(this.shoulders);
    this.arms = [-1, 1].map(s => {
      const up = limb(0.095, 0.95, this.fur, 0.115); up.position.set(0.42 * s, 0, 0); up.rotation.z = 0.1 * s; this.shoulders.add(up);
      const lo = limb(0.08, 1.0, this.fur, 0.095); up.userData.end.add(lo);
      const hand = new THREE.Group(); lo.userData.end.add(hand);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), this.furYellow);
      palm.scale.set(1, 1.15, 0.55); palm.position.y = -0.08; palm.castShadow = true; hand.add(palm);
      // drei dicke Finger + Daumen
      const fingers = [];
      for (let f = 0; f < 3; f++) {
        const fp = new THREE.Group(); fp.position.set((f - 1) * 0.07, -0.18, 0); fp.rotation.z = (f - 1) * 0.15;
        const fm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 10), this.furYellow);
        fm.position.y = -0.1; fm.castShadow = true; fp.add(fm); hand.add(fp); fingers.push(fp);
      }
      const th = new THREE.Group(); th.position.set(-0.1 * s, -0.08, 0.03); th.rotation.z = -0.8 * s;
      const tm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 4, 10), this.furYellow);
      tm.position.y = -0.07; th.add(tm); hand.add(th);
      return { up, lo, hand, fingers };
    });

    // ---- Hals & Kopf ----
    this.neck = new THREE.Group(); this.neck.position.y = 1.28; this.spine.add(this.neck);
    const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 12), this.fur);
    neckM.position.y = 0.12; this.neck.add(neckM);
    this.head = new THREE.Group(); this.head.position.y = 0.5; this.neck.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.44, 32, 24), this.fur);
    skull.scale.set(1.08, 1.0, 0.94); skull.castShadow = true; this.head.add(skull);
    // Wangen/Schnauze, auf der die Lippen sitzen
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), this.fur);
    muzzle.scale.set(1.35, 0.72, 0.8); muzzle.position.set(0, -0.12, 0.12); this.head.add(muzzle);

    // große, glänzende schwarze Augen
    this.eyes = [-1, 1].map(s => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 16), this.eyeMat);
      e.scale.set(1, 1.1, 0.7); e.position.set(0.17 * s, 0.12, 0.37); this.head.add(e);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), glintMat);
      gl.position.set(0.035, 0.045, 0.095); e.add(gl);
      return e;
    });

    // Maul: Oberlippe am Kopf, Unterlippe am Kiefer, dazwischen dunkler Schlund mit Zahnreihen
    const W = 0.36, Z = 0.43;
    const arc = (y0, bend, z0 = Z) => {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, x = -W + t * 2 * W, u = (t - 0.5) * 2;
        pts.push(new THREE.Vector3(x, y0 + bend * (1 - u * u) + Math.abs(u) ** 3 * 0.06, z0 - (u * u) * 0.17));
      }
      return pts;
    };
    this.mouthGroup = new THREE.Group(); this.mouthGroup.position.set(0, -0.13, 0); this.head.add(this.mouthGroup);
    const upperLip = tube(arc(0.0, -0.035), 0.045, lipMat); this.mouthGroup.add(upperLip);
    const inside = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), mouthMat);
    inside.scale.set(1.15, 0.6, 0.45); inside.position.set(0, -0.08, 0.27); this.mouthGroup.add(inside);
    this.jaw = new THREE.Group(); this.jaw.position.set(0, 0, 0.05); this.mouthGroup.add(this.jaw);
    const lowerLip = tube(arc(-0.035, -0.05, Z - 0.05), 0.048, lipMat); this.jaw.add(lowerLip);
    const gumU = tube(arc(-0.03, -0.035, Z - 0.03), 0.02, gumMat); this.mouthGroup.add(gumU);
    const gumL = tube(arc(-0.02, -0.05, Z - 0.08), 0.02, gumMat); this.jaw.add(gumL);
    this.teeth = [];
    const toothGeo = new THREE.ConeGeometry(0.032, 0.13, 6);
    for (const [grp, y0, bend, dir, zo] of [[this.mouthGroup, -0.04, -0.035, -1, 0.03], [this.jaw, -0.03, -0.05, 1, 0.08]]) {
      const pts = arc(y0, bend, Z - zo);
      for (let i = 1; i < pts.length - 1; i++) {
        for (const off of [0, 0.5]) {
          const p = off ? pts[i].clone().lerp(pts[i + 1] || pts[i], 0.5) : pts[i];
          if (off && i === pts.length - 2) continue;
          const t = new THREE.Mesh(toothGeo, toothMat);
          t.position.copy(p); t.position.y += dir * 0.06; t.position.z += 0.01;
          t.rotation.z = dir > 0 ? 0 : Math.PI; t.scale.y = 0.001;
          grp.add(t); this.teeth.push(t);
        }
      }
    }
    this.eyeLight = new THREE.PointLight(0xff2010, 0, 3, 2);
    this.eyeLight.position.set(0, 0.1, 0.7); this.head.add(this.eyeLight);

    this.phase = 0; this.lean = 0; this.open = 0; this.openTarget = 0; this.twitch = 0; this.jerk = 0;
    this.forceOpen = false;
  }

  setAngry(on) {
    this.angry = on;
    this.eyeMat.emissive.set(on ? 0x2a0000 : 0x000000);
    this.eyeLight.intensity = on ? 0.5 : 0;
  }

  setMouth(open) {
    this.forceOpen = open;
    if (open) this._applyMouth(1);
  }

  _applyMouth(o) {
    this.open = o;
    this.jaw.rotation.x = o * 0.75;
    this.jaw.position.y = -o * 0.05;
    for (const t of this.teeth) t.scale.y = 0.001 + Math.min(1, o * 2.2);
  }

  // speed: m/s, chase: bool
  animate(dt, speed, chase, lookYaw = 0, lookPitch = 0) {
    const moving = speed > 0.1;
    this.phase += dt * (1.6 + speed * 0.6) * (moving ? 1 : 0);
    const p = this.phase, amp = Math.min(1, speed / 3) * 0.8;

    this.lean += ((chase ? 0.4 : 0.1) - this.lean) * Math.min(1, dt * 3);
    this.spine.rotation.x = this.lean + Math.sin(p * 2) * 0.05 * amp;
    this.spine.rotation.y = Math.sin(p) * 0.12 * amp;
    this.hips.position.y = 1.62 - Math.abs(Math.sin(p)) * 0.1 * amp + (moving ? 0 : Math.sin(performance.now() / 800) * 0.015);
    this.body.rotation.z = Math.sin(p) * 0.05 * amp;

    this.legs.forEach((l, i) => {
      const a = Math.sin(p + (i ? Math.PI : 0));
      l.up.rotation.x = a * 0.65 * amp - 0.04;
      l.lo.rotation.x = Math.max(0, -Math.cos(p + (i ? Math.PI : 0))) * 1.0 * amp + 0.06;
    });
    const tNow = performance.now() / 1000;
    this.arms.forEach((a, i) => {
      const s = i ? 1 : -1, sw = Math.sin(p + (i ? 0 : Math.PI));
      if (chase) {
        a.up.rotation.x = -1.15 + sw * 0.3;
        a.lo.rotation.x = -0.35 + Math.sin(tNow * 8 + i) * 0.12;
        a.fingers.forEach((f, k) => { f.rotation.x = -0.6 - Math.sin(tNow * 10 + k + i) * 0.4; });
      } else {
        a.up.rotation.x = sw * 0.4 * amp - 0.03;
        a.lo.rotation.x = -0.12 - Math.max(0, sw) * 0.25 * amp;
        a.fingers.forEach(f => { f.rotation.x = -0.2; });
      }
      a.up.rotation.z = (0.1 + (chase ? 0.25 : 0)) * s;
    });

    // Maul: beim Jagen halb offen – dann sieht man die Zähne
    if (!this.forceOpen) {
      this.openTarget = chase ? 0.45 + Math.sin(tNow * 3) * 0.1 : 0;
      this._applyMouth(this.open + (this.openTarget - this.open) * Math.min(1, dt * 4));
    }

    // ruckartige Kopfbewegungen
    this.twitch -= dt;
    if (this.twitch <= 0) { this.twitch = 0.8 + Math.random() * 3; this.jerk = (Math.random() - 0.5) * 0.6; }
    this.jerk *= Math.pow(0.03, dt);
    this.neck.rotation.y = lookYaw;
    this.head.rotation.z = this.jerk + Math.sin(tNow * 0.9) * 0.06;
    this.neck.rotation.x = -this.lean * 0.85 + lookPitch;
  }
}
