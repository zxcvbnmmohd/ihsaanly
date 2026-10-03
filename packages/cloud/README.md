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

```
users/{uid}                          { createdAt, schema: 1 }
users/{uid}/eventMonths/{YYYY-MM}    { events: { "<at>|<kind>|<subject>": { l, d } }, updatedAt }
users/{uid}/state/preferences        { prefs: { <key>: { v, t } }, updatedAt }
feedback/{autoId}                    { uid, kind, message, contactEmail, app, diagnostics, createdAt, status: 'new' }
feedbackLimits/{uid}                 { lastAt }
```

**Why one document per month:** a whole history uploads in a few dozen writes, and a sync with no changes costs about 2 reads.

**Free-tier ceiling:** the Spark plan allows 20k writes and 50k reads a day, which covers roughly 2k daily active users. The upgrade path is Blaze, which keeps the same free quota.

**Rules (`firestore.rules`)**

- Everything is denied by default.
- Users can read and write only their own subtree.
- Document shapes and sizes are checked.
- `updatedAt` must be the server time.
- A month's event map can only grow, so the log is append-only on the server too.
- `feedback` is create-only: signed in, `uid == request.auth.uid`, an exact field allowlist, size caps (message 1–5000 characters, contact email ≤254, diagnostics ≤16 top-level keys), `status == 'new'` and `createdAt == request.time`. No client reads, updates or deletes it.
- **Rate limit without Cloud Functions:** each send's batch also writes `feedbackLimits/{uid} { lastAt: request.time }`. The feedback rule checks that stamp with `getAfter`, and requires the stamp it replaces, if any, to be at least 60 s old. The owner may create and update their limit doc, but never read or delete it: a client that could delete it before each send would dodge the limit.

## Feedback

- `FeedbackService.send(uid, draft)` (`src/firebase/feedback.ts`) writes the feedback doc (auto id) and the limit doc in one batch. Neither collection is readable, so a `permission-denied` on that batch becomes `FeedbackRateLimitedError`; any other denial would be a shape bug, which the rules tests catch.
- `src/memory/feedback.ts` is the test fake and enforces the same one-minute limit.
- Feedback sits outside `users/{uid}`, so `erase()` keeps it (up to 2 years, per the privacy policy). `erase()` also keeps `feedbackLimits/{uid}` (just a `lastAt` timestamp): no client may delete it, or a hostile client could delete it before every send and bypass the 60 s rate limit, so it stays with the feedback.
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
