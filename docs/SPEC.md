# Ihsaanly — v1 Specification

Derived from a 16-question discovery session. Every "Decision" below was chosen by the
product owner; the rationale records why, so a future reader can tell a deliberate choice
from an accident.

---

## 1. Product requirements

**Problem.** Two, not one.

- _Recall_ — the user genuinely forgets contextual duas (leaving home, driving, ascending/
  descending, elevators).
- _Foresight_ — the user finds out about worship opportunities (White Days, Dhul Hijjah,
  Ashura) too late to prepare.

**Users.** Primary: new Muslims and those easing back into practice. Secondary: practising
Muslims who want a fuller sunnah surface. Not families, not children — different product.

**Positioning.** Not a prayer-times app; not a habit tracker. The differentiators are
(a) evidence attached to every single item, and (b) look-ahead on the worship calendar.

**Non-negotiable principles.**

- All religious content is free, forever. Monetisation is a tip jar only.
- Mustahabb is never rendered as owed. No streaks, no percentage scores, no "you missed N".
- Nothing is labelled sunnah without a citable source.
- Offline is the default; internet is only ever optional (link-outs).

---

## 2. Decisions

| #     | Decision                                                                                                                                                                    | Rationale                                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Serve both recall and foresight                                                                                                                                             | Owner confirmed both failure modes are real                                                                                                                                                  |
| 2     | Multi-modal delivery: push, pull (widget/Siri/tile), memorisation, manual mode. User picks per item                                                                         | Physical events are mostly undetectable; pull must always work                                                                                                                               |
| 3     | Short onboarding; defaults tuned for a new Muslim; more items enabled later                                                                                                 | A new Muslim cannot self-select from 60 toggles                                                                                                                                              |
| 4     | No clock times on screen — windows only. "I prayed Dhuhr" drives the sunnah                                                                                                 | Removes the prayer-time accuracy trap; matches real behaviour                                                                                                                                |
| 5     | Fard marks are persisted, with qada as the outlet. No streaks or scores on fard                                                                                             | Fard outranks sunnah; guilt needs an outlet or it is corrosive                                                                                                                               |
| 6     | Content is JSON; every item carries hadith or Qur'an evidence; a named reviewer signs off before release                                                                    | "Evidence-backed" is the moat and is worthless unverified                                                                                                                                    |
| 7     | All event items ship. Detection is a property of delivery, not of the item                                                                                                  | The elevator dua must exist even though no sensor can find it                                                                                                                                |
| 8     | Hijri = Umm al-Qura, user offset −2..+2, "expected" wording, moon-sighting bodies listed in Help. Arafah shows both when they differ                                        | Calculated vs sighted disagreement is a real religious harm                                                                                                                                  |
| 9     | Default 2–3 notifications/day; prayer reminders off by default; all chosen during onboarding                                                                                | Notification fatigue is the top uninstall cause; adhan apps already exist                                                                                                                    |
| 10    | Three tabs: Today · Library · More                                                                                                                                          | Library is the pull surface and must be one tap. History in the bottom bar is a guilt machine                                                                                                |
| 11–12 | Full i18n (en, ar, fr, es, ja, so). A language ships only when its content is complete and reviewed                                                                         | Machine-translated hadith would destroy the trust model                                                                                                                                      |
| 13    | Free; optional one-time "support" purchase unlocking nothing                                                                                                                | Paywalling religious knowledge is unacceptable; ads/analytics conflict with the privacy claim                                                                                                |
| 14    | SQLite in the shared app-group container + a small JSON snapshot for the widget                                                                                             | Analytics need real queries; the widget process needs a trivial read                                                                                                                         |
| 15    | Full diagnostic bundle: DB, logs, stack traces, settings, environment                                                                                                       | Owner requires exact reproduction of user state                                                                                                                                              |
| 16    | v1 = everything                                                                                                                                                             | Owner's call, made explicitly. See §16 for what this costs                                                                                                                                   |
| 24    | Two widgets in v1: **Right now** (small) and **Quick duas** (medium). Deep-link only, no App Intents yet                                                                    | "Quick duas" is the only real fix for the undetectable events — elevator, hill — reachable in the two seconds you have                                                                       |
| 25    | Onboarding = 5 screens: language → location (GPS _or_ city) → gender → notification toggles → starter items                                                                 | Minimum the app actually needs. Nothing here can be derived                                                                                                                                  |
| 26    | **Native-first visual direction.** `@expo/ui`, `expo-symbols`, `expo-glass-effect` — all already installed. Custom work limited to one accent colour and an Arabic typeface | Genuinely native on both platforms (SwiftUI / Compose), nearly free, and ages with the OS instead of drifting from it                                                                        |
| 27    | Qada shown as a **count per prayer**, never a dated list. Full timestamps still captured in the event log                                                                   | A count is an outlet; a dated ledger is an archive of shame. The data requirement and the guilt principle are both satisfiable                                                               |
| 23    | Memorisation = a focused practice screen (audio loop, progressive hiding, self-marked). **Not** spaced repetition. An item marked known drops out of the reminder rotation  | SRS is a debt engine — the Anki backlog feeling is the guilt mechanic under a friendlier name. Dropping known items is how the notification budget stays at 2–3/day as the user enables more |
| 18    | Gender asked in onboarding; gates a neutral "pause tracking" switch for menses/nifas. No prayer qada while paused; fasts recorded as owed. **Never auto-resumes**           | Duration varies and nifas runs to 40 days; auto-resume would generate qada for prayers she is forbidden to make up                                                                           |
| 19    | Hijri date, fasting and `day` triggers use the **Maghrib** boundary. The prayer log uses the **local calendar day**                                                         | A literal Maghrib boundary puts Tuesday evening's Maghrib and Isha under Wednesday — a history nobody recognises                                                                             |
| 20    | Travelling mode, manually toggled: qasr surfaced, rawatib suppressed, travel duas raised, fasting presented as optional                                                     | On safar the sunnah answer genuinely changes; surfacing rawatib would be wrong                                                                                                               |
| 21    | Asr = standard, toggle in Settings not onboarding. `HighLatitudeRule.MiddleOfTheNight`, also in Settings                                                                    | Asr cannot be derived from coordinates. Above ~48°N Isha does not occur in summer — that is Edmonton, not the Arctic                                                                         |
| 22    | Manual city fallback with a bundled city/coordinate dataset. GPS is optional convenience; the app works fully with **zero permissions granted**                             | Without it, denying location kills prayer times → windows → adhkar → the whole core loop. And privacy-conscious users are the ones who deny                                                  |
| 17    | Audio recitation ships in v1, plus Siri/lock-screen. Unlocks CarPlay Audio + Android Auto Media                                                                             | Recitation serves memorisation, accessibility and in-car at once — not a category workaround                                                                                                 |

---

## 3. Information architecture

```
Today            Library                More
├ Right now      ├ Search               ├ History (record + analytics)
├ Prayers        ├ Adhkar               ├ Settings
│ └ mark → sunnah├ Duas                 │  ├ Notifications (per item)
├ To make up     ├ Prayer               │  ├ Location & detection
├ Coming up      ├ Fasting              │  ├ Hijri offset
└ Context strip  ├ Home / Travel /      │  ├ Language
                 │  Eating / Sleeping   │  └ Accessibility
                 └ Item detail          ├ Help
                    ├ Arabic            │  ├ Moon-sighting bodies
                    ├ Transliteration   │  └ Send diagnostic bundle
                    ├ Translation       └ Support the app
                    ├ Evidence ★
                    └ Delivery settings
```

★ Evidence is a first-class panel, not a footnote. Collection, reference, grading, grader,
original wording, and any scholarly note.

**Today, ordered:** what is relevant now → prayers (tap to mark) → anything to make up →
what is coming → the context strip (quick access to event duas). Never more than one
"right now" card. Nothing negative — the app never says what is _not_ recommended today.

---

## 4. Content model

`content/items.json`, bundled read-only. Validated by Zod **at build time**, not at startup.

```jsonc
{
  "schemaVersion": 1,
  "reviewedBy": "name + credentials",
  "translationSources": { "en": "...", "ar": null },
  "items": [
    {
      "id": "dua-leaving-home",
      "category": "home",
      "title": { "en": "..." },
      "ruling": "fard|wajib|sunnah-muakkadah|sunnah|mustahabb|mubah",
      "arabic": "...", // source text, not localised
      "transliteration": { "en": "..." },
      "translation": { "en": "..." },
      "repeat": 1,
      "evidence": [
        {
          "type": "hadith", // or "quran" → surah + ayah
          "collection": "Sunan Abi Dawud",
          "reference": "5095",
          "grading": "sahih|hasan|da'if|disputed",
          "gradedBy": "al-Albani", // null only for Bukhari/Muslim
          "text": { "ar": "...", "en": "..." },
        },
      ],
      "trigger": { "kind": "event", "event": "leaving-home" },
      "audio": "audio/dua-leaving-home.m4a", // Arabic recitation, bundled. Not localised
      "audioTranslation": null, // optional spoken translation, locale-keyed
      "defaultOn": true,
      "note": { "en": "Scholars differ on ..." }, // null unless they genuinely do
    },
  ],
}
```

**Trigger kinds**

- `window` → `morning` | `evening`
- `prayer` → `{ prayer: fajr|dhuhr|asr|maghrib|isha, when: before|after }`
- `day` → `monday` | `thursday` | `white-days` | `ashura` | `arafah` | `shawwal-6` | `dhul-hijjah` | `ramadan`
- `event` → `leaving-home` | `entering-home` | `travel` | `driving` | `ascending` | `descending` | `eating` | `sleeping` | `waking` | `entering-masjid`

**Gate:** an item with `grading` other than `sahih`-via-Bukhari/Muslim and no `gradedBy`
fails build validation. Content cannot ship ungraded by accident.

User preferences live in SQLite, never in this file.

---

## 5. Context engine

A pure function. No I/O, no side effects, fully testable, no device required.

```ts
type Signals = {
  now: Date; tz: string;
  coords: { lat: number; lon: number };  // GPS or manually chosen city
  prayerTimes: Record<Prayer, Date>;     // adhan, computed locally
  hijri: { day: number; month: number; year: number; offset: number };
  prayedToday: Partial<Record<Prayer, Date>>;
  activeEvents: EventKind[];             // from detection or manual mode
  userState: {
    travelling: boolean;                 // manual; suppresses rawatib, raises qasr + travel duas
    trackingPaused: boolean;             // menses/nifas; no prayer log, no qada, fasts still owed
  };
  prefs: Prefs;
};

resolveContext(s: Signals): Context          // windows, prayer phase, day flags
selectItems(ctx: Context, items: Item[]): Ranked[]   // relevance-ordered
```

Everything device-shaped (location, Bluetooth, clock) is collected at the edge and passed
in as `Signals`. The engine never touches an API. This is what makes it unit-testable and
what makes the diagnostic-bundle replay tool possible: feed a recorded `Signals` and the
output is deterministic.

**User states override selection before ranking.** `trackingPaused` removes all prayer
items and suppresses qada entirely. `travelling` suppresses rawatib, surfaces qasr and the
travel duas, and reframes fasting as optional. Both are manual switches — no detection.

**Two day boundaries, deliberately.** `hijriDay(now)` turns at Maghrib and drives fasting,
Hijri display and every `day` trigger. `logDay(now)` is the local calendar day and drives
the prayer log and history. They are different functions and must never be confused.

**Ranking:** active event > current window not yet done > prayer just marked > look-ahead

> everything else. Ties broken by `ruling` strength, then by user's enabled order.

---

## 6. Detection — honest capability table

| Event                             | Mechanism                                      | Reliability                                                                                               |
| --------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Leaving / entering home           | `Location.startGeofencingAsync`, ≥100 m radius | Fires late, hundreds of metres out. iOS caps at 20 regions                                                |
| Travel                            | Significant-location-change, or manual switch  | Manual is more reliable                                                                                   |
| Driving                           | Car Bluetooth / audio route                    | Detectable, but iOS suppresses notifications while driving — surface on the **widget**, never as an alert |
| Ascending / descending / elevator | **None**                                       | Not detectable in background. Library + widget + memorisation only                                        |
| At mosque                         | Geofence, user-defined                         | Works, costs a region                                                                                     |

Background location requires a development build, `UIBackgroundModes: ["location"]`, and an
App Store review justification that conflicts with the privacy pitch. Ship it behind an
explicitly opt-in setting that is **off by default**, with plain-language copy explaining
the trade.

---

## 7. Notification architecture

- Default set: morning adhkar, evening adhkar, look-ahead for upcoming worship days. 2–3/day.
- Prayer reminders **off** by default.
- Per-item delivery override, buried in item detail.
- Quiet hours, honoured globally.
- Never guilt-shaped. Never "you didn't".

**Scheduling.** iOS holds ~64 pending local notifications (Apple limit — verify on device).
Budget accordingly: schedule a rolling 14-day horizon, re-arm on every foreground and from
an `expo-background-task`. Android 12+ declares `SCHEDULE_EXACT_ALARM`; fall back to
inexact windows where the user has denied it rather than failing silently.

Triggers: `DailyTrigger` for fixed windows; `DateTrigger` for prayer-relative ones,
recomputed nightly because prayer times drift daily.

---

## 8. Data & storage

Location is never required. The user either grants GPS or picks a city from a bundled
dataset; `Signals.coords` is identical either way and nothing downstream knows the difference.

| Store                     | Contents                                        | Why                                                      |
| ------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| Bundled `items.json`      | All religious content                           | Read-only, versioned with the app                        |
| SQLite (app group)        | prefs, prayer marks, qada, event log, analytics | Real queries over a year of history                      |
| JSON snapshot (app group) | "what to show right now"                        | The widget process reads this; it should not link SQLite |

```ts
const dir = Paths.appleSharedContainers['group.com.ihsaanly.app']?.uri
await SQLite.openDatabaseAsync('ihsaanly.db', undefined, dir)
```

**Event log** — append-only, one row per action:
`(id, ts, item_id, kind, window_start, window_end, delta_seconds, source, app_version)`
`delta_seconds` is signed: how early or late relative to the window. This feeds analytics
and costs nothing to record.

**Migrations:** `PRAGMA user_version`, forward-only, one numbered step per release.

---

## 9. Diagnostic bundle

User-initiated only, via the OS share sheet. Contents: app + build version, OS version,
device model, locale, timezone + DST state, full settings snapshot, approximate
coordinates, `ihsaanly.db`, rotating log file with stack traces, pending-notification
list, permission states.

**Obligations that come with it:** the App Store privacy label must declare the
transmission; the marketing line becomes "your worship data never leaves your phone unless
you choose to send it"; the user sees a summary of what they are sending before they send it.

Companion (post-v1): a dev-only **import** that loads a bundle and fakes clock, location
and timezone so the app replays the user's exact state. Design the bundle now so this stays
possible.

---

## 10. Packages

**Add:** `expo-notifications` · `expo-location` · `expo-task-manager` ·
`expo-background-task` · `expo-sqlite` · `expo-localization` · `expo-sharing` ·
`expo-mail-composer` · `expo-device` · `expo-audio` (background playback, lock screen,
audio session) · `react-native-carplay` (CarPlay Audio templates) · `adhan` (prayer times, offline) ·
`@umalqura/core` (Umm al-Qura Hijri) · `i18n-js` · `zod` (build-time validation only).

**Already present and used:** `expo-router` · `expo-widgets` · `@expo/ui` ·
`expo-file-system` · `expo-symbols` · `expo-glass-effect` · `expo-haptics` · `nativewind`.

**Deliberately not added**

- _TanStack Query_ — there is no server. It would be decoration.
- _Zustand_ — state is small and mostly derived. React 19 + the React Compiler (already
  enabled) handle it. Add it only if Context re-renders measurably bite.
- _date-fns / moment_ — `adhan` returns `Date`; `Intl.DateTimeFormat` formats. Add a date
  library when a concrete need appears, not before.
- _Any analytics SDK_ — ever.

---

## 11. Folder structure

```
src/
  app/                    # expo-router; routes only
    (tabs)/ today.tsx  library.tsx  more.tsx
    item/[id].tsx
    onboarding/
  features/
    context/              # resolveContext, selectItems — pure
    prayer/               # adhan wrapper, windows, marking
    hijri/                # Umm al-Qura + offset + "expected" wording
    notifications/        # scheduling, re-arm, budget
    detection/            # geofence, bluetooth, manual travel
    log/                  # event log, diagnostics, export
    content/              # load + typed access
  i18n/                   # strings, RTL helpers
  ui/                     # design system
content/items.json
widgets/
docs/SPEC.md
```

Routes contain no logic. Every rule lives in `features/` as a pure function so it can be
tested without a simulator.

---

## 12. Testing

`bun test` (bun.lock is present) over pure modules. No simulator, no mocks of the OS.

Must be covered:

- `resolveContext` / `selectItems` — table-driven across windows, prayer phases, day flags.
- Hijri conversion including offset, and the Arafah divergence case.
- Prayer windows at high latitude, across DST, and across midnight.
- Notification budget: never exceeds the iOS cap; re-arm is idempotent.
- Content validation: the ungraded-hadith gate actually fails the build.
- Migrations: each step runs forward from the previous `user_version`.

Device testing is limited to geofencing and notification delivery, which cannot be
simulated honestly.

---

## 13. Offline

Everything core works with the radio off: content is bundled, prayer times are computed,
Hijri is computed, notifications are local, storage is local. Internet is used only for
link-outs to moon-sighting bodies and for the optional tip-jar purchase. There is no sync,
no fetch on startup, and no loading state anywhere in the core loop.

---

## 13a. Localisation

Two separate axes, deliberately:

- **UI locale — full BCP-47.** `en-CA` (default), `en-US`, `en-GB`, `fr-CA`, `fr-FR`, `ar`,
  `es`, `ja`, `so`. Drives spelling, `Intl` date/number formatting, and RTL. Cheap: a strings file.
- **Content — language only.** `en`, `ar`, `fr`, `es`, `ja`, `so`. A hadith translation does not
  differ between Canada and the UK. A region key is permitted per item if one genuinely does.
- **Fallback:** `en-CA` → `en`. Resolution happens once at load.

Consequence: decision 11 ("a language ships only when its content is complete and reviewed")
binds at **language** level. Adding `en-GB` later is a strings file, not a review cycle.

Prayer calculation method defaults from **coordinates**, never from locale.

---

## 13b. Memorisation

One screen, one item. Audio on loop (`expo-audio`), Arabic always visible, transliteration
and translation each independently hideable, self-marked "I know this". No scheduler, no
queue, no review debt.

`known: true` removes the item from the reminder rotation but not from the Library. This is
the mechanism that keeps the notification budget flat while the user enables more items over
time, and it is the app's "make itself unnecessary" principle in code.

---

## 13c. Visual direction

Native-first. `@expo/ui` gives SwiftUI primitives on iOS and Jetpack Compose on Android, so
"native" means genuinely native on each platform rather than an iOS skin on Android.
`expo-symbols` for iconography, `expo-glass-effect` where depth helps.

Custom surface area is deliberately tiny: **one accent colour** and **one Arabic typeface**.
Everything else is system type, system materials, system spacing. Nothing on the home screen
is decorative. No gradients, no mosque imagery, no gold.

---

## 14. Accessibility

Dynamic Type throughout; nothing in a fixed `fontSize`. Arabic text carries its language
so VoiceOver switches voice rather than reading it as gibberish. Contrast to WCAG AA in
both themes. `prefers-reduced-motion` honoured by Reanimated. Every control reaches 44 pt.
All layout uses logical directions (`start`/`end`, `ms-`/`me-`/`ps-`/`pe-`) from the first
screen, never `left`/`right`, so RTL is free rather than a rewrite.

---

## 15. Platform limits

|                       | iOS                                                    | Android                                           |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Geofences             | 20 max                                                 | 100 max                                           |
| Background location   | Dev build + `UIBackgroundModes` + review justification | Foreground service + `ACCESS_BACKGROUND_LOCATION` |
| Pending notifications | ~64                                                    | No hard cap; Doze delays inexact alarms           |
| Exact alarms          | n/a                                                    | `SCHEDULE_EXACT_ALARM`, user-revocable on 13+     |
| Widgets               | WidgetKit via `expo-widgets`, app-group required       | Glance/AppWidget                                  |
| Live Activities       | Supported; demo already in repo                        | No equivalent                                     |
| Driving notification  | Suppressed by Focus                                    | Generally delivered                               |

### In-car (§15a)

Entry is by **category**, not by effort. As a reminders app, Ihsaanly qualifies for none.
As an **audio** app — which it now is — it qualifies honestly for both:

| Platform     | Category          | Requirement                                                                               |
| ------------ | ----------------- | ----------------------------------------------------------------------------------------- |
| CarPlay      | **Audio**         | Entitlement requested at developer.apple.com/contact/carplay. Routinely granted for audio |
| Android Auto | **Media – Audio** | `MediaBrowserService` + Play Store car-app quality review. No entitlement                 |

Available immediately, no approval needed: `expo-audio` background playback with lock-screen
and Control Center controls, plus Siri App Intents / Google Assistant shortcuts — _"play the
travel dua"_ works in the car with no entitlement at all. Build this layer first.

Honestly closed, and not to be pursued by contorting the product: navigation (turn-by-turn
only; Qibla does not qualify), driving-task (Apple means tolls, roadside assistance, vehicle
logs), messaging, parking, fuelling, EV charging, food ordering, voice-conversational.

Open lead, **unverified**: CarPlay supports widgets and Live Activities, and it is unclear
whether those need a category entitlement. Answered in Apple's CarPlay Developer Guide PDF.
If they ride in without one, this repo already has `expo-widgets` and a working Live
Activity, making it close to free. Worth checking before building anything else for CarPlay.

Possible later, honest fit: Android Auto **POI** via a nearby-mosque feature — but it needs
place data and internet, so it sits outside the offline core.

---

## 16. Scope

v1 is everything, by explicit decision. Recorded consequences:

- Realistic solo timeline is months, not weeks. The long poles are content authoring,
  scholarly review, and per-language translation — none of which are code.
- **Arabic UI cannot ship until Arabic content is complete and reviewed** (§2, decision 11).
  The i18n and RTL work is unblocked; the _release_ of any given language is not.
- **No release at all until a named reviewer signs off** on `items.json`. This is the
  single hardest external dependency in the project.
- **A reciter, with permission to ship the recordings**, is the second external dependency.
  ~60 Arabic files; translations are read, not recited, so this does not multiply by language.
  Budget roughly 10 MB bundled at AAC mono — offline-first is unaffected.
- CarPlay and Android Auto are reachable via the Audio category (§15a), not closed.

Suggested build order, so something is testable early: content model and validation →
context engine (pure, no device) → Today → Library → notifications → widget → detection →
history and analytics → diagnostics → i18n/RTL → audio + Siri/lock-screen → CarPlay/Auto.
