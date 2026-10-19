"""Convert the USDA FSIS FoodKeeper product table into src/data/foodkeeper.json.

Source: FoodKeeper data (public domain, CC0), via the CSV export in
https://github.com/jelera/food-shelflife-db/tree/HEAD/lib/seeds (ingredients.csv, categories.csv).
fsis.usda.gov blocks scripted downloads, so fetch the CSVs from that mirror:

    python3 scripts/build-foodkeeper.py path/to/ingredients.csv path/to/categories.csv

Where FoodKeeper gives a range we keep the shorter end, so estimates err on the safe side.
"""
import csv
import json
import sys
from pathlib import Path

DAYS = {'hours': 1 / 24, 'days': 1, 'weeks': 7, 'months': 30, 'years': 365}
OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'foodkeeper.json'


def days(row, prefix):
    """Shortest listed duration for one storage column group, in whole days (None if absent)."""
    lo, metric = row.get(prefix + '_Min', '').strip(), row.get(prefix + '_Metric', '').strip().lower()
    if not lo or metric not in DAYS:
        return None
    try:
        return max(0, round(float(lo) * DAYS[metric]))
    except ValueError:
        return None


def first(*vals):
    return next((v for v in vals if v is not None), None)


def main(ingredients_csv, categories_csv):
    with open(categories_csv, newline='') as f:
        cats = [r['Category_Name'] for r in csv.DictReader(f)]

    out = []
    with open(ingredients_csv, newline='') as f:
        for r in csv.DictReader(f):
            name = r['Name'].strip()
            if not name:
                continue
            entry = {
                'n': name,
                's': r['Name_subtitle'].strip(),
                'k': sorted({k.strip().lower() for k in r['Keywords'].split(',') if k.strip()}),
                'c': cats[int(r['Category_ID']) - 1] if r['Category_ID'].isdigit() and int(r['Category_ID']) <= len(cats) else '',
                # Plain storage first, falling back to "from date of purchase" figures.
                'p': first(days(r, 'Pantry'), days(r, 'DOP_Pantry')),
                'f': first(days(r, 'Refrigerate'), days(r, 'DOP_Refrigerate')),
                'z': first(days(r, 'Freeze'), days(r, 'DOP_Freeze')),
                'po': days(r, 'Pantry_After_Opening'),
                'fo': days(r, 'Refrigerate_After_Opening'),
            }
            if any(entry[x] is not None for x in ('p', 'f', 'z')):
                out.append({k: v for k, v in entry.items() if v not in (None, '', [])})

    OUT.write_text(json.dumps(out, separators=(',', ':')) + '\n')
    print(f'wrote {len(out)} products to {OUT}')


if __name__ == '__main__':
    main(*sys.argv[1:3])
