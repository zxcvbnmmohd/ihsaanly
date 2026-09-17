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

### NativeWind v5 is a release candidate

`nativewind@5.0.0-rc.0` and `react-native-css@3.1.0-rc.0` are pinned exactly and
**cannot be upgraded independently of each other**. `lightningcss` is pinned to
`1.30.1` in both `devDependencies` and `overrides`: 1.33.0 fails the build with
`failed to deserialize; expected an object-like struct named Specifier`.

Tailwind 4 is CSS-first. There is no `tailwind.config.js` and v5 would not read
one — theme customisation goes in an `@theme` block in `global.css`.

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
