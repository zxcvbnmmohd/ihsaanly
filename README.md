# ihsaanly

An Expo app on SDK 58 (preview), with Expo Router, NativeWind, and native
platform UI — liquid glass on iOS, Material 3 on Android.

## Getting started

```bash
bun install
git config core.hooksPath .githooks   # once per clone: enables the pre-commit hook
bun run ios                           # or: bun run android
```

`bun run start` launches the dev server for Expo Go, but this app includes
`expo-widgets`, which Expo Go cannot load. The home screen widget and Live
Activity only work in a development build, so prefer `bun run ios`.

## Scripts

|                           |                                                                   |
| ------------------------- | ----------------------------------------------------------------- |
| `bun run ios` / `android` | Build and launch a development build                              |
| `bun run start`           | Dev server (widgets unavailable)                                  |
| `bun run check`           | Lint, typecheck, and `expo-doctor` — run before calling work done |
| `bun run lint`            | ESLint (not `expo lint` — see AGENTS.md)                          |
| `bun run format`          | Prettier, including Tailwind class sorting                        |
| `bun run clean`           | Clear Metro and Expo caches, then restart                         |

## Layout

```
src/
  app/            Expo Router routes only — every file here is a screen
    _layout.tsx     NativeTabs + theme provider + root ErrorBoundary
    (home)/         Widget and Live Activity demo
    (settings)/     Native controls via @expo/ui
    +not-found.tsx
  components/     Reusable UI (surface.tsx: glass / blur / Material surface)
  theme/colors.ts Platform semantic colours — the only source of colour
  widgets/        iOS home screen widget + Live Activity, built with @expo/ui SwiftUI
assets/images/    Copied into the shared app group container for the widget to read
global.css        Tailwind 4 entry point (CSS-first — there is no tailwind.config.js)
```

## Styling

Layout goes through Tailwind classes; colour goes through `@/theme/colors`, which
resolves to real UIKit and Material 3 colours on-device. The reasoning, and the
other non-obvious constraints in this project, are in [AGENTS.md](./AGENTS.md).

## The widgets

`expo-widgets` builds the iOS home screen widget and the delivery Live Activity
from `@expo/ui` SwiftUI primitives, registered through the config plugin in
[`app.json`](./app.json). Requires iOS 16+ and a development build.

- [`src/widgets/counter-widget.tsx`](./src/widgets/counter-widget.tsx) — home screen widget
- [`src/widgets/delivery-activity.tsx`](./src/widgets/delivery-activity.tsx) — Lock Screen and Dynamic Island

To see them: run `bun run ios`, long-press the home screen, tap **Edit** (or **+**),
search for the app, and add **Counter Widget**. Tapping **Increment** in the app
updates it. **Start delivery** kicks off a Live Activity that advances
Preparing → On the way → Delivered on its own, then dismisses itself.

Widgets run in a separate process and cannot read the app's asset bundle, so
images are copied into `widgetsDirectory` (the shared app group container) and
referenced by file URI — see `ensureImageInSharedStorage`.

Docs: [Expo Widgets](https://docs.expo.dev/versions/latest/sdk/widgets/) ·
[`@expo/ui`](https://docs.expo.dev/versions/latest/sdk/ui/)
