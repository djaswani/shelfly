import { goBack } from '../nav';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateControl } from '../components/DateControl';
import { BigBtn, Btn, Card, CheckCircle, RoundBtn, Screen, T } from '../components/ui';
import { receiptSeed } from '../data/seed';
import { ReceiptRow } from '../data/types';
import { locName, merge, same } from '../logic';
import { useStore } from '../store';
import { C } from '../theme';

const CYCLE = ['fridge', 'freezer', 'pantry'];

export default function Receipt() {
  const [step, setStep] = useState<'camera' | 'confirm'>('camera');
  // TODO: send the photo to the receipt-parsing service; until it exists we show a sample parse.
  return step === 'camera' ? <Camera onCapture={() => setStep('confirm')} /> : <Review onBack={() => setStep('camera')} />;
}

function Camera({ onCapture }: { onCapture: () => void }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const isWeb = Platform.OS === 'web';
  return (
    <View style={{ flex: 1, backgroundColor: '#1A1815' }}>
      {!isWeb && permission?.granted && <CameraView style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} facing="back" />}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <RoundBtn icon="close" size={42} bg="rgba(255,255,255,0.14)" color="#fff" onPress={() => goBack()} label="Close" />
        <T w={600} color="#fff">Scan receipt</T>
        <View style={{ width: 42 }} />
      </View>
      <View style={{ position: 'absolute', top: insets.top + 80, bottom: 150 + insets.bottom, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 250, height: '100%', maxHeight: 520, borderRadius: 20, borderWidth: 2.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
          {!isWeb && permission && !permission.granted ? (
            <>
              <T size={15} color="#E3DDD3" style={{ textAlign: 'center' }}>Larder needs the camera to read receipts.</T>
              <Btn onPress={requestPermission} style={{ height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center' }}>
                <T size={15} w={600}>Allow camera</T>
              </Btn>
            </>
          ) : isWeb ? <T size={13} color="#8A8276" style={{ textAlign: 'center' }}>Camera works in the phone app. Tap the shutter to see a sample receipt.</T> : null}
        </View>
      </View>
      <Btn accessibilityLabel="Capture" onPress={onCapture} style={{ position: 'absolute', bottom: 40 + insets.bottom, alignSelf: 'center', width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)', padding: 4 }}>
        <View style={{ flex: 1, borderRadius: 33, backgroundColor: '#fff' }} />
      </Btn>
    </View>
  );
}

function Review({ onBack }: { onBack: () => void }) {
  const { s, set, showToast } = useStore();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<ReceiptRow[]>(receiptSeed);
  const upd = (id: string, patch: Partial<ReceiptRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const on = rows.filter((r) => r.on);

  const add = () => {
    set((st) => {
      let items = st.items;
      on.forEach((r) => { if (!r.nonFood) items = merge(items, r.name, r.loc, r.qty, r.days); });
      return {
        ...st, items,
        list: st.list.filter((l) => !on.some((r) => same(r.name, l.name))),
        receiptLeft: st.plus ? st.receiptLeft : Math.max(0, st.receiptLeft - 1),
      };
    });
    showToast(`Added ${on.length} items`);
    goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen bottom={120}>
        <RoundBtn icon="arrow_back" onPress={onBack} label="Back" />
        <View>
          <T display size={30}>Review receipt</T>
          <T size={15} color={C.muted} style={{ marginTop: 4 }}>Sample receipt · AI reading not connected yet</T>
        </View>
        <Card>
          {rows.map((r, i) => (
            <View key={r.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.line, backgroundColor: r.unsure ? C.unsureRow : '#fff' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 12 }}>
                <CheckCircle on={r.on} onPress={() => upd(r.id, { on: !r.on })} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  {r.editing ? (
                    <TextInput value={r.name} onChangeText={(v) => upd(r.id, { name: v })} onSubmitEditing={() => upd(r.id, { editing: false, unsure: false })} onBlur={() => upd(r.id, { editing: false, unsure: false })} autoFocus
                      style={{ fontSize: 16, fontFamily: 'Figtree_600SemiBold', color: C.ink, borderBottomWidth: 1.5, borderBottomColor: C.green, paddingVertical: 2 }} />
                  ) : (
                    <T w={600} color={r.on ? C.ink : C.faint}>{r.name}</T>
                  )}
                  <T size={11.5} w={500} color={C.photoText} style={{ marginTop: 3, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }}>{r.raw}</T>
                </View>
                <Btn onPress={() => upd(r.id, { loc: CYCLE[(CYCLE.indexOf(r.loc) + 1) % 3] })} style={{ height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: C.chip, justifyContent: 'center' }}>
                  <T size={13} w={600}>{locName(s, r.loc)}</T>
                </Btn>
              </View>
              {r.days != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12, paddingBottom: 12, paddingLeft: 52 }}>
                  <T size={13.5} color={C.muted} style={{ flex: 1 }}>Good until</T>
                  <DateControl days={r.days} onChange={(v) => upd(r.id, { days: v })} />
                </View>
              )}
              {r.unsure && !r.editing && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12, paddingBottom: 12, paddingLeft: 52 }}>
                  <T size={14} w={500} style={{ flex: 1 }}>Is this {r.name.toLowerCase()}?</T>
                  <Btn onPress={() => upd(r.id, { unsure: false })} style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.green, justifyContent: 'center' }}><T size={14} w={600} color="#fff">Yes</T></Btn>
                  <Btn onPress={() => upd(r.id, { editing: true })} style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center' }}><T size={14} w={600}>Change</T></Btn>
                </View>
              )}
            </View>
          ))}
        </Card>
      </Screen>
      <BigBtn title={`Add ${on.length} items`} height={56} onPress={add} style={{ position: 'absolute', left: 20, right: 20, bottom: 16 + insets.bottom }} />
    </View>
  );
}
