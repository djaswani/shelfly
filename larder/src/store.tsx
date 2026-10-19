import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { monthKey, weekKey } from './dates';
import { demoState } from './data/seed';
import { Persisted } from './data/types';
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
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Persisted>(demoState);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sheetId, openSheet] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const loaded: Persisted = raw ? JSON.parse(raw) : demoState();
        // Older saves stored the digest time as an index into three presets.
        if (loaded.digestTime < 3) loaded.digestTime = [8 * 60, 12 * 60, 17 * 60 + 30][loaded.digestTime] ?? 8 * 60;
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

  const reset = useCallback(() => setS(demoState()), []);

  return (
    <Ctx.Provider value={{ s, ready, set: setS, toast, showToast, sheetId, openSheet, reset }}>{children}</Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
