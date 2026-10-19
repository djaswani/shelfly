// Rule-based receipt reader: OCR text in, receipt rows out. No AI and no network.
// Name lookup order: the user's past corrections → foods the app knows → USDA FoodKeeper → cleaned-up text (asks the user).
import { LIFE, QUICK } from '../data/seed';
import { ReceiptMemory, ReceiptRow } from '../data/types';
import { matchFood } from '../foodkeeper';
import { capitalize, defDays, locForAisle, uid } from '../logic';
import { ABBREV, BRANDS, DROP_WORDS, NON_FOOD } from './abbreviations';

export type { ReceiptMemory };

export type ParsedReceipt = { store?: string; date?: string; rows: ReceiptRow[] };

const SKIP = /\b(SUB ?TOTAL|TOTAL|TAX|BALANCE|CHANGE|CASH|VISA|MASTERCARD|MASTER CARD|DEBIT|CREDIT|AMEX|DISCOVER|CARD|TEND(ER)?|SAVINGS|YOU SAVED|SAVED|COUPON|DISCOUNT|MEMBER|REWARDS?|POINTS|FUEL|THANK|THANKS|STORE|CASHIER|REG(ISTER)?|TRANS(ACTION)?|TERMINAL|APPROVED|AUTH|ACCOUNT|ACCT|ITEMS? SOLD|NUMBER OF ITEMS|RETURN|REFUND|PRICE YOU PAY|BOTTLE DEPOSIT|CRV|RECEIPT|SURVEY|WWW|HTTP|\.COM|PHONE|TEL|MANAGER|OPEN|HOURS)\b/;
const PRICE_END = /\s*\$?(-?\d{1,4}[.,]\d{2})\s*(?:[A-Z]{1,2}|\*)?\s*$/;
const WEIGHT_LINE = /\d+(?:\.\d+)?\s*(LB|LBS|KG|OZ)\s*@|@\s*\$?\d+[.,]\d{2}\s*\/\s*(LB|KG|EA)/;
const QTY_LINE = /^\s*(\d+)\s*@\s*\$?\d+[.,]\d{2}/;
const SIZE = /^(\d+(\.\d+)?)(OZ|FLOZ|FL|LB|LBS|G|KG|ML|L|GAL|QT|PT|CT|PK|EA|Z)$|^(OZ|FL|LB|LBS|GAL|QT|PT|CT|PK|EA|Z)$/;
const STORES = ['Kroger', 'Walmart', 'Target', 'Costco', "Trader Joe's", 'Whole Foods', 'Safeway', 'Aldi', 'Publix', 'Meijer', 'H-E-B',
  'Wegmans', 'Sprouts', 'Giant', 'Stop & Shop', 'Food Lion', 'Harris Teeter', 'Ralphs', 'Albertsons', "Sam's Club", 'Lidl', 'Fred Meyer'];
const storeKey = (t: string) => t.toUpperCase().replace(/[^A-Z&]/g, '');

const stem = (w: string) => (w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.endsWith('oes') ? w.slice(0, -2) : w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const titleCase = (t: string) => capitalize(t.toLowerCase());

// The part of a line that identifies the product: uppercase, no price, codes or tax flags.
export function receiptKey(line: string): string {
  return line.toUpperCase().replace(PRICE_END, '').replace(/^\s*\d{4,}\s+/, '').replace(/\b\d{6,}\b/g, '').replace(/\s+/g, ' ').trim();
}

type Known = { name: string; stems: string[]; aisle?: string };

function knownFoods(extra: string[]): Known[] {
  const aisle = new Map<string, string>();
  QUICK.forEach((g) => g.items.forEach((n) => aisle.set(n, g.aisle)));
  const names = new Set([...QUICK.flatMap((g) => g.items), ...Object.keys(LIFE), ...extra]);
  return [...names].map((name) => ({ name, stems: name.toLowerCase().split(/\s+/).map(stem), aisle: aisle.get(name) }));
}

// Where a food usually goes: its quick-add aisle, else the fridge if FoodKeeper says it keeps
// longer there, else the pantry if it's shelf-stable. Freezer only when the receipt says frozen.
function suggestLoc(name: string, words: string[], aisle?: string): string {
  if (words.includes('frozen') || words.includes('ice')) return 'freezer';
  if (aisle) return locForAisle(aisle);
  const m = matchFood(name);
  if (m?.p != null && (m.f == null || m.p >= m.f)) return 'pantry';
  return 'fridge';
}

// FoodKeeper names this food plainly (every word appears in its name or keywords), so no need to ask.
function plainFoodKeeperMatch(display: string): boolean {
  const m = matchFood(display);
  if (!m) return false;
  const vocab = new Set([...m.n.toLowerCase().split(/[^a-z]+/), ...(m.k ?? []).flatMap((k) => k.split(/[^a-z]+/))].map(stem));
  return display.toLowerCase().split(/\s+/).every((w) => vocab.has(stem(w)));
}

export function parseLine(line: string, known: Known[], memory: ReceiptMemory): Omit<ReceiptRow, 'id'> | null {
  const key = receiptKey(line);
  const raw = line.trim();
  const remembered = memory[key];
  if (remembered) {
    const loc = remembered.loc ?? suggestLoc(remembered.name, [], undefined);
    return { raw, key, name: remembered.name, loc, on: !remembered.nonFood, nonFood: remembered.nonFood, days: remembered.nonFood ? null : defDays(remembered.name, loc) };
  }

  let qty: number | undefined;
  const tokens: string[] = [];
  for (const t of key.split(/[\s/,-]+/)) {
    const ct = t.match(/^(\d+)(CT|PK)$/);
    if (ct) { qty = Number(ct[1]); continue; }
    if (!t || SIZE.test(t) || BRANDS.has(t) || /^\d+%?$/.test(t) || /^\d/.test(t)) continue;
    const word = ABBREV[t] ?? (t.length > 2 ? t.toLowerCase() : '');
    if (word) tokens.push(...word.split(' ').filter(Boolean));
  }
  if (!tokens.length) return null;
  const words = tokens.map((w) => w.replace(/[^a-z]/g, '')).filter(Boolean);
  const wordStems = new Set(words.map(stem));

  if (words.some((w) => NON_FOOD.includes(w))) {
    const name = titleCase(words.filter((w) => !DROP_WORDS.has(w)).join(' '));
    return { raw, key, name, loc: 'pantry', on: false, nonFood: true, days: null, qty };
  }

  // Longest known food whose words all appear in the line ("chicken breast" beats "chicken").
  const hit = known.filter((k) => k.stems.every((s) => wordStems.has(s))).sort((a, b) => b.stems.length - a.stems.length)[0];
  const display = titleCase(words.filter((w) => !DROP_WORDS.has(w)).join(' ') || words.join(' '));
  const name = hit ? hit.name : display;
  // Ask unless a known food matched or FoodKeeper names it plainly.
  const unsure = !hit && !plainFoodKeeperMatch(display);
  if (!hit && !matchFood(display) && words.every((w) => !Object.values(ABBREV).includes(w))) {
    // Nothing recognisable: likely a header, address or OCR noise.
    return null;
  }
  const loc = suggestLoc(name, words, hit?.aisle);
  return { raw, key, name, loc, on: true, unsure, qty, days: defDays(name, loc) };
}

export function parseReceipt(text: string, opts: { knownNames?: string[]; memory?: ReceiptMemory } = {}): ParsedReceipt {
  const known = knownFoods(opts.knownNames ?? []);
  const memory = opts.memory ?? {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const upper = lines.map((l) => l.toUpperCase());

  const store = STORES.find((s) => upper.slice(0, 8).some((l) => storeKey(l).includes(storeKey(s))));
  const dateLine = upper.find((l) => /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(l));
  const date = dateLine?.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/)?.[0];

  // If prices sit on the same line as names, only priced lines are items. OCR sometimes splits
  // the price column off, in which case every line is a candidate and recognition does the filtering.
  const priced = upper.filter((l) => PRICE_END.test(l) && /[A-Z]{3}/.test(l)).length >= 2;

  const rows: ReceiptRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const u = upper[i];
    const q = u.match(QTY_LINE);
    if (q && rows.length) { rows[rows.length - 1].qty = Number(q[1]); continue; }
    if (WEIGHT_LINE.test(u) || SKIP.test(u)) continue;
    if (!/[A-Z]{2}/.test(u)) continue;
    if (priced && !PRICE_END.test(u)) continue;
    if (/-\d+[.,]\d{2}\s*$/.test(u)) continue; // discounts
    const row = parseLine(lines[i], known, memory);
    if (row) rows.push({ id: uid('r'), ...row });
  }
  return { store, date, rows };
}

// What to remember after the user confirms a receipt: every kept row's final name and place,
// and anything they marked as not food, keyed by the receipt text so the same line never asks twice.
export function learnFrom(rows: ReceiptRow[], memory: ReceiptMemory): ReceiptMemory {
  const next = { ...memory };
  for (const r of rows) {
    if (!r.key) continue;
    if (r.on) next[r.key] = { name: r.name, loc: r.loc, ...(r.nonFood ? { nonFood: true } : {}) };
    else if (r.nonFood) next[r.key] = { name: r.name, nonFood: true };
  }
  return next;
}
