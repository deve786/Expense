# Spendly

Minimal expense tracker built with Expo (React Native + TypeScript). Data is stored locally on the device (SQLite). Includes analytics, budget, recurring expenses, CSV export, an AI chatbot, and OTA updates.

## Run it

```bash
npm install
npx expo start          # scan the QR with Expo Go, or press a / i
npm run typecheck
```

## Chatbot setup (one time)

The app never holds your Claude API key. It talks to a tiny proxy in `worker/`.

```bash
cd worker
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY     # paste your key from console.anthropic.com
npx wrangler secret put APP_TOKEN             # optional: any random string
npx wrangler deploy                           # prints https://spendly-chat-proxy.<you>.workers.dev
```

Then in `app.json` set:

```json
"extra": {
  "chatProxyUrl": "https://spendly-chat-proxy.<you>.workers.dev",
  "chatAppToken": "<same APP_TOKEN, if you set one>"
}
```

How it works: the app computes totals locally (monthly and per-category summaries plus the latest 150 expenses) and sends them with your question. The model reads those numbers; it does not calculate them.

Note: `chatAppToken` ships inside the app, so it only deters casual abuse. For stronger protection add Cloudflare rate limiting to the worker.

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
- On every launch the app checks for an update, downloads it, and asks the user to restart (`src/ota.ts`).
- Settings → "Check for updates" does a manual check.
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
  charts.tsx    donut and bar charts (react-native-svg)
  chatContext.ts / chatApi.ts   chatbot data + proxy call
  ota.ts        update checks
worker/         Cloudflare Worker proxy for the Claude API
```
