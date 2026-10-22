import { router } from 'expo-router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { BigBtn, Btn, H1, Icon, Pill, RecipePhoto, S, Screen, T } from '../../components/ui';
import { fetchIdeas, replaceIdeas } from '../../mealdb';
import { normalizeUrl } from '../../recipeImport';
import { byExpiring, byTime, cardText, isIdea, visibleRecipes } from '../../recipes';
import { useStore } from '../../store';
import { C } from '../../theme';

type Filter = 'expiring' | 'quick' | 'saved';
const FILTERS: [Filter, string][] = [['expiring', 'Use it up'], ['quick', 'Quickest'], ['saved', 'Saved']];

export default function Cook() {
  const { s, set, showToast, openGate } = useStore();
  const [filter, setFilter] = useState<Filter>('expiring');
  const [busy, setBusy] = useState<'ideas' | null>(null);
  const [link, setLink] = useState<{ url: string; err: string } | null>(null);

  let cards = visibleRecipes(s);
  if (filter === 'saved') cards = cards.filter((x) => s.saved[x.r.id]);
  cards.sort(filter === 'quick' ? byTime : byExpiring);

  // charge: false for the automatic first batch, which shouldn't use up a weekly refresh.
  const genIdeas = async (charge = true) => {
    if (busy) return;
    if (charge && !s.plus && s.ideasLeft <= 0) return openGate('ideas');
    setBusy('ideas');
    try {
      const ideas = await fetchIdeas(s);
      if (!ideas.length) return showToast('No new ideas for what you have right now');
      // The weekly allowance only counts refreshes that worked.
      set((st) => ({ ...replaceIdeas(st, ideas), ideasLeft: st.plus || !charge ? st.ideasLeft : st.ideasLeft - 1 }));
      setFilter('expiring');
      showToast(ideas.length === 1 ? '1 new idea' : `${ideas.length} new ideas`);
    } catch {
      showToast('Couldn’t get ideas. Check your connection.');
    } finally {
      setBusy(null);
    }
  };

  // First visit with no recipes: fetch a batch on the house.
  const autoFetched = useRef(false);
  useEffect(() => {
    if (autoFetched.current || s.recipes.length || !s.items.length) return;
    autoFetched.current = true;
    genIdeas(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same path as "Share to Shelfly": recipe sites, plus TikTok/Instagram/YouTube captions.
  const addFromLink = () => {
    if (!link) return;
    const url = normalizeUrl(link.url);
    if (!url) return setLink({ ...link, err: 'Paste the link to a recipe page or post.' });
    setLink(null);
    router.push({ pathname: '/import', params: { url } });
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <H1>Cook</H1>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FILTERS.map(([k, label]) => <Pill key={k} label={label} active={filter === k} height={36} size={14.5} onPress={() => setFilter(k)} />)}
        </View>
        <RowBtn icon="refresh" title="New ideas from your kitchen" onPress={() => genIdeas()} busy={busy === 'ideas'}
          right={!s.plus && <T size={13} color={C.muted}>{s.ideasLeft} left this week</T>} />
        <RowBtn icon="link" title="Add a recipe from a link" onPress={() => setLink({ url: '', err: '' })} />
        {cards.map((x) => {
          const t = cardText(x);
          return (
            <Btn key={x.r.id} onPress={() => router.push(`/recipe/${x.r.id}`)} style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' }}>
              <View>
                <RecipePhoto uri={x.r.image} title={x.r.title} height={136} />
                {isIdea(x.r) && !s.saved[x.r.id] && (
                  <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: '#fff', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12 }}>
                    <T size={12} w={600}>New idea</T>
                  </View>
                )}
              </View>
              <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 4 }}>
                <T display size={19}>{x.r.title}</T>
                <T size={13.5} color={C.muted}>{t.meta}</T>
                {!!t.expText && <T size={13.5} w={500} color={C.warn}>{t.expText}</T>}
              </View>
            </Btn>
          );
        })}
        {cards.length === 0 && busy !== 'ideas' && (
          <T color={C.muted} style={{ textAlign: 'center', paddingVertical: 32, paddingHorizontal: 12, lineHeight: 22 }}>
            {filter === 'saved' ? 'No saved recipes yet. Tap the bookmark on a recipe to keep it here.'
              : s.items.length ? 'Tap New ideas to find meals that use what’s in your kitchen.' : 'Add some food first, then Shelfly can suggest meals.'}
          </T>
        )}
      </Screen>

      {link && (
        <Sheet onClose={() => !busy && setLink(null)}>
          <View>
            <T display size={26}>Add a recipe</T>
            <T size={15} color={C.muted} style={{ marginTop: 4 }}>Paste a link to a recipe page, or a TikTok, Instagram or YouTube post. You can also share straight to Shelfly from those apps.</T>
          </View>
          <TextInput value={link.url} onChangeText={(url) => setLink({ url, err: '' })} onSubmitEditing={addFromLink}
            placeholder="https://" placeholderTextColor={C.faint} autoFocus autoCapitalize="none" autoCorrect={false}
            keyboardType="url" returnKeyType="go" editable={!busy}
            style={[S.input, { flex: 0, height: 50, borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 14 }]} />
          {!!link.err && <T size={14} color={C.warn}>{link.err}</T>}
          <BigBtn title="Add recipe" height={56} onPress={addFromLink} bg={link.url.trim() ? C.green : C.faint} />
        </Sheet>
      )}
    </View>
  );
}

// White rounded action row, as in the design's "New ideas" button.
function RowBtn({ icon, title, onPress, right, busy }: { icon: string; title: string; onPress: () => void; right?: ReactNode; busy?: boolean }) {
  return (
    <Btn onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 12, paddingRight: 16 }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
        {busy ? <ActivityIndicator size="small" color={C.green} /> : <Icon name={icon} color={C.green} />}
      </View>
      <T w={600} style={{ flex: 1 }}>{title}</T>
      {right}
    </Btn>
  );
}
