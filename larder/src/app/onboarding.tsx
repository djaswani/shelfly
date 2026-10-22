import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { timeText } from '../components/DatePicker';
import { Btn, Icon, RoundBtn, S, shadow, T } from '../components/ui';
import { QUICK } from '../data/seed';
import { Item, Loc } from '../data/types';
import { aisleOf, locForAisle, merge, uid } from '../logic';
import { notificationsAllowed } from '../notifications';
import { useStore } from '../store';
import { C } from '../theme';

// First run, from the design's onboarding: welcome → household → places → starting food → reminders → done.
// "join" is the invite-code path; it finishes onboarding and hands the code to the Household screen.
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 'join';

const SIZES = ['Just me', '2', '3–4', '5+'];
const TIMES = [8 * 60, 12 * 60, 17 * 60 + 30];
const PLACES = [{ id: 'fridge', name: 'Fridge', icon: 'kitchen' }, { id: 'freezer', name: 'Freezer', icon: 'ac_unit' }, { id: 'pantry', name: 'Pantry', icon: 'shelves' }];
const field = [S.input, { flex: 0, height: 52, borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 16 }];

export default function Onboarding() {
  const { set } = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState('');
  const [size, setSize] = useState(1);
  const [places, setPlaces] = useState<Record<string, boolean>>({ fridge: true, freezer: true, pantry: true });
  const [custom, setCustom] = useState<Loc[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [time, setTime] = useState(TIMES[0]);
  const [digest, setDigest] = useState(true);
  const [code, setCode] = useState('');

  const locs: Loc[] = [...PLACES.filter((p) => places[p.id]).map(({ id, name: n }) => ({ id, name: n })), ...custom];
  const picked = Object.keys(sel);
  const household = name.trim() || 'Your kitchen';

  const finish = (joinCode?: string) => {
    const kept = locs.length ? locs : [{ id: 'fridge', name: 'Fridge' }];
    const ids = kept.map((l) => l.id);
    let items: Item[] = [];
    picked.forEach((n) => {
      const loc = locForAisle(aisleOf(n));
      items = merge(items, n, ids.includes(loc) ? loc : ids[0], 1, null);
    });
    set((st) => ({
      ...st, onboarded: true, householdName: household, people: size + 1, locs: kept, items,
      list: [], events: [], stats: { used: 0, tossed: 0, cooked: 0 }, saved: {},
      members: [{ n: 'You', i: '', role: 'You' }], digest, digestTime: time,
      // Cached ideas were picked for the old kitchen; new ones come from Cook.
      recipes: st.recipes.filter((r) => r.origin !== 'idea'),
    }));
    router.replace('/');
    if (joinCode) setTimeout(() => router.push({ pathname: '/account', params: { code: joinCode } }), 50);
  };

  const allow = async () => {
    const status = await notificationsAllowed(true).catch(() => 'denied' as const);
    setDigest(status === 'granted' || Platform.OS === 'web');
    setStep(5);
  };

  const codeOk = code.length >= 6;
  const foot: [string, () => void, boolean, string?, (() => void)?] = {
    0: ['Get started', () => setStep(1), true, 'I have an invite code', () => setStep('join')],
    1: ['Continue', () => setStep(2), true],
    2: ['Continue', () => locs.length && setStep(3), locs.length > 0],
    3: [picked.length ? `Add ${picked.length} item${picked.length > 1 ? 's' : ''}` : 'Continue', () => setStep(4), true],
    4: ['Allow notifications', allow, true, 'Not now', () => { setDigest(false); setStep(5); }],
    5: ['Open my kitchen', () => finish(), true],
    join: ['Continue', () => codeOk && finish(code), codeOk],
  }[step] as [string, () => void, boolean, string?, (() => void)?];

  const back = () => setStep(step === 'join' ? 0 : (Math.max(0, (step as number) - 1) as Step));
  const saveNew = () => {
    const n = adding?.trim();
    if (n) setCustom((c) => [...c, { id: uid('loc'), name: n }]);
    setAdding(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {step !== 0 && step !== 5 && (
          <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
            <RoundBtn icon="arrow_back" onPress={back} label="Back" />
            {typeof step === 'number' && (
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {[1, 2, 3, 4].map((n) => <View key={n} style={{ width: step === n ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: step >= n ? C.ink : C.grab }} />)}
              </View>
            )}
            <View style={{ width: 40, alignItems: 'flex-end' }}>
              {step === 3 && <Btn onPress={() => { setSel({}); setStep(4); }}><T size={15} w={600} color={C.muted}>Skip</T></Btn>}
            </View>
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 12, gap: 22 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <>
              <Hero />
              <View style={{ gap: 10 }}>
                <T display w={700} size={46} style={{ lineHeight: 48 }}>Shelfly</T>
                <T size={17} color="#3D3730" style={{ lineHeight: 25 }}>Know what&apos;s in your kitchen, use it before it turns, and shop for what&apos;s actually missing.</T>
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Head title="Who's eating from this kitchen?" sub="This sizes recipe suggestions and shopping amounts." />
              <Field label="Household name">
                <TextInput value={name} onChangeText={setName} placeholder="The Garcia kitchen" placeholderTextColor={C.faint} returnKeyType="done" style={field} />
              </Field>
              <Field label="People">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {SIZES.map((l, i) => <Choice key={l} label={l} on={size === i} onPress={() => setSize(i)} />)}
                </View>
              </Field>
              <T size={14} color={C.muted} style={{ lineHeight: 21 }}>You can invite them from Settings once you&apos;re in.</T>
            </>
          )}

          {step === 2 && (
            <>
              <Head title="Where do you keep food?" sub="Pick the places you'll track. Add a garage shelf, a second fridge, anything." />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {PLACES.map((p) => <Place key={p.id} icon={p.icon} name={p.name} on={!!places[p.id]} onPress={() => setPlaces((x) => ({ ...x, [p.id]: !x[p.id] }))} />)}
                {custom.map((p) => <Place key={p.id} icon="inventory_2" name={p.name} on onPress={() => setCustom((c) => c.filter((x) => x.id !== p.id))} />)}
                {adding == null ? (
                  <Btn onPress={() => setAdding('')} style={[tile, { borderStyle: 'dashed', borderColor: C.grab, backgroundColor: 'transparent' }]}>
                    <Icon name="add" size={28} color={C.muted} />
                    <T w={600} color={C.muted}>Add a place</T>
                  </Btn>
                ) : (
                  <View style={[tile, { borderColor: C.ink }]}>
                    <TextInput value={adding} onChangeText={setAdding} onSubmitEditing={saveNew} autoFocus placeholder="Name it" placeholderTextColor={C.faint}
                      style={{ fontSize: 16, fontFamily: 'Figtree_600SemiBold', color: C.ink, padding: 0 }} />
                    <Btn onPress={saveNew} style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.ink, justifyContent: 'center', alignSelf: 'flex-start' }}>
                      <T size={14} w={600} color="#fff">Add</T>
                    </Btn>
                  </View>
                )}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Head title="What do you have right now?" sub="Tap a few things to start. Good-until dates come from USDA FoodKeeper, and you can change any of them later." />
              {QUICK.map((g) => (
                <Field key={g.title} label={g.title}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {g.items.map((n) => {
                      const on = !!sel[n];
                      return (
                        <Btn key={n} onPress={() => setSel((a) => { const b = { ...a }; if (b[n]) delete b[n]; else b[n] = true; return b; })}
                          style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1.5, borderColor: on ? C.green : C.meterOff, backgroundColor: on ? C.green : '#fff', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          {on && <Icon name="check" size={17} color="#fff" />}
                          <T size={15} w={500} color={on ? '#fff' : C.ink}>{n}</T>
                        </Btn>
                      );
                    })}
                  </View>
                </Field>
              ))}
            </>
          )}

          {step === 4 && (
            <>
              <Head title="Get a heads-up before food turns" sub="One notification a day, only when something is close." />
              <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, ...shadow(0.06, 16, 4) }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="kitchen" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <T size={13} w={600} color={C.muted}>Shelfly</T>
                    <T size={13} color={C.muted}>{timeText(time)}</T>
                  </View>
                  <T size={15} w={600}>Use the spinach and chicken today</T>
                  <T size={14} color="#3D3730" style={{ lineHeight: 19 }}>Creamy spinach chicken uses both. 30 min.</T>
                </View>
              </View>
              <Field label="Send it at">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {TIMES.map((t) => <Choice key={t} label={timeText(t)} on={time === t} onPress={() => setTime(t)} />)}
                </View>
              </Field>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingTop: 4 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.btnSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="swipe" size={22} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <T w={600}>Plus a one-minute Quick check</T>
                  <T size={14.5} color={C.muted} style={{ lineHeight: 21 }}>When Shelfly loses track of a few things, it asks. Swipe right if you still have it, left if it&apos;s gone.</T>
                </View>
              </View>
            </>
          )}

          {step === 5 && (
            <>
              <View style={{ gap: 10, paddingTop: 40 }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={32} color={C.green} />
                </View>
                <T display size={34} style={{ marginTop: 8 }}>You&apos;re set up</T>
                <T color={C.muted} style={{ lineHeight: 24 }}>Add food as you shop or scan your next receipt. Shelfly keeps track from there.</T>
              </View>
              <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' }}>
                {[
                  ['Household', household],
                  ['People', SIZES[size]],
                  ['Places', locs.map((l) => l.name).join(', ') || 'Fridge'],
                  ['Starting items', picked.length ? `${picked.length} added` : 'None yet'],
                  ['Reminders', digest ? `Daily at ${timeText(time)}` : 'Off'],
                ].map(([k, v], i) => (
                  <View key={k} style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                    <T size={15} color={C.muted}>{k}</T>
                    <T size={15} w={600} style={{ flex: 1, textAlign: 'right' }}>{v}</T>
                  </View>
                ))}
              </View>
            </>
          )}

          {step === 'join' && (
            <>
              <Head title="Join a household" sub="Ask whoever invited you for the 6-letter code. You'll share one kitchen, list and set of reminders. Next, you'll sign in with your email." />
              <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC123" placeholderTextColor={C.faint}
                autoCapitalize="characters" autoCorrect={false} autoFocus
                style={[field, { height: 64, borderRadius: 16, fontSize: 26, letterSpacing: 6, textAlign: 'center', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }]} />
            </>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: 24, paddingTop: 12, gap: 6 }}>
          <Btn onPress={foot[1]} style={{ height: 56, borderRadius: 16, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', opacity: foot[2] ? 1 : 0.4 }}>
            <T size={17} w={600} color="#fff">{foot[0]}</T>
          </Btn>
          {foot[3] && (
            <Btn onPress={foot[4]} style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
              <T w={600}>{foot[3]}</T>
            </Btn>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const tile = { width: '48%', height: 108, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#fff', padding: 14, justifyContent: 'space-between' } as const;

function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ gap: 8 }}>
      <T display size={32} style={{ lineHeight: 35 }}>{title}</T>
      <T color={C.muted} style={{ lineHeight: 24 }}>{sub}</T>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <T size={14} w={600} color={C.muted}>{label}</T>
      {children}
    </View>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Btn onPress={onPress} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: on ? C.ink : '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <T size={15} w={600} color={on ? '#fff' : C.ink}>{label}</T>
    </Btn>
  );
}

function Place({ icon, name, on, onPress }: { icon: string; name: string; on: boolean; onPress: () => void }) {
  return (
    <Btn onPress={onPress} accessibilityState={{ checked: on }} style={[tile, { borderColor: on ? C.green : 'transparent' }]}>
      <Icon name={icon} size={28} color={on ? C.green : C.faint} />
      <T w={600}>{name}</T>
      <View style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? C.green : C.checkOff, backgroundColor: on ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on && <Icon name="check" size={16} color="#fff" />}
      </View>
    </Btn>
  );
}

// Welcome art: a shelf of food tiles with a "use soon" note, in place of the design's photo placeholder.
const FOODS: (keyof typeof MaterialCommunityIcons.glyphMap)[] = ['egg-outline', 'carrot', 'cheese', 'food-apple-outline', 'bottle-soda-classic-outline', 'fish', 'bread-slice-outline', 'fruit-cherries', 'leaf'];

function Hero() {
  return (
    <View style={{ height: 340, borderRadius: 28, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 3 * 84 + 2 * 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: -24 }}>
        {FOODS.map((f, i) => (
          <View key={f} style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: i === 8 ? '#fff' : 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name={f} size={38} color={i === 8 ? C.warn : C.green} />
          </View>
        ))}
      </View>
      <View style={{ position: 'absolute', right: 18, bottom: 20, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, ...shadow(0.14, 14, 5) }}>
        <T size={12.5} w={600} color={C.muted}>Use soon</T>
        <T size={15} w={600}>Spinach · <T size={15} w={600} color={C.warn}>Tomorrow</T></T>
      </View>
    </View>
  );
}
