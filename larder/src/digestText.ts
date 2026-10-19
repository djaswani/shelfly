// Daily digest wording, kept free of native imports so it can be tested.
import { isOut, itemDays, joinNames } from './logic';
import { Item } from './data/types';

// What to say on the morning `offset` days from today, or null when nothing needs using.
// Covers food going off that day or the next, soonest first.
export function digestFor(items: Item[], offset: number): { title: string; body: string } | null {
  const soon = items
    .filter((it) => !isOut(it) && it.expires)
    .map((it) => ({ it, d: (itemDays(it) ?? 99) - offset }))
    .filter((x) => x.d >= 0 && x.d <= 1)
    .sort((a, b) => a.d - b.d);
  if (!soon.length) return null;
  const when = (d: number) => (d === 0 ? 'today' : 'tomorrow');
  const shown = soon.slice(0, 3).map((x) => `${x.it.name.toLowerCase()} (${when(x.d)})`);
  const more = soon.length - shown.length;
  const title = soon.length === 1 ? `Use your ${soon[0].it.name.toLowerCase()} soon` : `${soon.length} things to use soon`;
  return { title, body: capital(joinNames(more ? [...shown, `${more} more`] : shown)) + '.' };
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
