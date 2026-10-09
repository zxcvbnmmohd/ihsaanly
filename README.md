# Ihsaanly

An offline-first Sunnah companion. It shows the sunnah that fits the moment,
with its source, and lets you mark what you did. No account, no ads, no
analytics. Signing in with Apple or Google is optional and only syncs your
record across devices.

| Where | What |
| --- | --- |
| [ihsaanly.app](https://ihsaanly.app) | The website, with an interactive demo of the app. |
| [companion.ihsaanly.app](https://companion.ihsaanly.app) | The web app (works offline, installable). |
| iOS and Android | The mobile app (store listings coming soon). |
| Chrome | The browser extension (Web Store listing coming soon). |

This is the monorepo for all of them: Bun workspaces, built with Turborepo,
checked by one Biome configuration, and published as open source under the
[MIT licence](LICENSE).

- **Want to help?** Read [CONTRIBUTING.md](CONTRIBUTING.md).
- **Found a security problem?** Follow [SECURITY.md](SECURITY.md); please
  don't open a public issue.

## Workspaces

| Workspace | Path | What it is |
| --- | --- | --- |
| `@ihsaanly/mobile` | [`apps/mobile`](apps/mobile) | The Expo (React Native) app for iOS and Android, with widgets. |
| `@ihsaanly/companion` | [`apps/companion`](apps/companion) | The web app: a Vite single-page app on react-native-web. |
| `@ihsaanly/extension` | [`apps/extension`](apps/extension) | The Chrome (Manifest V3) extension: Today in a popup. |
| `@ihsaanly/marketing` | [`apps/marketing`](apps/marketing) | The website: TanStack Start, prerendered to static files. Also publishes the remote content updates. |
| `@ihsaanly/core` | [`packages/core`](packages/core) | The domain: content, planner, prayer times, Hijri calendar, string tables. No React. |
| `@ihsaanly/state` | [`packages/state`](packages/state) | Stores and hooks every app shares: storage, preferences, progress, sync wiring. |
| `@ihsaanly/cloud` | [`packages/cloud`](packages/cloud) | Optional sign-in and sync behind small ports, with Firebase and in-memory adapters, plus the Firestore rules. |
| `@ihsaanly/ui` | [`packages/ui`](packages/ui) | Every screen and component, shared by all four apps. |
| `@ihsaanly/web` | [`packages/web`](packages/web) | Web-only helpers: the react-native-web Vite config, hosting headers, CSP. |
| `@ihsaanly/lint` | [`packages/lint`](packages/lint) | Biome GritQL plugins and the one-`useState`-per-file checker. |
| `@ihsaanly/tailwind` | [`tooling/tailwind`](tooling/tailwind) | Design tokens, the generated Tailwind theme, and fonts. |
| `@ihsaanly/tsconfig` | [`tooling/tsconfig`](tooling/tsconfig) | The shared strict TypeScript settings. |

The apps are thin: routes read the shared stores and render the shared
screens. The website's phone demo renders the app's own screens through
react-native-web and runs the real planner. How it fits together is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

You need [Bun](https://bun.sh) 1.4.2 (pinned in `package.json`). For the
sync emulators you also need Java 21; [mise](https://mise.jdx.dev) installs
it from `mise.toml`.

```bash
bun install
bunx lefthook install   # once per clone: the git hooks
bun run dev             # every app in Turborepo's terminal UI
```

| App | Address |
| --- | --- |
| Website | <http://localhost:3002> |
| Web app | <http://localhost:3003> |
| Extension | `bun run dev:extension` rebuilds on save; load `apps/extension/dist` as an unpacked extension |
| Mobile | a development build, not Expo Go: see [`apps/mobile/README.md`](apps/mobile/README.md) |

No Firebase settings are needed to work on the apps: without them every app
builds local-only, with no Account screen. To work on sign-in and sync
locally, run `bun run dev:cloud` for the Firebase emulators.

## Commands

The same script names work in every workspace; from the root they cover all
of them.

| Command | What it does |
| --- | --- |
| `bun run dev` | Every dev server. `dev:mobile`, `dev:companion`, `dev:extension`, `dev:marketing` run one. |
| `bun run dev:cloud` | The Firebase Auth and Firestore emulators. |
| `bun run build` | Builds and verifies the web apps (output, headers, CSP, headless Chrome). |
| `bun run build:extension:both` | The Web Store zips: `ihsaanly-extension.zip` and the beta. |
| `bun run check` | Lint, typecheck, unit tests and knip. Run it before you push. |
| `bun run coverage:enforce` | Unit-test coverage; every source file must be at 100% lines and functions. |
| `bun run e2e:web` | Playwright for the website and the web app (desktop and phone sizes). |
| `bun run e2e:extension` | Playwright against the built extension. |
| `bun run e2e:sync` | Two-device sign-in and sync journeys on the Firebase emulators (needs Java 21). |
| `bun run format` | Biome's safe fixes and formatting. |
| `bun run licenses` | Regenerates `THIRD_PARTY_LICENSES.md`. |
| `bun run commit` | A Conventional Commit through commitizen. |
| `bun run clean` | Build outputs, caches and `node_modules`. |

Testing in depth: [docs/TESTING.md](docs/TESTING.md).

## What's in the root

```text
.
├── .github/                  CI and deploy workflows, issue and PR templates, Dependabot
│   └── workflows/            check, deploy-marketing, deploy-companion, deploy-firestore, deploy-ftp (shared)
├── .vscode/                  Recommended extensions and editor settings (Biome as formatter)
├── apps/                     The four apps: mobile, companion, extension, marketing
├── packages/                 Shared code: core, state, cloud, ui, web, lint
├── tooling/                  Shared config packages: tailwind (tokens, theme, fonts), tsconfig
├── e2e/                      Playwright suites: marketing, companion, extension, sync, mobile notes
├── scripts/                  Repo scripts: coverage.ts (the 100% gate), licenses.ts
├── docs/                     Architecture, testing, store privacy-form answers, design specs
├── .gitignore                What never gets committed, including env files and signing keys
├── .markdownlint.json        Markdown lint rules for the docs
├── biome.json                The one formatter and linter configuration for every workspace
├── bun.lock                  The lockfile; CI installs with --frozen-lockfile
├── bunfig.toml               Bun settings: a hoisted node_modules for React Native autolinking
├── commitlint.config.cjs     Conventional Commit rules, checked on every commit
├── coverage.config.ts        The coverage thresholds scripts/coverage.ts enforces
├── knip.jsonc                Unused files, exports and dependencies
├── lefthook.json             Git hooks: Biome on staged files, mobile checks, commit message lint
├── mise.toml                 Tools Bun can't provide: Java 21 for the Firebase emulators
├── package.json              Workspaces, root scripts and the shared version catalog
├── playwright.config.ts      The web e2e projects (website and web app, desktop and phone)
├── turbo.json                Turborepo tasks, caching and inputs
├── CODE_OF_CONDUCT.md        How we treat each other
├── CONTRIBUTING.md           How to contribute, for outside contributors and the team
├── LICENSE                   MIT
├── README.md                 This file
├── SECURITY.md               How to report a vulnerability privately
├── THIRD_PARTY_LICENSES.md   Licences of the dependencies we ship (bun run licenses)
├── TODO.md                   The launch to-do list: accounts, stores, reviews
└── WEB-APP-PLAN.md           The plan the web app was built from (kept for history)
```

## Branches, CI and deploys

| Branch | Deploys to |
| --- | --- |
| `development` | dev.ihsaanly.app, dev.companion.ihsaanly.app and the `ihsaanly-development` Firebase project. |
| `production` | ihsaanly.app, companion.ihsaanly.app and `ihsaanly-production`, after a maintainer approves the deploy. |

| Workflow | When | What |
| --- | --- | --- |
| [`check`](.github/workflows/check.yml) | Every pull request, and pushes to either branch | Lint, knip, typecheck, unit tests, the verified web builds, content validation and the Firestore rules tests. |
| [`deploy-marketing`](.github/workflows/deploy-marketing.yml) | Pushes that touch the website or what it uses | Builds, verifies, uploads over FTPS. |
| [`deploy-companion`](.github/workflows/deploy-companion.yml) | Pushes that touch the web app or what it uses | Builds, verifies, uploads over FTPS. |
| [`deploy-firestore`](.github/workflows/deploy-firestore.yml) | Pushes that touch the Firestore rules or indexes | Tests the rules on the emulator, then deploys them. |

Mobile builds and store uploads are moving to GitHub Actions; until then they
are built locally. See [`apps/mobile/README.md`](apps/mobile/README.md).

## Docs

- [CONTRIBUTING.md](CONTRIBUTING.md): setup, conventions, pull requests, and
  the internal release process.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the apps, packages, sync
  and content updates fit together.
- [docs/TESTING.md](docs/TESTING.md): unit, coverage and end-to-end testing.
- [`packages/cloud/README.md`](packages/cloud/README.md): sign-in, sync and the
  Firestore layout.
- [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md): the mobile app's
  conventions and hard constraints; product and technical specs are in
  [`apps/mobile/docs`](apps/mobile/docs).
- [`apps/marketing/HOSTING.md`](apps/marketing/HOSTING.md) and
  [`apps/companion/HOSTING.md`](apps/companion/HOSTING.md): static hosting,
  security headers and uploads.
- [docs/store-privacy-forms.md](docs/store-privacy-forms.md): the answers for
  the App Store, Play and Chrome Web Store privacy forms.

## Licence

[MIT](LICENSE) © Moh’d Inc. Third-party licences are listed in
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). The religious content
(hadith and Qur’an text, translations) is reviewed separately; see the item
sources in the app.
