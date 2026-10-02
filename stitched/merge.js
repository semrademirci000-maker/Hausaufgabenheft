import * as THREE from 'three';

// Hilfen, um viele kleine Einzelteile zu wenigen Objekten zusammenzufassen (weniger Zeichenaufrufe = flüssiger)

// Alle Objekte finden, die ein Modell selbst gespeichert hat (die werden animiert und dürfen nicht verschmelzen)
export function animatedParts(model) {
  const out = new Set();
  const walk = (v, depth) => {
    if (!v || depth > 4) return;
    if (v.isObject3D) { out.add(v); return; }
    if (Array.isArray(v)) { v.forEach(x => walk(x, depth + 1)); return; }
    if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) Object.values(v).forEach(x => walk(x, depth + 1));
  };
  for (const k of Object.keys(model)) if (k !== 'root') walk(model[k], 0);
  return out;
}

function mergeGeos(list, useLocal) {
  const parts = list.map(o => {
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(useLocal ? o.matrix : o.matrixWorld);
    return g;
  });
  let n = 0; parts.forEach(g => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o3 = 0, o2 = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o3); nor.set(g.attributes.normal.array, o3); uv.set(g.attributes.uv.array, o2);
    o3 += g.attributes.position.count * 3; o2 += g.attributes.uv.count * 2; g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  return geo;
}
export const mergeable = o => o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && !Array.isArray(o.material) &&
  o.geometry.attributes.position && o.geometry.attributes.normal && o.geometry.attributes.uv && !o.geometry.morphAttributes?.position;
export { mergeGeos };

// In einem Figuren-Modell: Blatt-Teile mit gleichem Elternteil und gleichem Material zusammenfassen
export function mergeSiblings(root, exclude = new Set()) {
  root.updateMatrix();
  const parents = [];
  root.traverse(o => { if (o.children.length) parents.push(o); });
  for (const par of parents) {
    const buckets = new Map();
    for (const o of par.children) {
      if (exclude.has(o) || o.children.length || !mergeable(o)) continue;
      o.updateMatrix();
      if (o.matrix.determinant() < 0) continue;
      const key = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow + '|' + o.renderOrder;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(o);
    }
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const m = new THREE.Mesh(mergeGeos(list, true), list[0].material);
      m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder;
      m.userData = { ...list[0].userData };
      par.add(m);
      list.forEach(o => par.remove(o));
    }
  }
}
