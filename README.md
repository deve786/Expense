# Spendly

Minimal expense tracker built with Expo (React Native + TypeScript). Data is stored locally on the device (SQLite). Includes analytics, budget, recurring expenses, CSV export, an AI chatbot, and OTA updates.

## Run it

```bash
npm install
npx expo start          # scan the QR with Expo Go, or press a / i
npm run typecheck
```

## Chatbot setup (one time)

The Ask tab calls Gemini directly from the app — no backend to deploy (same approach as the PERAI project).

```bash
cp .env.example .env
# edit .env, add a free key from https://aistudio.google.com/apikey
npx expo start --clear
```

How it works: the app computes totals locally (monthly and per-category summaries plus the latest 150 expenses) and sends them with your question. The model reads those numbers; it does not calculate them.

**Tradeoff:** `EXPO_PUBLIC_*` variables are inlined into the JS bundle at build time, so the key ships inside the installed app and is extractable from it (e.g. by decompiling the APK). Fine for a personal app on a free-tier key with no billing attached. If that's not acceptable for you, `worker/` still has a Cloudflare Worker proxy that keeps the key server-side instead — deploy it with `wrangler`, point `chatProxyUrl`/`chatAppToken` in `app.json`'s `extra` at it, and swap `askBot()` in `src/chatApi.ts` to call it over HTTP instead of calling Gemini directly.

## OTA updates (EAS Update)

One-time setup:

```bash
npm install -g eas-cli
eas login
eas init                      # creates the EAS project and writes projectId into app.json
eas update:configure          # fills expo.updates.url in app.json
```

Edit `app.json` and set your own `ios.bundleIdentifier` and `android.package` (currently `com.yourname.spendly`).

Build the installable app (needed once, and again whenever native code or the runtime version changes):

```bash
eas build --profile preview --platform android       # APK for testing
eas build --profile production --platform all        # store builds
```

Ship a JS/asset-only change to users instantly:

```bash
eas update --channel preview    --message "Fix chart label"
eas update --channel production --message "Add new feature"
```

How it behaves:
- On launch and every time the app returns to the foreground, it checks for an update and downloads it quietly (`src/useAutoUpdate.ts`).
- A downloaded update shows a dismissible banner at the top of the screen with a one-tap Restart (`src/components/UpdateBanner.tsx`). Ignore it and the update still applies itself automatically the next time you reopen the app after being away for a while — a mid-entry reload never happens.
- Settings → "Check for updates" does an explicit manual check (`src/ota.ts`).
- `runtimeVersion` uses the `appVersion` policy: an update is only delivered to builds with the same `version` in `app.json`. Bump `version` whenever you add or upgrade a native module, and make a new build.
- OTA does not work in Expo Go or dev mode; test it with a preview or production build.

## Project layout

```
app/            screens (Expo Router): tabs + modals
  (tabs)/       Home, History, Analytics, Ask (chatbot), Settings
  expense.tsx   add / edit / delete expense
  recurring.tsx recurring expenses
  categories.tsx custom categories
src/
  db.ts         SQLite schema + queries
  stats.ts      totals, category and trend math
  charts.tsx    ranked category bars + trend chart (react-native-svg)
  chatContext.ts / chatApi.ts   chatbot data + proxy call
  ota.ts            manual "check for updates"
  useAutoUpdate.ts  background check / download / auto-reload
  components/UpdateBanner.tsx   "update ready" banner
worker/         Cloudflare Worker proxy for the Claude API
```
