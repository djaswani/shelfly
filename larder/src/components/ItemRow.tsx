import { Pressable, View } from 'react-native';
import { Item } from '../data/types';
import { dayColor, dayText, itemDays, levelText, locName } from '../logic';
import { useStore } from '../store';
import { C } from '../theme';
import { shortWeekday } from './format';
import { rowBorder, T } from './ui';

const FILL = { Full: 3, Some: 2, Low: 1, Out: 0 } as const;

export function Meter({ it }: { it: Item }) {
  const f = FILL[it.level] ?? 0;
  const on = f <= 1 ? C.warnBar : C.ink;
  return (
    <View style={{ flexDirection: 'row', gap: 2, opacity: it.conf < 0.5 ? 0.4 : 1 }}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={{ width: 6, height: 10, borderRadius: 2, backgroundColor: f >= n ? on : C.meterOff }} />
      ))}
    </View>
  );
}

export function ItemRow({ it, index, withLoc }: { it: Item; index: number; withLoc?: boolean }) {
  const { s, openSheet } = useStore();
  let sub = levelText(it);
  if (it.leftover) sub = 'Leftover · made ' + (it.made ? shortWeekday(it.made) : '');
  else if (it.opened) sub += ' · Opened';
  if (withLoc) sub = locName(s, it.loc) + ' · ' + sub;
  const d = itemDays(it);
  return (
    <Pressable
      onPress={() => openSheet(it.id)}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }, rowBorder(index), pressed && { backgroundColor: C.rowActive }]}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <T w={600} numberOfLines={1}>{it.name}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {it.count == null && !it.leftover && <Meter it={it} />}
          <T size={13.5} color={C.muted} numberOfLines={1} style={{ flexShrink: 1 }}>{sub}</T>
        </View>
      </View>
      <T size={14} w={600} color={dayColor(d)}>{dayText(d)}</T>
    </Pressable>
  );
}
