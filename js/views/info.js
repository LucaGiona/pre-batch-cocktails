// Info-Fenster (ⓘ oben rechts): App installieren, Sicherung speichern/einlesen, Über die App.
// Die Daten selbst verwaltet main.js – hier nur Anzeige und Bedienung.

import { $, toast } from '../utils.js';
import { makeBackup, backupFileName, parseBackup, mergeRecipes } from '../backup.js';
import { getLastBackup, setLastBackup } from '../storage.js';
import { PRESETS } from '../recipes.js';

const REMIND_DAYS = 30;
let installEvent = null;          // von Chrome/Edge/Android: „beforeinstallprompt“
let handlers = { getRecipes: () => [], onImport: () => {}, getStatus: () => '' };

/* ---------- Installation ---------- */

// Läuft als installierte App? Browser melden das unterschiedlich (Chrome, Brave, Edge, Safari)
const APP_MODES = ['standalone', 'minimal-ui', 'window-controls-overlay', 'fullscreen'];
const isStandalone = () =>
  APP_MODES.some(m => matchMedia(`(display-mode: ${m})`).matches) || navigator.standalone === true;
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPad mit „Desktop“-Ansicht

function installHtml() {
  if (isStandalone())
    return '<p class="ok-line">✓ Pre-Batch ist als App installiert.</p>';
  if (installEvent)
    return `<p>Installiere Pre-Batch als App: eigenes Icon, ohne Browserleiste, läuft auch offline.</p>
      <button class="btn primary" id="infoInstall">App installieren</button>`;
  if (isIOS())
    return `<p>So installierst du Pre-Batch auf dem iPhone oder iPad:</p>
      <ol class="steps">
        <li>In <b>Safari</b> unten auf <b>Teilen</b> tippen <span class="ios-share" aria-hidden="true"></span></li>
        <li><b>„Zum Home-Bildschirm“</b> wählen</li>
        <li>Oben rechts auf <b>Hinzufügen</b> tippen</li>
      </ol>`;
  return `<p>Im Browser-Menü <b>„App installieren“</b> bzw. <b>„Zum Startbildschirm hinzufügen“</b> wählen.
      Dann startet Pre-Batch wie eine App und läuft auch offline.</p>`;
}

/* ---------- Sicherung ---------- */

// Eigene oder geänderte Rezepte: keine Vorlage oder seit dem Anlegen bearbeitet
const ownCount = recipes => recipes.filter(r => !PRESETS.some(p => p.id === r.id) || r.updated).length;

function lastBackupText() {
  const t = getLastBackup();
  if (!t) return 'noch nie';
  const days = Math.floor((Date.now() - t) / 86400000);
  return days === 0 ? 'heute' : days === 1 ? 'gestern' : `vor ${days} Tagen`;
}

// Erinnern, wenn es eigene/geänderte Rezepte gibt und die letzte Sicherung alt ist
export function needsBackup(recipes) {
  const t = getLastBackup();
  return ownCount(recipes) > 0 && (!t || Date.now() - t > REMIND_DAYS * 86400000);
}

function backupHtml(recipes) {
  const own = ownCount(recipes);
  return `<p>Deine Rezepte liegen <b>nur auf diesem Gerät</b>. Browserdaten löschen oder Gerätewechsel –
      dann sind eigene Rezepte weg. Speichere ab und zu eine Sicherung, z. B. in Dateien, iCloud oder per Mail.</p>
    <p class="muted-line">${recipes.length} Rezepte, davon ${own} eigene oder geänderte · letzte Sicherung: <b>${lastBackupText()}</b></p>
    <div class="btn-row">
      <button class="btn primary" id="infoExport">Sicherung speichern</button>
      <button class="btn" id="infoImportBtn">Sicherung einlesen</button>
      <input type="file" id="infoImport" accept=".json,application/json" hidden>
    </div>
    <p class="muted-line">Einlesen löscht nichts: Neue Rezepte kommen dazu, vorhandene werden nur ersetzt, wenn sie in der Sicherung neuer sind.</p>`;
}

async function exportBackup() {
  const recipes = handlers.getRecipes();
  const text = JSON.stringify(makeBackup(recipes), null, 2);
  const name = backupFileName();
  const file = new File([text], name, { type: 'application/json' });
  try {
    // Am Handy: Teilen-Menü (Dateien, iCloud, Mail …), sonst normaler Download
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ files: [file], title: 'Pre-Batch Sicherung' });
    } else {
      const url = URL.createObjectURL(file);
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    setLastBackup();
    toast('Sicherung gespeichert');
    render();
    handlers.onBackupDone?.();
  } catch (e) {
    if (e?.name !== 'AbortError') toast('Speichern nicht möglich');
  }
}

async function importBackup(file) {
  try {
    const { recipes: incoming, skipped } = parseBackup(await file.text());
    const res = mergeRecipes(handlers.getRecipes(), incoming);
    handlers.onImport(res.recipes);
    const parts = [`${res.added} neu`, `${res.updated} aktualisiert`, `${res.unchanged} unverändert`];
    if (skipped) parts.push(`${skipped} übersprungen`);
    toast('Eingelesen: ' + parts.join(', '));
    render();
  } catch (e) {
    toast(e.message || 'Einlesen nicht möglich');
  }
}

/* ---------- Fenster ---------- */

function render() {
  const recipes = handlers.getRecipes();
  $('#infoBody').innerHTML = `
    <section><h4>App installieren</h4>${installHtml()}</section>
    <section><h4>Sicherung</h4>${backupHtml(recipes)}</section>
    <section><h4>Über Pre-Batch</h4>
      <p class="muted-line">Status: <b>${handlers.getStatus()}</b></p>
      <p class="muted-line">Mengen, Alkoholgehalt und Ausbeute sind Richtwerte – bitte abschmecken.
        Alle Daten bleiben auf deinem Gerät, nichts wird an einen Server geschickt.</p>
      <p class="muted-line">Ein Projekt von <a href="https://maranta.dev" target="_blank" rel="noopener">maranta.dev</a></p>
    </section>`;
}

export function openInfo() { render(); $('#info').classList.add('open'); }
const closeInfo = () => $('#info').classList.remove('open');

export function initInfo(h) {
  handlers = h;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; });
  addEventListener('appinstalled', () => { installEvent = null; toast('App installiert'); render(); });

  $('#infoBtn').addEventListener('click', openInfo);
  $('#infoClose').addEventListener('click', closeInfo);
  $('#info').addEventListener('click', async e => {
    if (e.target.id === 'info') return closeInfo();
    if (e.target.id === 'infoExport') return exportBackup();
    if (e.target.id === 'infoImportBtn') return $('#infoImport').click();
    if (e.target.id === 'infoInstall' && installEvent) {
      installEvent.prompt();
      await installEvent.userChoice.catch(() => {});
      installEvent = null;
      render();
    }
  });
  $('#info').addEventListener('change', e => {
    if (e.target.id === 'infoImport' && e.target.files[0]) importBackup(e.target.files[0]);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeInfo(); });
}
