// Recipes from links people share: recipe sites (schema.org JSON-LD, via recipeImport) and social
// posts (TikTok, Instagram, YouTube), where the recipe, if any, lives in the caption.
// Pure apart from `importAny`; self-check: `npx tsx scripts/check-recipes.ts`.
import { Recipe } from './data/types';
import { parseIngredient } from './ingredients';
import { cleanText, recipeFromHtml, siteName } from './recipeImport';

export type Imported = { recipe: Omit<Recipe, 'id'>; kind: 'recipe' | 'caption' | 'link' };

const SOCIAL: { re: RegExp; name: string }[] = [
  { re: /(^|\.)tiktok\.com$/i, name: 'TikTok' },
  { re: /(^|\.)instagram\.com$/i, name: 'Instagram' },
  { re: /(^|\.)(youtube\.com|youtu\.be)$/i, name: 'YouTube' },
  { re: /(^|\.)facebook\.com$/i, name: 'Facebook' },
  { re: /(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/i, name: 'Pinterest' },
];

const host = (url: string) => url.match(/^https?:\/\/([^/?#]+)/i)?.[1]?.replace(/^www\.|^m\./i, '') ?? '';
export const socialName = (url: string) => SOCIAL.find((s) => s.re.test(host(url)))?.name;

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;
const BULLET = /^\s*(?:[-–—•*▪▫◦●○✓✔☑✅→>]|\d+\s*[.)]\s+|step\s*\d+\s*[:.)-]?)\s*/i;
const AMOUNT_START = /^\s*(?:[-•*▪◦●]\s*)?(?:\d|[¼½¾⅓⅔⅛]|(?:a\s+(?:pinch|handful|dash|splash|few)|one|two|three|four|half)\b)/i;
const ING_HEAD = /^\s*(?:ingredients?|you(?:'|’)ll need|what you need|shopping list)\b\s*[:\-–]?\s*$/i;
const STEP_HEAD = /^\s*(?:method|instructions?|directions?|steps?|how to(?: make (?:it|this))?|preparation|recipe)\b\s*[:\-–]?\s*$/i;
const NUMBERED = /^\s*(?:\d+\s*[.)]|step\s*\d+)\s*/i;

// Instagram's og:description reads `123 likes, 4 comments - chef on May 1, 2026: "caption"`.
export function captionText(raw: string): string {
  let t = raw.replace(/\r/g, '');
  const ig = t.match(/^[\d.,KkMm]+\s+likes?,\s*[\d.,KkMm]+\s+comments?\s*-\s*[^:]+:\s*/);
  if (ig) t = t.slice(ig[0].length);
  t = t.replace(/^["“]|["”]\.?\s*$/g, '');
  return t;
}

const tidyLine = (l: string) => cleanText(l.replace(EMOJI, ' ')).replace(/\s*#[\p{L}\p{N}_]+/gu, '').replace(/@[\w.]+/g, '').trim();

// A caption → title, ingredients and steps, as well as a free-form caption allows.
// With "Ingredients:" / "Method:" headings the sections are taken as written; otherwise lines that
// start with an amount are ingredients and numbered lines are steps.
export function recipeFromCaption(caption: string, opts: { url: string; source: string; image?: string; author?: string }): Imported {
  const text = captionText(caption);
  // Some captions arrive on one line with bullets as separators.
  const rawLines = text.includes('\n') ? text.split('\n') : text.split(/\s(?=[•▪◦●✓✔✅-]\s)|\s(?=\d+\.\s)/);
  const lines = rawLines.map((l) => ({ raw: l, t: tidyLine(l) })).filter((l) => l.t && !/^[#\s]+$/.test(l.t));

  const ings: string[] = [];
  const steps: string[] = [];
  let mode: 'none' | 'ings' | 'steps' = 'none';
  let titleLine = '';
  for (const { raw, t } of lines) {
    if (ING_HEAD.test(t)) { mode = 'ings'; continue; }
    if (STEP_HEAD.test(t)) { mode = 'steps'; continue; }
    const body = t.replace(BULLET, '').trim();
    if (!body) continue;
    if (mode === 'ings') {
      if (NUMBERED.test(raw) && ings.length && !AMOUNT_START.test(body)) { mode = 'steps'; steps.push(body); } else ings.push(body);
    } else if (mode === 'steps') steps.push(body);
    else if (NUMBERED.test(raw) && body.split(' ').length > 3) steps.push(body);
    else if (AMOUNT_START.test(t) && body.split(' ').length <= 10) ings.push(body);
    else if (!titleLine) titleLine = body;
  }

  const short = titleLine.replace(/[.!:]+$/, '').trim();
  const title = short && short.length <= 70 ? short : short ? short.slice(0, 60).replace(/\s+\S*$/, '') + '…' : `Recipe from ${opts.author ? '@' + opts.author.replace(/^@/, '') : opts.source}`;
  const recipe: Omit<Recipe, 'id'> = {
    title, time: 0, serves: 0, origin: 'saved', image: opts.image,
    source: { name: opts.source, url: opts.url },
    ings: ings.map((l) => parseIngredient(l)), steps,
  };
  return { recipe, kind: ings.length ? 'caption' : 'link' };
}

// A JSON string value embedded in a page's script data ("key":"…"), unescaped.
function jsonField(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  if (!m) return undefined;
  try { return JSON.parse(`"${m[1]}"`); } catch { return undefined; }
}

// YouTube pages embed the full description in their player JSON.
export const youtubeDescription = (html: string) => jsonField(html, /"shortDescription":"((?:[^"\\]|\\.)*)"/);

// TikTok video pages carry the caption, cover and author in their rehydration JSON.
export function tiktokPost(html: string) {
  const at = html.indexOf('"itemStruct":');
  const part = at >= 0 ? html.slice(at, at + 200_000) : '';
  return {
    caption: jsonField(part, /"desc":"((?:[^"\\]|\\.)*)"/),
    image: jsonField(part, /"(?:originCover|cover)":"((?:[^"\\]|\\.)*)"/),
    author: jsonField(part, /"uniqueId":"((?:[^"\\]|\\.)*)"/),
  };
}

function meta(html: string, prop: string): string | undefined {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i'))?.[0];
  const c = tag?.match(/content=["']([^"']*)["']/i)?.[1] ?? tag?.match(/content="([^"]*)"/i)?.[1];
  return c ? cleanText(c.replace(/&#10;|&#x0?a;/gi, '\n')) : undefined;
}

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

// Any shared or pasted link → something to save. Throws only when the page can't be reached.
export async function importAny(input: string): Promise<Imported> {
  const res = await fetch(input, { headers: { Accept: 'text/html,application/xhtml+xml' } });
  const url = res.url || input;
  const html = res.ok ? await res.text() : '';
  if (!res.ok && !socialName(url)) throw new Error(`The page returned ${res.status}`);

  const full = html && recipeFromHtml(html, url);
  if (full) return { recipe: full, kind: 'recipe' };

  const social = socialName(url);
  const source = social ?? siteName(url, html);
  let caption = '';
  let image = meta(html, 'og:image');
  let author: string | undefined;
  let title = meta(html, 'og:title');

  if (social === 'TikTok') {
    const p = tiktokPost(html);
    caption = p.caption ?? '';
    image = p.image ?? image;
    author = p.author;
    // oEmbed as a fallback when the page didn't include its data.
    if (!caption) {
      const o = await getJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (o?.title) { caption = String(o.title); image = (o.thumbnail_url as string) ?? image; author = (o.author_unique_id as string) ?? author; }
    }
  } else if (social === 'YouTube') {
    caption = youtubeDescription(html) ?? '';
    const o = await getJson(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    if (o) { title = String(o.title ?? title ?? ''); image = (o.thumbnail_url as string) ?? image; author = o.author_name as string; }
    // The video title is a better recipe name than the description's first line.
    if (title) caption = `${title}\n${caption}`;
  }
  if (!caption) caption = meta(html, 'og:description') ?? meta(html, 'description') ?? '';
  if (!caption && title) caption = title;
  const out = recipeFromCaption(caption, { url, source, image, author });
  // A plain web page with no recipe data: name it after the page rather than its blurb.
  if (!social && title && out.kind === 'link') out.recipe.title = title;
  return out;
}
