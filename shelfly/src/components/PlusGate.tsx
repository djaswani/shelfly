import { router } from 'expo-router';
import { Modal, View } from 'react-native';
import { nextMonthStart } from '../dates';
import { useStore } from '../store';
import { C } from '../theme';
import { Sheet } from './Sheet';
import { Btn, Icon, RoundBtn, T } from './ui';

export type GateKind = 'receipt' | 'ideas';

// Only perks that exist today. Add restock predictions, fridge photos etc. when they ship.
const PERKS = ['Unlimited receipt scans', 'Unlimited recipe ideas', 'Up to 6 people in one kitchen'];

// The design's "Plus limit" sheet: shown when a free allowance runs out, instead of a dead end.
// In a Modal so it also covers full-screen modals like Add food.
export function PlusGate() {
  const { gate, openGate } = useStore();
  if (!gate) return null;
  const close = () => openGate(null);
  const g = {
    receipt: {
      icon: 'receipt_long', title: 'You’ve used this month’s receipt scans', n: 5, used: '5 of 5 used this month', perk: 0,
      body: `Free receipt scans come back on ${nextMonthStart()}. Scanning barcodes and typing items are always free.`,
      alt: 'Scan a barcode instead', onAlt: () => { close(); router.push('/scan'); },
    },
    ideas: {
      icon: 'refresh', title: 'You’ve used this week’s recipe ideas', n: 5, used: '5 of 5 used this week', perk: 1,
      body: 'New ideas come back on Monday. Your saved recipes and the Use it up list still work.',
      alt: 'Not now', onAlt: close,
    },
  }[gate];
  const perks = [PERKS[g.perk], ...PERKS.filter((_, i) => i !== g.perk)];

  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <Sheet onClose={close} z={47} style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={g.icon} size={28} color={C.green} />
          </View>
          <RoundBtn icon="close" size={36} iconSize={20} onPress={close} label="Close" />
        </View>
        <View style={{ gap: 8 }}>
          <T display size={27} style={{ lineHeight: 30 }}>{g.title}</T>
          <T size={15.5} color={C.muted} style={{ lineHeight: 23 }}>{g.body}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16 }}>
          <T size={15} w={600}>{g.used}</T>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {Array.from({ length: g.n }, (_, i) => <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.ink }} />)}
          </View>
        </View>
        <View style={{ gap: 10, paddingHorizontal: 2 }}>
          <T size={13} w={600} color={C.muted}>Shelfly Plus also includes</T>
          {perks.map((p, i) => (
            <View key={p} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Icon name="check" size={20} color={C.green} />
              <T size={15.5} w={i ? 400 : 600}>{p}</T>
            </View>
          ))}
        </View>
        <View style={{ gap: 8, marginTop: 4 }}>
          <Btn onPress={() => { close(); router.push('/plus'); }} style={{ height: 56, borderRadius: 16, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
            <T size={17} w={600} color="#fff">Try Plus free for 30 days</T>
          </Btn>
          <Btn onPress={g.onAlt} style={{ height: 50, borderRadius: 16, backgroundColor: C.btnSoft, alignItems: 'center', justifyContent: 'center' }}>
            <T w={600}>{g.alt}</T>
          </Btn>
          <T size={13} color={C.muted} style={{ textAlign: 'center', marginTop: 2 }}>Then $24.99 a year. Cancel anytime.</T>
        </View>
      </Sheet>
    </Modal>
  );
}
