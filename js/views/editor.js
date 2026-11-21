// Editor-Fenster: Rezept anlegen, bearbeiten, löschen.
// Gibt über Callbacks Bescheid – die Daten selbst verwaltet main.js.
//
// Pro Zutat ein Umschalter „Batch | Frisch“. Solange man ihn nicht selbst anfasst,
// stellt er sich beim Tippen des Namens automatisch ein (Limettensaft → Frisch).

import { UNITS, BOTTLES, GLASSES, ing, isFresh, defaultGlass } from '../recipes.js';
import { glassIcon } from './graphics.js';
import { $, $$, esc, fAuto, num, toast } from '../utils.js';

let editingId = null;
let handlers = { onSave: () => {}, onDelete: () => {} };

const unitOptions = sel => Object.entries(UNITS)
  .map(([k, u]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${u.label}</option>`).join('');
const bottleOptions = sel => BOTTLES
  .map(b => `<option value="${b}"${+b === +sel ? ' selected' : ''}>${fAuto(b)} L</option>`).join('');

function roleToggle(batch, auto) {
  return `<div class="role" role="group" aria-label="Wohin" data-auto="${auto ? 1 : 0}">
    <button type="button" data-role="jar" aria-pressed="${batch}">Batch</button>
    <button type="button" data-role="fresh" aria-pressed="${!batch}">Frisch</button>
  </div>`;
}

function rowHtml(i, auto = false) {
  return `<div class="ing">
    <div class="nm"><span class="lbl-m">Zutat</span><input class="field" data-k="name" value="${esc(i.name)}" placeholder="Zutat"></div>
    <div><span class="lbl-m">Menge</span><input class="field" data-k="amount" type="number" inputmode="decimal" step="0.25" min="0" value="${i.amount}"></div>
    <div><span class="lbl-m">Einheit</span><select data-k="unit">${unitOptions(i.unit)}</select></div>
    <div><span class="lbl-m">% vol</span><input class="field" data-k="abv" type="number" inputmode="decimal" step="0.1" min="0" max="100" value="${i.abv ?? ''}" placeholder="0"></div>
    <button class="x bt" data-del aria-label="Zutat entfernen">×</button>
    <div class="ing-foot">${roleToggle(i.batch, auto)}<span class="bottle">Flasche <select data-k="bottle">${bottleOptions(i.bottle)}</select></span></div>
  </div>`;
}

function setRole(group, batch) {
  group.querySelector('[data-role="jar"]').setAttribute('aria-pressed', batch);
  group.querySelector('[data-role="fresh"]').setAttribute('aria-pressed', !batch);
}

function readRows() {
  return $$('#edIngs .ing').map(row => {
    const f = k => row.querySelector(`[data-k="${k}"]`);
    return {
      name: f('name').value.trim(),
      amount: num(f('amount').value),
      unit: f('unit').value,
      abv: num(f('abv').value),
      batch: row.querySelector('[data-role="jar"]').getAttribute('aria-pressed') === 'true',
      bottle: +f('bottle').value,
    };
  }).filter(i => i.name);
}

// Glas-Auswahl: drei Icons. data-auto=1 → beim Speichern nach Zutaten wählen
function renderGlassPick(selected, auto) {
  const box = $('#edGlass');
  box.dataset.auto = auto ? '1' : '0';
  box.innerHTML = GLASSES.map(g =>
    `<button type="button" data-glass="${g.id}" aria-pressed="${g.id === selected}">${glassIcon(g.id)}${g.label}</button>`
  ).join('');
}
const pickedGlass = () => $('#edGlass [aria-pressed="true"]')?.dataset.glass;

const blankRow = () => rowHtml(ing('', 0, 'cl', 0, true), true);

export function openEditor(recipe) {
  editingId = recipe ? recipe.id : null;
  $('#edTitle').textContent = recipe ? 'Rezept bearbeiten' : 'Neues Rezept';
  $('#edName').value = recipe ? recipe.name : '';
  $('#edIngs').innerHTML = recipe
    ? recipe.ings.map(i => rowHtml(i)).join('')
    : blankRow() + blankRow() + blankRow();
  renderGlassPick(recipe ? (recipe.glass || defaultGlass(recipe.ings)) : 'tumbler', !recipe || !recipe.glass);
  $('#edDelete').hidden = !recipe;
  $('#edConfirm').classList.remove('open');
  $('#editor').classList.add('open');
  setTimeout(() => $('#edName').focus(), 50);
}

const close = () => $('#editor').classList.remove('open');

export function initEditor(h) {
  handlers = h;
  $('#edAdd').addEventListener('click', () => $('#edIngs').insertAdjacentHTML('beforeend', blankRow()));

  $('#edGlass').addEventListener('click', e => {
    const b = e.target.closest('[data-glass]');
    if (!b) return;
    $('#edGlass').dataset.auto = '0';
    $$('#edGlass [data-glass]').forEach(x => x.setAttribute('aria-pressed', x === b));
  });

  $('#edIngs').addEventListener('click', e => {
    if (e.target.closest('[data-del]')) return e.target.closest('.ing').remove();
    const btn = e.target.closest('[data-role]');
    if (btn) {
      const group = btn.closest('.role');
      group.dataset.auto = '0';              // von Hand gewählt → nicht mehr automatisch
      setRole(group, btn.dataset.role === 'jar');
    }
  });

  // Automatik: beim Tippen des Namens Jar/Frisch vorschlagen
  $('#edIngs').addEventListener('input', e => {
    if (e.target.dataset.k !== 'name') return;
    const group = e.target.closest('.ing').querySelector('.role');
    if (group.dataset.auto === '1') setRole(group, !isFresh(e.target.value));
  });

  $('#edCancel').addEventListener('click', close);
  $('#editor').addEventListener('click', e => { if (e.target.id === 'editor') close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  $('#edSave').addEventListener('click', () => {
    const name = $('#edName').value.trim();
    const ings = readRows();
    if (!name) { $('#edName').focus(); return toast('Bitte einen Namen eingeben'); }
    if (!ings.length) return toast('Mindestens eine Zutat');
    const glass = $('#edGlass').dataset.auto === '1' ? defaultGlass(ings) : pickedGlass();
    handlers.onSave(editingId, { name, ings, glass });
    close();
    toast('Gespeichert');
  });

  $('#edDelete').addEventListener('click', () => $('#edConfirm').classList.add('open'));
  $('#edConfirmNo').addEventListener('click', () => $('#edConfirm').classList.remove('open'));
  $('#edConfirmYes').addEventListener('click', () => {
    handlers.onDelete(editingId);
    close();
    toast('Gelöscht');
  });
}
