# Pre-Batch – Cocktails hochrechnen

Cocktail-Rezepturen auf Batch-Mengen hochrechnen, z. B. einen Negroni auf 7 Liter für ein
7,5-L-Glas-Jar. Als App fürs Handy (PWA), **läuft offline**. Kein Server, kein Konto, kein PHP.

## Was die App kann

- Rezept wählen (Negroni, Boulevardier, Manhattan, Old Fashioned, Americano, Margarita)
  oder eigene anlegen. Einheiten: cl, ml, Dash (≈ 0,8 ml), Barlöffel (≈ 5 ml).
- Menge nach **Volumen** (0,5–10 L) oder nach **Anzahl Drinks**. Maximum 10 L pro Batch.
- Ergebnis: ml und Liter pro Zutat, Anzahl Flaschen (Größe pro Zutat einstellbar),
  Drinks gesamt, cl pro Drink, Alkoholgehalt des Batches.
- Gefäß wählen (Jar 5 / 7,5 / 10 L, Flaschen 0,7 / 1 L): zeigt Füllstand und verteilt
  auf mehrere Gefäße, wenn nötig. Füllgrenze 95 %.
- Zutaten mit „Im Batch“ aus (Soda, Tonic …) kommen nicht in den Batch, sondern als
  Hinweis „beim Service pro Drink“.
- Warnt bei frischen Zutaten (Säfte, Eiweiß, Kräuter).
- Batch-Zettel kopieren (fürs Etikett am Jar) und drucken.

## Wo die Daten liegen

Eigene Rezepte liegen im **localStorage** des Browsers auf dem Gerät. Browserdaten löschen
oder Gerät wechseln = eigene Rezepte weg. Die Startrezepte kommen immer wieder.

## Lokal ausprobieren

Braucht einen einfachen Webserver (wegen ES-Modulen und Service Worker, nicht per Doppelklick):

```bash
cd ~/Development/prebatch
python3 -m http.server 8020
```

→ <http://localhost:8020> (oder in VS Code: Live Server)

## Hochladen

Den **Inhalt** dieses Ordners per FileZilla z. B. nach `maranta.dev/html/gastro/batchen/`.
Nur statische Dateien, kein PHP nötig. Geht genauso mit GitHub Pages oder Netlify.

## Änderungen veröffentlichen

1. Ändern, testen.
2. **`VERSION` in `sw.js` erhöhen** – sonst sehen installierte Apps die Änderung nicht.
3. Neue Dateien auch in `SHELL_FILES` in `sw.js` eintragen.
4. Hochladen. Beim nächsten Öffnen nimmt die App die neue Version.

## Aufbau

```text
index.html, sw.js, manifest.webmanifest   App-Hülle und PWA (VERSION in sw.js erhöhen!)
css/style.css         Aussehen (dunkel, Bar-Stil), inkl. Druckansicht
js/main.js            Start, Zustand, Eingaben, Service Worker anmelden
js/recipes.js         Einheiten, Flaschengrößen, Startrezepte, Grenzen (MAX_L, FILL)
js/calc.js            die Rechnung (ohne DOM) + Text für den Batch-Zettel
js/storage.js         Speicher auf dem Gerät (localStorage)
js/utils.js           Helfer: $, Zahlenformat (de-DE), esc, toast
js/views/result.js    Ergebnis-Karte: Tabelle, Gefäße, Hinweise
js/views/editor.js    Rezept anlegen/bearbeiten/löschen
app-icons/            Icons (SVG, 192, 512)
```

Aufbau angelehnt an `../medikamente-app-lokal`.
