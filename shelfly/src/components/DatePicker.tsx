import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { daysFromToday, fromISO, isoIn, longDate, toISO } from '../dates';
import { C } from '../theme';
import { BigBtn, Btn, RoundBtn, T } from './ui';

const PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 91 },
];

// Bottom sheet in its own Modal, so it opens above other sheets (the item sheet, receipt review).
function PickerSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.scrim }} />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 20 + insets.bottom, gap: 14, width: '100%', maxWidth: Platform.OS === 'web' ? 440 : undefined, alignSelf: 'center' }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.grab, alignSelf: 'center' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T display size={24}>{title}</T>
            <RoundBtn icon="close" size={36} iconSize={20} onPress={onClose} label="Close" />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

// Plain browser date input for the web build (the native picker is iOS/Android only).
function WebDateInput({ iso, min, onChange }: { iso: string; min: string; onChange: (iso: string) => void }) {
  return createElement('input', {
    type: 'date', value: iso, min,
    onChange: (e: { target: { value: string } }) => e.target.value && onChange(e.target.value),
    style: { fontSize: 17, padding: 12, borderRadius: 14, border: 'none', backgroundColor: '#fff', color: C.ink, fontFamily: 'inherit' },
  });
}

// "Good until" picker: quick presets plus a full calendar.
export function DatePickerSheet({ iso, title = 'Good until', onPick, onClose }: { iso: string; title?: string; onPick: (iso: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(iso);
  const today = isoIn(0);
  const cur = daysFromToday(value);
  const done = (v: string) => { onPick(v); onClose(); };

  return (
    <PickerSheet title={title} onClose={onClose}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PRESETS.map((p) => {
          const on = cur === p.days;
          return (
            <Btn key={p.label} onPress={() => done(isoIn(p.days))} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? C.green : '#fff', justifyContent: 'center' }}>
              <T size={14.5} w={600} color={on ? '#fff' : C.ink}>{p.label}</T>
            </Btn>
          );
        })}
      </View>
      {Platform.OS === 'web' ? (
        <WebDateInput iso={value} min={today} onChange={setValue} />
      ) : Platform.OS === 'ios' ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' }}>
          <DateTimePicker value={fromISO(value)} mode="date" display="inline" minimumDate={fromISO(today)} accentColor={C.green} themeVariant="light"
            onChange={(_, d) => d && setValue(toISO(d))} />
        </View>
      ) : (
        <Btn onPress={() => DateTimePickerAndroid.open({ value: fromISO(value), mode: 'date', minimumDate: fromISO(today), onChange: (e, d) => e.type === 'set' && d && setValue(toISO(d)) })}
          style={{ height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <T w={600}>Pick a date…</T>
        </Btn>
      )}
      <BigBtn title={`Set to ${longDate(value)}`} onPress={() => done(value)} />
    </PickerSheet>
  );
}

// Time of day as minutes after midnight (the daily digest time).
export function TimePickerSheet({ minutes, title, onPick, onClose }: { minutes: number; title: string; onPick: (m: number) => void; onClose: () => void }) {
  const [value, setValue] = useState(minutes);
  const asDate = new Date(2000, 0, 1, Math.floor(value / 60), value % 60);
  const hhmm = `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const fromDate = (d: Date) => d.getHours() * 60 + d.getMinutes();

  return (
    <PickerSheet title={title} onClose={onClose}>
      {Platform.OS === 'web' ? (
        createElement('input', {
          type: 'time', value: hhmm,
          onChange: (e: { target: { value: string } }) => {
            const [h, m] = e.target.value.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) setValue(h * 60 + m);
          },
          style: { fontSize: 17, padding: 12, borderRadius: 14, border: 'none', backgroundColor: '#fff', color: C.ink, fontFamily: 'inherit' },
        })
      ) : Platform.OS === 'ios' ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 18, alignItems: 'center' }}>
          <DateTimePicker value={asDate} mode="time" display="spinner" minuteInterval={5} themeVariant="light" textColor={C.ink} onChange={(_, d) => d && setValue(fromDate(d))} />
        </View>
      ) : (
        <Btn onPress={() => DateTimePickerAndroid.open({ value: asDate, mode: 'time', onChange: (e, d) => e.type === 'set' && d && setValue(fromDate(d)) })}
          style={{ height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <T w={600}>Pick a time…</T>
        </Btn>
      )}
      <BigBtn title={`Set to ${timeText(value)}`} onPress={() => { onPick(value); onClose(); }} />
    </PickerSheet>
  );
}

export function timeText(minutes: number): string {
  return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
