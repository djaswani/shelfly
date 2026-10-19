import { ScrollView, View } from 'react-native';
import { isoIn, longDate } from '../dates';
import { LEVELS } from '../data/types';
import { addToList, expIn, itemDays, locName, updItem } from '../logic';
import { useStore } from '../store';
import { C } from '../theme';
import { DateControl } from './DateControl';
import { madeText } from './format';
import { Sheet } from './Sheet';
import { Btn, Icon, Pill, RoundBtn, shadow, T, Toggle } from './ui';

const SRC = { FoodKeeper: 'USDA FoodKeeper estimate', Label: 'From label', You: 'Set by you' };

export function ItemSheet() {
  const { s, set, sheetId, openSheet, showToast } = useStore();
  const it = sheetId ? s.items.find((i) => i.id === sheetId) : undefined;
  if (!it) return null;
  const close = () => openSheet(null);
  const upd = (patch: Parameters<typeof updItem>[2]) => set((st) => updItem(st, it.id, { ...patch, checkedAt: isoIn(0) }));
  const d = itemDays(it);
  const where = locName(s, it.loc) + (it.leftover ? ' · Leftover' : it.staple ? ' · Staple' : '');

  const toggleOpen = () =>
    upd(it.opened
      ? { opened: false, expires: it.prevExpires ?? it.expires, src: it.prevSrc || it.src }
      : { opened: true, prevExpires: it.expires, prevSrc: it.src, expires: isoIn(Math.min(d ?? 5, 5)), src: 'FoodKeeper' });

  const used = () => {
    set((st) => ({
      ...st,
      items: it.leftover ? st.items.filter((x) => x.id !== it.id) : st.items.map((x) => (x.id === it.id ? { ...x, level: 'Out', count: x.count != null ? 0 : null, conf: 1 } : x)),
      stats: { ...st.stats, used: st.stats.used + 1 },
    }));
    close();
    showToast('Marked used up');
  };
  const toss = () => {
    set((st) => ({ ...st, items: st.items.filter((x) => x.id !== it.id), stats: { ...st.stats, tossed: st.stats.tossed + 1 } }));
    close();
    showToast(it.name + ' tossed');
  };
  const toList = () => {
    set((st) => addToList(st, it.name, it.aisle));
    close();
    showToast(it.name + ' added to list');
  };

  return (
    <Sheet onClose={close}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T display size={28}>{it.name}</T>
          <T size={15} color={C.muted} style={{ marginTop: 2 }}>{where}</T>
        </View>
        <RoundBtn icon="close" size={36} iconSize={20} onPress={close} label="Close" />
      </View>

      {it.count == null ? (
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: C.btnSoft, borderRadius: 14, padding: 4 }}>
          {LEVELS.map((l) => {
            const on = it.level === l;
            return (
              <Btn key={l} onPress={() => upd({ level: l, conf: 1 })} style={[{ flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#fff' : 'transparent' }, on && shadow(0.14, 3, 1)]}>
                <T size={15} w={600} color={on ? C.ink : C.muted}>{l}</T>
              </Btn>
            );
          })}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 8, paddingLeft: 16 }}>
          <T w={600}>{it.count} {it.unit}</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <RoundBtn icon="remove" size={40} bg={C.chip} label="Fewer" onPress={() => upd({ count: Math.max(0, (it.count ?? 0) - 1), conf: 1 })} />
            <RoundBtn icon="add" size={40} bg={C.chip} label="More" onPress={() => upd({ count: (it.count ?? 0) + 1, conf: 1 })} />
          </View>
        </View>
      )}

      {d != null && (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w={600}>Good until</T>
              <T size={13} color={C.muted} style={{ marginTop: 2 }}>{expIn(d)} · {SRC[it.src]}</T>
            </View>
            <DateControl days={Math.max(0, d)} onChange={(v) => upd({ expires: isoIn(v), src: 'You' })} />
          </View>
          {!it.leftover && (
            <Btn onPress={toggleOpen} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.line }}>
              <T style={{ flex: 1 }}>Opened</T>
              <Toggle on={it.opened} />
            </Btn>
          )}
          {it.leftover && it.made && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.line }}>
              <T style={{ flex: 1 }}>Made</T>
              <T size={15} color={C.muted}>{madeText(it.made)}</T>
            </View>
          )}
        </View>
      )}
      {d != null && <T size={12} color={C.faint} style={{ marginTop: -6, paddingHorizontal: 4 }}>Estimate only, good until {longDate(it.expires!)}. Check before eating.</T>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {s.locs.map((l) => <Pill key={l.id} label={l.name} active={l.id === it.loc} height={34} size={14} onPress={() => upd({ loc: l.id })} />)}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Action icon="shopping_basket" label="Add to list" onPress={toList} />
        <Action icon="check" label="Used up" onPress={used} primary />
        <Action icon="delete" label="Tossed" onPress={toss} color={C.warn} />
      </View>
    </Sheet>
  );
}

function Action({ icon, label, onPress, primary, color = C.ink }: { icon: string; label: string; onPress: () => void; primary?: boolean; color?: string }) {
  const fg = primary ? '#fff' : color;
  return (
    <Btn onPress={onPress} style={{ flex: 1, height: 64, borderRadius: 16, backgroundColor: primary ? C.green : '#fff', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <Icon name={icon} color={fg} />
      <T size={13.5} w={600} color={fg}>{label}</T>
    </Btn>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 110, zIndex: 60, alignItems: 'center' }}>
      <View style={{ backgroundColor: C.ink, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, ...shadow(0.2, 18, 6) }}>
        <T size={14.5} w={500} color="#fff">{toast}</T>
      </View>
    </View>
  );
}
