# Shelfly

**Know what's in your kitchen, use it before it turns, and shop for what's actually missing.**

Shelfly is an iPhone app that keeps a household's fridge, freezer and pantry inventory accurate with almost no effort. Most pantry apps fail because people stop updating them within a couple of weeks. Shelfly is built around keeping the list right even when you forget.

American households throw away hundreds of dollars of food per person each year, mostly because nobody remembers what's in the back of the fridge. Shelfly turns "what do we have?" into a five-second answer.

## What it does

- **Adds food fast.** Snap a grocery receipt and Shelfly reads it on your phone, expands store abbreviations ("KRO 2% RF MLK GAL" becomes Milk) and remembers your corrections. Scan a barcode, or tap common foods.
- **Knows when food goes bad.** Good-until dates come from the USDA FoodKeeper guide for 600+ foods. Opening a package shortens the date, and a calendar lets you set your own.
- **Knows when it isn't sure.** Every item's confidence fades over time (c = e^(-t/τ)). Uncertain items read "Probably low", and a one-minute **Quick check** asks about only the few Shelfly is least sure of.
- **Learns your habits.** Buying milk again tells Shelfly the old milk is gone. After a few purchases it learns how often you go through each food and suggests restocking before you run out.
- **Suggests what to cook.** Recipes are ranked by how well they use food that's about to expire. Tap **I cooked this** and Shelfly updates the kitchen in one step.
- **Saves recipes from anywhere.** Share a link from Safari, TikTok, Instagram or YouTube to Shelfly. It reads recipe sites directly and pulls ingredients out of post captions.
- **Sends a useful reminder.** One morning notification about food to use today or tomorrow, paired with a recipe that uses it.
- **Shares one kitchen.** A household joins with a 6-letter code, and changes sync live between phones.
- **Shows the savings.** A monthly recap of food used in time, food tossed, and estimated money saved.

## Privacy and cost

Receipt reading runs entirely on the device (Apple Vision text recognition), so photos never leave the phone. The app uses no paid AI services. Recipe ideas come from TheMealDB and shelf life from public USDA data. Household data is protected by row-level security, so each household can only read its own rows.

## Built with

- **TypeScript** with **React Native** and **Expo** (SDK 57), using Expo Router for navigation
- **Supabase** (PostgreSQL, auth, realtime) for accounts and household sync
- **Python** for the data pipeline that turns USDA FoodKeeper data into the app's shelf-life table
- On-device OCR (`expo-text-extractor`), the camera for barcodes, and an iOS share extension
- Open Food Facts (barcodes), TheMealDB (recipes), schema.org recipe data (link import)

## Repository

| Path | What's there |
| --- | --- |
| `shelfly/` | The app. Setup and run instructions are in [`shelfly/README.md`](shelfly/README.md) |
| `shelfly/src/app/` | Screens (Home, Kitchen, List, Cook, onboarding, receipt, barcode, recipes, settings) |
| `shelfly/src/logic.ts` | Inventory rules: merging purchases, confidence decay, Quick check, restock cadence |
| `shelfly/src/receipt/` | On-device receipt reading and parsing |
| `shelfly/src/sync/` | Sign-in, households and live sync |
| `shelfly/supabase/` | Database schema and security rules |
| `shelfly/scripts/` | Data pipeline, self-checks, and the demo kitchen loader |
| `design/` | The original design prototype |

## Run it

```bash
cd shelfly
npm install
cp .env.example .env    # add your Supabase URL and publishable key
npx expo run:ios        # builds and opens the app in the iOS Simulator
```

Requires a Mac with Xcode. See [`shelfly/README.md`](shelfly/README.md) for the full setup, including the one-time Supabase step.
