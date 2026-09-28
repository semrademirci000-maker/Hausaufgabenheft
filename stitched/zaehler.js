// Anonymer Zähler: wie viele Leute STITCHED spielen.
// Gezählt wird nur „+1“ – keine Namen, keine Daten vom Gerät.
// Die Zahlen sieht Muaz auf board.html.
const API = 'https://abacus.jasoncameron.dev/hit/semrademirci000-stitched/';
const KEY = 'stitched.zaehler';

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* egal */ } }
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// event: 'besuch' (Seite geöffnet), 'start' (neue Runde), 'entkommen', 'erwischt'
export function count(event) {
  if (!location.hostname.endsWith('github.io')) return;   // lokal nicht mitzählen
  const s = load();
  if (s.owner) return;                                     // Muaz' eigenes Gerät zählt nicht
  const keys = [];
  if (event === 'besuch') {
    if (!s.besucher) { keys.push('besucher'); s.besucher = true; }
    if (s.tag !== today()) { keys.push('tag-' + today()); s.tag = today(); }
  } else if (event === 'start') {
    keys.push('runden');
    if (!s.spieler) { keys.push('spieler'); s.spieler = true; }
  } else {
    keys.push(event);
  }
  if (!keys.length) return;
  save(s);
  for (const k of keys) fetch(API + k, { cache: 'no-store' }).catch(() => {});
}
