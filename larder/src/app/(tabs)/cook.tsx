import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Btn, H1, Icon, PhotoPlaceholder, Pill, Screen, T } from '../../components/ui';
import { byExpiring, cardText, visibleRecipes } from '../../recipes';
import { useStore } from '../../store';
import { C } from '../../theme';

type Filter = 'expiring' | 'quick' | 'saved';
const FILTERS: [Filter, string][] = [['expiring', 'Use it up'], ['quick', 'Quickest'], ['saved', 'Saved']];

export default function Cook() {
  const { s, set, showToast } = useStore();
  const [filter, setFilter] = useState<Filter>('expiring');

  let cards = visibleRecipes(s);
  if (filter === 'saved') cards = cards.filter((x) => s.saved[x.r.id]);
  cards.sort(filter === 'quick' ? (a, b) => a.r.time - b.r.time : byExpiring);

  // Stand-in for AI recipe generation: reveals the next batch of prewritten ideas.
  const genIdeas = () => {
    if (!s.plus && s.ideasLeft <= 0) return showToast('New ideas reset Monday');
    set((st) => ({ ...st, ideasLeft: st.plus ? st.ideasLeft : st.ideasLeft - 1, genShown: 1 }));
    setFilter('expiring');
    showToast(s.genShown ? 'Ideas refreshed' : '2 new ideas');
  };

  return (
    <Screen>
      <H1>Cook</H1>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FILTERS.map(([k, label]) => <Pill key={k} label={label} active={filter === k} height={36} size={14.5} onPress={() => setFilter(k)} />)}
      </View>
      <Btn onPress={genIdeas} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 12, paddingRight: 16 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="refresh" color={C.green} />
        </View>
        <T w={600} style={{ flex: 1 }}>New ideas from your kitchen</T>
        {!s.plus && <T size={13} color={C.muted}>{s.ideasLeft} left this week</T>}
      </Btn>
      {cards.map((x) => {
        const t = cardText(x);
        return (
          <Btn key={x.r.id} onPress={() => router.push(`/recipe/${x.r.id}`)} style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' }}>
            <View>
              <PhotoPlaceholder height={136} />
              {x.r.idea && !s.saved[x.r.id] && (
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
      {cards.length === 0 && <T color={C.muted} style={{ textAlign: 'center', paddingVertical: 32 }}>No saved recipes yet.</T>}
    </Screen>
  );
}
