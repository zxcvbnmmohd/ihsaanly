# Testing

The goal is 100% line and function coverage of every source file, plus
end-to-end suites for each surface. Everything below runs from the repo root
with what is already installed: adding a test never needs a new package or a
change to a shared root file.

| What | Command | Where the tests live |
| --- | --- | --- |
| Unit and component tests | `bun run test` (turbo, every workspace) | `<workspace>/src/**/*.test.ts(x)` |
| One workspace | `bun run --cwd packages/ui test` | |
| Coverage report | `bun run coverage` | `<workspace>/coverage/lcov.info` |
| Coverage gate | `bun run coverage:enforce` | threshold in `coverage.config.ts` |
| Web and extension e2e | `bunx playwright test` (`bun run e2e`) | `e2e/{marketing,companion,extension}` |
| Mobile e2e | `maestro test e2e/mobile/flows` | `e2e/mobile` (see its README) |
| Security rules | `bun run --cwd packages/cloud test:rules` | `packages/cloud/test` (JDK 21) |

## Unit tests

`bun test`, with `describe`/`it`/`expect`/`mock` from `bun:test`.

- A test sits next to what it tests: `src/plan/suggest.ts` →
  `src/plan/suggest.test.ts`. Use `.test.tsx` when it renders.
- Each workspace's `test` script says which folders it runs: `./src ./scripts`
  in companion and marketing (their `test/` folders hold the post-build suite,
  run by `build`), and `./src ./test` in the extension.
- Test helpers that are not tests go in the workspace's `test/` folder (not
  counted as source by the coverage check). Fixtures used by the product, like
  `packages/ui/src/screens/fixtures.ts`, are source and need coverage too.
- Keep tests deterministic: pass `now`/`Date` in rather than reading the
  clock, and seed anything random.

### Mocking Expo and other native modules

Native modules do not load under Bun. Replace them with `mock.module` before
the code under test is imported, so import that code dynamically:

```ts
import { expect, it, mock } from 'bun:test'

const scheduled: unknown[] = []
mock.module('expo-notifications', () => ({
  scheduleNotificationAsync: async (request: unknown) => {
    scheduled.push(request)
    return 'id-1'
  },
  cancelAllScheduledNotificationsAsync: async () => {},
}))

const { syncReminders } = await import('./sync')

it('schedules the plan', async () => {
  await syncReminders(/* … */)
  expect(scheduled).toHaveLength(3)
})
```

`mock.module` is process-wide for the rest of the run (Bun runs a
workspace's test files in one process), so give each mock the full surface
the code uses, and keep per-test state in variables the test resets. For a
module several test files mock, put the mock in that workspace's `test/`
folder and import it first.

## Component tests

`packages/ui/test/preload.ts` gives `bun test` a DOM (happy-dom) and React
Native the way the web builds resolve it: `react-native` is react-native-css
over react-native-web, a `.web.ts(x)`/`.web.js` file wins over its native
sibling (in workspace code and in Expo packages), `require('./x.png')` is
`{ uri }`, and `__DEV__`, `global` and `process.env.EXPO_OS = 'web'` are set.
It also registers jest-dom's matchers on `expect` and unmounts after every
test. Bun's own `fetch`, URL, streams and crypto are kept, so non-DOM tests
in the same workspace behave as before.

It is preloaded (each workspace's `bunfig.toml`) in `packages/ui`,
`packages/web`, `apps/companion`, `apps/extension` and `apps/marketing`.
Mobile and the non-UI packages run without a DOM.

`packages/ui/test/render.tsx` renders inside the providers a web host uses:

```tsx
import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'   // from another workspace: '@ihsaanly/ui/test/render'
import { onboardingFixture } from './fixtures'
import { OnboardingScreen } from './onboarding'

const welcome = { ...onboardingFixture, step: 'welcome', stepIndex: 0 } as const

describe('OnboardingScreen', () => {
  it('moves on when Continue is pressed', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(<OnboardingScreen {...welcome} onNext={onNext} />)
    expect(screen.getByText(strings.onboarding.welcomeTitle)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.onboarding.continue }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})
```

`renderScreen(ui, { locale, scheme, layout })`:

- `locale`: any `SupportedLanguage` (`'en'` by default); the real string
  table from `packages/core/src/strings`, returned as `strings` so tests
  assert on the same text the screen shows.
- `scheme`: `'light'` (default) or `'dark'`, with the web system colours.
- `layout`: `'compact' | 'regular' | 'wide'`, instead of measuring the
  window.
- Returns Testing Library's render result plus `user` (user-event, set up)
  and `navigations`: the fake `Link` renders its child as an anchor and
  records each pressed `href` there instead of navigating.

Query by role and visible text (`getByRole('button', { name })`,
`getByText`), the way a person finds things. react-native-web maps
`accessibilityRole`/`role` to ARIA and `href` to an anchor. Class names from
Tailwind are passed through but no stylesheet is loaded, so assert on
behaviour and text rather than layout.

A component that needs app state (stores, router) belongs to its app: test
the screen in `packages/ui` with props, and the route's wiring in the app.

## Coverage

`bun run coverage` runs every workspace's `test:coverage` script
(`bun test --coverage`, with the reporters set in its `bunfig.toml`), reads
`coverage/lcov.info`, and compares it against every source file in that
workspace: `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs` files that git tracks or
would track, minus tests, `.d.ts`, `routeTree.gen.ts`, build output and the
workspace's `test/` folder.

```sh
bun run coverage                       # report (exit 0 unless tests fail)
bun run coverage --enforce             # exit 1 if any file is under the threshold
bun run coverage --workspace ui        # one workspace: name, short name or path; repeatable
bun run coverage --no-run              # re-read the last lcov files without re-running tests
bun run coverage --all                 # list every file, not just the failing ones
```

Each workspace prints its files under the threshold:

- `BELOW` — loaded by a test, with its line and function percentages.
- `MISSING` — no test loads it at all. Bun only reports files a test
  imports, so this is how an untested file shows up; it counts as 0%.
- `STUBBED` — a native file with a `.web` sibling in a workspace that uses
  the component preload. The preload loads the web file in its place, so
  these cannot be covered there: test them with `mock.module` in a workspace
  without the preload (mobile), or add them to the exclude list with that
  reason.
- `TYPES` — compiles to nothing (only types); counted as covered.

A file's coverage comes only from its own workspace's tests: ui's tests
running core code do not cover core.

### The exclude list

`coverage.config.ts` holds the threshold (100% lines, 100% functions) and an
`exclude` list that starts empty. An entry is allowed only for a file that
genuinely cannot run under `bun test` (a native-only module, a build-tool
config Bun cannot evaluate), and each entry states why. "Hard to test" is
not a reason, and a file that a `mock.module` can isolate must be tested.

## End-to-end: web and extension (Playwright)

`playwright.config.ts` has three projects, each against a production build:

- `marketing`: `apps/marketing/dist/client`, served on port 4310 by the
  app's `scripts/serve.ts` (the Apache host's headers and CSP).
- `companion`: `apps/companion/dist`, served on port 4311 the same way.
- `extension`: `apps/extension/dist` loaded unpacked into Playwright's
  Chromium (`e2e/support/extension.ts`, the documented MV3 pattern); the
  `extensionId` fixture gives `chrome-extension://<id>/popup.html`.

A missing build is made first (`e2e/support/build.ts`: `vite build` plus
the app's postbuild); `E2E_BUILD=1 bunx playwright test` rebuilds every time.
Locally a server already on the port is reused.

```sh
bunx playwright install chromium        # once per machine (into ~/Library/Caches/ms-playwright)
bunx playwright test                    # all three projects
bunx playwright test --project companion
bunx playwright test --ui               # watch mode with a browser
```

Conventions: specs are `e2e/<project>/<journey>.spec.ts`; shared helpers go
in `e2e/support/`. Check every page for console errors
(`collectErrors(page)` from `e2e/support/console.ts`). `@axe-core/playwright`
is installed for accessibility checks
(`new AxeBuilder({ page }).analyze()`). Assert on visible text from
`@ihsaanly/core/strings/en` rather than copying strings.

### Sync across devices (later)

Cross-device sync runs against the Firebase emulators
(`bun run dev:cloud`, `packages/cloud/firebase.json`). An e2e sync suite
would start them as another `webServer` entry, build the companion and
extension against the emulator config, and drive two browser contexts as two
devices signed in to the same emulator account.

## End-to-end: mobile (Maestro)

See [`e2e/mobile/README.md`](../e2e/mobile/README.md): install Maestro for
your user, start a development build on a simulator, then
`maestro test e2e/mobile/flows`.
