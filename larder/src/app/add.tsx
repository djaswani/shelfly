import { goBack } from '../nav';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateControl } from '../components/DateControl';
import { Sheet } from '../components/Sheet';
import { BigBtn, Btn, Icon, Pill, RoundBtn, rowBorder, S, Screen, Segment, shadow, T } from '../components/ui';
import { isoIn } from '../dates';
import { QUICK } from '../data/seed';
import { buy, capitalize, defDays, locName, mk } from '../logic';
import { useStore } from '../store';
import { C } from '../theme';

export default function Add() {
  const { s, set, showToast, openReceipt } = useStore();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ leftover?: string }>();
  const [sel, setSel] = useState<Record<string, number>>({}); // name → days until expiry
  const [loc, setLoc] = useState('fridge');
  const [text, setText] = useState('');
  const [leftoverOpen, setLeftoverOpen] = useState(!!params.leftover);
  const names = Object.keys(sel);

  const toggle = (n: string) => setSel((a) => {
    const b = { ...a };
    if (b[n] != null) delete b[n]; else b[n] = defDays(n, loc);
    return b;
  });
  const addTyped = () => {
    const t = text.trim();
    if (!t) return;
    const name = capitalize(t);
    setSel((a) => ({ ...a, [name]: defDays(name, loc) }));
    setText('');
  };
  const commit = () => {
    set((st) => names.reduce((acc, n) => buy(acc, n, loc, 1, sel[n]), st));
    showToast(`Added ${names.length} item${names.length > 1 ? 's' : ''}`);
    goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen gap={18} bottom={names.length ? 380 : 40}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T display size={32}>Add food</T>
          <RoundBtn icon="close" onPress={() => goBack()} label="Close" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn onPress={() => router.push('/scan')} style={{ flex: 1, backgroundColor: C.green, borderRadius: 20, padding: 16, height: 118, justifyContent: 'space-between' }}>
            <Icon name="barcode_scanner" size={30} color="#fff" />
            <T w={600} color="#fff">Scan barcode</T>
          </Btn>
          <Btn onPress={openReceipt} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, height: 118, justifyContent: 'space-between' }}>
            <Icon name="receipt_long" size={30} color={C.green} />
            <View style={{ gap: 2 }}>
              <T w={600}>Scan receipt</T>
              <T size={12.5} color={C.muted}>{s.plus ? 'Unlimited' : `${s.receiptLeft} of 5 left this month`}</T>
            </View>
          </Btn>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingLeft: 14, paddingRight: 6, height: 48 }}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={addTyped} placeholder="Type an item" placeholderTextColor={C.faint} style={S.input} />
          <Btn onPress={addTyped} accessibilityLabel="Add typed item" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="add" color="#fff" />
          </Btn>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, alignItems: 'center' }}>
          <T size={14} w={600} color={C.muted} style={{ marginRight: 2 }}>Put in</T>
          {s.locs.map((l) => <Pill key={l.id} label={l.name} active={l.id === loc} height={34} size={14} onPress={() => setLoc(l.id)} />)}
        </ScrollView>
        <Btn onPress={() => setLeftoverOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.warnSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="takeout_dining" color={C.warn} />
          </View>
          <T w={600} style={{ flex: 1 }}>Leftovers</T>
          <Icon name="chevron_right" color={C.faint} />
        </Btn>
        {QUICK.map((g) => (
          <View key={g.title} style={{ gap: 10 }}>
            <T size={14} w={600} color={C.muted}>{g.title}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {g.items.map((n) => {
                const on = sel[n] != null;
                return (
                  <Btn key={n} onPress={() => toggle(n)} style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1.5, borderColor: on ? C.green : C.meterOff, backgroundColor: on ? C.green : '#fff', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {on && <Icon name="check" size={17} color="#fff" />}
                    <T size={15} w={500} color={on ? '#fff' : C.ink}>{n}</T>
                  </Btn>
                );
              })}
            </View>
          </View>
        ))}
      </Screen>

      {names.length > 0 && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20 + insets.bottom, gap: 8, ...shadow(0.1, 24, -6) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T size={15} w={600}>{names.length} selected</T>
            <Btn onPress={() => setSel({})}><T size={14} w={600} color={C.muted}>Clear</T></Btn>
          </View>
          <ScrollView style={{ maxHeight: 186 }}>
            {names.map((n, i) => (
              <View key={n} style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }, rowBorder(i)]}>
                <T w={500} numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{n}</T>
                <DateControl days={sel[n]} onChange={(v) => setSel((a) => ({ ...a, [n]: v }))} />
                <Btn accessibilityLabel={`Remove ${n}`} onPress={() => toggle(n)} style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={20} color={C.faint} />
                </Btn>
              </View>
            ))}
          </ScrollView>
          <BigBtn title={`Add ${names.length} item${names.length > 1 ? 's' : ''} to ${locName(s, loc)}`} bg={C.ink} onPress={commit} style={{ marginTop: 4 }} />
        </View>
      )}

      {leftoverOpen && <LeftoverSheet onClose={() => setLeftoverOpen(false)} />}
    </View>
  );
}

function LeftoverSheet({ onClose }: { onClose: () => void }) {
  const { set, showToast } = useStore();
  const [name, setName] = useState('');
  const [madeAgo, setMadeAgo] = useState(0);
  const [loc, setLoc] = useState<'fridge' | 'freezer'>('fridge');
  const [days, setDays] = useState<number | null>(null);
  const shownDays = days ?? (loc === 'freezer' ? 60 : Math.max(0, 4 - madeAgo));

  const save = () => {
    const n = name.trim() || 'Leftovers';
    set((st) => ({ ...st, items: [...st.items, mk(n, loc, { leftover: true, made: isoIn(-madeAgo), expires: isoIn(shownDays), level: 'Full' })] }));
    showToast(n + ' saved');
    goBack();
  };

  return (
    <Sheet onClose={onClose} style={{ gap: 16 }}>
      <T display size={26}>Leftovers</T>
      <TextInput value={name} onChangeText={setName} placeholder="What is it?" placeholderTextColor={C.faint} style={[S.input, { flex: 0, height: 50, borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 14 }]} />
      <View style={{ gap: 8 }}>
        <T size={14} w={600} color={C.muted}>Made</T>
        <Segment opts={[{ v: 0, label: 'Today' }, { v: 1, label: 'Yesterday' }, { v: 2, label: '2 days ago' }]} value={madeAgo} onPick={(v) => { setMadeAgo(v); setDays(null); }} />
      </View>
      <View style={{ gap: 8 }}>
        <T size={14} w={600} color={C.muted}>Put in</T>
        <Segment opts={[{ v: 'fridge' as const, label: 'Fridge' }, { v: 'freezer' as const, label: 'Freezer' }]} value={loc} onPick={(v) => { setLoc(v); setDays(null); }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, padding: 9, paddingLeft: 14 }}>
        <T size={15} w={600}>Good until</T>
        <DateControl days={shownDays} onChange={setDays} />
      </View>
      <BigBtn title="Save leftovers" onPress={save} style={{ marginTop: 4 }} />
    </Sheet>
  );
}
