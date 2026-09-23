# What's left, and it's all yours

Everything in `audit.md` that I could do was done as of 2026-09-22. What remains
for **you** needs an account, a domain, a recording, a device in your hand, or a
decision only you can make.

_(2026-09-23: a page-by-page walkthrough on `production` added twenty improvements
to `audit.md`. They are all mine, not yours — none needs anything from this list.)_

This list is ordered by what unblocks what, not by priority label. `audit.md`
holds the reasoning behind each; this is the working copy.

Where a task says **I can finish it**, that means the code is ready and I need
one thing from you.

---

## 1. Start here — four things gate everything else

- [ ] **Apple Developer Program + Google Play Console accounts.**
      Then, in the repo: `bunx eas-cli login`, then `bunx eas-cli init` — which
      writes `extra.eas.projectId` into `app.json`.
      Unblocks: every build, TestFlight, the iOS donation, and the App Group
      (`group.com.ihsaanly.app`) that `src/storage/database.ts` is waiting on
      with `SHARED_CONTAINER_ENABLED = false`.

      Android does not wait for Apple. Once `eas init` has run,
      `bunx eas-cli build -p android --profile preview` works the same day.

- [ ] **Enable GitHub Pages** — repo Settings → Pages → source `production`, folder `/docs`.
      Everything is prepared: `docs/_config.yml` publishes only `legal/` and holds
      back `PRD.md` and `SPEC.md`; `docs/index.md` links to both pages.
      Since you own `ihsaanly.com`, a custom domain reads better than the
      github.io address — that's a `CNAME` file and a DNS record.

      **Apple rejects submissions without a reachable privacy policy.**
      **I can finish it:** the app deliberately does *not* link to the policy yet,
      because a 404 there is worse than the paragraph beside it. Tell me the URL
      resolves and I'll add the link to About.

- [ ] **Point `donate.ihsaanly.com` at a real page.**
      The donate row is live in the Android build and a reviewer will tap it.
      A link to a domain that doesn't exist reads as a broken app.

- [ ] **Content review.** A named, qualified reviewer signs off and consents to
      being credited. `content/items.json` has `reviewedBy: null` and all 32 items
      `reviewed: false`; `bun run validate:content` warns on every build, and the
      project's own policy blocks shipping unreviewed religious content.
      Flipping `reviewed` is the reviewer's act, not mine.

      Give the reviewer §5 below — it's their whole list.

---

## 2. Decisions — each one I can execute the same day

- [ ] **Arabic: write it, or hold it for v1.**
      This is not "review the Arabic". Measured 2026-09-22:

      | | Arabic |
      | --- | --- |
      | item titles | 32 / 32 |
      | glossary definitions | 15 / 15 |
      | `why` | **0 / 32** |
      | `how` steps | **0 / 68** |
      | `reminder` | **0 / 32** |
      | `note` | **0 / 3** |

      About **135 strings that don't exist**. `resolveText` returns null rather
      than falling back, so an Arabic reader gets an Arabic interface, Arabic
      titles and a glossary — with every explanation silently absent. No error,
      just gaps.

      `src/strings/ar.ts` is separate: complete, a one-pass draft, still needs a
      qualified speaker. `AGENTS.md` calls that a release condition.

      **I can finish it:** say "English-only for v1" and I'll hide Arabic from
      the picker — a small change. Or commission the strings and I'll wire them.

- [ ] **iPad: support it, or not.**
      `supportsTablet: true` with `orientation: portrait` and no width cap means
      edge-to-edge rows on a 13" screen — and it adds iPad screenshots to the
      submission.
      **I can finish it:** `supportsTablet: false` is the smaller job and I'll do
      it on a word. Keeping it means layout work plus those screenshots.

- [x] **The fasting-owed rule.** _Implemented with a narrow v1 rule, pending the
      content reviewer's confirmation (§5)._
      `docs/PRD.md:142` and `docs/SPEC.md:57` require "missed fasts still recorded
      as owed while paused". v1: only obligatory fasts are owed, and only Ramadan
      days the user records as not fasted (a quiet "Not fasting today" row on
      Today during Ramadan, with undo), plus an "Owed from before" backlog on the
      To make up screen. Nothing accrues automatically, so recording is the
      user's act and the tracking pause does not stop it. A count, never a list.
      Voluntary fasts are never owed; vows, expiations and fidya are out of scope.
      Code: `src/fasting/ledger.ts`, `src/fasting/store.ts`.

- [ ] **The adhkar content gap.**
      "Morning adhkar" and "Evening adhkar" tell the reader _what_ to say — Ayat
      al-Kursi, the three Quls, the sayyid al-istighfar — and contain none of the
      texts. The primary audience can't act on that.
      Decide: add them as sub-items, or link out.

---

## 3. Store paperwork — after the accounts exist

- [ ] **App Store privacy labels.** "Data Not Collected" for everything automatic,
      plus disclosure that a _user-initiated_ diagnostic report contains
      approximate location and religious-practice data. The exact label choice
      wants your eye, not mine.
- [ ] **Google Play Data Safety form.** Same disclosure. Background location is
      kept, so also complete the sensitive-permission declaration **and record the
      demo video** Play requires.
- [ ] **Play Console: Financial features declaration.** Donations and tipping
      aren't among its categories, so the answer is likely "none" — but every app
      must submit the form.
- [ ] **Store metadata.** Title, subtitle (`MARKETING.md` drafts "Sunnah, with its
      source"), description, keywords, category (Lifestyle), age-rating
      questionnaire.
- [ ] **Screenshots.** 6.7" and 6.5" iPhone, Android phone, 13" iPad if tablet
      stays. Play also wants a 1024×500 feature graphic.
- [ ] **A one-page landing site** for the marketing URL field — same host as the
      policy.
- [ ] **Confirm the support mailbox receives mail.** `support@ihsaanly.com` is in
      both legal documents.
- [ ] **TestFlight + Play internal testing** with at least two external testers
      before production.

---

## 4. On a real device — one iPhone, one Android phone

None of this can be done on a simulator or emulator. Cover:

- [ ] Onboarding with location **declined** (the city-search path).
- [ ] Reminder delivery **with the app killed**.
- [ ] Shade actions: Done and Later.
- [ ] Delete my data.
- [ ] Theme switch on Android.
- [ ] Arabic RTL — Android applies immediately, iOS shows an alert saying it
      applies next time the app is opened.
- [ ] **Device GPS** and **geofence accuracy**. Neither has ever run on real
      hardware: the emulator's location provider never resolves, and the simulator
      can't deliver a region crossing. This is the only way to know #5 and #15
      actually work.
- [ ] **VoiceOver / TalkBack on the Arabic text.** `accessibilityLanguage="ar"` is
      set but has never been heard.

**Two things are deliberately waiting for this pass:**

- The iOS **`fetch` background mode**. `expo-task-manager`'s plugin adds it
  unconditionally and nothing uses it; stripping it is a ten-line local plugin.
  I left it because the only way to know it broke nothing is watching a real
  device cross a geofence. **I can finish it** — do it _with_ the geofence test,
  not before.
- **The day you submit**, re-read Apple's guidelines on external link-outs. That
  position is under active litigation and could move. **I can do this** the day
  you ask.

---

## 5. For the content reviewer

Hand this section over as-is.

- [ ] **Sign off all 32 items** and set `reviewed: true` on each, plus `reviewedBy`.
- [ ] **The `why` paragraph and `how` steps** on every item — written in-repo,
      never reviewed.
- [ ] **The 32 reminder sentences** (new, 2026-09-22). One line each: the moment
      named, then why. They make claims about the sunnah that need checking.
- [ ] **`Sahih Muslim 1162`** — the validator flags it as cited with two different
      narrations. Confirm both are correct, or fix the reference.
- [ ] **Translation sources.** `translationSources: {en: null, ar: null}` and the
      validator warns. Name the source, or confirm the translations are original.
- [ ] **Confirm the v1 fasting-owed rule** (§2). Owed fasts are Ramadan days the
      user records as not fasted, plus a backlog they set; each make-up is
      recorded one at a time. Nothing accrues on its own, and recording works
      while tracking is paused. Vows, expiations and fidya are out of scope.
      Confirm, or say what v1 must add or drop.
- [ ] **The before-prayer window.** A `before` item is now relevant during that
      prayer's _own_ window while the prayer is unmarked — the rawatib are prayed
      once the time has entered. This replaced a rule that offered Fajr's sunnah
      at a quarter to eleven at night. Confirm the span, or ask for it narrower.

Run `bun run validate:content` to see the current warnings.

---

## 6. After v1 — nothing here blocks release

- [ ] **Recitations.** `audioReciter: null`, 0 of 32 items have audio. The player
      is wired and says "no audio" honestly. Needs a reciter **and** distribution
      permission. Blocks voice shortcuts (#20) and CarPlay/Android Auto (#21).
- [ ] **CarPlay / Android Auto entitlement** request — also needs the audio.
- [ ] **Widgets.** Cut from v1: they rendered fixed props and never read their own
      snapshot. The snapshot side works. Needs the App Group from §1, then wiring
      and a tap deep link. Re-adding is one plugin entry in `app.json`.
- [ ] **Voluntary payment products** in both consoles, once §1 is done.

**Blocked on other people, not on you:**

- Android large title that collapses — `react-native-screens` has no Android
  implementation; the fix is in their draft PR #4679. `eas.json` pins the Xcode
  26.6 image meanwhile, so store builds keep the detached iOS search pill.
- Android theme change losing the Appearance screen. Reproduced; two explanations
  eliminated (it isn't timing, and the pre-recreation router doesn't drive the
  rebuilt tree). Wants an hour with a native log before more code.

---

## Where things stand

`bun run check` is green — lint, typecheck, 186 tests, content validation and
`expo-doctor` 20/20 — on Expo SDK 58 preview.5. Both platforms are rebuilt from a
clean prebuild and running. 13 of 21 GitHub issues are closed; the 8 open ones
each say what they're waiting on.

`audit.md` has the full reasoning, including the decisions that went the other
way and why. This file is just the part with your name on it.
