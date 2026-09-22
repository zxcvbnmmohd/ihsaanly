# App Release Audit — Ihsaanly

Audited 2026-09-20 against branch `t1-three-tab-shell` (commit `086f910`). Every finding
below was checked against the source; nothing is inferred from the README (which is
stale, see P1). Deliberate decisions recorded in `AGENTS.md` are not re-litigated here.

Owner tags: **AI** = can be done in the repo. **Human** = needs your accounts, artwork,
decisions, hardware or people. **Mixed** = AI does the wiring once you supply the input.

## App Overview

- **Purpose:** Offline-first "contextual Sunnah companion". Tells the user which sunnah,
  dua or adhkar is relevant right now (prayer windows, calendar days, leaving home),
  with a hadith citation, grading and grader on every item. No prayer clock times by
  design. No accounts, no server, no analytics.
- **Target users:** Adults new to or returning to Islamic practice (primary); regular
  prayers who do little else (secondary). Explicitly not children or families.
- **Platforms:** iOS and Android via Expo SDK 58 (preview) / React Native 0.88 RC, Expo
  Router, NativeWind v5 RC, SQLite. Development build required (not Expo Go).
- **Major features (all present in code):** six-step onboarding; Today plan; Library with
  search and filters; item detail with Done/counter/share/memorise; prayer marking and
  qada; Hijri date with offset; local reminders with shade actions; travel/pause; manual
  and geofenced events; history; export/import/diagnostics; About; Delete my data;
  English + Arabic UI with RTL; iOS widgets (placeholder, see P1).
- **Current state:** `bun run check` is fully green: lint clean, typecheck clean, 180
  tests pass, content validates, `expo-doctor` 20/20. On Expo SDK 58 preview.4, React
  Native 0.88.0-rc.1, React 19.3.0. Both platforms build and run: Android on an emulator,
  iOS on the simulator.
- **Overall release status:** **Not submittable yet, but the code side is close.** The
  icon, splash, adaptive and notification icons, `eas.json`, the diagnostics preview, the
  donation row and the rewritten legal documents are all in. What blocks submission is now
  almost entirely outside the repository: the Apple and Google accounts, hosting for the
  two legal pages, a scholar's review of the 32 content items, and a donation domain that
  resolves.

> Updated 2026-09-21. Ticked items were verified, most of them on an Android emulator.

---

# Release Summary

| Priority       | Done | Open | Total |
| -------------- | ---: | ---: | ----: |
| P0 Blockers    |    8 |    4 |    12 |
| P1 Must Have   |   21 |   12 |    33 |
| P2 Should Have |   25 |   11 |    36 |
| P3 Could Have  |    8 |    5 |    13 |
| P4 Future      |    1 |    6 |     7 |

---

# 🚨 P0 — BLOCKERS

## AI / LLM Can Do

- [x] **P0 — AI** `app.json` — no `icon`, no `android.adaptiveIcon`, no splash config.
      **Done.** `scripts/build-brand-assets.ts` draws the eight-point star from
      `onboarding-art.tsx` and the palette hexes, and emits the icon (opaque, no alpha),
      the adaptive foreground, the Android 13 monochrome icon, the splash mark and a
      96px notification glyph. Wired into `app.json` with `expo-splash-screen`. Verified
      in the generated `android/app/src/main/res`. Outline variant chosen by the user.
      Original note follows:
      Confirmed: `grep icon app.json` is empty; `assets/images/README.md:8` says `logo.png`
      is an unreferenced template leftover. A build today ships Expo's default icon and
      splash drawable. Add `expo.icon`, `android.adaptiveIcon.{foregroundImage,backgroundColor}`,
      and the `expo-splash-screen` plugin once artwork exists (Human item below).
- [x] **P0 — AI** `app.json:13` `UIBackgroundModes: ["location", "audio"]` — `"audio"` is
      unjustified. No `setAudioModeAsync`/`staysActiveInBackground` anywhere in `src/`;
      every `audio` field in `content/items.json` is `null`. Apple rejects declared
      background modes with no visible functionality. Remove `"audio"` until recitations ship.
      Keep `"location"` only if the geofence feature ships on iOS (see Human decision).
- [x] **P0 — AI** `eas.json` does not exist. Create `development` (dev client),
      `preview` (internal distribution) and `production` profiles with
      `autoIncrement: true` on the production profile, plus a `submit` section. Needs the
      Human `eas init` first for `extra.eas.projectId`.
- [x] **P0 — AI** `docs/legal/privacy-policy.md` contradicted the code in two places, and
      under-disclosed in a third. **All three resolved**, and the policy has been rewritten
      to match what ships: it now lists every stored category including gender and the home
      region, describes the preview screen as built, and describes the donation. What the
      two original contradictions were:
  - Diagnostic preview: **built**. `src/app/(more)/diagnostics.tsx` and
    `src/screens/diagnostics.tsx` now show what the bundle contains, with the raw JSON
    behind a tap, and send the same object they displayed. Coordinates are rounded to
    three decimals in `buildDiagnostics()`, so "approximate" is true of what is sent.
    The policy text still needs rewriting to match.
  - Payments: **resolved**. The app is free with nothing locked. The policy now describes
    one optional donation that unlocks nothing, opening `donate.ihsaanly.com` in the
    browser on Android. iOS uses a purchase instead and is not built yet, waiting on the
    Apple account.
- [x] **P0 — AI** Reviewer and grader claims. **Done.** `docs/legal/support.md` now says
      the reviewer is credited once they have approved, and that the About screen says
      "awaiting review" until then. `MARKETING.md` carries the same gate as an explicit
      launch prerequisite. "Source, grading and grader" reworded in both: 28 of 32
      evidence entries have `gradedBy: null`, correctly, because Bukhari and Muslim carry
      their own grading.

## Human Must Do

- [ ] **P0 — Human** Apple Developer Program membership and Google Play Console account.
      Then run `bunx eas-cli init` to create the EAS project (writes `extra.eas.projectId`).
      Also unblocks the App Group entitlement `group.com.ihsaanly.app` that
      `src/storage/database.ts:4-11` is waiting on (`SHARED_CONTAINER_ENABLED = false`).
- [x] **P0 — Human** App icon artwork. Superseded: generated in-repo from the app's own
      motif and approved by the user. Replacing it later with designer artwork is a file
      swap plus one rerun of the script.
- [x] **P0 — Human** Support email address. `support@ihsaanly.com`, now in both legal
      documents. The mailbox must actually receive mail before submission.
- [ ] **P0 — Human** Host the privacy policy and support page. **Prepared:** `docs/_config.yml`
      publishes only `legal/`, holding back `PRD.md` and `SPEC.md`, and `docs/index.md`
      links to both. Enable Pages on the repo, serving from `main` and `/docs`. Since you
      own `ihsaanly.com`, a custom domain reads better than the github.io address; that is
      a `CNAME` file and a DNS record when you want it.
- [ ] **P0 — Human** Content review. `content/items.json` has `reviewedBy: null` and all
      32 items `reviewed: false`; `bun run validate:content` warns on every build. The
      project's own release policy (`CHANGELOG.md`, `MARKETING.md` prerequisite 1) blocks
      shipping unreviewed religious content. A named, qualified reviewer must sign off and
      consent to being credited. Flipping `reviewed` is the reviewer's act, per `AGENTS.md`.
- [x] **P0 — Human** Decide the Android background-location question. The
      `expo-location` plugin has `isAndroidBackgroundLocationEnabled: true`, so the manifest
      carries `ACCESS_BACKGROUND_LOCATION`. Play requires a permission declaration form and
      a demo video for that permission, and reviews it manually, even though the feature
      (`detectHome`, `src/events/store.ts:15`) is off by default. Options: (a) keep it and
      budget for the Play declaration; (b) set the flag to `false` and hide "Detect home" on
      Android for v1 (AI can do the code side). **Decided: (a), keep it.** No code changed.
      The Play declaration and its demo video remain to be done, tracked under P1 Human.

---

# 🔴 P1 — MUST HAVE

## AI / LLM Can Do

- [x] **P1 — AI** Bug, reported and reproduced on iOS: choosing Arabic does not switch the
      layout to right-to-left. **Fixed by telling the truth rather than pretending.**
      `chooseLanguage` now returns whether the change needs the app reopened, which is iOS
      only, and `src/app/(more)/language.tsx` shows an alert saying so. Android still
      reloads itself. The half-turned screen you saw — content in English, navigation bar
      still mirrored — came from a JavaScript reload that cannot move UIKit's layout
      direction. `ios/Ihsaanly/Info.plist` still declares no `CFBundleLocalizations`; adding
      `ar` is worth doing separately. Text stays left-aligned and the tab bar does not mirror.
      **Diagnosed:** the native mechanism is fine. Writing `RCTI18nUtil_allowRTL` and
      `RCTI18nUtil_forceRTL` and then launching the app cold gives a correct, fully mirrored
      Arabic layout on the simulator. What fails is the path in `src/i18n/store.ts`:
      `chooseLanguage` sets the flags and then calls `reloadAppAsync`, which reloads
      JavaScript but does not relaunch the process. UIKit reads layout direction when the
      app starts, so a JS reload cannot change it. Android is unaffected because the theme
      and language paths recreate the activity there.
      Fix needs a decision, since an app cannot restart itself on iOS: either tell the user
      plainly that Arabic applies next time the app is opened, or apply the direction at the
      next cold start the way `modules/theme-override` already does for the theme.
      Note also that `ios/Ihsaanly/Info.plist` declares no `CFBundleLocalizations`, so iOS
      considers the app English-only; worth adding `ar` regardless of which fix is chosen.
- [x] **P1 — AI** Bug, reported on iOS: the large navigation title does not collapse on
      scroll. Two causes, both now removed. First, `src/theme/stack.ts` set
      `headerTransparent: true`, which places the header outside the layout so the scroll
      view was never inset by it. Second, and confirmed by your screenshot after the first
      fix, every washed screen rendered `<View><Wash /><Screen /></View>`: UIKit finds the
      scroll view a large title collapses against by walking first subviews from the
      screen's root, and the absolutely positioned gradient came first, so it never found
      one (expo-router's own Stack docs: the scrollable "should be the direct first child of
      the screen component"). `Screen` now takes the `palette` and renders the gradient
      as the container around the scroll view, so the scroll view is the root's first and
      only child. `src/components/wash.tsx` is deleted. Follows the documented fix exactly,
      but the collapse itself still cannot be exercised here (no scroll on the simulator),
      so **please scroll Today on iOS once more.**

- [x] **P1 — AI** Bug, found on iOS: Today asked for the notification permission by itself.
      `useNotificationSync` called `ensurePermission`, which _requests_ rather than checks,
      so anyone who skipped the reminders step during onboarding was prompted simply by
      opening the app. That is the exact silent ask `CHANGELOG.md` says was removed when the
      prompt moved to the "Allow reminders" button. `src/notifications/schedule.ts` now also
      exports `hasPermission`, which checks and never asks, and the background sync uses it.
      Requesting stays with the two buttons the user actually presses. Channels and the
      action category are now declared only once permission exists, rather than on behalf of
      a decision not yet made.

- [x] **P1 — AI** Two faults in the shared location request, found while rebuilding Today's
      empty state and reproduced in onboarding. `src/location/device.ts` now:
  - Races a 12 second timeout. `getCurrentPositionAsync` has none of its own, so a fix
    that never arrived left the button on "Finding you" forever, with no way out but the
    city search.
  - Asks `getLastKnownPositionAsync` first, accepting a fix up to an hour old, and only
    requests a fresh one at `Accuracy.Low` when there is none. A phone almost always has
    a recent fix, so the common case is now instant, with no GPS wake-up, and "rough
    location" becomes true of the request and not just of what is stored.
- [x] Not a bug: "Use my location" failing on the Android emulator. Verified 2026-09-21
      that this emulator cannot produce a position at all — its GPS provider reports
      `ProviderRequest[OFF]`, the only cached fix is stale from boot, and `geo fix` through
      the authenticated console is accepted but never changes it. Both screens handle it
      correctly, naming the failure and offering the city search. Confirm the happy path on
      a physical device.
- [x] **P1 — Mixed** SDK drift. **Done, and it was not optional.** iOS would not launch at
      all: `@expo/ui` 58.0.3 referenced a symbol that `expo` preview.2's `ExpoModulesCore`
      did not export, so dyld killed the app at startup. `npx expo install --fix` took the
      project to `expo` preview.4, `react-native` 0.88.0-rc.1, `react` 19.3.0 and 24 other
      packages, followed by a clean `node_modules` reinstall that `expo-doctor` asked for.
      Doctor is 20/20 again, all 180 tests pass, and both platforms build.

- [x] **P1 — AI** `app.json` — add `ios.config.usesNonExemptEncryption: false`. Corrected:
      the SDK 58 docs bless `ios.config`, not the raw `ios.infoPlist` key this audit first
      named.
      The app makes zero network calls (no `fetch`/`XMLHttpRequest`/`http` in `src/` or
      `content/`), so `false` is correct. Without it every App Store Connect upload stalls
      on the export-compliance question.
- [x] **P1 — AI** Build numbers. Withdrawn as first written: `eas.json` now sets
      `cli.appVersionSource: "remote"`, the mode the docs recommend since EAS CLI 12, so
      EAS owns `ios.buildNumber` and `android.versionCode` and they must **not** be set in
      `app.json`. The production profile carries `autoIncrement`.
- [x] **P1 — AI** `src/storage/database.ts:49-51` — `openDatabaseSync` and `migrate()` run
      at module scope with no `try/catch`, and are reached from `src/app/_layout.tsx:25`
      (`applyThemePreference(getThemePreference())`) before the exported `ErrorBoundary`
      exists. A failed open or migration is a white-screen crash with no message. Wrap it,
      or at minimum surface the error through `lastStorageError()`. **Done:** a failed open
      or migration now falls back to an in-memory database, so the app opens and works and
      only forgets, and the reason rides in the diagnostic report via `lastDatabaseError()`.
- [x] **P1 — AI** `src/storage/preferences.ts:13` — `JSON.parse(row.value)` is unguarded
      in the same eager import chain. A corrupt row crashes launch. Wrap in try/catch and
      return `null` (the `attempt()` helper in `src/storage/events.ts:33-38` is the pattern).
- [x] **P1 — AI** `src/app/(more)/data.tsx:29-38` — `runImport()` has no `.catch()`. If
      `new File(asset.uri).textSync()` throws (unreadable URI, huge file), the rejection is
      unhandled and the user sees nothing. Add `.catch(() => say(strings.data.importFailed))`
      and reject files above a few MB before reading them. **Done:** an 8 MB cap checked
      before the file is opened, and a `.catch` that reports the failure.
- [ ] **P1 — AI** SDK drift again, noticed 2026-09-22 and **not acted on**: `expo` moved to
      `58.0.0-preview.5` overnight and seventeen packages now want a patch bump, so
      `bun run check` fails at `expo-doctor` while lint, typecheck and all 180 tests stay
      green. This is upstream movement on a preview SDK, not a defect in this repo, and both
      dev builds run correctly on preview.4. Taking it means `npx expo install --fix`, which
      changes native module versions and therefore invalidates the installed dev builds on
      both platforms — a prebuild and two rebuilds, on a machine with about 4 GB free.
      Decide deliberately: chase it now, or pin it and take one bump immediately before the
      first store build. Whichever, do not hand-edit the versions.
- [ ] **P1 — AI** Widgets are static placeholders. `src/widgets/right-now-widget.tsx:28-31`
      and `quick-duas-widget.tsx:33-36` render fixed props (`title: 'Open Ihsaanly'`,
      `titles: []`). `src/widgets/snapshot.ios.ts` writes `today.json` but no widget reads it
      (`grep today.json src/widgets/*.tsx` is empty). Either wire the widgets to the snapshot
      once the App Group exists, or remove the `expo-widgets` plugin entry from `app.json`
      for v1 so reviewers do not see a widget that never changes. Recommended: remove for v1.
- [x] **P1 — AI** `README.md` is the template README. It describes `(settings)/`,
      `counter-widget.tsx`, `delivery-activity.tsx` and a "Start delivery" Live Activity,
      none of which exist. Rewrite to describe the real app, scripts and `AGENTS.md` pointer.
- [x] **P1 — AI** `src/components/row.tsx:49,54` — `Row`, the most reused tappable in
      the app (More, Data, Events, Hijri, Location, Notifications, Item, Today), has no
      `accessibilityRole`. VoiceOver/TalkBack will not announce it as actionable. Add
      `accessibilityRole={href ? 'link' : 'button'}`. Every other Pressable already has one.
      **Done**, plus two things the fix exposed: `accessibilityState` now carries `selected`,
      and a row with neither destination nor handler renders as plain text rather than
      announcing itself as a button, which is most of the About and diagnostics rows.
- [x] **P1 — AI** `src/screens/location.tsx:13-23` — `LocationScreenProps` has no
      `locating` state, so "Use device location" on the settings screen gives no feedback
      while the GPS promise resolves, and a `declined` result has no path to Settings
      (unlike `src/screens/notifications.tsx:105-112`). Mirror the onboarding `PlaceCard`
      pattern and add an Open Settings row.
- [x] **P1 — AI** `expo-audio` plugin defaults add `RECORD_AUDIO` and
      `MODIFY_AUDIO_SETTINGS` to the Android manifest (confirmed in the generated manifest)
      though the app never records. Check the SDK 58 `expo-audio` plugin options in
      `https://docs.expo.dev/versions/v58.0.0/sdk/audio/` for a way to omit the microphone
      permission; if none, remove `expo-audio` until recitations exist. An unused mic
      permission draws Play Data Safety scrutiny. **Done:** the plugin now takes
      `recordAudioAndroid: false` and `microphonePermission: false`, which the SDK 58 docs
      give as the way to omit it. Background recording and playback are off too.
- [x] **P1 — AI** No CI. Add `.github/workflows/check.yml` running `bun install
--frozen-lockfile` and `bun run check` on pull requests and pushes to `main`. All
      five steps run locally in about two minutes; no EAS credentials needed. **Done:**
      `.github/workflows/check.yml`, with `packageManager` added to `package.json` so CI and
      local cannot drift on the Bun version.
- [x] **P1 — AI** Tests for the three load-bearing untested modules: `src/prayer/marks.ts`
      (`rollover` with `paused`, the "never backfills a debt" rule), `src/plan/completions.ts`
      (one completion per occasion, the rule `AGENTS.md` says was wrong once), and the pure
      diff inside `sync()` in `src/notifications/schedule.ts:154-181` (prefix-scoped
      cancel/add). Each is a documented invariant with no regression guard.
- [x] **P1 — AI** `src/screens/fixtures.ts` — five screens have no fixture, violating
      the rule in `AGENTS.md`: `DataScreenProps`, `EventsScreenProps`, `HistoryScreenProps`,
      `LanguageScreenProps`, `MemoriseScreenProps`. **Done**, all five.
- [x] **P1 — AI** Bug, seen on device: Today and the Hijri screen disagree on the date.
      At 22:47 London time Today showed "9 Rabi' ath-Thani" and More → Hijri date showed
      "10". `src/plan/use-plan.ts:44` builds `hijri` from the civil date;
      `src/hijri/use-hijri-date.ts` shifts at Maghrib via `hijriDay()`. Pick one boundary
      for the header (the spec says Maghrib) and use it in both places. **Done:** the
      computation moved to a pure `src/plan/day-context.ts`, which takes today's Maghrib and
      shifts the Hijri date there while leaving the civil day on midnight. Five regression
      tests in `day-context.test.ts` pin the behaviour that shipped wrong.
- [x] **P1 — AI** Bug: stray "المكتبة" label in the status-bar area in Arabic. **Gone**,
      fixed upstream rather than here: it no longer reproduces after the SDK realignment,
      which moved `expo-router` and `react-native-screens`. Verified 2026-09-21 two ways on
      the rebuilt app, both after choosing Arabic during onboarding and after switching
      language at runtime: a pixel crop of the status-bar band is empty, and a
      `uiautomator` dump finds the Library label only in the tab bar.
- [ ] **P1 — AI** Bug: Appearance Dark → System leaves the app dark under a light system.
      Still open, but now diagnosed precisely rather than guessed at. Confirmed on the
      rebuilt app: system night mode `no`, stored preference `system`, app dark. A JS reload
      alone turns it light, so **the native side is already correct and the JavaScript
      colour-scheme cache is the stale part**. The cause is in
      `node_modules/react-native/Libraries/Utilities/Appearance.js`: `setColorScheme('auto')`
      immediately caches `NativeAppearance.getColorScheme()`, and on Android that call
      happens before `AppCompatDelegate` has recreated the activity, so it stores the
      outgoing scheme. No change event follows, because from the OS's point of view the
      system scheme never changed — only the app's own override did.
      Tried and reverted: re-applying the preference from a mount effect in
      `src/app/_layout.tsx`. It does not fire, so the React root is not remounting on the
      activity recreation. Recommended next: give `modules/theme-override` a getter for the
      effective night mode and read that in `useEffectiveColorScheme` instead of trusting
      RN's cache. That is a native change, so it needs a prebuild and a rebuild.
- [x] **P1 — AI** `app.json` `name` is `"ihsaanly"`, so the launcher, permission dialogs and
      the notification shade all show a lowercase name. Set `"Ihsaanly"`.
- [x] **P1 — AI** `expo-notifications` plugin has no `icon` or `color`, so the shade shows
      Android's default template icon (seen with the test reminder). Add a monochrome
      notification icon and the accent colour to the plugin entry in `app.json`.

## Human Must Do

- [ ] **P1 — Human** Arabic UI review. `src/strings/ar.ts` and the `ar` fields in
      `content/items.json` and `content/glossary.json` are a one-pass draft, unreviewed by a
      qualified speaker. `AGENTS.md` calls this a release condition. Either get the review
      or ship English-only for v1 (AI can hide Arabic from the language picker).
- [ ] **P1 — Human** App Store privacy labels. Per `MARKETING.md` and the code: "Data Not
      Collected" for everything automatic, plus disclosure that a user-initiated diagnostic
      report contains approximate location and religious-practice data. Human/legal
      verification required for the exact label choice.
- [ ] **P1 — Human** Google Play Data Safety form. Same disclosure. If background
      location is kept, complete the sensitive-permission declaration and record the demo
      video.
- [ ] **P1 — Human** Store metadata: title, subtitle ("Sunnah, with its source" is
      drafted in `MARKETING.md`), description, keywords, category (Lifestyle per
      `MARKETING.md`), age rating questionnaire, screenshots for each required device size.
- [ ] **P1 — Human** Real-device test pass on one iPhone and one Android phone covering:
      onboarding with location declined, reminder delivery with the app killed, shade
      actions Done/Later, Delete my data, theme switch on Android, Arabic RTL reload.
- [ ] **P1 — Human** Confirm translation sources. `content/items.json` has
      `translationSources: {en: null, ar: null}` and the validator warns "no translation
      source named". Name the source or confirm the translations are original.
- [ ] **P1 — Human** Confirm `Sahih Muslim 1162` — the validator flags it as cited with
      two different narrations. Content reviewer to check.

---

# 🟠 P2 — SHOULD HAVE

## AI / LLM Can Do

- [x] **P2 — AI** Android chrome was Material grey against a warm app (your side-by-side,
      2026-09-22). The top app bar, the tab bar, the tab indicator, the press ripple and
      every off-state switch came from Material 3's dynamic palette, which on this device is
      derived from a lavender wallpaper — so the app's own chrome was a different colour
      from the app. **Done:** the header and tab bar take `palette.wash[0]`, the top of the
      gradient, so bar and screen read as one surface; the indicator and ripple take a new
      `palette.indicator`, a 16% tint of the accent rather than the accent itself, because
      filling the Material pill solid swallows the icon inside it; and `SwitchRow` now
      passes both knob and off-track (`palette.wash[1]`) rather than leaving either to
      Material. `backgroundColor` is passed on Android only — iOS 26 draws its own tab bar
      and older iOS would lose its blur. Verified on the emulator in light and dark.
      Still the platform's own bars, shapes and behaviour; only the paint changed.
- [ ] **P2 — Mixed** iOS declares a `fetch` background mode that nothing uses. It is not in
      `app.json`: `expo-task-manager`'s config plugin appends it unconditionally, with no
      option to opt out (`node_modules/expo-task-manager/plugin/src/withTaskManager.ts`).
      By the same standard that removed `"audio"`, it should go. Region monitoring wakes the
      app through the `location` mode rather than background fetch, and nothing here uses
      `BGAppRefreshTask`, so stripping it in a small local plugin beside
      `plugins/with-android-manifest.js` looks safe. Flagged rather than done, because iOS
      background geofencing cannot be exercised on a simulator and silently breaking it
      would be hard to notice.

- [x] **P2 — AI** Today's empty state was one "Location · Not set" row that sent people to
      settings to find the permission. It now asks where the user already is: the star
      motif, a plain line on what location unlocks and that it never leaves the phone, a
      primary "Use my location" that prompts directly, and "Choose a city instead" for
      anyone who declines. Declined and unavailable are both named rather than silent.
      Verified on device, including the decline and timeout paths.

- [x] **P2 — AI** `src/location/cities.ts:1` — `import { cityMapping } from 'city-timezones'`
      eagerly parses a 1.9 MB JSON (`node_modules/city-timezones/data/cityMap.json`) on
      every cold start, because `_layout.tsx:11` imports `OnboardingFlow` unconditionally.
      Lazy-load it inside `searchCities` (or only when onboarding is incomplete). This is
      the single largest startup and bundle cost in the app.
      **Done 2026-09-22:** `searchCities` requires the table on the first keystroke and caches it in a
      module-level variable, so a launch that never opens a search field never parses it.
      `require` rather than `import()` because the call happens during render.
- [x] **P2 — AI** `src/components/screen.tsx:15-23` — the shared `ScrollView` lacks
      `keyboardShouldPersistTaps="handled"`, so on Library and Location the first tap on a
      search result only dismisses the keyboard. Onboarding already sets it
      (`onboarding.tsx:676-679`).
      **Done 2026-09-22:** `keyboardShouldPersistTaps="handled"` on the shared ScrollView, so one tap selects.
- [x] **P2 — AI** `src/app/(more)/events.tsx:24-29` — `setHome()` silently returns when
      no place is set. Disable the row or show a message pointing to Location.
      **Done 2026-09-22:** with no place set the row becomes a link to Location reading "Set where you are
      first"; the route's guard is now only type narrowing. Turning detect-home on with no
      home also says so, which it did not before.
- [x] **P2 — AI** `src/components/chip.tsx:18-29` — `px-3 py-2 text-sm` gives roughly a
      36pt tall target with no `hitSlop`. Used for language, theme and Library filters.
      Add `hitSlop` or padding to reach 44pt.
      **Done 2026-09-22:** `hitSlop={6}` carries the ~36pt pill to the 44pt minimum without making a row of
      them look heavy.
- [x] **P2 — AI** Dead exports: `termById` and `termForRuling` in
      `src/content/glossary.ts:9,14` (only used by their own test), `contentLanguage()` in
      `src/content/index.ts:23`. Delete or wire in.
      **Done 2026-09-22:** `contentLanguage()` deleted outright. `termById` and `termForRuling` deleted too,
      but the glossary test they served is the one AGENTS.md requires ("defines every
      `Ruling` value by id"), so it now looks the ids up in `terms` directly — the guarantee
      is kept and the production bundle carries no dead code.
- [x] **P2 — AI** Delete `assets/images/logo.png` and `assets/images/background-grid.png`
      (documented as unused template leftovers) once real icon artwork exists, and update
      `assets/images/README.md`.
      **Done 2026-09-22:** both deleted and `assets/images/README.md` says so rather than listing them as
      unused.
- [ ] **P2 — AI** `@expo/material-symbols` has no import in `src/` and expo-router's
      NativeTabs types its `md=` icons against `expo-symbols`. Build for Android without it;
      if the tab icons still render, remove it.
- [x] **P2 — AI** `src/prayer/marks.ts:141` — the only `console.warn` in the app is not
      `__DEV__`-guarded. Guard it or route it into `lastStorageError()` so it reaches the
      diagnostic bundle instead of the console.
      **Done 2026-09-22:** routed into the diagnostic bundle instead of guarded. `src/storage/events.ts`
      exports `noteFailure`, which `attempt` now also uses, so a rollover failure reaches
      `lastStorageError()` — on an installed app nobody is reading a console line.
- [x] **P2 — AI** `src/data/export.ts:61-62` — the shared JSON (coordinates plus full
      practice record) is left in `Paths.cache` after sharing. Delete the file after
      `shareAsync` resolves.
      **Done 2026-09-22:** the write is wrapped in try/finally and the file is deleted once the share sheet
      returns, so coordinates and the practice record do not sit in the cache.
- [x] **P2 — AI** `src/screens/today.tsx` — when location is set but nothing else is
      enabled and there is no suggestion, the screen shows only the header and prayer strip
      with no "nothing else today" line. Add one sentence via `useStrings()`.
      **Done 2026-09-22:** a `nothingElse` flag covers every empty section at once and renders one sentence,
      `today.nothingElse`, in both languages.
- [ ] **P2 — AI** `src/screens/about.tsx` — "Licences" and "Privacy" are inline
      paragraphs with no link. Once the policy is hosted, link to it, and link Amiri's OFL
      (`assets/fonts/OFL-Amiri.txt`) and Natural Earth attribution. No `Linking.openURL`
      exists in the app today, so this is new surface: allow-list the two URLs.
- [x] **P2 — AI** `eslint.config.js` uses the non-type-aware `tseslint` config, so
      `@typescript-eslint/no-floating-promises` is not on. The one floating promise found
      (`data.tsx:29`) would have been caught. Enable the type-checked config for `src/`.
      **Done 2026-09-22, and it earned its keep immediately.** Type-aware rules are on for
      `src/**` only, so `eslint .` does not pay to type-check files `tsconfig` does not
      include; `bun run lint` went from about two seconds to six. Four rules:
      `no-floating-promises`, `await-thenable`, `no-misused-promises` (with
      `checksVoidReturn: false`, since a void-returning prop given an async handler is the
      ordinary React shape) and `no-unnecessary-type-assertion`.
      It found three real defects on the first run, all of them silent failures:
      `expo-file-system`'s `File.write()` returns a promise, and neither caller awaited it —
      the share sheet could open on a file that was still being written, and the widget
      snapshot's write could reject past a `try/catch` that only ever guarded the
      synchronous part. `AccessibilityInfo.isReduceTransparencyEnabled()` had no rejection
      handler. All three fixed; `writeSnapshot` returns its promise now.
      `require-await` is deliberately **not** enabled: `TaskManagerTaskExecutor` and
      expo-notifications' `handleNotification` both require a Promise-returning function
      with nothing to await, so the rule fires on correct code and the fix it asks for does
      not typecheck. The reason is in `eslint.config.js` so it is not re-litigated.
- [x] **P2 — AI** `bun audit` reports two moderate transitive advisories:
      `decode-uri-component@0.2.2` via `expo-router > query-string` (DoS on malformed
      percent-encoding; only local deep links reach it) and `uuid@7.0.3` via
      `@expo/config-plugins > xcode` (build-time only). Neither is exploitable here. Re-run
      `bun audit` after each `npx expo install --fix` and note the result in the PR.
      **Done, re-run after the preview.4 upgrade on 2026-09-21: unchanged.** Both are still
      moderate and neither is reachable at runtime. `decode-uri-component` sits under
      `expo-router`'s query parsing, which only ever sees the app's own deep links, and
      `uuid` is a build-time dependency of the Xcode config plugins. Re-run at submission.
- [x] **P2 — AI** Add `.github/dependabot.yml` for GitHub Actions only. Do not enable it
      for npm: `AGENTS.md` pins `nativewind`, `react-native-css` and `lightningcss` exactly
      and requires `npx expo install --fix` for Expo packages.
      **Done 2026-09-22:** monthly, `github-actions` only, with the reason npm is excluded in the file itself.
- [ ] **P2 — AI** `CHANGELOG.md` — add a `## [1.0.0]` heading when the first store build
      is cut, and record `app.json` version/build alongside.
- [x] **P2 — AI** GitHub issues #2–#9, #11, #12, #15, #17 are fully implemented (see the
      issue table below) but still open. Close them with a comment pointing at the commit.
      **Done 2026-09-22:** all twelve closed as completed, each with a comment naming the
      implementing commit, where the code lives now, and what has moved since. Two carry an
      honest caveat rather than a clean claim: #5 (device GPS never exercised on real
      hardware) and #15 (geofence accuracy likewise), both routed to the real-device pass in
      #22. Ten issues remain open: #1 (the epic), #10, #13, #14, #16, #18, #19, #20, #21, #22.
- [x] **P2 — AI** Android cards read as grey next to the iOS ones (your side-by-side,
      2026-09-21). `Surface`'s Android fallback used Material's `surfaceContainer`, a
      neutral tonal grey that fights the warm wash. `Palette` gains `surface`, a
      translucent warm veil (light `rgba(255,250,246,0.78)`, dark `rgba(255,246,240,0.08)`),
      and Android and web cards use it so the wash shows through, the way the iOS material
      does. Reduce Transparency still gets the solid system fill. Still the platform's own
      shapes, type and colours everywhere else; only the card fill changed.
- [x] **P2 — AI** Search moved into the platform's own search bar (asked 2026-09-21,
      settled 2026-09-22). Library's in-content text field is gone. Library and More each
      render one `Stack.SearchBar`, opened from a button in the app bar on both platforms:
      Material's search action on Android (verified on the emulator: icon, expansion, live
      filtering) and, on iOS 26+, `placement="integratedButton"` with
      `allowToolbarIntegration={false}`, a magnifier in the navigation bar that expands into
      the field when pressed and never enters a bottom toolbar. Older iOS shows an inline
      field. More's rows moved to `src/more/rows.ts` (`useMoreGroups`, `filterGroups`) so they
      can be filtered; `MoreScreen` is data-driven. Found on the way: Android's `SearchView`
      reports `null` text on mount and on close although the type says `string`, so both
      routes coalesce to `''`; without that More crashed on open.
      Tried and rejected on the way: (1) `Stack.Toolbar placement="bottom"` +
      `SearchBarSlot`, which draws the glass field on top of the tab bar; (2) a
      `role="search"` tab, the Apple pattern, which is a tab on every screen and, built with
      Xcode 27, renders inside the bar rather than as the detached pill
      (react-native-screens#4671, fix in draft PR #4679). `eas.json` keeps the
      `macos-tahoe-26.5-xcode-26.6` image pin on `preview` and `production` as a harmless
      guard; it can go whenever.
- [x] **P2 — AI** Wash is inconsistent across stacked screens (seen on device). Today,
      Library, More, Glossary, About and To make up carry the warm gradient; Item,
      Memorise, Appearance, Calculation, Location, Reminders, Hijri, Tracking, Where you
      are, Language, History and Your data are flat grey. Pick one rule and apply it in
      `src/screens/*`.
      **Done 2026-09-22:** one rule, applied: every screen carries it. Cheap now that `Screen` owns the
      gradient — 13 screens gained `palette={palette}` and four of them a `usePalette()`
      call. Verified on the emulator: "Where you are" now reads as part of the same app.
- [x] **P2 — AI** `src/app/(more)/index.tsx:48` — when neither travelling nor paused, the
      More row reads "Tracking / Tracking" because the detail falls back to the title.
      Show "Active" (new string) or no detail.
      **Done 2026-09-22:** shows "Active" (new `tracking.active` string, both languages). The row itself moved
      to `src/more/rows.ts` when More became data-driven.
- [x] **P2 — AI** `src/screens/events.tsx:35-46,57-63` — "Notice when I leave home" and the
      manual events use `Row selected=` as toggles, so the off state has no affordance
      and the row does not look tappable. Use `SwitchRow` as the Tracking screen does.
      Turning detect-home on with no home set also gives no feedback.
      **Done 2026-09-22:** both use `SwitchRow` now, branded with the palette, so the off state has an
      affordance. Verified on the emulator.
- [x] **P2 — AI** Onboarding location step: after picking a city the search field keeps
      focus and the keyboard stays up over the place card (`src/screens/onboarding.tsx`
      location step). Blur the field on selection.
      **Done 2026-09-22:** `Keyboard.dismiss()` on selection, so the place card the tap just revealed is not
      hidden behind the keyboard.
- [x] **P2 — AI** `src/components/counter.tsx` — "Start again" appears only after the
      first tap, shifting the Done button down mid-interaction. Reserve the space or
      render it disabled at zero.
      **Done 2026-09-22:** the reset button stays mounted and goes to `opacity: 0` with pointer events off
      and hidden from screen readers, so Done never moves mid-count.
- [x] **P2 — Mixed** Product question, seen on device: at 22:47 "Right now" showed
      "Two rak'ah before Fajr", six hours early, because `src/plan/plan.ts` assigned a
      prayer's `before` item to the whole preceding window (night, for Fajr).
      **Fixed 2026-09-22 by narrowing the rule, not the copy.** A `before` item is now
      relevant during that prayer's _own_ window while the prayer is unmarked, which is
      when the rawatib are actually prayed — once the time has entered, between the adhan
      and the iqamah. That also removes an inconsistency nobody had noticed: `prayer: 'any'`
      (siwak) has always used the current window, so the two kinds of `before` behaved
      differently. `PRECEDING_WINDOW` is deleted; nothing else used it.
      Nothing is lost from the screen. `TodayModel.next` already lists what the coming
      prayer asks before and after, computed from triggers rather than the moment, so it is
      stable all day and states the distance ("Fajr, in about 8 hours"). That is the
      prepare-for-it view; "Right now" is the do-it-now view, and they are no longer the
      same line six hours apart.
      **Still wants the content reviewer's confirmation** that the prayer's own window is
      the right span. It is unambiguously better than six hours early, so it ships either
      way; the reviewer may want it narrower still.
- [ ] **P2 — Human** Content gap: "Morning adhkar" and "Evening adhkar" items list what to
      say ("Ayat al-Kursi, the three Quls, the sayyid al-istighfar") but contain none of
      the texts, and only one hadith excerpt. The primary audience cannot act on that.
      Decide whether to add the adhkar texts as sub-items or link to them.
- [x] **P2 — Mixed** Feature: reminders should teach, not just announce. Every body was a
      bare status line — "Now, until the window closes.", "Open until Dhuhr.", "Tomorrow.",
      "The window is open." **Built 2026-09-22, exactly as planned below.**
      `reminder: LocalisedText.nullable()` sits beside `why` in the item schema, so i18n
      comes free through `resolveText` and an Arabic reader gets the interface sentence
      rather than an English one when the Arabic has not been written — a test pins that
      fallback. `src/notifications/content.ts` prefers the item's own sentence over the
      status line, which stays for items that have none. The prayer-window body is interface
      copy, so it became a sentence in both `en.ts` and `ar.ts` rather than content.
      All 32 English sentences are drafted: the moment named, then one gentle line of why,
      point first because iOS shows two lines until the notification is expanded. They are
      content, so `reviewed: false` covers them and the validator lists any item that has
      none. **The sentences need the content reviewer's sign-off, and the Arabic needs the
      qualified speaker** — the plumbing is done, the words are a draft.

## Human Must Do

- [x] **P2 — Human** Diagnostic report preview. **Decided: build it**, and it is built.
      `src/app/(more)/diagnostics.tsx` and `src/screens/diagnostics.tsx`, with a test on
      the summary in `src/data/summary.test.ts`.
- [ ] **P2 — Human** Decide the fasting-owed rule. `docs/PRD.md:142` and `docs/SPEC.md:57`
      require "missed fasts still recorded as owed while paused"; no fasting-debt concept
      exists anywhere in the code. Either the content reviewer defines what counts as an
      owed fast, or the requirement is struck from the spec for v1.
- [ ] **P2 — Human** Decide iPad support. `supportsTablet: true` with `orientation:
portrait` and no width cap means edge-to-edge rows on a 12.9" screen, and it adds
      iPad screenshots to the submission. Setting `supportsTablet: false` for v1 is the
      smaller job.
- [ ] **P2 — Human** TestFlight internal test and Play internal testing track with at
      least two external testers before production.
- [ ] **P2 — Human** Screenshots: 6.7" and 6.5" iPhone, 13" iPad if tablet is kept,
      Android phone; Play feature graphic 1024×500.
- [ ] **P2 — Human** Set up a feedback channel that matches the support page (the email
      above is enough for v1).

---

# 🟡 P3 — COULD HAVE

## AI / LLM Can Do

- [ ] **P3 — AI, blocked upstream** Android large title that collapses into the app bar, the
      Material 3 "large top app bar", asked for 2026-09-21. Not available on the stable
      Stack: react-native-screens 4.28's Android `setLargeTitle*` setters are literal no-ops
      (`= Unit`) and there is no `CollapsingToolbarLayout` behind the legacy header. The
      experimental gamma stack has exactly it (`headerType: 'small' | 'medium' | 'large'`,
      left-aligned, real scroll flags), but expo-router 58's `ExperimentalStack` forwards only
      `title`, `headerShown`, `headerTransparent` and `headerBackVisible`, drops header tint
      and title style, is alpha, and cannot coexist with the standard Stack on Android. Keep
      Material's small top app bar until `ExperimentalStack` gains `headerType` and styling;
      do not fake it in JavaScript over a native header.
- [x] **P3 — AI** `src/components/counter.tsx:127-141` (168pt circle, `text-5xl`) and
      `src/components/stepper.tsx:28-45` (44pt squares, `text-xl`) can clip at the largest
      Dynamic Type sizes. Add `maxFontSizeMultiplier` or let the containers grow.
      **Done 2026-09-22:** both capped at `maxFontSizeMultiplier={1.4}`, since each sits in a fixed-size target.
- [x] **P3 — AI** `src/components/counter.tsx:31` — add an `accessibilityLabel` naming
      the item so the spoken control is not just a number.
      **Done 2026-09-22:** the item's name is passed down and spoken as the control's label.
- [x] **P3 — AI** `src/components/arabic-text.tsx` — add `accessibilityLanguage="ar"` so
      VoiceOver picks an Arabic voice (open criterion on issue #19).
      **Done 2026-09-22:** `accessibilityLanguage="ar"`, which closes that criterion on #19.
- [x] **P3 — AI** `package.json` — add `"postinstall": "git config core.hooksPath
.githooks"` so the pre-commit hook is not opt-in per clone.
      **Done 2026-09-22:** added, so a fresh clone gets the hook from `bun install`.
- [x] **P3 — AI** `.githooks/pre-commit` runs prettier, eslint and tsc but not `bun test`
      or `validate:content`; broken content JSON can be committed. Acceptable if CI (P1)
      exists; otherwise add the two fast steps.
      **Done 2026-09-22:** the hook runs `bun test` and `bun run validate:content` too. Both are under a
      second, and content is JSON the app trusts at runtime.
- [ ] **P3 — AI** `src/screens/onboarding.tsx:367-611` — `StepBody` is a 244-line switch.
      Fine as one exhaustive union; if it grows, extract each `case` body into a local
      function in the same file. Do not split across files.
- [x] **P3 — AI** `.github/ISSUE_TEMPLATE/` with the acceptance-criteria shape the existing
      issues already use, and a one-paragraph `PULL_REQUEST_TEMPLATE.md` asking for
      `bun run check` output.
      **Done 2026-09-22:** a piece-of-work template in the shape the existing issues use, a bug template that
      points at the diagnostics screen, and a PR template asking for the tail of
      `bun run check` and a line about what was actually run on a device.
- [x] **P3 — AI** `AGENTS.md` understates the purity boundary: `eslint.config.js:107-133`
      also protects `src/plan/*`, `src/prayer/qada.ts`, `src/data/bundle.ts`,
      `src/memorise/reveal.ts`, `src/i18n/locale.ts`. Update the doc to match the lint.
      **Done 2026-09-22:** the doc lists what lint lists, and says the rule is the list rather than the folder.
      The stale `preview.2` line was corrected while there.
- [ ] **P3 — AI** A theme change on Android recreates the activity and lands on Today,
      losing the Appearance screen the user was on. **Reproduced precisely 2026-09-22, and
      one fix tried and reverted.**
      It only happens when night mode actually flips: System to Light on an already-light
      system keeps the screen, because `AppCompatDelegate` has nothing to recreate for.
      Light to Dark loses it.
      Tried: Appearance putting itself back with `router.replace('/appearance')` on a timer,
      on the grounds that it is the only screen that can change the theme and therefore the
      only route that can be lost. It does not work at 400ms or at 1500ms, so this is not a
      timing problem — the router held by the pre-recreation JavaScript no longer drives the
      tree that comes back. Reverted rather than shipped.
      What is left to try is persisting the intended route and reading it when the new root
      mounts, which is also uncertain: the note on the Dark-to-System bug above records that
      a mount effect in `_layout.tsx` did not fire. Worth an hour with a native log before
      any more JavaScript is written against it. Low stakes — a theme is chosen rarely and
      the app is still usable — so it stays a P3.

## Human Must Do

- [ ] **P3 — Human** Recitations. `audioReciter: null`, every `audio: null`. The player is
      wired (`src/app/(library)/item/memorise/[id].tsx:25`) and shows "no audio" copy.
      Needs a reciter and distribution permission (`MARKETING.md` prerequisite 2).
- [ ] **P3 — Human** A minimal landing page (one page, same host as the policy) for the
      marketing URL field.
- [x] **P3 — Human** Payment model. **Decided:** the app is free, everything unlocked, with
      one optional donation that unlocks nothing. Android links out to `donate.ihsaanly.com`;
      iOS will use a purchase, because Apple's reviewers have refused external donation
      links in documented cases while Play's policy pushes the other way.

---

# 🔵 P4 — FUTURE

## AI / LLM Can Do

- [ ] **P4 — AI** Android home-screen widget (Glance/AppWidgetProvider). `src/widgets/snapshot.ts`
      is a deliberate no-op today; Android users get no widget. Issue #16 expected parity.
- [ ] **P4 — AI** EAS Update (`runtimeVersion` policy + `updates.url`). Deliberately
      absent today (`expo.modules.updates.ENABLED=false` in the generated manifest). Only
      worth adding once there is a reason to ship JS without a store release.
- [ ] **P4 — AI** Voice shortcuts (#20) and CarPlay/Android Auto (#21). Both blocked on
      recitations and, for #21, a platform entitlement. No code exists.
- [x] **P4 — AI** Diagnostic bundle completeness per issue #18. **Done 2026-09-22.** The
      pending-notification list and the permission state went in first — together they are
      what separates "never granted" from "never queued" when a reminder does not arrive —
      along with the clock's UTC offset and whether it is the summer one, for the window
      that is an hour out. The rotating log followed: `src/storage/log.ts` keeps the last
      fifty failures with truncated stacks, across launches, and `noteFailure` feeds it, so
      a bundle explains the failure from an hour ago rather than only the one happening now.
      The ring itself is pure in `src/storage/failure-entry.ts` and tested there; the store
      is a capped array in the preferences table rather than a real file, because
      `writePreference` is a synchronous SQLite write and can be called from inside a catch
      block, which a file write cannot. The preview shows a count and the latest timestamp,
      and says nothing at all when there is nothing to say.
      **What issue #18 still names and this does not carry:** the database file itself. That
      is a decision about what belongs in a bundle a user is shown first, not an oversight.
- [ ] **P4 — AI** Widget deep links (tap on Quick duas opens the item) once widgets are
      live.

## Human Must Do

- [ ] **P4 — Human** CarPlay/Android Auto audio-category entitlement request (#21).
- [ ] **P4 — Human** Voluntary payment products in both consoles, once decided.

---

# Device Walkthrough (Android emulator, 2026-09-20)

Pixel 10 Pro XL emulator, debug build served from Metro, London as the chosen city,
22:40–23:00 local. Every screen was opened; onboarding, Isha marking, the tasbih counter,
dark mode, Arabic/RTL, a 1.3× font scale, the test reminder and Delete my data were
exercised. Screenshots are not committed.

**Works as designed**

- Six-step onboarding, city search, place card with map, tracking-pause step, reminder
  permission on the button, three presets with the included list.
- Today: marking Isha put "After Isha" at the top with Witr, tasbih and the before-Fajr
  rak'ah under "Also now", as onboarding promises. "Up next" and "Try one more" render.
- Library filters and sections, item detail with Why/How/evidence, memorise reveal,
  glossary with the linked term highlighted.
- Dark mode on every screen. Arabic layout mirrors correctly, including the tab bar and
  back arrow. Nothing clips at 1.3× font scale.
- Test reminder arrives on the `reminders` channel with Done and Later actions.
- Delete my data confirms, wipes and reloads into onboarding.

**Bugs found** (also listed under P1/P2 above)

- ~~Today and the Hijri screen disagree by one day after Maghrib.~~ **Fixed**, with tests.
- ~~Stray "المكتبة" label in the status-bar area on every screen in RTL.~~ **Gone after
  the SDK realignment**, verified on the rebuilt app.
- Dark → System did not return to light until reload; the native confirm dialog was
  light on a dark screen. **Still open.**
- ~~Lowercase app name and default notification icon in the shade.~~ **Fixed.**
- "Tracking / Tracking" row on More. **Still open**, tracked as P2.

**Polish**

- Wash present on about half the stacked screens, absent on the other half.
- Toggles on Where you are look like plain rows.
- Keyboard stays up after choosing a city in onboarding.
- Counter's "Start again" shifts the Done button.
- "Two rak'ah before Fajr" shown as "Right now" at 22:47.

**Not tested on the emulator**: device GPS, geofence transitions, share sheet targets,
import from a real file, notification actions with the app killed.

## iOS simulator, 2026-09-21

iPhone 18 Pro, Xcode 27, debug build from Metro, state seeded directly into the app's
SQLite because Xcode 27 no longer ships the private frameworks the UI automation needs.

- The app did not launch at all before the SDK realignment; see the P1 drift item.
- After it: Today, More and onboarding all render natively, with the system tab bar, SF
  Symbols and the liquid-glass surfaces the app is designed around.
- The icon and splash are correct, and the home screen masks the mark to a squircle.
- Found here and fixed: Today requested the notification permission by itself.
- Still open and visible on iOS too: the "Tracking / Tracking" row.

**Not tested on the simulator**: device GPS, geofencing, widgets (they need an App Group
and a paid membership), the share sheet, and anything needing a real device.

**Cannot be tested here at all**: anything needing a tap or a scroll on iOS. Xcode 27 does
not ship `Simulator.app` in the Xcode bundle, so the UI automation tool cannot load the
private frameworks it needs and AppleScript has no process to talk to. iOS was driven
entirely through `ihsaanly://` deep links and state seeded into the app's SQLite. Anything
gesture-dependent on iOS needs a real device or a machine with a working Simulator app.

---

# Engineering Audit

## Architecture

- [x] Route/screen split holds. Every `src/screens/*.tsx` takes props only; the three
      routes with markup (`_layout.tsx` ErrorBoundary, `+not-found.tsx`, the off-screen
      share card in `item/[id].tsx:193-199`) are documented exceptions. No action required.
- [x] Domain layer is import-pure and lint-enforced (`eslint.config.js:107-133`), more
      broadly than `AGENTS.md` says. No action required.
- [x] Stores: one generic `createPreferenceStore` (`src/storage/preference-store.ts`,
      41 lines) used by all nine stores; `useSyncExternalStore` pattern honoured. No action.
- [ ] Module-scope side effects at launch (`database.ts:49-51`, `_layout.tsx:24-25`) run
      before any error boundary. See P1.

## SOLID

- [x] Single-responsibility is good: `plan()` is pure, storage is one module, notification
      scheduling is one module with prefix ownership. No forced abstractions. No action.
- [x] Open/closed via exhaustive unions ending in `assertNever` (lint-enforced). No action.

## DRY

- [x] No duplicated store, dialog or string-table logic found. One `Alert.alert` in the
      app. No action required.

## KISS

- [x] No DI, no service layer, no wrapper-of-a-wrapper. Fine.
- [ ] Largest files: `screens/onboarding.tsx` 704, `screens/today.tsx` 432,
      `plan/plan.ts` 393, `storage/events.ts` 283. All cohesive; see P3 note on `StepBody`.

## TypeScript

- [x] `strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`,
      `noImplicitOverride` on. Zero `any`, zero `!`, zero `@ts-ignore`. Three
      `eslint-disable` lines, each with a reason. No action.
- [x] Import bundle (`src/data/bundle.ts:34-40`) and notification payload
      (`src/notifications/payload.ts:29-52`) are validated with a version tag. No action.
- [ ] `src/storage/preferences.ts:13` unguarded `JSON.parse`. P1.
- [ ] `src/content/index.ts:8`, `glossary.ts:5` cast JSON without a runtime check,
      relying on `scripts/validate-content.ts` at build time. Acceptable while content is
      bundled; revisit if content ever loads from outside the bundle.

## Dead Code

- [ ] `src/content/glossary.ts:9,14` `termById`, `termForRuling`; `src/content/index.ts:23`
      `contentLanguage`. P2.
- [ ] `assets/images/logo.png`, `assets/images/background-grid.png`. P2.
- [x] Zero TODO/FIXME in `src/`; issue numbers are used instead. One `console.warn`
      (P2). `scripts/build-world-map.ts` is an intentional one-off generator, documented in
      `assets/images/README.md`. No secrets, no `.env` files, nothing tracked that should
      not be (`git ls-files` checked; `modules/**/android/build/` is ignored). One gap:
      `modules/theme-override/android/.gradle/` is generated and untracked but not
      ignored. Add `modules/**/android/.gradle/` to `.gitignore`.

## Dependencies

- [x] Every runtime dependency is used except possibly `@expo/material-symbols` (P2).
      `expo-symbols` is an optional peer of `expo-router` NativeTabs and is needed.
      `expo-font` and `expo-asset` are plugin-only by design. `expo-notifications` is
      dynamically imported on purpose (`schedule.ts:52`).
- [ ] `expo-audio` is wired but inert (all `audio: null`). Keep only if recitations are
      close; otherwise remove with the `"audio"` background mode (P0) and mic permission (P1).
- [ ] `city-timezones` costs 1.9 MB of JSON at startup. P2.
- [x] `expo-doctor` 20/20. Pins in `AGENTS.md` (nativewind RC, lightningcss 1.30.1) are
      respected. Preview SDK is a known, accepted risk; expect one `npx expo install --fix`
      pass when SDK 58 goes stable.

---

# Expo / React Native

- [x] SDK 58 preview.2, RN 0.88.0-rc.0, React 19.2.3, Expo Router with typed routes,
      React Compiler on, New Architecture and edge-to-edge on by default. No action.
- [ ] `eas.json` missing. P0.
- [ ] `extra.eas.projectId` / `owner` missing. P0 (Human `eas init`).
- [ ] No `runtimeVersion`/`updates`. Fine for v1 (P4).
- [x] CNG: `ios/` and `android/` are gitignored and regenerated; `plugins/with-android-manifest.js`
      only sets `supportsRtl` and removes `uiMode` from `configChanges`. No action.
- [x] No environment variables, no `.env`, no `EXPO_PUBLIC_*`. Nothing to document.

---

# iOS

- [ ] `icon`, splash. P0.
- [ ] `UIBackgroundModes` `"audio"`. P0.
- [ ] `ITSAppUsesNonExemptEncryption`. P1.
- [ ] `ios.buildNumber`. P1.
- [ ] Widgets: static placeholders. P1. App Group needs paid membership.
- [x] Bundle id `com.ihsaanly.app`, portrait only, `userInterfaceStyle: automatic`.
      Location strings are set in the `expo-location` plugin and are honest. No ATT (no
      tracking), no Sign in with Apple (no accounts), no associated domains needed.
      Per-library privacy manifests are present in `node_modules`; no first-party
      required-reason API use found. No action.
- [ ] `supportsTablet: true` with no tablet layout. P2 decision.

---

# Android

- [ ] `android.adaptiveIcon`. P0.
- [ ] `ACCESS_BACKGROUND_LOCATION` and the Play declaration. P0 decision.
- [ ] `RECORD_AUDIO` / `MODIFY_AUDIO_SETTINGS` from the `expo-audio` plugin. P1.
- [ ] `android.versionCode`. P1.
- [x] Package `com.ihsaanly.app`, `predictiveBackGestureEnabled`, `supportsRtl` via plugin,
      notification channels created before the permission prompt
      (`src/notifications/schedule.ts:81-85`). `SCHEDULE_EXACT_ALARM` deliberately absent
      (`AGENTS.md`). `INTERNET` is present from library defaults and unused; note it in
      Data Safety. Signing is handled by EAS. No R8 config needed. No action beyond the above.
- [x] The "find, connect to and determine the relative position of nearby devices" prompt
      on first launch is **not the app**. React Native's debug-only manifest declares
      `ACCESS_LOCAL_NETWORK` so the build can reach the Metro dev server
      (`node_modules/react-native/ReactAndroid/src/debug/AndroidManifest.xml`, next to
      `DevSettingsActivity`). There is no release counterpart, so a store build never asks
      it and no user ever sees it. `SYSTEM_ALERT_WINDOW` in the installed permission list
      is debug-only for the same reason. No action.
- [ ] No Android widget. P4.

---

# Security

- [x] No network surface at all: zero `fetch`, `XMLHttpRequest`, `http(s)://` in `src/`
      and `content/`. The only `Linking` call is `openSettings()`. No secrets, tokens or env
      files in the repo. Notification payloads are locally generated and validated
      (`payload.ts`). Nothing here is claimed secure by absence alone; the attack surface is
      the local import file and local notifications only.
- [ ] Import file read without a size cap before validation (`data.tsx:33`). P1.
- [ ] Diagnostics file lingers in cache. P2.
- [ ] Two moderate transitive advisories from `bun audit`. P2.

---

# Privacy

Data collected → why → where it goes → who receives it → optional:

| Data                                                                                       | Why                        | Where                               | Receiver                     | Optional                                |
| ------------------------------------------------------------------------------------------ | -------------------------- | ----------------------------------- | ---------------------------- | --------------------------------------- |
| Prayer marks, item completions, qada events                                                | Core feature               | SQLite `events` table, on device    | Nobody                       | Core                                    |
| Place (raw lat/long or chosen city), calc method, Hijri offset                             | Prayer windows, Hijri date | SQLite `preferences`, on device     | Nobody                       | Yes: city list works with no permission |
| Home region (raw lat/long)                                                                 | Opt-in geofence            | SQLite `preferences`                | Nobody                       | Yes, off by default                     |
| Language, theme, onboarding state, reminder prefs, known items                             | Settings                   | SQLite `preferences`                | Nobody                       | Core                                    |
| Export file (all of the above)                                                             | User-initiated backup      | Share sheet, user picks destination | Whoever the user sends it to | Yes                                     |
| Diagnostic file (export + raw coordinates + device model/OS + locale + last storage error) | User-initiated support     | Share sheet                         | Whoever the user sends it to | Yes                                     |

- [x] No analytics, crash reporting, ads, identifiers, contacts, camera, microphone use,
      webviews or third-party network SDKs. Confirmed against the code.
- [ ] Coordinates are stored raw, not rounded (`src/location/place.ts:4-9`). The policy
      says "approximate coordinates" in the diagnostic report. Round to two decimals in
      `buildDiagnostics()` or reword. P2 (fold into the P0 policy reconciliation).
- [ ] App Store privacy labels and Play Data Safety. P1 Human. Human/legal verification
      required.
- [ ] Children: the app collects nothing; `MARKETING.md` targets 4+/Everyone. Human/legal
      verification required for the age-rating questionnaire.

---

# Performance

- [ ] 1.9 MB `city-timezones` JSON parsed at every cold start. P2.
- [x] `useNow()` ticks once a minute; 8-day prayer computation is cheap arithmetic;
      `useNotificationSync` is keyed on a derived schedule key. `ScrollView` + `.map()` is
      correct for 32 items and 15 glossary terms. `expo-image` only. The world map renders
      near native resolution. No action.
- [x] SQLite open plus one migration at launch is cheap today. Revisit if migrations grow.

---

# App Size

- [x] Assets total about 480 KB (Amiri 431 KB, map 21 KB). Content JSON 53 KB. No action.
- [ ] `city-timezones` 1.9 MB is the largest JS asset. P2 lazy load keeps it in the
      bundle but off the startup path; replacing it with a trimmed city list is a P4 idea.
- [ ] Removing `expo-audio` (if recitations are far off), `@expo/material-symbols` (if
      unused) and `expo-widgets` (if placeholders are dropped) removes three native modules.

---

# UX / UI

- [x] Empty and error states exist where data can be absent: Library search, History,
      Item not found, Today without location, Notifications denied, Memorise without audio.
      Onboarding location step names declined/unavailable. Delete is behind a confirm.
- [ ] Location settings screen: no `locating` state, no path to Settings. P1.
- [ ] Library/Location keyboard swallows first tap. P2.
- [ ] Events "Set home" silent no-op. P2.
- [ ] Today with nothing enabled has no closing line. P2.
- [ ] Data screen: success has no message; the share sheet is the only feedback. Fine.
- [x] Spacing, typography and colour are consistent by construction (NativeWind classes,
      `colors` getters, `useStrings()`). Dark mode is correct: every `colors.*` reader calls
      the scheme hook. Widgets use fixed hex colours by design (separate render target).

---

# Accessibility

- [ ] `Row` has no role. P1.
- [ ] `Chip` target under 44pt. P2.
- [ ] `Counter`/`Stepper` clipping at large text; `Counter` label; `accessibilityLanguage`
      on Arabic. P3.
- [x] Every other Pressable has a role. No `allowFontScaling={false}` anywhere. The one
      animation is `useReducedMotion`-gated. `ArabicText` scales. Safe areas are owned by
      native headers, onboarding uses `useSafeAreaInsets`. No action.

---

# Testing

- [x] 19 test files, 164 tests, all pure domain: planner (50 assertions), windows,
      boundaries, Hijri, qada, suggest, presets, quiet hours, history, content schema,
      search, share text, glossary, bundle merge, payload parsing, notification content,
      locale, cities, reveal. This is the right layer to test and it is well covered.
- [ ] Untested and load-bearing: `src/prayer/marks.ts`, `src/plan/completions.ts`,
      `sync()` diff in `src/notifications/schedule.ts`. P1.
- [ ] Untested and side-effecting (acceptable to leave, note it): `src/storage/*`,
      `src/notifications/respond.ts`, `src/data/export.ts`, `src/events/geofence.ts`,
      `src/i18n/store.ts`.
- [ ] No component or E2E tests. Screens are pure with fixtures, so a render-smoke test
      per screen from `fixtures.ts` is cheap once the five missing fixtures exist (P1).
      Device flows (onboarding, reminder tap with app killed, delete-and-reload) stay
      manual for v1; list them in the release checklist below rather than automating.

---

# CI/CD

- [ ] No `.github/` directory. Add one workflow: `bun run check` on PR and `main`. P1.
- [ ] EAS builds: run `bunx eas-cli build --profile preview` manually for v1. Add an
      EAS Workflow or a tag-triggered production build later. No secrets are needed for the
      check workflow; EAS credentials would live in EAS, not GitHub.
- [ ] Dependabot for Actions only. P2.

---

# GitHub / Repository

- [x] `.gitignore` is correct: `ios/`, `android/`, module build output, credentials
      patterns, `.env*.local`. Nothing tracked that should not be.
- [x] Commit messages are descriptive and reference issues. Pre-commit hook is versioned
      in `.githooks/` (opt-in via README; P3 postinstall).
- [ ] Branches: `production` and `t1-three-tab-shell` exist; `main` is named as the PR
      target but does not exist on the remote. Decide the default branch and open a PR from
      `t1-three-tab-shell` into it so the 68 commits stop living on a feature branch.
- [ ] README rewrite. P1. Issue/PR templates. P3.
- [ ] All 22 issues are open and 0 are closed; 12 are done. P2.

## GitHub issues vs code

| #   | Title                                  | Status          | Remaining                                                                                             | Owner |
| --- | -------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- | ----- |
| 1   | MVP spec (epic)                        | Partial         | Rolls up everything below                                                                             | Mixed |
| 2   | Three-tab shell                        | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 3   | One content item end to end            | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 4   | Library browse and search              | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 5   | GPS or chosen city                     | **Done**        | Closed 2026-09-22; device GPS still unverified on real hardware, see #22                              | AI    |
| 6   | Prayer windows                         | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 7   | The Hijri day                          | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 8   | The decision function                  | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 9   | Prayer marking, sunnah unlock, make-up | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 10  | Travelling and paused tracking         | Partial 6/7     | "Missed fasts recorded as owed while paused" has no mechanism; needs a ruling decision                | Mixed |
| 11  | Calendar occasions                     | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 12  | Notifications                          | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 13  | Onboarding                             | **Done**        | Closed 2026-09-22; the AC was amended to six steps, with the reason                                   | AI    |
| 14  | Audio and memorisation                 | Partial         | Player wired; every `audio` is `null`; needs recitations                                              | Mixed |
| 15  | Contextual events and geofencing       | **Done**        | Closed 2026-09-22; geofence accuracy still unverified on device, see #22                              | AI    |
| 16  | Widgets                                | Partial         | Widgets never read the snapshot; no tap deep link; no Android widget; App Group needs paid membership | Mixed |
| 17  | History                                | **Done**        | Closed 2026-09-22                                                                                     | AI    |
| 18  | Export, import, diagnostics            | Partial 5/6     | Only the database file itself is not carried, which is a decision rather than a gap                   | Mixed |
| 19  | Second language and RTL                | Partial         | No `accessibilityLanguage`; Arabic unreviewed                                                         | Mixed |
| 20  | Voice shortcuts                        | Not started     | Blocked by #14                                                                                        | Mixed |
| 21  | CarPlay / Android Auto                 | Not started     | Blocked by #14, #20 and an entitlement                                                                | Human |
| 22  | Release prerequisites                  | Not started 0/7 | Hosting, support email, privacy declarations, reviewer and reciter names, payments decision           | Human |

---

# App Store Assets

Technical (AI wires once provided): `icon`, `adaptiveIcon`, splash config, `ITSAppUsesNonExemptEncryption`.

Human must create or provide:

- [ ] App icon 1024×1024, adaptive foreground and background colour
- [ ] Splash image
- [ ] Screenshots per platform and size
- [ ] Play feature graphic 1024×500
- [ ] Title, subtitle, short and long description, keywords (drafts in `MARKETING.md`)
- [ ] Category (Lifestyle), age rating answers
- [ ] Privacy policy URL, support URL, marketing URL (optional)

---

# Marketing

Required for submission: hosted privacy policy, hosted support page, support email,
screenshots, description. All are Human items above.

Useful for growth, not required: landing page (P3), changelog release notes (P2),
social profiles (not audited, your call), launch announcement.

---

# Legal / Compliance

Human/legal verification required for each:

- [ ] Privacy policy accuracy after the P0 reconciliation, and GDPR/UK GDPR wording for a
      no-collection app.
- [ ] Age rating and children's-privacy position (app collects nothing).
- [ ] Religious content: reviewer named and credited; grader attributions (`gradedBy`)
      on every citation are present in `content/items.json`.
- [ ] Translation rights: `translationSources` are `null`; confirm the translations are
      original or licensed.
- [ ] Open-source attribution: Amiri (OFL, text bundled), Natural Earth (public domain,
      documented). Surface both in About (P2).
- [ ] Location data: never transmitted automatically; raw coordinates are in the
      diagnostic bundle by user choice. Confirm the policy wording matches.
- [ ] Trademark check on the name "Ihsaanly" in both stores.

---

# Release Checklist

## Before Building

- [ ] All P0 items above ticked
- [ ] `bun run check` green
- [ ] `app.json` version `1.0.0`, `buildNumber`/`versionCode` set or `autoIncrement` on
- [ ] `bun audit` reviewed
- [ ] `CHANGELOG.md` has a `[1.0.0]` section

## Preview Build

- [ ] `bunx eas-cli build --profile preview --platform all`
- [ ] Install on one iPhone and one Android phone

## Real Device Testing

- [ ] Fresh install → onboarding → decline location → pick a city → Today renders
- [ ] Grant location → place card and map correct
- [ ] Allow reminders → force-quit → reminder arrives → tap opens the item
- [ ] Shade action Done from a killed app (Android)
- [ ] Mark a prayer → after-prayer item leads for an hour → expires
- [ ] Switch to Arabic → reload → RTL correct → switch back
- [ ] Theme Dark on Android → activity recreates in dark → cold start opens dark
- [ ] Export → Import on the other device → counts match
- [ ] Send diagnostic report → contents are what the policy says
- [ ] Delete my data → app reloads to onboarding
- [ ] Large Dynamic Type: Counter and Stepper do not clip
- [ ] VoiceOver/TalkBack: every Row is announced as a button
- [ ] Appearance Dark → System returns to light without a relaunch
- [ ] Arabic: no stray header text in the status-bar area on any screen
- [ ] Today header and More → Hijri date show the same Hijri day after Maghrib

## App Store / Play Store Submission

- [ ] Privacy labels and Data Safety completed
- [ ] Background location declaration and video (only if kept)
- [ ] Screenshots, description, URLs entered
- [ ] `bunx eas-cli build --profile production --platform all`
- [ ] `bunx eas-cli submit --platform ios` and `--platform android`
- [ ] TestFlight internal, Play internal testing, at least two testers, one week

## Launch

- [ ] Phased release on iOS, staged rollout on Play
- [ ] Support inbox monitored

## Post-Launch

- [ ] Triage diagnostic reports; no crash reporting exists by design, so this inbox is
      the only signal
- [ ] Re-run `npx expo install --fix` when SDK 58 goes stable
- [ ] Revisit P2 and P4 items

---

# Human Decisions Required

- [ ] Ship Android background location (Play declaration + video) or hide "Detect home"
      on Android for v1
- [ ] Ship iOS widgets as placeholders, wire them (needs App Group), or drop for v1
- [ ] Ship Arabic UI unreviewed, get it reviewed, or ship English-only
- [ ] Diagnostic report: add a preview screen or reword the policy
- [ ] Payments: remove from the policy for v1 or define the product
- [ ] iPad: keep `supportsTablet` (and add layout + screenshots) or set it false
- [ ] Fasting-owed-while-paused: define the rule or strike it from the spec
- [ ] Default branch: `main` does not exist on the remote; `production` and the feature
      branch do
- [ ] Who is the content reviewer, and do they consent to being credited

---

# Donation, before you submit

- [ ] **P0 — Human** `donate.ihsaanly.com` must resolve and show a real page. The row is
      live in the Android build and a reviewer will tap it. A link to a domain that does
      not exist reads as a broken app.
- [ ] **P1 — Human** Play Console: complete the Financial features declaration. Donations
      and tipping are not among its listed categories, so the answer is likely "none", but
      every app must submit the form.
- [ ] **P1 — Mixed** iOS donation. Deferred until the Apple Developer account exists,
      because it is a purchase product rather than a link. Apple's reviewers have refused
      external donation links in documented cases, which is why the two platforms differ.
- [ ] **P2 — AI** Re-read Apple's guidelines immediately before submitting. The external
      link position is under active litigation and could move.

---

# Questions / Unknowns

- [ ] Does `@expo/material-symbols` need to stay for `NativeTabs` `md=` icons on Android?
      Only a build without it answers this.
- [ ] Does the SDK 58 `expo-audio` config plugin allow omitting `RECORD_AUDIO`? Check the
      versioned docs before removing the package.
- [ ] Does `startGeofencingAsync` on iOS require the `location` background mode in this
      Expo version? Keep it until tested on a device with the app killed.
- [ ] Are the English and Arabic translations original work? `translationSources` is
      `null` for both.
- [ ] Is `Sahih Muslim 1162` cited correctly in both narrations?
- [ ] Which remote branch is meant to be the default?

---

# Recommended Order

Done, 2026-09-21:

1. [x] AI: background modes, `ios.config.usesNonExemptEncryption`, app name, `eas.json`
2. [x] AI: brand assets generated from the app's own motif and wired in — icon, adaptive,
       Android 13 monochrome, splash, notification glyph
3. [x] AI: diagnostics preview screen, with coordinates rounded in the bundle itself
4. [x] AI: donation row on About for Android, opening `donate.ihsaanly.com`
5. [x] AI: privacy policy rewritten to match the code; reviewer and grader claims corrected
6. [x] Human: support email chosen, `support@ihsaanly.com`

Next, smallest human unblockers first:

7. [ ] Human: point `donate.ihsaanly.com` at a real page. It ships in the Android build and
       a reviewer will tap it.
8. [ ] Human: enable GitHub Pages, serving `main` and `/docs`, so the two legal pages have
       URLs. `docs/` is already prepared to publish only `legal/`.
9. [ ] Human: Apple Developer and Google Play accounts, then `eas login` and `eas init`.
       Android builds work before this; iOS and the iOS donation do not.
10. [ ] AI: the three bugs the device walkthrough found — Hijri day mismatch, the stray RTL
        header, and Dark → System not returning to light
11. [ ] AI: guard the database open and the preference parse; add `.catch` and a size cap to
        import. These are the launch-crash paths.
12. [ ] AI: `Row` accessibility role, Location screen `locating` state, the five missing
        fixtures, CI workflow
13. [ ] AI: tests for `marks.ts`, `completions.ts` and the `schedule.ts` diff
14. [ ] AI: README rewrite; close the twelve finished GitHub issues
15. [ ] Human: content reviewer sign-off; Arabic review, or ship English-only for v1
16. [ ] Human: App Store privacy labels, Play Data Safety, the background-location
        declaration and demo video, the Financial features form
17. [ ] Both: preview build, then the device checklist, then fix what it finds
18. [ ] AI: the P2 sweep — city-timezones lazy load, keyboard taps, Chip target, dead
        exports, cache cleanup
19. [ ] Human: screenshots and store listing, production build, TestFlight and Play internal
        testing, submit
