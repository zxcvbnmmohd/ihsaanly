# @ihsaanly/cloud

Optional sign-in and sync for mobile, companion and the extension. The apps stay offline-first: when a user is signed out, nothing here loads. A signed-in user's device remains the source of truth, and the cloud is where devices meet.

## Shape

| Layer | Where | Knows about Firebase? |
| --- | --- | --- |
| Ports (`AuthService`, `SyncRemote`, `RemoteConfigService`, `LocalStore`) | `src/ports.ts` | no |
| Sync engine (pull → merge → push) | `src/engine.ts` | no |
| In-memory adapters (tests, and proof the ports are provider-agnostic) | `src/memory/` | no |
| Firebase adapters | `src/firebase/` | yes |
| Per-platform composition (`createWebCloud`, `createExtensionCloud`, `createNativeCloud`) | `src/firebase/flows/` | yes |
| Device side (`LocalStore` over SQLite/localStorage, session, `useAccount`) | `@ihsaanly/state/cloud/*` | no |

**Merge rules**

- **Events:** events are append-only and identified by `kind|subject|at`. Merging takes the union of both sides.
- **Preferences:** each key keeps whichever side changed it most recently. Preferences are stored as JSON strings.
- **What syncs:** only the keys in `@ihsaanly/state/cloud/keys` (`SYNCED_KEYS`).

## Switching provider (Supabase, Amplify, own Postgres API…)

1. Add `src/<provider>/` implementing `AuthService` and `SyncRemote`, plus `RemoteConfigService` if you need it. `src/memory/` is the smallest reference.
2. Give it `flows/<platform>.ts` functions that return `Cloud`, matching the Firebase ones.
3. Point each app's loader, the one dynamic `import()` in its cloud setup, at the new flow.

Nothing in the engine, `@ihsaanly/state` or `@ihsaanly/ui` changes. The engine tests run against the memory adapters, so use them as the contract a new adapter must satisfy.

## Firestore layout

```
users/{uid}                          { createdAt, schema: 1 }
users/{uid}/eventMonths/{YYYY-MM}    { events: { "<at>|<kind>|<subject>": { l, d } }, updatedAt }
users/{uid}/state/preferences        { prefs: { <key>: { v, t } }, updatedAt }
```

**Why one document per month:** a whole history uploads in a few dozen writes, and a sync with no changes costs about 2 reads.

**Free-tier ceiling:** the Spark plan allows 20k writes and 50k reads a day, which covers roughly 2k daily active users. The upgrade path is Blaze, which keeps the same free quota.

**Rules (`firestore.rules`)**

- Everything is denied by default.
- Users can read and write only their own subtree.
- Document shapes and sizes are checked.
- `updatedAt` must be the server time.
- A month's event map can only grow, so the log is append-only on the server too.

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
- **Remote Config on mobile:** the JS SDK needs IndexedDB, so mobile runs on `DEFAULT_FLAGS`.
