// Ergebnis-Karte: Kennzahlen, „Ins Jar“, „Frisch beim Service“, Grafik, Hinweise.

import { UNITS, MAX_L, FILL, defaultGlass } from '../recipes.js';
import { esc, fAuto, fInt, fL, fMl, fNum } from '../utils.js';
import { BATCH_COLOR, containerSvg, glassSvg } from './graphics.js';

const amount = i => `${fAuto(+i.amount)} ${UNITS[i.unit].label}`;
const isBottle = state => state.jarL < 2;   // 0,7 L / 1 L → Flaschen statt Jar

// Pfeil vom Gefäß zum Glas, mit Menge pro Drink darüber
function arrowSvg(label) {
  return `<div class="flow-arrow"><span>${label}</span><svg width="64" height="18" viewBox="0 0 64 18" aria-hidden="true">
    <path d="M2 9h54" stroke="#e3a24f" stroke-width="2" stroke-linecap="round"/>
    <path d="M50 3l8 6-8 6" fill="none" stroke="#e3a24f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg></div>`;
}

// Farben der frischen Zutaten im Glas
const FRESH_COLORS = [
  [/(eiwei|aquafaba|sahne|cream|milch|\bei\b)/i, '#efe8dc'],  // cremig/weiß
  [/(zitron|lemon)/i, '#e8d27a'],                              // gelb
  [/(limett|lime|minze|mint|basilikum|gurke)/i, '#7fb38a'],    // grün
  [/(grapefruit|orange|blutorange)/i, '#f0a27a'],              // orange
  [/(soda|tonic|limo|ginger|cola|sprite|sekt|prosecco|champagner|cava|cr.mant)/i, '#9cc3d6'], // blau
];
const FALLBACK = ['#b9a3d9', '#a3d9c9', '#d9c9a3'];
function freshColors(rows) {
  const used = new Set();
  return rows.map((r, k) => {
    let col = (FRESH_COLORS.find(([re]) => re.test(r.name)) || [])[1];
    if (!col || used.has(col)) col = FALLBACK.find(f => !used.has(f)) || FALLBACK[k % FALLBACK.length];
    used.add(col);
    return col;
  });
}

function legend(c, colors, bottleWord) {
  const items = [
    `<span><i style="background:${BATCH_COLOR}"></i>aus ${bottleWord}</span>`,
    ...c.freshRows.map((r, k) => `<span><i style="background:${colors[k]}"></i>${esc(r.name)}</span>`),
  ];
  return `<div class="legend">${items.join('')}</div>`;
}

// Gefäß(e) → Pfeil → Glas × Anzahl
function flow(c, state) {
  const colors = freshColors(c.freshRows);
  const kind = isBottle(state) ? 'bottle' : 'jar';
  const fill = c.perJar / (state.jarL * 1000);
  const each = `${fNum(c.perJar / 1000, 2)} L`;
  const vessels = c.jars > 3
    ? containerSvg(kind, fill, `${c.jars} × ${each}`, 0)
    : Array.from({ length: c.jars }, (_, k) => containerSvg(kind, fill, each, k, c.jars > 1 ? 0.72 : 1)).join('');
  const layers = [
    { cl: c.pourCl, color: BATCH_COLOR, name: 'Batch' },
    ...c.freshRows.map((r, k) => ({ cl: r.perCl, color: colors[k], name: r.name })),
  ];
  const glass = c.recipe.glass || defaultGlass(c.recipe.ings);
  return `<div class="flow" aria-label="Aus dem Batch ins Glas">
    <div class="flow-jars">${vessels}</div>
    ${arrowSvg(`${fNum(c.pourCl, 1)} cl`)}
    <div class="flow-glass">${glassSvg(glass, layers)}<div class="times">× ${fInt(c.drinks)}<small>Drinks</small></div></div>
  </div>${legend(c, colors, kind === 'bottle' ? 'der Flasche' : 'dem Jar')}`;
}

function notes(c, state) {
  const out = [];
  if (c.capped) out.push(['warn', `Maximal ${MAX_L} L pro Batch – auf ${fInt(c.maxCount)} Drinks begrenzt.`]);
  const forced = c.rows.filter(r => r.forced).map(r => esc(r.name));
  if (forced.length)
    out.push(['warn', `${forced.join(', ')} ${forced.length > 1 ? 'sind' : 'ist'} ins Jar geschaltet. Frische Zutaten halten im Batch nur ca. 1 Tag – im Editor auf „Frisch“ stellen.`]);
  if (c.jars > 1)
    out.push(['', `Passt nicht in ein Gefäß – auf ${c.jars} × ${state.jarL >= 2 ? 'Jars' : 'Flaschen'} à ${fNum(c.perJar / 1000, 2)} L verteilen. Am besten erst komplett mischen, dann abfüllen.`]);
  if (state.mode === 'vol' && state.jarL >= 2 && state.targetL > state.jarL * FILL && state.targetL <= state.jarL)
    out.push(['', `${fAuto(state.targetL)} L im ${fAuto(state.jarL)}-L-Jar ist randvoll – mit 7 L bleibt Platz zum Umrühren.`]);
  if (c.rows.some(r => r.unit === 'dash'))
    out.push(['', 'Dashes umgerechnet mit 1 Dash ≈ 0,8 ml. Bitters lieber knapp dosieren und abschmecken – sie dominieren im Batch schnell.']);
  return out;
}

function jarTable(c, state) {
  const rows = c.rows.map(r => `
    <tr>
      <td>${esc(r.name)}${r.forced ? '<span class="tag warn">frisch</span>' : ''}
        <span class="alt">${amount(r)} pro Drink${r.abv ? ' · ' + fAuto(+r.abv) + ' %' : ''}</span></td>
      <td><span class="main">${fMl(r.ml)}</span><span class="alt">${fL(r.ml)}</span></td>
      <td><span class="main">${fNum(r.bottles, 1)}</span><span class="alt">× ${fAuto(r.bottle)} L</span></td>
    </tr>`).join('');
  return `
    <h3 class="block-title">${isBottle(state) ? 'In die Flaschen' : 'Ins Jar'}</h3>
    <table>
      <thead><tr><th>Zutat</th><th>Menge</th><th>Flaschen</th></tr></thead>
      <tbody>${rows}
        <tr class="total"><td>Gesamt</td><td>${fL(c.totalMl)}</td><td></td></tr>
      </tbody>
    </table>`;
}

function freshTable(c) {
  if (!c.freshRows.length) return '';
  const rows = c.freshRows.map(r => `
    <tr>
      <td>${esc(r.name)}<span class="alt">${amount(r)} pro Drink</span></td>
      <td><span class="main">${fL(r.ml)}</span><span class="alt">für ${fInt(c.drinks)} Drinks</span></td>
      <td>${r.bubbly ? `<span class="main">${fInt(Math.ceil(r.bottles - 1e-9))}</span><span class="alt">× ${fAuto(r.bottle)} L</span>` : ''}</td>
    </tr>`).join('');
  return `
    <div class="fresh-block">
      <h3 class="block-title">Frisch beim Service <span class="tag">nicht im Jar</span></h3>
      <table>
        <thead><tr><th>Zutat</th><th>Gesamt</th><th>Flaschen</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function renderResult(el, c, state) {
  if (!c) { el.innerHTML = '<p class="empty">Kein Rezept gewählt.</p>'; return; }
  if (c.empty) {
    el.innerHTML = '<h2>Ergebnis</h2><p class="empty">Dieses Rezept hat keine Zutaten fürs Jar – alles wird frisch zugegeben. Tippe auf „Bearbeiten“.</p>';
    return;
  }

  const drinks = state.mode === 'vol' ? '≈ ' + fInt(c.drinks) : fInt(c.drinks);
  const freshPart = c.freshRows.map(r => ` + <b>${amount(r)}</b> ${esc(r.name)}`).join('');
  const abvHint = c.freshRows.length ? `<span class="alt-inline">im Glas ≈ ${fNum(c.drinkAbv, 1)} %</span>` : '';

  el.innerHTML = `
    <h2>Ergebnis · ${esc(c.recipe.name)}</h2>
    <div class="summary">
      <div class="stat"><div class="k">Jar gesamt</div><div class="v">${fNum(c.totalMl / 1000, 2)} <small>L</small></div></div>
      <div class="stat"><div class="k">Drinks</div><div class="v">${drinks}</div></div>
      <div class="stat"><div class="k">aus dem Jar</div><div class="v">${fNum(c.pourCl, 1)} <small>cl</small></div></div>
      <div class="stat"><div class="k">Alkohol Jar</div><div class="v">${fNum(c.abv, 1)} <small>% vol</small></div>${abvHint}</div>
    </div>
    ${jarTable(c, state)}
    ${freshTable(c)}
    ${flow(c, state)}
    <div class="service">Pro Drink: <b>${fNum(c.pourCl, 1)} cl</b> aus dem Jar${freshPart}.</div>
    <ul class="notes">${notes(c, state).map(([cls, t]) => `<li class="${cls}">${t}</li>`).join('')}</ul>
    <div class="actions">
      <button class="btn primary" id="copyBtn">Batch-Zettel kopieren</button>
      <button class="btn" id="printBtn">Drucken</button>
    </div>`;
}
