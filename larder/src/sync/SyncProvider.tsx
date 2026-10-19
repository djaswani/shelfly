// Sign-in, household membership, and two-way sync of items, list rows and locations.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Persisted } from '../data/types';
import { useStore } from '../store';
import { supabase } from './client';
import { applyRow, Coll, COLLECTIONS, COLLS, diff, emptySnapshot, mergeAll, Row, Snapshot, stable } from './engine';

const KEY = 'larder.sync.v1';

export type Household = { id: string; name: string; invite_code: string; plan: string };
export type Member = { user_id: string; display_name: string; role: string };
export type SyncStatus = 'off' | 'syncing' | 'synced' | 'offline';

type Sync = {
  enabled: boolean; // Supabase configured in this build
  session: Session | null;
  household: Household | null;
  members: Member[];
  status: SyncStatus;
  lastSynced: Date | null;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  createHousehold: (name: string, displayName: string) => Promise<void>;
  joinHousehold: (code: string, displayName: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Sync | null>(null);

// Server errors raised by the SQL functions → words for people.
export function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  if (m.includes('invalid_code')) return 'That invite code doesn’t match a household.';
  if (m.includes('household_full')) return 'That household is full. The free plan includes 2 members.';
  if (m.includes('already_in_household')) return 'You’re already in a household.';
  if (/token.*(expired|invalid)|otp/i.test(m)) return 'That code didn’t work. Check it or send a new one.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
  if (/network|fetch/i.test(m)) return 'No connection. Try again when you’re online.';
  return m;
}

const sb = () => {
  if (!supabase) throw new Error('Sync isn’t set up in this build.');
  return supabase;
};

export function SyncProvider({ children }: { children: ReactNode }) {
  const { s, set, ready } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [status, setStatus] = useState<SyncStatus>('off');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const snap = useRef<Snapshot>(emptySnapshot());
  const stateRef = useRef<Persisted>(s);
  const pushing = useRef(false);
  const again = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hhRef = useRef<Household | null>(null);
  const loaded = useRef(false);

  useEffect(() => { stateRef.current = s; }, [s]);
  useEffect(() => { hhRef.current = household; }, [household]);

  const saveSnap = useCallback((householdId: string | null) => {
    AsyncStorage.setItem(KEY, JSON.stringify({ householdId, snap: snap.current })).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    loaded.current = false;
    snap.current = emptySnapshot();
    hhRef.current = null;
    setHousehold(null);
    setMembers([]);
    setStatus('off');
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  // ── Auth ────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      if (!sess) reset(); // signed out or session ended: back to local-only
    });
    return () => data.subscription.unsubscribe();
  }, [reset]);

  // ── Push local changes ──────────────────────────────────────
  const push = useCallback(async () => {
    const h = hhRef.current;
    if (!supabase || !h || !loaded.current) return;
    if (pushing.current) { again.current = true; return; }
    pushing.current = true;
    try {
      // Keep going while edits arrive mid-push.
      do {
        again.current = false;
        for (const ch of diff(stateRef.current, snap.current)) {
          const rows: Row[] = [
            ...ch.upserts.map((o) => ({ household_id: h.id, id: o.id, data: o as unknown as Record<string, unknown>, deleted: false })),
            ...ch.deletes.map((d) => ({ household_id: h.id, id: d.id, data: d.data, deleted: true })),
          ];
          for (let i = 0; i < rows.length; i += 500) {
            const { error } = await supabase.from(COLLECTIONS[ch.coll]).upsert(rows.slice(i, i + 500), { onConflict: 'household_id,id' });
            if (error) throw error;
          }
          ch.upserts.forEach((o) => { snap.current[ch.coll][o.id] = stable(o); });
          ch.deletes.forEach((d) => { delete snap.current[ch.coll][d.id]; });
        }
      } while (again.current);
      saveSnap(h.id);
      setStatus('synced');
      setLastSynced(new Date());
    } catch {
      setStatus('offline'); // try again on the next change or when the app returns to the foreground
    } finally {
      pushing.current = false;
    }
  }, [saveSnap]);

  useEffect(() => {
    if (!household || !ready) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(push, 600);
  }, [s.items, s.list, s.locs, household, ready, push]);

  // ── Full download ───────────────────────────────────────────
  const pullAll = useCallback(async (h: Household, mode: 'adopt' | 'merge') => {
    const client = sb();
    setStatus('syncing');
    const remote = {} as Record<Coll, Row[]>;
    for (const coll of COLLS) {
      const { data, error } = await client.from(COLLECTIONS[coll]).select('*').eq('household_id', h.id);
      if (error) throw error;
      remote[coll] = data as Row[];
    }
    const { state, snap: next } = mergeAll(stateRef.current, snap.current, remote, mode);
    snap.current = next;
    stateRef.current = state;
    set(() => state);
    saveSnap(h.id);
    loaded.current = true;
    await push();
  }, [push, saveSnap, set]);

  const loadMembers = useCallback(async (h: Household) => {
    const { data } = await sb().from('members').select('user_id, display_name, role').eq('household_id', h.id).order('joined_at');
    if (data) setMembers(data as Member[]);
  }, []);

  // ── Find my household once signed in ────────────────────────
  useEffect(() => {
    if (!supabase || !ready || !session) return;
    let cancelled = false;
    (async () => {
      const { data: m } = await supabase.from('members').select('household_id').eq('user_id', session.user.id).maybeSingle();
      if (cancelled) return;
      if (!m) { setHousehold(null); setStatus('off'); return; }
      const { data: h } = await supabase.from('households').select('id, name, invite_code, plan').eq('id', m.household_id).single();
      if (cancelled || !h) return;
      const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
      // Same household as last time: keep the snapshot so offline edits survive. Otherwise start fresh.
      const sameHousehold = saved?.householdId === h.id;
      snap.current = sameHousehold ? saved.snap : emptySnapshot();
      hhRef.current = h;
      setHousehold(h);
      loadMembers(h);
      try { await pullAll(h, sameHousehold ? 'merge' : 'adopt'); } catch { setStatus('offline'); }
    })();
    return () => { cancelled = true; };
  }, [session, ready, pullAll, loadMembers]);

  // ── Live updates from other devices ─────────────────────────
  useEffect(() => {
    if (!supabase || !household) return;
    let channel: RealtimeChannel = supabase.channel(`household:${household.id}`);
    for (const coll of COLLS) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: COLLECTIONS[coll], filter: `household_id=eq.${household.id}` }, (payload) => {
        const row = payload.new as Row;
        if (!row?.id) return;
        const json = stable(row.data);
        // Our own write coming back: nothing to do.
        if (!row.deleted && snap.current[coll][row.id] === json) return;
        if (row.deleted) delete snap.current[coll][row.id];
        else snap.current[coll][row.id] = json;
        saveSnap(household.id);
        set((st) => applyRow(st, coll, row));
        setLastSynced(new Date());
      });
    }
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `household_id=eq.${household.id}` }, () => loadMembers(household));
    channel.subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [household, set, saveSnap, loadMembers]);

  // Catch up on anything missed while the app was in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      const h = hhRef.current;
      if (st === 'active' && h && loaded.current) pullAll(h, 'merge').catch(() => setStatus('offline'));
    });
    return () => sub.remove();
  }, [pullAll]);

  // ── Actions ─────────────────────────────────────────────────
  const sendCode = useCallback(async (email: string) => {
    const { error } = await sb().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    if (error) throw error;
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const { error } = await sb().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (error) throw error;
  }, []);

  const startHousehold = useCallback(async (h: Household, mode: 'adopt' | 'merge') => {
    snap.current = emptySnapshot();
    hhRef.current = h;
    setHousehold(h);
    loadMembers(h);
    await pullAll(h, mode);
  }, [loadMembers, pullAll]);

  const createHousehold = useCallback(async (name: string, displayName: string) => {
    const { data, error } = await sb().rpc('create_household', { p_name: name, p_display_name: displayName });
    if (error) throw error;
    // Everything on this device becomes the household's starting kitchen.
    await startHousehold(data as Household, 'merge');
  }, [startHousehold]);

  const joinHousehold = useCallback(async (code: string, displayName: string) => {
    const { data, error } = await sb().rpc('join_household', { p_code: code, p_display_name: displayName });
    if (error) throw error;
    await startHousehold(data as Household, 'adopt');
  }, [startHousehold]);

  const leaveHousehold = useCallback(async () => {
    const { error } = await sb().rpc('leave_household');
    if (error) throw error;
    reset(); // the kitchen stays on this device as a local copy
  }, [reset]);

  const signOut = useCallback(async () => {
    await sb().auth.signOut();
    reset();
  }, [reset]);

  return (
    <Ctx.Provider value={{ enabled: !!supabase, session, household, members, status, lastSynced, sendCode, verifyCode, createHousehold, joinHousehold, leaveHousehold, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSync() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSync must be used inside SyncProvider');
  return v;
}
