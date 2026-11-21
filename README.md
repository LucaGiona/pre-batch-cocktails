# Pre-Batch – Cocktails hochrechnen

Cocktail-Rezepturen auf Batch-Mengen hochrechnen, z. B. einen Negroni auf 7 Liter für ein
7,5-L-Glas-Jar. Als App fürs Handy (PWA), **läuft offline**. Kein Server, kein Konto, kein PHP.

## Was die App kann

- Rezept wählen (Negroni, Boulevardier, Manhattan, Old Fashioned, Americano, Margarita,
  Whiskey Sour, Paloma)
  oder eigene anlegen. Einheiten: cl, ml, Dash (≈ 0,8 ml), Barlöffel (≈ 5 ml).
- **Batch-Menge** nach Volumen (0,5–100 L) oder nach Anzahl Drinks. Der Regler hat bis 10 L
  feine Schritte (0,1 L), darüber 0,5 L.
- Ergebnis: ml und Liter pro Zutat, Anzahl Flaschen (Größe pro Zutat einstellbar),
  Drinks gesamt, cl pro Drink, Alkoholgehalt des Batches.
- **Abfüllen in** Jar 7,5 / 5 / 10 L oder Flasche 1 / 0,7 / 0,5 L: Jedes Gefäß wird voll
  gemacht, der Rest kommt ins letzte (z. B. 7 Flaschen voll + 1 mit 0,50 L). Ein Knopf rundet
  die Batch-Menge auf volle Gefäße auf.
- **Jar | Frisch** pro Zutat: Säfte, Soda, Limo, Tonic, Sekt, Eiweiß, Kräuter kommen nie ins Jar,
  sondern frisch beim Service dazu. Die App erkennt das am Namen (`isFresh` in `js/recipes.js`),
  umstellen geht jederzeit von Hand.
- Erkennt auch Schaumwein (Sekt, Prosecco, Champagner/Champagne, Cava, Crémant, Spumante,
  Franciacorta, Lambrusco, Perlwein, Frizzante, Sparkling) und Bitter Lemon als frisch.
  Liköre wie Limoncello und Bitters bleiben im Batch.
- **Einkauf:** Bei Säften und Eiweiß schätzt die App die Anzahl Früchte bzw. Eier
  (Limette ≈ 2,5 cl, Zitrone ≈ 4 cl, Orange ≈ 8 cl, Grapefruit ≈ 15 cl, Eiweiß ≈ 3 cl pro Ei),
  bei Soda & Schaumwein die Flaschen. Werte in `YIELDS` in `js/recipes.js`.
- Ergebnis in zwei Blöcken: **Ins Jar** (die Ziel-Liter gelten nur dafür) und
  **Frisch beim Service** (pro Drink + gesamt für alle Drinks, bei Soda & Co. ganze Flaschen).
- Alkohol im Jar und im fertigen Glas (ohne Schmelzwasser).
- **Grafik:** volle Gefäße + Rest-Gefäß → Pfeil (cl pro Drink) → Glas mit Schichten × Anzahl Drinks.
  Der Batch ist pink (`BATCH_COLOR`), frische Zutaten haben eigene Farben.
- **Glas pro Rezept:** Tumbler, Highball oder Martini. Ohne Wahl: mit Soda & Co. Highball,
  sonst Tumbler. Im Martini-Glas werden die Schichten nach Volumen berechnet (Kegel).
- Warnt, wenn eine frische Zutat bewusst ins Jar geschaltet ist.
- Batch-Zettel kopieren (fürs Etikett am Jar) und drucken.

## Wo die Daten liegen

Eigene Rezepte liegen im **localStorage** des Browsers auf dem Gerät. Browserdaten löschen
oder Gerät wechseln = eigene Rezepte weg. Die Startrezepte kommen immer wieder.

Ändert sich das Datenformat, rechnet `js/storage.js` alte Einträge beim Start um
(`DATA_VERSION`). Version 2: frische Zutaten aus alten Rezepten werden auf „Frisch“ gestellt,
neue Startrezepte ergänzt. Version 3: jedes Rezept bekommt ein Glas.

## Lokal ausprobieren

Braucht einen einfachen Webserver (wegen ES-Modulen und Service Worker, nicht per Doppelklick):

```bash
cd ~/Development/prebatch
python3 -m http.server 8020
```

→ <http://localhost:8020> (oder in VS Code: Live Server)

Auf `localhost` läuft die App **ohne Service Worker**, damit der Cache beim Entwickeln keine
alten Dateien liefert. Ein vorhandener Service Worker wird dabei entfernt (Rezepte bleiben).
Offline lokal testen: `http://localhost:8020/?offline`

## Hochladen

Den **Inhalt** dieses Ordners per FileZilla z. B. nach `maranta.dev/html/gastro/batchen/`.
Nur statische Dateien, kein PHP nötig. Geht genauso mit GitHub Pages oder Netlify.

## Änderungen veröffentlichen

1. Ändern, testen.
2. **`VERSION` in `sw.js` erhöhen** – sonst sehen installierte Apps die Änderung nicht.
3. Neue Dateien auch in `SHELL_FILES` in `sw.js` eintragen.
4. Hochladen, **`sw.js` als Letztes**. Sonst kann sich der Service Worker eine Mischung aus
   alten und neuen Dateien merken, und die Seite bleibt leer.

## Aufbau

```text
index.html, sw.js, manifest.webmanifest   App-Hülle und PWA (VERSION in sw.js erhöhen!)
css/style.css         Aussehen (dunkel, Bar-Stil), inkl. Druckansicht
js/main.js            Start, Zustand, Eingaben, Service Worker anmelden
js/recipes.js         Einheiten, Flaschen, Gefäße, Startrezepte, Grenzen, Erkennung frischer Zutaten
js/calc.js            die Rechnung (ohne DOM), Abfüllen (volle Gefäße + Rest), Batch-Zettel
js/storage.js         Speicher auf dem Gerät (localStorage) + Umrechnung alter Daten
js/utils.js           Helfer: $, Zahlenformat (de-DE), esc, toast
js/views/result.js    Ergebnis-Karte: Tabelle, Gefäße, Hinweise
js/views/editor.js    Rezept anlegen/bearbeiten/löschen, Umschalter Jar | Frisch, Glas-Auswahl
js/views/graphics.js  SVG: Jar, Flasche, Gläser, Glas-Icons (BATCH_COLOR)
app-icons/            Icons (SVG, 192, 512)
```

Aufbau angelehnt an `../medikamente-app-lokal`.
