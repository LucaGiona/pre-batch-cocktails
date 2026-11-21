// Ergebnis-Karte: Kennzahlen, Zutatenliste, Gefäße, Hinweise.

import { UNITS, MAX_L, FILL } from '../recipes.js';
import { esc, fAuto, fInt, fL, fMl, fNum } from '../utils.js';

function jarSvg(fillRatio, label, key) {
  const h = 86, w = 60, top = 14, bodyH = h - top - 4;
  const fh = Math.max(0, Math.min(1, fillRatio)) * bodyH;
  const line = top + bodyH * (1 - FILL);
  return `<div class="jar"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <rect x="16" y="2" width="28" height="10" rx="2" fill="#5a4b3f"/>
    <clipPath id="jar${key}"><rect x="6" y="${top}" width="48" height="${bodyH}" rx="9"/></clipPath>
    <rect x="6" y="${top + bodyH - fh}" width="48" height="${fh}" fill="#c8402f" clip-path="url(#jar${key})" opacity=".9"/>
    <line x1="6" x2="54" y1="${line}" y2="${line}" stroke="#a8998b" stroke-dasharray="3 3"/>
    <rect x="6" y="${top}" width="48" height="${bodyH}" rx="9" fill="none" stroke="#a8998b" stroke-width="1.5"/>
  </svg>${label}</div>`;
}

function notes(c, state) {
  const out = [];
  if (c.capped) out.push(['warn', `Maximal ${MAX_L} L pro Batch – auf ${fInt(c.maxCount)} Drinks begrenzt.`]);
  if (c.rows.some(r => r.fresh))
    out.push(['warn', 'Frische Zutaten (Säfte, Eiweiß, Kräuter) halten im Batch nur ca. 1 Tag. Besser separat halten oder durch Säure-Lösung ersetzen.']);
  if (c.jars > 1)
    out.push(['', `Passt nicht in ein Gefäß – auf ${c.jars} × ${state.jarL >= 2 ? 'Jars' : 'Flaschen'} à ${fNum(c.perJar / 1000, 2)} L verteilen. Am besten erst komplett mischen, dann abfüllen.`]);
  if (state.mode === 'vol' && state.jarL >= 2 && state.targetL > state.jarL * FILL && state.targetL <= state.jarL)
    out.push(['', `${fAuto(state.targetL)} L im ${fAuto(state.jarL)}-L-Jar ist randvoll – mit 7 L bleibt Platz zum Umrühren.`]);
  if (c.rows.some(r => r.unit === 'dash'))
    out.push(['', 'Dashes umgerechnet mit 1 Dash ≈ 0,8 ml. Bitters lieber knapp dosieren und abschmecken – sie dominieren im Batch schnell.']);
  return out;
}

export function renderResult(el, c, state) {
  if (!c) { el.innerHTML = '<p class="empty">Kein Rezept gewählt.</p>'; return; }
  if (c.empty) {
    el.innerHTML = '<h2>Ergebnis</h2><p class="empty">Dieses Rezept hat noch keine Zutaten im Batch. Tippe auf „Bearbeiten“.</p>';
    return;
  }

  const drinks = state.mode === 'vol' ? '≈ ' + fInt(Math.floor(c.n)) : fInt(c.n);

  const rows = c.rows.map(r => `
    <tr>
      <td>${esc(r.name)}${r.fresh ? '<span class="tag warn">frisch</span>' : ''}
        <span class="alt">${fAuto(+r.amount)} ${UNITS[r.unit].label} pro Drink${r.abv ? ' · ' + fAuto(+r.abv) + ' %' : ''}</span></td>
      <td><span class="main">${fMl(r.ml)}</span><span class="alt">${fL(r.ml)}</span></td>
      <td><span class="main">${fNum(r.bottles, 1)}</span><span class="alt">× ${fAuto(r.bottle)} L</span></td>
    </tr>`).join('');

  const jars = Array.from({ length: c.jars }, (_, k) =>
    jarSvg(c.perJar / (state.jarL * 1000), `${fNum(c.perJar / 1000, 2)} L`, k)).join('');

  const service = c.service.length
    ? ' + beim Service: ' + c.service.map(s => `<b>${fAuto(+s.amount)} ${UNITS[s.unit].label}</b> ${esc(s.name)}`).join(', ')
    : '';

  el.innerHTML = `
    <h2>Ergebnis · ${esc(c.recipe.name)}</h2>
    <div class="summary">
      <div class="stat"><div class="k">Batch gesamt</div><div class="v">${fNum(c.totalMl / 1000, 2)} <small>L</small></div></div>
      <div class="stat"><div class="k">Drinks</div><div class="v">${drinks}</div></div>
      <div class="stat"><div class="k">pro Drink</div><div class="v">${fNum(c.pourCl, 1)} <small>cl</small></div></div>
      <div class="stat"><div class="k">Alkohol</div><div class="v">${fNum(c.abv, 1)} <small>% vol</small></div></div>
    </div>
    <table>
      <thead><tr><th>Zutat</th><th>Menge</th><th>Flaschen</th></tr></thead>
      <tbody>${rows}
        <tr class="total"><td>Gesamt</td><td>${fL(c.totalMl)}</td><td></td></tr>
      </tbody>
    </table>
    <div class="jars" aria-label="Gefäße">${jars}</div>
    <div class="service">Pro Drink abfüllen: <b>${fNum(c.pourCl, 1)} cl</b> aus dem Batch${service}.</div>
    <ul class="notes">${notes(c, state).map(([cls, t]) => `<li class="${cls}">${t}</li>`).join('')}</ul>
    <div class="actions">
      <button class="btn primary" id="copyBtn">Batch-Zettel kopieren</button>
      <button class="btn" id="printBtn">Drucken</button>
    </div>`;
}
