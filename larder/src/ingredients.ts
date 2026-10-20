// Recipe ingredient lines: split "2 cups baby spinach, rinsed" into an amount and a food name, and
// match a food name against kitchen items. Pure; self-check: `npx tsx scripts/check-recipes.ts`.
import { Item, RecipeIngredient } from './data/types';
import { stem, words } from './foodkeeper';
import { isOut } from './logic';

const FRAC = '½¼¾⅓⅔⅛⅜⅝⅞';
const NUM = `(?:\\d+(?:[.,]\\d+)?(?:\\s*\\/\\s*\\d+)?[${FRAC}]?|[${FRAC}])`;
const QTY = `(?:${NUM}(?:\\s+${NUM})?)`; // "1 1/2"
const RANGE = `(?:${QTY}(?:\\s*(?:-|–|to|or)\\s*${QTY})?|an?)`;
const UNITS = [
  'cups?', 'c', 'tablespoons?', 'tbsps?', 'tbs', 'tbl', 'teaspoons?', 'tsps?', 'ounces?', 'oz', 'fl\\.? ?oz', 'pounds?', 'lbs?',
  'grams?', 'g', 'kilograms?', 'kg', 'millilit(?:er|re)s?', 'ml', 'lit(?:er|re)s?', 'l', 'pints?', 'quarts?', 'qt', 'gallons?',
  'pinch(?:es)?', 'dash(?:es)?', 'cloves?', 'cans?', 'tins?', 'jars?', 'packages?', 'pkgs?', 'packets?', 'bags?', 'boxes?',
  'bunch(?:es)?', 'handfuls?', 'slices?', 'sticks?', 'sprigs?', 'pieces?', 'heads?', 'stalks?', 'knobs?', 'sheets?', 'fillets?',
];
const UNIT = `(?:${UNITS.join('|')})\\.?(?=[\\s,(]|$)\\s*`;
const SIZE = '(?:small|medium|large|heaping|heaped|level|generous)\\s+';
// number, (size note), size, up to two units ("400g can"), (size note), "of"
const AMOUNT = new RegExp(`^(${RANGE})\\s*(\\([^)]*\\)\\s*)?(${SIZE})?((?:${UNIT}){0,2})(\\([^)]*\\)\\s*)?(?:of\\s+)?`, 'i');
const UNIT_OF = /^((?:pinch|dash|handful|splash|knob|sprinkle|drizzle)(?:es|s)?)\s+of\s+/i;
// Notes that trail the food name without a comma.
const TAIL = /\s+(to taste|for serving|to serve|for garnish|as needed|optional|or more|plus more.*|divided)$/i;
const AND_OR = /^(and|or)$/i;

export type ParsedIngredient = { name: string; amt: string; use?: number };

export const sentenceCase = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t);

// Take out parenthesised notes, nested or not: "chicken (, thinly sliced)", "soda ((optional, Note 1))".
function pullParens(t: string, notes: string[]): string {
  let out = '';
  let cur = '';
  let depth = 0;
  for (const ch of t) {
    if (ch === '(') { if (depth++) cur += ' '; continue; }
    if (ch === ')' && depth) { if (--depth) cur += ' '; else { notes.push(cur); cur = ''; } continue; }
    if (depth) cur += ch;
    else out += ch;
  }
  if (cur) notes.push(cur);
  return out;
}

const tidy = (t: string) => t.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ').replace(/^[\s,;]+|[\s,;]+$/g, '');

// Prep words left after the food: "onion thinly sliced", "chicken thighs boneless and skinless".
const isPrep = (w: string) => /^(boneless|skinless)$/i.test(w) || (/(ed|ly)$/i.test(w) && DESCRIPTORS.has(stem(w.toLowerCase())));

export function parseIngredient(line: string): ParsedIngredient {
  const clean = line.replace(/\s+/g, ' ').replace(/^[-•*▢\s]+/, '').trim();
  let qty = '';
  let use: number | undefined;
  let rest = clean;
  const m = clean.match(AMOUNT);
  const article = m && /^an?$/i.test(m[1]);
  if (m && !(article && !m[4])) {
    qty = tidy(m[0].replace(/\s*of\s*$/i, ''));
    rest = clean.slice(m[0].length);
    // A bare count ("4 chicken thighs", "2 large eggs") is how many to take out of the kitchen.
    if (!m[4] && /^\d+(\.\d+)?$/.test(m[1])) use = Number(m[1]);
  } else {
    const u = clean.match(UNIT_OF);
    if (u) { qty = u[1]; rest = clean.slice(u[0].length); }
  }
  const parens: string[] = [];
  rest = tidy(pullParens(rest, parens));
  let tail = '';
  const t = rest.match(TAIL);
  if (t) { tail = t[1]; rest = rest.slice(0, t.index).trim(); }
  // "boneless, skinless chicken thighs, cut up": the name runs until the first segment with a real food word.
  const parts = rest.split(/\s*,\s*/);
  let k = 0;
  while (k < parts.length - 1 && !foodWords(parts[k]).length) k++;
  const tok = parts.slice(0, k + 1).join(', ').split(' ');
  let end = tok.length;
  while (end > 1 && (isPrep(tok[end - 1]) || (AND_OR.test(tok[end - 1]) && end < tok.length))) end--;
  const name = tok.slice(0, end).join(' ').trim();
  const prep = tok.slice(end).join(' ').replace(/^(and|or)\s+/i, '');
  const notes = [prep, ...parts.slice(k + 1), tail, ...parens].map(tidy).filter(Boolean);
  return {
    name: name ? name.charAt(0).toUpperCase() + name.slice(1) : clean,
    amt: [qty, ...notes].filter(Boolean).join(', '),
    ...(use ? { use } : {}),
  };
}

// Words that describe how the food is bought or prepped, not what it is.
const DESCRIPTORS = new Set(['fresh', 'freshly', 'large', 'medium', 'small', 'big', 'jumbo', 'baby', 'boneless', 'skinless',
  'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded', 'crushed', 'ground', 'peeled', 'cooked', 'uncooked', 'dried',
  'raw', 'ripe', 'whole', 'plain', 'unsalted', 'salted', 'organic', 'extra', 'virgin', 'light', 'packed', 'softened', 'melted',
  'cold', 'warm', 'room', 'temperature', 'finely', 'roughly', 'thinly', 'coarsely', 'lightly', 'beaten', 'halved', 'quartered',
  'cubed', 'trimmed', 'rinsed', 'drained', 'frozen', 'thawed', 'canned', 'low', 'sodium', 'reduced', 'fat', 'free', 'range',
  'whipping', 'heaping', 'level', 'good', 'quality', 'kosher', 'sea', 'about', 'optional', 'divided', 'plus', 'more', 'of',
  'and', 'or', 'the', 'a', 'an', 'for', 'into', 'to', 'in', 'with', 'x', 'cut', 'pitted', 'deveined', 'stemmed', 'seeded']
  .map(stem));
// How the food comes, at the end of a name: "garlic cloves", "basil leaves", "salmon fillets".
const FORMS = new Set(['clove', 'leaf', 'leave', 'sprig', 'stalk', 'floret', 'piece', 'cube', 'chunk', 'wedge', 'fillet', 'head', 'bunch', 'can', 'jar', 'tin', 'packet']);
// Category words a recipe adds to a specific food: "parmesan cheese" is the kitchen's "Parmesan".
const GENERIC = new Set(['cheese', 'pasta', 'noodle', 'bread', 'meat', 'fish']);
// "Chicken" in a recipe is happily served by chicken thighs or breasts.
const PROTEINS = new Set(['chicken', 'beef', 'pork', 'turkey', 'lamb', 'salmon', 'tuna', 'shrimp', 'prawn', 'fish']);

// Stemmed food words of a name, minus prep words and a trailing form word.
export function foodWords(name: string): string[] {
  const w = words(name).map(stem).filter((x) => !DESCRIPTORS.has(x));
  while (w.length > 1 && FORMS.has(w[w.length - 1])) w.pop();
  return w;
}

// Same as foodWords but keeps the original spelling, for searching other databases.
export function plainFood(name: string): string {
  const w = words(name).filter((x) => !DESCRIPTORS.has(stem(x)));
  while (w.length > 1 && FORMS.has(stem(w[w.length - 1]))) w.pop();
  return w.join(' ');
}

// How well a recipe's food name describes a kitchen item; 0 = not the same food.
export function nameScore(ingredient: string, item: string): number {
  const g = foodWords(ingredient);
  const i = foodWords(item);
  if (!g.length || !i.length) return 0;
  const gs = new Set(g);
  const is = new Set(i);
  const gInI = g.every((w) => is.has(w));
  const iInG = i.every((w) => gs.has(w));
  if (gInI && iInG) return 20;
  // The item is a kind of what the recipe asks for: "rice" ← "Jasmine rice", "milk" ← "Oat milk".
  if (gInI && (gs.has(i[i.length - 1]) || PROTEINS.has(g[g.length - 1]))) return 10 + g.length - (i.length - g.length);
  if (iInG && GENERIC.has(g[g.length - 1]) && g.length - i.length === 1) return 8;
  return 0;
}

// The kitchen item an ingredient refers to: its saved link first, otherwise the best name match
// (preferring something on hand, then whatever expires soonest).
export function matchItem(items: Item[], g: RecipeIngredient): Item | undefined {
  if (g.ref) {
    const it = items.find((i) => i.id === g.ref);
    if (it || !g.name) return it;
  }
  if (!g.name) return undefined;
  let best: Item | undefined;
  let bestKey = [0, 0, 0];
  for (const it of items) {
    if (it.leftover) continue;
    const score = nameScore(g.name, it.name);
    if (!score) continue;
    const key = [isOut(it) ? 0 : 1, score, -(it.expires ? Date.parse(it.expires) : Infinity)];
    if (!best || key[0] > bestKey[0] || (key[0] === bestKey[0] && (key[1] > bestKey[1] || (key[1] === bestKey[1] && key[2] > bestKey[2])))) {
      best = it;
      bestKey = key;
    }
  }
  return best;
}
