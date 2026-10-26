import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import { Persisted } from './data/types';
import { locName } from './logic';

export function toCsv(s: Persisted): string {
  const head = ['name', 'location', 'level', 'count', 'unit', 'expires', 'expiry_source', 'opened', 'leftover', 'made'];
  const esc = (v: unknown) => {
    const t = v == null ? '' : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const rows = s.items.map((i) => [i.name, locName(s, i.loc), i.count == null ? i.level : '', i.count ?? '', i.unit ?? '', i.expires ?? '', i.src, i.opened, !!i.leftover, i.made ?? '']);
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export function toJson(s: Persisted): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), items: s.items, list: s.list, locations: s.locs }, null, 2);
}

export async function shareFile(filename: string, content: string, mime: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  // Write a real file so the share sheet offers "Save to Files", AirDrop, Mail and so on.
  if (await Sharing.isAvailableAsync()) {
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create();
    file.write(content);
    await Sharing.shareAsync(file.uri, { mimeType: mime, UTI: mime === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json', dialogTitle: filename });
    return;
  }
  await Share.share({ title: filename, message: content });
}
