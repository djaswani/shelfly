import { Platform } from 'react-native';

// Open Food Facts product lookup. Free, no key; data is ODbL (attribution required, see build plan).
export type Product = { code: string; name: string; brand?: string; size?: string; image?: string };

const cache = new Map<string, Product | null>();

export async function lookupBarcode(code: string): Promise<Product | null> {
  if (cache.has(code)) return cache.get(code)!;
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,quantity,image_front_small_url`;
  // OFF asks apps to identify themselves; browsers don't allow setting User-Agent.
  const headers: Record<string, string> = Platform.OS === 'web' ? {} : { 'User-Agent': 'Shelfly/0.1 (pantry app prototype)' };
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) { cache.set(code, null); return null; }
    throw new Error(`Open Food Facts returned ${res.status}`);
  }
  const json = await res.json();
  const p = json.status === 1 ? json.product : null;
  const out: Product | null = p && p.product_name
    ? { code, name: p.product_name, brand: p.brands?.split(',')[0]?.trim(), size: p.quantity, image: p.image_front_small_url }
    : null;
  cache.set(code, out);
  return out;
}
