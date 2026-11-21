// Die eigentliche Rechnung: Rezept × Anzahl = Batch.
// Kein DOM hier – nur Zahlen rein, Zahlen raus. So lässt sich das leicht testen.

import { UNITS, FRESH, MAX_L, FILL } from './recipes.js';
import { fL, fMl, fNum, fAuto } from './utils.js';

export function compute(recipe, state) {
  if (!recipe) return null;
  const valid = recipe.ings.filter(i => i.name.trim() && +i.amount > 0);
  const batch = valid.filter(i => i.batch);
  const service = valid.filter(i => !i.batch);

  // cl pro Drink, die aus dem Batch kommen
  const pourCl = batch.reduce((s, i) => s + i.amount * UNITS[i.unit].f, 0);
  if (pourCl <= 0) return { recipe, empty: true, service };

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

  const rows = batch.map(i => {
    const ml = i.amount * UNITS[i.unit].f * 10 * n;
    return { ...i, ml, bottles: ml / (i.bottle * 1000), fresh: FRESH.test(i.name) };
  });

  const alcMl = rows.reduce((s, r) => s + r.ml * (+r.abv || 0) / 100, 0);
  const abv = totalMl > 0 ? alcMl / totalMl * 100 : 0;

  // Auf wie viele Gefäße verteilen? (gleichmäßig)
  const capMl = state.jarL * FILL * 1000;
  const jars = Math.max(1, Math.ceil(totalMl / capMl - 1e-9));

  return { recipe, rows, service, pourCl, n, totalMl, abv, jars, perJar: totalMl / jars, maxCount, capped };
}

// Text für das Etikett am Jar / zum Kopieren
export function batchText(c, state) {
  const drinks = state.mode === 'vol' ? '≈ ' + Math.floor(c.n) : c.n;
  return [
    `${c.recipe.name.toUpperCase()} – BATCH`,
    `Datum: ${new Date().toLocaleDateString('de-DE')}`,
    `Menge: ${fL(c.totalMl)} · ${drinks} Drinks`,
    `Alkohol ≈ ${fNum(c.abv, 1)} % vol`,
    `Pro Drink: ${fNum(c.pourCl, 1)} cl abfüllen`,
    '',
    'Zutaten:',
    ...c.rows.map(r => `– ${r.name}: ${fMl(r.ml)} (${fNum(r.bottles, 1)} × ${fAuto(r.bottle)} L)`),
    ...(c.service.length
      ? ['', 'Beim Service pro Drink:', ...c.service.map(s => `– ${fAuto(+s.amount)} ${s.unit === 'dash' ? 'Dash' : s.unit} ${s.name}`)]
      : []),
  ].join('\n');
}
