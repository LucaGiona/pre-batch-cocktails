// Ergebnis-Karte: Kennzahlen, Batch-Tabelle, „Frisch zufügen“, Grafik, Hinweise.

import { UNITS, MAX_L, defaultGlass, isBubbly } from '../recipes.js';
import { esc, fAuto, fInt, fL, fMl, fNum } from '../utils.js';
import { fillText } from '../calc.js';
import { BATCH_COLOR, containerSvg, glassSvg } from './graphics.js';

const amount = i => `${fAuto(+i.amount)} ${UNITS[i.unit].label}`;

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
  [{ test: isBubbly }, '#9cc3d6'],                              // blau: Kohlensäure & Schaumwein
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

// Abfüllen: volle Gefäße (ab 4 zusammengefasst) + ein Gefäß mit dem Rest
function vessels(f) {
  const kind = f.bottle ? 'bottle' : 'jar';
  const size = `${fAuto(f.sizeL)} L`;
  const shown = (f.full > 3 ? 1 : f.full) + (f.restMl ? 1 : 0);
  const scale = shown > 1 ? 0.72 : 1;
  const out = [];
  if (f.full > 3) out.push(containerSvg(kind, 1, `${f.full} × ${size}`, 'f', scale));
  else for (let k = 0; k < f.full; k++) out.push(containerSvg(kind, 1, size, 'f' + k, scale));
  if (f.restMl) out.push(containerSvg(kind, f.restMl / f.capMl, `${f.full ? 'Rest ' : ''}${fL(f.restMl)}`, 'r', scale, 'rest'));
  return out.join('');
}

// Gefäß(e) → Pfeil → Glas × Anzahl
function flow(c) {
  const colors = freshColors(c.freshRows);
  const layers = [
    { cl: c.pourCl, color: BATCH_COLOR, name: 'Batch' },
    ...c.freshRows.map((r, k) => ({ cl: r.perCl, color: colors[k], name: r.name })),
  ];
  const glass = c.recipe.glass || defaultGlass(c.recipe.ings);
  return `<div class="flow" aria-label="Aus dem Batch ins Glas">
    <div class="flow-jars">${vessels(c.fill)}</div>
    ${arrowSvg(`${fNum(c.pourCl, 1)} cl`)}
    <div class="flow-glass">${glassSvg(glass, layers)}<div class="times${c.drinks >= 1000 ? ' big' : ''}">× ${fInt(c.drinks)}<small>Drinks</small></div></div>
  </div>${legend(c, colors, 'dem Batch')}`;
}

// Zeile unter der Grafik: was wird abgefüllt + Knopf „auf volle Gefäße aufrunden“
function fillLine(c, state) {
  const f = c.fill, word = f.bottle ? 'Flaschen' : 'Jars';
  const text = fillText(f);
  const canRound = state.mode === 'vol' && f.full > 0 && f.roundUpL && f.roundUpL <= MAX_L;
  const btn = canRound
    ? `<button class="btn" id="roundUp" data-l="${f.roundUpL}">Auf ${f.full + 1} volle ${word} aufrunden (+${fL(f.roundUpL * 1000 - c.totalMl)})</button>`
    : '';
  return `<div class="fill-line"><span>Abfüllen: <b>${text}</b></span>${btn}</div>`;
}

function notes(c, state) {
  const out = [];
  if (c.capped) out.push(['warn', `Maximal ${MAX_L} L pro Batch – auf ${fInt(c.maxCount)} Drinks begrenzt.`]);
  const forced = c.rows.filter(r => r.forced).map(r => esc(r.name));
  if (forced.length)
    out.push(['warn', `${forced.join(', ')} ${forced.length > 1 ? 'sind' : 'ist'} im Batch. Frische Zutaten halten im Batch nur ca. 1 Tag – im Editor auf „Frisch“ stellen.`]);
  if (c.rows.some(r => r.unit === 'dash'))
    out.push(['', 'Dashes umgerechnet mit 1 Dash ≈ 0,8 ml. Bitters lieber knapp dosieren und abschmecken – sie dominieren im Batch schnell.']);
  return out;
}

function jarTable(c, state) {
  const rows = c.rows.map(r => `
    <tr>
      <td>${esc(r.name)}${r.forced ? '<span class="tag warn">frisch</span>' : ''}
        <span class="alt">${amount(r)} pro Drink${r.abv ? ' · ' + fAuto(+r.abv) + ' %' : ''}</span></td>
      <td><span class="main">${fL(r.ml)}</span><span class="alt">${fMl(r.ml)}</span></td>
      <td><span class="main">${fNum(r.bottles, 1)}</span><span class="alt">× ${fAuto(r.bottle)} L</span></td>
    </tr>`).join('');
  return `
    <h3 class="block-title">Batch</h3>
    <table>
      <thead><tr><th>Zutat</th><th>Menge</th><th>Flaschen</th></tr></thead>
      <tbody>${rows}
        <tr class="total"><td>Gesamt</td><td>${fL(c.totalMl)}</td><td></td></tr>
      </tbody>
    </table>`;
}

// Einkauf: Flaschen bei Kohlensäure/Schaumwein, Früchte bzw. Eier bei Säften und Eiweiß
function buyCell(r) {
  if (r.fruit) return `<span class="main">≈ ${fInt(r.fruit.count)}</span><span class="alt">${r.fruit.label}</span>`;
  if (r.bubbly) return `<span class="main">${fInt(Math.ceil(r.bottles - 1e-9))}</span><span class="alt">× ${fAuto(r.bottle)} L</span>`;
  return '';
}

function freshTable(c) {
  if (!c.freshRows.length) return '';
  const rows = c.freshRows.map(r => `
    <tr>
      <td>${esc(r.name)}<span class="alt">${amount(r)} pro Drink</span></td>
      <td><span class="main">${fL(r.ml)}</span><span class="alt">für ${fInt(c.drinks)} Drinks</span></td>
      <td>${buyCell(r)}</td>
    </tr>`).join('');
  const fruits = c.freshRows.filter(r => r.fruit);
  const yieldNote = fruits.length
    ? `<p class="hint"><span class="note-label">Bemerkung:</span> Ausbeute geschätzt: ${fruits.map(r => `1 ${r.fruit.one} ≈ ${fNum(r.fruit.perMl / 10, 1)} cl`).join(', ')}. Je nach Größe und Saison lieber ein paar mehr einplanen.</p>`
    : '';
  return `
    <div class="fresh-block">
      <h3 class="block-title">Frisch zufügen</h3>
      <p class="block-sub"><span class="no-batch">nicht im Batch</span> pro Drink beim Service frisch dazugeben</p>
      <table>
        <thead><tr><th>Zutat</th><th>Gesamt</th><th>Einkauf</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${yieldNote}
    </div>`;
}

export function renderResult(el, c, state) {
  if (!c) { el.innerHTML = '<p class="empty">Kein Rezept gewählt.</p>'; return; }
  if (c.empty) {
    el.innerHTML = '<h2>Ergebnis</h2><p class="empty">Dieses Rezept hat keine Zutaten für den Batch – alles wird frisch zugegeben. Tippe auf „Bearbeiten“.</p>';
    return;
  }

  const drinks = state.mode === 'vol' ? '≈ ' + fInt(c.drinks) : fInt(c.drinks);
  const freshPart = c.freshRows.map(r => ` + <b>${amount(r)}</b> ${esc(r.name)}`).join('');
  const abvHint = c.freshRows.length ? `<span class="alt-inline">im Glas ≈ ${fNum(c.drinkAbv, 1)} %</span>` : '';

  el.innerHTML = `
    <h2>Ergebnis · ${esc(c.recipe.name)}</h2>
    <div class="summary">
      <div class="stat"><div class="k">Batch gesamt</div><div class="v">${fNum(c.totalMl / 1000, 2)} <small>L</small></div></div>
      <div class="stat"><div class="k">Drinks</div><div class="v">${drinks}</div></div>
      <div class="stat"><div class="k">aus dem Batch</div><div class="v">${fNum(c.pourCl, 1)} <small>cl</small></div></div>
      <div class="stat"><div class="k">Alkohol Batch</div><div class="v">${fNum(c.abv, 1)} <small>% vol</small></div>${abvHint}</div>
    </div>
    ${jarTable(c, state)}
    ${freshTable(c)}
    ${flow(c)}
    ${fillLine(c, state)}
    <div class="service">Pro Drink: <b>${fNum(c.pourCl, 1)} cl</b> aus dem Batch${freshPart}.</div>
    <ul class="notes">${notes(c, state).map(([cls, t]) => `<li class="${cls}">${t}</li>`).join('')}</ul>
    <div class="actions">
      <button class="btn primary" id="copyBtn">Batch-Zettel kopieren</button>
      <button class="btn" id="printBtn">Drucken</button>
    </div>`;
}
