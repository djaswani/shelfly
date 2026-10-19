// Pure inventory logic ported from design/Larder.dc.html. Every function takes and returns plain data.
import { daysFromToday, isoIn } from './dates';
import { LIFE, QUICK } from './data/seed';
import { ExpirySource, Item, Level, LEVELS, ListRow, Persisted } from './data/types';
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

// τ: how long this food typically lasts. Shelf life is the stand-in until we learn real
// household cadence from purchase history (v1.1). Staples without a date drift slowly.
export function tau(it: Item): number {
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

// Add a purchase to the inventory, topping up an existing row of the same name when there is one.
export function merge(items: Item[], name: string, loc: string, qty?: number, days?: number | null): Item[] {
  const out = items.slice();
  const est = estimate(name, loc);
  const src: ExpirySource = days != null && days !== est.days ? 'You' : est.src;
  const idx = out.findIndex((i) => same(i.name, name) && !i.leftover);
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
