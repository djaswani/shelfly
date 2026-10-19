# Larder

Home food inventory app. Spec: `../design/` (Claude Design export) and the build plan in the design project.

Stack: Expo SDK 57, Expo Router (`src/app/`), TypeScript. Data is stored on the device (AsyncStorage) for now.

## Run

The app uses native modules (camera, on-device text recognition), so it runs as its own
**development build**, not in Expo Go.

```bash
npm install
cp .env.example .env    # then fill in the Supabase URL and publishable key
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8   # CocoaPods fails without a UTF-8 locale
npx expo run:ios        # first time, or after adding a native library: builds with Xcode (several minutes)
npx expo start --dev-client   # day to day: just the dev server, the installed app reloads on save
```

On your iPhone: plug it in and run `npx expo run:ios --device`; Xcode signs with your Apple ID.

`ios/` and `android/` are generated (`npx expo prebuild`) and not committed. Native tweaks live in
`plugins/`: `withSceneLifecycle` (iOS 27 requires the UIScene life cycle) and
`withQuotedBundleScript` (lets the build work from a folder with a space in its path).

## What's real vs. stand-in

| Feature | Status |
| --- | --- |
| All 16 design screens, navigation, item sheet, toasts | Built |
| Inventory, list, sweep, cook-to-deduct, leftovers, locations | Built, saved on device |
| Barcode scan → Open Food Facts lookup | Built (camera on phone; typed barcode on web) |
| CSV / JSON export | Built (share sheet on phone, download on web) |
| Receipt reading | Built, free and on-device: Apple Vision / ML Kit text recognition (`src/receipt/ocr.ts`) → rule-based parser with an abbreviation dictionary and FoodKeeper matching (`src/receipt/parse.ts`). Corrections are remembered per receipt line. Typing/pasting text works everywhere, including web |
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
