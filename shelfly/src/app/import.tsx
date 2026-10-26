import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BigBtn, Btn, Icon, T } from '../components/ui';
import { uid } from '../logic';
import { goBack } from '../nav';
import { importAny, socialName } from '../shareImport';
import { useStore } from '../store';
import { C } from '../theme';

// Where "Share to Shelfly" lands: read the shared link, save it as a recipe, open it.
export default function ImportRecipe() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const { s, set, showToast } = useStore();
  const [err, setErr] = useState('');
  const started = useRef(false);
  const from = (url && socialName(url)) || 'the link';

  const run = useCallback(async () => {
    if (!url) return;
    setErr('');
    const known = s.recipes.find((r) => r.source?.url === url);
    if (known) return router.replace(`/recipe/${known.id}`);
    try {
      const { recipe, kind } = await importAny(url);
      const r = { ...recipe, id: uid('r') };
      set((st) => ({ ...st, recipes: [r, ...st.recipes], saved: { ...st.saved, [r.id]: true } }));
      showToast(kind === 'link' ? 'Saved. No ingredient list in that post' : 'Recipe added');
      router.replace(`/recipe/${r.id}`);
    } catch {
      setErr('Couldn’t open that link. Check your connection and try again.');
    }
  }, [url, s.recipes, set, showToast]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      {err ? (
        <>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.warnSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="link_off" size={28} color={C.warn} />
          </View>
          <T size={17} w={600} style={{ textAlign: 'center' }}>{err}</T>
          <BigBtn title="Try again" onPress={run} style={{ alignSelf: 'stretch' }} />
          <Btn onPress={() => goBack()} style={{ height: 44, justifyContent: 'center' }}><T w={600} color={C.muted}>Close</T></Btn>
        </>
      ) : (
        <>
          <ActivityIndicator color={C.green} size="large" />
          <T size={17} w={600}>Adding recipe from {from}…</T>
          <T size={14} color={C.muted} style={{ textAlign: 'center' }} numberOfLines={2}>{url}</T>
        </>
      )}
    </View>
  );
}
