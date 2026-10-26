// Static content and demo data from design/Shelfly.dc.html.
import { isoIn, monthKey, weekKey } from '../dates';
import { Ev, Item, Persisted } from './types';

export const QUICK = [
  { title: 'Produce', aisle: 'Produce', items: ['Bananas', 'Apples', 'Avocados', 'Lemons', 'Tomatoes', 'Lettuce', 'Carrots', 'Bell peppers', 'Potatoes', 'Cucumbers'] },
  { title: 'Dairy & eggs', aisle: 'Dairy', items: ['Milk', 'Eggs', 'Butter', 'Yogurt', 'Cheese', 'Sour cream'] },
  { title: 'Meat & fish', aisle: 'Meat', items: ['Chicken breast', 'Ground beef', 'Salmon', 'Bacon', 'Deli turkey'] },
  { title: 'Bakery', aisle: 'Bakery', items: ['Bread', 'Tortillas', 'Bagels'] },
];

// Fridge shelf life in days. Placeholder until the USDA FoodKeeper dataset is wired in.
export const LIFE: Record<string, number> = {
  Bananas: 5, Apples: 30, Avocados: 4, Lemons: 21, Tomatoes: 5, Lettuce: 7, Carrots: 21, 'Bell peppers': 7, Potatoes: 30, Cucumbers: 7,
  Milk: 7, Eggs: 28, Butter: 60, Yogurt: 14, Cheese: 28, 'Sour cream': 14, 'Chicken breast': 2, 'Ground beef': 2, Salmon: 2, Bacon: 7,
  'Deli turkey': 5, Bread: 5, Tortillas: 14, Bagels: 5, 'Baby spinach': 5, 'Oat milk': 10,
};

export const AISLE_ORDER = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Pantry', 'Frozen', 'Drinks', 'Household', 'Other'];

type SeedItem = Omit<Item, 'expires' | 'src' | 'conf' | 'opened' | 'count' | 'level' | 'made' | 'checkedAt'> & {
  days: number | null; level?: Item['level']; count?: number; src?: Item['src']; conf?: number; opened?: boolean; madeAgo?: number; checked?: number;
};

function I(o: SeedItem): Item {
  const { days, madeAgo, checked, ...rest } = o;
  return {
    count: null, level: 'Full', opened: false, src: 'FoodKeeper', conf: 0.9, ...rest,
    expires: days == null ? null : isoIn(days),
    made: madeAgo == null ? undefined : isoIn(-madeAgo),
    checkedAt: isoIn(-(checked ?? 7)),
    confAt: isoIn(0), // demo confidence values start today and decay from here
  };
}

export function demoItems(): Item[] {
  return [
    I({ id: 'spinach', name: 'Baby spinach', short: 'spinach', loc: 'fridge', level: 'Some', days: 2, aisle: 'Produce' }),
    I({ id: 'chicken', name: 'Chicken thighs', short: 'chicken', loc: 'fridge', count: 4, unit: 'thighs', days: 1, src: 'Label', aisle: 'Meat' }),
    I({ id: 'cream', name: 'Heavy cream', short: 'cream', loc: 'fridge', level: 'Some', days: 3, opened: true, aisle: 'Dairy' }),
    I({ id: 'berries', name: 'Strawberries', loc: 'fridge', level: 'Some', days: 1, conf: 0.7, aisle: 'Produce' }),
    I({ id: 'chili', name: 'Turkey chili', short: 'chili', loc: 'fridge', level: 'Some', days: 2, leftover: true, madeAgo: 3 }),
    I({ id: 'cilantro', name: 'Cilantro', loc: 'fridge', level: 'Low', days: 3, conf: 0.4, checked: 6, aisle: 'Produce' }),
    I({ id: 'milk', name: 'Milk', loc: 'fridge', level: 'Low', days: 4, opened: true, src: 'Label', conf: 0.35, checked: 5, aisle: 'Dairy' }),
    I({ id: 'yogurt', name: 'Greek yogurt', loc: 'fridge', level: 'Full', days: 9, src: 'Label', conf: 0.45, every: 7, aisle: 'Dairy' }),
    I({ id: 'salsa', name: 'Salsa', loc: 'fridge', level: 'Low', days: 5, opened: true, conf: 0.3, checked: 12, aisle: 'Pantry' }),
    I({ id: 'eggs', name: 'Eggs', loc: 'fridge', count: 7, unit: 'eggs', days: 19, src: 'Label', conf: 0.6, aisle: 'Dairy' }),
    I({ id: 'cheddar', name: 'Cheddar', loc: 'fridge', level: 'Some', days: 18, opened: true, conf: 0.45, checked: 9, aisle: 'Dairy' }),
    I({ id: 'butter', name: 'Butter', loc: 'fridge', level: 'Out', days: null, staple: true, aisle: 'Dairy' }),
    I({ id: 'peas', name: 'Frozen peas', loc: 'freezer', level: 'Some', days: 240, conf: 0.6, aisle: 'Frozen' }),
    I({ id: 'beef', name: 'Ground beef', loc: 'freezer', count: 2, unit: 'lb', days: 92, aisle: 'Meat' }),
    I({ id: 'lasagna', name: 'Lasagna', loc: 'freezer', level: 'Some', days: 58, leftover: true, madeAgo: 16 }),
    I({ id: 'icecream', name: 'Ice cream', loc: 'freezer', level: 'Low', days: 40, conf: 0.3, checked: 21, aisle: 'Frozen' }),
    I({ id: 'bread', name: 'Sourdough', loc: 'pantry', level: 'Some', days: 3, conf: 0.6, aisle: 'Bakery' }),
    I({ id: 'onions', name: 'Yellow onions', loc: 'pantry', count: 3, unit: 'onions', days: 16, aisle: 'Produce' }),
    I({ id: 'garlic', name: 'Garlic', loc: 'pantry', level: 'Low', days: null, staple: true, conf: 0.4, checked: 14, aisle: 'Produce' }),
    I({ id: 'rice', name: 'Jasmine rice', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' }),
    I({ id: 'beans', name: 'Black beans', loc: 'pantry', count: 4, unit: 'cans', days: null, staple: true, aisle: 'Pantry' }),
    I({ id: 'pasta', name: 'Penne', loc: 'pantry', count: 2, unit: 'boxes', days: null, staple: true, aisle: 'Pantry' }),
    I({ id: 'oil', name: 'Olive oil', loc: 'pantry', level: 'Some', days: null, staple: true, aisle: 'Pantry' }),
    I({ id: 'coffee', name: 'Coffee', loc: 'pantry', level: 'Low', days: null, staple: true, aisle: 'Pantry' }),
    I({ id: 'flour', name: 'Flour', loc: 'pantry', level: 'Low', days: null, staple: true, conf: 0.55, aisle: 'Pantry' }),
    I({ id: 'cumin', name: 'Cumin', loc: 'pantry', level: 'Low', days: null, staple: true, conf: 0.25, checked: 30, aisle: 'Pantry' }),
    I({ id: 'water', name: 'Sparkling water', loc: 'garage', count: 12, unit: 'cans', days: null, staple: true, aisle: 'Drinks' }),
    I({ id: 'tomatoes', name: 'Crushed tomatoes', loc: 'garage', count: 6, unit: 'cans', days: null, staple: true, aisle: 'Pantry' }),
  ];
}

export function demoState(): Persisted {
  return {
    version: 1,
    items: demoItems(),
    list: [
      { id: 'l1', name: 'Bananas', qty: '1 bunch', aisle: 'Produce' }, { id: 'l2', name: 'Lemons', qty: '3', aisle: 'Produce' },
      { id: 'l3', name: 'Milk', qty: '1 gallon', aisle: 'Dairy' }, { id: 'l4', name: 'Butter', aisle: 'Dairy' },
      { id: 'l5', name: 'Tortillas', aisle: 'Bakery' }, { id: 'l6', name: 'Coffee', aisle: 'Pantry' }, { id: 'l7', name: 'Paper towels', aisle: 'Household' },
    ],
    locs: [{ id: 'fridge', name: 'Fridge' }, { id: 'freezer', name: 'Freezer' }, { id: 'pantry', name: 'Pantry' }, { id: 'garage', name: 'Garage shelf' }],
    saved: {},
    stats: { used: 34, tossed: 3, cooked: 9 },
    members: [{ n: 'Dhairya', i: 'DJ', role: 'You' }],
    digest: true,
    digestTime: 8 * 60,
    events: demoEvents(),
    // Bought weekly, so it shows under "Probably running out" on the List tab.
    buys: { 'greek yogurt': [isoIn(-21), isoIn(-14), isoIn(-7)] },
    plus: false,
    receiptLeft: 4,
    receiptMonth: monthKey(),
    ideasLeft: 4,
    ideasWeek: weekKey(),
    recipes: [],
  };
}

// A believable month so far for the recap: a few items used most days, the odd toss and dinner.
function demoEvents(): Ev[] {
  const names = ['Milk', 'Eggs', 'Spinach', 'Bananas', 'Yogurt', 'Bread', 'Chicken thighs', 'Cheddar', 'Apples', 'Carrots'];
  const today = Number(isoIn(0).slice(8, 10));
  const out: Ev[] = [];
  for (let d = 1; d < today; d++) {
    const at = isoIn(d - today);
    for (let k = 0; k < 1 + (d % 3); k++) out.push({ kind: 'used', name: names[(d * 3 + k) % names.length], at });
    if (d % 6 === 0) out.push({ kind: 'cooked', name: 'Dinner', at });
    if (d % 9 === 4) out.push({ kind: 'tossed', name: ['Cilantro', 'Sour cream', 'Sourdough'][Math.floor(d / 9) % 3], at });
  }
  return out;
}
