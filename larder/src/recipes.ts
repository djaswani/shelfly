import { Item, Persisted, Recipe, RecipeIngredient } from './data/types';
import { matchItem } from './ingredients';
import { isOut, itemDays, joinNames } from './logic';

export type RecipeView = {
  r: Recipe;
  ings: { g: RecipeIngredient; it?: Item; have: boolean }[];
  exp: { g: RecipeIngredient; it?: Item; have: boolean }[]; // ingredients on hand that expire within 3 days
  haveN: number;
};

export function recipeView(s: Persisted, r: Recipe): RecipeView {
  const ings = r.ings.map((g) => {
    const it = matchItem(s.items, g);
    return { g, it, have: !!it && !isOut(it) };
  });
  // Two lines can name the same item ("1 onion", "onion, sliced"); count it once.
  const exp = ings.filter((x, i) => x.have && x.it && itemDays(x.it) != null && itemDays(x.it)! <= 3
    && ings.findIndex((y) => y.it === x.it) === i);
  return { r, ings, exp, haveN: ings.filter((x) => x.have).length };
}

export const isIdea = (r: Recipe) => r.origin === 'idea';

export function visibleRecipes(s: Persisted): RecipeView[] {
  return s.recipes.map((r) => recipeView(s, r));
}

// Rank by "uses what expires soonest", then by how much of it is on hand.
export const byExpiring = (a: RecipeView, b: RecipeView) =>
  b.exp.length - a.exp.length || b.haveN / (b.ings.length || 1) - a.haveN / (a.ings.length || 1);

// Unknown times (0) sort last.
export const byTime = (a: RecipeView, b: RecipeView) => (a.r.time || 1e4) - (b.r.time || 1e4);

export function metaText(r: Recipe) {
  return [r.time ? `${r.time} min` : '', r.serves ? `Serves ${r.serves}` : ''].filter(Boolean).join(' · ');
}

export function cardText(x: RecipeView) {
  return {
    meta: [x.r.time ? `${x.r.time} min` : '', `Have ${x.haveN} of ${x.ings.length}`].filter(Boolean).join(' · '),
    expText: x.exp.length ? 'Uses ' + joinNames(x.exp.map((e) => e.it!.short || e.it!.name.toLowerCase())) : '',
  };
}

export const findRecipe = (s: Persisted, id: string) => s.recipes.find((r) => r.id === id);
