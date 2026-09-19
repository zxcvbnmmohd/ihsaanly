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

- **The domain layer stays pure.** `src/content`, `src/day`, `src/hijri/calendar`,
  `src/prayer/{calculation,times,windows}` and `src/location/{place,cities}` may not
  import React, React Native, native modules or storage. This is what keeps the
  decision seam testable without a device, and lint enforces it.

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

`expo` is on `58.0.0-preview.2` with `react-native@0.88.0-rc.0`. Treat upstream
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
body. On Android these colours don't re-resolve on their own, and React Compiler
is enabled, so without the subscription a memoized component keeps stale colours
when the theme flips.

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

`src/strings.ts` holds one English table and resolves it per language.
Components call `const strings = useStrings()`. A helper that formats copy
takes `strings: Strings` as a parameter rather than reading a module-level
value: React Compiler memoises the helper on its arguments, so a locale change
would never invalidate it. Code outside React uses `getStrings()`. A language
joins `SHIPPED` only once every string is complete and reviewed.

### Onboarding may use literal colours; nothing else may

`palettes` in `src/theme/colors.ts` are the only hex values in the app.
`LinearGradient` and the star artwork need strings, and `PlatformColor` cannot
express a brand hue. Pick one with `paletteFor(useColorScheme())`. Today stays
undecorated, as the spec asks, so nothing there reads a palette.

### The theme override is one call

`src/theme/store.ts` persists System / Light / Dark and applies it with
`Appearance.setColorScheme`, at module scope in the root layout and again in
its setter. Every `PlatformColor` follows it, so there is no second colour
path to keep in sync. In this React Native release the reset value is
`'auto'`, not `null`.

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
