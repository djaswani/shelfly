import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Btn, Card, CheckCircle, H1, Icon, rowBorder, S, Screen, SectionLabel, shadow, T } from '../../components/ui';
import { AISLE_ORDER } from '../../data/seed';
import { addToList, aisleOf, buy, capitalize, everyText, isOut, locForAisle, restockDue, same } from '../../logic';
import { useStore } from '../../store';
import { C } from '../../theme';

export default function List() {
  const { s, set, showToast } = useStore();
  const [text, setText] = useState('');

  const addText = () => {
    const t = text.trim();
    if (!t) return;
    const name = capitalize(t);
    const inv = s.items.find((i) => same(i.name, name));
    set((st) => addToList(st, name, inv?.aisle ?? aisleOf(name)));
    setText('');
  };

  const sugg = s.items.filter((i) => !i.leftover && (isOut(i) || (i.count == null && i.level === 'Low')) && !s.list.some((r) => same(r.name, i.name)));
  const addAll = () => {
    set((st) => sugg.reduce((acc, i) => addToList(acc, i.name, i.aisle), st));
    showToast(`Added ${sugg.length} to list`);
  };

  const due = restockDue(s);

  const groups = AISLE_ORDER.map((a) => ({ aisle: a, rows: s.list.filter((r) => (AISLE_ORDER.includes(r.aisle) ? r.aisle : 'Other') === a) })).filter((g) => g.rows.length);
  const checked = s.list.filter((r) => r.checked);

  const toggle = (id: string) => set((st) => ({ ...st, list: st.list.map((l) => (l.id === id ? { ...l, checked: !l.checked } : l)) }));
  const putAway = () => {
    set((st0) => {
      const st = st0.list.filter((r) => r.checked && r.aisle !== 'Household').reduce((acc, r) => buy(acc, r.name, locForAisle(r.aisle), parseInt(r.qty ?? '') || 1), st0);
      return { ...st, list: st.list.filter((r) => !r.checked) };
    });
    showToast(`Put away ${checked.length} item${checked.length > 1 ? 's' : ''}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen bottom={100}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <H1>List</H1>
          <T size={15} color={C.muted}>{s.list.length} item{s.list.length === 1 ? '' : 's'}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingLeft: 14, paddingRight: 6, height: 48 }}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={addText} placeholder="Add an item" placeholderTextColor={C.faint} style={S.input} />
          <Btn onPress={addText} accessibilityLabel="Add to list" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="add" color="#fff" />
          </Btn>
        </View>

        {sugg.length > 0 && (
          <View style={{ gap: 8 }}>
            <SectionLabel right={<Btn onPress={addAll}><T size={14} w={600} color={C.green}>Add all</T></Btn>}>Running low at home</SectionLabel>
            <Card>
              {sugg.map((i, n) => (
                <View key={i.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16, paddingRight: 10 }, rowBorder(n)]}>
                  <T w={500} style={{ flex: 1 }}>{i.name}</T>
                  <T size={13} w={600} color={C.warn}>{isOut(i) ? 'Out' : 'Low'}</T>
                  <Btn onPress={() => set((st) => addToList(st, i.name, i.aisle))} accessibilityLabel={`Add ${i.name}`} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="add" size={20} color={C.green} />
                  </Btn>
                </View>
              ))}
            </Card>
          </View>
        )}

        {due.length > 0 && (
          <View style={{ gap: 8 }}>
            <SectionLabel>Probably running out</SectionLabel>
            <Card>
              {due.map((i, n) => (
                <View key={i.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16, paddingRight: 10 }, rowBorder(n)]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T w={500}>{i.name}</T>
                    <T size={13} color={C.muted} style={{ marginTop: 2 }}>Usually lasts {everyText(i.every!)}</T>
                  </View>
                  <Btn onPress={() => set((st) => addToList(st, i.name, i.aisle))} accessibilityLabel={`Add ${i.name}`} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="add" size={20} color={C.green} />
                  </Btn>
                </View>
              ))}
            </Card>
          </View>
        )}

        {groups.map((g) => (
          <View key={g.aisle} style={{ gap: 8 }}>
            <SectionLabel>{g.aisle}</SectionLabel>
            <Card>
              {g.rows.map((r, i) => {
                const inv = s.items.find((it) => same(it.name, r.name) && !it.leftover);
                let have = '';
                let hc = C.muted;
                if (inv) {
                  const lv = inv.count != null ? (inv.count === 0 ? 'Out' : inv.count + ' left') : inv.level;
                  have = 'Have: ' + lv;
                  if (lv === 'Low' || lv === 'Out') hc = C.warn;
                }
                return (
                  <Btn key={r.id} onPress={() => toggle(r.id)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16 }, rowBorder(i)]}>
                    <CheckCircle on={!!r.checked} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T w={500} color={r.checked ? C.faint : C.ink} style={{ textDecorationLine: r.checked ? 'line-through' : 'none' }}>{r.name}</T>
                      {!!r.qty && <T size={13} color={C.muted} style={{ marginTop: 2 }}>{r.qty}</T>}
                    </View>
                    <T size={13} w={600} color={hc}>{have}</T>
                  </Btn>
                );
              })}
            </Card>
          </View>
        ))}
      </Screen>
      {checked.length > 0 && (
        <Btn onPress={putAway} style={{ position: 'absolute', left: 20, right: 20, bottom: 16, height: 54, borderRadius: 16, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow(0.18, 20, 8) }}>
          <Icon name="kitchen" color="#fff" />
          <T w={600} color="#fff">Put away {checked.length} item{checked.length > 1 ? 's' : ''}</T>
        </Btn>
      )}
    </View>
  );
}
