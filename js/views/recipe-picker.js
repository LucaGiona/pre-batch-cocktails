// Rezeptauswahl als Chips nach ABC: eine Reihe sichtbar, „Alle (n) ▾“ klappt den Rest auf.
// Eingeklappt: das gewählte Rezept ganz vorne, danach die übrigen nach ABC.
// Aufgeklappt: alle Rezepte, vor jeder Gruppe ein Buchstabe (Ä zählt zu A).

import { $, esc } from '../utils.js';

let open = false;
let last = { recipes: [], currentId: null };
let handlers = { onSelect: () => {}, onAdd: () => {} };

const byName = (a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });

// Erster Buchstabe ohne Akzente: „Äpfel Sour“ → A, „1:1 Sour“ → #
const letterOf = name => {
  const c = name.trim().charAt(0).normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
};

const chip = (r, currentId) =>
  `<button class="chip" data-id="${esc(r.id)}" aria-pressed="${r.id === currentId}">${esc(r.name)}</button>`;

// Chips, die nicht in der ersten Reihe stehen (nur eingeklappt relevant)
function hiddenChips(wrap) {
  const chips = [...wrap.querySelectorAll('.chip')];
  if (!chips.length) return [];
  const top = chips[0].offsetTop;
  return chips.filter(el => el.offsetTop > top + 2);
}

function draw(list, currentId) {
  const wrap = $('#chipsWrap');
  wrap.dataset.open = open ? '1' : '0';
  let prev = '';
  wrap.innerHTML = list.map(r => {
    const L = letterOf(r.name);
    const first = open && L !== prev;
    prev = L;
    // Buchstabe und erstes Rezept der Gruppe bleiben zusammen (kein Umbruch dazwischen)
    return first
      ? `<span class="chip-group"><span class="chip-letter" aria-hidden="true">${L}</span>${chip(r, currentId)}</span>`
      : chip(r, currentId);
  }).join('') + '<button class="chip add" data-add>+ Eigenes</button>';
}

export function renderRecipePicker(recipes, currentId) {
  last = { recipes, currentId };
  const sorted = [...recipes].sort(byName);
  const wrap = $('#chipsWrap');
  const more = $('#chipsMore');

  more.hidden = false;                  // Knopf braucht Platz – vor dem Messen einblenden
  more.textContent = open ? 'Weniger ▴' : `Alle (${recipes.length}) ▾`;
  const selected = sorted.find(r => r.id === currentId);
  const list = open || !selected ? sorted : [selected, ...sorted.filter(r => r !== selected)];
  draw(list, currentId);

  const anyHidden = open || hiddenChips(wrap).length > 0;
  more.hidden = !anyHidden;
  more.setAttribute('aria-expanded', open);
}

export function initRecipePicker(h) {
  handlers = h;
  $('#chipsWrap').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    open = false;                       // nach der Wahl wieder einklappen
    if (b.hasAttribute('data-add')) return handlers.onAdd();
    handlers.onSelect(b.dataset.id);
  });
  $('#chipsMore').addEventListener('click', () => {
    open = !open;
    renderRecipePicker(last.recipes, last.currentId);
  });
  // Bei anderer Fensterbreite passen mehr oder weniger Chips in die Reihe
  let t;
  addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => renderRecipePicker(last.recipes, last.currentId), 120);
  });
}
