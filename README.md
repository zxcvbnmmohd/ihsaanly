# Ihsaanly

The monorepo for Ihsaanly, an offline-first Sunnah companion: the mobile app,
its marketing site, and the configuration they share. Bun workspaces, built
with Turborepo, checked by one Biome configuration.

| Workspace | Path | What it is |
| --- | --- | --- |
| `@ihsaanly/mobile` | [`apps/mobile`](apps/mobile) | The Expo (React Native) app for iOS and Android. |
| `@ihsaanly/marketing` | [`apps/marketing`](apps/marketing) | [ihsaanly.app](https://ihsaanly.app): a TanStack Start site, prerendered to static files. |
| `@ihsaanly/core` | [`packages/core`](packages/core) | The domain: content, planner, prayer times, Hijri calendar, string tables. No React. |
| `@ihsaanly/ui` | [`packages/ui`](packages/ui) | The app's screens and components, shared by the app and the site's phone demo. |
| `@ihsaanly/tailwind` | [`tooling/tailwind`](tooling/tailwind) | Design tokens, the generated Tailwind theme, and fonts. |
| `@ihsaanly/tsconfig` | [`tooling/tsconfig`](tooling/tsconfig) | The compiler strictness both apps extend. |
| `@ihsaanly/lint` | [`packages/lint`](packages/lint) | Biome GritQL plugins and the one-`useState`-per-file checker. |

The site reuses the app's own work. Its dua specimen reads the content in
`packages/core`, and its interactive phone demo renders the app's own screens
from `packages/ui` through react-native-web, running the real planner.

## Getting started

You need [Bun](https://bun.sh) 1.4.2, the version pinned in `package.json`.

```bash
bun install
bunx lefthook install   # once per clone: installs the git hooks
bun run dev             # both apps, in Turborepo's terminal UI
```

The marketing site runs at <http://localhost:3002>. The mobile app needs a
development build, not Expo Go: see [`apps/mobile/README.md`](apps/mobile/README.md).

## Commands

Every workspace uses the same script names. From the root they cover every
workspace:

| Command | What it does |
| --- | --- |
| `bun run dev` | Both dev servers in the terminal UI. `dev:mobile` and `dev:marketing` run one. |
| `bun run build` | Prerenders the marketing site and verifies its output. |
| `bun run lint` | Biome lint and format check over the whole repo. |
| `bun run format` | Biome's safe fixes and formatting. |
| `bun run typecheck` | TypeScript in every workspace. |
| `bun run test` | Unit tests in every workspace. |
| `bun run knip` | Unused files, exports and dependencies. |
| `bun run check` | Lint, typecheck, test and knip: run it before you push. |
| `bun run outdated` | Dependencies with newer versions. |
| `bun run commit` | A conventional commit through commitizen. |
| `bun run clean` | Build outputs, caches and `node_modules`. |

## Docs

- [**Contributing**](docs/CONTRIBUTING.md): setup, every script, code style,
  adding dependencies, commits and deploys.
- [**Architecture**](docs/ARCHITECTURE.md): the workspaces, how the site uses
  the app, and what checks what.
- [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md): the mobile app's
  conventions and constraints. The product and technical specs are in
  [`apps/mobile/docs`](apps/mobile/docs).
- [`apps/marketing/HOSTING.md`](apps/marketing/HOSTING.md): the static build,
  its per-page security headers, and the upload.

## Tooling at a glance

- **Bun workspaces** with a hoisted `node_modules`, which React Native
  autolinking needs. A version **catalog** in the root `package.json` keeps
  React, React DOM, TypeScript, zod, Tailwind and the shared types on one
  version across workspaces.
- **Turborepo** runs builds, typechecks, tests and the dev servers, with
  caching. The site's build and tests watch the mobile app's content and source.
- **Biome** formats and lints everything from the root `biome.json`, with the
  same rules for both apps. There is no ESLint or Prettier.
- **TypeScript 6**, strict, from `@ihsaanly/tsconfig`, on the version
  Expo's SDK expects.
- **Lefthook** runs Biome on staged files and mobile's checks before each
  commit. Commit messages follow Conventional Commits, checked by commitlint.

## CI and deployment

| Workflow | When | What |
| --- | --- | --- |
| [`check`](.github/workflows/check.yml) | Pushes to `main` or `production`, and pull requests | Lint, typecheck, knip, all tests, the verified site build and the content validator. |
| [`deploy-marketing`](.github/workflows/deploy-marketing.yml) | Pushes to `production` that touch the site, the app's content or source, or the lockfile | Builds and verifies the site, then uploads it over FTPS. |

The mobile app ships through EAS, configured in
[`apps/mobile/eas.json`](apps/mobile/eas.json).
