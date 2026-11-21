// SVG-Grafiken: Jar, Flasche, Gläser (Tumbler, Highball, Martini) und Glas-Icons für den Editor.
// Reine Funktionen, die SVG-Text zurückgeben – kein DOM-Zugriff.

import { FILL } from '../recipes.js';
import { esc, fNum } from '../utils.js';

export const BATCH_COLOR = '#e0457b';   // Farbe des Batches: Jar, Flasche, untere Glasschicht
const LINE = '#a8998b';
const GLASS = '#f3ece4';
const clamp01 = x => Math.max(0, Math.min(1, x));

/* ---------- Gefäße ---------- */

function jar(fill, key) {
  const top = 14, bodyH = 68, fh = clamp01(fill) * bodyH, line = top + bodyH * (1 - FILL);
  return `<svg width="60" height="86" viewBox="0 0 60 86" aria-hidden="true">
    <rect x="16" y="2" width="28" height="10" rx="2" fill="#5a4b3f"/>
    <clipPath id="c${key}"><rect x="6" y="${top}" width="48" height="${bodyH}" rx="9"/></clipPath>
    <rect x="6" y="${top + bodyH - fh}" width="48" height="${fh}" fill="${BATCH_COLOR}" clip-path="url(#c${key})"/>
    <line x1="6" x2="54" y1="${line}" y2="${line}" stroke="${LINE}" stroke-dasharray="3 3"/>
    <rect x="6" y="${top}" width="48" height="${bodyH}" rx="9" fill="none" stroke="${LINE}" stroke-width="1.5"/>
  </svg>`;
}

function bottle(fill, key) {
  // Innenraum von der Schulter (y 26) bis zum Boden (y 93)
  const top = 26, bottom = 93, h = bottom - top, fh = clamp01(fill) * h, line = bottom - h * FILL;
  const shape = 'M16 10H24V26Q24 30 30 34Q35 37 35 44V88Q35 93 30 93H10Q5 93 5 88V44Q5 37 10 34Q16 30 16 26Z';
  return `<svg width="40" height="96" viewBox="0 0 40 96" aria-hidden="true">
    <rect x="14.5" y="2" width="11" height="9" rx="1.5" fill="#5a4b3f"/>
    <clipPath id="c${key}"><path d="${shape}"/></clipPath>
    <rect x="0" y="${bottom - fh}" width="40" height="${fh}" fill="${BATCH_COLOR}" clip-path="url(#c${key})"/>
    <line x1="5" x2="35" y1="${line}" y2="${line}" stroke="${LINE}" stroke-dasharray="3 3" clip-path="url(#c${key})"/>
    <path d="${shape}" fill="none" stroke="${LINE}" stroke-width="1.5"/>
  </svg>`;
}

// Ein Gefäß mit Beschriftung darunter. kind: 'jar' | 'bottle'
export function containerSvg(kind, fill, label, key, scale = 1) {
  const svg = (kind === 'bottle' ? bottle : jar)(fill, key)
    .replace(/width="(\d+)" height="(\d+)"/, (_, w, h) => `width="${w * scale}" height="${h * scale}"`);
  return `<div class="jar">${svg}${label}</div>`;
}

/* ---------- Gläser ---------- */
// Alle Gläser im gleichen Rahmen: viewBox 0 0 56 84, Boden bei y = 80.

const SHAPES = {
  tumbler:  { x: 6,  w: 44, top: 38 },
  highball: { x: 12, w: 32, top: 10 },
};
// Martini: Kelch als Dreieck von (4|14) und (52|14) zur Spitze (28|46)
const M = { cx: 28, rimY: 14, tipY: 46, half: 24 };

function outline(type) {
  if (type === 'martini') {
    return `<path d="M4 14L28 46L52 14" fill="none" stroke="${GLASS}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M28 46V77" stroke="${GLASS}" stroke-width="1.6"/>
      <path d="M17 80Q28 75 39 80" fill="none" stroke="${GLASS}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  const s = SHAPES[type];
  return `<path d="M${s.x} ${s.top}V77q0 3 3 3h${s.w - 6}q3 0 3-3V${s.top}" fill="none" stroke="${GLASS}" stroke-width="1.6"/>
    <rect x="${s.x + 1}" y="76" width="${s.w - 2}" height="4" fill="${GLASS}" opacity=".25"/>`;
}

// Gerade Gläser: Schichten nach Höhe (Höhe ∝ Volumen)
function straightLayers(type, layers, total) {
  const s = SHAPES[type], ix = s.x + 2.5, iw = s.w - 5, bottom = 76, fillH = (bottom - s.top - 4) * 0.85;
  let y = bottom;
  return layers.map(l => {
    const lh = fillH * l.cl / total;
    y -= lh;
    return `<rect x="${ix}" y="${y}" width="${iw}" height="${lh}" fill="${l.color}"><title>${esc(l.name)}: ${fNum(l.cl, 1)} cl</title></rect>`;
  }).join('');
}

// Martini-Kelch: Volumen eines Kegels wächst mit der Höhe hoch 3.
// Darum werden die Grenzen über die dritte Wurzel des Volumenanteils berechnet.
function martiniLayers(layers, total) {
  const H = M.tipY - M.rimY, FULL = 0.8, inset = 0.9;
  const at = v => {                              // v = Volumenanteil 0..1 der Füllung
    const h = H * Math.cbrt(FULL * v);
    return { y: M.tipY - h, hw: M.half * inset * h / H };
  };
  let cum = 0;
  return layers.map(l => {
    const a = at(cum / total); cum += l.cl; const b = at(cum / total);
    const pts = [[M.cx - a.hw, a.y], [M.cx + a.hw, a.y], [M.cx + b.hw, b.y], [M.cx - b.hw, b.y]]
      .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    return `<polygon points="${pts}" fill="${l.color}"><title>${esc(l.name)}: ${fNum(l.cl, 1)} cl</title></polygon>`;
  }).join('');
}

// layers: [{ cl, color, name }] von unten nach oben
export function glassSvg(type, layers) {
  const total = layers.reduce((s, l) => s + l.cl, 0) || 1;
  const fill = type === 'martini' ? martiniLayers(layers, total) : straightLayers(type, layers, total);
  return `<svg width="56" height="84" viewBox="0 0 56 84" aria-hidden="true">${fill}${outline(type)}</svg>`;
}

// Kleines Icon ohne Füllung, Farbe über currentColor
// Ausschnitt pro Glas, damit alle Icons gleich hoch wirken
const ICON_BOX = { tumbler: [3, 35, 50, 48], highball: [9, 7, 38, 76], martini: [1, 11, 54, 72] };

export function glassIcon(type) {
  const [x, y, w, h] = ICON_BOX[type], H = 24;
  return `<svg width="${(H * w / h).toFixed(1)}" height="${H}" viewBox="${x} ${y} ${w} ${h}" aria-hidden="true">${outline(type).replaceAll(GLASS, 'currentColor').replaceAll('stroke-width="1.6"', 'stroke-width="4"')}</svg>`;
}
