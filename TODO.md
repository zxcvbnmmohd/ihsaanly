# What's left, and it's all yours

Only what is still open. Everything here needs an account, a domain, a
reviewer, a device in your hand, or a decision only you can make.

This list is ordered by what unblocks what, not by priority label. `audit.md`
holds the reasoning behind each; this is the working copy.

Where a task says **I can finish it**, that means the code is ready and I need
one thing from you.

---

## 1. Start here — three things gate everything else

- [ ] **Apple Developer Program + Google Play Console accounts.**
      Then, in the repo: `bunx eas-cli login`, then `bunx eas-cli init` — which
      writes `extra.eas.projectId` into `app.json`.
      Unblocks: every build, TestFlight, the iOS donation, and the App Group
      (`group.app.ihsaanly.companion`) that `src/storage/database.ts` is waiting on
      with `SHARED_CONTAINER_ENABLED = false`.

      Android does not wait for Apple. Once `eas init` has run,
      `bunx eas-cli build -p android --profile staging` works the same day.

- [ ] **Point `donate.ihsaanly.app` at a real page.**
      The donate row is live in the Android build and a reviewer will tap it.
      A link to a domain that doesn't exist reads as a broken app.

- [ ] **Content review.** A named, qualified reviewer signs off and consents to
      being credited. `content/items.json` has `reviewedBy: null` and all 32 items
      `reviewed: false`; `bun run validate:content` warns on every build, and the
      project's own policy blocks shipping unreviewed religious content.
      Flipping `reviewed` is the reviewer's act, not mine.

      Give the reviewer §4 below — it's their whole list. Each of the nine
      translations (Arabic content, French, Italian, Japanese, Hindi, Urdu,
      Somali, Mandarin, Cantonese) also needs a qualified speaker: find one per
      language, or tell me which to hold back from the picker.

---

## 2. Store paperwork — after the accounts exist

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
- [ ] **Store metadata.** Drafted: `store.config.json` (App Store, EAS Metadata) and
      `store/google-play/` (fastlane layout), in every language both stores offer;
      `store/README.md` says what is left. Still yours: the App Store review contact,
      the copyright holder, a native-speaker check of each listing, then
      `bunx eas-cli metadata:push` and the Play upload. Somali has no store listing on
      either store; Urdu goes into App Store Connect by hand.
- [ ] **Screenshots.** 6.7" and 6.5" iPhone, Android phone, 13" iPad (tablet is
      supported). Play also wants a 1024×500 feature graphic.
- [ ] **A one-page landing site** for the marketing URL field — same host as the
      policy. Optional: serve both from `ihsaanly.app` instead of github.io (a
      `CNAME` file in `docs/` and a DNS record).
- [ ] **Confirm the support mailbox receives mail.** `support@ihsaanly.app` is in
      both legal documents.
- [ ] **TestFlight + Play internal testing** with at least two external testers
      before production.

---

## 3. On a real device — one iPhone, one Android phone

None of this can be done on a simulator or emulator. Cover:

- [ ] Onboarding with location **declined** (the city-search path).
- [ ] Reminder delivery **with the app killed**.
- [ ] Shade actions: Done and Later.
- [ ] Delete my data.
- [ ] Theme switch on Android.
- [ ] Arabic and Urdu RTL — Android applies immediately, iOS shows an alert
      saying it applies next time the app is opened.
- [ ] iPad: the reading column, rotation, and Split View.
- [ ] A Ramadan day: "Not fasting today" on Today, and the Fasts section on To
      make up (set the Hijri offset to land in Ramadan).
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

## 4. For the content reviewer

Hand this section over as-is.

- [ ] **Sign off all 32 items** and set `reviewed: true` on each, plus `reviewedBy`.
- [ ] **The `why` paragraph and `how` steps** on every item — written in-repo,
      never reviewed.
- [ ] **The 32 reminder sentences** (new, 2026-09-22). One line each: the moment
      named, then why. They make claims about the sunnah that need checking.
- [ ] **The adhkar sub-items** (new, 2026-09-23). Every Arabic text, count and
      reference was written from memory. In particular: "A'udhu bikalimatillah"
      is ×1 because Muslim 2709 states no count (Hisn al-Muslim has ×3 from
      another narration); "Raditu billahi rabban" follows Hisn's wording and is
      graded `disputed`; Ayat al-Kursi cites only 2:255, not the hadith that makes
      it a morning practice; confirm Tirmidhi 3391 and 3388, Abu Dawud 5088 and 5072.
- [ ] **Each language draft needs a qualified speaker** (2026-09-23): fr, it, ja,
      hi, ur, so, zh, yue, plus the Arabic content. Two things for every reviewer:
      gendered forms (Hindi's "Still learning" is masculine; Somali's
      Brother/Sister is awkward), and how Qur'anic meaning translations are
      labelled. Each agent's term choices are in PR #31.
- [ ] **References that may be wrong** (found while writing the Arabic,
      2026-09-23). Bukhari 1178 (fast-white-days, duha-prayer): the English follows
      a different version from the one under that number. Abu Dawud 2602
      (dua-riding): the English is Ibn Umar's narration, which may be Muslim 1342 or
      Abu Dawud 2599. Bukhari 969 (dhul-hijjah-ten): the English follows the
      Abu Dawud/Tirmidhi wording. Bukhari 2004 (fast-ashura): the matn says "I have
      more right", the English says "we". The 27 Arabic matn in
      `content/translations/ar.json` were all written from memory.
- [ ] **`Sahih Muslim 1162`** — the validator flags it as cited with two different
      narrations. Confirm both are correct, or fix the reference.
- [ ] **Translation sources.** `translationSources: {en: null, ar: null}` and the
      validator warns. Name the source, or confirm the translations are original.
- [ ] **Confirm the v1 fasting-owed rule.** Owed fasts are Ramadan days the
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

## 5. After v1 — nothing here blocks release

- [ ] **Recitations.** `audioReciter: null`, 0 of 32 items have audio. The player
      is wired and says "no audio" honestly. Needs a reciter **and** distribution
      permission. Blocks voice shortcuts (#20) and CarPlay/Android Auto (#21).
- [ ] **CarPlay / Android Auto entitlement** request — also needs the audio.
- [ ] **Widgets.** Ten iOS widgets now exist (`src/widgets/ios/`); device builds need the App Group `group.app.ihsaanly.companion` from §1 (simulator builds work).
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

`bun run check` is green — lint, typecheck, 217 tests, content validation and
`expo-doctor` 20/20 — on Expo SDK 58 preview.6, which needs a fresh native build
before a device runs it. 13 of 21 GitHub issues are closed; the 8 open ones
each say what they're waiting on.

`audit.md` has the full reasoning, including the decisions that went the other
way and why. This file is just the part with your name on it.
