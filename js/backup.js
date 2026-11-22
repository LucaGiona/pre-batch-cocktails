// Sicherung als JSON-Datei: speichern und wieder einlesen.
// Kein DOM hier – nur Daten rein, Daten raus (die Anzeige macht views/info.js).
//
// Einlesen löscht nie etwas: Neue Rezepte kommen dazu, vorhandene werden nur ersetzt,
// wenn das Rezept in der Sicherung neuer ist (Feld „updated“).

import { UNITS, BOTTLES } from './recipes.js';
import { DATA_VERSION, upgradeRecipes, clone } from './storage.js';

export const BACKUP_APP = 'prebatch';

export function makeBackup(recipes) {
  return {
    app: BACKUP_APP,
    dataVersion: DATA_VERSION,
    exported: new Date().toISOString(),
    recipes: clone(recipes),
  };
}

export function backupFileName(date = new Date()) {
  const d = date.toISOString().slice(0, 10);
  return `prebatch-sicherung-${d}.json`;
}

// Eine Zutat aus fremder Quelle säubern: nur bekannte Felder, sinnvolle Werte
function cleanIng(i) {
  if (!i || typeof i.name !== 'string' || !i.name.trim()) return null;
  const amount = +i.amount;
  if (!(amount > 0)) return null;
  return {
    name: i.name.trim().slice(0, 80),
    amount,
    unit: UNITS[i.unit] ? i.unit : 'cl',
    abv: Math.min(100, Math.max(0, +i.abv || 0)),
    batch: i.batch !== false,
    bottle: BOTTLES.includes(+i.bottle) ? +i.bottle : 0.7,
  };
}

function cleanRecipe(r) {
  if (!r || typeof r.id !== 'string' || typeof r.name !== 'string' || !Array.isArray(r.ings)) return null;
  const ings = r.ings.map(cleanIng).filter(Boolean);
  if (!r.name.trim() || !ings.length) return null;
  const out = { id: r.id.slice(0, 40), name: r.name.trim().slice(0, 60), ings };
  if (['tumbler', 'highball', 'martini'].includes(r.glass)) out.glass = r.glass;
  if (+r.updated > 0) out.updated = +r.updated;
  return out;
}

// Text einer Sicherungsdatei prüfen → { recipes, skipped } oder Fehler werfen
export function parseBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Die Datei ist kein gültiges JSON.'); }
  if (!data || data.app !== BACKUP_APP || !Array.isArray(data.recipes))
    throw new Error('Das ist keine Pre-Batch-Sicherung.');
  const cleaned = data.recipes.map(cleanRecipe);
  const recipes = cleaned.filter(Boolean);
  upgradeRecipes(recipes, +data.dataVersion || 1);
  return { recipes, skipped: cleaned.length - recipes.length };
}

// Sicherung in die vorhandenen Rezepte einfügen → { recipes, added, updated, unchanged }
export function mergeRecipes(current, incoming) {
  const result = clone(current);
  let added = 0, updated = 0, unchanged = 0;
  for (const r of incoming) {
    const k = result.findIndex(x => x.id === r.id);
    if (k === -1) { result.push(r); added++; }
    else if ((r.updated || 0) > (result[k].updated || 0)) { result[k] = r; updated++; }
    else unchanged++;
  }
  return { recipes: result, added, updated, unchanged };
}
