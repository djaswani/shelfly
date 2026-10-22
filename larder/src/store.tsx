import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { monthKey, weekKey } from './dates';
import { demoState } from './data/seed';
import { Persisted } from './data/types';
import type { GateKind } from './components/PlusGate';
import { refreshAllowances } from './logic';

const KEY = 'larder.state.v1';

type Store = {
  s: Persisted;
  ready: boolean;
  set: (fn: (s: Persisted) => Persisted) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  sheetId: string | null;
  openSheet: (id: string | null) => void;
  gate: GateKind | null;
  openGate: (g: GateKind | null) => void;
  openReceipt: () => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Persisted>(demoState);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sheetId, openSheet] = useState<string | null>(null);
  const [gate, openGate] = useState<GateKind | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        // New installs start with onboarding; saves from before onboarding existed skip it.
        const loaded: Persisted = raw ? { onboarded: true, ...JSON.parse(raw) } : { ...demoState(), onboarded: false };
        // Older saves stored the digest time as an index into three presets.
        if (loaded.digestTime < 3) loaded.digestTime = [8 * 60, 12 * 60, 17 * 60 + 30][loaded.digestTime] ?? 8 * 60;
        // Recipes used to be static; older saves start with the same ones.
        // The hand-written starter recipes (r1-r6) were retired; TheMealDB ideas replace them.
        loaded.recipes = (Array.isArray(loaded.recipes) ? loaded.recipes : []).filter((r) => !/^r[1-6]$/.test(r.id));
        setS(refreshAllowances(loaded, monthKey(), weekKey()));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  }, [s, ready]);

  const showToast = useCallback((msg: string) => {
    clearTimeout(timer.current);
    setToast(msg);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const reset = useCallback(() => setS({ ...demoState(), onboarded: true }), []);

  // Every receipt entry point goes through here so the free allowance is checked once.
  const openReceipt = useCallback(() => {
    if (!s.plus && s.receiptLeft <= 0) return openGate('receipt');
    router.push('/receipt');
  }, [s.plus, s.receiptLeft]);

  return (
    <Ctx.Provider value={{ s, ready, set: setS, toast, showToast, sheetId, openSheet, gate, openGate, openReceipt, reset }}>{children}</Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
