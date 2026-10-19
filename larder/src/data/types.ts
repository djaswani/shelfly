export type Level = 'Full' | 'Some' | 'Low' | 'Out';
export const LEVELS: Level[] = ['Full', 'Some', 'Low', 'Out'];

export type ExpirySource = 'FoodKeeper' | 'Estimate' | 'Label' | 'You';

export type Item = {
  id: string;
  name: string;
  short?: string; // used in "Uses chicken and spinach"
  loc: string;
  level: Level; // used when count is null
  count: number | null;
  unit?: string;
  expires: string | null; // YYYY-MM-DD
  src: ExpirySource;
  conf: number; // 0..1, how sure we are this row is still accurate
  opened: boolean;
  prevExpires?: string | null;
  prevSrc?: ExpirySource;
  leftover?: boolean;
  made?: string; // YYYY-MM-DD
  staple?: boolean;
  aisle?: string;
  checkedAt?: string; // YYYY-MM-DD, last time the user confirmed it
  confAt?: string; // YYYY-MM-DD the conf value was set; decay runs from here (defaults to checkedAt)
};

export type ListRow = { id: string; name: string; qty?: string; aisle: string; checked?: boolean };

export type Loc = { id: string; name: string };

export type Member = { n: string; i: string; role: string };

export type RecipeIngredient = { ref?: string; name?: string; amt: string; use?: number };

export type Recipe = {
  id: string;
  title: string;
  time: number;
  serves: number;
  idea?: boolean; // generated idea rather than a saved recipe
  batch?: number;
  ings: RecipeIngredient[];
  steps: string[];
};

export type ReceiptRow = {
  id: string;
  raw: string;
  key?: string; // normalized receipt text, used to remember corrections
  name: string;
  loc: string;
  on: boolean;
  unsure?: boolean;
  editing?: boolean;
  qty?: number;
  nonFood?: boolean;
  days: number | null;
};

// Remembered receipt-line fixes, keyed by normalized receipt text (build plan: `products` table, local for now).
export type Correction = { name: string; loc?: string; nonFood?: boolean };
export type ReceiptMemory = Record<string, Correction>;

export type Stats = { used: number; tossed: number; cooked: number };

export type Plan = 'year' | 'month' | 'life';

export type Persisted = {
  version: 1;
  items: Item[];
  list: ListRow[];
  locs: Loc[];
  saved: Record<string, boolean>;
  stats: Stats;
  members: Member[];
  digest: boolean;
  digestTime: number;
  plus: boolean;
  receiptLeft: number;
  receiptMonth: string;
  ideasLeft: number;
  ideasWeek: string;
  genShown: number;
  receiptMemory?: ReceiptMemory;
};
