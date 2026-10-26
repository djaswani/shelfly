// Showcase kitchen for demo recordings: a stocked kitchen, saved recipes with photos, a month of
// history, full allowances. Usage: ./scripts/load-showcase.sh (writes it into the simulator app).
// args: <current state json> <output json>
// Node's fs, typed locally (the app's tsconfig has no Node types).
const { readFileSync, writeFileSync } = require('fs') as { readFileSync: (p: string, enc: string) => string; writeFileSync: (p: string, data: string) => void };
import { isoIn, monthKey, weekKey } from '../src/dates';
import * as L from '../src/logic';
import { fetchIdeas, mealToRecipe } from '../src/mealdb';
import { recipeView } from '../src/recipes';

const cur = JSON.parse(readFileSync(process.argv[2], 'utf8'));

type Spec = { name: string; loc: string; days?: number | null; level?: string; count?: number; unit?: string; opened?: boolean;
  staple?: boolean; aisle?: string; checked?: number; leftover?: boolean; madeAgo?: number; short?: string; src?: string };

const S: Spec[] = [
  // Fridge: produce and protein that need using now
  { name: 'Chicken breast', loc: 'fridge', count: 2, unit: 'breasts', days: 1, aisle: 'Meat', short: 'chicken' },
  { name: 'Salmon', loc: 'fridge', count: 2, unit: 'fillets', days: 1, aisle: 'Meat' },
  { name: 'Baby spinach', loc: 'fridge', level: 'Some', days: 0, opened: true, aisle: 'Produce', short: 'spinach' },
  { name: 'Coriander', loc: 'fridge', level: 'Low', days: 0, aisle: 'Produce' },
  { name: 'Cherry tomatoes', loc: 'fridge', level: 'Some', days: 2, aisle: 'Produce' },
  { name: 'Avocado', loc: 'fridge', count: 2, unit: '', days: 2, aisle: 'Produce' },
  { name: 'Raspberries', loc: 'fridge', level: 'Full', days: 1, aisle: 'Produce' },
  { name: 'Blueberries', loc: 'fridge', level: 'Some', days: 3, aisle: 'Produce' },
  { name: 'Mint', loc: 'fridge', level: 'Some', days: 2, aisle: 'Produce' },
  { name: 'Parsley', loc: 'fridge', level: 'Some', days: 3, aisle: 'Produce' },
  { name: 'Red pepper', loc: 'fridge', count: 2, unit: '', days: 5, aisle: 'Produce' },
  { name: 'Cucumber', loc: 'fridge', count: 1, unit: '', days: 4, aisle: 'Produce' },
  { name: 'Lime', loc: 'fridge', count: 3, unit: '', days: 12, aisle: 'Produce' },
  { name: 'Red chilli', loc: 'fridge', count: 2, unit: '', days: 6, aisle: 'Produce' },
  { name: 'Eggs', loc: 'fridge', count: 9, unit: 'eggs', days: 21, aisle: 'Dairy' },
  { name: 'Milk', loc: 'fridge', level: 'Some', days: 4, opened: true, aisle: 'Dairy', checked: 9 },
  { name: 'Heavy cream', loc: 'fridge', level: 'Low', days: 3, opened: true, aisle: 'Dairy', short: 'cream' },
  { name: 'Cheddar cheese', loc: 'fridge', level: 'Some', days: 20, aisle: 'Dairy', short: 'cheddar' },
  { name: 'Feta', loc: 'fridge', level: 'Full', days: 6, aisle: 'Dairy' },
  { name: 'Parmesan', loc: 'fridge', level: 'Some', days: 45, aisle: 'Dairy' },
  { name: 'Greek yogurt', loc: 'fridge', count: 2, unit: 'cups', days: 8, aisle: 'Dairy', checked: 6 },
  { name: 'Butter', loc: 'fridge', level: 'Some', days: 40, aisle: 'Dairy', checked: 12 },
  { name: 'Turkey chili', loc: 'fridge', level: 'Some', days: 2, leftover: true, madeAgo: 2, aisle: 'Other', short: 'chili' },
  { name: 'Veggie fried rice', loc: 'fridge', level: 'Some', days: 3, leftover: true, madeAgo: 1, aisle: 'Other' },
  // Freezer
  { name: 'Ground beef', loc: 'freezer', count: 2, unit: 'lb', days: 95, aisle: 'Meat' },
  { name: 'Frozen peas', loc: 'freezer', level: 'Some', days: 200, aisle: 'Frozen' },
  { name: 'Prawns', loc: 'freezer', level: 'Full', days: 120, aisle: 'Frozen' },
  { name: 'Vanilla ice cream', loc: 'freezer', level: 'Some', days: 60, aisle: 'Frozen', checked: 25 },
  // Pantry: staples, loosely tracked
  { name: 'Bananas', loc: 'pantry', count: 4, unit: '', days: 1, aisle: 'Produce' },
  { name: 'Red onions', loc: 'pantry', count: 3, unit: '', days: 28, aisle: 'Produce' },
  { name: 'Garlic', loc: 'pantry', level: 'Some', days: 50, aisle: 'Produce', staple: true },
  { name: 'Olive oil', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Penne rigate', loc: 'pantry', level: 'Full', days: null, staple: true, aisle: 'Pantry', short: 'penne' },
  { name: 'Macaroni', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Chopped tomatoes', loc: 'pantry', count: 3, unit: 'cans', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Chicken stock', loc: 'pantry', count: 2, unit: 'cartons', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Flour', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Sugar', loc: 'pantry', level: 'Full', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Honey', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Soy sauce', loc: 'pantry', level: 'Low', days: null, staple: true, aisle: 'Pantry', checked: 40 },
  { name: 'Red chilli flakes', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Fajita seasoning', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Italian seasoning', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Baking powder', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry', checked: 45 },
  { name: 'Vanilla extract', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Sunflower oil', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Basmati rice', loc: 'pantry', level: 'Full', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Salt', loc: 'pantry', level: 'Full', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Caster sugar', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' },
  { name: 'Pecan nuts', loc: 'pantry', level: 'Some', days: 90, aisle: 'Pantry' },
  { name: 'Maple syrup', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry', checked: 48 },
  { name: 'Dijon mustard', loc: 'fridge', level: 'Some', days: 120, aisle: 'Pantry', checked: 55 },
  { name: 'Basil', loc: 'fridge', level: 'Some', days: 4, aisle: 'Produce' },
  { name: 'Coffee', loc: 'pantry', level: 'Out', days: null, staple: true, aisle: 'Pantry' },
];

let n = 0;
const items = S.map((o) => {
  // Fresh food was bought or checked a day or two ago; staples a little longer.
  const checked = o.checked ?? (o.days != null && o.days <= 7 ? (n % 2) : 3);
  return {
    id: 'sc' + (n++).toString(36) + o.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 6),
    name: o.name, short: o.short, loc: o.loc, aisle: o.aisle,
    level: (o.level ?? 'Full'), count: o.count ?? null, unit: o.unit,
    expires: o.days == null ? null : isoIn(o.days),
    src: o.src ?? 'FoodKeeper', conf: 1, opened: !!o.opened,
    staple: o.staple, leftover: o.leftover, made: o.madeAgo != null ? isoIn(-o.madeAgo) : undefined,
    checkedAt: isoIn(-checked), confAt: isoIn(-checked),
  };
});
// Keep whatever was already in the kitchen (synced from the household).
for (const it of cur.items ?? []) if (!items.some((x: any) => x.name.toLowerCase() === it.name.toLowerCase())) items.push(it);

// Purchase history: weekly yogurt and milk, fortnightly eggs → cadence + "Probably running out".
const buys: Record<string, string[]> = {
  'greek yogurt': [isoIn(-27), isoIn(-20), isoIn(-13), isoIn(-6)],
  milk: [isoIn(-23), isoIn(-16), isoIn(-9)],
  eggs: [isoIn(-31), isoIn(-17), isoIn(-3)],
  bananas: [isoIn(-15), isoIn(-8), isoIn(-1)],
};
const every: Record<string, number> = { 'greek yogurt': 7, milk: 7, eggs: 14, bananas: 7 };
for (const it of items as any[]) { const e = every[it.name.toLowerCase()]; if (e) it.every = e; }

// This month so far: used most days, a few tosses, dinners cooked.
const today = Number(isoIn(0).slice(8, 10));
const usedNames = ['Milk', 'Eggs', 'Baby spinach', 'Bananas', 'Greek yogurt', 'Bread', 'Chicken thighs', 'Cheddar cheese', 'Apples', 'Carrots', 'Strawberries', 'Salmon', 'Avocado', 'Tortillas', 'Lettuce'];
const events: any[] = [];
for (let d = 1; d < today; d++) {
  const at = isoIn(d - today);
  for (let k = 0; k < 2 + (d % 3); k++) events.push({ kind: 'used', name: usedNames[(d * 5 + k) % usedNames.length], at });
  if (d % 3 === 0) events.push({ kind: 'cooked', name: 'Dinner', at });
}
[[4, 'Cilantro'], [11, 'Sour cream'], [19, 'Half a sourdough loaf']].forEach(([d, name]) => events.push({ kind: 'tossed', name, at: isoIn((d as number) - today) }));
// Last month too, for history beyond October.
for (let d = 1; d <= 28; d++) events.unshift({ kind: 'used', name: usedNames[d % usedNames.length], at: isoIn(-today - 30 + d) });

const list = [
  { id: 'scl1', name: 'Coffee', aisle: 'Pantry' },
  { id: 'scl2', name: 'Lemons', qty: '3', aisle: 'Produce' },
  { id: 'scl3', name: 'Tortillas', aisle: 'Bakery' },
  { id: 'scl4', name: 'Sourdough bread', aisle: 'Bakery' },
  { id: 'scl5', name: 'Paper towels', aisle: 'Household' },
  { id: 'scl6', name: 'Sparkling water', qty: '12 pack', aisle: 'Drinks', checked: true },
];

const SAVED = ['52963', '52960', '52818', '52854', '52855', '52771'];

(async () => {
  const meals = await Promise.all(SAVED.map((id) => fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`).then((r) => r.json()).then((j) => j.meals[0])));
  const times: Record<string, [number, number]> = { '52963': [30, 2], '52960': [20, 2], '52818': [35, 4], '52854': [20, 4], '52855': [15, 2], '52771': [25, 2] };
  const saved = meals.map((m: any) => ({ ...mealToRecipe(m), origin: 'saved', time: times[m.idMeal][0], serves: times[m.idMeal][1] }));

  const s: any = {
    ...cur, version: 1, onboarded: true, items, list, buys, events,
    locs: [{ id: 'fridge', name: 'Fridge' }, { id: 'freezer', name: 'Freezer' }, { id: 'pantry', name: 'Pantry' }],
    stats: { used: events.filter((e) => e.kind === 'used').length, tossed: 3, cooked: events.filter((e) => e.kind === 'cooked').length },
    receiptLeft: 5, receiptMonth: monthKey(), ideasLeft: 5, ideasWeek: weekKey(), plus: false,
    digest: true, digestTime: 8 * 60, people: 3,
    members: [{ n: 'You', i: '', role: 'You' }],
    recipes: saved, saved: Object.fromEntries(saved.map((r: any) => [r.id, true])),
  };
  const ideas = await fetchIdeas(s, () => 0.37);
  s.recipes = [...saved, ...ideas.filter((i: any) => !SAVED.includes(i.id.slice(3)))];

  // Report
  for (const r of s.recipes) { const v = recipeView(s, r); console.log(`${r.origin === 'idea' ? 'idea ' : 'saved'} ${v.haveN}/${r.ings.length} exp:${v.exp.map((e: any) => e.it.name).join(',')} | ${r.title} | missing: ${v.ings.filter((x: any) => !x.have).map((x: any) => x.g.name).join(', ')}`); }
  const prob = s.items.filter((i: any) => L.confidence(i) < L.PROBABLY).map((i: any) => `${i.name}(${L.confidence(i).toFixed(2)})`);
  console.log('probably:', prob.join(' '));
  console.log('quick check:', s.items.filter(L.needsSweep).map((i: any) => i.name).join(', '));
  console.log('restock due:', L.restockDue(s).map((i: any) => i.name).join(', '));
  console.log('month recap:', JSON.stringify(L.monthRecap(s)).slice(0, 200));
  writeFileSync(process.argv[3], JSON.stringify(s));
})();
