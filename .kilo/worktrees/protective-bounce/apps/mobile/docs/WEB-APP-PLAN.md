# Ihsaanly on the web: a 1:1 PWA at companion.ihsaanly.app

Status: planned, not started. Written 2026-09-27 from a research pass against the SDK 58
docs and the code as of commit a4cc4a4. Re-verify the "Research facts" before starting;
Expo previews move.


## Context

The App Store and Play accounts are still being created and reviewed. Until they are, the app should be usable as a full web app: the same 20 screens and behaviour, data kept on the user's device only (the privacy policy promises nothing leaves it), installable, working offline, and laid out for desktop, tablet and phone. Apple Watch / Wear OS come later and are native work (design notes at the end, not part of this build).

Decisions already taken with the owner:
- Host: **`companion.ihsaanly.app`** on the existing GoDaddy cPanel account, deployed by a second FTPS job like the marketing site.
- Reminders on web: **say they need the phone app** (browsers cannot fire anything while the page is closed; server push would break the privacy promise).
- Share on web: **share the dua as text** (browser share sheet, clipboard on desktop); the PNG card stays native.
- Desktop: **sidebar navigation + the existing 720px reading column**; screens stay 1:1 with the phone.

Research facts the plan rests on (verified against the SDK 58 docs and the code):
- `expo-sqlite` supports web **including the sync API** (`openDatabaseSync`), needing a Metro wasm setting and the response headers `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` (we write our own `.htaccess`). Only `withExclusiveTransactionAsync` is missing. The storage seam is three sync files (`src/storage/{database,events,preferences}.ts`, 19 call sites) with in-memory caching already in `preference-store.ts`.
- `react-native-web` has **no `PlatformColor`**; `src/theme/colors.ts` evaluates `Color.ios.*` eagerly inside `Platform.select({...})`, so web needs its own colour file. `Appearance.setColorScheme` and `I18nManager.forceRTL` are not real on web (use `data-theme` / `dir` on `<html>`).
- Not on web at all: `expo-notifications`, `expo-file-system` (`Paths`/`File`), `expo-splash-screen`, `react-native-view-shot`, `Stack.SearchBar`, `Linking.openSettings()`, geofencing (docs tag it web but treat as unsupported). `NativeTabs` renders only a bare fallback on web; Expo recommends `_layout.web.tsx` with headless tabs from `expo-router/ui` (present in this SDK).
- Works on web: `expo-location` foreground, `expo-audio`, `expo-image`, `expo-linear-gradient`, `expo-haptics`, `expo-font`, reanimated (only used in onboarding), `expo-document-picker`. `Surface` already has a flat web fallback. The whole domain (`src/plan`, `src/prayer`, `src/content`…) already runs in the browser (site demo) and in Bun tests.
- `src/app/_layout.tsx:24-25` reads storage at module load (`getLocale()`, `getThemePreference()`); `index.ts` imports `@/events/geofence`, `@/notifications/background-task`, `@/widgets/android/register` before the router.
- The marketing site's `.htaccess` sets `Permissions-Policy: geolocation=()`; the app gets its own document root so its headers are independent.

Conventions to keep (AGENTS.md): platform splits as `*.web.ts` next to the native file with a header comment (pattern: `src/widgets/publish.ts`); routes stay markup-free; screens get props and fixtures; strings in all 10 tables; no `Platform.OS === 'web'` sprinkled in screens.

## One seam for what the device can do

`src/platform/capabilities.ts` (native: all `true`) and `capabilities.web.ts`:

```ts
export const capabilities = { reminders: true, homeDetection: true, shareImage: true, systemSettings: true }
```

Routes read it; screens get nullable props (`onOpenSettings: (() => void) | null`) with fixtures for both states.

---

## Phase 0: Spike (go/no-go, ~1 day)

Files:
- `bunx expo install react-dom react-native-web @expo/metro-runtime`
- `app.json`: `platforms: ["ios","android","web"]`, `web: { output: "single", bundler: "metro", favicon: "./assets/images/icon.png" }`
- `package.json`: `"web": "APP_VARIANT=development expo start --web"`
- `metro.config.js`: add `wasm` to `resolver.assetExts`; `server.enhanceMiddleware` sets COOP/COEP on dev responses (keep `withNativewind` outermost)
- Web twins so the bundle loads at all: `src/storage/database.web.ts` (temporarily `:memory:`), `src/events/geofence.web.ts` (same exports, no-ops), `src/notifications/background-task.web.ts` (`export {}`), `src/theme/colors.web.ts`, and `if (Platform.OS === 'web') return null` in `notifications()` in `src/notifications/schedule.ts` before the dynamic import. Move the file-system imports out of `src/data/export.ts` and `src/app/(more)/data.tsx` and view-shot out of `src/app/(library)/item/[id].tsx` into small modules with `.web.ts` twins (details in Phase 2). `src/widgets/android/register.ts` and `src/widgets/publish.ts` already have no-op bases.

Checks, each with its outcome:
1. **SQLite at module load.** In `database.web.ts` call `openDatabaseSync('ihsaanly.db')` at load like native. Works and survives reload → no boot gate. Throws/hangs → use the boot gate (Phase 1). Works but data gone after reload → stop; use the IndexedDB fallback (Phase 1).
2. **NativeWind v5 rc emits CSS on web** (`p-4`, `gap-4` visible in devtools). If not → pin/fix before anything else; the app cannot ship on web without it.
3. **Colours** with `colors.web.ts`: Today renders in light and dark (toggle `prefers-color-scheme`).
4. `expo-glass-effect`/`expo-blur` import cleanly (Surface takes its flat branch); `expo-device` does not throw.

---

## Phase 1: Storage on web (same schema, same export format)

- `src/storage/migrations.ts`: move `MIGRATIONS` + `migrate()` out of `database.ts` (one-line import change natively).
- `src/storage/database.web.ts`: no `expo-file-system` import; `openDatabaseSync('ihsaanly.db')` with no directory; keep the `:memory:` fallback and `openError`; after opening call `void navigator.storage?.persist?.()` and remember the answer for the Data screen copy. `events.ts`, `preferences.ts`, `preference-store.ts`, `log.ts` stay untouched.
- **Boot gate (only if check 1 says so):** `database.web.ts` exports `let database` plus `openStorage(): Promise<void>` (awaits `openDatabaseAsync`, migrates with the sync calls on the handle, assigns). Extract `ErrorBoundary` to `src/components/route-error.tsx` and the two load-time calls (`setContentLanguage(...)`, `applyThemePreference(...)`) into `boot()` in `src/app-boot.ts`; native `_layout.tsx` calls `boot()` at load (behaviour-identical). `src/app/_layout.web.tsx` re-exports `ErrorBoundary`/`unstable_settings`, shows a wash-coloured view until `openStorage()` and `useFonts` resolve, then calls `boot()` and renders. Confirm no other module reads a store at load (`grep -n "\.get()" src --include=*.ts` outside functions).
- **Fallback only if SQLite-on-web fails:** an IndexedDB adapter behind the same three files (in-memory mirror, write-through). ~2–3 days; same export format; no SQL.

Verify: mark a prayer → hard reload → still marked; Diagnostics shows `lastStorageError: null`.

---

## Phase 2: Platform splits

| Native file | Web twin / change |
|---|---|
| `src/theme/colors.ts` | `colors.web.ts`: getters return CSS variables (`var(--label)`); `global.css` gets `:root` light hex (today's `default` values) and a dark set under `@media (prefers-color-scheme: dark) :root:not([data-theme=light])` and `[data-theme=dark]`. If RNW rejects `var()`, return hex from `paletteFor(currentScheme())` instead. Native file untouched (optional hardening: lazy branches). |
| `src/theme/store.ts` | Move apply/system-scheme into `src/theme/scheme.ts` + `scheme.web.ts` (web: `documentElement.dataset.theme`, `style.colorScheme`, `matchMedia('(prefers-color-scheme: dark)')` + listener). Store/hooks unchanged. |
| `src/i18n/store.ts` | Move `applyDirection` + reload into `src/i18n/direction.ts` + `direction.web.ts` (web: set `dir` and `lang` on `<html>`, `chooseLanguage` returns `false`, no reload; `boot()` applies it on load). |
| `src/app/(more)/data.tsx` | `src/components/confirm.ts` + `confirm.web.ts` (`confirmDestructive(): Promise<boolean>`; native `Alert`, web `window.confirm`). `reloadAppAsync` → `location.reload()` on web (verify; else split). Import via `src/data/read-picked.ts` (native `new File(uri).textSync()`) + `.web.ts` (`await asset.file.text()`). |
| `src/data/export.ts` | `src/data/share-file.ts` (native: File + expo-sharing, unchanged code) + `share-file.web.ts` (Blob → `<a download>`). Export and diagnostics both go through it. |
| `src/app/(library)/item/[id].tsx` | `src/share/share-image.ts` (view-shot) + `.web.ts` (resolves `false` → text path: `navigator.share` if present, else `navigator.clipboard.writeText`; hide the card button via `capabilities.shareImage`). |
| `(library)/index.tsx`, `(more)/index.tsx` | `src/components/header-search.tsx` (`Stack.SearchBar`) + `.web.tsx` (a `TextInput` row above the screen, same `onChangeText`). |
| `(more)/notifications.tsx`, `screens/notifications.tsx` | When `!capabilities.reminders`: note (Phase 6), hide send-test, keep the toggles (they export/import to the phone). `onOpenSettings` nullable. |
| `(more)/location.tsx` | `onOpenSettings` nullable. `src/location/device.ts`: reverse geocoding is native-only → fall back to nearest name from `src/location/cities.ts`. |
| `(more)/events.tsx`, `screens/events.tsx` | Hide home detection when `!capabilities.homeDetection`, with a note. |
| `item/[id].tsx` | `remind` null when `!capabilities.reminders`. |
| Fonts | `useFonts({ 'Amiri-Regular': require('../../assets/fonts/Amiri-Regular.ttf') })` in `_layout.web.tsx` (family name must stay `Amiri-Regular`, see `src/theme/fonts.ts`). |
| Onboarding | Reminders step shows the note on web, no dead permission request. |
| `src/screens/fixtures.ts` | Fixtures for every new nullable prop. |

Verify: `bun run check`; Data screen exports, imports, deletes; Arabic in Amiri; switching to العربية flips layout with no reload.

---

## Phase 3: Web shell and responsive layout

- `src/app/_layout.web.tsx`: headless `Tabs`/`TabList`/`TabTrigger`/`TabSlot` from `expo-router/ui`, same three routes, labels from strings, `palette.accent`. `useWindowDimensions()`: **< 768px** column with a bottom tab bar (respects `env(safe-area-inset-bottom)`); **≥ 768px** row with a left sidebar (brand mark, icon + label per tab, `border-e` so it mirrors in RTL). Shares the onboarding branch with native via `src/components/root-shell.tsx` if the file grows.
- `src/components/tab-icon.web.tsx`: three inline SVG icons (`sf`/`md` names mean nothing on web; no SVG lib installed).
- Stack headers: `src/theme/stack.ts` already sends non-iOS down the flat path; browser back works.
- Content: keep `Screen`'s 720 column (optionally `lg:` 840 via NativeWind media variants). `hovered` style on tab triggers and Rows only.

Verify: screenshots at 390 / 820 / 1440px in English and Arabic; keyboard Tab moves through the tab bar.

---

## Phase 4: PWA and offline

- `public/index.html` (template for `single` output): `lang`, `viewport-fit=cover`, `theme-color` light `#f7f0e9` / dark `#1b1411`, manifest link, apple-touch-icon.
- `public/manifest.webmanifest`: name/short_name "Ihsaanly", `start_url "/"`, `scope "/"`, `display standalone`, colours `#f7f0e9`, icons 192/512/512-maskable (generate from `assets/images/icon.png` with `sips`, commit).
- `sw.js` written by `scripts/build-web.ts` after export: `VERSION` = hash of the file list; precache everything in `dist/` except `.htaccess`/`sw.js` (wasm, fonts, bundle included); navigations network-first with cached `/index.html` fallback; hashed assets cache-first; old caches dropped on activate; `skipWaiting` only on message, `clients.claim()`; cache the real network responses so COOP/COEP survive offline.
- `src/web/register-sw.ts` called once from `_layout.web.tsx`, production only; a waiting worker sets a flag → small in-app "Update ready / Reload" banner (strings, Phase 6).
- Offline means: after first load the app needs no network at all; the only request is the worker's update check. HTTPS required.

Verify: DevTools offline → reload → works; Application panel shows installable.

---

## Phase 5: Build and deploy (companion.ihsaanly.app)

- `package.json`: `"build:web": "APP_VARIANT=production expo export -p web && bun scripts/build-web.ts"`.
- `scripts/build-web.ts` writes `sw.js` and `dist/.htaccess` (mirror `scripts/build-site.ts`'s layout, do not import it): `AddType application/wasm .wasm`, `AddType application/manifest+json .webmanifest`; HTTPS redirect; `RewriteCond !-f/!-d` → `RewriteRule ^ /index.html [L]`; COOP `same-origin`, COEP `require-corp`, CORP `same-origin`; HSTS, nosniff, Referrer-Policy, `X-Frame-Options DENY`; `Permissions-Policy: geolocation=(self), camera=(), microphone=(), …`; `_expo/static/**` immutable 1y, `index.html`/`sw.js`/manifest `no-cache`; DEFLATE incl. wasm; CSP `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'` (hash any inline script in `dist/index.html` as build-site does).
- Workflow: new `.github/workflows/deploy-app.yml` (same shape as `deploy-site.yml`: bun, install, `bun run build:web`, pinned FTP action, `local-dir ./dist/`, `server-dir ${{ secrets.FTP_APP_SERVER_DIR }}`, own concurrency group), path filters `src/**`, `assets/**`, `public/**`, `app.json`, `app.config.ts`, `metro.config.js`, `global.css`, `scripts/build-web.ts`, lockfiles.
- cPanel (owner): Domains → create `companion.ihsaanly.app` with document root **`~/companion.ihsaanly.app/` outside `public_html`** (Apache inherits parent `.htaccess` rules otherwise); run AutoSSL; DNS record is created automatically if the zone is on GoDaddy; add secret `FTP_APP_SERVER_DIR`.
- Alternative kept open: EAS Hosting (`eas deploy`, headers via config; custom domain is paid).

Verify: `curl -I` on `/`, `/item/x`, the `.wasm` shows the headers; `crossOriginIsolated === true` in the console.

---

## Phase 6: Honest copy on web (all 10 string tables)

`web` block in `src/strings/en.ts` + the 9 others: `remindersUnavailable` ("Reminders need the phone app. A browser can't remind you while this page is closed."), `homeDetectionUnavailable`, `storageAtRisk` (shown when `persist()` was refused: export now and then, or add to home screen), `moveData` (the export file works in both web and phone apps — a feature, call it out), `updateReady`/`reload`, optional `installHint` for iOS Safari. Owner call: show the donation link on web (the Play-billing reasoning does not apply).

---

## Phase 7: Testing

- `bun run check` unchanged; new fixtures.
- `scripts/serve-web.ts`: `Bun.serve` over `dist/` with COOP/COEP, wasm MIME, SPA fallback (`python3 -m http.server` cannot send the headers, so SQLite will not load behind it).
- `scripts/smoke-web.ts` (headless Chrome over CDP as used for the site, or Playwright as a dev dep): load → onboarding (pick a city) → mark a prayer → reload → still marked; offline reload renders; switch to Arabic → `html[dir=rtl]`; screenshots at 3 widths; Chromium + WebKit.
- Lighthouse (PWA, performance) on the deployed URL. By hand: iOS Safari tab and home-screen install, Android Chrome install, export on web → import on phone.

---

## Later: watches (design only, native)

A watch is a third renderer of the existing `widgetTimeline` JSON (`src/widgets/model.ts`). **Apple Watch:** SwiftUI watch target + WidgetKit complications via the community `@bacons/apple-targets` config plugin, reading the timeline from the App Group (needs the Apple Developer account, `SHARED_CONTAINER_ENABLED = true`, prebuild; EAS Build support for extra targets is partial). **Wear OS:** no Expo support; a Kotlin/Compose Wear module (Tile + complication) added by a config plugin, fed `widget-timeline.json` over the Data Layer API. Both need real devices; ~1–1.5 weeks each, no new domain code.

## Risks

- Preview SDK + NativeWind rc on web are barely trodden; Phase 0 exists to find out cheaply.
- COEP blocks any future third-party embed/CDN asset without CORP headers (none today).
- Safari: SharedArrayBuffer needs isolation (iOS 15.2+), OPFS sync handles need iOS 17; **browser tabs lose storage after 7 days unused, home-screen installs don't** → the `storageAtRisk`/install copy.
- No reliable local scheduling on the web; not fixable without server push.
- A `.web.ts` twin silently replaces its native file: keep them adjacent with header comments.
- The marketing site's demo becomes redundant; later, point "Try it" at `companion.ihsaanly.app`.

Estimate: Phase 0 1 day; Phases 1–3 3–4 days; 4–5 1.5 days; copy + translations 1 day; testing 1 day.
