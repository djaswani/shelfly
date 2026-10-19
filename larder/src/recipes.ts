import { RECIPES } from './data/seed';
import { Item, Persisted, Recipe, RecipeIngredient } from './data/types';
import { isOut, itemDays, joinNames } from './logic';

export type RecipeView = {
  r: Recipe;
  ings: { g: RecipeIngredient; it?: Item; have: boolean }[];
  exp: { g: RecipeIngredient; it?: Item; have: boolean }[]; // ingredients on hand that expire within 3 days
  haveN: number;
};

export function recipeView(s: Persisted, r: Recipe): RecipeView {
  const ings = r.ings.map((g) => {
    const it = g.ref ? s.items.find((i) => i.id === g.ref) : undefined;
    return { g, it, have: !!it && !isOut(it) };
  });
  const exp = ings.filter((x) => x.have && x.it && itemDays(x.it) != null && itemDays(x.it)! <= 3);
  return { r, ings, exp, haveN: ings.filter((x) => x.have).length };
}

// Recipes visible right now: saved ones plus any generated ideas that have been revealed.
export function visibleRecipes(s: Persisted): RecipeView[] {
  return RECIPES.filter((r) => !r.idea || (r.batch ?? 0) <= s.genShown).map((r) => recipeView(s, r));
}

// Rank by "uses what expires soonest", then by how much of it is on hand.
export const byExpiring = (a: RecipeView, b: RecipeView) =>
  b.exp.length - a.exp.length || b.haveN / b.ings.length - a.haveN / a.ings.length;

export function cardText(x: RecipeView) {
  return {
    meta: `${x.r.time} min · Have ${x.haveN} of ${x.ings.length}`,
    expText: x.exp.length ? 'Uses ' + joinNames(x.exp.map((e) => e.it!.short || e.it!.name.toLowerCase())) : '',
  };
}

export const findRecipe = (id: string) => RECIPES.find((r) => r.id === id);
