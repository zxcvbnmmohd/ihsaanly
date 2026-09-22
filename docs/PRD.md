# Ihsaanly — Contextual Sunnah Companion

Status: ready-for-agent · Synthesised from the discovery session recorded in `docs/SPEC.md`

## Problem Statement

A practising Muslim knows that a body of recommended acts exists — adhkar, rawatib, duas
tied to everyday moments, optional fasts — but two things go wrong in an ordinary day.

First, **the moment passes before the act is remembered**. Leaving the house, getting into
a car, stepping into a lift, starting a climb: each has an established dua, and each moment
is gone in seconds. Knowing the dua exists is not the same as recalling it while locking a
door with a bag on one shoulder.

Second, **opportunities are discovered too late to act on**. The White Days, Ashura,
Arafah, the six of Shawwal, the first ten of Dhul Hijjah — these are found out about on the
day, or the day after, when preparing for a fast is no longer possible.

Existing apps do not solve either. They are prayer-time apps with adhkar bolted on, or
habit trackers that reframe recommended acts as a scoreboard. Neither answers _what is
relevant to me right now_, and neither can be trusted on _what the evidence actually says_ —
items are labelled "sunnah" with no source, no grading and no acknowledgement that scholars
sometimes differ.

For someone new to Islam this is worse again: the landscape is unknown, every app presents
sixty items at once as though they were all owed, and there is no path from nothing to a
settled daily practice.

## Solution

A calm, offline, evidence-backed companion that answers one question — _what is relevant to
me right now_ — and one more — _what is coming that I should prepare for_.

**Right now.** A single Today surface shows what the current moment calls for, derived from
the time of day, the Hijri date, which prayers have been performed, and whichever contextual
state the person has told the app about. It never shows a scoreboard and never shows what is
_not_ recommended.

**Prayer as the trigger, not the clock.** The app does not display prayer times. The person
taps to say they have prayed Dhuhr, and the sunnah that follows appears. This matches how
prayer actually happens and removes any dependence on the app's clock agreeing with their
mosque's.

**Evidence on everything.** Every item carries its source — collection, reference, grading,
grader — and says plainly when scholars differ. Nothing ships without a named reviewer's
sign-off, and content that cannot be graded cannot be built.

**Reachable when no sensor can help.** Most contextual moments cannot be detected by a phone
at all. Rather than pretend otherwise, the app puts those duas one tap away — on a home
screen widget, through Siri, and in a searchable library — and teaches them until they are
memorised, at which point it stops reminding.

**Nothing leaves the device.** No account, no server, no analytics, no advertising. Full
function with zero permissions granted. The only data that ever leaves is a bundle the
person deliberately chooses to send.

## User Stories

### Orientation and setup

1. As someone new to Islam, I want a small starting set of actions chosen for me, so that I am not asked to pick from sixty things I do not yet understand.
2. As a new user, I want onboarding to take under two minutes, so that I reach the app rather than abandoning a questionnaire.
3. As a privacy-conscious user, I want to choose my city from a list instead of granting location access, so that the app works fully without any permission.
4. As a user who grants location, I want the app to determine my city automatically, so that I skip a step.
5. As a user who denied location by accident, I want the app to keep working, so that one wrong tap does not break it.
6. As a user, I want to choose which reminders I receive during onboarding, so that the app's notification behaviour is something I agreed to.
7. As a user, I want my language and region detected but changeable, so that dates and spelling match where I live.
8. As a woman, I want to indicate this during setup, so that the app can offer a tracking pause when I need it.
9. As an existing user, I want to enable more actions whenever I choose, so that my practice can grow without a reset.

### Today

10. As a user, I want to open the app and see one thing that is relevant right now, so that I am not made to triage a list.
11. As a user, I want to mark an action complete with one tap, so that acknowledging it costs nothing.
12. As a user, I want to dismiss something without explaining myself, so that declining carries no penalty.
13. As a user, I want the day's Hijri date visible, so that I know where I am in the Islamic calendar.
14. As a user, I want to see what is coming in the next few days, so that I can prepare to fast rather than discover the day has passed.
15. As a user, I want quick access to the duas tied to physical moments, so that I can reach one in the seconds I have.
16. As a user, I never want to be told what is _not_ recommended today, so that the screen stays useful.

### Prayer and its sunnah

17. As a user, I want to mark a prayer as performed, so that the sunnah attached to it appears.
18. As a user, I want the sunnah before and after each prayer surfaced at the right point, so that I do not have to recall which prayer has which.
19. As a user, I do not want prayer times displayed as clock times, so that the app never contradicts my mosque.
20. As a user, I want to know which prayer window I am currently in, so that the app's labels make sense.
21. As a user, I want missed prayers recorded, so that I know what I owe.
22. As a user, I want to be shown how many of each prayer I owe rather than which dates I missed, so that I get an outlet instead of an archive.
23. As a user, I want to mark a make-up prayer as performed, so that what I owe decreases.
24. As a user, I never want a streak, a percentage or a weekly score on my obligatory prayers, so that worship does not become a game.

### Islamic calendar

25. As a user, I want Mondays and Thursdays surfaced as fasting opportunities, so that I can decide the night before.
26. As a user, I want the White Days surfaced in advance, so that I can plan for three consecutive days.
27. As a user, I want Ramadan, Ashura, Arafah, the six of Shawwal and the first ten of Dhul Hijjah recognised, so that I do not miss them.
28. As a user whose community follows local moon sighting, I want to shift the Hijri date, so that the app agrees with my mosque.
29. As a user, I want significant days described as _expected_ rather than certain, so that I confirm before fasting.
30. As a user, I want to see which bodies announce moon sightings, so that I can check with the one my community follows.
31. As a user, in a year when the local ninth of Dhul Hijjah and the day of standing at Arafah differ, I want both shown and the difference explained, so that I can follow my own position.

### Library and evidence

32. As a user, I want to browse every action by category, so that I can discover what exists.
33. As a user, I want to search by name or by situation, so that I can find a dua in seconds.
34. As a user, I want the Arabic, a transliteration and a translation together, so that I can use the item whatever my level.
35. As a user, I want the source of every item — collection, reference, grading — so that I can verify it rather than trust it.
36. As a user, I want to be told plainly when scholars differ, so that I am not given one position as though it were the only one.
37. As a user, I want to know who reviewed this app's content, so that I can judge whether to rely on it.
38. As a user, I want the repetition count shown, so that I know how many times to say it.

### Memorisation

39. As a user, I want a focused screen for learning one dua, so that I can practise deliberately.
40. As a user, I want to hear it recited on a loop, so that I learn the pronunciation rather than guess from a transliteration.
41. As a user, I want to hide the transliteration and then the translation, so that I can test my recall in stages.
42. As a user, I want to mark an item as known, so that the app stops reminding me about something I have learned.
43. As a user, I do not want a review queue or a backlog of due items, so that learning does not become a debt.

### Contextual actions

44. As a user, I want the duas for leaving and entering home available, so that I can use them at the door.
45. As a user, I want the travel duas available, so that I can say them when setting off.
46. As a user, I want the duas for ascending and descending available even though no sensor can detect them, so that the app is useful in a lift.
47. As a user with location enabled, I want a reminder when I leave home, so that I get help at the door even if it arrives imperfectly.
48. As a user, I want to be told honestly that leaving-home detection is approximate, so that I am not surprised when it is late.
49. As a driver, I want in-car access to be audio rather than a notification, so that I am not made to look at a screen.

### Travel

50. As a traveller, I want to turn on a travelling mode, so that the app reflects that I am on a journey.
51. As a traveller, I want the regular sunnah prayers suppressed, so that the app does not recommend what is dropped on a journey.
52. As a traveller, I want shortening surfaced, so that the app matches what I am actually praying.
53. As a traveller, I want fasting framed as optional, so that the app does not imply an obligation I am exempt from.
54. As a traveller, I want to turn the mode off myself, so that the app does not guess when my journey ended.

### Exemption

55. As a woman, I want to pause prayer tracking with one tap, so that the app stops recording something I am exempt from.
56. As a woman, I want the pause labelled neutrally, so that my phone does not announce it to anyone who glances at it.
57. As a woman, I do not want prayers accumulated as owed while paused, so that the app does not tell me to make up what must not be made up.
58. As a woman, I want missed fasts still recorded as owed while paused, so that the app reflects the actual ruling.
59. As a woman, I want the pause to stay on until I turn it off, so that tracking never resumes while I am still exempt.

### Notifications

60. As a user, I want two or three notifications a day by default, so that I do not delete the app in the first week.
61. As a user, I want prayer reminders off unless I ask, so that this app does not duplicate my adhan app.
62. As a user, I want to set quiet hours, so that I am not woken.
63. As a user, I want to control notifications per action, so that I can tune anything that does not suit me.
64. As a user, I never want a notification that tells me I have failed, so that the app remains something I want to open.
65. As a user, I want to be told in advance about an upcoming fasting day, so that I can prepare.
66. As a user, I want reminders to keep working with no internet, so that they are dependable.

### Audio and in-car

67. As a user, I want to hear each dua recited, so that I learn it correctly.
68. As a user who cannot read Arabic script, I want audio, so that the app is usable for me.
69. As a blind user, I want audio and correct screen-reader behaviour, so that the app is usable at all.
70. As a user, I want playback to continue in the background with lock screen controls, so that I can listen while doing something else.
71. As a driver, I want to ask by voice for a dua, so that I never handle the phone.
72. As a driver, I want to browse recitations from the car's screen, so that the app is usable on a journey.

### History and data

73. As a user, I want to see what I have completed over time, so that I can reflect.
74. As a user, I want reflective data kept out of my daily view, so that I only see it when I go looking.
75. As a user, I want to export my data as readable text, so that I can keep it or move it.
76. As a user, I want to import on a new device, so that changing phone does not lose my history.
77. As a user reporting a problem, I want to send a diagnostic bundle, so that the developer can reproduce what happened.
78. As a user, I want to see what the bundle contains before sending it, so that I am choosing knowingly.
79. As a developer, I want the bundle to carry enough environment to replay the user's state, so that I can fix what they saw rather than guess.

### Trust and sustainability

80. As a user, I want the app to work with no account, so that I am not identified.
81. As a user, I want no advertising and no analytics, so that I am not the product.
82. As a user, I want every religious item free permanently, so that knowledge is not paywalled.
83. As a user who values the app, I want to pay something voluntarily, so that it can continue.
84. As a supporter, I do not want my payment to unlock anything, so that paying stays a gift rather than a transaction.

### Accessibility and language

85. As a user with low vision, I want text to follow my system size, so that I can read it.
86. As a user of an Arabic interface, I want a right-to-left layout, so that the app reads naturally.
87. As a screen-reader user, I want Arabic read in an Arabic voice, so that it is not mangled.
88. As a user sensitive to motion, I want animation reduced when I ask the system for it.
89. As a speaker of a language whose content is incomplete, I want that language withheld rather than machine-translated, so that I am never shown an unreviewed rendering of a hadith.

### Widgets

90. As a user, I want what is relevant now on my home screen, so that I am reminded without being interrupted.
91. As a user, I want the undetectable duas as tap targets on my home screen, so that I can reach one in the moment I remember.
92. As a user, I want tapping a widget to open the right place in the app, so that no step is wasted.

## Implementation Decisions

### The single decision boundary

All product behaviour resolves through one pure function. It receives a fully specified
snapshot of the world and returns everything the app has decided: the Today model and the
notification schedule. It performs no I/O, reads no clock, and touches no device API.

The snapshot, from the discovery prototype — this shape encodes the decisions more precisely
than prose:

```ts
type Signals = {
  now: Date
  tz: string
  coords: { lat: number; lon: number } // GPS or manually chosen city, indistinguishable
  prayerTimes: Record<Prayer, Date>
  hijri: { day: number; month: number; year: number; offset: number }
  prayedToday: Partial<Record<Prayer, Date>>
  activeEvents: EventKind[]
  userState: { travelling: boolean; trackingPaused: boolean }
  prefs: Prefs
}
```

Everything device-shaped — positioning, prayer-time computation, geofencing, Bluetooth,
notification scheduling, persistence — sits beneath this boundary behind narrow adapters
whose only job is to produce `Signals` or to consume the returned schedule.

### Two day boundaries, never conflated

Two separate functions derive a day from an instant. One turns at Maghrib and governs the
Hijri date, fasting and every date-based trigger. The other is the local calendar day and
governs the prayer log and history. A literal Maghrib boundary applied to the prayer log
would file Tuesday evening's Maghrib and Isha under Wednesday, producing a history the user
does not recognise.

### User state overrides selection before ranking

Paused tracking removes all prayer items and suppresses make-up entirely; missed fasts are
still recorded as owed. Travelling suppresses the regular sunnah prayers, surfaces
shortening, raises the travel duas and reframes fasting as optional. Both are manual
switches. Neither is ever inferred.

The pause never expires on a timer. Auto-resuming would begin accumulating make-up prayers
for someone forbidden to make them up.

### Content is data, and the build enforces it

Religious content ships as a bundled, read-only, versioned document, validated by schema at
**build time** rather than at startup. An item whose grading is not carried by its collection
and which names no grader fails the build. Ungraded content cannot ship by accident.

Localisation of content is keyed by **language**, not by region — a hadith translation does
not differ between two English-speaking countries. A region key is permitted per item if one
genuinely does. Interface localisation uses full region-qualified locales, since spelling,
date and number formatting do differ. Resolution falls back from region to language once, at
load.

A language is offered only when its content is complete and reviewed. Machine translation of
hadith or Qur'an is prohibited; it would negate the evidence model the product rests on.

### Prayer times are computed, never displayed

Times are derived locally from coordinates. They determine which window the user is in and
drive scheduling, and they are never shown as clock times. Asr follows the standard opinion
by default, adjustable in settings rather than asked during onboarding. A high-latitude rule
is configured with a sensible default, because above roughly 48°N — which includes much of
the default market — Isha does not occur for part of the year and the calculation has no
neutral answer.

### The Hijri date is asserted carefully

Calculated by the conventional civil method, offset by a user-set value from −2 to +2 days,
and always presented as _expected_ for religiously significant days. Where the local ninth
of Dhul Hijjah diverges from the day of standing at Arafah, both are shown and the
difference explained. Reference material listing announcing bodies is provided without
endorsement, grouped by region.

### Detection is a property of delivery, not of content

Every contextual item exists regardless of whether a sensor can find its moment. Leaving and
entering home are detected by region monitoring where permission is granted, with the platform
region limit respected. A car connection may raise driving state. Ascent, descent and lifts
are not detectable and are served by the widget, the library, voice and memorisation. Driving
is never served by a notification.

### Notifications are budgeted, not generated

Two or three per day by default; prayer reminders off unless requested. Per-item overrides
exist but are not surfaced during setup. A rolling horizon is scheduled and re-armed on
foreground and from a background task, because the platform caps pending local notifications
and prayer-derived times drift daily. Exact-alarm permission is declared where the platform
requires it, and denial degrades to inexact windows rather than failing silently.

An item marked as memorised leaves the reminder rotation. This is what keeps the daily budget
flat as the user enables more content over time.

### Storage is split by consumer

Preferences, prayer marks, make-up counts and an append-only event log live in a relational
store inside the shared application-group container, so that the log can be queried and the
diagnostic bundle can carry it. A small snapshot document in the same container is what the
widget process reads; the widget does not link a database to render one card.

The event log records, per action: the item, the timestamp, the window it belonged to, and a
signed offset describing how early or late it was. Make-up is presented as a count per prayer
even though the log retains full timestamps — the data requirement and the guilt principle
are both satisfiable at once.

Content requires no migration; it is versioned with the application. The relational store
migrates forward-only under a stored version number.

### Interface follows the platform

Navigation is native tabs — Today, Library, More — extending the two-group structure already
present. Layout, spacing and sizing use the utility-class system; **every colour comes from
the existing semantic colour module**, which resolves to platform semantic colours on device
and therefore inherits light/dark and contrast behaviour from the OS. Any component rendering
one of those values subscribes to the colour scheme, since the Android values do not
re-resolve on their own under the enabled compiler.

Custom visual surface area is limited to one accent colour and one Arabic typeface.

### In-car access comes through the audio category

Both platforms admit apps by category. As a reminders app, this one qualifies for none; as an
audio app it qualifies honestly for both. Recitation is required for memorisation and
accessibility independently, so this is not a category workaround. Background playback,
lock-screen controls and voice shortcuts require no approval and are built first; full in-car
integration follows once recordings exist.

Only the Arabic is recited. Translations are read, so the recording effort does not multiply
by language.

### Everything works offline

Content is bundled, prayer times and the Hijri date are computed, notifications are local,
storage is local. The network is used only for outbound reference links and the optional
voluntary payment. There is no fetch on startup and no loading state anywhere in the core
loop.

### Dependency versions are provisional

The project is on a preview SDK with several release-candidate dependencies pinned in
lockstep. Every new native module must be added through the SDK-aware installer and validated
by the project's doctor task before being relied on; upstream release notes are not
authoritative here. Anything with native code requires a development build.

## Testing Decisions

**What makes a good test here.** A test states an externally observable decision: given this
world, the app shows these things in this order and schedules these reminders. It never
reaches for an intermediate value, never asserts on how the decision was reached, and never
mocks a platform API. If a test needs a simulator, it is testing the wrong thing.

**The seam.** One. The pure decision function described above. Tests construct a `Signals`
fixture and assert on the returned Today model and notification schedule. This is the highest
seam available and it covers nearly all product behaviour.

**What is tested at that seam**

- Both day boundaries, including the evening prayers that fall either side of them.
- Window derivation across daylight-saving transitions, across midnight, and at high latitude where the fallback rule applies.
- Travelling state suppressing the regular sunnah prayers and reframing fasting.
- Paused tracking removing prayer items and suppressing make-up, while fasts remain owed.
- Date-based triggers: weekly fasting days, the White Days, and each significant occasion, with the offset applied.
- The divergence case where the local date and the day of standing differ, asserting both are surfaced.
- Make-up presented as counts, never as dates.
- Ranking order, including an active contextual event outranking an unfinished window.
- Memorised items leaving the reminder rotation.
- The notification schedule never exceeding the platform's pending limit, and re-arming being idempotent.

**The second seam.** Content validation, which is a build gate rather than runtime behaviour
and therefore cannot share the first. It is tested by asserting that a document containing an
item with an unsupported grading and no named grader fails, and that a valid document passes.

**Not unit tested, deliberately.** Positioning, region monitoring, notification delivery,
audio session behaviour, widget rendering and in-car integration. These are verified on
device. Mocking them would assert that the mocks work.

**Prior art.** None — the repository is a scaffold. These tests establish the pattern.

## Out of Scope

- Any server, account, sync, analytics or advertising.
- Displaying prayer times as clock times.
- Streaks, scores, percentages, leaderboards or any competitive mechanic.
- Spaced repetition or a review queue.
- Detection of ascent, descent, lifts or hills; no API provides it.
- Notifications while driving.
- Categories that would require building a feature the product does not have: navigation, messaging, parking, fuelling, charging, food ordering, conversational assistant.
- Machine-translated religious content, under any labelling.
- Any dated ledger of missed obligatory prayers in the interface.
- Children's and family modes; a different product.
- Community or social features. **Bent 2026-09-20**: one dua at a time may be shared as text or an image card through the system share sheet; nothing is posted, tracked or received.
- A nearby-mosque directory, which would require place data and a network dependency.
- Watch and wearable applications.
- The diagnostic replay tool. The bundle is designed to make it possible later; it is not built now.
- Interactive widget controls. Widgets deep-link in this release.

## Further Notes

**Two external dependencies gate release, and neither is code.** A named, qualified reviewer
must sign off on the content before any release, and roughly sixty Arabic recordings must be
produced with explicit permission to distribute them. Both are confirmed as available. The
first three units of engineering work — the content schema and its validator, the decision
function, and the prayer-time and positioning adapters — are unblocked by both and can
proceed in parallel with content authoring.

**The seeded content examples are format demonstrations, not vetted material.** They must be
verified before they are relied upon.

**One open technical question worth resolving early**, because it is cheap if it resolves
favourably: whether widgets and live activities appear in the car without a category
entitlement. The repository already contains working examples of both. The answer is in the
platform's developer guide.

**Submission prerequisites**, small but blocking: a hosted privacy policy and a support URL,
and configured voluntary-payment products. The privacy declaration must disclose that a
user-initiated diagnostic bundle can transmit religious practice data and approximate
location, and the product's privacy claim must be worded to match.

**The design record**, including the full decision log with rationale for each of the
twenty-seven decisions taken during discovery, is maintained alongside this document.
