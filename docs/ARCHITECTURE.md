# Architecture

How the apps, shared packages, optional cloud sync and deployment fit
together. It is written for anyone changing this repo. Per-topic detail is in
the linked READMEs and `HOSTING.md` files.

- [The whole system](#the-whole-system)
- [Workspaces](#workspaces)
- [Dependency direction](#dependency-direction)
- [Layers inside an app](#layers-inside-an-app)
- [Platform seams](#platform-seams)
- [Local data](#local-data)
- [Optional sign-in and sync](#optional-sign-in-and-sync)
- [The surfaces](#the-surfaces)
- [Design tokens](#design-tokens)
- [Environments and config](#environments-and-config)
- [CI/CD](#cicd)
- [Hosting](#hosting)
- [Privacy invariants](#privacy-invariants)
- [Checks](#checks)

## The whole system

```text
                               ┌──────────────────────── users ────────────────────────┐
                               │                                                       │
      ┌──────────────┐   ┌─────┴────────┐   ┌──────────────────┐   ┌───────────────────┴┐
      │  ihsaanly.app│   │ iOS / Android│   │ companion.       │   │ Chrome extension   │
      │  marketing   │   │ apps/mobile  │   │ ihsaanly.app     │   │ apps/extension     │
      │  (static,    │   │ (Expo,       │   │ apps/companion   │   │ (MV3 popup +       │
      │  prerendered)│   │  SQLite)     │   │ (SPA, local-     │   │  service worker,   │
      │              │   │              │   │  Storage, SW)    │   │  localStorage)     │
      └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘   └─────────┬──────────┘
             │                  │  shared screens, stores and domain code    │
             │                  └─────────────┬──────┴───────────────────────┘
             │                                │
             │           ┌────────────────────┴───────────────────────┐
             └──────────►│ packages: core · ui · state · cloud · web  │
       (phone demo uses  │ tooling:  tailwind (tokens) · tsconfig     │
        ui + core)       └────────────────────┬───────────────────────┘
                                              │ only after the user signs in
                                              ▼
                          ┌───────────────────────────────────────────┐
                          │ Firebase (per environment)                │
                          │  Auth: Apple, Google                      │
                          │  Cloud Firestore (nam5): users/{uid}/...  │
                          │  ihsaanly-development │ ihsaanly-production│
                          └───────────────────────────────────────────┘
```

**The core rule:** every surface works fully offline with no account. A device
holds the source of truth for its own data. When someone signs in, the cloud
becomes the place where their devices meet. The cloud never replaces local
storage.

## Workspaces

```text
apps/
  mobile/      @ihsaanly/mobile      Expo app for iOS and Android (+ widgets)
  companion/   @ihsaanly/companion   companion.ihsaanly.app: Vite + TanStack Router SPA, offline service worker
  extension/   @ihsaanly/extension   Chrome MV3 extension: popup + background service worker
  marketing/   @ihsaanly/marketing   ihsaanly.app: TanStack Start, prerendered to static files
packages/
  core/        @ihsaanly/core        pure domain: content, planner, prayer times, Hijri, strings
  ui/          @ihsaanly/ui          presentational React Native screens and components
  state/       @ihsaanly/state       stores and hooks over on-device storage; the cloud session
  cloud/       @ihsaanly/cloud       sync ports (interfaces), the sync engine, Firebase adapters
  web/         @ihsaanly/web         Vite/react-native-web config, CSP/.htaccess builders, web glue
  lint/        @ihsaanly/lint        Biome GritQL plugins, the one-useState-per-file checker
tooling/
  tailwind/    @ihsaanly/tailwind    design tokens, generated Tailwind theme, fonts (+ OFL)
  tsconfig/    @ihsaanly/tsconfig    shared compiler strictness
```

Bun installs every workspace into one hoisted `node_modules` (`bunfig.toml`).
React Native autolinking needs one copy of each native module. The version
catalog in the root `package.json` keeps React, TypeScript and zod on a single
version. The shared packages ship TypeScript source through their `exports`,
and nothing is prebuilt.

## Dependency direction

Arrows point from dependency to dependent. There are no cycles, and `core`
and `cloud` depend on no other workspace.

```text
                 @ihsaanly/tailwind (tokens)
                          │
                          ▼
  @ihsaanly/core ───► @ihsaanly/ui ───► @ihsaanly/web ───► companion, extension, marketing
        │                  │
        │                  ▼
        └──────────► @ihsaanly/state ◄── @ihsaanly/cloud
                           │                  │
                           ▼                  ▼
                 mobile, companion, extension (each also imports cloud's
                 platform flow, lazily, and core/ui directly)

  marketing uses core + ui + web only: it has no stores and no sync.
```

- **`core`:** plain TypeScript with no React, React Native, native modules or
  storage. Biome's `noRestrictedImports` enforces this. Anything that runs in
  the app therefore runs in a browser or a test too.
- **`ui`:** props in, JSX out. It has no stores and no router, and it never
  imports an app or `expo-router`.
- **`cloud`:** knows nothing about `state`. It defines the `LocalStore`
  interface, and `state` implements it. See
  [Optional sign-in and sync](#optional-sign-in-and-sync).

## Layers inside an app

Each app route only gathers data. The screens themselves are shared.

```text
 ┌──────────────── app (mobile / companion / extension) ─────────────────┐
 │  route file   useX() hooks from state ──► build screen props ──┐      │
 │  (expo-router │  platform glue: notifications, geofence,       │      │
 │   / TanStack) │  widgets, chrome.alarms, window.open, share…   │      │
 └───────────────┴────────────────────────────────────────────────┼──────┘
                                                                  ▼
 ┌──────────────────────── @ihsaanly/ui ────────────────────────────────┐
 │  <TodayScreen …props/>  <AccountScreen …props/>  components, today/  │
 │  host capabilities come through UiProvider: strings, scheme, Link,   │
 │  raw colours (useColors)                                             │
 └───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
 ┌──────────────────────── @ihsaanly/state ─────────────────────────────┐
 │  preference stores (createPreferenceStore) · event log (events.ts)   │
 │  daily-plan signals · i18n · cloud/session.ts (useAccount)           │
 │                storage/backend  ◄── the platform seam                │
 └───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
 ┌──────────────────────── @ihsaanly/core ──────────────────────────────┐
 │  content/*.json · plan() · prayer windows (adhan) · Hijri · strings  │
 └──────────────────────────────────────────────────────────────────────┘
```

Each screen exports its props type, and `packages/ui/src/screens/fixtures.ts`
holds sample props for each one. The marketing site's phone demo renders these
same screens with props built by `src/demo/engine.ts`.

## Platform seams

One file per platform, selected by the bundler. Code outside the seam never
checks which platform it's on.

```text
 import '@ihsaanly/state/storage/backend'
                │
      package.json "exports" condition
        ┌───────┴──────────────────────────┐
  "default" (Metro / native)          "browser" (Vite)
        ▼                                  ▼
  backend.ts                         backend.web.ts
  expo-sqlite  ihsaanly.db           one JSON blob in localStorage
  (falls back to an in-memory        key ihsaanly.db.v1, mirrored in
   DB if it cannot open)             memory, written straight through
```

The same pattern (`x.ts` / `x.web.ts`) covers `capabilities`,
`i18n/direction` and `ui`'s `sign-in-button`. Both backends export the same
functions, so stores, sync and tests are written once.

## Local data

```text
 preferences                                   events  (append-only)
 ┌──────────┬───────────┬────────────┐         ┌────┬──────────┬─────────┬──────────┬─────────┬───────┬────────┐
 │ key (PK) │ value     │ updated_at │         │ id │ kind     │ subject │ at (ms)  │ log_day │ delta │ synced │
 │          │ JSON text │ ms, 0=old  │         ├────┼──────────┼─────────┼──────────┼─────────┼───────┼────────┤
 ├──────────┼───────────┼────────────┤         │  1 │ prayer-  │ fajr    │ 17…      │ 2026-…  │  …    │ 0 / 1  │
 │ place    │ {lat,…}   │ 17…        │         │    │ performed│         │          │         │       │        │
 │ locale   │ "ar"      │ 17…        │         └────┴──────────┴─────────┴──────────┴─────────┴───────┴────────┘
 │ sync     │ meta      │ (local)    │          UNIQUE (kind, subject, at): an event's identity
 └──────────┴───────────┴────────────┘          reads order by (at, id), so merged events land in time order
```

- **Nothing in `events` is ever updated or deleted.** Unmarking a prayer
  appends a `prayer-unmarked` row. Toggles, qada counts and the fast ledger
  are folds over the log (`packages/state/src/storage/events.ts`). This is
  what makes multi-device merging safe: the merge is a set union.
- **Preference stores** (`createPreferenceStore(key, zodSchema, fallback)`)
  cache in memory and validate on read. `reloadPreferences()` refreshes every
  store after a sync pulls in new values.
- **Migrations** are ordered SQL in `storage/migrations.ts`, tracked by
  `PRAGMA user_version`. Each one runs in a transaction.
- **Export and import** (`buildExport` / `parseExport`) use the same event
  identity, so importing twice changes nothing.

## Optional sign-in and sync

### Ports and adapters

```text
                         @ihsaanly/cloud
 ┌────────────────────────────────────────────────────────────────────────┐
 │ src/ports.ts   AuthService   SyncRemote   LocalStore   Cloud           │
 │                     ▲             ▲            ▲                       │
 │ src/engine.ts  syncOnce(local, remote, uid) · adoptAccount(...)        │
 │                     │             │            │ (depends on ports only)│
 │   ┌─────────────────┴─────┐ ┌─────┴────────────┴─┐                     │
 │   │ src/firebase/         │ │ src/memory/        │  tests + reference  │
 │   │  auth.ts              │ │  auth, sync-remote,│  implementations    │
 │   │  sync-remote.ts       │ │  local-store       │                     │
 │   │  flows/native.ts ─────┼─┼─ createNativeCloud │                     │
 │   │  flows/web.ts ────────┼─┼─ createWebCloud    │                     │
 │   │  flows/extension.ts ──┼─┼─ createExtensionCloud (firebase/auth/    │
 │   └───────────────────────┘ └────────────────────┘   web-extension)    │
 └────────────────────────────────────────────────────────────────────────┘
          ▲ implements LocalStore                    ▲ lazy import()
 @ihsaanly/state/cloud/local-store.ts        apps/*/src/cloud.ts
 @ihsaanly/state/cloud/session.ts  ◄──────── startCloud(load, { onWiped })
```

**Switching provider** (Supabase, Amplify, your own API) takes three steps:

1. Add `src/<provider>/` implementing `AuthService` and `SyncRemote`.
2. Give it `flows/<platform>.ts` functions that return `Cloud`.
3. Point each app's single `import()` at the new flows.

The engine, `state`, `ui` and the apps don't change. The memory adapters and
`engine.test.ts` are the contract a new adapter has to pass.

### Offline-only guarantee (lazy loading)

```text
 app start ──► firebaseConfigFrom(env) ── null? ──► local-only build: no Account row, no startCloud
                        │ config present
                        ▼
               startCloud(load)  ── signed in before on this device? ──no──► nothing loads
                        │ yes (or the user taps Sign in)
                        ▼
               load() = import('@ihsaanly/cloud/firebase/flows/<platform>')   ← separate chunk
```

A user who never signs in never downloads or runs the Firebase SDK, and the
app makes no network calls on their behalf.

### One sync round (`syncOnce`)

It pulls first, so a push never overwrites a newer preference.

```text
 device (LocalStore)                    engine                         Firestore (SyncRemote)
        │                                  │                                     │
        │  readMeta() {boundUid,cursor}    │                                     │
        │◄─────────────────────────────────┤                                     │
        │                                  │ boundUid ≠ uid? ──► 'account-mismatch' (UI asks: merge / fresh)
        │                                  │ pull(uid, cursor) ─────────────────►│ eventMonths where updatedAt > cursor
        │                                  │◄──────────── events, prefs, cursor ─┤ + state/preferences
        │  insertRemoteEvents (OR IGNORE)  │                                     │
        │◄─────────────────────────────────┤                                     │
        │  applyPreferences(newer remote)  │  per key: newer updatedAt wins;     │
        │◄─────────────────────────────────┤  tie + different value → remote     │
        │  unsyncedEvents(), preferences() │                                     │
        ├─────────────────────────────────►│ push(uid, {events, prefs}) ────────►│ merge into month docs + prefs doc
        │  markSynced(ids), writeMeta      │                                     │
        │◄─────────────────────────────────┤                                     │
```

`session.ts` runs a round:

- on sign-in and when a session is restored;
- when the app comes to the foreground or the popup opens (`notifyForeground`);
- 5 s after any local write to a synced key (debounced).

Only one round runs at a time; a request that arrives mid-round queues a
single rerun. Errors become a translated `AccountErrorCode` and never throw
into the UI.

### What syncs

`packages/state/src/cloud/keys.ts` holds `SYNCED_KEYS`, an explicit allowlist,
so a new key never leaks by accident.

| Syncs | Stays on the device |
| --- | --- |
| the event log, `calculation`, `enabledItems`, `knownItems`, `fastBacklog`, `qadaBacklog`, `hijriOffset`, `locale`, `theme`, `notifications`, `onboarding`, `suggestion`, `userState`, `place` (**rounded to 2 decimals, about 1 km**) | `events` settings (they hold the **exact home coordinates** for the geofence), `qadaProcessedThrough` (the device's rollover cursor), `failureLog`, `sync` / `account` metadata |

### Firestore layout and rules

```text
 users/{uid}                          { createdAt, schema: 1 }
 users/{uid}/eventMonths/{YYYY-MM}    { events: { "<at>|<kind>|<subject>": { l: logDay, d: delta } }, updatedAt }
 users/{uid}/state/preferences        { prefs: { <key>: { v: "<json>", t: updatedAtMs } }, updatedAt }
```

The rules are in `packages/cloud/firestore.rules` and tested in
`packages/cloud/test/rules.test.ts` against the emulator:

- deny by default;
- a user can read and write only their own subtree;
- document shapes and sizes are checked;
- `updatedAt` must equal `request.time`, which the pull cursor depends on;
- a month's event map can only grow, so the log is append-only on the server
  too.

One document per month means a whole history uploads in a few dozen writes,
and a sync with no changes costs about 2 reads. That fits the free Spark
quota (20k writes and 50k reads a day, roughly 2k daily active users).

### Account flows

```text
 sign in ──► first time on this device ─────────────► merge: union of events, newest preference wins
         └─► device holds another account's data ───► ask: "Merge into this account" │ "Start fresh"
 sign out ─► ask: "Keep on this device" │ "Remove from this device"   (remove only after a final sync succeeds)
 delete account ─► re-authenticate ─► erase users/{uid}/** ─► delete the Auth user ─► keep/remove prompt
                    (with a linked provider this surface offers; none, e.g. Apple-only in the extension ─► "delete from the app")
```

Someone who already has an account can sign in from onboarding's welcome step
instead of setting up again ("Already use Ihsaanly? Sign in to restore your
data", shown only in a build with the cloud). Their synced setup, `onboarding`
included, arrives with the first sync, and that is what opens the gate.

```text
 welcome ─► "Sign in to restore" ─► Account (restore mode: "Back to setup", no tabs)
                                        │ sign in ─► first sync round ─► useRestoreOutcome()
                                        ▼
         'restoring'   "Restoring your data…" (polite live region)
         'restored'    synced onboarding.completed ─► Today (history replaced)
                         mobile: reminders on + permission never asked ─► "Allow reminders" │ "Not now" ─► Today
         'needs-setup' account never finished setup ─► "Continue setup" ─► next step, still signed in
         'idle'        errors, account-mismatch, link-required ─► the Account screen's usual handling
```

`useRestoreOutcome()` (`packages/state/src/cloud/restore.ts`) is the whole
decision, so the surfaces only navigate. Companion allows `/account` through
the root gate and marks it `?from=onboarding`; mobile holds its onboarding gate
shut while the restore is open, so the reminders question can still be asked
after the synced setup completes onboarding. OS notification permission is per
device and never syncs, and location is never requested: the synced `place`
(about 1 km) is enough for prayer windows. The extension has no onboarding;
signing in from Settings → Account restores the same way.

One person is one Firebase user, whichever of Apple or Google they use: the
project keeps one account per email, and the two providers are linked to the
same uid, so both open the same `users/{uid}` data.

```text
 sign in with B ─► email already has an account on A? ──no──► signed in (new or existing uid)
                         │ yes: auth/account-exists-with-different-credential
                         ▼
              hold B's credential in memory ─► LinkRequiredError ─► status 'link-required'
                         │                                          "Continue with A to open it"
                         ├─ Cancel ──► signed out, held credential forgotten
                         ▼
              sign in with A ─► same uid ─► linkWithCredential(user, B) ─► providers [A, B]
                                            (already linked / in use elsewhere: ignored, still signed in)

 signed in ─► Account → Sign-in methods ─► "Link B" ─► link(B): popup (web) │ native sheet │ chrome.identity
                                                         │ B already opens another uid
                                                         ▼
                                           LinkConflictError ─► 'link-conflict': nothing merged; export,
                                           delete the unused account, link again (or contact support)
```

Linking never relies on `fetchSignInMethodsForEmail`: email-enumeration
protection (on by default) makes it return nothing. Apple's Hide My Email
relay addresses never match a Google email, so those people link by hand.

Sign-in is Apple and Google on mobile (the official SDK buttons) and on
companion (buttons built to each brand's rules). The extension offers Google
only, through `chrome.identity.launchWebAuthFlow`, because MV3 can't load
Firebase's popup code.

## The surfaces

### Mobile (`apps/mobile`)

```text
 expo-router routes (src/app) ──► @ihsaanly/ui screens
      │
      ├─ expo-sqlite (state/backend.ts)          ├─ expo-notifications (local only, no push token)
      ├─ expo-location + geofence (optional)     ├─ widgets (iOS expo-widgets, Android widget lib)
      └─ cloud.ts: Apple/Google tokens ──► createNativeCloud (Firebase JS SDK, memory cache,
                                          auth persisted via expo-sqlite/kv-store)
```

The build variants and the conditional sign-in plugins are set in
`app.config.ts`, which also declares the iOS privacy manifest. The product
specs live in [`apps/mobile/docs`](../apps/mobile/docs).

### Companion (`apps/companion`)

This is the same app on the web: TanStack Router routes over the same `ui` and
`state`, using the `backend.web.ts` localStorage seam.

- **Offline:** a service worker (`scripts/postbuild.ts` → `dist/sw.js`)
  precaches the app, so it works offline.
- **Security:** `postbuild.ts` writes one CSP. It allows Firebase hosts only
  when the build has a Firebase auth domain.
- **Sign-in:** `createWebCloud` uses `signInWithPopup`.

### Extension (`apps/extension`)

```text
 popup.html ──► TanStack Router + ui + state (localStorage)     background.js (service worker)
     │           cloud.ts ─► chrome.identity ─► createExtensionCloud     chrome.alarms, notifications,
     │                                                                   badge; chrome.storage for its
     └─ theme.js (external: MV3 forbids inline scripts)                 own bookkeeping; no cloud code
```

Sync runs in the popup only. `bun run build:extension`,
`build:extension:beta` and `build:extension:both` produce the zips to upload
to the Chrome Web Store (source maps excluded).

### Marketing (`apps/marketing`)

The website at ihsaanly.app, built with TanStack Start.

- **Languages:** 10, with English at `/` and every other language at
  `/<code>/`. The strings are in `src/i18n/messages`.
- **Static hosting:** the host can't run a server, so the build prerenders
  every page, and each server function runs once at build time and ships as
  JSON.
- **Security:** each page gets its own CSP from the hashes of its inline
  scripts, written to `.htaccess`. The build fails on any CSP violation or
  script error seen in headless Chrome.
- **Legal pages:** privacy, terms and delete-account, at `/legal/*`.
- **Phone demo:** `src/demo` renders the app's real `ui` screens with
  react-native-web, in a lazily loaded chunk that stays out of the prerender.

[`apps/marketing/HOSTING.md`](../apps/marketing/HOSTING.md) has the details.

## Design tokens

```text
 tooling/tailwind/tokens.ts ── bun run generate ──► theme.css (Tailwind theme, all web + NativeWind)
            │                                    └► web.css   (light/dark overrides for the site)
            └──────────────────────────────────────► packages/ui/src/colors.ts (raw values for props)
```

`tokens.ts` is the only place a colour or font stack is written down. The
contrast-sensitive tokens (`system-tint`, `field-border`, `rule-strong`,
`accent-ink`, `ink-secondary`) were chosen to meet WCAG 2.2 AA, and any change
to them needs re-measuring.

## Environments and config

```text
 git branch      GitHub environment     Firebase alias (.firebaserc)   Firebase project
 development ──► development      ──► development               ──► ihsaanly-development
 production  ──► production       ──► production                ──► ihsaanly-production
```

- **Local:** `apps/*/.env.development` (used by `vite dev` / `expo start`)
  and `.env.production` (used by builds), all gitignored. The variables are
  `VITE_FIREBASE_*`, or `EXPO_PUBLIC_FIREBASE_*` on mobile, plus the Google
  OAuth client ids.
- **CI:** GitHub environment **variables** hold the Firebase web config. It
  ships in the bundle and isn't a secret; the rules protect the data.
  **Secrets** hold `FTP_*` and `FIREBASE_SERVICE_ACCOUNT`.
- **Turbo:** `turbo.json` declares `VITE_FIREBASE_*`, `VITE_APP_ENV`,
  `VITE_SITE_URL` and the `.env.*` files as build inputs, so the cache never
  serves a build that points at the wrong project or environment.
- **`VITE_APP_ENV`** (`development` | `production`, default production; unset
  under `vite dev` it is development): `deploy-ftp.yml` sets it from the
  deploy's environment, and the extension's `package:beta` sets it to
  development. A development build wears a "Development" (extension: "Beta")
  pill, is never indexed (robots meta, `X-Robots-Tag`, Disallow-all
  `robots.txt`), and the companion's titles and manifest name say "Dev"; the
  beta extension's manifest is named "Ihsaanly Beta". Helpers:
  `packages/web/src/app-env.ts` (Node-safe) and `development-badge.tsx`
  (`isDevelopmentBuild`, folded to a constant by the bundler).

## CI/CD

```text
 push / PR
    │
    ├─► check.yml ─────── lint · typecheck · test · knip · site + companion builds · content validator
    │                  └─ rules job: Firestore emulator (JDK 21) runs test/rules.test.ts
    │
 push to development / production (path-filtered, or run by hand)
    ├─► deploy-marketing.yml ──┐
    ├─► deploy-companion.yml ──┴─► deploy-ftp.yml: turbo build (with that env's Firebase vars)
    │                               └─► FTPS upload to <app>/<branch>/
    └─► deploy-firestore.yml ──► rules tests ─► firebase deploy --only firestore -P <branch>
```

Each deploy runs only on `development` or `production`, in the GitHub
environment of the same name.

**Path filters:** a new branch, or a force-push, can skip the path-filtered
deploys. Start them from the Actions tab with "Run workflow".

## Hosting

```text
 FTP account support@ihsaanly.app  (home = /public_html/ihsaanly.app)
   marketing/production    ─► ihsaanly.app
   marketing/development   ─► dev.ihsaanly.app
   companion/production    ─► companion.ihsaanly.app
   companion/development   ─► dev.companion.ihsaanly.app
```

No site is nested in another. Keep the parent folders free of `.htaccess`,
because Apache applies a parent folder's config to every folder below it. See
[`apps/companion/HOSTING.md`](../apps/companion/HOSTING.md).

## Privacy invariants

Code changes must keep these true. The privacy policy, the sign-in notice and
the store forms all depend on them.

1. No account is needed, and without signing in nothing leaves the device.
   The exceptions are an export or diagnostic report the user sends
   themselves.
2. No analytics, telemetry, crash reporting, ads, installation IDs or push
   tokens.
3. Only `SYNCED_KEYS` sync. Location syncs rounded to about 1 km, and home
   coordinates never sync.
4. The Firebase SDK loads only for someone who has signed in, or is signing in.
5. Account deletion erases the cloud copy, and is available in-app and at
   `/legal/delete-account`.

A change to any of these needs the policy, `SYNCED_KEYS`, the sign-in notice
and the store data forms updated together.

## Checks

| Layer | Tool | Where |
| --- | --- | --- |
| Formatting and lint | Biome, with GritQL plugins | root `biome.json`, `packages/lint` |
| Types | TypeScript | each workspace's `tsconfig.json`, extending `@ihsaanly/tsconfig` |
| Unused code | knip | root `knip.jsonc` |
| Unit tests | `bun test` | `src/**/*.test.ts` in each workspace |
| Sync engine | `bun test` against the memory adapters | `packages/cloud/src/engine.test.ts` |
| Security rules | `@firebase/rules-unit-testing` + emulator | `bun run --cwd packages/cloud test:rules` (JDK 21) |
| Site and web-app output | `bun test`, headless Chrome, CSP checks | `apps/marketing/test`, `apps/companion/test` |
| Mobile health | `expo-doctor`, content validator | `apps/mobile` |
| Licences | `bun run licenses` | writes `THIRD_PARTY_LICENSES.md` |
| Commits | Lefthook, commitlint | `lefthook.json`, `commitlint.config.cjs` |

`bun run check` runs lint, typecheck, tests and knip. CI runs these checks plus
the builds and the rules suite.
