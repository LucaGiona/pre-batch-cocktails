// Kleine Helfer: DOM, Zahlenformat (deutsch), HTML escapen, Toast.

export const $ = sel => document.querySelector(sel);
export const $$ = sel => [...document.querySelectorAll(sel)];

const nf = d => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

export const fInt = x => nf(0).format(x);
export const fNum = (x, d = 1) => nf(d).format(x);

// 3 → „3“, 0,5 → „0,5“, 0,75 → „0,75“
export const fAuto = x => {
  if (Number.isInteger(+(+x).toFixed(2))) return nf(0).format(x);
  if (Math.abs(x * 10 - Math.round(x * 10)) < 1e-9) return nf(1).format(x);
  return nf(2).format(x);
};

export const fMl = ml => (ml >= 100 ? nf(0).format(Math.round(ml)) : nf(1).format(ml)) + ' ml';
export const fL = ml => nf(2).format(ml / 1000) + ' L';

// Komma oder Punkt als Dezimaltrenner akzeptieren
export const num = v => +String(v).replace(',', '.') || 0;

export const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
