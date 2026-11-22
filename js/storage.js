// Speicher auf dem Gerät (localStorage). Rezepte + zuletzt gewählte Einstellungen.
// Alles mit try/catch: Im privaten Modus oder bei vollem Speicher darf die App nicht abstürzen.

import { PRESETS, isFresh, defaultGlass } from './recipes.js';

const KEY_RECIPES = 'prebatch.recipes.v1';
const KEY_STATE = 'prebatch.state.v1';
const KEY_DATA_VERSION = 'prebatch.dataVersion';
export const DATA_VERSION = 4; // 2 = frische Zutaten getrennt, 3 = Glas pro Rezept, 4 = Melody-Rezepte
const KEY_LAST_BACKUP = 'prebatch.lastBackup';

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

// Alte Daten umrechnen:
// v2: Frische Zutaten kamen früher ins Jar, jetzt nie mehr. Neue Startrezepte ergänzen.
// v3: Jedes Rezept bekommt ein Glas (Startrezepte ihr eigenes, sonst nach Zutaten).
// v4: Melody-Startrezepte kommen dazu (über migrate, wie alle neuen Startrezepte).
// upgradeRecipes wird auch beim Einlesen einer älteren Sicherung benutzt.
export function upgradeRecipes(recipes, from) {
  if (from < 2) {
    for (const r of recipes)
      for (const i of r.ings)
        if (i.batch && isFresh(i.name)) i.batch = false;
  }
  for (const r of recipes)
    if (!r.glass) r.glass = PRESETS.find(p => p.id === r.id)?.glass || defaultGlass(r.ings);
  return recipes;
}

function migrate(recipes, from) {
  upgradeRecipes(recipes, from);
  for (const p of PRESETS)
    if (!recipes.some(r => r.id === p.id)) recipes.push(clone(p));
  return recipes;
}

export function loadRecipes() {
  const stored = read(KEY_RECIPES, null);
  if (!Array.isArray(stored) || !stored.length) return defaultRecipes();
  const from = read(KEY_DATA_VERSION, 1);
  if (from < DATA_VERSION) {
    migrate(stored, from);
    write(KEY_RECIPES, stored);
    write(KEY_DATA_VERSION, DATA_VERSION);
  }
  return stored;
}

export function loadState() {
  const s = Object.assign({}, DEFAULT_STATE, read(KEY_STATE, {}));
  delete s.dilution; // alte Einstellung aus dem ersten Prototyp
  return s;
}

export function save(recipes, state) {
  write(KEY_RECIPES, recipes);
  write(KEY_STATE, state);
  write(KEY_DATA_VERSION, DATA_VERSION);
}

// Zeitpunkt der letzten Sicherung (für die Erinnerung nach 30 Tagen)
export const getLastBackup = () => read(KEY_LAST_BACKUP, 0);
export const setLastBackup = () => write(KEY_LAST_BACKUP, Date.now());
