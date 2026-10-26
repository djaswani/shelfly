import { closeAll, goBack } from '../nav';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateControl } from '../components/DateControl';
import { BigBtn, Btn, Pill, RoundBtn, S, T } from '../components/ui';
import { buy, defDays } from '../logic';
import { lookupBarcode, Product } from '../openFoodFacts';
import { useStore } from '../store';
import { C } from '../theme';

const DARK = '#1A1815';

// The main wide lens can't focus closer than ~15-20 cm on recent iPhones. The virtual multi-camera
// devices switch to the ultra-wide (macro) lens up close, like the Camera app does.
// expo-camera matches lenses by their English display name; anything else falls back to the default.
const LENS_PREFERENCE = ['Back Triple Camera', 'Back Dual Wide Camera', 'Back Dual Camera'];
const pickLens = (lenses: string[]) => LENS_PREFERENCE.find((l) => lenses.includes(l));

export default function Scan() {
  const { s, set, showToast } = useStore();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [typed, setTyped] = useState('');
  const [loc, setLoc] = useState('fridge');
  const [days, setDays] = useState(10);
  const lastCode = useRef<string | null>(null);
  const [lens, setLens] = useState<string | undefined>();
  const [focusing, setFocusing] = useState(false);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isWeb = Platform.OS === 'web';

  const handleCode = async (code: string) => {
    if (busy || found || notFound || code === lastCode.current) return;
    lastCode.current = code;
    setBusy(true);
    try {
      const p = await lookupBarcode(code);
      if (p) { setFound(p); setDays(defDays(p.name, loc) === 7 ? 10 : defDays(p.name, loc)); }
      else { setNotFound(code); setManualName(''); }
    } catch {
      showToast('Lookup failed. Check your connection.');
      lastCode.current = null;
    } finally {
      setBusy(false);
    }
  };

  const onScanned = (r: BarcodeScanningResult) => handleCode(r.data);

  // Tap to refocus: autofocus "on" focuses once, then we return to continuous ("off").
  const refocus = () => {
    clearTimeout(focusTimer.current);
    setFocusing(true);
    focusTimer.current = setTimeout(() => setFocusing(false), 600);
  };

  const reset = () => { setFound(null); setNotFound(null); setDays(10); lastCode.current = null; setTyped(''); };

  const commit = (next: boolean) => {
    const name = found ? found.name : manualName.trim();
    if (!name) return;
    set((st) => buy(st, name, loc, 1, days));
    showToast(name + ' added');
    if (next) reset(); else closeAll();
  };

  const pickLoc = (id: string) => { setLoc(id); setDays(id === 'freezer' ? 120 : 10); };
  const showSheet = !!found || !!notFound;

  return (
    <View style={{ flex: 1, backgroundColor: DARK }}>
      {!isWeb && permission?.granted && (
        <CameraView
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          enableTorch={torch}
          autofocus={focusing ? 'on' : 'off'}
          selectedLens={lens}
          onAvailableLensesChanged={(e) => setLens(pickLens(e.lenses))}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={showSheet ? undefined : onScanned}
        />
      )}
      {!isWeb && permission?.granted && !showSheet && (
        <Pressable accessibilityLabel="Tap to focus" onPress={refocus} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      )}

      <View style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <RoundBtn icon="close" size={42} bg="rgba(255,255,255,0.14)" color="#fff" onPress={() => goBack()} label="Close" />
        <T w={600} color="#fff">Scan barcode</T>
        <RoundBtn icon="flashlight_on" size={42} bg={torch ? '#fff' : 'rgba(255,255,255,0.14)'} color={torch ? C.ink : '#fff'} onPress={() => setTorch(!torch)} label="Torch" />
      </View>

      <View style={{ position: 'absolute', top: insets.top + 200, left: 0, right: 0, alignItems: 'center', gap: 20 }}>
        <View style={{ width: 290, height: 180, borderRadius: 24, borderWidth: 2.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color="#fff" /> : <View style={{ width: 240, height: 2, borderRadius: 1, backgroundColor: '#E2603A' }} />}
        </View>
        {!isWeb && permission && !permission.granted && (
          <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 32 }}>
            <T size={15} color="#E3DDD3" style={{ textAlign: 'center' }}>Shelfly needs the camera to read barcodes.</T>
            <Btn onPress={requestPermission} style={{ height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center' }}>
              <T size={15} w={600}>Allow camera</T>
            </Btn>
          </View>
        )}
        {isWeb && !showSheet && (
          // Browsers get a typed fallback; phones use the live camera.
          <View style={{ width: 290, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingLeft: 14, paddingRight: 6, height: 48 }}>
            <TextInput value={typed} onChangeText={setTyped} onSubmitEditing={() => typed.trim() && handleCode(typed.trim())} placeholder="Type a barcode number" placeholderTextColor="#9C948A" keyboardType="number-pad" style={[S.input, { color: '#fff' }]} />
            <RoundBtn icon="search" size={36} bg="#fff" onPress={() => typed.trim() && handleCode(typed.trim())} label="Look up" />
          </View>
        )}
      </View>

      {showSheet && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 24 + insets.bottom, gap: 16 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.grab, alignSelf: 'center' }} />
          {found ? (
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              {found.image ? <Image source={{ uri: found.image }} style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: '#fff' }} resizeMode="contain" />
                : <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: C.photoA }} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={18} w={600} numberOfLines={2}>{found.name}</T>
                <T size={14} color={C.muted} style={{ marginTop: 2 }}>{[found.brand, found.size].filter(Boolean).join(' · ')}</T>
              </View>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <T size={18} w={600}>Not in the product database</T>
              <T size={14} color={C.muted}>Barcode {notFound}. Name it once and Shelfly will add it.</T>
              <TextInput value={manualName} onChangeText={setManualName} autoFocus placeholder="What is it?" placeholderTextColor={C.faint} style={[S.input, { flex: 0, height: 48, borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 14 }]} />
            </View>
          )}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 }}>
              <T size={15} color={C.muted}>Put in</T>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {s.locs.slice(0, 3).map((l) => <Pill key={l.id} label={l.name} active={l.id === loc} height={32} size={14} onPress={() => pickLoc(l.id)} />)}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingLeft: 16, paddingRight: 10, borderTopWidth: 1, borderTopColor: C.line }}>
              <T size={15} color={C.muted}>Good until</T>
              <DateControl days={days} onChange={setDays} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BigBtn title="Add + scan next" bg={C.btnSoft} color={C.ink} onPress={() => commit(true)} style={{ flex: 1 }} />
            <BigBtn title="Add" onPress={() => commit(false)} style={{ flex: 1 }} />
          </View>
          {found && <T size={11} color={C.faint} style={{ textAlign: 'center' }}>Product data from Open Food Facts</T>}
        </View>
      )}
    </View>
  );
}
