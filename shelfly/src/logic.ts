// Pure inventory logic ported from design/Shelfly.dc.html. Every function takes and returns plain data.
import { daysFromToday, isoIn, monthKey } from './dates';
import { LIFE, QUICK } from './data/seed';
import { Buys, EventKind, ExpirySource, Item, Level, LEVELS, ListRow, Persisted } from './data/types';
import { openedLifeDays, shelfLifeDays } from './foodkeeper';
import { C } from './theme';

let n = 0;
export const uid = (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

export const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const itemDays = (it: Item) => daysFromToday(it.expires);
export const isOut = (it: Item) => (it.count != null ? it.count === 0 : it.level === 'Out');

export function dayText(d: number | null): string {
  if (d == null) return '';
  if (d <= 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < 14) return d + ' days';
  if (d < 60) return Math.round(d / 7) + ' wks';
  return Math.round(d / 30) + ' mo';
}

export function dayColor(d: number | null): string {
  if (d == null) return C.muted;
  if (d <= 1) return C.warn;
  if (d <= 3) return C.ink;
  return C.muted;
}

export const expIn = (d: number) => (d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : 'In ' + d + ' days');

export function levelText(it: Item): string {
  if (it.count != null) return it.count + ' ' + (it.unit ?? '');
  return confidence(it) < PROBABLY ? 'Probably ' + it.level.toLowerCase() : it.level;
}

export function locName(s: Persisted, id: string) {
  return s.locs.find((l) => l.id === id)?.name ?? id;
}

export function aisleOf(name: string) {
  return QUICK.find((q) => q.items.includes(name))?.aisle ?? 'Other';
}

export function joinNames(a: string[]) {
  if (a.length < 2) return a.join('');
  return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
}

// Default "good until" for a new item: USDA FoodKeeper when it knows the food and location,
// otherwise a rough typical value (LIFE is fridge-oriented; freezer defaults to 4 months).
export function estimate(name: string, loc: string): { days: number; src: ExpirySource } {
  const fk = shelfLifeDays(name, loc);
  if (fk != null) return { days: fk, src: 'FoodKeeper' };
  return { days: loc === 'freezer' ? 120 : (LIFE[name] ?? 7), src: 'Estimate' };
}

export const defDays = (name: string, loc: string) => estimate(name, loc).days;

// Days left once opened: FoodKeeper's "after opening" figure, else 5, never longer than before.
export function openedDays(it: Item): number {
  const left = itemDays(it) ?? 5;
  return Math.min(left, openedLifeDays(it.name, it.loc) ?? 5);
}

export const locForAisle = (a: string) =>
  a === 'Frozen' ? 'freezer' : ['Pantry', 'Bakery', 'Drinks', 'Other'].includes(a) ? 'pantry' : 'fridge';

export function nextLevel(l: Level): Level {
  return LEVELS[Math.min(3, LEVELS.indexOf(l) + 1)];
}

export function daysSince(iso?: string) {
  const d = daysFromToday(iso);
  return d == null ? 7 : -d;
}

// ── Confidence (build plan: c(t) = e^(-t/τ)) ─────────────────
// Below PROBABLY an item reads "Probably low"; below SWEEP it is queued for the Sunday sweep.
export const PROBABLY = 0.5;
export const SWEEP = 0.3;
export const SWEEP_MAX = 15;

// τ: how long this food typically lasts here. Once purchase history gives a cadence (`every`,
// see buy()) that wins; until then shelf life stands in, and staples without a date drift slowly.
export function tau(it: Item): number {
  if (it.every != null) return Math.min(30, Math.max(4, it.every));
  if (it.expires == null) return 30;
  return Math.min(30, Math.max(4, defDays(it.name, it.loc)));
}

export function confidence(it: Item): number {
  return it.conf * Math.exp(-daysSince(it.confAt ?? it.checkedAt) / tau(it));
}

// Fields to set whenever the user confirms an item's state.
export function confirmed() {
  const today = isoIn(0);
  return { conf: 1, checkedAt: today, confAt: today };
}

export function mk(name: string, loc: string, extra?: Partial<Item>): Item {
  const est = estimate(name, loc);
  return {
    id: uid('i'), name, loc, level: 'Full', count: null, expires: isoIn(est.days),
    src: est.src, opened: false, aisle: aisleOf(name), ...confirmed(), ...(extra || {}),
  };
}

// Add a purchase to the inventory, topping up an existing row of the same food in the same place
// (fresh beef in the fridge and frozen beef in the freezer stay separate).
export function merge(items: Item[], name: string, loc: string, qty?: number, days?: number | null): Item[] {
  const out = items.slice();
  const est = estimate(name, loc);
  const src: ExpirySource = days != null && days !== est.days ? 'You' : est.src;
  const idx = out.findIndex((i) => same(i.name, name) && i.loc === loc && !i.leftover);
  if (idx >= 0) {
    const it = out[idx];
    const cur = itemDays(it);
    const nd = days != null ? days : cur != null ? Math.max(cur, defDays(name, it.loc)) : null;
    out[idx] = {
      ...it, level: it.count == null ? 'Full' : it.level, count: it.count != null ? it.count + (qty || 1) : null,
      expires: nd == null ? null : isoIn(nd), opened: false, src, ...confirmed(),
    };
  } else {
    out.push(mk(name, loc, days != null ? { expires: isoIn(days), src } : undefined));
  }
  return out;
}

// ── Purchases (repeat-purchase inference, build plan v1.1) ───
const BUYS_PER_FOOD = 12;
const BUYS_FOODS = 300;

const buyKey = (name: string) => name.trim().toLowerCase();

// Record one purchase of `name` today; a second buy on the same day doesn't count again.
export function recordBuy(buys: Buys, name: string, today = isoIn(0)): Buys {
  const k = buyKey(name);
  const prev = buys[k] ?? [];
  if (prev[prev.length - 1] === today) return buys;
  const next: Buys = { ...buys, [k]: [...prev, today].slice(-BUYS_PER_FOOD) };
  const keys = Object.keys(next);
  if (keys.length <= BUYS_FOODS) return next;
  // Forget the foods bought longest ago.
  const last = (key: string) => next[key][next[key].length - 1];
  keys.sort((a, b) => (last(a) < last(b) ? -1 : 1)).slice(0, keys.length - BUYS_FOODS).forEach((key) => delete next[key]);
  return next;
}

// Median days between purchases, once there are at least two.
export function cadence(dates: string[] | undefined): number | null {
  if (!dates || dates.length < 2) return null;
  const gaps = dates.slice(1).map((d, i) => (daysFromToday(d) ?? 0) - (daysFromToday(dates[i]) ?? 0)).sort((a, b) => a - b);
  const m = gaps.length >> 1;
  return gaps.length % 2 ? gaps[m] : (gaps[m - 1] + gaps[m]) / 2;
}

// Buying something you already have means the old stock was probably used up or nearly so.
const probablyUsed = (it: Item) => !isOut(it) && ((it.count == null && it.level === 'Low') || confidence(it) < PROBABLY);

// A purchase from a receipt, the barcode scanner, Add food or the list: merge() plus what it tells us.
// Topping up a Low or doubtful row logs it as used (rows the user marked Out were logged then),
// and the purchase date feeds the food's restock cadence.
export function buy(s: Persisted, name: string, loc: string, qty?: number, days?: number | null): Persisted {
  const old = s.items.find((i) => same(i.name, name) && i.loc === loc && !i.leftover);
  const out = old && probablyUsed(old) ? logEvent(s, 'used', old.name) : s;
  const buys = recordBuy(out.buys ?? {}, name);
  const every = cadence(buys[buyKey(name)]);
  let items = merge(out.items, name, loc, qty, days);
  if (every != null) items = items.map((i) => (same(i.name, name) && i.loc === loc && !i.leftover ? { ...i, every } : i));
  return { ...out, items, buys };
}

// "about 2 weeks" for a cadence in days.
export function everyText(d: number): string {
  const r = Math.max(1, Math.round(d));
  if (r === 1) return 'about a day';
  if (r < 14) return `about ${r} days`;
  if (r < 60) return `about ${Math.round(r / 7)} weeks`;
  const m = Math.round(r / 30);
  return m === 1 ? 'about a month' : `about ${m} months`;
}

// Foods whose learned cadence says they're probably running out, for the List tab.
export function restockDue(s: Persisted): Item[] {
  return s.items.filter((i) => !i.leftover && i.every != null && (s.buys?.[buyKey(i.name)]?.length ?? 0) >= 2
    && !isOut(i) && !(i.count == null && i.level === 'Low') && confidence(i) < PROBABLY
    && !s.list.some((r) => same(r.name, i.name)));
}

export function addToList(s: Persisted, name: string, aisle?: string): Persisted {
  if (s.list.some((r) => same(r.name, name))) return s;
  const row: ListRow = { id: uid('l'), name, aisle: aisle || aisleOf(name) };
  return { ...s, list: [...s.list, row] };
}

export function updItem(s: Persisted, id: string, patch: Partial<Item>): Persisted {
  return { ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) };
}

export const needsSweep = (it: Item) => confidence(it) < SWEEP;

// Items the Sunday sweep should ask about: lowest confidence first, at most SWEEP_MAX.
export function sweepQueue(items: Item[]): string[] {
  const q = items.filter(needsSweep).sort((a, b) => confidence(a) - confidence(b)).slice(0, SWEEP_MAX).map((i) => i.id);
  return q.length ? q : items.filter((i) => !isOut(i)).slice(0, 5).map((i) => i.id);
}

export type SweepAnswer = 'have' | 'low' | 'gone';

export function answerSweep(s: Persisted, id: string, kind: SweepAnswer): Persisted {
  const ok = confirmed();
  return {
    ...s,
    items: s.items.map((i) => {
      if (i.id !== id) return i;
      if (kind === 'have') return { ...i, ...ok, level: i.level === 'Out' ? 'Some' : i.level };
      if (kind === 'low') return { ...i, ...ok, level: 'Low', count: i.count != null ? Math.min(i.count, 1) : null };
      return { ...i, ...ok, level: 'Out', count: i.count != null ? 0 : null };
    }),
  };
}

// Monthly receipt scans and weekly recipe ideas reset on their own.
export function refreshAllowances(s: Persisted, month: string, week: string): Persisted {
  let out = s;
  if (s.receiptMonth !== month) out = { ...out, receiptLeft: 5, receiptMonth: month };
  if (s.ideasWeek !== week) out = { ...out, ideasLeft: 5, ideasWeek: week };
  return out;
}

// ── Events (monthly recap) ───────────────────────────────────
const EVENTS_MAX = 600;

export function logEvent(s: Persisted, kind: EventKind, name: string): Persisted {
  const events = [...(s.events ?? []), { kind, name, at: isoIn(0) }].slice(-EVENTS_MAX);
  return { ...s, events, stats: { ...s.stats, [kind]: s.stats[kind] + 1 } };
}

export type MonthRecap = { used: number; tossed: number; cooked: number; tossedNames: string[]; weeks: { label: string; used: number; tossed: number }[] };

// Counts for one month (default: this one), with week 1 = days 1-7 and so on.
export function monthRecap(s: Persisted, month = monthKey()): MonthRecap {
  const evs = (s.events ?? []).filter((e) => e.at.startsWith(month));
  const count = (k: EventKind) => evs.filter((e) => e.kind === k).length;
  const lastDay = month === monthKey() ? Number(isoIn(0).slice(8, 10)) : 31;
  const weeks = Array.from({ length: Math.ceil(lastDay / 7) }, (_, w) => {
    const inWeek = evs.filter((e) => Math.floor((Number(e.at.slice(8, 10)) - 1) / 7) === w);
    return { label: `Week ${w + 1}`, used: inWeek.filter((e) => e.kind === 'used').length, tossed: inWeek.filter((e) => e.kind === 'tossed').length };
  });
  const tossedNames = [...new Set(evs.filter((e) => e.kind === 'tossed').map((e) => e.name))];
  return { used: count('used'), tossed: count('tossed'), cooked: count('cooked'), tossedNames, weeks };
}
