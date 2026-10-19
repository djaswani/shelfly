import { View } from 'react-native';
import { isoIn, shortDate } from '../dates';
import { C } from '../theme';
import { Btn, Icon, T } from './ui';

// "Good until" stepper: − [date] +. `days` is days from today.
// TODO: tapping the date should open a native date picker (@react-native-community/datetimepicker).
export function DateControl({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  const box = { width: 32, height: 32, borderRadius: 9, backgroundColor: C.chip, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Btn accessibilityLabel="Earlier" onPress={() => onChange(Math.max(0, days - 1))} style={box}>
        <Icon name="remove" size={18} />
      </Btn>
      <View style={{ height: 32, paddingHorizontal: 10, borderRadius: 9, backgroundColor: C.chip, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="calendar_today" size={15} color={C.muted} />
        <T size={14} w={600}>{shortDate(isoIn(days))}</T>
      </View>
      <Btn accessibilityLabel="Later" onPress={() => onChange(days + 1)} style={box}>
        <Icon name="add" size={18} />
      </Btn>
    </View>
  );
}
