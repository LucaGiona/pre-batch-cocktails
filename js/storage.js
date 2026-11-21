// Speicher auf dem Gerät (localStorage). Rezepte + zuletzt gewählte Einstellungen.
// Alles mit try/catch: Im privaten Modus oder bei vollem Speicher darf die App nicht abstürzen.

import { PRESETS } from './recipes.js';

const KEY_RECIPES = 'prebatch.recipes.v1';
const KEY_STATE = 'prebatch.state.v1';

const DEFAULT_STATE = { currentId: 'negroni', mode: 'vol', targetL: 7, count: 70, jarL: 7.5 };

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* egal */ }
};

export const clone = o => JSON.parse(JSON.stringify(o));
export const defaultRecipes = () => clone(PRESETS);

export function loadRecipes() {
  const r = read(KEY_RECIPES, null);
  return Array.isArray(r) && r.length ? r : defaultRecipes();
}

export function loadState() {
  const s = Object.assign({}, DEFAULT_STATE, read(KEY_STATE, {}));
  delete s.dilution; // alte Einstellung aus dem ersten Prototyp
  return s;
}

export function save(recipes, state) {
  write(KEY_RECIPES, recipes);
  write(KEY_STATE, state);
}
