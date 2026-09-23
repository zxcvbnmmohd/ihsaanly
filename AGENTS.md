This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Screens and routes are separate

A file in `src/app/` is a **route**: it gathers data, owns hooks, stores, navigation
and side effects, and renders a screen component. It contains no markup beyond that.

A file in `src/screens/` is a **screen**: a pure presentational component whose entire
input is its props. No stores, no data hooks, no router calls, no fetching. Every prop
type is exported so the screen can be rendered with real data or with mock data.

`src/screens/fixtures.ts` holds sample props for each screen, which also type-check the
prop contracts. Add a fixture whenever you add a screen.

This exists so screens can be exercised in tests and showcases without a device,
a database or a navigator.

## Code conventions

Enforced by lint, so a violation fails `bun run check`.

- **One `useState` per file**, holding a single typed object:

  ```ts
  interface Thing {
    query: string
    declined: boolean
  }

  const [thing, setThing] = useState<Thing>({ query: '', declined: false })
  ```

  Read it as `thing.query`, update it as `setThing((current) => ({ ...current, query }))`.

  This holds **even for a single field** — `useState<Date>(…)` is a violation.
  Naming the shape up front means adding a second field never means restructuring.
  The rule also requires the destructuring to be `[thing, setThing]`.

- **Every function and component declares its return type.** Components return
  `ReactElement`. Callbacks passed to an already-typed prop are exempt, because
  the type is stated once at the prop. Explicit beats inferred: a return type is
  the cheapest place to catch a function that quietly changed shape.

- **Props are a named `interface`**, not an inline object literal, even for one prop.

- **No semicolons.** Prettier handles it; run `bun run format`.

- **No `any`.** Use `unknown` and narrow, or name the real type.

- **No non-null assertions (`!`).** If a value might be missing, say what happens
  when it is. `noUncheckedIndexedAccess` is on, which makes `!` tempting and
  wrong — every one is a silent claim that can fail at runtime.

- **Named exports only.** Files in `src/app/` default-export because Expo Router
  requires it. Nowhere else does.

- **The domain layer stays pure.** It may not import React, React Native, native
  modules or storage. This is what keeps the decision seam testable without a
  device, and lint enforces it — `eslint.config.js` holds the list, which is
  wider than the obvious one:

  ```
  src/content/**            src/day/**              src/hijri/calendar.ts
  src/prayer/{calculation,times,windows,qada}.ts    src/location/{place,cities}.ts
  src/plan/{plan,day-match,day-context,signals,user-state,quiet-hours,
             notification-preferences,history,presets,suggest}.ts
  src/data/bundle.ts        src/memorise/reveal.ts  src/i18n/locale.ts
  src/assert-never.ts       src/fasting/ledger.ts
  ```

  Adding a file to the domain means adding it there too; the rule is the list,
  not the folder.

- **Exhaustive unions end in `assertNever`.** Every `switch` over a union closes
  with `default: return assertNever(value)`, so adding a trigger kind or a window
  name fails the build everywhere it must be handled instead of falling through.

- **Kebab-case file names** under `src/`, with the exceptions Expo Router needs
  (`_layout`, `+not-found`, `[param]`). Root config files follow their own
  ecosystem conventions.

- **`interface` over `type`** for object shapes. Unions, intersections and inferred
  aliases such as `z.infer<...>` stay as `type` — the rule only covers object literals.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

## This project's constraints

These are decisions already made and verified. Changing one breaks the build, so
check here before "fixing" something that looks wrong.

### On a preview SDK

`expo` is on `58.0.0-preview.4` with `react-native@0.88.0-rc.1`, and upstream
moves faster than this file: check `package.json` rather than trusting this line. Treat upstream
release notes for SDK 58 as provisional, and expect `expo-doctor` to be the
source of truth for which versions of native modules may be installed. Never
bump `react`, `react-native`, `react-native-screens`, `react-native-reanimated`,
`react-native-worklets`, or `react-native-safe-area-context` by hand — run
`npx expo install --fix` and take what it gives you.

### Styling: two systems, on purpose

- **Layout, spacing, sizing, flex, radii → NativeWind/Tailwind `className`.**
- **Every colour → `colors` from `@/theme/colors`, via the `style` prop.**

The `expo-native-ui` skill states Tailwind is unsupported; that guidance is
overridden here — NativeWind v5 is installed and verified. But colours stay out
of Tailwind deliberately: `colors` wraps `PlatformColor`, so it resolves on-device
to UIKit semantic colours on iOS and Material 3 dynamic (wallpaper-derived)
colours on Android, adapting to light/dark and accessibility contrast for free.
A Tailwind class like `bg-white` throws all of that away. Do not add a colour
palette to `@theme` in `global.css`.

Any component that renders a `colors.*` value must call `useColorScheme()` in its
body. Verified on a device: on Android these are not PlatformColors. expo-router
resolves each Material colour in JavaScript, synchronously, from
`Appearance.getColorScheme()` at the moment the property is read, so `colors` is
an object of getters and the re-render is what re-reads them. Never copy a
`colors.*` value into a module-level constant; it freezes at import time. React
Compiler is enabled, so without the subscription a memoized component keeps
stale colours when the theme flips.

### A development build is required, not Expo Go

`expo-notifications`, `expo-sqlite`, `expo-location` and `expo-widgets` are not
in Expo Go. Opening the app there fails at import with "Cannot find native
module", which surfaces as a route missing its default export rather than as
anything that names the real cause. Run `npx expo run:android` / `run:ios`.

### iOS-only modules need a platform split, not a runtime check

`expo-widgets` throws when imported on Android, so `Platform.OS === 'ios'`
inside a function is too late — the import itself is what fails. Put the real
implementation in `*.ios.ts` and a no-op in the base file, and let Metro pick.
`src/widgets/snapshot.ts` is the pattern.

### After-prayer items lead for an hour, then expire

`REASON_RANK` in `src/plan/plan.ts` puts `after-prayer` above `current-window`,
and an `after` trigger is relevant only while the prayer was marked within
`AFTER_PRAYER_GRACE_MS` (60 minutes; `prayer: any` uses the most recent mark).
Both halves are deliberate. Onboarding promises "You mark the prayer. The
sunnah appears", which the old order (window first) broke. Without the expiry
the tasbih would sit at the top from the first mark until day rollover, so the
grace is what makes the higher rank safe. Do not restore the old order or drop
the expiry without changing the other.

`TodayModel.now` is every relevant non-all-day item in rank order; `rightNow`
is its head and is kept for the widget snapshot and notifications.
`TodayModel.next` names the next prayer (sunrise is a boundary, not a prayer,
so `nextPrayerWindow` skips it) and lists what enabled content asks before and
after it, computed from triggers rather than from the moment so it is stable
all day. The screen renders a rough distance to it, never a clock time.

### A completion counts for one occasion only

`item-completed` and `item-uncompleted` are the on/off pair for library items,
written by `src/plan/completions.ts` against the local civil day like prayer
marks. `isDoneForOccasion` in `src/plan/plan.ts` hides a done item only when
the completion is at or after the start of its current occasion: the latest
prayer mark for `after-prayer`, the window start otherwise. The tasbih after
"any" prayer, done after Dhuhr, is therefore owed again after Asr. Do not
replace this with "completed today hides", which was the first draft and is
wrong for exactly that item. `TodayModel.done` carries the hidden entries.

### `react-native-view-shot` is typed locally

The package ships TypeScript source that does not compile against
react-native 0.88's ref types, so `tsconfig.json` maps the module to
`types/react-native-view-shot.d.ts`, which declares only `captureRef`. It is a
native module: adding it required prebuild and a new dev build. The share card
is rendered by the item **route** in an absolute view off-screen and captured
there; the screen stays pure and receives callbacks only.

### Reminders are diffed by identifier and answered by kind

Every scheduled notification has a stable identifier from
`src/notifications/payload.ts`: `plan:<item>@<ms>` and
`plan:prayer:<prayer>@<ms>` are owned by `sync()` in
`src/notifications/schedule.ts`, which cancels and adds only within that
prefix. `later:` (a snooze from the shade) and `test:` are never touched, so a
snooze made while the app was killed survives the next sync. Do not go back to
cancel-all. The `data` payload is versioned and narrowed by
`parseNotificationData`; nothing reads it raw.

Taps are answered once, in `src/notifications/respond.ts`, from three doors:
the warm listener, the cold-start replay (read then cleared) and the Android
background task. The task is defined in `index.ts`, the app entry, because a
`defineTask` inside a route's import chain runs after the bundle has loaded
and cannot be found when the OS starts the app headless.

Prayer-window reminders are their own opt-in on their own Android channel and
do **not** spend `maxPerDay`: five a day would consume a budget of three and
silently turn the adhkar off. Prayer times are computed for eight days
(`HORIZON_DAYS` in `src/plan/use-plan.ts`) so reminders survive a week
unopened; `expo-background-task` was considered and not added, since it is
best-effort with a 15-minute floor and stops after an iOS swipe-kill. No
notification fires at the moment a prayer is marked: the user is in the app.
`maxPerDay` counts pending entries only, so a replan after a delivery can
re-grant that day's budget; the drift is bounded to one day and accepted.

### Every item carries `why`, `how` and `reviewed`

`content/items.json` items have `why` (one plain paragraph), `how` (ordered
steps, may be empty) and `reviewed` (boolean). The first two exist for the
primary audience, who cannot act on a ruling label and a hadith number.
`reviewed: false` is the honest state of every item drafted in-repo; the
validator lists them on every build and item detail shows "Awaiting review".
Flipping one to `true` is the content reviewer's act, never the implementer's.
`why` and `how` are English-only until reviewed; `resolveText` returns null for
a missing language, so Arabic readers see the section omitted rather than
English. `content/glossary.json` defines every `Ruling` value by id (a test
enforces it) plus the recurring terms; a ruling label on item detail links to
`/glossary?term=<ruling>`.

### Suggestions are weekly, deterministic and pure

`suggest()` in `src/plan/suggest.ts` picks one not-enabled, not-known,
not-declined item from the same `Signals` the plan reads, so a test can pin
its answer. The weekly gate lives in the `suggestion` preference
(`shownAt`, `itemId`, `dismissed`); the Today route writes `shownAt` only when
the chosen id changes, so the effect cannot loop. Fasting is held back for
three weeks after `onboarding.completedAt`; a row from before that field
existed is treated as early. `useSignals()` exists so the route can call both
`plan()` and `suggest()` on one snapshot; do not compute a second set of
signals for the card.

Qada is `outstanding(net, backlog)` in `src/prayer/qada.ts`: the raw recorded
net (which may go negative while a backlog is paid down) plus the
`qadaBacklog` preference, clamped at zero. `readQadaCounts` no longer filters
positives; the clamp lives next to the addition. Still a count per prayer,
never a dated list, and the word "missed" appears on no screen.

### Deleting data reloads the app

`wipe()` in `src/storage/database.ts` is the only deletion in the app and runs
only from the Data screen after a confirm dialog. Every preference store keeps
its value in memory once read, so the route calls `reloadAppAsync` straight
after; without that the onboarding gate would still read "completed" until the
next launch. The tracking pause is enforced in `rollover`
(`src/prayer/marks.ts`): paused days pass unrecorded and the cursor still
advances, so resuming never backfills a debt. Today hides the prayer strip
while paused. Moon-sighting authorities live at the foot of the Hijri screen;
there is no separate route.

### Exact alarms are deliberately not requested

`SCHEDULE_EXACT_ALARM` is a restricted permission that invites a Play Store
policy review. Reminders here are window-based — "the evening adhkar are open"
— not to-the-minute, so inexact delivery is correct rather than a compromise.
Do not add it without a reason that survives that review.

### React Compiler is on: never memoise an impure read

The compiler infers a memoised expression's dependencies from what it reads. A
`useMemo(() => readFromSqlite(key), [key, version])` gets re-memoised on `key`
alone — `version` in the deps array is not a barrier — so a recorded event never
invalidates the read and the screen shows the write only after a reload.

Anything that reads mutable state outside React (SQLite, a module-level store)
goes through `useSyncExternalStore`, with the store returning a snapshot cached
per version so `getSnapshot` is referentially stable until something changes.
`src/storage/events.ts` is the pattern. `subscribe` is hoisted, never inline.

### NativeWind v5 is a release candidate

`nativewind@5.0.0-rc.0` and `react-native-css@3.1.0-rc.0` are pinned exactly and
**cannot be upgraded independently of each other**. `lightningcss` is pinned to
`1.30.1` in both `devDependencies` and `overrides`: 1.33.0 fails the build with
`failed to deserialize; expected an object-like struct named Specifier`.

Tailwind 4 is CSS-first. There is no `tailwind.config.js` and v5 would not read
one — theme customisation goes in an `@theme` block in `global.css`.

### Copy is read through `useStrings()`

`src/strings/en.ts` is the English table and defines the `Strings` shape;
`src/strings/ar.ts` must match it key for key, which the typechecker enforces.
Components call `const strings = useStrings()`. A helper that formats copy
takes `strings: Strings` as a parameter rather than reading a module-level
value: React Compiler memoises the helper on its arguments, so a locale change
would never invalidate it. Code outside React uses `getStrings()`.

Arabic is a complete draft written in one pass (2026-09-19) and **not yet
reviewed by a qualified speaker**. That review is a release condition. Counts
go through the `count` helper in `ar.ts`, which handles singular, dual, the
3-to-10 plural and the 11-and-up singular; never interpolate a bare number
next to a noun in Arabic copy.

Ten languages ship (2026-09-23): English, Arabic, French, Italian, Japanese,
Hindi, Urdu, Somali, Mandarin (`zh`, Simplified) and Cantonese (`yue`,
Traditional). Every file but `en.ts` is a draft awaiting a qualified speaker,
and the Language screen says so. Urdu is right to left like Arabic. A device
reporting `zh-HK` or `zh-MO` is read as Cantonese (`normalise` in
`src/i18n/locale.ts`); Taiwan stays Mandarin. Adding a language means a
`src/strings/<code>.ts`, an entry in `SHIPPED`, `SUPPORTED_LOCALES` and
`SUPPORTED_LANGUAGES`, a name in every table's `language.names`, a
`content/translations/<code>.json`, and `CFBundleLocalizations` in `app.json`.

Content in every language but English lives in `content/translations/<code>.json`,
keyed by item, part and glossary id, and is laid over `items.json` at load by
`applyTranslations` in `src/content/translations.ts`. It fills only what is
absent, so it can never overwrite text `items.json` already carries.
Transliteration falls back to the English romanisation. `validate-content`
reports what each language still lacks.

### The brand palette is app-wide; it is still the only literal colour

`palettes` in `src/theme/colors.ts` are the only hex values in the app. A
gradient and a brand hue cannot be expressed as `PlatformColor`, which has no
notion of either. Read them with `usePalette()` from `src/theme/store.ts`,
which resolves against the scheme the app is actually rendering in.

Text, separators and surfaces still come from the semantic `colors`, so light,
dark and contrast settings remain the OS's business. Use the accent for
selection, marks, section captions and primary actions; never for body text.

The SPEC's "nothing on the home screen is decorative" rule was dropped
deliberately on 2026-09-20 at the user's direction. Today carries the wash and
the accent like every other tab.

### The tab bar is native and branded, never reimplemented

`NativeTabs` stays a UIKit tab bar on iOS and a Material one on Android. Brand
it only through its own props: `tintColor` is enough. Do not set
`indicatorColor` to the accent, which fills the Material indicator and hides
the icon inside it. Never replace it with a JavaScript tab bar.

### The opening tab is decided by group name, not by trigger order

Verified on a device: neither the order of `NativeTabs.Trigger` children nor
`unstable_settings.anchor` decides which tab opens. The URL `/` resolves to the
alphabetically first route group that has an index, so with `(library)`,
`(more)` and `(today)` the app opened on Library. The group holding Today is
named `(home)` so that it sorts first. Parenthesised groups never appear in a
URL, so the rename is invisible outside the filesystem. `anchor` stays because
it governs back behaviour. Do not rename these groups without checking which
one now sorts first.

### The theme override recreates the Android activity

`src/theme/store.ts` persists System / Light / Dark and applies it with
`Appearance.setColorScheme`, at module scope in the root layout and again in
its setter. In this React Native release the reset value is `'auto'`, not
`null`. Read the scheme through `useEffectiveColorScheme()`, never
`useColorScheme()` alone: on Android the native module keeps reporting the
system scheme after an override.

Verified on a device: with Expo's default setup the override never reaches
the activity's resources, live or on cold start, so every `PlatformColor` keeps
the system scheme. Two things make it work, and both must stay:

- `plugins/with-android-manifest.js` removes `uiMode` from
  MainActivity's `configChanges`, so AppCompat recreates the activity on a
  night-mode change the way most Android apps do. A theme switch therefore
  restarts the screen on Android; iOS re-resolves dynamic colours in place.
- `expo-system-ui` is deliberately **not installed**. Its Android lifecycle
  listener calls `setDefaultNightMode` from the static `userInterfaceStyle` on
  every activity creation, which undoes the override on that recreation.
  `userInterfaceStyle: automatic` in `app.json` still sets the iOS plist key
  and the Android theme already follows the system without the package.

`modules/theme-override` is a local Expo module, Android only, autolinked
from `modules/`. It persists the mode in SharedPreferences and applies it from
an `ApplicationLifecycleListener`, so the process opens in the stored scheme
before any activity exists and a cold start never relaunches. Adding or
editing it is a native change: run prebuild.

`applyThemePreference` calls that module **and** `Appearance.setColorScheme`,
never one or the other. React Native caches the colour scheme in JavaScript
and only `setColorScheme` refreshes that cache; the JavaScript context
survives the Android activity recreation, so skipping the call leaves every
`colors.*` getter resolving to the previous scheme while the onboarding
palette, which reads the preference store, correctly flips. Verified on a
device: the result is a light card on a dark screen. Setting the same mode
twice is a no-op natively, so the pair is safe.

A live theme change still recreates the activity. In development that shows
expo-router's "configured linking in multiple places" error once, because the
new root mounts before the old root's effect cleanup runs. It is transient
and dev-only (`useLinking.native.js` returns early in production).

### Switching layout direction reloads the app

`chooseLanguage` in `src/i18n/store.ts` writes the RTL flags through
`I18nManager` and then calls `reloadAppAsync` from `expo`, after a short
delay so the native writes land first. React reads the flags when it builds
the tree, so a reload is what makes them visible.

`expo-localization` is deliberately **not installed**. Verified on a device:
its module re-applies `allowRTL`/`forceRTL` from static string resources in
`OnCreate`, which runs on every React instance start, so the reload erased the
change every time. The device locale now comes from `Intl` in
`src/i18n/device.ts`, and `plugins/with-android-manifest.js` keeps
`android:supportsRtl` on, which that package's plugin used to set.

### Fonts are bundled by the config plugin

Files under `assets/fonts/` are listed in the `expo-font` plugin entry in
`app.json`, so they exist before first paint and no `useFonts` gate is needed.
Adding one is a native change: run prebuild. The file name must equal the
font's PostScript name, because Android registers by file name and iOS by
PostScript name. The display serif is the platform's own, via
`src/theme/fonts.ts`; only Arabic ships a face.

`expo prebuild` regenerates `android/` and removes `local.properties` with it.
Set `ANDROID_HOME` in your shell instead of relying on that file.

### Linting

Run `bun run lint` (`eslint .`), **not** `npx expo lint` — the latter tries to
reinstall `eslint-config-expo`. That config is deliberately not used: it depends
on `eslint-plugin-react` and `eslint-plugin-import`, neither of which supports
ESLint 10. `eslint.config.js` composes the v10-compatible plugins by hand. When
those two ship v10 support, switching back is a one-line change.

TypeScript stays on 6.x. TS 7 typechecks fine but `typescript-eslint` rejects it.

### Before calling anything done

`bun run check` — runs lint, typecheck, and `expo-doctor` in sequence.

Metro bundling green does not prove NativeWind is working; utilities can silently
compile to nothing. To verify styling end-to-end, compile `global.css` through
PostCSS and `react-native-css/compiler` and assert the class names appear in the
resulting stylesheet.
