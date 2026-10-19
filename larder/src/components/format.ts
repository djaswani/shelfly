import { fromISO } from '../dates';

export const shortWeekday = (iso: string) => fromISO(iso).toLocaleDateString('en-US', { weekday: 'short' });
export const madeText = (iso: string) => fromISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
