# @ihsaanly/cloud

Optional sign-in and sync for mobile, companion and the extension. The apps stay offline-first: when a user is signed out, nothing here loads. A signed-in user's device remains the source of truth, and the cloud is where devices meet.

## Shape

| Layer | Where | Knows about Firebase? |
| --- | --- | --- |
| Ports (`AuthService`, `SyncRemote`, `LocalStore`, `FeedbackService`) | `src/ports.ts` | no |
| Sync engine (pull → merge → push) | `src/engine.ts` | no |
| In-memory adapters (tests, and proof the ports are provider-agnostic) | `src/memory/` | no |
| Firebase adapters | `src/firebase/` | yes |
| Per-platform composition (`createWebCloud`, `createExtensionCloud`, `createNativeCloud`) | `src/firebase/flows/` | yes |
| Device side (`LocalStore` over SQLite/localStorage, session, `useAccount`) | `@ihsaanly/state/cloud/*` | no |

**Merge rules**

- **Events:** events are append-only and identified by `kind|subject|at`. Merging takes the union of both sides.
- **Preferences:** each key keeps whichever side changed it most recently. Preferences are stored as JSON strings.
- **What syncs:** only the keys in `@ihsaanly/state/cloud/keys` (`SYNCED_KEYS`).

**Linking Apple and Google**

- One person is one uid. With Firebase's default one-account-per-email, signing in with the other provider for a known email rejects with `LinkRequiredError { existing, attempted, email }`; the adapter keeps the attempted credential in memory, and the next successful `signIn(existing)` links it. `signOut` forgets it.
- `link(provider)` adds a method to the signed-in account. An identity that already opens another uid rejects with `LinkConflictError`; two accounts are never merged automatically.
- `deleteAccount` re-authenticates with a linked provider this platform offers (`SignInFlow.available`), or rejects with `ReauthUnavailableError`.
- Each flow supplies the Firebase functions (`link`, `linkCredential`, `pendingCredential`), so `firebase/auth.ts` keeps no runtime import of `firebase/auth` (the extension must not load it).

## Switching provider (Supabase, Amplify, own Postgres API…)

1. Add `src/<provider>/` implementing `AuthService` and `SyncRemote`. `src/memory/` is the smallest reference.
2. Give it `flows/<platform>.ts` functions that return `Cloud`, matching the Firebase ones.
3. Point each app's loader, the one dynamic `import()` in its cloud setup, at the new flow.

Nothing in the engine, `@ihsaanly/state` or `@ihsaanly/ui` changes. The engine tests run against the memory adapters, so use them as the contract a new adapter must satisfy.

## Firestore layout

Layout 2 (`SYNC_META_VERSION` in `src/engine.ts`; full notes in `docs/ARCHITECTURE.md`):

```
users/{uid}                     { createdAt, schemaVersion: 2 }
users/{uid}/sync/preferences    { type: 'preferences', preferences: { <key>: { value, updatedAt } }, updatedAt }
users/{uid}/sync/{YYYY-MM}      { type: 'events', month, events: { "<at>|<kind>|<subject>": { logDay, deltaSeconds } }, updatedAt }
feedback/{autoId}               { uid, kind, message, contactEmail, app, diagnostics, createdAt, status: 'new' }
feedbackLimits/{uid}            { lastSentAt }
```

For example, `users/abc123/sync/2025-10`:

```json
{
  "type": "events",
  "month": "2025-10",
  "events": {
    "1760000000000|prayer-performed|fajr": { "logDay": "2025-10-09", "deltaSeconds": null }
  },
  "updatedAt": "<serverTimestamp>"
}
```

and `users/abc123/sync/preferences`:

```json
{
  "type": "preferences",
  "preferences": { "theme": { "value": "\"dark\"", "updatedAt": 1760000000000 } },
  "updatedAt": "<serverTimestamp>"
}
```

**One collection, one query:** a pull is `sync where updatedAt > cursor orderBy updatedAt`, so changed months and the preferences (only when they changed) come back together. A quiet sync costs **1 read and 0 writes**; another device's changes cost one read per changed document; a push is one batch of one write per changed month (+1 for preferences). Preferences push only the keys whose timestamp differs from the one last synced (`SyncMeta.syncedPreferences`), because an unchanged preferences document is not read again.

**Profile once:** `users/{uid}` is written in the first push for an account on a device and remembered in local meta (`profileWritten`), so later syncs neither read nor write it. It is a plain `set`, not a merge, so it also replaces a layout-1 profile (`{ createdAt, schema }`).

**Foreground throttle:** `notifyForeground()` (`@ihsaanly/state/cloud/session`) skips the sync when the last successful one was under 2 minutes ago. Sign-in, restore, the local-write debounce and `syncNow` are never throttled.

**Live updates:** `SyncRemote.watch(uid, cursor, onChanges, onError?)` holds the pull query open (`onSnapshot`); each snapshot's changed documents (this device's unconfirmed writes and removals skipped) arrive in the same shape as a pull, with the cursor to resume from, and `applyRemoteChanges(local, changes)` folds them in without reading again. Optional on the port: a remote without it is synced by rounds alone. The memory remote implements it for tests.

**Merges and deletions:** a key both sides changed since they last agreed goes through `LocalStore.mergePreference` when the store offers one (item progress: max count, union of parts), stamped just past both and pushed. A synced key the device dropped is deleted remotely (`removedPreferences`, a `deleteField()` in the same merge); a key gone from the account's full list that the device has not touched since is dropped locally via `removePreferences`.

**Why one document per month:** a whole history uploads in a few dozen writes, and reading what changed is one read per changed month, not per event.

**Free-tier ceiling:** the Spark plan allows 20k writes and 50k reads a day, which covers a few thousand daily active users at these costs. The upgrade path is Blaze, which keeps the same free quota.

**Index exemptions (`firestore.indexes.json`):** `sync.events`, `sync.preferences`, `feedback.diagnostics` and `feedback.message` have `"indexes": []`. Nothing queries inside them; indexed, every event key in a month would be an index entry (write cost, and Firestore's 40k index entries per document), and feedback text would be indexed for nothing. `sync.updatedAt` and feedback's `createdAt`, `kind` and `status` keep the default indexes.

**Rules (`firestore.rules`)**

- Everything is denied by default.
- Users can read and write only their own subtree.
- Exact keys per document: `users/{uid}` `{createdAt, schemaVersion}` (create and an idempotent rewrite); `sync/preferences` `{type, preferences, updatedAt}` with at most 64 keys; `sync/{YYYY-MM}` `{type, month, events, updatedAt}` with `month` equal to the id and at most 3000 events. Any other `sync` id is refused.
- `updatedAt` (and the profile's `createdAt`) must be the server time.
- A month's event map can only grow, so the log is append-only on the server too.
- Layout 1 (`eventMonths/*`, `state/preferences`) is owner read/delete only, so `erase()` can still remove it. Drop those matches, and the `lastAt` fallback, a release after every client has synced in layout 2.
- `feedback` is create-only: signed in, `uid == request.auth.uid`, an exact field allowlist, size caps (message 1–5000 characters, contact email ≤254, diagnostics ≤16 top-level keys), `status == 'new'` and `createdAt == request.time`. No client reads, updates or deletes it.
- **Rate limit without Cloud Functions:** each send's batch also writes `feedbackLimits/{uid} { lastSentAt: request.time }`. The feedback rule checks that stamp with `getAfter`, and requires the stamp it replaces, if any, to be at least 60 s old (a pre-rename `lastAt` stamp counts the same). The owner may create and update their limit doc, but never read or delete it: a client that could delete it before each send would dodge the limit.

**Migration from layout 1:** sync meta has a `version`; meta from a layout-1 client reads as 1, and its next sync resets the cursor, marks the whole local log unsynced and forgets which preferences were pushed, so each device re-pushes its own data into layout 2. `erase()` deletes `sync/*`, the profile and any layout-1 documents.

## Feedback

- `FeedbackService.send(uid, draft)` (`src/firebase/feedback.ts`) writes the feedback doc (auto id) and the limit doc in one batch. Neither collection is readable, so a `permission-denied` on that batch becomes `FeedbackRateLimitedError`; any other denial would be a shape bug, which the rules tests catch.
- `src/memory/feedback.ts` is the test fake and enforces the same one-minute limit.
- Feedback sits outside `users/{uid}`, so `erase()` keeps it (up to 2 years, per the privacy policy). `erase()` also keeps `feedbackLimits/{uid}` (just a `lastSentAt` timestamp): no client may delete it, or a hostile client could delete it before every send and bypass the 60 s rate limit, so it stays with the feedback.
- The device side (outbox, flush triggers, `useFeedback`, trimmed diagnostics) is `@ihsaanly/state/feedback/*`.

**Admin view (no code):** Firebase console → the project (`ihsaanly-production` or `ihsaanly-development`) → Firestore → `feedback`, sorted by `createdAt`. Set `status` to `seen` or `done` there; the console uses IAM, so it bypasses the rules that stop clients updating.

## Local development

```sh
bun test src                       # engine + adapters (no emulator)
bun run test:rules                 # security rules against the Firestore emulator (needs JDK 21)
```

Setting `emulatorHost` in an app's Firebase env (for example `VITE_FIREBASE_EMULATOR_HOST=127.0.0.1`) points that app at the local emulators.

## Firebase project setup (one-off, manual)

1. Create a project on the Spark plan and set its id in `.firebaserc` in place of `demo-ihsaanly`.
2. **Authentication:** enable Google and Apple.
   - Apple needs an Apple Developer membership, a Services ID and a key.
   - Add the extension's `https://<extension-id>.chromiumapp.org/` redirect to the Google OAuth web client.
3. Register the iOS, Android and web apps, and copy their config into each app's `.env` (see the `.env.example` files).
4. Deploy with `bunx firebase-tools@15 deploy --only firestore`.
5. In the Google Cloud console, restrict the browser API key to the app's bundle IDs and the companion/extension origins.

## Deferred

- **App Check:** the RN JS SDK has no native attestation. Rules plus auth are the gate for now.
- **Apple sign-in in the extension:** it needs an offscreen or hosted-page bridge. Google covers the extension for now.
- **Remote Config / remote flags:** removed on purpose. It is unused, and it pulls in Firebase Installations, which mints a per-install ID. Add it back only with a privacy-policy change.
