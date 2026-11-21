// Einheiten, Flaschengrößen, Erkennung frischer Zutaten und Startrezepte.
// Alle Mengen werden intern in cl gerechnet; UNITS.f ist der Faktor nach cl.

export const MAX_L = 100;     // größter Batch in Litern

// Worin abgefüllt wird. Jedes Gefäß wird voll gemacht, der Rest kommt ins letzte.
export const CONTAINERS = [
  { l: 7.5, label: 'Glas-Jar 7,5 L' },
  { l: 5,   label: 'Glas-Jar 5 L' },
  { l: 10,  label: 'Glas-Jar 10 L' },
  { l: 1,   label: 'Flasche 1 L' },
  { l: 0.7, label: 'Flasche 0,7 L' },
  { l: 0.5, label: 'Flasche 0,5 L' },
];
export const isBottleSize = l => l < 2;

export const UNITS = {
  cl:   { label: 'cl',   f: 1 },
  ml:   { label: 'ml',   f: 0.1 },
  dash: { label: 'Dash', f: 0.08 },  // 1 Dash ≈ 0,8 ml
  bl:   { label: 'BL',   f: 0.5 },   // Barlöffel ≈ 5 ml
};

export const BOTTLES = [0.2, 0.33, 0.5, 0.7, 0.75, 1, 1.5];

// Frische Zutaten kommen nie ins Jar, sondern beim Service frisch dazu.
// Säfte, alles mit Kohlensäure, Eiweiß & Milchprodukte, frische Kräuter.
const FRESH = /(saft|juice|limett|zitron|lime|lemon|grapefruit|orange|ananas|soda|tonic|limo|ginger ?(beer|ale)|cola|sprite|sekt|prosecco|champagner|cava|crémant|cremant|eiwei|aquafaba|\bei\b|sahne|cream|milch|minze|mint|basilikum|gurke)/i;

// Sirupe, Liköre & Co. enthalten manchmal diese Wörter, bleiben aber im Jar
const NOT_FRESH = /(sirup|syrup|likör|liqueur|cordial|bitter|curaçao|curacao|cointreau|triple sec)/i;

export const isFresh = name => FRESH.test(name) && !NOT_FRESH.test(name);

// Mit Kohlensäure → hier ist die Flaschenrechnung sinnvoll
const BUBBLY = /(soda|tonic|limo|ginger|cola|sprite|sekt|prosecco|champagner|cava|crémant|cremant)/i;
export const isBubbly = name => BUBBLY.test(name);

// Drei Gläser zur Auswahl pro Rezept
export const GLASSES = [
  { id: 'tumbler', label: 'Tumbler' },
  { id: 'highball', label: 'Highball' },
  { id: 'martini', label: 'Martini' },
];
// Ohne Wahl: mit Soda/Tonic/Limo → Highball, sonst Tumbler
export const defaultGlass = ings => ings.some(i => !i.batch && isBubbly(i.name)) ? 'highball' : 'tumbler';

// Zutat anlegen. batch=true → ins Jar, batch=false → frisch beim Service.
// Ohne Angabe entscheidet der Name.
export const ing = (name, amount, unit = 'cl', abv = 0, batch = !isFresh(name), bottle = 0.7) =>
  ({ name, amount, unit, abv, batch, bottle });

export const PRESETS = [
  { id: 'negroni', name: 'Negroni', glass: 'tumbler', ings: [
    ing('Gin', 3, 'cl', 40), ing('Campari', 3, 'cl', 25, true, 1), ing('Roter Wermut', 3, 'cl', 16, true, 1)] },
  { id: 'boulevardier', name: 'Boulevardier', glass: 'tumbler', ings: [
    ing('Bourbon', 5, 'cl', 43), ing('Campari', 2, 'cl', 25, true, 1), ing('Roter Wermut', 2, 'cl', 16, true, 1)] },
  { id: 'manhattan', name: 'Manhattan', glass: 'martini', ings: [
    ing('Rye Whiskey', 5, 'cl', 45), ing('Roter Wermut', 3, 'cl', 16, true, 1), ing('Angostura Bitters', 5, 'dash', 44.7, true, 0.2)] },
  { id: 'oldfashioned', name: 'Old Fashioned', glass: 'tumbler', ings: [
    ing('Bourbon', 6, 'cl', 43), ing('Zuckersirup 2:1', 0.75, 'cl', 0, true, 1), ing('Angostura Bitters', 3, 'dash', 44.7, true, 0.2)] },
  { id: 'americano', name: 'Americano', glass: 'highball', ings: [
    ing('Campari', 3, 'cl', 25, true, 1), ing('Roter Wermut', 3, 'cl', 16, true, 1), ing('Soda', 6, 'cl', 0, false, 1)] },
  { id: 'margarita', name: 'Margarita', glass: 'martini', ings: [
    ing('Tequila', 5, 'cl', 38), ing('Cointreau', 2, 'cl', 40), ing('Zuckersirup', 0.5, 'cl', 0, true, 1),
    ing('Limettensaft', 3, 'cl', 0, false, 1)] },
  { id: 'whiskeysour', name: 'Whiskey Sour', glass: 'tumbler', ings: [
    ing('Bourbon', 5, 'cl', 43), ing('Zuckersirup', 2, 'cl', 0, true, 1), ing('Angostura Bitters', 2, 'dash', 44.7, true, 0.2),
    ing('Zitronensaft', 3, 'cl', 0, false, 1), ing('Eiweiß', 2, 'cl', 0, false, 1)] },
  { id: 'paloma', name: 'Paloma', glass: 'highball', ings: [
    ing('Tequila', 5, 'cl', 38), ing('Limettensaft', 1.5, 'cl', 0, false, 1), ing('Grapefruit-Limo', 10, 'cl', 0, false, 1)] },
];
