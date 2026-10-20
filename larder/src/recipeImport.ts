// Import a recipe from a web page through its schema.org Recipe JSON-LD, which most recipe sites
// publish for search engines. Pure apart from `importRecipe`; self-check: `npx tsx scripts/check-recipes.ts`.
import { Recipe } from './data/types';
import { parseIngredient } from './ingredients';

type Json = unknown;
type Obj = Record<string, Json>;

const isObj = (v: Json): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const asArray = (v: Json): Json[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };

// JSON-LD strings often still carry HTML: tags, entities, non-breaking spaces.
export function cleanText(t: string): string {
  return t
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

// ISO-8601 duration ("PT1H30M", "P0DT0H45M") → minutes.
export function isoMinutes(v: Json): number {
  if (typeof v !== 'string') return 0;
  const m = v.trim().match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m) return 0;
  const [d, h, min, s] = m.slice(1).map((x) => Number(x ?? 0));
  return Math.round(d * 1440 + h * 60 + min + s / 60);
}

function servings(v: Json): number {
  for (const y of asArray(v)) {
    if (typeof y === 'number' && y > 0) return Math.round(y);
    const n = typeof y === 'string' ? y.match(/\d+/) : null;
    if (n) return Number(n[0]);
  }
  return 0;
}

function imageUrl(v: Json): string | undefined {
  for (const im of asArray(v)) {
    if (typeof im === 'string' && /^https?:\/\//.test(im)) return im;
    if (isObj(im)) {
      const u = im.url ?? im.contentUrl;
      if (typeof u === 'string' && /^https?:\/\//.test(u)) return u;
    }
  }
  return undefined;
}

// recipeInstructions: one string, a list of strings, HowToSteps, or HowToSections of steps.
function instructions(v: Json): string[] {
  const out: string[] = [];
  const walk = (x: Json) => {
    if (typeof x === 'string') {
      // A single block of text: one step per line (or per paragraph tag before cleaning).
      x.split(/\r?\n|<\/p>|<br\s*\/?>/i).map(cleanText).filter(Boolean).forEach((t) => out.push(t));
    } else if (Array.isArray(x)) x.forEach(walk);
    else if (isObj(x)) {
      if (x.itemListElement) walk(x.itemListElement);
      else if (typeof x.text === 'string') out.push(cleanText(x.text));
      else if (typeof x.name === 'string') out.push(cleanText(x.name));
    }
  };
  walk(v);
  return out.filter(Boolean);
}

const isRecipe = (o: Obj) => asArray(o['@type']).some((t) => typeof t === 'string' && t.toLowerCase() === 'recipe');

// Depth-first search through arrays, @graph and nested objects (some sites wrap it in a WebPage).
function findRecipeNode(v: Json, depth = 0): Obj | null {
  if (depth > 6) return null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = findRecipeNode(x, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (!isObj(v)) return null;
  if (isRecipe(v)) return v;
  for (const k of Object.keys(v)) {
    if (typeof v[k] === 'object') {
      const r = findRecipeNode(v[k], depth + 1);
      if (r) return r;
    }
  }
  return null;
}

function jsonLdBlocks(html: string): Json[] {
  const out: Json[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    try {
      out.push(JSON.parse(raw));
    } catch {
      // Some sites leave raw newlines or tabs inside strings.
      try { out.push(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' '))); } catch { /* not usable */ }
    }
  }
  return out;
}

function metaContent(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const c = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return c ? cleanText(c) : undefined;
}

export function siteName(url: string, html = ''): string {
  const og = metaContent(html, 'og:site_name');
  if (og) return og;
  const host = url.match(/^https?:\/\/([^/?#]+)/i)?.[1] ?? url;
  return host.replace(/^www\./i, '');
}

// The recipe on a page, or null when the page carries no Recipe data. `id` is left to the caller.
export function recipeFromHtml(html: string, url: string): Omit<Recipe, 'id'> | null {
  let node: Obj | null = null;
  for (const block of jsonLdBlocks(html)) {
    node = findRecipeNode(block);
    if (node) break;
  }
  if (!node) return null;
  const ings = asArray(node.recipeIngredient ?? node.ingredients)
    .filter((x): x is string => typeof x === 'string')
    .map(cleanText)
    .filter(Boolean)
    .map((line) => parseIngredient(line));
  const steps = instructions(node.recipeInstructions);
  const title = typeof node.name === 'string' ? cleanText(node.name) : metaContent(html, 'og:title') ?? '';
  if (!title && !ings.length) return null;
  const time = isoMinutes(node.totalTime) || isoMinutes(node.cookTime) + isoMinutes(node.prepTime);
  return {
    title: title || 'Recipe',
    time,
    serves: servings(node.recipeYield),
    origin: 'saved',
    image: imageUrl(node.image) ?? metaContent(html, 'og:image'),
    source: { name: siteName(url, html), url },
    ings,
    steps,
  };
}

export class NoRecipeError extends Error {}

// Fetch a page and read its recipe. On the web build many sites block this with CORS; the phone app is fine.
export async function importRecipe(url: string): Promise<Omit<Recipe, 'id'>> {
  const res = await fetch(url, { headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (!res.ok) throw new Error(`The page returned ${res.status}`);
  const r = recipeFromHtml(await res.text(), res.url || url);
  if (!r) throw new NoRecipeError('No recipe found on that page');
  return r;
}

// Accepts what people paste: missing scheme, surrounding text from a share sheet.
export function normalizeUrl(input: string): string | null {
  const m = input.trim().match(/https?:\/\/\S+/i) ?? input.trim().match(/^[\w.-]+\.[a-z]{2,}(?:\/\S*)?$/i);
  if (!m) return null;
  return /^https?:\/\//i.test(m[0]) ? m[0] : 'https://' + m[0];
}
