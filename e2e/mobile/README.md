# Mobile end-to-end flows (Maestro)

Flows for the Expo app in `apps/mobile`, written for
[Maestro](https://maestro.mobile.dev). They are not run in CI yet.

## Install

Maestro is a standalone CLI (it needs a JDK 17+ on the PATH). Install it for
your user only:

```sh
curl -Ls "https://get.maestro.mobile.dev" | bash   # installs to ~/.maestro
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version
```

Nothing in this repo installs it for you.

## Run

1. Build and start a development build on a simulator or emulator:
   `bun run --cwd apps/mobile ios` (or `android`). Its app id is
   `app.ihsaanly.companion.development`.
2. Run one flow, or the folder:

   ```sh
   maestro test e2e/mobile/flows/onboarding-welcome.yaml
   maestro test e2e/mobile/flows
   # another variant
   maestro test -e APP_ID=app.ihsaanly.companion e2e/mobile/flows
   ```

`maestro studio` opens an inspector for finding selectors.

## Writing flows

- One user journey per file in `flows/`, named for what it proves
  (`onboarding-welcome.yaml`, `mark-prayer.yaml`).
- Start with `launchApp: { clearState: true }` so a flow never depends on
  another's leftovers.
- Assert on what a person sees: the English strings in
  `packages/core/src/strings/en.ts`, or an `accessibilityLabel`/`testID`
  (`id:` in Maestro) when text is ambiguous.
- Shared steps go in `flows/common/*.yaml` and are pulled in with
  `runFlow: common/<name>.yaml`.
