# Contributing

How to work in this monorepo day to day. For how the pieces fit together, see
[ARCHITECTURE.md](ARCHITECTURE.md). For the mobile app's own rules, see
[`apps/mobile/AGENTS.md`](../apps/mobile/AGENTS.md).

## Setup

You need [Bun](https://bun.sh) 1.4.2. For the mobile app you also need Xcode or
Android Studio, because the app runs as a development build, not in Expo Go.

```bash
bun install
bunx lefthook install   # once per clone: git hooks
```

## Running the apps

```bash
bun run dev             # both apps in Turborepo's terminal UI
bun run dev:mobile      # just the Expo dev server
bun run dev:marketing   # just the site, at http://localhost:3002
```

In the terminal UI, pick a task with the arrow keys and press `i` to type into
it, for example to send Expo's `i` or `a` shortcuts. Press Ctrl+Z to stop
typing into the task.

To install the app on a simulator or device, run `bun run ios` or
`bun run android` inside `apps/mobile`.

## Scripts

Every workspace uses the same script names, so the same command means the same
thing everywhere. Run them from the root to cover every workspace, or inside
one app to cover only that app.

| Script | Root | `apps/mobile` | `apps/marketing` |
| --- | --- | --- | --- |
| `dev` | both apps, terminal UI | Expo dev server | Vite dev server |
| `build` | `turbo run build` | none: EAS builds the app | prerender, headers, output tests |
| `lint` | Biome over the repo | Biome over the app | Biome over the app |
| `format` | Biome fixes and formatting | same, app only | same, app only |
| `typecheck` | `turbo run typecheck` | `tsc` | `tsc` |
| `test` | `turbo run test` | unit tests | unit tests |
| `check` | lint, typecheck, test, knip | adds content validation and `expo-doctor` | adds the full build |
| `clean` | every workspace, then `node_modules` | Expo and Metro caches | `dist` |

The mobile app also has `ios`, `android`, `dev:clear` (the dev server with a
cleared cache), `doctor` and `validate:content`. The marketing app also has
`preview`, which serves a build with the headers the host sends.

Run `bun run check` before you push. CI runs the same checks.

## Where code goes

- **Domain logic and content** (planning, prayer times, the Hijri calendar,
  content JSON and its schema, string tables): `packages/core`. Plain
  TypeScript, no React or React Native, with a test beside each module.
- **Screens and components:** `packages/ui`. Presentational only: take props,
  read strings, scheme, links and raw colours from `useUi()`, and never import
  a store, the router or `@/` paths. Export the screen's props type and add
  sample props to `src/screens/fixtures.ts`. Anything a screen needs from the
  host goes through `UiProvider`, not a new import.
- **Routes, stores, native chrome, notifications, widgets:** `apps/mobile`.
  A route reads the stores and builds the screen's props.
- **Colours, fonts and other design tokens:** `tooling/tailwind/tokens.ts`,
  then `bun run generate` inside `tooling/tailwind` to rewrite `theme.css` and
  `web.css` for the web. Shared screens take colours and fonts in `style` from
  `useColors()` and `src/fonts.ts` in `packages/ui` (NativeWind 5 RC does not
  apply stylesheet colour variables on native), never raw hex; Tailwind
  classes are for layout and the type scale.
- **The site's phone demo** renders the shared screens, so a change to a
  screen shows up on the site too. Check it with `bun run build` in
  `apps/marketing`, whose headless-Chrome test fails on any console error.

## Code style

One Biome configuration, `biome.json` at the root, formats and lints every
workspace. There is no ESLint or Prettier. The same rules apply everywhere:

- **Formatting:** single quotes, no semicolons, trailing commas, 100 columns.
  Run `bun run format` rather than formatting by hand.
- **Types:** strict TypeScript from `@ihsaanly/tsconfig`, with
  `noUncheckedIndexedAccess`. No `any` and no non-null assertions (`!`).
- **Return types:** every declared function and component states its return
  type. Inline callbacks passed to typed props are exempt.
- **Exports:** named exports only. Default exports are allowed only where a
  framework needs them, in mobile's `src/app` routes and widgets.
- **File names:** kebab-case, apart from the router's own file names.
- **State:** at most one `useState` per file, holding an object typed by a
  local `Thing` interface: `const [thing, setThing] = useState<Thing>(…)`.
- **Right-to-left layouts:** logical directions only, such as `ms-`, `pe-`,
  `start-` and `marginStart`. Arabic and Urdu mirror without rewrites.
- **Promises:** no floating or misused promises.
- **Tailwind classes** are sorted by Biome.

`packages/core` may not import React, React Native or native modules, and
`packages/ui` may not import `expo-router` or the app's `@/` paths; Biome's
`noRestrictedImports` enforces both.

Rules Biome lacks live in the `@ihsaanly/lint` package: GritQL plugins in
`packages/lint/plugins`, and the `useState` checker each app runs as a test.

## Dependencies

Shared dependencies are declared once, in the `catalog` in the root
`package.json`: React, React DOM, their types, TypeScript, zod, Bun's types
and Tailwind. A workspace refers to them as `"catalog:"`. To change one of
these versions, edit the catalog and run `bun install`.

Other dependencies:

- **Expo and React Native packages** go through Expo's tooling, never a manual
  bump. Add them with `npx expo install <package>` and align them with
  `npx expo install --fix`, run inside `apps/mobile`. React and React DOM
  follow whatever Expo's SDK requires; if Expo changes them, move the new
  version into the catalog.
- **Pinned on purpose:** `nativewind` and `react-native-css` are release
  candidates that must move together. `lightningcss` stays on 1.30.1 because
  1.33.0 breaks the build. `apps/mobile/AGENTS.md` explains both.
- **Everything else:** `bun add <package>` in the workspace that needs it.

`bun run outdated` lists what is behind. Check the release notes before
taking a major version.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org),
checked by commitlint when you commit. `bun run commit` walks you through
one. Use the workspace as the scope when a change belongs to one:

```text
feat(mobile): add the Friday reminder preset
fix(marketing): keep the language menu open on focus
chore(repo): update dev dependencies
```

Before each commit, Lefthook runs Biome on the staged files. When mobile files
change, it also runs mobile's typecheck, tests and content validator.

## Deploying

- **Marketing site:** pushing to `production` deploys it when the site,
  `packages/core`, `packages/ui`, `tooling/tailwind` or the lockfile changed. See
  [`apps/marketing/HOSTING.md`](../apps/marketing/HOSTING.md).
- **Mobile app:** builds and store submissions go through EAS. See
  [`apps/mobile/README.md`](../apps/mobile/README.md).
