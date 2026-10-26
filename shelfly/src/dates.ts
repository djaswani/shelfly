// Dates are stored as local YYYY-MM-DD strings; "days" are whole days from today.
const DAY = 86_400_000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoIn(days: number): string {
  const t = startOfDay(new Date());
  return toISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() + days));
}

export function daysFromToday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.round((fromISO(iso).getTime() - startOfDay(new Date()).getTime()) / DAY);
}

export function shortDate(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function longDate(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function todayHeading(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function monthName(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long' });
}

export function monthKey(): string {
  return toISO(new Date()).slice(0, 7);
}

export function nextMonthStart(): string {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Monday of the current week, as YYYY-MM-DD
export function weekKey(): string {
  const t = startOfDay(new Date());
  const offset = (t.getDay() + 6) % 7;
  return toISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() - offset));
}
