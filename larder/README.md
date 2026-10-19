# Larder

Home food inventory app. Spec: `../design/` (Claude Design export) and the build plan in the design project.

Stack: Expo SDK 57, Expo Router (`src/app/`), TypeScript. Data is stored on the device (AsyncStorage) for now.

## Run

```bash
npm install
npx expo start          # scan the QR code with Expo Go on your phone
npx expo start --web    # browser preview
```

## What's real vs. stand-in

| Feature | Status |
| --- | --- |
| All 16 design screens, navigation, item sheet, toasts | Built |
| Inventory, list, sweep, cook-to-deduct, leftovers, locations | Built, saved on device |
| Barcode scan → Open Food Facts lookup | Built (camera on phone; typed barcode on web) |
| CSV / JSON export | Built (share sheet on phone, download on web) |
| Receipt reading | Stand-in: camera works, review shows a sample receipt. Needs the AI parsing service |
| "New ideas" recipes | Stand-in: reveals prewritten ideas. Needs AI generation |
| Expiry estimates | USDA FoodKeeper (612 foods, `src/foodkeeper.ts`); unmatched foods fall back to a rough table and are labelled "Rough estimate" |
| Confidence decay | Built: c(t) = e^(-t/τ), τ from shelf life (4–30 days); "Probably" below 0.5, Sunday sweep below 0.3 (max 15 items) |
| Accounts, household sharing, sync, invites | Not started. Needs Supabase |
| Larder Plus purchases | Not started. Needs RevenueCat + store accounts (dev builds just flip a flag) |
| Daily digest notification | Setting only. Needs expo-notifications |
| Monthly recap weekly chart / tossed list | Design placeholders until there's an events log |

## Layout

- `src/app/` routes: `(tabs)/` Home, Kitchen, List, Cook; modals `add`, `scan`, `receipt`, `sweep`, `recipe/[id]`, `settings`, `recap`, `plus`
- `src/logic.ts` inventory rules ported from the design (merge, sweep, levels)
- `src/recipes.ts` "uses what expires soonest" ranking
- `src/data/seed.ts` demo data and static content; `src/store.tsx` state + persistence
