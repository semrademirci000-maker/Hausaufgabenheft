// "Langbein" – ein dürres, zu großes Spielzeug mit endlos langen Armen und einem Grinsen voller Zähne.
import * as THREE from 'three';
import { furTexture, grinTexture } from './textures.js';

function limb(r, len, mat) {
  // Glied, das an seinem oberen Ende aufgehängt ist (Pivot) und nach unten zeigt
  const pivot = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
  m.position.y = -len / 2;
  m.castShadow = true;
  pivot.add(m);
  const end = new THREE.Group(); end.position.y = -len; pivot.add(end);
  pivot.userData.end = end;
  return pivot;
}

export class MonsterModel {
  constructor() {
    const fur = furTexture();
    this.furMat = new THREE.MeshStandardMaterial({ map: fur, color: 0xffffff, roughness: 1, metalness: 0 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x120810, roughness: 0.9 });
    this.eyeMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffe9a8, emissiveIntensity: 0.6, roughness: 0.3 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050000 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0xd8d0bc, roughness: 0.5 });

    const root = this.root = new THREE.Group();
    const body = this.body = new THREE.Group();
    root.add(body);

    // Hüfte
    this.hips = new THREE.Group(); this.hips.position.y = 1.55; body.add(this.hips);
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), this.furMat);
    pelvis.scale.set(1.1, 0.7, 0.8); pelvis.castShadow = true; this.hips.add(pelvis);

    // Beine
    this.legs = [-1, 1].map(s => {
      const up = limb(0.12, 0.72, this.furMat); up.position.set(0.2 * s, 0, 0); this.hips.add(up);
      const lo = limb(0.1, 0.72, this.furMat); up.userData.end.add(lo);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.38), dark); foot.position.set(0, -0.02, 0.1); lo.userData.end.add(foot);
      return { up, lo };
    });

    // Oberkörper (lehnt sich nach vorn)
    this.spine = new THREE.Group(); this.hips.add(this.spine);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.9, 6, 14), this.furMat);
    torso.position.y = 0.62; torso.scale.set(1, 1, 0.75); torso.castShadow = true; this.spine.add(torso);
    // Rippen / Nähte als Details
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 6, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8a7b62 }));
    seam.position.set(0, 0.7, 0.2); seam.rotation.set(0, 0, Math.PI); this.spine.add(seam);

    // Schultern + Arme (sehr lang)
    this.shoulders = new THREE.Group(); this.shoulders.position.y = 1.18; this.spine.add(this.shoulders);
    this.arms = [-1, 1].map(s => {
      const up = limb(0.09, 0.95, this.furMat); up.position.set(0.44 * s, 0, 0); up.rotation.z = 0.12 * s; this.shoulders.add(up);
      const lo = limb(0.075, 1.05, this.furMat); up.userData.end.add(lo);
      const hand = new THREE.Group(); lo.userData.end.add(hand);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), this.furMat); palm.scale.set(1, 1.2, 0.6); hand.add(palm);
      for (let f = 0; f < 4; f++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.34, 6), clawMat);
        claw.position.set((f - 1.5) * 0.05, -0.22, 0.02); claw.rotation.x = Math.PI; claw.rotation.z = (f - 1.5) * 0.12;
        claw.castShadow = true; hand.add(claw);
      }
      return { up, lo, hand };
    });

    // Hals + Kopf
    this.neck = new THREE.Group(); this.neck.position.y = 1.25; this.spine.add(this.neck);
    const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 8), this.furMat); neckM.position.y = 0.12; this.neck.add(neckM);
    this.head = new THREE.Group(); this.head.position.y = 0.46; this.neck.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 16), this.furMat);
    skull.scale.set(1.1, 0.95, 0.92); skull.castShadow = true; this.head.add(skull);
    // Ohren (zerrissene Plüschohren)
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), this.furMat);
      ear.position.set(0.3 * s, 0.38, -0.05); ear.rotation.z = -0.5 * s; this.head.add(ear);
    }
    // Augen
    this.eyes = [-1, 1].map(s => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), this.eyeMat);
      e.position.set(0.16 * s, 0.1, 0.33); this.head.add(e);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), pupilMat);
      p.position.set(0, 0, 0.085); e.add(p);
      return e;
    });
    // Grinsen
    this.grinClosed = grinTexture(0);
    this.grinOpen = grinTexture(1);
    this.mouthMat = new THREE.MeshBasicMaterial({ map: this.grinClosed, transparent: true, depthWrite: false });
    const mouthGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.5, 24, 1, true, -1.1, 2.2);
    this.mouth = new THREE.Mesh(mouthGeo, this.mouthMat);
        this.mouth.position.set(0, -0.12, 0.0); this.mouth.scale.set(1.0, 1, 0.95);
    this.head.add(this.mouth);

    this.eyeLight = new THREE.PointLight(0xff3020, 0, 3, 2);
    this.eyeLight.position.set(0, 0.1, 0.6); this.head.add(this.eyeLight);

    this.phase = 0;
    this.twitch = 0;
    this.lean = 0;
    this.mouthOpen = 0;
  }

  setAngry(on) {
    this.eyeMat.emissive.set(on ? 0xff2a10 : 0xffe9a8);
    this.eyeMat.emissiveIntensity = on ? 2.5 : 0.6;
    this.eyeLight.intensity = on ? 2 : 0;
  }

  setMouth(open) {
    this.mouthMat.map = open ? this.grinOpen : this.grinClosed;
    this.mouthMat.needsUpdate = true;
  }

  // speed: m/s, chase: 0..1
  animate(dt, speed, chase, lookYaw = 0, lookPitch = 0) {
    const stepRate = 1.7 + speed * 0.55;
    const moving = speed > 0.1;
    this.phase += dt * stepRate * (moving ? 1 : 0);
    const p = this.phase;
    const amp = Math.min(1, speed / 3) * 0.75;

    this.lean += ((chase ? 0.45 : 0.12) - this.lean) * Math.min(1, dt * 3);
    this.spine.rotation.x = this.lean + Math.sin(p * 2) * 0.04 * amp;
    this.hips.position.y = 1.55 - Math.abs(Math.sin(p)) * 0.08 * amp + (moving ? 0 : Math.sin(performance.now() / 700) * 0.02);
    this.body.rotation.z = Math.sin(p) * 0.06 * amp;

    this.legs.forEach((l, i) => {
      const s = i ? 1 : -1;
      const a = Math.sin(p + (i ? Math.PI : 0));
      l.up.rotation.x = a * 0.6 * amp - 0.05;
      l.lo.rotation.x = Math.max(0, -Math.cos(p + (i ? Math.PI : 0))) * 0.9 * amp + 0.05;
      l.up.rotation.z = 0.04 * s;
    });
    this.arms.forEach((a, i) => {
      const s = i ? 1 : -1;
      const sw = Math.sin(p + (i ? 0 : Math.PI));
      if (chase) {
        // Arme nach vorn gestreckt, greifend
        a.up.rotation.x = -1.0 + sw * 0.35;
        a.lo.rotation.x = -0.4 + Math.sin(performance.now() / 120 + i) * 0.15;
      } else {
        a.up.rotation.x = sw * 0.35 * amp - 0.05;
        a.lo.rotation.x = -0.15 - Math.max(0, sw) * 0.2;
      }
      a.up.rotation.z = (0.12 + (chase ? 0.2 : 0)) * s;
    });

    // Kopf: ruckartige, unnatürliche Zuckungen
    this.twitch -= dt;
    if (this.twitch <= 0) {
      this.twitch = 0.6 + Math.random() * 2.5;
      this.jerk = (Math.random() - 0.5) * 0.9;
    }
    this.jerk = (this.jerk || 0) * Math.pow(0.02, dt);
    this.neck.rotation.y = lookYaw;
    this.head.rotation.z = this.jerk + Math.sin(performance.now() / 900) * 0.08;
    this.neck.rotation.x = -this.lean * 0.8 + lookPitch;
  }
}
