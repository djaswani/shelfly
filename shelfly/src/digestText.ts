// Daily digest wording, kept free of native imports so it can be tested.
import { Item, Recipe } from './data/types';
import { isOut, itemDays, joinNames } from './logic';
import { matchItem } from './ingredients';

// What to say on the morning `offset` days from today, or null when nothing needs using.
// Covers food going off that day or the next, soonest first, and names a recipe that uses
// some of it when one is mostly in the kitchen already.
export function digestFor(items: Item[], offset: number, recipes: Recipe[] = []): { title: string; body: string } | null {
  const soon = items
    .filter((it) => !isOut(it) && it.expires)
    .map((it) => ({ it, d: (itemDays(it) ?? 99) - offset }))
    .filter((x) => x.d >= 0 && x.d <= 1)
    .sort((a, b) => a.d - b.d);
  if (!soon.length) return null;
  const name = (it: Item) => (it.short || it.name).toLowerCase();
  const when = (d: number) => (d === 0 ? 'today' : 'tomorrow');

  const dish = bestRecipe(items, soon.map((x) => x.it), recipes);
  if (dish) {
    const used = dish.uses.slice(0, 2).map(name);
    const rest = soon.length - dish.uses.length;
    return {
      title: `Use the ${joinNames(used)} ${when(Math.min(...soon.filter((x) => dish.uses.includes(x.it)).map((x) => x.d)))}`,
      body: `${dish.r.title} uses ${dish.uses.length > 1 ? 'both' : 'it'}${dish.r.time ? `. ${dish.r.time} min` : ''}.` + (rest > 0 ? ` ${rest} more thing${rest > 1 ? 's' : ''} to use soon.` : ''),
    };
  }
  const shown = soon.slice(0, 3).map((x) => `${name(x.it)} (${when(x.d)})`);
  const more = soon.length - shown.length;
  const title = soon.length === 1 ? `Use your ${name(soon[0].it)} soon` : `${soon.length} things to use soon`;
  return { title, body: capital(joinNames(more ? [...shown, `${more} more`] : shown)) + '.' };
}

// The recipe that uses the most of the soon-to-turn food, among those with at least half
// their ingredients on hand. Ties go to the quicker recipe.
function bestRecipe(items: Item[], soon: Item[], recipes: Recipe[]) {
  let best: { r: Recipe; uses: Item[] } | null = null;
  for (const r of recipes) {
    const matched = r.ings.map((g) => matchItem(items, g)).filter((it): it is Item => !!it && !isOut(it));
    if (!r.ings.length || matched.length < r.ings.length / 2) continue;
    const uses = soon.filter((it) => matched.includes(it));
    if (!uses.length) continue;
    if (!best || uses.length > best.uses.length || (uses.length === best.uses.length && (r.time || 999) < (best.r.time || 999))) best = { r, uses };
  }
  return best;
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
