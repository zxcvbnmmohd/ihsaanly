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
 │ src/ports.ts   AuthService  SyncRemote  LocalStore  FeedbackService  Cloud │
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
        │  readMeta() {version,boundUid,   │                                     │
        │   cursor,profileWritten,...}     │                                     │
        │◄─────────────────────────────────┤                                     │
        │                                  │ boundUid ≠ uid? ──► 'account-mismatch' (UI asks: merge / fresh)
        │                                  │ version < 2? ──► resetSynced, cursor = null (re-push all)
        │                                  │ pull(uid, cursor) ─────────────────►│ ONE query: sync where updatedAt > cursor
        │                                  │◄──────────── events, prefs, cursor ─┤ (changed months + prefs if changed)
        │  insertRemoteEvents (OR IGNORE)  │                                     │
        │◄─────────────────────────────────┤                                     │
        │  applyPreferences(newer remote)  │  per key: newer updatedAt wins;     │
        │◄─────────────────────────────────┤  tie + different value → remote     │
        │  unsyncedEvents(), preferences() │  push a key only if its stamp ≠     │
        ├─────────────────────────────────►│  meta.syncedPreferences[key]        │
        │                                  │ push(uid, {events, prefs,           │
        │                                  │   profile: !profileWritten}) ──────►│ one batch: months + prefs (merge),
        │                                  │                                     │ users/{uid} on the first push only
        │  markSynced(ids), writeMeta      │                                     │
        │◄─────────────────────────────────┤                                     │
```

`session.ts` runs a round:

- on sign-in and when a session is restored;
- when the app comes to the foreground or the popup opens (`notifyForeground`)
  and the live listener is not attached, unless the last successful sync (the
  persisted `lastSyncedAt`) was less than 2 minutes ago
  (`FOREGROUND_SYNC_INTERVAL_MS`), so flipping between apps costs no reads;
- 5 s after any local write to a synced key (debounced), 1 s for item
  progress (`progress:*`; a pending 5 s push is brought forward with it);
- when the screen asks (`syncNow`).

Only the foreground trigger is throttled; the others always run.

**Live updates.** After a successful round, while the app is in front, the
session holds the pull query open as a listener (`SyncRemote.watch`, a
Firestore `onSnapshot` on `sync where updatedAt > cursor`). What it delivers is
folded in by `applyRemoteChanges` — no pull, the listener already paid for the
read — and the cursor moves on. `notifyBackground()` (apps call it when hidden
or backgrounded) detaches it; the next `notifyForeground()` syncs (throttled)
or, inside the throttle, just re-attaches from the cursor, which catches up on
what it missed. Signing out, switching or deleting the account detaches it
too. A popup counts as in front while it is open. Cost: the first snapshot is
one read, then one read per changed document (this device's own pushes
included), nothing while nobody writes.

The same sign-in, restore and foreground triggers also flush the feedback
outbox (see Feedback below).

Only one round runs at a time; a request that arrives mid-round queues a
single rerun. Errors become a translated `AccountErrorCode` and never throw
into the UI.

### What syncs

`packages/state/src/cloud/keys.ts` holds `SYNCED_KEYS`, an explicit allowlist,
so a new key never leaks by accident, plus one prefix: item progress,
`progress:<itemId>` (`packages/state/src/progress`), one key per item for its
current period, pruned on every progress write (earlier days, then the oldest
past `MAX_PROGRESS_KEYS`) so the preferences stay within the rules' 64 keys.
A pruned or cleared key is deleted remotely (`PushChanges.removedPreferences`).
When both devices changed the same item's progress for the same period since
they last agreed, the engine merges instead of newest-wins: the higher count
and every part either did (`LocalStore.mergePreference`).

| Syncs | Stays on the device |
| --- | --- |
| the event log, `calculation`, `enabledItems`, `knownItems`, `fastBacklog`, `qadaBacklog`, `hijriOffset`, `locale`, `theme`, `notifications`, `onboarding`, `suggestion`, `userState`, `place` (**rounded to 2 decimals, about 1 km**) | `events` settings (they hold the **exact home coordinates** for the geofence), `qadaProcessedThrough` (the device's rollover cursor), `failureLog`, `sync` / `account` metadata, `feedbackOutbox` (unsent feedback), `todayHints` (tour seen, prayers marked for the hint) |

### Firestore layout and rules

Layout 2 (`SYNC_META_VERSION = 2` in `packages/cloud/src/engine.ts`):

```text
 users/{uid}                          { createdAt, schemaVersion: 2 }
 users/{uid}/sync/preferences         { type: 'preferences', preferences: { <key>: { value: "<json>", updatedAt: ms } }, updatedAt }
 users/{uid}/sync/{YYYY-MM}           { type: 'events', month: 'YYYY-MM', events: { "<at>|<kind>|<subject>": { logDay, deltaSeconds } }, updatedAt }
 feedback/{autoId}                    { uid, kind, message, contactEmail, app, diagnostics, createdAt, status: 'new' }
 feedbackLimits/{uid}                 { lastSentAt }
```

Example documents:

```jsonc
// users/abc123/sync/2025-10
{
  "type": "events",
  "month": "2025-10",
  "events": {
    "1760000000000|prayer-performed|fajr": { "logDay": "2025-10-09", "deltaSeconds": null },
    "1760020000000|prayer-performed|dhuhr": { "logDay": "2025-10-09", "deltaSeconds": 120 }
  },
  "updatedAt": "2025-10-09T12:00:00.123456Z" // serverTimestamp()
}

// users/abc123/sync/preferences
{
  "type": "preferences",
  "preferences": {
    "theme": { "value": "\"dark\"", "updatedAt": 1760000000000 },
    "place": { "value": "{\"latitude\":51.5,\"longitude\":-0.13,...}", "updatedAt": 1759990000000 }
  },
  "updatedAt": "2025-10-09T12:00:00.123456Z"
}
```

Months and preferences share the `sync` collection on purpose: one query,
`updatedAt > cursor` ordered by `updatedAt`, returns every changed month and
the preferences document if (and only if) it changed. The cursor is the
newest `updatedAt` seen, with nanoseconds.

The rules are in `packages/cloud/firestore.rules` and tested in
`packages/cloud/test/rules.test.ts` against the emulator:

- deny by default;
- a user can read and write only their own subtree;
- `users/{uid}`: exactly `{createdAt, schemaVersion}`, `createdAt ==
  request.time`, `schemaVersion` an int. Create and update are the same
  check, so a second device rewriting it is allowed;
- `sync/preferences`: exactly `{type, preferences, updatedAt}`,
  `type == 'preferences'`, at most 64 keys;
- `sync/{YYYY-MM}`: exactly `{type, month, events, updatedAt}`,
  `type == 'events'`, `month` equal to the document id, at most 3000 events;
  an update may add events but never drop one, so the log is append-only on
  the server too. Any other id under `sync` is refused;
- `updatedAt` must equal `request.time`, which the pull cursor depends on;
- layout 1 (`eventMonths/*`, `state/preferences`) is read- and delete-only
  for the owner, so deleting an account still removes it. Remove those two
  matches (and the `lastAt` fallback below) in a release after every client
  has synced in layout 2;
- `feedback` is create-only, for a signed-in user writing their own `uid`,
  with an exact field allowlist, size caps (message 1–5000, email ≤254, the
  diagnostics map ≤16 top-level keys), `status == 'new'` and
  `createdAt == request.time`. No client may read, update or delete it;
- the feedback rate limit needs no Cloud Functions: each send's batch also
  stamps `feedbackLimits/{uid}.lastSentAt` with `request.time`, and the
  feedback rule checks that stamp with `getAfter` and requires the previous
  one (if any) to be at least 60 s old. A stamp from before the rename
  (`lastAt`) counts the same until the next send replaces it. The owner may
  create and update (only to `request.time`) their limit doc, but never read
  or delete it: deleting it before each send would bypass the limit.

**Index exemptions** (`packages/cloud/firestore.indexes.json`): Firestore
indexes every field, map entries included, by default. Nothing queries
inside `sync.events`, `sync.preferences`, `feedback.diagnostics` or
`feedback.message`, so those four have `"indexes": []`: every event key
would otherwise be an index entry (write cost, and the 40k-entries-per-doc
limit a full month could approach), and a 5000-character message would be
indexed for nothing. `sync.updatedAt` (the pull query) and feedback's
`createdAt`, `kind` and `status` (the console view) keep the default
indexes.

**Cost per sync** (one round, after the first):

| Round | Reads | Writes |
| --- | --- | --- |
| nothing changed anywhere | 1 (the query's minimum) | 0 |
| another device changed _n_ months / the preferences | _n_ (+1 for preferences) | 0 |
| this device logged events in _m_ months / changed preferences | 1 | _m_ (+1), one batch |
| first push for an account on this device | 1 | + 1 (`users/{uid}`; remembered in local meta as `profileWritten`) |

One document per month means a whole history uploads in a few dozen writes.
With the 2-minute foreground throttle, that fits the free Spark quota (20k
writes and 50k reads a day) for a few thousand daily active users.

**Migration from layout 1** (only test accounts held layout-1 data): the
device's sync meta carries a `version`. Meta written by a layout-1 client
parses as version 1, and its next sync resets the cursor, marks the whole
local log unsynced and forgets which preferences were pushed, so every
device writes its own data into layout 2 (events are unique by identity, so
several devices doing it converge). Nothing is migrated server-side; the
old documents stay until the account is deleted, when `erase()` removes
them with the rest.

### Feedback

`FeedbackService.send(uid, draft)` (in `ports.ts`) writes `feedback/{autoId}`
and `feedbackLimits/{uid}` in one batch (`src/firebase/feedback.ts`). Clients
can't read either collection, so a `permission-denied` on that batch is
reported as `FeedbackRateLimitedError`; any other denial would be a shape bug,
which the rules tests catch.

On the device, `@ihsaanly/state/feedback/store` queues every report in the
`feedbackOutbox` preference first (device-only: never synced or exported),
then sends it if signed in. A report that can't go yet (offline, signed out,
or inside the one-minute window) stays queued and goes on the next sign-in,
restore, foreground or retry. `useFeedback()` exposes the status and a
`FeedbackErrorCode`. An attached diagnostic report is
`buildFeedbackDiagnostics()`: the share-sheet diagnostics cut down to counts
and key names (no events, no preference values), coordinates rounded to about
1 km, at most 20 failures with clipped messages.

Feedback lives outside `users/{uid}`, so `erase()` leaves it in place (kept
for up to 2 years, as the privacy policy says), and so does
`feedbackLimits/{uid}` (only a `lastSentAt` timestamp). No client can delete it,
because a delete before each send would defeat the rate limit.

**Admin view:** in the Firebase console, open the project → Firestore →
`feedback`, sorted by `createdAt`. Change `status` to `seen` or `done` there;
the console uses IAM and bypasses the rules, which give clients no update.

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
      ├─ expo-sqlite (state/backend.ts)          ├─ expo-notifications (local reminders; shows
      │                                          │   announcements that arrive in the foreground)
      ├─ expo-location + geofence (optional)     ├─ widgets (iOS expo-widgets, Android widget lib)
      ├─ push/: RNFB Messaging, FCM topics only (opt-in "Announcements"; no token until then)
      ├─ crash/: RNFB Crashlytics (opt-in "Share crash reports"; collection off until then)
      └─ cloud.ts: Apple/Google tokens ──► createNativeCloud (Firebase JS SDK, memory cache,
                                          auth persisted via expo-sqlite/kv-store)
```

The build variants, the conditional sign-in plugins and the native Firebase
plugins are set in `app.config.ts`, which also declares the iOS privacy
manifest. The product specs live in [`apps/mobile/docs`](../apps/mobile/docs).

Native Firebase (`@react-native-firebase/app`, `messaging`, `crashlytics`)
serves only the two opt-ins below; Auth and Firestore stay on the JS SDK. The
two keep separate default apps (the native one is configured from
`firebase/<project>/google-services.json` / `GoogleService-Info.plist`, the
JS one from `EXPO_PUBLIC_FIREBASE_*`), so they do not collide. `firebase.json`
(app root) turns off Crashlytics auto-collection, messaging auto-init and the
iOS APNs auto-registration, so neither module does anything for someone who
never turned its switch on. iOS links the Firebase pods from CocoaPods as
static frameworks (`expo-build-properties` `useFrameworks: 'static'`, RNFB
`disableSPM`). Both opt-ins are per device: `announcements` and `crashReports`
are in `DEVICE_ONLY_KEYS`, never synced or exported.

**Announcements (push).** More → Reminders → Announcements, off by default.
Onboarding's reminders step offers the same opt-in next to "Daily reminders"
(on by default; turning it off sets every reminder category off), as
"Announcements from Ihsaanly", off until chosen. The mobile flow passes
`enableAnnouncements` to `useOnboardingFlow`, which is what makes
`OnboardingScreen` show the switch (`announcements?: OptIn`); the companion
passes nothing and shows only daily reminders. "Allow notifications" asks the
OS once (`ensurePermission`) if either is chosen; on a grant, a chosen
Announcements runs `setAnnouncementsEnabled(true)`, the switch's own path
(permission already granted, so no second prompt); on a refusal it stays off
and reminders stay as chosen. With neither chosen the button is "Continue" and
asks nothing; "Not now" asks nothing and leaves announcements off.

```text
 switch on ──► ensurePermission (same prompt as reminders) ── refused ──► stays off
                 │ granted
                 ▼
 preference {enabled: true, subscribed: null}
                 │ reconcileAnnouncements (queued, one pass at a time; also on launch
                 ▼                         and on every app-language change)
 register APNs (iOS) → getToken → subscribe "announcements" + "announcements-<lang>"
                 │
                 ▼  subscribed = <lang>     language changes: leave old <lang> topic, join new
 switch off ──► unsubscribe both topics → deleteToken → subscribed = null
```

A failed pass (offline, no APNs yet) is logged with `noteFailure` and leaves
`subscribed` saying what is true, so the next launch or language change
retries. Delivery: in the background the system shows the message (Android on
the `reminders` channel, the FCM default set in `firebase.json`); in the
foreground Android gets `onMessage` and `push/announcements.ts` shows it
through expo-notifications on the same channel, while iOS presents it through
the expo-notifications handler. A tap with custom data `route` (an in-app
path) opens it in the app, `url` (https only) opens the browser, neither
opens Today. Taps reach `push/open.ts` from RNFB (`onNotificationOpenedApp`,
`getInitialNotification`) and from `notifications/respond.ts` (a locally shown
one, or iOS's own response); one tap seen by two doors is followed once.
Topic names and how to send are in `TODO.md` §5. iOS delivery needs the APNs
key uploaded to Firebase (Project settings → Cloud Messaging).

**Crash reports.** Your data → Share crash reports, off by default. Turning
it on deletes any reports Crashlytics cached while it was off, enables
collection, and forwards every entry the app already logs with `noteFailure`
(via `onFailure` in `state/storage/log.ts`) as a non-fatal `recordError`:
label and message only. A user ID is never set. Turning it off disables
collection, deletes unsent reports and stops forwarding. At launch the app
re-applies the switch only if it is on.

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
  `VITE_SITE_URL`, `VITE_CONTENT_URL` and the `.env.*` files as build inputs, so the cache never
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

## Content updates

The content (`packages/core/content`: `items.json`, `glossary.json`,
`translations/*.json`) is authored in git and bundled into every app. The
marketing build also publishes it as static files on its own site, so a
content fix reaches installed apps without a store release:

```text
 PR edits packages/core/content/**  (check.yml: content validator, tests)
    │ merge to development / production
    ▼
 deploy-marketing.yml (path filter includes packages/core/**)
    └─► deploy-ftp.yml: turbo build @ihsaanly/marketing
          └─ scripts/postbuild.ts ─ buildContentBundle()  (core/src/content/bundle-build.ts)
               validates every file with the zod schemas (fails the build), hashes them
               └─► dist/client/content/manifest.json
                   dist/client/content/v<version>/{items,glossary}.json
                   dist/client/content/v<version>/translations/<lang>.json
          └─► FTPS upload (old v<version>/ folders are removed)
    ▼
 https://ihsaanly.app/content/manifest.json      (production)
 https://dev.ihsaanly.app/content/manifest.json  (development)
    │  Access-Control-Allow-Origin: *   manifest: no-cache   v<version>/**: immutable, 1 year
    ▼
 clients (companion, extension, mobile) fetch the manifest, validate it and the files
 with ContentManifest and the content schemas, and keep the bundled content on any failure
```

- **Contract:** `packages/core/src/content/bundle.ts` (pure, imported by the
  apps): `CONTENT_SCHEMA_VERSION`, `DEFAULT_CONTENT_URL`,
  `CONTENT_MANIFEST_PATH`, the `ContentManifest` zod schema (paths may only
  point inside their own `v<version>/` folder), `ContentBundle`,
  `bundlePaths()` and `contentUrl()`. The build-only writer is
  `bundle-build.ts` (`node:fs`, `node:crypto`), which no app imports.
- **Version:** the first 12 hex of a sha256 over each file's path and
  canonical JSON, in path order. The same content always has the same version,
  so rebuilding without a content change republishes the same folder and only
  `publishedAt` moves.
- **Only the current version is published.** The FTP upload is not atomic, so
  for a moment a client can see a manifest whose files are missing (or a
  manifest about to be replaced). Clients validate everything and fall back to
  what they have, then try again later, so that window is safe.
- **Where clients look:** `VITE_CONTENT_URL` (companion, extension) and
  `EXPO_PUBLIC_CONTENT_URL` (mobile, via `eas.json` profiles), a base URL
  ending `/content`, set per environment by `deploy-ftp.yml` and the apps'
  `.env.*` files. **Unset means no update checks:** the app runs on its
  bundled content, so local and test builds never reach the live site by
  accident. (`DEFAULT_CONTENT_URL` only seeds the companion CSP's
  `connect-src`.) The companion's CSP allows that origin in every build. The extension declares no CSP, and MV3's default
  (`script-src 'self'; object-src 'self'`) does not restrict `connect-src`;
  extension pages fetch cross-origin under CORS, which `*` satisfies, so no
  `host_permissions` are needed.
- **Privacy:** the fetch is an anonymous GET of public files; it sends no
  user data, only what any HTTP request does (IP address, user agent) to our
  own host.

## Marking on Today

Every Today route (mobile, companion, extension) takes its sunnah rows and
everything about marking them from one hook, `useTodaySunnah`
(`packages/state/src/today/use-today-sunnah.ts`): each row's circle (`mark`,
with a ring for a counted or multi-part item, from `progress/store`), Done
today (`plan.today.done`, so a mark moves the row at once), what a circle
press means (mark with an undo bar, unmark, or open the counter or parts
sheet), the prayer hint, the first-run tour and the pause notice and
check-in. Unmarking from any path (`uncompleteItem`) clears the item's
progress too. Progress periods come from `startProgress()`
(`progress/configure.ts`), which each app calls once at startup: the item's
trigger, the log day in the saved place's zone and the prayer window now. The
tour and the hint are taught per device (`todayHints`, never synced); `?tour=1`
(More → Show me around) replays the tour. The marketing demo mirrors this in
its own in-memory state, with the same pure helpers (`markFor`, `panelFor` in
`packages/ui/src/props/today.ts`).

## Pause and period sunnahs

`userState.trackingPaused` is manual and never inferred or timed. While it is
on, the planner (`packages/core/src/plan/plan.ts`) sets aside every prayer
(any prayer-triggered item, plus items flagged `isPrayer` in content: Duha,
the nights of Ramadan, the rawatib, shortening on a journey) and every fast
(category `fasting`), and offers instead the items flagged `onlyWhilePaused`:
remembrance at the prayer times, istighfar, du'a at the times of answer,
listening to the Qur'an and sadaqah. Those never appear otherwise, and are
never suggested.

- **Today:** `plan.today.pausedNotice` (`{ fastingResumes }`, null when not
  paused) and `plan.today.checkInDue`.
- **Reminders:** the prayer reminders the user opted into become
  `remembrance` notifications at the same moments, with the neutral text
  `notifications.pausedRemembrance`. Other reminders are unchanged. No
  notification ever says pause, period or why: a locked screen is not private.
- **Check-in:** pausing with "remind me in about N days" (3 to 10) stores
  `userState.pauseCheckInOn` (YYYY-MM-DD). The plan schedules one `check-in`
  notification at 10:00 local that day, through the same path as every other
  reminder, and tapping it opens Today. Actions live in
  `packages/state/src/plan/user-state-store.ts`: `pauseTracking`,
  `resumeTracking`, `snoozeCheckIn`.
- **Privacy:** the check-in date syncs inside `userState`, which is already
  declared health-adjacent; nothing new leaves the device. `pauseItemsOffered`
  (which pause items this device has switched on once) stays on the device.
- **Content:** the flags and the `night` window are content schema 2
  (`CONTENT_SCHEMA_VERSION`), so an app built for 1 ignores a newer bundle and
  keeps the content it shipped with.

## Privacy invariants

Code changes must keep these true. The privacy policy, the sign-in notice and
the store forms all depend on them.

1. No account is needed, and without signing in nothing leaves the device.
   The exceptions are an export, diagnostic report or feedback the user sends
   themselves, and the two opt-in switches in invariant 2.
2. No analytics, telemetry, ads or advertising IDs, anywhere. The only
   exceptions are two switches in the iOS and Android app, each off by default
   and each requiring the user to turn it on: "Share crash reports"
   (Firebase Crashlytics: crashes and error-log entries with device model, OS,
   app version and a Firebase installation / crash identifier; never a user
   ID, practice data or account) and "Announcements" (Firebase Cloud
   Messaging topics `announcements` and `announcements-<lang>`; the FCM and
   APNs tokens are held by Google and Apple and never linked to an account by
   us). Neither exists in the web app or the extension. Nothing else may
   create a device or installation identifier.
3. Only `SYNCED_KEYS` sync. Location syncs rounded to about 1 km, and home
   coordinates never sync.
4. The Firebase JS SDK (Auth and Firestore) loads only for someone who has signed in,
   or is signing in. The native Crashlytics and Messaging modules are separate
   and stay idle until their switch is on.
5. Account deletion erases the cloud copy, and is available in-app and at
   `/legal/delete-account`. Feedback the user sent is the one exception: it is
   kept for up to 2 years and removed on request by email.

A change to any of these needs the policy, `SYNCED_KEYS`, the sign-in notice
and the store data forms updated together.

## Checks

| Layer | Tool | Where |
| --- | --- | --- |
| Formatting and lint | Biome, with GritQL plugins | root `biome.json`, `packages/lint` |
| Types | TypeScript | each workspace's `tsconfig.json`, extending `@ihsaanly/tsconfig` |
| Unused code | knip | root `knip.jsonc` |
| Unit tests | `bun test` | `src/**/*.test.ts` in each workspace |
| Component tests | `bun test` + happy-dom + Testing Library, react-native-web resolution | `packages/ui/test/preload.ts`, `renderScreen` in `packages/ui/test/render.tsx` |
| Coverage | `bun run coverage` (`--enforce` to gate) | `scripts/coverage.ts`, threshold and exclude list in `coverage.config.ts` |
| End to end (web, extension) | Playwright | `playwright.config.ts`, `e2e/` |
| End to end (mobile) | Maestro (not in CI yet) | `e2e/mobile` |
| Sync engine | `bun test` against the memory adapters | `packages/cloud/src/engine.test.ts` |
| Security rules | `@firebase/rules-unit-testing` + emulator | `bun run --cwd packages/cloud test:rules` (JDK 21) |
| Site and web-app output | `bun test`, headless Chrome, CSP checks | `apps/marketing/test`, `apps/companion/test` |
| Mobile health | `expo-doctor`, content validator | `apps/mobile` |
| Licences | `bun run licenses` | writes `THIRD_PARTY_LICENSES.md` |
| Commits | Lefthook, commitlint | `lefthook.json`, `commitlint.config.cjs` |

How to write and run each kind of test: [TESTING.md](TESTING.md).

`bun run check` runs lint, typecheck, tests and knip. CI runs these checks plus
the builds and the rules suite.
