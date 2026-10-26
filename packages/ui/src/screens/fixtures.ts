import { paletteFor } from '@ihsaanly/tailwind/tokens'
import type { LibraryCardProps } from '../components/library-card'
import type { PreviewInk, WidgetPreviewModel } from '../components/widget-preview'
import type { AboutScreenProps } from './about'
import type { AccountScreenProps } from './account'
import type { AppearanceScreenProps } from './appearance'
import type { CalculationScreenProps } from './calculation'
import type { DataScreenProps } from './data'
import type { DiagnosticsScreenProps } from './diagnostics'
import type { EventsScreenProps } from './events'
import type { FeedbackScreenProps } from './feedback'
import type { GlossaryScreenProps } from './glossary'
import type { HijriScreenProps } from './hijri'
import type { HistoryScreenProps } from './history'
import type { ItemDetail, ItemScreenProps } from './item'
import type { LanguageScreenProps } from './language'
import type { LibraryMine, LibraryScreenProps } from './library'
import type { LocationScreenProps } from './location'
import type { MemoriseScreenProps } from './memorise'
import type { MoreScreenProps } from './more'
import type { NotificationsScreenProps } from './notifications'
import type { OnboardingScreenProps } from './onboarding'
import type { OwnDuaScreenProps } from './own-dua'
import type { OwnDuaFormScreenProps } from './own-dua-form'
import type { QadaScreenProps } from './qada'
import type { StartingPointScreenProps } from './starting-point'
import type { TodayScreenProps } from './today'
import type { TrackingScreenProps } from './tracking'
import type { WidgetsScreenProps } from './widgets'

const noop = (): void => {}

export const todayFixture: TodayScreenProps = {
  hasLocation: true,
  locating: false,
  locationProblem: null,
  onUseMyLocation: noop,
  jumuah: false,
  suggestion: {
    id: 'fast-monday',
    title: 'Fasting on Monday',
    why: 'The Prophet ﷺ fasted Mondays and Thursdays and said deeds are presented on those days.',
    href: '/item/fast-monday',
  },
  onAddSuggestion: noop,
  onDismissSuggestion: noop,
  qadaHref: '/qada',
  gregorian: 'Wed 23 Sep',
  hijri: { year: 1448, month: 4, day: 6 },
  placeLabel: 'Toronto',
  now: [
    {
      id: 'evening-adhkar',
      title: 'Evening adhkar',
      detail: null,
      href: '/item/evening-adhkar',
      mark: { done: false, progress: { kind: 'parts', value: 4, total: 11 } },
    },
    {
      id: 'dua-travel',
      title: 'Setting out on a journey',
      detail: null,
      href: '/item/dua-travel',
      mark: { done: false, progress: null },
    },
  ],
  next: {
    prayer: 'maghrib',
    jumuah: false,
    distance: 'In about 2 hours',
    before: [],
    after: [
      {
        id: 'tasbih-after-prayer',
        title: 'Tasbih after prayer',
        detail: null,
        href: '/item/tasbih-after-prayer',
        mark: { done: false, progress: { kind: 'count', value: 12, total: 33 } },
      },
    ],
  },
  allDay: [
    {
      id: 'fast-white-days',
      title: 'Fasting the White Days',
      detail: 'In 3 days',
      href: '/item/fast-white-days',
      mark: null,
    },
  ],
  tomorrow: [],
  later: [],
  prayers: [
    { prayer: 'fajr', done: true, passed: false },
    { prayer: 'dhuhr', done: true, passed: false },
    { prayer: 'asr', done: false, passed: false },
    { prayer: 'maghrib', done: false, passed: false },
    { prayer: 'isha', done: false, passed: false },
  ],
  qada: [{ prayer: 'fajr', count: 2 }],
  onMarkPrayer: noop,
  onMakeUp: noop,
  fastingToday: null,
  fastsOwed: 3,
  onRecordFastOwed: noop,
  onUndoFastOwed: noop,
  locationHref: '/location',
  doneToday: [
    {
      id: 'morning-adhkar',
      title: 'Morning adhkar',
      detail: null,
      href: '/item/morning-adhkar',
      mark: { done: true, progress: null },
    },
  ],
  onCircle: noop,
  undo: null,
  onDismissUndo: noop,
  panel: null,
  onClosePanel: noop,
  onCount: noop,
  onComplete: noop,
  onMarkAll: noop,
  onTogglePart: noop,
  prayerHint: false,
  tour: null,
  paused: false,
  checkIn: null,
}

/** A Friday morning for someone who prays Jumu'ah: the strip and Up next name it. */
export const todayOnJumuahFixture: TodayScreenProps = {
  ...todayFixture,
  jumuah: true,
  gregorian: 'Fri 25 Sep',
  now: [
    {
      id: 'morning-adhkar',
      title: 'Morning adhkar',
      detail: null,
      href: '/item/morning-adhkar',
      mark: { done: false, progress: null },
    },
  ],
  doneToday: [],
  next: {
    prayer: 'dhuhr',
    jumuah: true,
    distance: 'In about 2 hours',
    before: [],
    after: [
      {
        id: 'sunnah-after-jumuah',
        title: "Four rak'ah after Jumu'ah",
        detail: null,
        href: '/item/sunnah-after-jumuah',
        mark: { done: false, progress: null },
      },
    ],
  },
  prayers: [
    { prayer: 'fajr', done: true, passed: false },
    { prayer: 'dhuhr', done: false, passed: false },
    { prayer: 'asr', done: false, passed: false },
    { prayer: 'maghrib', done: false, passed: false },
    { prayer: 'isha', done: false, passed: false },
  ],
}

/** A Ramadan day, with today already noted as not fasting. */
export const todayInRamadanFixture: TodayScreenProps = {
  ...todayFixture,
  hijri: { year: 1448, month: 9, day: 12 },
  fastingToday: { recorded: true },
  fastsOwed: 1,
}

export const todayWithoutLocationFixture: TodayScreenProps = {
  ...todayFixture,
  hasLocation: false,
  suggestion: null,
  gregorian: null,
  hijri: null,
  placeLabel: null,
  now: [],
  next: null,
  allDay: [],
  tomorrow: [],
  later: [],
  prayers: [],
  qada: [],
  fastingToday: null,
  fastsOwed: 0,
  doneToday: [],
}

export const libraryFixture: LibraryScreenProps = {
  query: '',
  filter: 'all',
  counts: { all: 1, onToday: 1, known: 0 },
  sections: [
    {
      category: 'home',
      entries: [
        {
          id: 'dua-leaving-home',
          title: 'Leaving home',
          ruling: 'sunnah',
          onToday: true,
          known: false,
          href: '/item/dua-leaving-home',
          subtitle: 'In the name of Allah, I place my trust in Allah.',
        },
      ],
    },
    {
      category: 'prayer',
      entries: [
        {
          id: 'sunnah-after-dhuhr',
          title: 'Sunnah around Dhuhr',
          ruling: 'sunnah-muakkadah',
          href: '/item/sunnah-after-dhuhr',
          onToday: true,
          known: true,
        },
      ],
    },
  ],
  glossaryHref: '/glossary',
  onFilterChange: noop,
  selectedId: 'dua-leaving-home',
  searchable: {
    query: '',
    onQueryChange: noop,
    placeholder: 'Search by name or situation',
  },
}

export const libraryMine: LibraryMine = {
  count: 2,
  writeHref: '/my-dua',
  own: [
    {
      id: 'mine-parents',
      title: 'For my parents',
      detail: 'My Lord, have mercy on them',
      href: '/item/mine-parents',
    },
  ],
}

export const libraryCardFixture: LibraryCardProps = {
  entry: {
    id: 'dua-leaving-home',
    title: 'Leaving home',
    ruling: 'sunnah',
    onToday: true,
    known: false,
    href: '/item/dua-leaving-home',
    subtitle: 'In the name of Allah, I place my trust in Allah.',
  },
  selected: false,
}

export const emptyLibraryFixture: LibraryScreenProps = {
  query: 'zzz',
  filter: 'all',
  counts: { all: 0, onToday: 0, known: 0 },
  sections: [],
  glossaryHref: '/glossary',
  onFilterChange: noop,
}

export const itemFixture: ItemDetail = {
  ruling: 'sunnah',
  rulingHref: '/glossary?term=sunnah',
  reviewed: false,
  why: 'Naming Allah over food is the difference between eating and eating with gratitude.',
  how: ['Say Bismillah before the first bite.'],
  repeat: 3,
  arabic: 'بِسْمِ اللَّهِ',
  transliteration: 'Bismillāh',
  translation: 'In the name of Allah',
  note: 'Scholars differ on whether this is restricted to a particular time.',
  evidence: [
    {
      type: 'hadith',
      collection: 'Sunan Abi Dawud',
      reference: '5095',
      grading: 'sahih',
      gradedBy: 'al-Albani',
      text: { en: 'A narration.' },
    },
    { type: 'quran', surah: 2, ayah: 255, text: { en: 'A verse.' } },
  ],
  parts: [
    {
      id: 'subhan-allahi-wa-bihamdihi',
      title: 'Glory be to Allah, and praise be to Him',
      arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      transliteration: 'Subḥānallāhi wa bi-ḥamdih.',
      translation: 'Glory be to Allah, and praise be to Him.',
      repeat: 100,
      source: 'Sahih Muslim 2692',
    },
    {
      id: 'ayat-al-kursi',
      title: 'Ayat al-Kursi',
      arabic: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
      transliteration: null,
      translation:
        'Allah: there is no deity except Him, the Ever-Living, the Sustainer of all existence.',
      repeat: 1,
      source: 'Qur\u2019an 2:255',
    },
  ],
}

export const itemScreenFixture: ItemScreenProps = {
  title: 'Morning adhkar',
  item: itemFixture,
  memoriseHref: '/item/memorise/dua-eating',
  done: false,
  onToggleDone: noop,
  counter: { count: 1, target: 3 },
  onTapCounter: noop,
  onResetCounter: noop,
  onToday: true,
  onToggleOnToday: noop,
  remind: null,
  onToggleRemind: noop,
  onShareText: noop,
  onShareImage: noop,
}

export const ownDuaFixture: OwnDuaScreenProps = {
  dua: {
    title: 'For my parents',
    arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbi irhamhuma kama rabbayani saghira',
    text: 'My Lord, have mercy on them as they raised me when I was small.',
    repeat: 3,
    moment: 'Evening',
  },
  done: false,
  onToggleDone: noop,
  counter: { count: 0, target: 3 },
  onTapCounter: noop,
  onResetCounter: noop,
  editHref: '/my-dua?id=mine-parents',
  onDelete: noop,
}

export const ownDuaFormFixture: OwnDuaFormScreenProps = {
  draft: {
    title: 'For my parents',
    arabic: '',
    transliteration: '',
    text: 'My Lord, have mercy on them.',
    repeat: 1,
    moment: 'evening',
  },
  onChange: noop,
  problem: null,
  full: false,
  onSave: noop,
}

export const missingItemFixture: ItemDetail | null = null

export const memoriseHrefFixture = '/item/memorise/dua-leaving-home'

export const moreFixture: MoreScreenProps = {
  groups: [
    {
      title: 'Prayer',
      rows: [
        { href: '/location', title: 'Location', detail: 'Toronto, Ontario, Canada' },
        { href: '/calculation', title: 'Prayer calculation', detail: 'Standard' },
      ],
    },
    {
      title: 'Your practice',
      rows: [{ href: '/qada', title: 'To make up', detail: '2 prayers owed' }],
    },
  ],
}

export const hijriFixture: HijriScreenProps = {
  offset: 0,
  authorities: [{ region: 'Europe', bodies: ['European Council for Fatwa and Research'] }],
  preview: { year: 1448, month: 4, day: 6 },
  onChange: noop,
}

export const locationFixture: LocationScreenProps = {
  place: null,
  deviceLabel: null,
  query: 'toron',
  onQueryChange: noop,
  results: [
    {
      label: 'Toronto, Ontario, Canada',
      latitude: 43.7,
      longitude: -79.42,
      timeZone: 'America/Toronto',
      source: 'city',
    },
  ],
  showNoResults: false,
  locating: false,
  problem: null,
  onUseDevice: noop,
  onOpenSettings: noop,
  onSelect: noop,
}

export const locationDeclinedFixture: LocationScreenProps = {
  ...locationFixture,
  query: '',
  results: [],
  problem: 'declined',
}

export const calculationFixture: CalculationScreenProps = {
  preferences: { method: 'MuslimWorldLeague', asr: 'shafi', highLatitudeRule: 'middleofthenight' },
  onChange: noop,
}

export const trackingFixture: TrackingScreenProps = {
  userState: { travelling: true, trackingPaused: false, jumuah: 'auto' },
  showPause: true,
  onChange: noop,
  checkInDays: 7,
  onCheckInDays: noop,
}

export const notificationsFixture: NotificationsScreenProps = {
  preferences: {
    windows: true,
    lookAhead: true,
    prayers: false,
    quietHours: { from: 22, to: 7 },
    perItem: {},
    maxPerDay: 3,
  },
  permission: 'granted',
  items: [{ id: 'morning-adhkar', title: 'Morning adhkar', on: true }],
  onChange: noop,
  onToggleItem: noop,
  onOpenSettings: noop,
  onSendTest: noop,
}

export const onboardingFixture: OnboardingScreenProps = {
  step: 'location',
  stepIndex: 3,
  stepCount: 10,
  language: 'en',
  theme: 'system',
  place: null,
  locating: false,
  problem: null,
  query: 'toron',
  onQueryChange: noop,
  results: [
    {
      label: 'Toronto, Ontario, Canada',
      latitude: 43.7,
      longitude: -79.42,
      timeZone: 'America/Toronto',
      source: 'city',
    },
  ],
  gender: 'unspecified',
  notifications: {
    windows: true,
    lookAhead: true,
    prayers: false,
    quietHours: { from: 22, to: 7 },
    perItem: {},
    maxPerDay: 3,
  },
  preset: 'essentials',
  onSelectLanguage: noop,
  onSelectTheme: noop,
  onUseDevice: noop,
  onSelectPlace: noop,
  onSelectGender: noop,
  onToggleReminders: noop,
  onSelectPreset: noop,
  onNext: noop,
  onBack: noop,
  onSkipIntro: noop,
  onNotNow: noop,
  enabledCount: 14,
  trackingPaused: false,
  accent: 'terracotta',
  sourced: {
    title: 'Leaving home',
    reminder: 'Said at the door, before the day takes over.',
    evidence: {
      type: 'hadith',
      collection: 'Sunan Abi Dawud',
      reference: '5095',
      grading: 'sahih',
      gradedBy: 'al-Albani',
      text: { en: 'Whoever says, when he leaves his house…' },
    },
    why: 'A sentence at the door that hands the day to Allah before it starts.',
  },
  reminderPreview: {
    item: {
      title: 'Evening adhkar',
      body: 'The evening remembrance, from Asr until the light goes. Open until Maghrib.',
    },
    prayer: {
      title: 'Asr has come in',
      body: "Have you prayed? It's the one that's easiest to lose track of.",
    },
  },
  widgetPreview: {
    home: {
      caption: 'Afternoon',
      title: 'Evening adhkar',
      detail: 'The evening remembrance, from Asr until the light goes.',
    },
    lock: { title: 'Maghrib', detail: 'In about 2 hours' },
    notification: {
      title: 'Evening adhkar',
      body: 'The evening remembrance, from Asr until the light goes. Open until Maghrib.',
    },
  },
  widgets: 'later',
  onSelectAccent: noop,
  onTogglePrayers: noop,
  onShowWidgets: noop,
  onOpenSetting: noop,
  onOpenAbout: noop,
}

export const appearanceFixture: AppearanceScreenProps = {
  preference: 'system',
  onSelect: noop,
  accent: 'terracotta',
  onSelectAccent: noop,
}

export const startingPointFixture: StartingPointScreenProps = {
  current: 'essentials',
  onSelect: noop,
}

export const glossaryFixture: GlossaryScreenProps = {
  highlighted: 'sunnah',
  entries: [
    { id: 'sunnah', term: 'Sunnah', definition: 'What the Prophet ﷺ did, said or approved.' },
    { id: 'qada', term: 'Qada', definition: 'Making up an obligatory prayer after its time.' },
  ],
}

export const qadaFixture: QadaScreenProps = {
  rows: [
    { prayer: 'fajr', outstanding: 12, owed: 10, pending: 2 },
    { prayer: 'dhuhr', outstanding: 0, owed: 0, pending: 0 },
  ],
  fasts: { outstanding: 4, owed: 3 },
  onFastsOwedChange: noop,
  onRecordFastMadeUp: noop,
  onOwedChange: noop,
  onPendingChange: noop,
  onRecord: noop,
}

export const aboutFixture: AboutScreenProps = {
  version: '1.0.0',
  build: '12',
  itemCount: 32,
  reviewedBy: null,
  donate: { destination: 'donate.ihsaanly.app', onPress: noop },
  privacy: { destination: 'ihsaanly.app/legal/privacy', onPress: noop },
  terms: { destination: 'ihsaanly.app/legal/terms', onPress: noop },
  licences: [
    {
      label: 'Amiri font (SIL Open Font Licence)',
      destination: 'scripts.sil.org/OFL',
      onPress: noop,
    },
  ],
}

export const diagnosticsFixture: DiagnosticsScreenProps = {
  summary: {
    version: '1.0.0',
    device: 'Google Pixel 10 Pro XL · android 37',
    coordinates: { latitude: 51.501, longitude: -0.142 },
    records: 84,
    settings: 9,
    reminders: { permission: 'granted', pending: 3 },
    failures: { count: 2, latest: '2026-09-22T18:40:00.000Z' },
    hasError: false,
  },
  raw: '{\n  "format": "ihsaanly-diagnostics"\n}',
  showingRaw: false,
  message: null,
  onToggleRaw: noop,
  onSend: noop,
  onCancel: noop,
}

/** Signed in, nothing typed yet. */
export const feedbackFixture: FeedbackScreenProps = {
  signedIn: true,
  accountEmail: 'amina@example.com',
  kind: 'bug',
  onKind: noop,
  message: '',
  onMessage: noop,
  contactEmail: 'amina@example.com',
  onContactEmail: noop,
  includeDiagnostics: false,
  onIncludeDiagnostics: noop,
  diagnosticsPreview: '{\n  "format": "ihsaanly-diagnostics"\n}',
  previewShown: false,
  onTogglePreview: noop,
  status: 'idle',
  errorCode: null,
  onSend: noop,
  onRetry: noop,
  onSignIn: noop,
  onDone: noop,
  onSendAnother: noop,
  supportEmailHref: 'mailto:support@ihsaanly.app',
  privacyHref: 'https://ihsaanly.app/privacy',
  onOpenLink: noop,
}

export const feedbackSignedOutFixture: FeedbackScreenProps = {
  ...feedbackFixture,
  signedIn: false,
  accountEmail: null,
  contactEmail: '',
}

export const accountSignedOutFixture: AccountScreenProps = {
  account: { status: 'signed-out', account: null, lastSyncedAt: null, error: null },
  providers: ['apple', 'google'],
  now: Date.UTC(2026, 8, 29, 12),
  onSignIn: noop,
  onSyncNow: noop,
  onSignOut: noop,
  onResolveMismatch: noop,
  onDeleteAccount: noop,
  onLink: noop,
  onCancelLink: noop,
}

export const accountSignedInFixture: AccountScreenProps = {
  ...accountSignedOutFixture,
  account: {
    status: 'idle',
    account: {
      email: 'aisha@example.com',
      displayName: 'Aisha',
      provider: 'google',
      providers: ['google'],
    },
    lastSyncedAt: Date.UTC(2026, 8, 29, 11, 55),
    error: null,
  },
}

export const accountLinkRequiredFixture: AccountScreenProps = {
  ...accountSignedOutFixture,
  account: {
    status: 'link-required',
    account: null,
    lastSyncedAt: null,
    error: null,
    link: { existing: 'apple', attempted: 'google' },
  },
}

/** Signed in from onboarding, the first sync still running. */
export const accountRestoringFixture: AccountScreenProps = {
  ...accountSignedInFixture,
  account: { ...accountSignedInFixture.account, status: 'syncing', lastSyncedAt: null },
  restore: { outcome: 'restoring', onBackToSetup: noop, onContinueSetup: noop },
}

/** Signed in from onboarding to an account that never finished setup. */
export const accountNeedsSetupFixture: AccountScreenProps = {
  ...accountSignedInFixture,
  restore: { outcome: 'needs-setup', onBackToSetup: noop, onContinueSetup: noop },
}

export const dataFixture: DataScreenProps = {
  message: null,
  onExport: noop,
  onImport: noop,
  onDiagnostics: noop,
  onDelete: noop,
}

export const eventsFixture: EventsScreenProps = {
  canSetHome: true,
  locationHref: '/location',
  settings: {
    detectHome: false,
    home: null,
    manual: ['travel'],
  },
  onToggleDetectHome: noop,
  onSetHome: noop,
  onToggleManual: noop,
}

export const historyFixture: HistoryScreenProps = {
  daysActive: 42,
  prayers: [
    { subject: 'fajr', count: 38, typicalOffsetSeconds: -600 },
    { subject: 'isha', count: 41, typicalOffsetSeconds: 900 },
  ],
  items: [{ subject: 'morning-adhkar', count: 24, typicalOffsetSeconds: null }],
  labelFor: (subject) => subject,
}

export const languageFixture: LanguageScreenProps = {
  language: 'en',
  onSelect: noop,
}

export const memoriseFixture: MemoriseScreenProps = {
  arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ',
  transliteration: 'Bismillāh, tawakkaltu ʿalā Allāh',
  translation: 'In the name of Allah, I place my trust in Allah.',
  reveal: { transliteration: true, translation: false },
  known: false,
  hasAudio: false,
  playing: false,
  looping: false,
  onHideOne: noop,
  onTogglePlay: noop,
  onToggleLoop: noop,
  onToggleKnown: noop,
}

function fixtureInk(scheme: 'light' | 'dark'): PreviewInk {
  const palette = paletteFor(scheme)
  return {
    background: palette.wash[0],
    backgroundEnd: palette.wash[1],
    accent: palette.accent,
    onAccent: palette.onAccent,
    label: palette.ink,
    secondaryLabel: palette.inkSecondary,
  }
}

/** One widget timeline entry: the morning, with the tasbih part-way and Dhuhr next. */
export const widgetPreviewFixture: WidgetPreviewModel = {
  ink: { light: fixtureInk('light'), dark: fixtureInk('dark') },
  labels: {
    rightNow: 'Right now',
    upNext: 'Up next',
    prayers: 'Prayers',
    hijri: 'Hijri date',
    alsoToday: 'Also today',
    quickDuas: 'Quick duas',
    duaOfTheDay: 'Dua of the day',
    makeUp: 'To make up',
    comingUp: 'Later this week',
    nothingNow: 'Nothing asked of you right now',
    nothingOwed: 'Nothing owed',
    before: 'Before',
    after: 'After',
    markDone: 'Mark done',
    markedDone: 'Marked done',
    saidIt: 'Said it',
    marked: 'Marked',
    addOne: '+1',
    countOf: '{count} of {total}',
  },
  window: 'Morning',
  remaining: 'Open for about 3 more hours',
  date: {
    gregorian: 'Wed 23 Sep',
    hijri: '12 Rabi’ ath-Thani 1448',
    hijriDay: 12,
    place: 'London',
  },
  rightNow: {
    title: 'Tasbih',
    detail: null,
    url: 'ihsaanly://item/tasbih',
    since: 1,
    done: false,
    repeat: 33,
    count: 12,
  },
  alsoNow: [
    { title: 'Morning adhkar', detail: null, url: 'ihsaanly://item/morning-adhkar' },
    { title: 'Duha prayer', detail: null, url: 'ihsaanly://item/duha' },
  ],
  moreNow: '+2 more now',
  next: {
    prayer: 'Dhuhr',
    distance: 'In about 3 hours',
    before: [
      { title: 'Ghusl', detail: null, url: 'ihsaanly://item/ghusl-friday', since: 1 },
      { title: 'Miswak', detail: null, url: 'ihsaanly://item/miswak', since: 1, done: true },
      { title: 'Wudu', detail: null, url: 'ihsaanly://item/wudu' },
    ],
    after: [{ title: 'Sunnah after Dhuhr', detail: null, url: 'ihsaanly://item/sunnah-dhuhr' }],
  },
  prayers: [
    { id: 'fajr', name: 'Fajr', done: true, passed: true },
    { id: 'dhuhr', name: 'Dhuhr', done: false, passed: false },
    { id: 'asr', name: 'Asr', done: false, passed: false },
    { id: 'maghrib', name: 'Maghrib', done: false, passed: false },
    { id: 'isha', name: 'Isha', done: false, passed: true, since: 1 },
  ],
  allDay: [
    { title: 'Fasting on Monday', detail: 'Today', url: 'ihsaanly://item/fast-monday' },
    { title: 'Salawat', detail: null, url: 'ihsaanly://item/salawat' },
  ],
  comingUp: [
    { title: 'Surah al-Kahf', detail: 'Tomorrow', url: 'ihsaanly://item/kahf-friday' },
    { title: 'Fasting on Thursday', detail: null, url: 'ihsaanly://item/fast-thursday' },
  ],
  quickDuas: [
    { title: 'Leaving home', detail: null, url: 'ihsaanly://item/leaving-home', since: 1 },
    { title: 'Travelling', detail: null, url: 'ihsaanly://item/travel', since: 1, done: true },
    { title: 'Going up', detail: null, url: 'ihsaanly://item/ascending' },
    { title: 'Coming down', detail: null, url: 'ihsaanly://item/descending', since: 1 },
  ],
  duaOfTheDay: {
    title: 'Trust in Allah',
    arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ',
    translation: 'In the name of Allah, I place my trust in Allah.',
    done: false,
  },
  makeUp: { prayers: 3, fasts: 2, summary: '3 prayers owed · 2 fasts to make up' },
}

export const widgetsFixture: WidgetsScreenProps = {
  model: widgetPreviewFixture,
  platform: 'ios',
}
