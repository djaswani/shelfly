import { goBack } from '../nav';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { TimePickerSheet, timeText } from '../components/DatePicker';
import { Btn, Card, H1, Icon, RoundBtn, rowBorder, Screen, SectionLabel, T, Toggle } from '../components/ui';
import { shareFile, toCsv, toJson } from '../export';
import { useStore } from '../store';
import { useSync } from '../sync/SyncProvider';
import { notificationsAllowed } from '../notifications';
import { C } from '../theme';

export default function Settings() {
  const { s, set, showToast, reset } = useStore();
  const sync = useSync();
  const [timeOpen, setTimeOpen] = useState(false);
  const me = sync.session?.user.id;
  // Signed in to a household: show its real members. Otherwise the local profile.
  const people = sync.household
    ? sync.members.map((m) => ({ key: m.user_id, i: (m.display_name || '?').slice(0, 2).toUpperCase(), n: m.display_name || 'Member', role: m.user_id === me ? 'You' : 'Member' }))
    : s.members.map((m) => ({ key: m.n, i: m.i, n: m.n, role: m.role }));
  const syncLine = !sync.session ? 'Sign in to share and sync' : !sync.household ? 'Start or join a household'
    : sync.status === 'offline' ? 'Offline, will sync later' : `Synced · ${sync.household.name}`;

  const toggleDigest = async () => {
    if (!s.digest && (await notificationsAllowed(true)) === 'denied' && Platform.OS !== 'web') {
      showToast('Turn on notifications for Larder in iOS Settings');
    }
    set((st) => ({ ...st, digest: !st.digest }));
  };

  // Start from an empty kitchen (new users begin with demo food). Keeps locations and settings.
  const clearKitchen = () => {
    const wipe = () => {
      set((st) => ({ ...st, items: [], list: [], events: [], stats: { used: 0, tossed: 0, cooked: 0 }, saved: {} }));
      showToast('Kitchen cleared');
    };
    const msg = sync.household ? `This removes every item and list entry for everyone in ${sync.household.name}.` : 'This removes every item, your shopping list and your recap history.';
    if (Platform.OS === 'web') return globalThis.confirm?.(msg) && wipe();
    Alert.alert('Clear kitchen?', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: wipe }]);
  };

  return (
    <Screen gap={20} bottom={48}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundBtn icon="arrow_back" onPress={() => goBack()} label="Back" />
        <H1 size={30}>Settings</H1>
      </View>

      <Group label="Household">
        {people.map((m, i) => (
          <View key={m.key} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }, rowBorder(i)]}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: i ? C.warnSoft : C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
              <T size={13} w={700} color={i ? C.warn : C.green}>{m.i}</T>
            </View>
            <T w={500} style={{ flex: 1 }}>{m.n}</T>
            <T size={14} color={C.muted}>{m.role}</T>
          </View>
        ))}
        <Row onPress={() => router.push('/account')} border>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={sync.household ? 'person_add' : 'cloud_sync'} size={20} color={C.green} />
          </View>
          <View style={{ flex: 1 }}>
            <T w={600} color={C.green}>{sync.household ? 'Invite someone' : 'Share this kitchen'}</T>
            <T size={13} color={C.muted} style={{ marginTop: 2 }}>{syncLine}</T>
          </View>
          <Icon name="chevron_right" color={C.faint} />
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
        <Row onPress={toggleDigest}>
          <T style={{ flex: 1 }}>Daily digest</T>
          <Toggle on={s.digest} />
        </Row>
        <Row onPress={() => s.digest && setTimeOpen(true)} border style={{ opacity: s.digest ? 1 : 0.4 }}>
          <T style={{ flex: 1 }}>Time</T>
          <T size={15} color={C.muted}>{timeText(s.digestTime)}</T>
          <Icon name="unfold_more" size={20} color={C.faint} />
        </Row>
      </Group>
      <T size={12.5} color={C.faint} style={{ marginTop: -12, paddingHorizontal: 4 }}>A morning heads-up about food to use that day or the next. Skipped when there&apos;s nothing to say.</T>

      <Group label="Your data">
        <Row onPress={() => shareFile('larder-export.csv', toCsv(s), 'text/csv')}>
          <T style={{ flex: 1 }}>Export as CSV</T>
          <Icon name="download" size={20} color={C.muted} />
        </Row>
        <Row onPress={() => shareFile('larder-export.json', toJson(s), 'application/json')} border>
          <T style={{ flex: 1 }}>Export as JSON</T>
          <Icon name="download" size={20} color={C.muted} />
        </Row>
        <Row onPress={clearKitchen} border>
          <T style={{ flex: 1 }} color={C.warn}>Clear kitchen</T>
          <Icon name="delete_outline" size={20} color={C.warn} />
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
        <Row onPress={() => router.push('/help')} border>
          <T style={{ flex: 1 }}>Help &amp; FAQ</T>
          <Icon name="chevron_right" color={C.faint} />
        </Row>
      </Card>

      {__DEV__ && (
        <Btn onPress={() => { reset(); showToast('Demo data restored'); }} style={{ height: 50, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <T w={600} color={C.muted}>Reset demo data (dev only)</T>
        </Btn>
      )}
      {timeOpen && <TimePickerSheet title="Digest time" minutes={s.digestTime} onPick={(m) => set((st) => ({ ...st, digestTime: m }))} onClose={() => setTimeOpen(false)} />}
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
