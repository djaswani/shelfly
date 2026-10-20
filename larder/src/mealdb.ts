// Free recipe ideas from TheMealDB (https://www.themealdb.com/api.php), searched by the kitchen's
// most urgent ingredients and ranked with the same "uses what expires soonest" rule as saved recipes.
import { Item, Persisted, Recipe } from './data/types';
import { plainFood, sentenceCase } from './ingredients';
import { isOut, itemDays } from './logic';
import { byExpiring, recipeView } from './recipes';

// Key "1" is TheMealDB's public development key. A public App Store release needs a supporter key
// (https://www.themealdb.com/api.php), which goes here.
const API = 'https://www.themealdb.com/api/json/v1/1';

const MAX_SEARCHES = 7;
const MAX_LOOKUPS = 8;
export const IDEAS_KEEP = 4;

export type Meal = Record<string, string | null | undefined>;

// What to search for: what expires soonest, then a couple of pantry staples.
export function searchTerms(items: Item[], rand = Math.random): { term: string; weight: number }[] {
  const food = items.filter((i) => !isOut(i) && !i.leftover && !['Drinks', 'Household'].includes(i.aisle ?? ''));
  const urgent = food.filter((i) => itemDays(i) != null).sort((a, b) => itemDays(a)! - itemDays(b)!).slice(0, 4);
  // Staples running low (coffee, the last of the cumin) aren't worth building a meal around.
  const staples = food.filter((i) => i.staple && !urgent.includes(i) && (i.count != null || i.level !== 'Low'))
    .map((i) => ({ i, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 2)
    .map((x) => x.i);
  const out: { term: string; weight: number }[] = [];
  for (const [list, weight] of [[urgent, 2], [staples, 1]] as const) {
    for (const it of list) {
      const term = plainFood(it.name) || it.name.toLowerCase();
      if (!out.some((o) => o.term === term)) out.push({ term, weight });
    }
  }
  return out;
}

export function mealToRecipe(m: Meal): Recipe {
  const ings = [];
  for (let k = 1; k <= 20; k++) {
    const name = (m[`strIngredient${k}`] ?? '').trim();
    if (!name) continue;
    const amt = (m[`strMeasure${k}`] ?? '').trim();
    const n = /^\d+(\.\d+)?$/.test(amt) ? Number(amt) : NaN;
    ings.push({ name: sentenceCase(name), amt, ...(n > 0 ? { use: n } : {}) });
  }
  const steps = (m.strInstructions ?? '')
    .split(/\r?\n/)
    .map((t) => t.replace(/^\s*(step\s*\d+[.):]?|\d+[.):])\s*/i, '').trim())
    .filter((t) => t && !/^step\s*\d*$/i.test(t));
  return {
    id: 'mdb' + m.idMeal,
    title: (m.strMeal ?? 'Recipe').trim(),
    time: 0,
    serves: 0,
    origin: 'idea',
    image: m.strMealThumb || undefined,
    source: { name: 'TheMealDB', url: `https://www.themealdb.com/meal/${m.idMeal}` },
    ings,
    steps,
  };
}

async function getMeals(path: string): Promise<Meal[]> {
  const res = await fetch(`${API}/${path}`);
  if (!res.ok) throw new Error(`TheMealDB returned ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.meals) ? json.meals : [];
}

const filterBy = (term: string) => getMeals(`filter.php?i=${encodeURIComponent(term.replace(/\s+/g, '_'))}`);

// A fresh batch of ideas for this kitchen, best first. Throws when TheMealDB can't be reached.
export async function fetchIdeas(s: Persisted, rand = Math.random): Promise<Recipe[]> {
  const terms = searchTerms(s.items, rand);
  if (!terms.length) return [];
  // "Yellow onions" isn't a TheMealDB ingredient but "onions" is: retry with the last word.
  let searches = 0;
  const lists = await Promise.all(terms.map(async ({ term, weight }) => {
    if (searches++ >= MAX_SEARCHES) return { meals: [] as Meal[], weight };
    try {
      let meals = await filterBy(term);
      const head = term.split(' ').at(-1)!;
      if (!meals.length && head !== term && searches++ < MAX_SEARCHES) meals = await filterBy(head);
      return { meals, weight };
    } catch {
      return null;
    }
  }));
  if (lists.every((l) => l === null)) throw new Error('TheMealDB unreachable');

  const saved = new Set(s.recipes.filter((r) => r.origin !== 'idea').map((r) => r.id));
  const current = new Set(s.recipes.filter((r) => r.origin === 'idea').map((r) => r.id));
  const score = new Map<string, number>();
  for (const l of lists) {
    for (const m of l?.meals ?? []) {
      const id = m.idMeal;
      if (!id || saved.has('mdb' + id)) continue;
      // Ideas already on screen only come back when nothing new matches as well.
      score.set(id, (score.get(id) ?? (current.has('mdb' + id) ? -0.5 : 0)) + l!.weight);
    }
  }
  // Most matched searches first; random among equals so a refresh brings something new.
  const picks = [...score.entries()]
    .map(([id, sc]) => ({ id, sc, k: rand() }))
    .sort((a, b) => b.sc - a.sc || a.k - b.k)
    .slice(0, MAX_LOOKUPS);
  const details = await Promise.all(picks.map((p) => getMeals(`lookup.php?i=${p.id}`).then((m) => m[0]).catch(() => undefined)));
  return details
    .filter((m): m is Meal => !!m)
    .map(mealToRecipe)
    .map((r) => recipeView(s, r))
    .sort(byExpiring)
    .slice(0, IDEAS_KEEP)
    .map((x) => x.r);
}

// Swap the previous ideas for new ones; ideas the user saved stay as saved recipes.
export function replaceIdeas(s: Persisted, ideas: Recipe[]): Persisted {
  return { ...s, recipes: [...s.recipes.filter((r) => r.origin !== 'idea'), ...ideas] };
}
