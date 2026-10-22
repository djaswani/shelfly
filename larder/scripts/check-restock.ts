// Self-check for repeat-purchase inference and restock cadence: `npx tsx scripts/check-restock.ts`.
import { isoIn } from '../src/dates';
import { demoState } from '../src/data/seed';
import { Item, Persisted } from '../src/data/types';
import { addToList, buy, cadence, confidence, everyText, mk, PROBABLY, recordBuy, restockDue, tau } from '../src/logic';

let failed = 0;
function eq(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`);
}

const today = isoIn(0);
const base: Persisted = { ...demoState(), items: [], list: [], events: [], buys: {}, stats: { used: 0, tossed: 0, cooked: 0 } };
const withItem = (patch: Partial<Item>, extra?: Partial<Persisted>): Persisted => ({ ...base, items: [{ ...mk('Milk', 'fridge'), id: 'm', ...patch }], ...extra });
const used = (s: Persisted) => (s.events ?? []).filter((e) => e.kind === 'used').map((e) => e.name);
const milk = (s: Persisted) => s.items.find((i) => i.name === 'Milk' && i.loc === 'fridge')!;

// ── Purchase log ─────────────────────────────────────────────
eq('first buy recorded', recordBuy({}, 'Milk'), { milk: [today] });
eq('same day counts once', recordBuy({ milk: [today] }, 'milk'), { milk: [today] });
eq('capped at 12 per food', recordBuy({ milk: Array.from({ length: 12 }, (_, i) => isoIn(-30 + i)) }, 'Milk').milk.length, 12);
const many = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`f${i}`, [isoIn(-400 + i)]]));
const capped = recordBuy(many, 'Milk');
eq('capped at 300 foods, oldest forgotten', [Object.keys(capped).length, 'f0' in capped, 'f1' in capped, 'milk' in capped], [300, false, true, true]);

// ── Cadence ──────────────────────────────────────────────────
eq('needs two purchases', [cadence(undefined), cadence([today])], [null, null]);
eq('one gap', cadence([isoIn(-6), today]), 6);
eq('median of odd gaps', cadence([isoIn(-30), isoIn(-23), isoIn(-16), today]), 7);
eq('median of even gaps', cadence([isoIn(-20), isoIn(-16), isoIn(-10), isoIn(-6), today]), 5);
eq('cadence text', [1, 5, 14, 30, 90].map(everyText), ['about a day', 'about 5 days', 'about 2 weeks', 'about 4 weeks', 'about 3 months']);

// ── Repeat purchase → used ───────────────────────────────────
eq('topping up a Low row logs used', used(buy(withItem({ level: 'Low' }), 'milk', 'fridge')), ['Milk']);
eq('…and counts in stats', buy(withItem({ level: 'Low' }), 'Milk', 'fridge').stats.used, 1);
eq('a doubtful row counts too', used(buy(withItem({ conf: 1, confAt: isoIn(-20), checkedAt: isoIn(-20) }), 'Milk', 'fridge')), ['Milk']);
eq('a fresh Full row does not', used(buy(withItem({}), 'Milk', 'fridge')), []);
eq('a row the user marked Out is not counted twice', used(buy(withItem({ level: 'Out' }), 'Milk', 'fridge')), []);
eq('counted Out (0 left) is not counted either', used(buy(withItem({ count: 0, unit: 'cartons' }), 'Milk', 'fridge')), []);
eq('a different place is a new row, not a use', used(buy(withItem({ level: 'Low' }), 'Milk', 'freezer')), []);
eq('leftovers are never topped up', used(buy(withItem({ level: 'Low', leftover: true }), 'Milk', 'fridge')), []);
eq('a brand-new food logs nothing', used(buy(base, 'Milk', 'fridge')), []);
const topped = buy(withItem({ level: 'Low' }), 'Milk', 'fridge');
eq('row is full and confirmed again', [milk(topped).level, milk(topped).conf], ['Full', 1]);

// ── Learned τ ────────────────────────────────────────────────
eq('no cadence after one purchase', milk(buy(base, 'Milk', 'fridge')).every, undefined);
const learned = buy(withItem({}, { buys: { milk: [isoIn(-16), isoIn(-8)] } }), 'Milk', 'fridge');
eq('median gap stored after more buys', [milk(learned).every, learned.buys?.milk.length], [8, 3]);
eq('τ uses the cadence', tau(milk(learned)), 8);
eq('τ clamps short cadences to 4', tau({ ...milk(learned), every: 1 }), 4);
eq('τ clamps long cadences to 30', tau({ ...milk(learned), every: 90 }), 30);
eq('staples without a date learn too', tau({ ...milk(learned), expires: null, every: 12 }), 12);
eq('without a cadence τ is unchanged', tau({ ...milk(learned), every: undefined, expires: null }), 30);
eq('a new row of a known food gets the cadence', milk(buy({ ...base, buys: { milk: [isoIn(-10)] } }, 'Milk', 'fridge')).every, 10);

// ── Restock suggestions ──────────────────────────────────────
const stale: Partial<Item> = { every: 7, conf: 1, confAt: isoIn(-7), checkedAt: isoIn(-7) };
const two = { buys: { milk: [isoIn(-14), isoIn(-7)] } };
eq('stale and learned is due', restockDue(withItem(stale, two)).map((i) => i.name), ['Milk']);
eq('confidence is below PROBABLY there', confidence(withItem(stale, two).items[0]) < PROBABLY, true);
eq('fresh is not due', restockDue(withItem({ ...stale, confAt: isoIn(-2), checkedAt: isoIn(-2) }, two)), []);
eq('one purchase is not enough', restockDue(withItem(stale, { buys: { milk: [isoIn(-7)] } })), []);
eq('no cadence, not due', restockDue(withItem({ ...stale, every: undefined }, two)), []);
eq('already on the list, not due', restockDue(addToList(withItem(stale, two), 'milk')), []);
eq('Low rows stay in "Running low" instead', restockDue(withItem({ ...stale, level: 'Low' }, two)), []);
eq('buying it clears it', restockDue(buy(withItem(stale, two), 'Milk', 'fridge')), []);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
