// Start: Zustand laden, Ansicht zeichnen, Eingaben verdrahten, Service Worker anmelden.

import { MAX_L, UNITS, CONTAINERS } from './recipes.js';
import { $, $$, esc, fAuto, fInt, fL, fNum, num, toast } from './utils.js';
import { loadRecipes, loadState, save, defaultRecipes } from './storage.js';
import { compute, batchText } from './calc.js';
import { renderResult } from './views/result.js';
import { openEditor, initEditor } from './views/editor.js';
import { renderRecipePicker, initRecipePicker } from './views/recipe-picker.js';

let recipes = loadRecipes();
const state = loadState();
if (!recipes.some(r => r.id === state.currentId)) state.currentId = recipes[0].id;

const current = () => recipes.find(r => r.id === state.currentId);
let last = null; // letztes Rechenergebnis (für Kopieren)

/* ---------- Regler: 0–500 = 0,5–10 L (feine Schritte), 500–1000 = 10–100 L ---------- */

const sliderToL = v => {
  v = +v;
  if (v <= 500) return Math.round((0.5 + v / 500 * 9.5) * 10) / 10;
  return Math.round((10 + (v - 500) / 500 * 90) * 2) / 2;
};
const lToSlider = l => l <= 10 ? (l - 0.5) / 9.5 * 500 : 500 + (l - 10) / 90 * 500;

$('#jarSel').innerHTML = CONTAINERS.map(c => `<option value="${c.l}">${c.label}</option>`).join('');
if (!CONTAINERS.some(c => c.l === +state.jarL)) state.jarL = 7.5;

/* ---------- Zeichnen ---------- */

function renderRecipePick() {
  renderRecipePicker(recipes, state.currentId);

  const r = current();
  $('#recipeSpec').innerHTML = r ? r.ings.filter(i => i.name).map(i =>
    `<b>${fAuto(+i.amount)} ${UNITS[i.unit].label}</b> ${esc(i.name)}${i.batch ? '' : ' <span class="tag">frisch</span>'}`
  ).join(' · ') : '';
}

function renderInputs() {
  $$('.seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === state.mode));
  $('#volBox').hidden = state.mode !== 'vol';
  $('#countBox').hidden = state.mode !== 'count';
  $('#volInput').value = state.targetL;
  $('#volRange').value = lToSlider(state.targetL);
  $$('#volPresets .btn').forEach(b => b.setAttribute('aria-pressed', +b.dataset.l === +state.targetL));
  $('#countInput').value = state.count;
  $('#jarSel').value = String(state.jarL);
}

function renderOutput() {
  last = compute(current(), state);
  renderResult($('#result'), last, state);
  // Bemerkung unter der Batch-Menge: bei Litern die Drinks, bei Drinks die Liter
  const ok = last && !last.empty;
  const label = '<span class="note-label">Bemerkung:</span> ';
  $('#volNote').innerHTML = ok ? `${label}≈ ${fInt(last.drinks)} Drinks à ${fNum(last.pourCl, 1)} cl aus dem Batch` : '';
  $('#countNote').innerHTML = ok ? `${label}${fL(last.totalMl)} Batch · max. ${fInt(last.maxCount)} Drinks bei ${MAX_L} L` : '';
}

function renderAll() {
  renderRecipePick();
  renderInputs();
  renderOutput();
  save(recipes, state);
}

/* ---------- Eingaben ---------- */

const setVol = v => { v = num(v); if (v) state.targetL = Math.min(MAX_L, Math.max(0.5, Math.round(v * 10) / 10)); };
const setCount = v => { v = Math.round(num(v)); state.count = Math.max(1, v); };

initRecipePicker({
  onSelect(id) { state.currentId = id; renderAll(); },
  onAdd() { openEditor(null); },
});
$('#editBtn').addEventListener('click', () => openEditor(current()));

// Umschalten Volumen ↔ Anzahl: den anderen Wert passend mitnehmen
$$('.seg button').forEach(b => b.addEventListener('click', () => {
  if (last && !last.empty) {
    if (b.dataset.mode === 'count' && state.mode === 'vol') state.count = Math.max(1, Math.floor(last.n));
    if (b.dataset.mode === 'vol' && state.mode === 'count') setVol(last.totalMl / 1000);
  }
  state.mode = b.dataset.mode;
  renderAll();
}));

$('#volRange').addEventListener('input', e => {
  setVol(sliderToL(e.target.value));
  $('#volInput').value = state.targetL;
  $$('#volPresets .btn').forEach(b => b.setAttribute('aria-pressed', +b.dataset.l === +state.targetL));
  renderOutput();
  save(recipes, state);
});
$('#volInput').addEventListener('change', e => { setVol(e.target.value); renderAll(); });
$('#volPresets').addEventListener('click', e => {
  const b = e.target.closest('[data-l]');
  if (b) { setVol(b.dataset.l); renderAll(); }
});

$('#countInput').addEventListener('change', e => { setCount(e.target.value); renderAll(); });
$('#countBox').addEventListener('click', e => {
  const b = e.target.closest('[data-step]');
  if (b) { setCount(state.count + +b.dataset.step); renderAll(); }
});

$('#jarSel').addEventListener('change', e => { state.jarL = +e.target.value; renderAll(); });

$('#result').addEventListener('click', async e => {
  if (!last || last.empty) return;
  if (e.target.id === 'copyBtn') {
    const text = batchText(last, state);
    try {
      await navigator.clipboard.writeText(text);
      toast('Batch-Zettel kopiert');
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta);
      ta.select();
      try { document.execCommand('copy'); toast('Batch-Zettel kopiert'); } catch { toast('Kopieren nicht möglich'); }
      ta.remove();
    }
  }
  const round = e.target.closest('#roundUp');
  if (round) { setVol(round.dataset.l); renderAll(); return; }
  if (e.target.id === 'printBtn') {
    try { window.print(); } catch { toast('Drucken hier nicht möglich'); }
  }
});

/* ---------- Editor ---------- */

initEditor({
  onSave(id, data) {
    if (id) Object.assign(recipes.find(r => r.id === id), data);
    else {
      const newId = 'r' + Date.now().toString(36);
      recipes.push({ id: newId, ...data });
      state.currentId = newId;
    }
    renderAll();
  },
  onDelete(id) {
    recipes = recipes.filter(r => r.id !== id);
    if (!recipes.length) recipes = defaultRecipes();
    state.currentId = recipes[0].id;
    renderAll();
  },
});

/* ---------- Offline (PWA) ---------- */
// Beim Entwickeln (localhost, Live Server) KEIN Service Worker: Sonst liefert der Cache
// alte oder halb aktualisierte Dateien und die Seite bleibt leer. Ein vorhandener wird
// entfernt und sein Cache gelöscht (Rezepte im localStorage bleiben unberührt).
// Offline lokal testen: Adresse mit ?offline aufrufen, z. B. http://localhost:5500/?offline

const net = $('#netStatus');
const isDev = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const wantSW = 'serviceWorker' in navigator && (!isDev || new URLSearchParams(location.search).has('offline'));

if (wantSW) {
  navigator.serviceWorker.register(isDev ? 'sw.js?dev-offline' : 'sw.js').then(() => {
    net.classList.add('on');
    net.textContent = 'Offline bereit';
    addEventListener('online', () => { net.textContent = 'Offline bereit'; });
    addEventListener('offline', () => { net.textContent = 'Offline – läuft trotzdem'; });
  }).catch(() => {
    net.textContent = navigator.onLine ? 'Online' : 'Offline';
    net.title = 'Offline-Modus nur über einen Webserver (nicht per Doppelklick)';
  });
} else {
  net.textContent = isDev ? 'Entwicklung' : (navigator.onLine ? 'Online' : 'Offline');
  if (isDev) net.title = 'Lokal ohne Offline-Cache. Mit ?offline in der Adresse testen.';
  if (isDev && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .catch(() => {});
    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.filter(k => k.startsWith('prebatch-shell-')).map(k => caches.delete(k))))
        .catch(() => {});
    }
  }
}

renderAll();
