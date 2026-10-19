import { goBack } from '../nav';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Btn, H1, RoundBtn, Screen, T } from '../components/ui';
import { monthName } from '../dates';
import { joinNames, monthRecap } from '../logic';
import { useStore } from '../store';
import { C } from '../theme';

// Rough value of one item used before it went bad (design figure until we price receipts).
const PER_ITEM = 1.36;
const BAR_MAX = 96;

export default function Recap() {
  const { s } = useStore();
  const r = monthRecap(s);
  const saved = Math.round(r.used * PER_ITEM);
  const top = Math.max(1, ...r.weeks.flatMap((w) => [w.used, w.tossed]));
  const bar = (v: number) => (v ? Math.max(4, Math.round((v / top) * BAR_MAX)) : 2);
  const box = { backgroundColor: '#fff', borderRadius: 22 } as const;

  return (
    <Screen bottom={48}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundBtn icon="arrow_back" onPress={() => goBack()} label="Back" />
        <H1 size={30}>{monthName()}</H1>
      </View>
      <View style={[box, { paddingVertical: 22, paddingHorizontal: 20 }]}>
        <T display size={58} color={C.green} style={{ lineHeight: 60 }}>${saved}</T>
        <T size={15} color={C.muted} style={{ marginTop: 6 }}>estimated savings this month</T>
        <View style={{ flexDirection: 'row', marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: C.line }}>
          {[[r.used, 'Used in time'], [r.tossed, 'Tossed'], [r.cooked, 'Meals cooked']].map(([v, l]) => (
            <View key={l} style={{ flex: 1 }}>
              <T size={24} w={700}>{v}</T>
              <T size={13} color={C.muted} style={{ marginTop: 2 }}>{l}</T>
            </View>
          ))}
        </View>
      </View>
      <View style={[box, { paddingVertical: 18, paddingHorizontal: 20 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <T w={600}>By week</T>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Legend color={C.green} label="Used" />
            <Legend color={C.tossed} label="Tossed" />
          </View>
        </View>
        {!r.used && !r.tossed && <T size={13.5} color={C.muted} style={{ marginBottom: 8 }}>Tap Used up or Tossed on an item and it shows up here.</T>}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120 }}>
          {r.weeks.map((w) => (
            <View key={w.label} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 96 }}>
                <View style={{ width: 22, height: bar(w.used), borderRadius: 6, backgroundColor: C.green }} />
                <View style={{ width: 22, height: bar(w.tossed), borderRadius: 6, backgroundColor: C.tossed }} />
              </View>
              <T size={12.5} color={C.muted}>{w.label}</T>
            </View>
          ))}
        </View>
      </View>
      <View style={[box, { paddingVertical: 16, paddingHorizontal: 20 }]}>
        <T w={600} style={{ marginBottom: 6 }}>Tossed</T>
        <T size={15} color={C.muted} style={{ lineHeight: 22 }}>{r.tossedNames.length ? joinNames(r.tossedNames) : 'Nothing yet this month. Nice.'}</T>
      </View>
      <View style={{ backgroundColor: C.ink, borderRadius: 22, padding: 20, gap: 12 }}>
        <T display size={22} color="#fff">Larder Plus</T>
        <T size={15} color="#E3DDD3" style={{ lineHeight: 22 }}>{s.plus ? 'Plus is active. Thanks for supporting Larder.' : `You saved about $${saved} this month. A year of Plus is $24.99.`}</T>
        <Btn onPress={() => router.push('/plus')} style={{ height: 48, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <T size={15} w={700}>{s.plus ? 'Manage plan' : 'Try free for 30 days'}</T>
        </Btn>
      </View>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <T size={12.5} color={C.muted}>{label}</T>
    </View>
  );
}
