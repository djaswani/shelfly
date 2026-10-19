// Grocery receipt shorthand → words. Keys are uppercase receipt tokens.
// Add to this as real receipts turn up new abbreviations; user corrections cover the rest.
export const ABBREV: Record<string, string> = {
  // dairy & eggs
  MLK: 'milk', MILK: 'milk', WHL: 'whole', WHOLE: 'whole', SKM: 'skim', RF: 'reduced fat', LF: 'low fat', FF: 'fat free',
  CHS: 'cheese', CHSE: 'cheese', CHEES: 'cheese', CHED: 'cheddar', CHDR: 'cheddar', MOZZ: 'mozzarella', MOZ: 'mozzarella',
  PARM: 'parmesan', SHRD: 'shredded', SHRED: 'shredded', SLCD: 'sliced', SLC: 'sliced',
  YGT: 'yogurt', YOG: 'yogurt', YOGRT: 'yogurt', YGRT: 'yogurt', GRK: 'greek', GREEK: 'greek',
  BTR: 'butter', BUTR: 'butter', BUTTER: 'butter', UNSLTD: 'unsalted', SLTD: 'salted',
  CRM: 'cream', HVY: 'heavy', HVYCRM: 'heavy cream', SR: 'sour', SRCRM: 'sour cream', CRMCHS: 'cream cheese',
  EGG: 'eggs', EGGS: 'eggs', BRWN: 'brown', WHT: 'white', LG: 'large', XL: 'extra large', DZ: 'dozen',
  // meat & fish
  CHKN: 'chicken', CHIC: 'chicken', CKN: 'chicken', CHK: 'chicken', BRST: 'breast', BRS: 'breast', THGH: 'thighs', THG: 'thighs',
  BNLS: 'boneless', SKNLS: 'skinless', BNLESS: 'boneless', GRND: 'ground', GRD: 'ground', BF: 'beef', BEEF: 'beef',
  TKY: 'turkey', TRKY: 'turkey', PRK: 'pork', CHP: 'chop', CHPS: 'chops', BCN: 'bacon', SAUS: 'sausage', SSG: 'sausage',
  SLMN: 'salmon', SALM: 'salmon', SHRMP: 'shrimp', TLPIA: 'tilapia', DELI: 'deli', HAM: 'ham',
  // produce
  BAN: 'bananas', BANS: 'bananas', BANANA: 'bananas', BANANAS: 'bananas', APPL: 'apples', APL: 'apples', AVO: 'avocados', AVOC: 'avocados',
  AVOCADO: 'avocados', HASS: '', TOM: 'tomatoes', TOMS: 'tomatoes', TOMATO: 'tomatoes', POT: 'potatoes', POTS: 'potatoes', POTATO: 'potatoes',
  ONI: 'onions', ONN: 'onions', ONION: 'onions', YEL: 'yellow', YLW: 'yellow', GRLC: 'garlic', GARLIC: 'garlic',
  LETT: 'lettuce', LTC: 'lettuce', ROM: 'romaine', ROMN: 'romaine', SPNCH: 'spinach', SPIN: 'spinach', SPINACH: 'spinach', BBY: 'baby', BABY: 'baby',
  CARR: 'carrots', CRT: 'carrots', CRTS: 'carrots', CUC: 'cucumbers', CUKE: 'cucumbers', CUKES: 'cucumbers', PEPP: 'peppers', PEP: 'peppers', BELL: 'bell',
  BROC: 'broccoli', BRCLI: 'broccoli', CELRY: 'celery', CLRY: 'celery', CILNT: 'cilantro', CILANTRO: 'cilantro', LMN: 'lemons', LEMON: 'lemons',
  LIM: 'limes', LIME: 'limes', STRWB: 'strawberries', STRAWB: 'strawberries', STRW: 'strawberries', BLUEB: 'blueberries', BLUBRY: 'blueberries',
  RASPB: 'raspberries', GRP: 'grapes', GRAPE: 'grapes', MUSH: 'mushrooms', MSHRM: 'mushrooms', ZUCC: 'zucchini', ORG: 'organic', ORGNC: 'organic',
  // bakery & pantry
  BRD: 'bread', BREAD: 'bread', SRDGH: 'sourdough', SOURDOUGH: 'sourdough', BGL: 'bagels', BAGEL: 'bagels', TORT: 'tortillas', TORTS: 'tortillas',
  FLR: 'flour', CRN: 'corn', RICE: 'rice', JASM: 'jasmine', PSTA: 'pasta', PASTA: 'pasta', SPGTI: 'spaghetti', PENNE: 'penne',
  BNS: 'beans', BLK: 'black', CND: 'canned', OIL: 'oil', OLV: 'olive', EVOO: 'olive oil', SUGR: 'sugar', SGR: 'sugar',
  CRL: 'cereal', CEREAL: 'cereal', PB: 'peanut butter', PNT: 'peanut', COFF: 'coffee', CFE: 'coffee', COFFEE: 'coffee',
  SLSA: 'salsa', SALSA: 'salsa', OAT: 'oat', OATS: 'oats', JCE: 'juice', JUICE: 'juice', OJ: 'orange juice', OR: 'orange',
  WTR: 'water', WATER: 'water', SPRKL: 'sparkling', SPKLG: 'sparkling', FRZ: 'frozen', FRZN: 'frozen', PEAS: 'peas',
  // household (non-food)
  PPR: 'paper', TWL: 'towels', TWLS: 'towels', TP: 'toilet paper', TSSU: 'tissue', DET: 'detergent', DTRG: 'detergent', SOAP: 'soap', DISH: 'dish',
};

// Words that mean the line isn't food. Matched after expansion.
export const NON_FOOD = ['paper', 'towels', 'toilet', 'tissue', 'detergent', 'soap', 'shampoo', 'conditioner', 'toothpaste', 'battery',
  'batteries', 'trash', 'foil', 'wrap', 'napkins', 'bleach', 'cleaner', 'sponge', 'diapers', 'wipes', 'pet', 'litter', 'lotion', 'razor', 'bag', 'bags'];

// Store/private-label brand prefixes to drop (Kroger, Great Value, Kirkland, Trader Joe's, 365, Signature, …).
export const BRANDS = new Set(['KRO', 'KROGER', 'GV', 'KS', 'KSIG', 'KIRKLAND', 'TJ', 'TJS', '365', 'WFM', 'SIG', 'SIGNATURE', 'MKT', 'MP', 'PL',
  'HEB', 'PUBLIX', 'MEIJER', 'SMRT', 'STP', 'BOWL', 'GOOD', 'GATHER', 'MISSION', 'BOUNTY', 'CHOBANI', 'OATLY', 'TILLAMOOK']);

// Descriptors that don't belong in the item's display name.
export const DROP_WORDS = new Set(['organic', 'large', 'extra', 'boneless', 'skinless', 'unsalted', 'salted', 'reduced', 'fat', 'low', 'free',
  'whole', 'dozen', 'fresh', 'natural', 'original', 'value', 'pack', 'family', 'size', 'club']);
