/* =========================================================
   Mein Schulplaner – Stundenplan & Hausaufgabenheft
   Reines HTML/CSS/JS, speichert lokal im Browser (localStorage)
   ========================================================= */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------------------------------------------------------
   Konstanten
   --------------------------------------------------------- */
const DAYS_LONG  = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
const DAYS_SHORT = ['Mo','Di','Mi','Do','Fr'];
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli',
                'August','September','Oktober','November','Dezember'];

const PALETTE = ['#2f6fed','#e0483f','#2aa66b','#f29d1b','#a05ad4','#e4529f',
                 '#12a3b4','#8a6a4f','#6b7a2f','#d96a2b','#5c5ce0','#3c8a8a'];

const DEFAULT_SUBJECTS = [
  { id:'s1', name:'Deutsch',        color:'#2f6fed' },
  { id:'s2', name:'Mathe',          color:'#e0483f' },
  { id:'s3', name:'Englisch',       color:'#2aa66b' },
  { id:'s4', name:'Sachunterricht', color:'#12a3b4' },
  { id:'s5', name:'Sport',          color:'#f29d1b' },
  { id:'s6', name:'Kunst',          color:'#a05ad4' },
  { id:'s7', name:'Musik',          color:'#e4529f' },
  { id:'s8', name:'Religion',       color:'#8a6a4f' },
];

const STORE_KEY = 'schulplaner.v1';
const MAX_ROWS_LEFT = 5;          // ab wie vielen Fächern auf beide Seiten verteilt wird

/* ---------------------------------------------------------
   Zustand
   --------------------------------------------------------- */
let state = load();

function emptyPlan(periods){
  const p = {};
  for (let d = 0; d < 5; d++) p[d] = new Array(periods).fill(null);
  return p;
}

function defaults(){
  return { subjects: DEFAULT_SUBJECTS.map(s => ({...s})), periods: 8, plan: emptyPlan(8), hw:{}, notes:{} };
}

function load(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaults();
    const s = Object.assign(defaults(), JSON.parse(raw));
    s.periods = Math.min(12, Math.max(1, s.periods | 0 || 8));
    for (let d = 0; d < 5; d++){
      const col = Array.isArray(s.plan?.[d]) ? s.plan[d] : [];
      col.length = s.periods;
      s.plan[d] = Array.from(col, v => (typeof v === 'string' ? v : null));
    }
    if (!Array.isArray(s.subjects) || !s.subjects.length) s.subjects = defaults().subjects;
    s.hw    = s.hw    && typeof s.hw    === 'object' ? s.hw    : {};
    s.notes = s.notes && typeof s.notes === 'object' ? s.notes : {};
    return s;
  } catch (e){
    console.warn('Gespeicherte Daten konnten nicht gelesen werden:', e);
    return defaults();
  }
}

let saveTimer = null;
function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e){ console.warn('Speichern fehlgeschlagen:', e); }
  }, 120);
}

const subjectById = id => state.subjects.find(s => s.id === id) || null;

/* ---------------------------------------------------------
   Datums-Helfer
   --------------------------------------------------------- */
const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayIndex = d => (d.getDay() + 6) % 7;                 // 0 = Montag … 6 = Sonntag
const isSchoolDay = d => dayIndex(d) < 5;

function nextSchoolDay(d, step){
  let x = addDays(d, step);
  while (!isSchoolDay(x)) x = addDays(x, step);
  return x;
}
function todaySchoolDay(){
  const t = new Date(); t.setHours(12,0,0,0);
  return isSchoolDay(t) ? t : nextSchoolDay(t, 1);
}
const dateLabel = d => `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/* ---------------------------------------------------------
   Screens
   --------------------------------------------------------- */
function show(name){
  $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === 'screen-' + name));
  if (name === 'timetable') renderTimetable();
  if (name === 'book') renderBook();
  if (name === 'start') renderStart();
}

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) show(go.dataset.go);
});

function renderStart(){
  const t = new Date();
  const idx = dayIndex(t);
  const name = idx < 5 ? DAYS_LONG[idx] : (idx === 5 ? 'Samstag' : 'Sonntag');
  $('#start-date').textContent = `Heute ist ${name}, der ${dateLabel(t)}`;
}

/* =========================================================
   STUNDENPLAN
   ========================================================= */
function renderTimetable(){
  const tt = $('#tt');
  const P = state.periods;
  tt.style.gridTemplateColumns = 'minmax(36px,.55fr) repeat(5,1fr)';
  tt.style.gridTemplateRows = `auto repeat(${P}, minmax(38px,1fr))`;

  let html = '<div class="tt__head"></div>';
  for (let d = 0; d < 5; d++) html += `<div class="tt__head">${DAYS_SHORT[d]}</div>`;

  for (let p = 0; p < P; p++){
    html += `<div class="tt__num">${p+1}.</div>`;
    for (let d = 0; d < 5; d++){
      const id   = state.plan[d][p];
      const subj = subjectById(id);
      const same = (a,b) => a != null && a === b;
      const cont = same(id, state.plan[d][p-1]);
      const next = same(id, state.plan[d][p+1]);
      const cls  = ['tt__cell'];
      if (subj) cls.push('is-filled');
      if (subj && cont) cls.push('is-cont');
      if (subj && next) cls.push('has-next');
      html += `<button class="${cls.join(' ')}" data-day="${d}" data-period="${p}"`
            + (subj ? ` style="--c:${subj.color}"` : '') + '>'
            + (subj && !cont ? esc(subj.name) : '') + '</button>';
    }
  }
  tt.innerHTML = html;
  $('#tt-count').textContent = `${P} Stunden`;
}

$('#tt').addEventListener('click', e => {
  const cell = e.target.closest('.tt__cell');
  if (cell) openPicker(+cell.dataset.day, +cell.dataset.period);
});

$('#btn-more').addEventListener('click', () => {
  if (state.periods >= 12) return;
  state.periods++;
  for (let d = 0; d < 5; d++) state.plan[d].push(null);
  save(); renderTimetable();
});

$('#btn-less').addEventListener('click', () => {
  if (state.periods <= 1) return;
  state.periods--;
  for (let d = 0; d < 5; d++) state.plan[d].pop();
  save(); renderTimetable();
});

/* ---------- Dialog: Fach wählen ---------- */
let pickCell = null;

function openPicker(day, period){
  pickCell = { day, period };
  $('#pick-title').textContent = `${DAYS_LONG[day]} · ${period + 1}. Stunde`;
  $('#pick-chips').innerHTML = state.subjects.map(s =>
    `<button class="chip" data-id="${s.id}" style="--c:${s.color}">${esc(s.name)}</button>`).join('');
  openDialog('#dlg-pick');
}

$('#pick-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip || !pickCell) return;
  state.plan[pickCell.day][pickCell.period] = chip.dataset.id;
  save(); renderTimetable(); closeDialog();
});

$('#pick-clear').addEventListener('click', () => {
  if (!pickCell) return;
  state.plan[pickCell.day][pickCell.period] = null;
  save(); renderTimetable(); closeDialog();
});

$('#pick-new').addEventListener('click', () => {
  const s = { id: 'u' + Date.now().toString(36), name: 'Neues Fach',
              color: PALETTE[state.subjects.length % PALETTE.length] };
  state.subjects.push(s);
  if (pickCell) state.plan[pickCell.day][pickCell.period] = s.id;
  save(); renderTimetable(); closeDialog();
  openSubjects(s.id);
});

/* ---------- Dialog: Fächer verwalten ---------- */
function openSubjects(focusId){
  renderSubjects();
  openDialog('#dlg-subjects');
  if (focusId){
    const inp = $(`.subj[data-id="${focusId}"] .subj__name`);
    if (inp){ inp.focus(); inp.select(); }
  }
}

function renderSubjects(){
  $('#subj-list').innerHTML = state.subjects.map(s => `
    <div class="subj" data-id="${s.id}">
      <input class="subj__name" value="${esc(s.name)}" maxlength="22" aria-label="Name des Fachs">
      <div class="subj__colors">
        ${PALETTE.map(c => `<button class="swatch${c === s.color ? ' is-on' : ''}" data-color="${c}" style="--c:${c}" aria-label="Farbe"></button>`).join('')}
      </div>
      <button class="subj__del" data-del aria-label="Fach löschen">✕</button>
    </div>`).join('');
}

$('#btn-subjects').addEventListener('click', () => openSubjects());

$('#subj-add').addEventListener('click', () => {
  const s = { id:'u' + Date.now().toString(36), name:'Neues Fach',
              color: PALETTE[state.subjects.length % PALETTE.length] };
  state.subjects.push(s); save(); renderSubjects();
  const inp = $(`.subj[data-id="${s.id}"] .subj__name`);
  if (inp){ inp.focus(); inp.select(); }
});

$('#subj-list').addEventListener('input', e => {
  const row = e.target.closest('.subj');
  if (!row || !e.target.classList.contains('subj__name')) return;
  const s = subjectById(row.dataset.id);
  if (s){ s.name = e.target.value; save(); renderTimetable(); }
});

$('#subj-list').addEventListener('click', e => {
  const row = e.target.closest('.subj');
  if (!row) return;
  const s = subjectById(row.dataset.id);
  if (!s) return;

  const sw = e.target.closest('.swatch');
  if (sw){
    s.color = sw.dataset.color;
    $$('.swatch', row).forEach(b => b.classList.toggle('is-on', b.dataset.color === s.color));
    save(); renderTimetable(); return;
  }
  if (e.target.closest('[data-del]')){
    if (!confirm(`„${s.name}“ wirklich löschen?`)) return;
    state.subjects = state.subjects.filter(x => x.id !== s.id);
    for (let d = 0; d < 5; d++)
      state.plan[d] = state.plan[d].map(v => v === s.id ? null : v);
    save(); renderSubjects(); renderTimetable();
  }
});

/* =========================================================
   HAUSAUFGABENHEFT
   ========================================================= */
let current = todaySchoolDay();

/* Fächer eines Tages zu Blöcken zusammenfassen (1.–2. Stunde Deutsch …) */
function blocksFor(date){
  const d = dayIndex(date);
  if (d > 4) return [];
  const col = state.plan[d] || [];
  const out = [];
  for (let p = 0; p < col.length; p++){
    const id = col[p];
    if (!id) continue;
    const last = out[out.length - 1];
    if (last && last.id === id && last.to === p - 1){ last.to = p; continue; }
    out.push({ id, from: p, to: p });
  }
  return out;
}

const hwFor = (dateKey, period) => (state.hw[dateKey] || {})[period] || null;

function hoursLabel(b){
  return b.from === b.to ? `${b.from + 1}.` : `${b.from + 1}.–${b.to + 1}.`;
}

/* HTML einer Buchseite (links / rechts) */
function pageHTML(date, side){
  const k = key(date);
  const blocks = blocksFor(date);
  const split  = blocks.length > MAX_ROWS_LEFT;
  const mid    = split ? Math.ceil(blocks.length / 2) : blocks.length;
  const mine   = side === 'left' ? blocks.slice(0, mid) : blocks.slice(mid);
  const dName  = DAYS_LONG[dayIndex(date)] || '';

  let head, body;

  if (side === 'left'){
    head = `<div class="pg__head"><span class="pg__day">${dName}</span>
              <span class="pg__date">${date.getDate()}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}</span></div>`;
    body = blocks.length
      ? mine.map(b => rowHTML(b, k)).join('')
      : `<div class="pg__empty">Für ${dName} ist noch kein Stundenplan da –
           <b data-go="timetable">&nbsp;hier eintragen</b>.</div>`;
  } else {
    if (split){
      head = `<div class="pg__head"><span class="pg__kicker">Hausaufgaben</span>
                <span class="pg__date">${dName}</span></div>`;
      body = mine.map(b => rowHTML(b, k)).join('');
    } else {
      head = `<div class="pg__head"><span class="pg__kicker">Notizen</span>
                <span class="pg__date">${dName}</span></div>`;
      body = `<textarea class="notes" data-date="${k}" placeholder="Nicht vergessen …">${esc(state.notes[k] || '')}</textarea>`;
    }
  }

  const done = blocks.filter(b => { const h = hwFor(k, b.from); return h && (h.done || h.none); }).length;
  const foot = side === 'left' && blocks.length
    ? `<div class="pg__foot"><span>${blocks.length} Fächer</span><span>${done} von ${blocks.length} erledigt</span></div>`
    : '';

  return `<div class="pg">${head}<div class="pg__body pg__body--scroll">${body}</div>${foot}</div>`;
}

function rowHTML(b, k){
  const s  = subjectById(b.id);
  const hw = hwFor(k, b.from);
  const color = s ? s.color : '#555';
  const name  = s ? s.name : 'Fach';
  const cls   = ['row'];
  if (hw && hw.done) cls.push('is-done');

  let text = '';
  if (hw && hw.none){
    text = `<button class="row__text row__text--none" data-hw="${b.from}">keine Hausaufgaben ✓</button>`;
  } else if (hw && hw.t){
    text = `<button class="row__text" data-hw="${b.from}">${esc(hw.t)}</button>`;
  }

  const right = hw
    ? `<button class="row__check" data-done="${b.from}" aria-label="Erledigt">${hw.done ? '✓' : ''}</button>`
    : `<button class="row__add" data-hw="${b.from}" aria-label="Hausaufgabe eintragen">+</button>`;

  return `<div class="${cls.join(' ')}" style="--c:${color}">
      <div class="row__main">
        <span class="row__hours">${hoursLabel(b)}</span>
        <span class="row__dot"></span>
        <span class="row__subject">${esc(name)}</span>
        <span class="row__spacer"></span>
        ${right}
      </div>${text}</div>`;
}

function renderBook(){
  $('#page-left').innerHTML  = pageHTML(current, 'left');
  $('#page-right').innerHTML = pageHTML(current, 'right');
}

/* ---------- Hausaufgaben-Dialog ---------- */
let hwCtx = null;

function openHW(period){
  const k = key(current);
  const b = blocksFor(current).find(x => x.from === period);
  if (!b) return;
  const s  = subjectById(b.id);
  const hw = hwFor(k, period);
  hwCtx = { k, period };

  $('#hw-title').textContent = s ? s.name : 'Hausaufgabe';
  $('#hw-sub').textContent   = `${DAYS_LONG[dayIndex(current)]}, ${dateLabel(current)} · ${hoursLabel(b)} Stunde`;
  $('#hw-text').value = hw && !hw.none ? hw.t : '';
  $('#hw-del').hidden = !hw;
  openDialog('#dlg-hw');
  setTimeout(() => $('#hw-text').focus(), 60);
}

function setHW(value){
  if (!hwCtx) return;
  const { k, period } = hwCtx;
  if (value === null){
    if (state.hw[k]){ delete state.hw[k][period]; if (!Object.keys(state.hw[k]).length) delete state.hw[k]; }
  } else {
    state.hw[k] = state.hw[k] || {};
    state.hw[k][period] = Object.assign({ done:false }, state.hw[k][period], value);
  }
  save(); renderBook(); closeDialog();
}

$('#hw-save').addEventListener('click', () => {
  const t = $('#hw-text').value.trim();
  if (!t) return setHW({ t:'', none:true });
  setHW({ t, none:false });
});
$('#hw-none').addEventListener('click', () => setHW({ t:'', none:true, done:false }));
$('#hw-del').addEventListener('click',  () => setHW(null));

/* ---------- Klicks & Eingaben im Buch ---------- */
$('#screen-book').addEventListener('click', e => {
  const hw = e.target.closest('[data-hw]');
  if (hw && !flip.busy){ openHW(+hw.dataset.hw); return; }

  const dn = e.target.closest('[data-done]');
  if (dn){
    const k = key(current), p = dn.dataset.done;
    const cur = hwFor(k, p);
    if (cur){ cur.done = !cur.done; save(); renderBook(); }
  }
});

$('#screen-book').addEventListener('input', e => {
  if (e.target.classList.contains('notes')){
    state.notes[e.target.dataset.date] = e.target.value;
    save();
  }
});

/* =========================================================
   BLÄTTERN (3-D)
   ========================================================= */
const book     = $('#book');
const flipFwd  = $('#flip-fwd');
const flipBack = $('#flip-back');

const flip = { dir:0, el:null, target:null, angle:0, busy:false };

function prepare(dir){
  if (dir > 0){
    const next = nextSchoolDay(current, 1);
    $('#fwd-front').innerHTML = pageHTML(current, 'right');
    $('#fwd-back').innerHTML  = pageHTML(next, 'left');
    $('#page-right').innerHTML = pageHTML(next, 'right');
    flip.el = flipFwd; flip.target = next;
  } else {
    const prev = nextSchoolDay(current, -1);
    $('#back-front').innerHTML = pageHTML(current, 'left');
    $('#back-back').innerHTML  = pageHTML(prev, 'right');
    $('#page-left').innerHTML  = pageHTML(prev, 'left');
    flip.el = flipBack; flip.target = prev;
  }
  flip.dir = dir;
  flip.el.classList.remove('is-animating');
  flip.el.style.transform = 'rotateY(0deg)';
  flip.el.classList.add('is-on');
  flip.busy = true;
}

function setAngle(progress){
  const p = Math.max(0, Math.min(1, progress));
  flip.angle = flip.dir > 0 ? -180 * p : 180 * p;
  flip.el.style.transform = `rotateY(${flip.angle}deg)`;
}

function finish(commit){
  if (!flip.el) return;
  const el = flip.el;
  const end = commit ? (flip.dir > 0 ? -180 : 180) : 0;
  el.classList.add('is-animating');
  el.style.transform = `rotateY(${end}deg)`;

  const done = () => {
    el.removeEventListener('transitionend', done);
    clearTimeout(timer);
    if (commit) current = flip.target;
    renderBook();
    el.classList.remove('is-on', 'is-animating');
    el.style.transform = 'rotateY(0deg)';
    flip.el = null; flip.dir = 0; flip.busy = false;
  };
  const timer = setTimeout(done, 620);
  el.addEventListener('transitionend', done);
}

function goto(dir){
  if (flip.busy) return;
  prepare(dir);
  requestAnimationFrame(() => finish(true));
  hideHint();
}

$('#btn-next').addEventListener('click', () => goto(1));
$('#btn-prev').addEventListener('click', () => goto(-1));
$('#btn-today').addEventListener('click', () => {
  if (flip.busy) return;
  const t = todaySchoolDay();
  if (key(t) === key(current)) return;
  const dir = t > current ? 1 : -1;
  current = nextSchoolDay(t, -dir);      // eine Seite davor …
  prepare(dir);                          // … und einmal hinblättern
  requestAnimationFrame(() => finish(true));
});

/* ---------- Wischen ---------- */
let drag = null;

book.addEventListener('pointerdown', e => {
  if (flip.busy) return;
  if (e.target.closest('button, a')) return;      // Knöpfe bleiben Knöpfe
  drag = { x:e.clientX, y:e.clientY, decided:false, id:e.pointerId };
});

book.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;

  if (!drag.decided){
    if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)){ drag = null; return; }
    if (Math.abs(dx) < 14) return;
    drag.decided = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    book.classList.add('is-dragging');
    try { book.setPointerCapture(drag.id); } catch (err) {}
    prepare(dx < 0 ? 1 : -1);
    hideHint();
  }
  const half = book.clientWidth / 2;
  setAngle(flip.dir > 0 ? -dx / half : dx / half);
  e.preventDefault();
}, { passive:false });

function endDrag(e){
  if (!drag) return;
  const decided = drag.decided;
  const dx = e.clientX - drag.x;
  try { book.releasePointerCapture(drag.id); } catch (err) {}
  drag = null;
  book.classList.remove('is-dragging');
  if (!decided) return;
  const half = book.clientWidth / 2;
  const progress = Math.abs(dx) / half;
  finish(progress > 0.3);
}
book.addEventListener('pointerup', endDrag);
book.addEventListener('pointercancel', () => {
  if (drag && drag.decided) finish(false);
  drag = null; book.classList.remove('is-dragging');
});

document.addEventListener('keydown', e => {
  if (!$('#screen-book').classList.contains('is-active') || !$('#overlay').hidden) return;
  if (e.key === 'ArrowRight') goto(1);
  if (e.key === 'ArrowLeft')  goto(-1);
});

let hintTimer = setTimeout(hideHint, 6000);
function hideHint(){ clearTimeout(hintTimer); $('#swipe-hint').classList.add('is-hidden'); }

/* =========================================================
   Dialog-Hilfen
   ========================================================= */
function openDialog(sel){
  $$('#overlay .sheet').forEach(s => s.hidden = true);
  $(sel).hidden = false;
  $('#overlay').hidden = false;
}
function closeDialog(){
  $('#overlay').hidden = true;
  $$('#overlay .sheet').forEach(s => s.hidden = true);
  pickCell = null; hwCtx = null;
}
$('#overlay').addEventListener('click', e => {
  if (e.target.id === 'overlay' || e.target.closest('[data-close]')) closeDialog();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog(); });

/* Doppeltipp-Zoom in Safari verhindern */
let lastTouch = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouch < 320) e.preventDefault();
  lastTouch = now;
}, { passive:false });

function esc(s){
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* ---------------------------------------------------------
   Start
   --------------------------------------------------------- */
renderStart();
renderBook();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
