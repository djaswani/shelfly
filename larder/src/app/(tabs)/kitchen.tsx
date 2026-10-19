import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { ItemRow } from '../../components/ItemRow';
import { Btn, Card, H1, Icon, Pill, S, Screen, T } from '../../components/ui';
import { isOut, itemDays, uid } from '../../logic';
import { useStore } from '../../store';
import { C } from '../../theme';

export default function Kitchen() {
  const { s, set } = useStore();
  const params = useLocalSearchParams<{ addLoc?: string }>();
  const [loc, setLoc] = useState('fridge');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLoc, setNewLoc] = useState('');

  // Settings → "Add location" lands here with ?addLoc=1
  const showAdd = adding || params.addLoc === '1';

  const raw = q ? s.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())) : s.items.filter((i) => i.loc === loc);
  const items = raw.slice().sort((a, b) =>
    Number(isOut(a)) - Number(isOut(b)) || (itemDays(a) ?? 9999) - (itemDays(b) ?? 9999) || a.name.localeCompare(b.name));

  const saveLoc = () => {
    const name = newLoc.trim();
    setAdding(false);
    setNewLoc('');
    if (params.addLoc) router.setParams({ addLoc: undefined });
    if (!name) return;
    const id = uid('loc');
    set((st) => ({ ...st, locs: [...st.locs, { id, name }] }));
    setLoc(id);
    setQ('');
  };

  return (
    <Screen>
      <H1>Kitchen</H1>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.search, borderRadius: 14, paddingHorizontal: 12, height: 44 }}>
        <Icon name="search" size={21} color={C.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search everything" placeholderTextColor={C.faint} style={S.input} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {s.locs.map((l) => {
          const act = !q && l.id === loc;
          return (
            <Pill key={l.id} label={l.name} active={act} onPress={() => { setLoc(l.id); setQ(''); }}
              extra={<T size={15} w={500} color={act ? '#fff' : C.ink} style={{ opacity: 0.75 }}>{s.items.filter((i) => i.loc === l.id).length}</T>} />
          );
        })}
        {showAdd ? (
          <View style={{ height: 38, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 14, paddingRight: 4, borderRadius: 19, backgroundColor: '#fff' }}>
            <TextInput value={newLoc} onChangeText={setNewLoc} onSubmitEditing={saveLoc} autoFocus placeholder="Name" placeholderTextColor={C.faint} style={[S.input, { width: 110, flex: 0, fontSize: 15 }]} />
            <Btn onPress={saveLoc} accessibilityLabel="Save location" style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={18} color="#fff" />
            </Btn>
          </View>
        ) : (
          <Btn onPress={() => { setAdding(true); setNewLoc(''); }} accessibilityLabel="Add location" style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9C0B2', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="add" size={20} color={C.muted} />
          </Btn>
        )}
      </ScrollView>
      {items.length ? (
        <Card>{items.map((it, i) => <ItemRow key={it.id} it={it} index={i} withLoc={!!q} />)}</Card>
      ) : (
        <View style={{ paddingVertical: 48, alignItems: 'center', gap: 14 }}>
          <T color={C.muted}>Nothing here yet</T>
          <Btn onPress={() => router.push('/add')} style={{ height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: C.green, justifyContent: 'center' }}>
            <T size={15} w={600} color="#fff">Add food</T>
          </Btn>
        </View>
      )}
    </Screen>
  );
}
