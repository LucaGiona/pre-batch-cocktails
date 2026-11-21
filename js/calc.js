// Die eigentliche Rechnung: Rezept × Anzahl = Batch.
// Kein DOM hier – nur Zahlen rein, Zahlen raus. So lässt sich das leicht testen.
//
// Ins Jar kommt nur, was batch=true hat. Die Ziel-Liter beziehen sich nur auf den Jar-Inhalt.
// Frische Zutaten (batch=false) werden pro Drink und für alle Drinks zusammen ausgewiesen.

import { UNITS, MAX_L, FILL, isFresh, isBubbly } from './recipes.js';
import { fL, fMl, fNum, fAuto } from './utils.js';

const toCl = i => i.amount * UNITS[i.unit].f;
const unitLabel = i => UNITS[i.unit].label;

export function compute(recipe, state) {
  if (!recipe) return null;
  const valid = recipe.ings.filter(i => i.name.trim() && +i.amount > 0);
  const batch = valid.filter(i => i.batch);
  const fresh = valid.filter(i => !i.batch);

  // cl pro Drink aus dem Jar
  const pourCl = batch.reduce((s, i) => s + toCl(i), 0);
  if (pourCl <= 0) return { recipe, empty: true, freshRows: [] };

  const maxCount = Math.floor((MAX_L * 1000) / (pourCl * 10));
  let n, totalMl, capped = false;
  if (state.mode === 'vol') {
    totalMl = state.targetL * 1000;
    n = totalMl / (pourCl * 10);
  } else {
    n = state.count;
    if (n > maxCount) { n = maxCount; capped = true; }
    totalMl = n * pourCl * 10;
  }
  const drinks = state.mode === 'vol' ? Math.floor(n) : n; // für frische Zutaten: ganze Drinks

  const rows = batch.map(i => {
    const ml = toCl(i) * 10 * n;
    // „forced“: frische Zutat, die bewusst ins Jar geschaltet wurde → Warnung
    return { ...i, ml, bottles: ml / (i.bottle * 1000), forced: isFresh(i.name) };
  });

  const freshRows = fresh.map(i => {
    const ml = toCl(i) * 10 * drinks;
    return { ...i, perCl: toCl(i), ml, bubbly: isBubbly(i.name), bottles: ml / (i.bottle * 1000) };
  });

  const alcMl = rows.reduce((s, r) => s + r.ml * (+r.abv || 0) / 100, 0);
  const abv = totalMl > 0 ? alcMl / totalMl * 100 : 0;

  // Alkohol im fertigen Drink (Jar-Anteil + frische Zutaten, ohne Schmelzwasser)
  const freshCl = freshRows.reduce((s, r) => s + r.perCl, 0);
  const alcFreshCl = freshRows.reduce((s, r) => s + r.perCl * (+r.abv || 0) / 100, 0);
  const drinkAbv = (pourCl * abv / 100 + alcFreshCl) / (pourCl + freshCl) * 100;

  // Auf wie viele Gefäße verteilen? (gleichmäßig)
  const capMl = state.jarL * FILL * 1000;
  const jars = Math.max(1, Math.ceil(totalMl / capMl - 1e-9));

  return {
    recipe, rows, freshRows, pourCl, freshCl, n, drinks, totalMl, abv, drinkAbv,
    jars, perJar: totalMl / jars, maxCount, capped,
  };
}

// Text für das Etikett am Jar / zum Kopieren
export function batchText(c, state) {
  const drinks = state.mode === 'vol' ? '≈ ' + c.drinks : c.drinks;
  return [
    `${c.recipe.name.toUpperCase()} – BATCH`,
    `Datum: ${new Date().toLocaleDateString('de-DE')}`,
    `Menge: ${fL(c.totalMl)} · ${drinks} Drinks`,
    `Alkohol im Jar ≈ ${fNum(c.abv, 1)} % vol`,
    '',
    'Ins Jar:',
    ...c.rows.map(r => `– ${r.name}: ${fMl(r.ml)} (${fNum(r.bottles, 1)} × ${fAuto(r.bottle)} L)`),
    ...(c.freshRows.length ? [
      '',
      `Frisch beim Service (für ${c.drinks} Drinks):`,
      ...c.freshRows.map(r => `– ${r.name}: ${fAuto(+r.amount)} ${unitLabel(r)} pro Drink · gesamt ${fL(r.ml)}`
        + (r.bubbly ? ` (${Math.ceil(r.bottles - 1e-9)} × ${fAuto(r.bottle)} L)` : '')),
    ] : []),
    '',
    `Service: ${fNum(c.pourCl, 1)} cl aus dem Jar`
      + c.freshRows.map(r => ` + ${fAuto(+r.amount)} ${unitLabel(r)} ${r.name}`).join(''),
  ].join('\n');
}
