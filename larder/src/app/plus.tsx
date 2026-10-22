import { goBack } from '../nav';
import { useState } from 'react';
import { View } from 'react-native';
import { BigBtn, Btn, H1, Icon, RoundBtn, Screen, T } from '../components/ui';
import { Plan } from '../data/types';
import { useStore } from '../store';
import { C } from '../theme';

const FEATURES = ['Unlimited receipt scans', 'Add food from a fridge photo', 'Unlimited recipe ideas, diet and time filters', 'Restock predictions', 'Up to 6 members, plus a second household', 'Full savings history'];
const PLANS: { k: Plan; name: string; price: string; note: string }[] = [
  { k: 'year', name: 'Yearly', price: '$24.99/yr', note: '$2.08 a month' },
  { k: 'month', name: 'Monthly', price: '$3.99/mo', note: '' },
  { k: 'life', name: 'Lifetime', price: '$59.99', note: 'One time' },
];

export default function Plus() {
  const { s, set, showToast } = useStore();
  const [plan, setPlan] = useState<Plan>('year');

  // TODO: real purchases go through RevenueCat. Until then this only flips the local flag (dev builds only).
  const buy = () => {
    if (!__DEV__) return showToast('Purchases aren’t set up yet');
    set((st) => ({ ...st, plus: true }));
    showToast('Shelfly Plus is on (test mode)');
    goBack();
  };

  return (
    <Screen gap={18} bottom={40}>
      <RoundBtn icon="close" onPress={() => goBack()} label="Close" />
      <H1>Shelfly Plus</H1>
      <View style={{ gap: 12 }}>
        {FEATURES.map((f) => (
          <View key={f} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="check" color={C.green} />
            <T>{f}</T>
          </View>
        ))}
      </View>
      <View style={{ gap: 10, marginTop: 4 }}>
        {PLANS.map((p) => {
          const on = plan === p.k;
          return (
            <Btn key={p.k} onPress={() => setPlan(p.k)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: on ? C.green : C.meterOff }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.green : C.meterOff, alignItems: 'center', justifyContent: 'center' }}>
                {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.green }} />}
              </View>
              <T w={600} style={{ flex: 1 }}>{p.name}</T>
              <View style={{ alignItems: 'flex-end' }}>
                <T w={600}>{p.price}</T>
                {!!p.note && <T size={13} color={C.muted}>{p.note}</T>}
              </View>
            </Btn>
          );
        })}
      </View>
      <BigBtn title={s.plus ? 'Plus is active' : plan === 'life' ? 'Buy lifetime' : 'Start 30-day free trial'} height={56} onPress={buy} style={{ marginTop: 4 }} />
      <Btn onPress={() => showToast('No purchases found')} style={{ alignItems: 'center' }}>
        <T size={14} w={500} color={C.muted}>Restore purchase</T>
      </Btn>
    </Screen>
  );
}
