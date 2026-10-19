import { closeAll, goBack } from '../nav';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateControl } from '../components/DateControl';
import { Sheet } from '../components/Sheet';
import { BigBtn, Btn, Card, CheckCircle, Icon, RoundBtn, S, Screen, T } from '../components/ui';
import { receiptSample } from '../data/seed';
import { ReceiptRow } from '../data/types';
import { locName, merge, same } from '../logic';
import { readReceiptText, ocrAvailable } from '../receipt/ocr';
import { learnFrom, parseReceipt, ParsedReceipt } from '../receipt/parse';
import { useStore } from '../store';
import { C } from '../theme';

const CYCLE = ['fridge', 'freezer', 'pantry'];

export default function Receipt() {
  const { s, showToast } = useStore();
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);

  const fromText = (text: string) => {
    const p = parseReceipt(text, { knownNames: s.items.map((i) => i.name), memory: s.receiptMemory });
    if (!p.rows.length) {
      showToast('No items found. Try again with the receipt flat and well lit.');
      return false;
    }
    setParsed(p);
    return true;
  };

  return parsed ? <Review parsed={parsed} onBack={() => setParsed(null)} /> : <Capture onText={fromText} />;
}

function Capture({ onText }: { onText: (text: string) => boolean }) {
  const { showToast } = useStore();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [reading, setReading] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const isWeb = Platform.OS === 'web';

  const read = async (uri: string, width?: number) => {
    setReading(true);
    try {
      onText(await readReceiptText(uri, width));
    } catch {
      showToast('Couldn’t read that photo. Try again.');
    } finally {
      setReading(false);
    }
  };

  const capture = async () => {
    if (!ocrAvailable) return setPasteOpen(true);
    const photo = await camera.current?.takePictureAsync({ quality: 0.9 });
    if (photo) await read(photo.uri, photo.width);
  };

  const pick = async () => {
    if (!ocrAvailable) return setPasteOpen(true);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled && res.assets[0]) await read(res.assets[0].uri, res.assets[0].width);
  };

  const showCamera = !isWeb && ocrAvailable && permission?.granted;

  return (
    <View style={{ flex: 1, backgroundColor: '#1A1815' }}>
      {showCamera && <CameraView ref={camera} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} facing="back" />}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <RoundBtn icon="close" size={42} bg="rgba(255,255,255,0.14)" color="#fff" onPress={() => goBack()} label="Close" />
        <T w={600} color="#fff">Scan receipt</T>
        <RoundBtn icon="edit_note" size={42} bg="rgba(255,255,255,0.14)" color="#fff" onPress={() => setPasteOpen(true)} label="Type or paste receipt text" />
      </View>
      <View style={{ position: 'absolute', top: insets.top + 80, bottom: 150 + insets.bottom, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 250, height: '100%', maxHeight: 520, borderRadius: 20, borderWidth: 2.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
          {reading ? (
            <>
              <ActivityIndicator color="#fff" />
              <T size={14} color="#E3DDD3">Reading receipt…</T>
            </>
          ) : !ocrAvailable ? (
            <T size={13} color="#B5AEA4" style={{ textAlign: 'center', lineHeight: 19 }}>
              {isWeb ? 'Receipt photos work in the phone app.' : 'Receipt photos need the Larder app build (not Expo Go).'} You can type or paste the receipt text instead.
            </T>
          ) : permission && !permission.granted ? (
            <>
              <T size={15} color="#E3DDD3" style={{ textAlign: 'center' }}>Larder needs the camera to read receipts.</T>
              <Btn onPress={requestPermission} style={{ height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center' }}>
                <T size={15} w={600}>Allow camera</T>
              </Btn>
            </>
          ) : (
            <T size={13} color="rgba(255,255,255,0.75)" style={{ textAlign: 'center', marginTop: 'auto' }}>Fit the item lines inside the frame</T>
          )}
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: 40 + insets.bottom, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: 40 }}>
          <RoundBtn icon="photo_library" size={48} bg="rgba(255,255,255,0.14)" color="#fff" onPress={pick} label="Choose a photo" />
        </View>
        <Btn accessibilityLabel="Capture" disabled={reading} onPress={capture} style={{ width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)', padding: 4 }}>
          <View style={{ flex: 1, borderRadius: 33, backgroundColor: '#fff' }} />
        </Btn>
      </View>
      {pasteOpen && <PasteSheet onClose={() => setPasteOpen(false)} onText={(t) => onText(t) && setPasteOpen(false)} />}
    </View>
  );
}

function PasteSheet({ onClose, onText }: { onClose: () => void; onText: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <Sheet onClose={onClose} z={50}>
      <T display size={26}>Receipt text</T>
      <T size={14} color={C.muted}>Type or paste the item lines, one per line.</T>
      <TextInput value={text} onChangeText={setText} multiline autoFocus placeholder={'KRO 2% RF MLK GAL   3.49\nCHKN BRST BNLS SKNLS   11.84'} placeholderTextColor={C.faint}
        style={[S.input, { flex: 0, minHeight: 160, maxHeight: 280, borderRadius: 14, backgroundColor: '#fff', padding: 14, textAlignVertical: 'top', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 14 }]} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <BigBtn title="Use a sample" bg={C.btnSoft} color={C.ink} onPress={() => setText(receiptSample)} style={{ flex: 1 }} />
        <BigBtn title="Read" onPress={() => text.trim() && onText(text)} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

function Review({ parsed, onBack }: { parsed: ParsedReceipt; onBack: () => void }) {
  const { s, set, showToast } = useStore();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<ReceiptRow[]>(parsed.rows);
  const upd = (id: string, patch: Partial<ReceiptRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const on = rows.filter((r) => r.on && !r.nonFood);
  const sub = [parsed.store, parsed.date].filter(Boolean).join(' · ') || 'Check the names, then add';

  const add = () => {
    set((st) => {
      let items = st.items;
      on.forEach((r) => { items = merge(items, r.name, r.loc, r.qty, r.days); });
      return {
        ...st, items,
        list: st.list.filter((l) => !on.some((r) => same(r.name, l.name))),
        receiptLeft: st.plus ? st.receiptLeft : Math.max(0, st.receiptLeft - 1),
        receiptMemory: learnFrom(rows, st.receiptMemory ?? {}),
      };
    });
    showToast(`Added ${on.length} item${on.length === 1 ? '' : 's'}`);
    closeAll();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen bottom={120}>
        <RoundBtn icon="arrow_back" onPress={onBack} label="Back" />
        <View>
          <T display size={30}>Review receipt</T>
          <T size={15} color={C.muted} style={{ marginTop: 4 }}>{sub}</T>
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
                    // Tap a name to fix it; Larder remembers the fix for this receipt line.
                    <Btn onPress={() => upd(r.id, { editing: true })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T w={600} color={r.on ? C.ink : C.faint} style={{ flexShrink: 1 }}>{r.name}</T>
                      <Icon name="edit" size={14} color={C.faint} />
                    </Btn>
                  )}
                  <T size={11.5} w={500} color={C.photoText} style={{ marginTop: 3, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }}>{r.raw}</T>
                </View>
                {!r.nonFood && (
                  <Btn onPress={() => upd(r.id, { loc: CYCLE[(CYCLE.indexOf(r.loc) + 1) % 3] })} style={{ height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: C.chip, justifyContent: 'center' }}>
                    <T size={13} w={600}>{locName(s, r.loc)}</T>
                  </Btn>
                )}
                {r.nonFood && <T size={13} w={600} color={C.muted}>Not food</T>}
              </View>
              {r.days != null && r.on && !r.nonFood && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12, paddingBottom: 12, paddingLeft: 52 }}>
                  <T size={13.5} color={C.muted} style={{ flex: 1 }}>Good until</T>
                  <DateControl days={r.days} onChange={(v) => upd(r.id, { days: v })} />
                </View>
              )}
              {r.unsure && !r.editing && r.on && (
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
      <BigBtn title={`Add ${on.length} item${on.length === 1 ? '' : 's'}`} height={56} onPress={add} style={{ position: 'absolute', left: 20, right: 20, bottom: 16 + insets.bottom }} />
    </View>
  );
}
