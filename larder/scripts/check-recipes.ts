// Self-check for the pure recipe modules: `npx tsx scripts/check-recipes.ts`.
//   --live           also ask TheMealDB for ideas for the demo kitchen
//   --page <url|file> also read the recipe from a real page (or a saved .html file)
import { demoState } from '../src/data/seed';
import { Persisted } from '../src/data/types';
import { matchItem, nameScore, parseIngredient } from '../src/ingredients';
import { fetchIdeas, mealToRecipe, replaceIdeas, searchTerms } from '../src/mealdb';
import { isoMinutes, normalizeUrl, recipeFromHtml } from '../src/recipeImport';
import { recipeView } from '../src/recipes';

let failed = 0;
function eq(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`);
}

// ── Ingredient lines ─────────────────────────────────────────
const P = (l: string) => parseIngredient(l);
eq('cups + food', P('2 cups baby spinach'), { name: 'Baby spinach', amt: '2 cups' });
eq('count is the amount to use', P('4 boneless chicken thighs'), { name: 'Boneless chicken thighs', amt: '4', use: 4 });
eq('mixed fraction', P('1 1/2 cups jasmine rice'), { name: 'Jasmine rice', amt: '1 1/2 cups' });
eq('unicode fraction, no space', P('1½ tbsp. olive oil'), { name: 'Olive oil', amt: '1½ tbsp.' });
eq('comma note', P('3 cloves garlic, minced'), { name: 'Garlic', amt: '3 cloves, minced' });
eq('descriptors before the comma stay', P('1 lb boneless, skinless chicken breasts, cubed'), { name: 'Boneless, skinless chicken breasts', amt: '1 lb, cubed' });
eq('parenthetical', P('1 (14.5 oz) can diced tomatoes'), { name: 'Diced tomatoes', amt: '1 (14.5 oz) can' });
eq('metric stuck to number', P('400g chicken thighs'), { name: 'Chicken thighs', amt: '400g' });
eq('to taste', P('Salt and pepper to taste'), { name: 'Salt and pepper', amt: 'to taste' });
eq('a pinch of', P('a pinch of chili flakes'), { name: 'Chili flakes', amt: 'a pinch' });
eq('range, size word stays with the amount', P('2-3 large eggs'), { name: 'Eggs', amt: '2-3 large' });
eq('size + count', P('4 large eggs'), { name: 'Eggs', amt: '4 large', use: 4 });
// Lines as real sites write them (RecipeTin Eats, BBC Good Food).
eq('nested parens', P('180g (6oz )  chicken breast (, thinly sliced)'), { name: 'Chicken breast', amt: '180g (6oz), thinly sliced' });
eq('double parens', P('1/2 tsp baking soda / bi-carb ((optional, Note 1))'), { name: 'Baking soda / bi-carb', amt: '1/2 tsp, optional, Note 1' });
eq('prep words after the food', P('1 onion thinly sliced'), { name: 'Onion', amt: '1, thinly sliced', use: 1 });
eq('boneless and skinless after', P('6 chicken thighs boneless and skinless'), { name: 'Chicken thighs', amt: '6, boneless and skinless', use: 6 });
eq('weight + container', P('400g can chopped tomatoes'), { name: 'Chopped tomatoes', amt: '400g can' });
eq('size + unit + of', P('1 small bunch of coriander leaves chopped'), { name: 'Coriander leaves', amt: '1 small bunch, chopped' });
eq('unit without a number', P('Dash of white pepper ((or black))'), { name: 'White pepper', amt: 'Dash, or black' });
eq('drained and rinsed', P('1 can chickpeas drained and rinsed'), { name: 'Chickpeas', amt: '1 can, drained and rinsed' });
eq('or between foods', P('naan breads or cooked basmati rice, to serve'), { name: 'Naan breads or cooked basmati rice', amt: 'to serve' });
eq('no amount', P('Fresh cilantro, for garnish'), { name: 'Fresh cilantro', amt: 'for garnish' });
eq('bullet and spacing', P('▢  250 ml   heavy cream'), { name: 'Heavy cream', amt: '250 ml' });
eq('garlic starts with g', P('2 garlic cloves'), { name: 'Garlic cloves', amt: '2', use: 2 });

// ── Name matching ────────────────────────────────────────────
const demo = demoState();
const M = (name: string) => matchItem(demo.items, { name, amt: '' })?.name ?? null;
eq('baby spinach', M('2 cups baby spinach'.replace(/^2 cups /, '')), 'Baby spinach');
eq('boneless chicken thighs', M(P('4 boneless chicken thighs').name), 'Chicken thighs');
eq('spinach → Baby spinach', M('Spinach'), 'Baby spinach');
eq('rice → Jasmine rice', M('rice'), 'Jasmine rice');
eq('onion → Yellow onions', M('onion'), 'Yellow onions');
eq('garlic cloves → Garlic', M('Garlic cloves'), 'Garlic');
eq('heavy whipping cream → Heavy cream', M('heavy whipping cream'), 'Heavy cream');
eq('cheddar cheese → Cheddar', M('Cheddar cheese'), 'Cheddar');
eq('chicken → Chicken thighs', M('Chicken'), 'Chicken thighs');
eq('extra-virgin olive oil', M('extra-virgin olive oil'), 'Olive oil');
eq('large eggs', M('large eggs'), 'Eggs');
eq('sour cream is not heavy cream', M('sour cream'), null);
eq('coconut milk is not milk', M('coconut milk'), null);
eq('chicken stock is not chicken thighs', M('chicken stock'), null);
eq('turkey does not match the turkey chili leftover', M('turkey'), null);
eq('egg yolks are not eggs', nameScore('egg yolks', 'Eggs'), 0);
eq('ref wins over name', matchItem(demo.items, { ref: 'cream', name: 'Something else', amt: '' })?.id, 'cream');

// ── JSON-LD pages ────────────────────────────────────────────
const page = (...blocks: string[]) => `<!doctype html><html><head><meta property="og:site_name" content="Test Kitchen">
${blocks.map((b) => `<script type="application/ld+json">${b}</script>`).join('\n')}</head><body>…</body></html>`;

// A: a plain Recipe object, HowToStep list, totalTime.
const A = page(JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Recipe', name: 'Creamy Spinach Chicken',
  image: 'https://example.com/a.jpg', totalTime: 'PT35M', recipeYield: '4 servings',
  recipeIngredient: ['4 boneless chicken thighs', '2 cups baby spinach', '1/2 cup heavy cream', '3 cloves garlic, minced'],
  recipeInstructions: [{ '@type': 'HowToStep', text: 'Sear the chicken.' }, { '@type': 'HowToStep', text: 'Add spinach &amp; cream.' }],
}));
const ra = recipeFromHtml(A, 'https://www.example.com/creamy-chicken');
eq('A title', ra?.title, 'Creamy Spinach Chicken');
eq('A time/serves', [ra?.time, ra?.serves], [35, 4]);
eq('A image', ra?.image, 'https://example.com/a.jpg');
eq('A steps (entities decoded)', ra?.steps, ['Sear the chicken.', 'Add spinach & cream.']);
eq('A source', ra?.source, { name: 'Test Kitchen', url: 'https://www.example.com/creamy-chicken' });
eq('A ingredients', ra?.ings.map((g) => g.name), ['Boneless chicken thighs', 'Baby spinach', 'Heavy cream', 'Garlic']);
if (ra) {
  const v = recipeView(demo, { ...ra, id: 'x' });
  eq('A matched to the demo kitchen', v.ings.map((g) => g.it?.id ?? null), ['chicken', 'spinach', 'cream', 'garlic']);
  eq('A uses what expires soon', v.exp.map((e) => e.it!.id).sort(), ['chicken', 'cream', 'spinach']);
}

// B: Yoast-style @graph, @type as an array, ImageObject list, HowToSections, prep+cook time, yield array.
const B = page(
  '{ "broken": "json" ,, }',
  JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'Site' },
      { '@type': 'WebPage', name: 'Page' },
      {
        '@type': ['Recipe', 'NewsArticle'], name: 'Lemon Garlic Pasta &#038; Peas',
        image: [{ '@type': 'ImageObject', url: 'https://example.com/b-16x9.jpg' }, 'https://example.com/b.jpg'],
        prepTime: 'PT10M', cookTime: 'PT1H5M', recipeYield: ['2', '2 bowls'],
        recipeIngredient: ['200 g penne pasta', '1 cup frozen peas', 'Zest of 1 lemon'],
        recipeInstructions: [
          { '@type': 'HowToSection', name: 'Pasta', itemListElement: [{ '@type': 'HowToStep', text: 'Boil the pasta.' }, { '@type': 'HowToStep', text: 'Add the peas for the last <b>2 minutes</b>.' }] },
          { '@type': 'HowToSection', name: 'Finish', itemListElement: [{ '@type': 'HowToStep', name: 'Toss with lemon.' }] },
        ],
      },
    ],
  }),
);
const rb = recipeFromHtml(B, 'https://blog.example.org/pasta');
eq('B title (numeric entity)', rb?.title, 'Lemon Garlic Pasta & Peas');
eq('B time = prep + cook', rb?.time, 75);
eq('B serves', rb?.serves, 2);
eq('B image from ImageObject', rb?.image, 'https://example.com/b-16x9.jpg');
eq('B sections flattened', rb?.steps, ['Boil the pasta.', 'Add the peas for the last 2 minutes.', 'Toss with lemon.']);
if (rb) eq('B pasta and peas matched', recipeView(demo, { ...rb, id: 'y' }).ings.map((g) => g.it?.id ?? null), ['pasta', 'peas', null]);

// C: top-level array, recipe nested in a WebPage's mainEntity, instructions as one block of text.
const C = page(JSON.stringify([
  { '@context': 'https://schema.org', '@type': 'Organization', name: 'Org' },
  { '@type': 'WebPage', mainEntity: {
    '@type': 'Recipe', name: 'Quick Quesadillas', image: { '@type': 'ImageObject', contentUrl: 'https://example.com/c.png' },
    cookTime: 'P0DT0H20M', recipeYield: 3,
    recipeIngredient: ['1 can black beans, drained', '1 cup shredded cheddar cheese', '4 flour tortillas'],
    recipeInstructions: 'Mash the beans.\nFill the tortillas.\r\n\nToast until golden.',
  } },
]));
const rc = recipeFromHtml(C, 'https://www.cooking.example/q');
eq('C title', rc?.title, 'Quick Quesadillas');
eq('C time/serves', [rc?.time, rc?.serves], [20, 3]);
eq('C image contentUrl', rc?.image, 'https://example.com/c.png');
eq('C steps split by line', rc?.steps, ['Mash the beans.', 'Fill the tortillas.', 'Toast until golden.']);
if (rc) eq('C beans and cheddar matched', recipeView(demo, { ...rc, id: 'z' }).ings.map((g) => g.it?.id ?? null), ['beans', 'cheddar', null]);

eq('no recipe data → null', recipeFromHtml(page(JSON.stringify({ '@type': 'Article', name: 'News' })), 'https://x.com'), null);
eq('no JSON-LD → null', recipeFromHtml('<html><body>Hi</body></html>', 'https://x.com'), null);
eq('site name falls back to host', recipeFromHtml(A.replace(/<meta[^>]*>/, ''), 'https://www.example.com/p')?.source?.name, 'example.com');
eq('iso durations', ['PT1H30M', 'PT45M', 'P1DT2H', 'PT0.5H', 'nope'].map(isoMinutes), [90, 45, 1560, 30, 0]);
eq('normalize pasted links', ['example.com/r', 'Look at this https://a.co/x?y=1 yum', 'not a link'].map(normalizeUrl), ['https://example.com/r', 'https://a.co/x?y=1', null]);

// ── TheMealDB ────────────────────────────────────────────────
const meal = {
  idMeal: '52772', strMeal: 'Teriyaki Chicken Casserole', strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
  strInstructions: 'STEP 1\r\nPreheat oven to 350° F.\r\n2. Combine soy sauce and sugar.\r\n\r\nBake 35 minutes.',
  strIngredient1: 'soy sauce', strMeasure1: '3/4 cup', strIngredient2: 'Chicken Breasts', strMeasure2: '2', strIngredient3: 'Baby Spinach', strMeasure3: ' ',
  strIngredient4: '', strMeasure4: '', strIngredient5: null, strMeasure5: null,
};
const mr = mealToRecipe(meal);
eq('meal id/origin/source', [mr.id, mr.origin, mr.source?.name], ['mdb52772', 'idea', 'TheMealDB']);
eq('meal ingredients', mr.ings, [{ name: 'Soy sauce', amt: '3/4 cup' }, { name: 'Chicken breasts', amt: '2', use: 2 }, { name: 'Baby spinach', amt: '' }]);
eq('meal steps', mr.steps, ['Preheat oven to 350° F.', 'Combine soy sauce and sugar.', 'Bake 35 minutes.']);
eq('search terms: four soonest, then two staples', searchTerms(demo.items, () => 0.5).map((t) => t.weight), [2, 2, 2, 2, 1, 1]);
const withIdea: Persisted = { ...demo, recipes: [...demo.recipes, { ...mr, origin: 'saved' }] };
eq('replaceIdeas keeps saved ones', replaceIdeas(withIdea, []).recipes.map((r) => r.id), ['r1', 'r2', 'r4', 'mdb52772']);

async function live() {
  const args = process.argv.slice(2);
  if (args.includes('--live')) {
    const t = Date.now();
    const ideas = await fetchIdeas(demo);
    console.log(`\nTheMealDB: ${ideas.length} ideas in ${Date.now() - t} ms`);
    for (const r of ideas) {
      const v = recipeView(demo, r);
      console.log(`  ${r.title} · have ${v.haveN}/${r.ings.length} · uses ${v.exp.map((e) => e.it!.name).join(', ') || '-'} · ${r.steps.length} steps · ${r.image ? 'photo' : 'no photo'}`);
    }
    if (!ideas.length) failed++;
  }
  const pi = args.indexOf('--page');
  if (pi >= 0) {
    const src = args[pi + 1];
    const isUrl = /^https?:\/\//.test(src);
    // Loaded by name so the app's typecheck doesn't need Node's types.
    const fsName = 'fs';
    const html: string = isUrl ? await (await fetch(src)).text() : (await import(fsName)).readFileSync(src, 'utf8');
    const r = recipeFromHtml(html, isUrl ? src : 'https://example.com/saved-page');
    console.log(`\nPage ${src}:`);
    if (!r) { failed++; console.log('  FAIL no recipe found'); return; }
    console.log(`  ${r.title} · ${r.time} min · serves ${r.serves} · ${r.ings.length} ingredients · ${r.steps.length} steps · image ${r.image ? 'yes' : 'no'} · from ${r.source?.name}`);
    r.ings.slice(0, 5).forEach((g) => console.log(`    ${g.name}  [${g.amt}]`));
    console.log(`    step 1: ${r.steps[0]?.slice(0, 90)}`);
  }
}

live().then(() => {
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
});
