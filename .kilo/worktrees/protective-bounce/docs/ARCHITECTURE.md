# Architecture

## Workspaces

```text
apps/
  mobile/              @ihsaanly/mobile      Expo app for iOS and Android
  marketing/           @ihsaanly/marketing   ihsaanly.app, TanStack Start
packages/
  core/                @ihsaanly/core        pure domain code and content
  ui/                  @ihsaanly/ui          shared React Native screens and components
  lint/                @ihsaanly/lint        Biome plugins, useState checker
tooling/
  tailwind/            @ihsaanly/tailwind    design tokens, Tailwind theme, fonts
  tsconfig/            @ihsaanly/tsconfig    shared compiler strictness
```

Dependencies point one way:

```text
@ihsaanly/core ──► @ihsaanly/ui ──► apps/mobile
       │                 ▲    └───► apps/marketing (phone demo)
       │     @ihsaanly/tailwind ──► both apps
       └──────────────────────────► both apps
```

Bun installs every workspace into one hoisted `node_modules` (`bunfig.toml`).
React Native autolinking needs one copy of each native module, and the version
catalog keeps React, TypeScript and zod on a single version. The shared
packages ship TypeScript source through their `exports`; nothing is prebuilt.

## Core

`packages/core` is the domain: content (`content/*.json` and its
translations, read through `src/content`), the planner (`src/plan`), prayer
times and windows, the Hijri calendar, fasting, locations and the string
tables (`src/strings/<lang>.ts`). It is plain TypeScript with no React, React
Native, native modules or storage; Biome's `noRestrictedImports` enforces
that. Anything that runs in the app can therefore run in the browser too.

## UI

`packages/ui` holds the app's screens (`src/screens`) and components
(`src/components`) as presentational React Native: props in, JSX out, no
stores and no router. Each screen exports its props type (for example
`TodayScreenProps`), and `src/screens/fixtures.ts` has sample props for each.
Whatever a screen needs from its host comes through `UiProvider`
(`src/provider.tsx`): the string table, the scheme being rendered, a `Link`
component, and raw system colours for the few props that take a value rather
than a class. The mobile app supplies these in `src/theme/ui-provider.tsx`,
and its routes in `src/app` turn store state into screen props.

## Tokens

`tooling/tailwind/tokens.ts` is the one place a brand colour or font stack is
written down. `bun run generate` (in `tooling/tailwind`) writes `theme.css`
(the Tailwind theme both apps import) and `web.css` (the site's light and
dark overrides, following `data-theme` or the system setting) from it. The
app reads the same values in JavaScript where a prop needs a raw colour.

## Mobile

An offline-first Expo app: no account, no server, no analytics. Content ships
bundled with the app from `@ihsaanly/core`. Routes, stores, notifications,
widgets and native chrome (tabs, headers, search bars) live in the app; the
screens themselves come from `@ihsaanly/ui`. The product and technical specs
live in [`apps/mobile/docs`](../apps/mobile/docs).

## Marketing

The website at ihsaanly.app, built with TanStack Start: file-based routes, route
loaders, validated search params and typed server functions.

- **Languages:** 10, with English at `/` and every other language at
  `/<code>/`. The strings are in `src/i18n/messages`.
- **Static hosting:** GoDaddy shared hosting cannot run a server, so the build
  prerenders every page, and each server function runs once at build time and
  ships as a JSON file.
- **Security:** each page gets its own Content-Security-Policy, built from the
  hashes of that page's inline scripts, and written to `.htaccess`.
- **Self-checking build:** `bun run build` fails if any page's scripts break
  its policy, or if headless Chrome reports a violation or a script error.

[`apps/marketing/HOSTING.md`](../apps/marketing/HOSTING.md) has the details.

## How the site renders the app

- The **dua specimen** on the home page reads `@ihsaanly/core`'s content at
  build time, through a server-only module.
- The **phone demo** (`src/demo`) renders the app's own Today, Library, item
  and More screens from `@ihsaanly/ui` in the browser. `vite.config.ts`
  resolves `react-native` the way NativeWind's Metro resolver does: app code
  gets `react-native-css`'s className-aware components, and those get
  `react-native-web` underneath. `src/demo/engine.ts` runs core's real
  `plan()` at the visitor's time and builds the screens' props, as the app's
  routes do; `state.ts` stands in for the app's stores. The status bar, app
  bar and tab bar are native chrome in the app, so the demo draws its own in
  DOM. The React Native part is its own lazily loaded chunk, rendered only in
  the browser, so it stays off first paint and out of the prerender.
- `src/styles.css` imports the shared Tailwind theme and has Tailwind scan
  `packages/ui/src`, so the screens' classes are generated for the site.

Turborepo does not hash workspace dependencies without a `^build` task, so
`turbo.json` lists `packages/core`, `packages/ui` and `tooling/tailwind` as
inputs to the site's build and tests. The deploy workflow watches the same
paths.

## Checks

| Layer | Tool | Where |
| --- | --- | --- |
| Formatting and lint | Biome, with GritQL plugins | root `biome.json`, `packages/lint` |
| Types | TypeScript | each workspace's `tsconfig.json`, extending `@ihsaanly/tsconfig` |
| Unused code | knip | root `knip.jsonc` |
| Unit tests | `bun test` | `src/**/*.test.ts` in each workspace |
| Site output | `bun test`, headless Chrome | `apps/marketing/test` |
| Mobile health | `expo-doctor`, content validator | `apps/mobile` |
| Commits | Lefthook, commitlint | `lefthook.json`, `commitlint.config.cjs` |

CI (`.github/workflows/check.yml`) runs lint, typecheck, tests, knip, the
verified site build and the content validator on every pull request.
