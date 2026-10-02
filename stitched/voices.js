// Echte Sprecher: Aufnahmen für jeden Satz (bleiben auf diesem Gerät, in IndexedDB)
// Optional liegt ein fertiges Stimmen-Paket im Spielordner (voices/pack.json) – das bekommen dann alle Spieler.
import { LINES, lineKey } from './voicelines.js';

export { LINES, lineKey };

export const WHO_LABEL = { MILA: 'Mila', TAILOR: 'The Tailor', ZIPPER: 'Zipper', DURCHSAGE: 'Durchsage' };

export class VoiceBank {
  constructor() {
    this.local = new Map();   // key -> Blob (eigene Aufnahmen)
    this.packed = new Map();  // key -> Blob (mitgeliefertes Paket)
    this.buffers = new Map(); // key -> AudioBuffer (dekodiert)
    this.db = null;
    this.ready = this._load();
  }

  _open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('stitched-voices', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('clips');
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }

  async _load() {
    try {
      const db = await this._open();
      await new Promise(res => {
        const tx = db.transaction('clips').objectStore('clips').openCursor();
        tx.onsuccess = () => { const c = tx.result; if (!c) return res(); this.local.set(c.key, c.value); c.continue(); };
        tx.onerror = () => res();
      });
    } catch (e) { /* kein Speicher (privates Fenster) – dann eben ohne */ }
    try {
      const r = await fetch('voices/pack.json', { cache: 'no-cache' });
      if (r.ok) await this._importPack(await r.json(), this.packed);
    } catch (e) { /* kein Paket vorhanden */ }
  }

  has(key) { return this.local.has(key) || this.packed.has(key); }
  hasOwn(key) { return this.local.has(key); }
  count() { return LINES.filter(l => this.has(lineKey(l.who, l.text))).length; }

  async set(key, blob) {
    this.local.set(key, blob); this.buffers.delete(key);
    try { const db = await this._open(); await new Promise(res => { const t = db.transaction('clips', 'readwrite'); t.objectStore('clips').put(blob, key); t.oncomplete = t.onerror = () => res(); }); }
    catch (e) { /* nur für diese Sitzung */ }
  }
  async remove(key) {
    this.local.delete(key); this.buffers.delete(key);
    try { const db = await this._open(); await new Promise(res => { const t = db.transaction('clips', 'readwrite'); t.objectStore('clips').delete(key); t.oncomplete = t.onerror = () => res(); }); }
    catch (e) { /* egal */ }
  }

  // AudioBuffer holen (eigene Aufnahme geht vor dem Paket)
  async buffer(ctx, key) {
    if (this.buffers.has(key)) return this.buffers.get(key);
    const blob = this.local.get(key) || this.packed.get(key);
    if (!blob || !ctx) return null;
    try {
      const ab = await blob.arrayBuffer();
      const buf = await new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
      this.buffers.set(key, buf);
      return buf;
    } catch (e) { return null; }
  }
  // Alle Aufnahmen vorab dekodieren, damit sie im Spiel sofort kommen
  preload(ctx) { for (const l of LINES) { const k = lineKey(l.who, l.text); if (this.has(k)) this.buffer(ctx, k); } }

  // ----- Paket: alle Aufnahmen in einer Datei sichern / laden -----
  async exportPack() {
    const lines = {};
    for (const [k, blob] of this.local) lines[k] = await blobToDataUrl(blob);
    return { game: 'STITCHED', version: 1, lines };
  }
  async _importPack(pack, target) {
    if (!pack || !pack.lines) return 0;
    let n = 0;
    for (const [k, url] of Object.entries(pack.lines)) {
      try { const blob = await (await fetch(url)).blob(); if (target === this.local) await this.set(k, blob); else target.set(k, blob); n++; } catch (e) { /* kaputter Eintrag */ }
    }
    return n;
  }
  importPack(pack) { return this._importPack(pack, this.local); }
}

function blobToDataUrl(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}

// Mikrofon-Aufnahme
export class Recorder {
  static supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
    const type = types.find(t => MediaRecorder.isTypeSupported?.(t));
    this.rec = new MediaRecorder(this.stream, type ? { mimeType: type } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.start();
  }
  stop() {
    return new Promise(res => {
      if (!this.rec) return res(null);
      this.rec.onstop = () => {
        this.stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(this.chunks, { type: this.rec.mimeType || 'audio/mp4' });
        this.rec = null; res(blob.size > 500 ? blob : null);
      };
      this.rec.stop();
    });
  }
}
