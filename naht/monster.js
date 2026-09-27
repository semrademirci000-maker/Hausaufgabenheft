// Grinsel – ein riesiges Flicken-Kuscheltier aus der Spielzeugfabrik Frohwerk.
// Knopfaugen, lose Fäden, ein Reißverschluss als Mund – und dahinter Zähne aus Nähnadeln.
import * as THREE from 'three';
import { patchworkTexture, normalFrom } from './textures.js';

function fabric(tex, sheen) {
  return new THREE.MeshPhysicalMaterial({
    map: tex, normalMap: normalFrom(tex, 5), normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.9, metalness: 0, sheen: 0.35, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.7, envMapIntensity: 0.3,
  });
}

// Glied, das oben aufgehängt ist und nach unten zeigt
function limb(r, len, mat, r2 = r) {
  const pivot = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, 14, 4), mat);
  m.position.y = -len / 2; m.castShadow = true; pivot.add(m);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(r * 1.08, 14, 10), mat);
  joint.castShadow = true; pivot.add(joint);
  const end = new THREE.Group(); end.position.y = -len; pivot.add(end);
  pivot.userData.end = end;
  return pivot;
}

function tube(points, radius, mat) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, radius, 8, false), mat);
}

export class MonsterModel {
  constructor() {
    const tex = patchworkTexture();
    this.fur = fabric(tex, 0x8a6ab0);
    const sock = new THREE.MeshStandardMaterial({ color: 0x23706e, roughness: 0.95 });
    const sockStripe = new THREE.MeshStandardMaterial({ color: 0xb88a24, roughness: 0.95 });
    const needle = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.2, metalness: 1 });
    const zipMetal = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.9 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x2a1030, roughness: 0.9 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x14040a, roughness: 0.9 });
    const threadMat = new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.8 });
    this.eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xe8e0cc, roughness: 0.25, clearcoat: 1, emissive: 0x000000 });
    this.eyeMat2 = new THREE.MeshPhysicalMaterial({ color: 0xb3121c, roughness: 0.25, clearcoat: 1, emissive: 0x000000 });
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x0a0508 });

    const root = this.root = new THREE.Group();
    const body = this.body = new THREE.Group();
    root.add(body);

    // ---- Hüfte & Beine mit dicken Sockenfüßen ----
    this.hips = new THREE.Group(); this.hips.position.y = 1.55; body.add(this.hips);
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), this.fur);
    pelvis.scale.set(1.1, 0.8, 0.85); pelvis.castShadow = true; this.hips.add(pelvis);
    this.legs = [-1, 1].map(s => {
      const up = limb(0.12, 0.76, this.fur, 0.15); up.position.set(0.19 * s, -0.05, 0); this.hips.add(up);
      const lo = limb(0.1, 0.74, this.fur, 0.12); up.userData.end.add(lo);
      const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.26, 6, 12), sock);
      foot.rotation.x = Math.PI / 2; foot.position.set(0, -0.03, 0.14); foot.castShadow = true; lo.userData.end.add(foot);
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 16), sockStripe);
      stripe.position.set(0, 0.03, 0.02); stripe.rotation.x = Math.PI / 2; lo.userData.end.add(stripe);
      return { up, lo };
    });

    // ---- Oberkörper: bucklig, birnenförmig ----
    this.spine = new THREE.Group(); this.hips.add(this.spine);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 18), this.fur);
    torso.scale.set(1, 1.45, 0.85); torso.position.y = 0.55; torso.castShadow = true; this.spine.add(torso);
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), this.fur);
    hump.position.set(0, 0.95, -0.18); hump.castShadow = true; this.spine.add(hump);
    // grobe X-Stiche quer über die Brust
    for (let i = 0; i < 6; i++) {
      for (const r of [0.6, -0.6]) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.018), threadMat);
        st.position.set(-0.05 + (i % 2) * 0.1, 0.3 + i * 0.11, 0.37); st.rotation.z = r; this.spine.add(st);
      }
    }

    // ---- Arme: sehr lang, Finger aus Nähnadeln ----
    this.shoulders = new THREE.Group(); this.shoulders.position.y = 1.08; this.spine.add(this.shoulders);
    this.arms = [-1, 1].map(s => {
      const up = limb(0.09, 0.95, this.fur, 0.11); up.position.set(0.44 * s, 0, 0); up.rotation.z = 0.1 * s; this.shoulders.add(up);
      const lo = limb(0.075, 1.0, this.fur, 0.09); up.userData.end.add(lo);
      const hand = new THREE.Group(); lo.userData.end.add(hand);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), this.fur);
      palm.scale.set(1.1, 1, 0.55); palm.position.y = -0.06; hand.add(palm);
      const fingers = [];
      for (let f = 0; f < 4; f++) {
        const fp = new THREE.Group(); fp.position.set((f - 1.5) * 0.06, -0.14, 0); fp.rotation.z = (f - 1.5) * 0.12;
        const n = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.018, 0.34, 8), needle);
        n.position.y = -0.17; n.castShadow = true; fp.add(n);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.06, 6), needle);
        tip.position.y = -0.37; tip.rotation.x = Math.PI; fp.add(tip);
        const eye = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 4, 8), needle);
        eye.position.y = -0.005; fp.add(eye);
        hand.add(fp); fingers.push(fp);
      }
      return { up, lo, hand, fingers };
    });

    // ---- Langer Hals & Kopf ----
    this.neck = new THREE.Group(); this.neck.position.y = 1.2; this.spine.add(this.neck);
    const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.42, 12), this.fur);
    neckM.position.y = 0.18; this.neck.add(neckM);
    this.head = new THREE.Group(); this.head.position.y = 0.62; this.neck.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.46, 30, 22), this.fur);
    skull.scale.set(1.15, 0.92, 0.95); skull.castShadow = true; this.head.add(skull);
    // lose Fäden oben auf dem Kopf
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.07;
      const f = tube([new THREE.Vector3(x, 0.4, 0), new THREE.Vector3(x * 1.5, 0.52, 0.05), new THREE.Vector3(x * 2.2, 0.47 - Math.random() * 0.1, 0.12)], 0.008, threadMat);
      this.head.add(f);
    }

    // Knopfaugen: links groß und hell, rechts klein und rot
    this.eyes = [[-0.19, 0.12, 0.11, this.eyeMat], [0.2, 0.14, 0.075, this.eyeMat2]].map(([x, y, r, mat]) => {
      const b = new THREE.Group(); b.position.set(x, y, 0.4); b.rotation.x = -0.1; b.rotation.y = x * 0.6; this.head.add(b);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.035, 24), mat);
      disc.rotation.x = Math.PI / 2; b.add(disc);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, r * 0.1, 8, 24), mat); rim.position.z = 0.02; b.add(rim);
      for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const h = new THREE.Mesh(new THREE.CircleGeometry(r * 0.13, 10), holeMat);
        h.position.set(a * r * 0.3, c * r * 0.3, 0.019); b.add(h);
      }
      // Kreuzstich-Faden im Knopf
      for (const rz of [0.785, -0.785]) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, r * 0.1, 0.01), threadMat);
        t.position.z = 0.022; t.rotation.z = rz; b.add(t);
      }
      return b;
    });

    // ---- Reißverschluss-Mund ----
    const W = 0.38, Z = 0.43;
    const arc = (y0, bend, z0 = Z) => {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, x = -W + t * 2 * W, u = (t - 0.5) * 2;
        pts.push(new THREE.Vector3(x, y0 + bend * (1 - u * u) + Math.abs(u) ** 3 * 0.08, z0 - (u * u) * 0.2));
      }
      return pts;
    };
    this.mouthGroup = new THREE.Group(); this.mouthGroup.position.set(0, -0.14, 0); this.head.add(this.mouthGroup);
    const inside = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), mouthMat);
    inside.scale.set(1.2, 0.6, 0.45); inside.position.set(0, -0.08, 0.26); this.mouthGroup.add(inside);
    this.jaw = new THREE.Group(); this.jaw.position.set(0, 0, 0.04); this.mouthGroup.add(this.jaw);
    // Stoffkanten (Lippen) und Metallzähnchen des Reißverschlusses
    const zip = (grp, pts, dy) => {
      grp.add(tube(pts, 0.03, lipMat));
      for (let i = 1; i < pts.length * 2 - 2; i++) {
        const p = pts[Math.floor(i / 2)].clone().lerp(pts[Math.ceil(i / 2)], (i % 2) * 0.5);
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.028, 0.02), zipMetal);
        tooth.position.copy(p); tooth.position.y += dy; tooth.position.z += 0.02; grp.add(tooth);
      }
    };
    zip(this.mouthGroup, arc(0.0, -0.04), -0.018);
    zip(this.jaw, arc(-0.03, -0.055, Z - 0.04), 0.018);
    // Schieber mit Zuglasche hängt am Mundwinkel
    this.pull = new THREE.Group(); this.pull.position.set(W - 0.02, 0.02, Z - 0.17); this.mouthGroup.add(this.pull);
    const slider = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), zipMetal); this.pull.add(slider);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.012), zipMetal); tab.position.y = -0.07; this.pull.add(tab);
    // Nähnadel-Zähne dahinter (nur sichtbar, wenn der Reißverschluss aufgeht)
    this.teeth = [];
    const nGeo = new THREE.ConeGeometry(0.012, 0.16, 6);
    for (const [grp, y0, bend, dir, zo] of [[this.mouthGroup, -0.03, -0.04, -1, 0.04], [this.jaw, -0.03, -0.055, 1, 0.09]]) {
      arc(y0, bend, Z - zo).forEach((p, i, a) => {
        if (i === 0 || i === a.length - 1) return;
        const t = new THREE.Mesh(nGeo, needle);
        t.position.copy(p); t.position.y += dir * 0.07;
        t.rotation.z = dir > 0 ? 0 : Math.PI; t.scale.y = 0.001;
        grp.add(t); this.teeth.push(t);
      });
    }

    this.eyeLight = new THREE.PointLight(0xff2010, 0, 3, 2);
    this.eyeLight.position.set(0, 0.1, 0.7); this.head.add(this.eyeLight);

    this.phase = 0; this.lean = 0; this.open = 0; this.openTarget = 0; this.twitch = 0; this.jerk = 0;
    this.forceOpen = false;
  }

  setAngry(on) {
    this.angry = on;
    this.eyeMat.emissive.set(on ? 0x3a0000 : 0x000000);
    this.eyeMat2.emissive.set(on ? 0x6a0000 : 0x000000);
    this.eyeLight.intensity = on ? 0.5 : 0;
  }

  setMouth(open) {
    this.forceOpen = open;
    if (open) this._applyMouth(1);
  }

  _applyMouth(o) {
    this.open = o;
    this.jaw.rotation.x = o * 0.8;
    this.jaw.position.y = -o * 0.05;
    this.pull.rotation.z = o * 0.6;
    for (const t of this.teeth) t.scale.y = 0.001 + Math.min(1, o * 2.2);
  }

  // speed: m/s, chase: bool
  animate(dt, speed, chase, lookYaw = 0, lookPitch = 0) {
    const moving = speed > 0.1;
    this.phase += dt * (1.6 + speed * 0.6) * (moving ? 1 : 0);
    const p = this.phase, amp = Math.min(1, speed / 3) * 0.8;
    const tNow = performance.now() / 1000;

    this.lean += ((chase ? 0.5 : 0.18) - this.lean) * Math.min(1, dt * 3);
    this.spine.rotation.x = this.lean + Math.sin(p * 2) * 0.05 * amp;
    this.spine.rotation.y = Math.sin(p) * 0.14 * amp;
    this.hips.position.y = 1.55 - Math.abs(Math.sin(p)) * 0.1 * amp + (moving ? 0 : Math.sin(tNow * 1.2) * 0.015);
    this.body.rotation.z = Math.sin(p) * 0.07 * amp;

    this.legs.forEach((l, i) => {
      const a = Math.sin(p + (i ? Math.PI : 0));
      l.up.rotation.x = a * 0.65 * amp - 0.04;
      l.lo.rotation.x = Math.max(0, -Math.cos(p + (i ? Math.PI : 0))) * 1.0 * amp + 0.06;
    });
    this.arms.forEach((a, i) => {
      const s = i ? 1 : -1, sw = Math.sin(p + (i ? 0 : Math.PI));
      if (chase) {
        a.up.rotation.x = -1.15 + sw * 0.3;
        a.lo.rotation.x = -0.35 + Math.sin(tNow * 8 + i) * 0.12;
        a.fingers.forEach((f, k) => { f.rotation.x = -0.5 - Math.sin(tNow * 12 + k + i) * 0.35; });
      } else {
        a.up.rotation.x = sw * 0.4 * amp - 0.03;
        a.lo.rotation.x = -0.12 - Math.max(0, sw) * 0.25 * amp;
        a.fingers.forEach((f, k) => { f.rotation.x = -0.15 + Math.sin(tNow * 2 + k) * 0.05; });
      }
      a.up.rotation.z = (0.1 + (chase ? 0.25 : 0)) * s;
    });

    // Reißverschluss geht beim Jagen halb auf – die Nadeln blitzen
    if (!this.forceOpen) {
      this.openTarget = chase ? 0.45 + Math.sin(tNow * 3) * 0.1 : 0;
      this._applyMouth(this.open + (this.openTarget - this.open) * Math.min(1, dt * 4));
    }
    this.pull.rotation.x = Math.sin(tNow * 2.3) * 0.2 * (moving ? 1 : 0.3);

    // ruckartige, schiefe Kopfbewegungen
    this.twitch -= dt;
    if (this.twitch <= 0) { this.twitch = 0.8 + Math.random() * 3; this.jerk = (Math.random() - 0.5) * 0.7; }
    this.jerk *= Math.pow(0.03, dt);
    this.neck.rotation.y = lookYaw;
    this.head.rotation.z = 0.15 + this.jerk + Math.sin(tNow * 0.9) * 0.06; // Kopf immer leicht schief
    this.neck.rotation.x = -this.lean * 0.85 + lookPitch;
  }
}
