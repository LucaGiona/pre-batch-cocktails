// Einheiten, Flaschengrößen und Startrezepte.
// Alle Mengen werden intern in cl gerechnet; UNITS.f ist der Faktor nach cl.

export const MAX_L = 10;      // größter Batch in Litern
export const FILL = 0.95;     // max. Füllgrad pro Gefäß (Luft zum Umrühren)

export const UNITS = {
  cl:   { label: 'cl',   f: 1 },
  ml:   { label: 'ml',   f: 0.1 },
  dash: { label: 'Dash', f: 0.08 },  // 1 Dash ≈ 0,8 ml
  bl:   { label: 'BL',   f: 0.5 },   // Barlöffel ≈ 5 ml
};

export const BOTTLES = [0.2, 0.5, 0.7, 0.75, 1, 1.5];

// Zutaten, die im Batch nicht lange halten → Hinweis „frisch“
export const FRESH = /(saft|juice|limett|zitron|lime|lemon|grapefruit|eiwei|sahne|cream|milch|frisch|minze|mint|basilikum)/i;

// Zutat anlegen: batch=false heißt „kommt erst beim Service dazu“ (Soda, Tonic …)
export const ing = (name, amount, unit = 'cl', abv = 0, batch = true, bottle = 0.7) =>
  ({ name, amount, unit, abv, batch, bottle });

export const PRESETS = [
  { id: 'negroni', name: 'Negroni', ings: [
    ing('Gin', 3, 'cl', 40), ing('Campari', 3, 'cl', 25, true, 1), ing('Roter Wermut', 3, 'cl', 16, true, 1)] },
  { id: 'boulevardier', name: 'Boulevardier', ings: [
    ing('Bourbon', 5, 'cl', 43), ing('Campari', 2, 'cl', 25, true, 1), ing('Roter Wermut', 2, 'cl', 16, true, 1)] },
  { id: 'manhattan', name: 'Manhattan', ings: [
    ing('Rye Whiskey', 5, 'cl', 45), ing('Roter Wermut', 3, 'cl', 16, true, 1), ing('Angostura Bitters', 5, 'dash', 44.7, true, 0.2)] },
  { id: 'oldfashioned', name: 'Old Fashioned', ings: [
    ing('Bourbon', 6, 'cl', 43), ing('Zuckersirup 2:1', 0.75, 'cl', 0, true, 1), ing('Angostura Bitters', 3, 'dash', 44.7, true, 0.2)] },
  { id: 'americano', name: 'Americano', ings: [
    ing('Campari', 3, 'cl', 25, true, 1), ing('Roter Wermut', 3, 'cl', 16, true, 1), ing('Soda', 6, 'cl', 0, false, 1)] },
  { id: 'margarita', name: 'Margarita', ings: [
    ing('Tequila', 5, 'cl', 38), ing('Cointreau', 2, 'cl', 40), ing('Limettensaft', 3, 'cl', 0, true, 1), ing('Zuckersirup', 0.5, 'cl', 0, true, 1)] },
];
