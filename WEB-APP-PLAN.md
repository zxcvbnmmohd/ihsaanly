# Ihsaanly on the web: apps/companion at companion.ihsaanly.app

Status: in progress. Replaces the older Expo-web-export plan (written 2026-09-27 for the single-repo app); revised 2026-09-28 for this monorepo.


## Context

`WEB-APP-PLAN.md` (root, identical copy in `apps/mobile/docs/`) was written for the old single-repo app: it plans an **Expo web export** of `apps/mobile` (Metro, `expo-sqlite` wasm + COOP/COEP, `_layout.web.tsx`, `colors.web.ts`…). This monorepo already made most of that unnecessary:

- The 20 screens are presentational in `@ihsaanly/ui` (props in, JSX out, host supplies `UiProvider`).
- The domain is pure in `@ihsaanly/core`; design tokens in `@ihsaanly/tailwind`.
- `apps/marketing` already renders those screens on the web with **Vite + TanStack + react-native-web** (`apps/marketing/vite.config.ts` `reactNativeWeb()`), with web `systemColors` from tokens (`apps/marketing/src/demo/phone.tsx:62-97`).

Goal: a new **client-only SPA** `apps/companion` (TanStack Router + Vite, no Start/SSR) at `companion.ihsaanly.app` on GoDaddy, same design system, that runs the real app with on-device storage, plus **app detection** (open the installed app / get it from the store). Anything the two web apps would repeat moves to a package; the mobile stores move to a package so mobile and companion share them. Own CI/CD job.

Owner decisions carried over from the old plan: reminders on web say "need the phone app"; share = text; desktop = sidebar + 720px column; watches out of scope.

## What changes vs. the old plan

| Old plan | Revised |
|---|---|
| `expo export -p web` of apps/mobile | New `apps/companion`: Vite + `@tanstack/react-router` (file routes via `@tanstack/router-plugin`), `index.html` SPA |
| expo-sqlite wasm, COOP/COEP, boot gate, spike | Storage seam with a **localStorage web backend** (sync, no wasm, no isolation headers). `ponytail:` ceiling ~5 MB (≈ decades of events); upgrade path IndexedDB behind the same seam |
| `colors.web.ts`, `scheme.web.ts`, `_layout.web.tsx`, `header-search.web.tsx` | Not needed: web host passes `systemColors` from tokens, scheme from `<html data-theme>`/`matchMedia`, its own shell and search row |
| Copy `scripts/build-site.ts` layout | Shared `@ihsaanly/web/hosting` (CSP hashing, `.htaccess`/`_headers` writer, preview server) used by both web apps |
| No app detection | iOS Smart App Banner + Android intent link + universal/app links (below) |
| `deploy-app.yml` copy of deploy-site | One reusable FTPS workflow called by both deploys |

## New / changed packages

### 1. `packages/web` → `@ihsaanly/web` (everything marketing and companion would repeat)
Subpath exports, moved out of marketing (marketing then imports them):
- `./vite` — `reactNativeWeb()` plugin, `WEB_EXTENSIONS`, and `rnWebConfig()` returning the `define` / `resolve.extensions` / `optimizeDeps` / `rolldownOptions.shimMissingExports` block (today `apps/marketing/vite.config.ts:9-101`). Marketing's config shrinks to `mergeConfig(rnWebConfig(), {...start plugin})`.
- `./hosting/csp` — `cspHash`, `inlineBlocks`, `RUNTIME_STYLES`, `pageCsp`, `COMMON_HEADERS` (from `apps/marketing/scripts/csp.ts`; `pageCsp` takes overrides e.g. `geolocation=(self)`).
- `./hosting/htaccess` — the `.htaccess` + `_headers` writer from `apps/marketing/scripts/postbuild.ts:78-150`, parameterised: per-page CSP map **or** single policy + SPA fallback (`RewriteCond !-f/!-d → /index.html`), cache tiers, extra `AddType`s.
- `./hosting/serve` — `serve({ root, headers, spa })` from `apps/marketing/scripts/serve.ts` (404 page vs. index fallback).
- `./hosting/chrome` — the headless-Chrome CSP/uncaught-error check from `apps/marketing/test/chrome.test.ts`, taking a page list.
- `./theme` — `THEME_MODES`, `THEME_SCRIPT` (pre-paint), `applyMode`/`nextMode`, `THEME_COLOR` (from `apps/marketing/src/theme.ts` + pure parts of `components/theme-toggle.tsx`).
- `./ui-provider` — `WebUiProvider({ strings, Link })`: scheme from `data-theme`/`matchMedia` with observers, `systemColors` from `@ihsaanly/tailwind/tokens` (from `demo/phone.tsx:62-97,126-147`). Marketing demo and companion both use it.
- `./local-storage` (`readStored`/`storeValue`), `./zod-jitless` (`client-setup.ts`), `./store-badges` (badges take `{ appStore, googlePlay }` URLs; stay "coming soon" while null), `./app-links` (below), `./icons` (brand mark + tab icons from `demo/icons.tsx`).
- `./styles.css` — the shared first lines of `apps/marketing/src/styles.css` (tailwind import, `theme.css`, `web.css`, `@source` ui) + the `:lang()` font rules.

### 2. `packages/state` → `@ihsaanly/state` (stores shared by mobile and companion)
Move from `apps/mobile/src` (mobile imports switch from `@/x` to `@ihsaanly/state/x`):
- `storage/{preference-store,preferences,events,failure-entry,log}.ts`, `migrations.ts`, and the thin stores: `location/store`, `hijri/store`, `memorise/store`, `onboarding/store`, `plan/{enabled-store,suggestion-store,user-state-store,completions,use-plan}`, `prayer/{store,backlog-store,marks}`, `fasting/store`, `events/store`, `notifications/store`, `more/rows`, `hijri/use-hijri-date`, `prayer/use-current-window`, `time/use-now`, `strings/index`, `data/summary`.
- **The one seam**: `storage/backend.ts` (native: current `database.ts` + the ~10 SQL statements in `events.ts`/`preferences.ts`, 1:1) and `backend.web.ts` (localStorage: `preferences` map + `events` array, same functions as filters). `events.ts` keeps only the pure folds (`readToggles`, `readQadaCounts`, `readLedger`) and the version-cached hooks. Web calls `navigator.storage?.persist?.()` once.
- Other `.web.ts` twins (header comment, pattern `src/widgets/publish.ts`): `i18n/direction(.web).ts` (native `I18nManager`+reload; web sets `lang`/`dir` on `<html>`, no reload), `theme/scheme(.web).ts`.
- `capabilities.ts` / `capabilities.web.ts` (`{ reminders, homeDetection, shareImage, systemSettings }`); `use-plan` reads `currentHomeTransition` through it instead of importing the geofence module.
- Stays in mobile: notifications scheduling, geofence, widgets, view-shot, file-system export, `theme/colors.ts`, `modules/theme-override`.

### 3. Small moves into existing packages
- `@ihsaanly/ui/props/*`: the pure "plan → screen props" builders now duplicated between `apps/mobile/src/app/(home)/index.tsx:36-135`, `(library)/item/[id].tsx:33-60`, `(library)/index.tsx:24` and `apps/marketing/src/demo/engine.ts`. Mobile routes, companion routes and the demo engine call them.
- `@ihsaanly/core/i18n`: locale metadata `{ code, dir, nativeName }` (drop the copy in `apps/marketing/src/i18n/locales.ts:24-50`, which adds `hreflang`/`og` on top) and the per-language `loadLanguagePack()` from `demo/language-pack.ts`.

## apps/companion

```
apps/companion/
  index.html            theme pre-paint <script>, manifest, apple-itunes-app meta (injected at build)
  vite.config.ts        rnWebConfig() + tanstackRouter() + tailwind + react
  src/main.tsx          zod-jitless, RouterProvider, WebUiProvider
  src/routes/__root.tsx shell: bottom tabs <768px, sidebar ≥768px (border-e, RTL-safe), onboarding gate, <AppBanner/>
  src/routes/index.tsx, library/index.tsx, item/$id.tsx, item/memorise/$id.tsx, glossary.tsx,
             more/index.tsx, qada.tsx, hijri.tsx, … (same paths as mobile so ihsaanly://<path> maps 1:1)
  src/platform/*        web-only: share-text (navigator.share → clipboard), export (Blob <a download>), import (file.text()), confirm (window.confirm)
  scripts/postbuild.ts  @ihsaanly/web/hosting → .htaccess, _headers, headers.json, sw.js, .well-known/*
  public/               manifest.webmanifest, icons (copy of marketing's icon-512/apple-touch)
  test/                 output + chrome checks via @ihsaanly/web/hosting
```

Routes stay thin: stores from `@ihsaanly/state`, props from `@ihsaanly/ui/props`, screen from `@ihsaanly/ui/screens`. Nullable props when a capability is off (reminders note, no home detection, no image share, no "open settings"), strings in all 10 tables (`web.*`: `remindersUnavailable`, `homeDetectionUnavailable`, `storageAtRisk`, `openInApp`, `getApp`, `updateReady`).

**Headers** (single SPA policy): CSP `default-src 'self'; script-src 'self' <theme-script hash>; style-src 'self' RUNTIME_STYLES; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`, `Permissions-Policy geolocation=(self)`, the rest from `COMMON_HEADERS`. No COEP needed.

**Offline**: postbuild writes a small `sw.js` (precache `dist/` file list, version = hash; navigations network-first → cached `/index.html`; hashed assets cache-first). `ponytail:` hand-rolled, no workbox; registered in production only.

## App detection (open or download)

All config in `@ihsaanly/web/app-links`: `{ scheme: 'ihsaanly', iosAppId: null, androidPackage: 'app.ihsaanly.companion', appStoreUrl: null, playUrl: null }` — everything store-dependent stays hidden while `null` (stores not live yet).
- **iOS Safari**: `<meta name="apple-itunes-app" content="app-id=…, app-argument=https://companion.ihsaanly.app/<path>">` — Safari itself shows *Open* if installed, *Get* if not. Zero JS.
- **Android Chrome**: `<AppBanner>` (dismissible, remembered via `local-storage`) with one link `intent://<path>#Intent;scheme=ihsaanly;package=app.ihsaanly.companion;S.browser_fallback_url=<play url>;end` — opens the app if installed, else Play Store. No detection code.
- **Desktop / installed PWA**: no banner; store badges (shared component) on the More → About screen.
- **Universal / App Links** so shared `companion.ihsaanly.app/item/x` links open the app when installed and the web app otherwise: postbuild writes `.well-known/apple-app-site-association` (served as `application/json`) and `.well-known/assetlinks.json`; `apps/mobile/app.json` gets `ios.associatedDomains: ["applinks:companion.ihsaanly.app"]` and an Android `intentFilters` entry (`autoVerify`, https, host `companion.ihsaanly.app`). Team ID / signing SHA-256 are placeholders until the store accounts exist.

## CI/CD

- `.github/workflows/deploy-ftp.yml` (`workflow_call`, inputs `filter`, `local-dir`, secret `server-dir`): checkout → setup-bun → `bun install --frozen-lockfile` → `bunx turbo build --filter=<filter>` → pinned `SamKirkland/FTP-Deploy-Action@110f918…` over FTPS. Body lifted from `deploy-marketing.yml`.
- `deploy-marketing.yml` becomes a caller (same triggers, adds `packages/web/**`); new `deploy-companion.yml` caller: paths `apps/companion/**`, `packages/**`, `tooling/**`, `bun.lock`; `local-dir ./apps/companion/dist/`; secret `FTP_COMPANION_SERVER_DIR`; own concurrency group; `environment: website`.
- `check.yml`: replace the marketing build step with `bunx turbo build --filter=@ihsaanly/marketing --filter=@ihsaanly/companion`.
- Workspace wiring: `turbo.json` `@ihsaanly/companion#build`/`#test` inputs like marketing's (plus `packages/state`, `packages/web`); root `dev:companion`; `knip.jsonc` workspaces for `apps/companion`, `packages/web`, `packages/state`; `biome.json` overrides (kebab-case, no default export, ui/core import rules) extended to the new paths.
- Owner, once: cPanel → subdomain `companion.ihsaanly.app` with doc root **`~/companion.ihsaanly.app/` outside `public_html`** (else marketing's `.htaccess` is inherited), AutoSSL, add the secret. Documented in `apps/companion/HOSTING.md`.

## Order of work

1. **Rewrite `WEB-APP-PLAN.md`** to this plan; delete the stale copy `apps/mobile/docs/WEB-APP-PLAN.md`.
2. `packages/web`: move vite/hosting/theme/provider/storage/badges/icons out of marketing; marketing imports them. Gate: marketing `turbo build` (its CSP + Chrome tests) still green.
3. `@ihsaanly/ui/props` + core locale/language-pack moves; mobile routes and demo engine use them. Gate: `bun run check`.
4. `packages/state`: move stores behind `backend.ts`; mobile imports switch. Gate: `bun run check`, mobile runs on simulator (mark prayer, restart, still marked).
5. `apps/companion`: shell, routes, `backend.web.ts`, platform shims, strings, postbuild, sw.js, tests.
6. App detection (banner, meta, `.well-known`, mobile `app.json`).
7. CI: reusable workflow, two callers, check.yml, turbo/knip/biome.

## Verification

- `bun run check` at root (lint, knip, typecheck, tests) green.
- `bunx turbo build --filter=@ihsaanly/marketing --filter=@ihsaanly/companion`: both postbuild CSP tests and headless-Chrome checks pass (no CSP violations, no uncaught errors).
- `bun --cwd apps/companion run preview` (shared serve, SPA fallback): onboarding → pick city → mark a prayer → hard reload → still marked; deep URL `/item/<id>` reload works; Arabic flips `html[dir=rtl]` with no reload; theme toggle no flash; DevTools offline → reload still renders; screenshots at 390 / 820 / 1440 px.
- Export on web → import on phone (same JSON format).
- Deployed: `curl -I https://companion.ihsaanly.app/item/x` shows CSP/HSTS and 200 via rewrite; `curl https://companion.ihsaanly.app/.well-known/apple-app-site-association` returns JSON; Android phone shows the banner; iOS shows the Smart App Banner once `iosAppId` is set.
- Push a change under `apps/companion/**` → only `deploy-companion` runs; under `packages/ui/**` → both deploys run.

## Assumptions (say if wrong)
- localStorage over SQLite-wasm on web (simpler, no isolation headers; same export format).
- Mobile stores move into `@ihsaanly/state` (touches many mobile imports, behaviour-identical) — this is what makes the web app DRY rather than a second copy of the stores.
- Store URLs / Apple Team ID don't exist yet → app-detection pieces ship dormant behind `null` config.
