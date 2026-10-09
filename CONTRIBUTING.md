# Contributing to Ihsaanly

Thank you for helping. This guide has three parts:

1. [**For everyone**](#for-everyone): setup, conventions, tests and pull
   requests.
2. [**For outside contributors**](#for-outside-contributors): what you need
   (and don't), and how review works.
3. [**For the internal team**](#for-the-internal-team): branches, releases,
   secrets and deploys.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Report
security problems privately, as [SECURITY.md](SECURITY.md) explains, never in
a public issue.

---

## For everyone

### What we care about

These are product rules, not preferences. A change that breaks one won't be
merged, however good the code is.

- **Private by default.** No analytics, ads, trackers or third-party scripts.
  Nothing leaves the device unless the user chose it (sync, feedback, an
  opt-in crash report). If a change sends or stores something new, the privacy
  policy and [docs/store-privacy-forms.md](docs/store-privacy-forms.md) change
  in the same pull request.
- **Offline first.** Every app works with no network and no account.
- **Sourced content.** Every sunnah item carries its evidence (Qur'an or
  hadith, with collection, reference and grading). Content changes need a
  source we can check.
- **Calm.** No streaks, guilt, badges or nagging. Reminders are gentle and
  discreet.
- **Everyone can use it.** WCAG 2.1 AA, right-to-left languages, screen
  readers, keyboard, large text.

### Ways to help

- **Report a bug** with the Bug template. More → Your data → Send a diagnostic
  report shows you exactly what it contains before you attach it.
- **Translate or review a translation.** There are 10 languages (en, ar, fr,
  hi, it, ja, so, ur, yue, zh). Native-speaker review is our biggest need,
  especially Somali, Hindi and Urdu. See [Strings and
  translations](#strings-and-translations).
- **Correct content.** A wrong reference, grading or translation: open an
  issue with the source.
- **Write code.** Look for issues labelled `ready-for-agent` or `good first
  issue`, or open an issue first for anything large, so we can agree on the
  shape before you build it.

### Setup

You need:

- [Bun](https://bun.sh) 1.4.2 (pinned in `package.json`).
- For the mobile app, Xcode or Android Studio: it runs as a development
  build, not in Expo Go.
- For sync work and `bun run e2e:sync`, Java 21. [mise](https://mise.jdx.dev)
  installs it from `mise.toml` (`mise install`).

```bash
bun install
bunx lefthook install   # once per clone: the git hooks
bun run dev             # every app in Turborepo's terminal UI
```

In the terminal UI, pick a task with the arrow keys and press `i` to type into
it (for Expo's `i` or `a` shortcuts); Ctrl+Z stops typing into it. One app:

```bash
bun run dev:marketing   # http://localhost:3002
bun run dev:companion   # http://localhost:3003
bun run dev:extension   # rebuilds apps/extension/dist; load it unpacked in Chrome
bun run dev:mobile      # Expo dev server; then `bun run ios` or `bun run android` in apps/mobile
bun run dev:cloud       # Firebase Auth and Firestore emulators
```

**No Firebase project is needed.** Without Firebase settings each app builds
local-only, with no Account screen. To work on sign-in or sync, copy the
app's `.env.example` to `.env.development`, set
`VITE_FIREBASE_EMULATOR_HOST` (or the `EXPO_PUBLIC_` equivalent) and run
`bun run dev:cloud`.

### Where code goes

- **Domain logic and content** (planning, prayer times, Hijri calendar,
  content JSON and schema, string tables): `packages/core`. Plain TypeScript,
  no React, with a test beside each module.
- **Shared state** (storage, preferences, progress, sync wiring, hooks every
  app uses): `packages/state`.
- **Sign-in and sync:** `packages/cloud`, behind its ports (`AuthService`,
  `SyncRemote`, `LocalStore`, `FeedbackService`). Firebase is one adapter;
  the in-memory adapter is for tests. The Firestore rules live here too.
- **Screens and components:** `packages/ui`. Presentational only: props in,
  strings, colours and links from `useUi()`. No stores, no router, no app
  paths. Export the screen's props type and add sample props to
  `src/screens/fixtures.ts`.
- **Routes, native chrome, notifications, widgets:** the app in `apps/*`. A
  route reads the stores and builds the screen's props, nothing more.
- **Design tokens** (colours, fonts): `tooling/tailwind/tokens.ts`, then
  `bun run generate` in `tooling/tailwind`. Screens take colours from
  `useColors()`, never raw hex; Tailwind classes are for layout and type.
- **Web-only helpers** (Vite config, hosting headers, CSP):
  `packages/web`.

A change to a shared screen shows up in all four apps and in the website's
phone demo. The architecture is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Code style

One Biome configuration (`biome.json`) formats and lints everything. There is
no ESLint or Prettier; run `bun run format` instead of formatting by hand.

- **Formatting:** single quotes, no semicolons, trailing commas, 100 columns.
- **Types:** strict TypeScript with `noUncheckedIndexedAccess`. No `any`, no
  non-null assertions (`!`). Every declared function states its return type.
- **Exports:** named only, except where a framework needs a default (mobile
  routes and widgets).
- **File names:** kebab-case, apart from the router's own.
- **State:** at most one `useState` per file, holding an object typed by a
  local `Thing` interface.
- **Right-to-left:** logical directions only (`ms-`, `pe-`, `start-`,
  `marginStart`). Arabic and Urdu mirror without rewrites.
- **Promises:** none floating or misused.
- **Boundaries:** `packages/core` may not import React or native modules;
  `packages/ui` may not import the router or an app's paths. Biome enforces
  both, and the rules it lacks are GritQL plugins in `packages/lint`.
- **Comments** explain why, not what.

### Strings and translations

User-facing text is never hard-coded.

- App strings: `packages/core/src/strings/<lang>.ts`, one file per language,
  all with the same keys (`en.ts` is the source).
- Website strings: `apps/marketing/src/i18n/messages/<lang>.json`.
- Content (sunnah items, glossary): `packages/core/content/items.json` and
  `packages/core/content/translations/<lang>.json`, validated by
  `bun run validate:content` in `apps/mobile`.

A new or changed string goes into **all 10 languages** in the same pull
request. If you can't translate it, put the English in and say so in the pull
request; a reviewer will arrange the translation. Translations from
non-native speakers are drafts until a native speaker reviews them.

### Tests

Every pull request keeps these green; CI runs them.

```bash
bun run check              # lint, typecheck, unit tests, knip
bun run coverage:enforce   # every source file at 100% lines and functions
bun run e2e:web            # website and web app, desktop and phone sizes
bun run e2e:extension      # the built extension
bun run e2e:sync           # two-device sync on the emulators (needs Java 21)
```

- New logic comes with a unit test beside it (`*.test.ts`).
- A change a user can see comes with an end-to-end check where one exists
  for that screen.
- Accessibility is tested: axe runs on every page in light and dark at every
  severity, and keyboard specs cover each web surface. Don't disable a rule
  to make a test pass; fix the screen.

[docs/TESTING.md](docs/TESTING.md) covers the suites, fixtures and tips.

### Dependencies

- **Shared versions** (React, React DOM, TypeScript, zod, Tailwind, shared
  types) live once in the root `package.json` catalog; workspaces use
  `"catalog:"`.
- **Expo and React Native packages:** `npx expo install <package>` inside
  `apps/mobile`, never a manual bump.
- **Pinned on purpose:** `nativewind` with `react-native-css`, and
  `lightningcss`. [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md) explains
  why.
- **Anything else:** `bun add <package>` in the workspace that needs it.
  Prefer what's already installed or a few lines of code over a new
  dependency, and never add one that phones home.
- After adding a dependency that ships, run `bun run licenses` to update
  `THIRD_PARTY_LICENSES.md`.

### Commits

[Conventional Commits](https://www.conventionalcommits.org), checked by
commitlint. `bun run commit` walks you through one. Use the workspace as the
scope:

```text
feat(mobile): add the Friday reminder preset
fix(companion): keep focus on the counter after a tap
docs(repo): explain the release flow
```

Lefthook runs Biome on staged files before each commit, and mobile's
typecheck, tests and content validator when mobile files change. Don't skip
the hooks with `--no-verify`.

### Pull requests

1. Fork (outside contributors) or branch (team) from **`development`**.
   Name the branch after the change: `fix/counter-focus`.
2. Keep it to one change. Small pull requests get reviewed faster.
3. Run the [tests](#tests) and fill in the pull request template: what
   changed, why this way, the checks, and what you verified it on.
4. Open the pull request against **`development`**.
5. A maintainer reviews. Expect questions; they're about the code, not you.
6. Once approved and green, a maintainer squash-merges it.

Changes to these need a maintainer's extra care, so call them out in the
description:

- `packages/cloud/firestore.rules` (who can read or write data);
- anything that sends data off the device, or changes what's stored;
- the privacy policy, terms or store privacy forms;
- `.github/workflows/` (CI and deploys);
- religious content and its sources.

---

## For outside contributors

- **You need no accounts or secrets.** Every app builds and tests local-only,
  and sync runs on the Firebase emulators. Workflows that deploy never run on
  pull requests from forks.
- **Start small.** A typo, a translation fix, a failing test made to pass, an
  accessibility fix. For a feature, open an issue first; for a bug fix, a
  pull request is fine straight away.
- **Licence.** By contributing you agree that your contribution is licensed
  under the project's [MIT licence](LICENSE), and that you have the right to
  submit it. Don't copy code you can't license that way.
- **Content and translations** may be adjusted by a scholar or native-speaker
  reviewer before release. We'll credit you in the pull request.
- **AI-assisted contributions** are welcome if you have reviewed, run and
  understood every line, and the pull request says which parts were
  generated.
- **Response time.** We aim to reply to issues and pull requests within a
  week. If you hear nothing, a polite ping on the pull request is fine.

---

## For the internal team

### Branches and releases

| Branch | Deploys to | Protection |
| --- | --- | --- |
| `development` | dev.ihsaanly.app, dev.companion.ihsaanly.app, `ihsaanly-development` | Its own environment secrets only. |
| `production` | ihsaanly.app, companion.ihsaanly.app, `ihsaanly-production` | Environment secrets, and every deploy waits for a maintainer's approval. |

1. Work lands in `development` through pull requests (or a direct push for
   small team changes). It deploys to the dev sites and dev Firebase at once.
2. Check it on the dev sites.
3. Release by moving `production` to the same commit:
   `git push origin development:production` (a fast-forward; the branches
   should never diverge).
4. Approve the waiting deploys: the run's page → **Review deployments** →
   `production` → **Approve and deploy**.
5. Check the live sites. Firestore rules deploy with their own workflow when
   they change.

Keep `development` and `production` identical after a release:
`git rev-parse origin/development origin/production` should print the same
commit twice.

### Environments and configuration

- **Firebase projects:** `ihsaanly-development` and `ihsaanly-production`,
  owned by the apps account. Each app has one per environment.
- **Local env files:** each app has `.env.example`; copy it to
  `.env.development` and `.env.production` and fill in the values. They are
  git-ignored. The values are public client settings (they ship in the
  bundles); they live as GitHub **Variables** in each environment.
- **GitHub secrets** (environment-scoped, never in the repo): the FTP
  credentials, a least-privilege `FIREBASE_SERVICE_ACCOUNT` for rules
  deploys, and, as the mobile pipelines arrive, signing and store-upload
  keys.
- **Firebase client API keys** in `apps/mobile/firebase/**` are public by
  design and restricted in Google Cloud to their app (bundle ID, or package
  name and signing certificate) and to Firebase APIs. Secret scanning flags
  them; that's expected.

### Secrets: the rules

- Never commit a secret, key, keystore, certificate, `.p8`, `.env` file,
  service-account JSON or corporate document. `.gitignore` covers the usual
  names; check `git status` before every commit and never `git add -A`
  blindly.
- Signing keys live outside the repo (the Android upload keystore is in
  `~/.config/ihsaanly/android-upload/`) and in the password manager.
- If a secret is committed: tell the team at once, rotate it (a public commit
  is public forever, even after a force-push), then remove it from the tree.
  Record what happened in `TODO.md`.

### Mobile releases

Builds run through GitHub Actions (free on this public repo), not EAS. The
pipelines and store setup are tracked in [TODO.md](TODO.md) sections 5–7, and
the store listings in [`apps/mobile/store`](apps/mobile/store). Privacy-form
answers are in [docs/store-privacy-forms.md](docs/store-privacy-forms.md);
keep them in step with the code.

### Working agreements

- Every change ships with its tests, its strings in all 10 languages, and its
  docs.
- A change to what's collected, stored or sent updates the privacy policy (all
  10 languages) and the store forms in the same pull request, and bumps the
  policy's "Last updated" date (`apps/marketing/src/i18n/locales.ts`).
- Rules changes come with rules tests (`packages/cloud/test`).
- Commits carry no AI co-author trailers.
- The launch checklist is [TODO.md](TODO.md); tick items as they're done.
