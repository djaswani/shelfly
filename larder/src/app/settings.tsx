import { goBack } from '../nav';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { View } from 'react-native';
import { Btn, Card, H1, Icon, RoundBtn, rowBorder, Screen, SectionLabel, T, Toggle } from '../components/ui';
import { shareFile, toCsv, toJson } from '../export';
import { useStore } from '../store';
import { C } from '../theme';

const TIMES = ['8:00 AM', '12:00 PM', '5:30 PM'];

export default function Settings() {
  const { s, set, showToast, reset } = useStore();

  const invite = () => {
    if (!s.plus && s.members.length >= 2) return showToast('Free plan includes 2 members');
    // TODO: real invites need accounts + household sync (Supabase).
    showToast('Invites need accounts, coming with sync');
  };

  return (
    <Screen gap={20} bottom={48}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundBtn icon="arrow_back" onPress={() => goBack()} label="Back" />
        <H1 size={30}>Settings</H1>
      </View>

      <Group label="Household">
        {s.members.map((m, i) => (
          <View key={m.n} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }, rowBorder(i)]}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: i ? C.warnSoft : C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
              <T size={13} w={700} color={i ? C.warn : C.green}>{m.i}</T>
            </View>
            <T w={500} style={{ flex: 1 }}>{m.n}</T>
            <T size={14} color={C.muted}>{m.role}</T>
          </View>
        ))}
        <Row onPress={invite} border>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="person_add" size={20} color={C.green} />
          </View>
          <T w={600} color={C.green} style={{ flex: 1 }}>Invite someone</T>
        </Row>
      </Group>

      <Group label="Locations">
        {s.locs.map((l, i) => (
          <View key={l.id} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }, rowBorder(i)]}>
            <T style={{ flex: 1 }}>{l.name}</T>
            <T size={14} color={C.muted}>{s.items.filter((x) => x.loc === l.id).length} items</T>
          </View>
        ))}
        <Row onPress={() => { goBack(); router.navigate({ pathname: '/kitchen', params: { addLoc: '1' } }); }} border>
          <Icon name="add" size={20} color={C.green} />
          <T w={600} color={C.green}>Add location</T>
        </Row>
      </Group>

      <Group label="Notifications">
        <Row onPress={() => set((st) => ({ ...st, digest: !st.digest }))}>
          <T style={{ flex: 1 }}>Daily digest</T>
          <Toggle on={s.digest} />
        </Row>
        <Row onPress={() => s.digest && set((st) => ({ ...st, digestTime: (st.digestTime + 1) % 3 }))} border style={{ opacity: s.digest ? 1 : 0.4 }}>
          <T style={{ flex: 1 }}>Time</T>
          <T size={15} color={C.muted}>{TIMES[s.digestTime]}</T>
          <Icon name="unfold_more" size={20} color={C.faint} />
        </Row>
      </Group>

      <Group label="Your data">
        <Row onPress={() => shareFile('larder-export.csv', toCsv(s), 'text/csv')}>
          <T style={{ flex: 1 }}>Export as CSV</T>
          <Icon name="download" size={20} color={C.muted} />
        </Row>
        <Row onPress={() => shareFile('larder-export.json', toJson(s), 'application/json')} border>
          <T style={{ flex: 1 }}>Export as JSON</T>
          <Icon name="download" size={20} color={C.muted} />
        </Row>
      </Group>

      <Card>
        <Row onPress={() => router.push('/recap')}>
          <T style={{ flex: 1 }}>Monthly recap</T>
          <Icon name="chevron_right" color={C.faint} />
        </Row>
        <Row onPress={() => router.push('/plus')} border>
          <T style={{ flex: 1 }}>Larder Plus</T>
          <T size={14} color={C.muted}>{s.plus ? 'Active' : ''}</T>
          <Icon name="chevron_right" color={C.faint} />
        </Row>
        <Row onPress={() => showToast('Help is coming soon')} border>
          <T style={{ flex: 1 }}>Help &amp; FAQ</T>
          <Icon name="chevron_right" color={C.faint} />
        </Row>
      </Card>

      {/* Stands in for "Sign out" until accounts exist. */}
      <Btn onPress={() => { reset(); showToast('Demo data restored'); }} style={{ height: 50, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <T w={600} color={C.warn}>Reset demo data</T>
      </Btn>
    </Screen>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{label}</SectionLabel>
      <Card>{children}</Card>
    </View>
  );
}

function Row({ children, onPress, border, style }: { children: ReactNode; onPress?: () => void; border?: boolean; style?: object }) {
  return (
    <Btn onPress={onPress} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }, border && { borderTopWidth: 1, borderTopColor: C.line }, style]}>
      {children}
    </Btn>
  );
}
