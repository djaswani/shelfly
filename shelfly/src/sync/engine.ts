// Pure sync logic: diffing local state against what the server has, and folding server rows back in.
// One server row per object (item, list row, location); last write wins per object.
import { Persisted } from '../data/types';

export const COLLECTIONS = { items: 'items', list: 'list_items', locs: 'locations' } as const;
export type Coll = keyof typeof COLLECTIONS;
export const COLLS = Object.keys(COLLECTIONS) as Coll[];

export type Row = { household_id: string; id: string; data: Record<string, unknown>; deleted: boolean; updated_at?: string; updated_by?: string | null };

// What we believe the server holds: id → stable JSON, per collection.
export type Snapshot = Record<Coll, Record<string, string>>;
export const emptySnapshot = (): Snapshot => ({ items: {}, list: {}, locs: {} });

// Key-order independent JSON so jsonb's reordering doesn't look like a change.
export function stable(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return '{' + Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

type Obj = { id: string };
const list = (s: Persisted, c: Coll) => s[c] as unknown as Obj[];

export type Changes = { coll: Coll; upserts: Obj[]; deletes: { id: string; data: Record<string, unknown> }[] };

export function diff(s: Persisted, snap: Snapshot): Changes[] {
  return COLLS.map((coll) => {
    const cur = new Map(list(s, coll).map((o) => [o.id, o]));
    const upserts = [...cur.values()].filter((o) => snap[coll][o.id] !== stable(o));
    const deletes = Object.keys(snap[coll]).filter((id) => !cur.has(id)).map((id) => ({ id, data: JSON.parse(snap[coll][id]) }));
    return { coll, upserts, deletes };
  }).filter((c) => c.upserts.length || c.deletes.length);
}

// Apply one server row (realtime event) to local state.
export function applyRow(s: Persisted, coll: Coll, row: Row): Persisted {
  const cur = list(s, coll);
  const idx = cur.findIndex((o) => o.id === row.id);
  let next: Obj[];
  if (row.deleted) next = cur.filter((o) => o.id !== row.id);
  else if (idx >= 0) next = cur.map((o, i) => (i === idx ? (row.data as unknown as Obj) : o));
  else next = [...cur, row.data as unknown as Obj];
  return { ...s, [coll]: next };
}

// Fold a full download into local state.
// 'adopt' (joining a household): the household's data replaces what's on this device.
// 'merge' (reconnecting): server wins, except objects edited here since the last sync, which get pushed.
export function mergeAll(s: Persisted, snap: Snapshot, remote: Record<Coll, Row[]>, mode: 'adopt' | 'merge'): { state: Persisted; snap: Snapshot } {
  let state = s;
  const next = emptySnapshot();
  for (const coll of COLLS) {
    const rows = remote[coll];
    if (mode === 'adopt') {
      const live = rows.filter((r) => !r.deleted);
      state = { ...state, [coll]: live.map((r) => r.data) };
      live.forEach((r) => { next[coll][r.id] = stable(r.data); });
      continue;
    }
    let cur = list(state, coll);
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const r of rows) {
      const local = cur.find((o) => o.id === r.id);
      const editedHere = local && stable(local) !== snap[coll][r.id];
      if (editedHere) { if (!r.deleted) next[coll][r.id] = stable(r.data); continue; }
      if (r.deleted) cur = cur.filter((o) => o.id !== r.id);
      else {
        cur = local ? cur.map((o) => (o.id === r.id ? (r.data as unknown as Obj) : o)) : [...cur, r.data as unknown as Obj];
        next[coll][r.id] = stable(r.data);
      }
    }
    // Synced before but gone from the server entirely: drop it here too. New local objects stay and get pushed.
    cur = cur.filter((o) => byId.has(o.id) || !(o.id in snap[coll]));
    state = { ...state, [coll]: cur };
  }
  return { state, snap: next };
}
