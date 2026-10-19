import { useState } from 'react';
import { daysFromToday, isoIn, shortDate } from '../dates';
import { C } from '../theme';
import { DatePickerSheet } from './DatePicker';
import { Btn, Icon, T } from './ui';

// "Good until" chip: shows the date, tap to pick one. `days` is days from today.
export function DateControl({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn accessibilityLabel={`Good until ${shortDate(isoIn(days))}. Change date`} onPress={() => setOpen(true)}
        style={{ height: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.chip, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="calendar_today" size={15} color={C.green} />
        <T size={14} w={600}>{shortDate(isoIn(days))}</T>
        <Icon name="expand_more" size={18} color={C.muted} />
      </Btn>
      {open && <DatePickerSheet iso={isoIn(days)} onPick={(iso) => onChange(Math.max(0, daysFromToday(iso) ?? days))} onClose={() => setOpen(false)} />}
    </>
  );
}
