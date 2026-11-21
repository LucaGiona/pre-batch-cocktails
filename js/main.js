// Start: Zustand laden, Ansicht zeichnen, Eingaben verdrahten, Service Worker anmelden.

import { MAX_L, UNITS } from './recipes.js';
import { $, $$, esc, fAuto, fInt, num, toast } from './utils.js';
import { loadRecipes, loadState, save, defaultRecipes } from './storage.js';
import { compute, batchText } from './calc.js';
import { renderResult } from './views/result.js';
import { openEditor, initEditor } from './views/editor.js';

let recipes = loadRecipes();
const state = loadState();
if (!recipes.some(r => r.id === state.currentId)) state.currentId = recipes[0].id;

const current = () => recipes.find(r => r.id === state.currentId);
let last = null; // letztes Rechenergebnis (für Kopieren)

/* ---------- Zeichnen ---------- */

function renderChips() {
  $('#recipeChips').innerHTML = recipes.map(r =>
    `<button class="chip" data-id="${esc(r.id)}" aria-pressed="${r.id === state.currentId}">${esc(r.name)}</button>`
  ).join('') + '<button class="chip add" id="addRecipe">+ Eigenes Rezept</button>';

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
  $('#volRange').value = state.targetL;
  $$('#volPresets .btn').forEach(b => b.setAttribute('aria-pressed', +b.dataset.l === +state.targetL));
  $('#countInput').value = state.count;
  $('#jarSel').value = String(state.jarL);
}

function renderOutput() {
  last = compute(current(), state);
  renderResult($('#result'), last, state);
  $('#countMax').textContent = last && !last.empty ? `Max. ${fInt(last.maxCount)} Drinks bei ${MAX_L} L.` : '';
}

function renderAll() {
  renderChips();
  renderInputs();
  renderOutput();
  save(recipes, state);
}

/* ---------- Eingaben ---------- */

const setVol = v => { v = num(v); if (v) state.targetL = Math.min(MAX_L, Math.max(0.5, Math.round(v * 10) / 10)); };
const setCount = v => { v = Math.round(num(v)); state.count = Math.max(1, v); };

$('#recipeChips').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  if (b.id === 'addRecipe') return openEditor(null);
  state.currentId = b.dataset.id;
  renderAll();
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
  setVol(e.target.value);
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

const net = $('#netStatus');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    net.classList.add('on');
    net.textContent = 'Offline bereit';
    addEventListener('online', () => { net.textContent = 'Offline bereit'; });
    addEventListener('offline', () => { net.textContent = 'Offline – läuft trotzdem'; });
  }).catch(() => {
    net.textContent = navigator.onLine ? 'Online' : 'Offline';
    net.title = 'Offline-Modus nur über einen Webserver (nicht per Doppelklick)';
  });
} else {
  net.textContent = navigator.onLine ? 'Online' : 'Offline';
}

renderAll();
