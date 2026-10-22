import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Image, Pressable, PressableProps, ScrollView, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';

// ── Text ──────────────────────────────────────────────────────
type Weight = 400 | 500 | 600 | 700;
const BODY: Record<Weight, string> = { 400: F.body, 500: F.medium, 600: F.semibold, 700: F.bold };

export function T({ size = 16, w = 400, color = C.ink, display, style, ...rest }: TextProps & {
  size?: number; w?: Weight; color?: string; display?: boolean; style?: StyleProp<TextStyle>;
}) {
  const fontFamily = display ? (w >= 700 ? F.displayBold : F.display) : BODY[w];
  const letterSpacing = display ? -size * 0.025 : undefined;
  return <Text {...rest} style={[{ fontFamily, fontSize: size, color, letterSpacing }, style]} />;
}

export const H1 = ({ children, size = 34 }: { children: ReactNode; size?: number }) => (
  <T display size={size}>{children}</T>
);

// ── Icons (Material Symbols names from the design) ────────────
const MCI: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  skillet: 'pot-steam-outline',
  barcode_scanner: 'barcode-scan',
};

export function Icon({ name, size = 22, color = C.ink, style }: { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  if (MCI[name]) return <MaterialCommunityIcons name={MCI[name]} size={size} color={color} style={style} />;
  return <MaterialIcons name={name.replace(/_/g, '-') as keyof typeof MaterialIcons.glyphMap} size={size} color={color} style={style} />;
}

// ── Buttons ───────────────────────────────────────────────────
type BtnProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> };

export function Btn({ style, children, ...rest }: BtnProps & { children: ReactNode }) {
  return (
    <Pressable {...rest} style={({ pressed }) => [style, pressed && { opacity: 0.75 }]}>
      {children}
    </Pressable>
  );
}

export function RoundBtn({ icon, onPress, size = 40, bg = C.btnSoft, color = C.ink, iconSize = 22, label }: {
  icon: string; onPress?: () => void; size?: number; bg?: string; color?: string; iconSize?: number; label?: string;
}) {
  return (
    <Btn onPress={onPress} accessibilityLabel={label ?? icon} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={iconSize} color={color} />
    </Btn>
  );
}

export function BigBtn({ title, onPress, bg = C.green, color = '#fff', icon, height = 54, style }: {
  title: string; onPress?: () => void; bg?: string; color?: string; icon?: string; height?: number; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Btn onPress={onPress} style={[{ height, borderRadius: 16, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, style]}>
      {icon && <Icon name={icon} size={22} color={color} />}
      <T w={600} color={color}>{title}</T>
    </Btn>
  );
}

export function Pill({ label, active, onPress, height = 38, size = 15, extra }: {
  label: string; active?: boolean; onPress?: () => void; height?: number; size?: number; extra?: ReactNode;
}) {
  return (
    <Btn onPress={onPress} style={{ height, paddingHorizontal: 15, borderRadius: height / 2, backgroundColor: active ? C.ink : '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <T size={size} w={600} color={active ? '#fff' : C.ink}>{label}</T>
      {extra}
    </Btn>
  );
}

export function Segment<V>({ opts, value, onPick }: { opts: { v: V; label: string }[]; value: V; onPick: (v: V) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {opts.map((o) => (
        <Btn key={o.label} onPress={() => onPick(o.v)} style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: o.v === value ? C.ink : '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <T size={15} w={600} color={o.v === value ? '#fff' : C.ink}>{o.label}</T>
        </Btn>
      ))}
    </View>
  );
}

export function Toggle({ on }: { on: boolean }) {
  return (
    <View style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: on ? C.green : C.toggleOff }}>
      <View style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', ...shadow(0.2, 3, 1) }} />
    </View>
  );
}

export function CheckCircle({ on, onPress }: { on: boolean; onPress?: () => void }) {
  const box = (
    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? C.green : C.checkOff, backgroundColor: on ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on && <Icon name="check" size={16} color="#fff" />}
    </View>
  );
  return onPress ? <Btn onPress={onPress} hitSlop={8}>{box}</Btn> : box;
}

// ── Layout ────────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: C.card, borderRadius: 20, overflow: 'hidden' }, style]}>{children}</View>;
}

export const rowBorder = (i: number): ViewStyle => (i ? { borderTopWidth: 1, borderTopColor: C.line } : {});

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
      <T size={14} w={600} color={C.muted}>{children}</T>
      {right}
    </View>
  );
}

export function Screen({ children, gap = 16, bottom = 28, style }: { children: ReactNode; gap?: number; bottom?: number; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: C.bg }, style]}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: bottom + insets.bottom, gap }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

// Stand-in art for recipes without a photo: a warm tint and an icon guessed from the title.
const DISH_ICONS: [RegExp, keyof typeof MaterialCommunityIcons.glyphMap][] = [
  [/quesadilla|taco|burrito|tortilla|wrap/i, 'taco'], [/chili|soup|stew|curry|broth/i, 'pot-steam-outline'],
  [/chicken|turkey/i, 'food-drumstick-outline'], [/pasta|spaghetti|noodle|lasagna|mac/i, 'pasta'],
  [/rice|bowl|risotto/i, 'rice'], [/salad|greens|slaw/i, 'leaf'], [/toast|bread|sandwich|sourdough/i, 'bread-slice-outline'],
  [/egg|omelet|frittata/i, 'egg-fried'], [/parfait|yogurt|berry|strawberr|smoothie/i, 'fruit-cherries'],
  [/fish|salmon|tuna|shrimp/i, 'fish'], [/beef|steak|burger|meatball/i, 'food-steak'], [/pizza/i, 'pizza'], [/cake|cookie|muffin|pie/i, 'cupcake'],
];
const DISH_TINTS = [['#E1ECE4', '#2D6A4B'], ['#F3E3D9', '#B5461F'], ['#EDE7DC', '#736B60']];

function DishArt({ title = '', height, width, radius }: { title?: string; height: number; width?: number; radius: number }) {
  const icon = DISH_ICONS.find(([re]) => re.test(title))?.[1] ?? 'silverware-fork-knife';
  const [bg, fg] = DISH_TINTS[[...title].reduce((h, c) => h + c.charCodeAt(0), 0) % DISH_TINTS.length];
  return (
    <View style={{ height, width, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <MaterialCommunityIcons name={icon} size={Math.min(64, height * 0.42)} color={fg} style={{ opacity: 0.85 }} />
    </View>
  );
}

// A recipe's photo, or title-based art when it has none or it fails to load (offline, dead link).
export function RecipePhoto({ uri, title, height, width, radius = 0 }: { uri?: string; title?: string; height: number; width?: number; radius?: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!uri || failed === uri) return <DishArt title={title} height={height} width={width} radius={radius} />;
  return (
    <Image source={{ uri }} onError={() => setFailed(uri)} resizeMode="cover" accessibilityIgnoresInvertColors
      style={{ height, width: width ?? '100%', borderRadius: radius, backgroundColor: C.photoA }} />
  );
}

export function shadow(opacity: number, radius: number, y: number): ViewStyle {
  return { shadowColor: C.ink, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: y }, elevation: Math.round(radius / 2) };
}

export const S = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: C.ink, fontFamily: F.body, outlineStyle: 'none' } as unknown as TextStyle,
});
