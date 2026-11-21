// Editor-Fenster: Rezept anlegen, bearbeiten, löschen.
// Gibt über Callbacks Bescheid – die Daten selbst verwaltet main.js.

import { UNITS, BOTTLES, ing } from '../recipes.js';
import { $, $$, esc, fAuto, num, toast } from '../utils.js';

let editingId = null;
let handlers = { onSave: () => {}, onDelete: () => {} };

const unitOptions = sel => Object.entries(UNITS)
  .map(([k, u]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${u.label}</option>`).join('');
const bottleOptions = sel => BOTTLES
  .map(b => `<option value="${b}"${+b === +sel ? ' selected' : ''}>${fAuto(b)} L</option>`).join('');

function rowHtml(i) {
  return `<div class="ing">
    <div class="nm"><span class="lbl-m">Zutat</span><input class="field" data-k="name" value="${esc(i.name)}" placeholder="Zutat"></div>
    <div><span class="lbl-m">Menge</span><input class="field" data-k="amount" type="number" inputmode="decimal" step="0.25" min="0" value="${i.amount}"></div>
    <div><span class="lbl-m">Einheit</span><select data-k="unit">${unitOptions(i.unit)}</select></div>
    <div><span class="lbl-m">% vol</span><input class="field" data-k="abv" type="number" inputmode="decimal" step="0.1" min="0" max="100" value="${i.abv ?? ''}" placeholder="0"></div>
    <label class="chk" title="Im Batch"><input type="checkbox" data-k="batch"${i.batch ? ' checked' : ''}></label>
    <button class="x bt" data-del aria-label="Zutat entfernen">×</button>
    <div class="bottle-row">Flasche <select data-k="bottle">${bottleOptions(i.bottle)}</select></div>
  </div>`;
}

function readRows() {
  return $$('#edIngs .ing').map(row => {
    const f = k => row.querySelector(`[data-k="${k}"]`);
    return {
      name: f('name').value.trim(),
      amount: num(f('amount').value),
      unit: f('unit').value,
      abv: num(f('abv').value),
      batch: f('batch').checked,
      bottle: +f('bottle').value,
    };
  }).filter(i => i.name);
}

export function openEditor(recipe) {
  editingId = recipe ? recipe.id : null;
  $('#edTitle').textContent = recipe ? 'Rezept bearbeiten' : 'Neues Rezept';
  $('#edName').value = recipe ? recipe.name : '';
  const ings = recipe ? recipe.ings : [ing('', 0), ing('', 0), ing('', 0)];
  $('#edIngs').innerHTML = ings.map(rowHtml).join('');
  $('#edDelete').hidden = !recipe;
  $('#edConfirm').classList.remove('open');
  $('#editor').classList.add('open');
  setTimeout(() => $('#edName').focus(), 50);
}

const close = () => $('#editor').classList.remove('open');

export function initEditor(h) {
  handlers = h;
  $('#edAdd').addEventListener('click', () => $('#edIngs').insertAdjacentHTML('beforeend', rowHtml(ing('', 0))));
  $('#edIngs').addEventListener('click', e => { if (e.target.closest('[data-del]')) e.target.closest('.ing').remove(); });
  $('#edCancel').addEventListener('click', close);
  $('#editor').addEventListener('click', e => { if (e.target.id === 'editor') close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  $('#edSave').addEventListener('click', () => {
    const name = $('#edName').value.trim();
    const ings = readRows();
    if (!name) { $('#edName').focus(); return toast('Bitte einen Namen eingeben'); }
    if (!ings.length) return toast('Mindestens eine Zutat');
    handlers.onSave(editingId, { name, ings });
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
