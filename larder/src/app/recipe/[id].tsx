import { goBack } from '../../nav';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sheet } from '../../components/Sheet';
import { BigBtn, Btn, Card, Icon, RecipePhoto, RoundBtn, rowBorder, T } from '../../components/ui';
import { Level, LEVELS } from '../../data/types';
import { addToList, aisleOf, confirmed, logEvent, dayText, itemDays, levelText, nextLevel, same } from '../../logic';
import { findRecipe, isIdea, metaText, recipeView } from '../../recipes';
import { useStore } from '../../store';
import { C } from '../../theme';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { s, set, showToast } = useStore();
  const insets = useSafeAreaInsets();
  const [deduct, setDeduct] = useState<Record<string, number | Level> | null>(null);
  const R = findRecipe(s, id ?? '');
  if (!R) return null;
  const x = recipeView(s, R);
  const saved = !!s.saved[R.id];
  const meta = metaText(R);

  // Saving an idea keeps it: it stops being replaced by the next batch of ideas.
  const toggleSave = () => {
    set((st) => ({
      ...st,
      saved: { ...st.saved, [R.id]: !saved },
      recipes: !saved && isIdea(R) ? st.recipes.map((r) => (r.id === R.id ? { ...r, origin: 'saved' as const } : r)) : st.recipes,
    }));
    showToast(!saved ? 'Saved' : 'Removed from saved');
  };

  const remove = () => {
    const go = () => {
      goBack();
      set((st) => {
        const { [R.id]: _, ...rest } = st.saved;
        return { ...st, recipes: st.recipes.filter((r) => r.id !== R.id), saved: rest };
      });
      showToast('Recipe removed');
    };
    if (Platform.OS === 'web') return globalThis.confirm?.(`Remove ${R.title}?`) && go();
    Alert.alert('Remove recipe?', R.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  // Cook-to-deduct: propose a new level/count for each ingredient on hand.
  const openDeduct = () => {
    const d: Record<string, number | Level> = {};
    x.ings.forEach(({ g, it, have }) => {
      if (!it || !have || it.id in d) return;
      if (it.count != null) d[it.id] = Math.max(0, it.count - (g.use || 1));
      else d[it.id] = it.staple ? it.level : nextLevel(it.level);
    });
    setDeduct(d);
  };
  const applyDeduct = () => {
    if (!deduct) return;
    set((st) => logEvent({
      ...st,
      items: st.items.map((i) => (i.id in deduct
        ? (i.count != null ? { ...i, count: deduct[i.id] as number, ...confirmed() } : { ...i, level: deduct[i.id] as Level, ...confirmed() })
        : i)),
    }, 'cooked', R.title));
    setDeduct(null);
    showToast('Kitchen updated');
    goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View>
          <RecipePhoto uri={R.image} title={R.title} height={280} />
          <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}><RoundBtn icon="arrow_back" size={42} bg="#fff" onPress={() => goBack()} label="Back" /></View>
          <View style={{ position: 'absolute', top: insets.top + 8, right: 16 }}><RoundBtn icon={saved ? 'bookmark' : 'bookmark_border'} size={42} bg="#fff" onPress={toggleSave} label={saved ? 'Unsave' : 'Save'} /></View>
        </View>
        <View style={{ padding: 20, gap: 20 }}>
          <View>
            <T display size={30} style={{ lineHeight: 33 }}>{R.title}</T>
            {!!meta && <T size={15} color={C.muted} style={{ marginTop: 6 }}>{meta}</T>}
            {R.source && (
              <Btn onPress={() => Linking.openURL(R.source!.url).catch(() => showToast('Couldn’t open the link'))} accessibilityRole="link"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start' }}>
                <T size={15} w={600} color={C.green}>From {R.source.name}</T>
                <Icon name="open_in_new" size={16} color={C.green} />
              </Btn>
            )}
          </View>
          {x.exp.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {x.exp.map((e) => (
                <View key={e.it!.id} style={{ backgroundColor: C.warnChipBg, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 14 }}>
                  <T size={14} w={600} color={C.warnChipText}>{e.it!.name} · {dayText(itemDays(e.it!)).toLowerCase()}</T>
                </View>
              ))}
            </View>
          )}
          <View style={{ gap: 10 }}>
            <T size={18} w={700}>Ingredients</T>
            <Card>
              {x.ings.map((ing, i) => {
                const name = ing.g.name || ing.it?.name || '';
                const onList = s.list.some((l) => same(l.name, name));
                return (
                  <View key={name + i} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 14, minHeight: 54 }, rowBorder(i)]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T w={500}>{name}</T>
                      {!!ing.g.amt && <T size={13} color={C.muted} style={{ marginTop: 2 }}>{ing.g.amt}</T>}
                    </View>
                    {ing.have ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="check" size={17} color={C.green} />
                        <T size={13} w={600} color={C.green}>{levelText(ing.it!)}</T>
                      </View>
                    ) : onList ? (
                      <T size={13} w={600} color={C.muted}>On list</T>
                    ) : (
                      <Btn onPress={() => { set((st) => addToList(st, name, ing.it?.aisle ?? aisleOf(name))); showToast(name + ' added to list'); }}
                        style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: C.chip, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="add" size={17} />
                        <T size={13} w={600}>List</T>
                      </Btn>
                    )}
                  </View>
                );
              })}
            </Card>
          </View>
          <View style={{ gap: 12 }}>
            <T size={18} w={700}>Steps</T>
            {R.steps.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <T size={14} w={700} color="#fff">{i + 1}</T>
                </View>
                <T style={{ flex: 1, lineHeight: 24, paddingTop: 2 }}>{t}</T>
              </View>
            ))}
          </View>
          {!isIdea(R) && (
            <Btn onPress={remove} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48 }}>
              <Icon name="delete_outline" size={20} color={C.warn} />
              <T w={600} color={C.warn}>Remove recipe</T>
            </Btn>
          )}
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16 + insets.bottom, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line }}>
        <BigBtn title="I cooked this" icon="skillet" height={56} onPress={openDeduct} />
      </View>

      {deduct && (
        <Sheet onClose={() => setDeduct(null)}>
          <View>
            <T display size={26}>Update kitchen</T>
            <T size={15} color={C.muted} style={{ marginTop: 4 }}>{R.title}</T>
          </View>
          <ScrollView style={{ backgroundColor: '#fff', borderRadius: 20, flexGrow: 0 }}>
            {x.ings.filter((g) => g.have && g.it && g.it.id in deduct).map((g, i) => {
              const it = g.it!;
              const v = deduct[it.id];
              const setV = (nv: number | Level) => setDeduct((d) => ({ ...d!, [it.id]: nv }));
              return (
                <View key={it.id} style={[{ gap: 10, paddingVertical: 13, paddingHorizontal: 16 }, rowBorder(i)]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <T w={600}>{it.name}</T>
                    <T size={13} color={C.muted}>was {it.count != null ? `${it.count} ${it.unit}` : it.level.toLowerCase()}</T>
                  </View>
                  {it.count == null ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {LEVELS.map((l) => (
                        <Btn key={l} onPress={() => setV(l)} style={{ flex: 1, height: 34, borderRadius: 10, backgroundColor: v === l ? C.ink : C.chip, alignItems: 'center', justifyContent: 'center' }}>
                          <T size={14} w={600} color={v === l ? '#fff' : C.ink}>{l}</T>
                        </Btn>
                      ))}
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <RoundBtn icon="remove" size={34} bg={C.chip} iconSize={20} label="Less" onPress={() => setV(Math.max(0, (v as number) - 1))} />
                      <T size={15} w={600} style={{ minWidth: 70, textAlign: 'center' }}>{v} {it.unit}</T>
                      <RoundBtn icon="add" size={34} bg={C.chip} iconSize={20} label="More" onPress={() => setV((v as number) + 1)} />
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <BigBtn title="Update" height={56} onPress={applyDeduct} />
        </Sheet>
      )}
    </View>
  );
}
