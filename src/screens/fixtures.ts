import type { AboutScreenProps } from './about'
import type { AppearanceScreenProps } from './appearance'
import type { CalculationScreenProps } from './calculation'
import type { GlossaryScreenProps } from './glossary'
import type { HijriScreenProps } from './hijri'
import type { ItemDetail, ItemScreenProps } from './item'
import type { LibraryScreenProps } from './library'
import type { LocationScreenProps } from './location'
import type { MoreScreenProps } from './more'
import type { OnboardingScreenProps } from './onboarding'
import type { QadaScreenProps } from './qada'
import type { NotificationsScreenProps } from './notifications'
import type { TrackingScreenProps } from './tracking'
import type { TodayScreenProps } from './today'

const noop = (): void => {}

export const todayFixture: TodayScreenProps = {
  hasLocation: true,
  suggestion: {
    id: 'fast-monday',
    title: 'Fasting on Monday',
    why: 'The Prophet ﷺ fasted Mondays and Thursdays and said deeds are presented on those days.',
    href: '/item/fast-monday',
  },
  onAddSuggestion: noop,
  onDismissSuggestion: noop,
  qadaHref: '/qada',
  window: 'asr',
  hijri: { year: 1448, month: 4, day: 6 },
  placeLabel: 'Toronto',
  now: [
    { id: 'evening-adhkar', title: 'Evening adhkar', detail: null, href: '/item/evening-adhkar' },
    { id: 'dua-travel', title: 'Setting out on a journey', detail: null, href: '/item/dua-travel' },
  ],
  next: {
    prayer: 'maghrib',
    distance: 'In about 2 hours',
    before: [],
    after: [
      {
        id: 'tasbih-after-prayer',
        title: 'Tasbih after prayer',
        detail: null,
        href: '/item/tasbih-after-prayer',
      },
    ],
  },
  allDay: [
    {
      id: 'fast-white-days',
      title: 'Fasting the White Days',
      detail: 'In 3 days',
      href: '/item/fast-white-days',
    },
  ],
  tomorrow: [],
  later: [],
  prayers: [
    { prayer: 'fajr', done: true },
    { prayer: 'dhuhr', done: true },
    { prayer: 'asr', done: false },
    { prayer: 'maghrib', done: false },
    { prayer: 'isha', done: false },
  ],
  qada: [{ prayer: 'fajr', count: 2 }],
  onMarkPrayer: noop,
  onMakeUp: noop,
  locationHref: '/location',
}

export const todayWithoutLocationFixture: TodayScreenProps = {
  ...todayFixture,
  hasLocation: false,
  suggestion: null,
  window: null,
  hijri: null,
  placeLabel: null,
  now: [],
  next: null,
  allDay: [],
  tomorrow: [],
  later: [],
  prayers: [],
  qada: [],
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
  onQueryChange: noop,
  onFilterChange: noop,
}

export const emptyLibraryFixture: LibraryScreenProps = {
  query: 'zzz',
  filter: 'all',
  counts: { all: 0, onToday: 0, known: 0 },
  sections: [],
  glossaryHref: '/glossary',
  onQueryChange: noop,
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
}

export const itemScreenFixture: ItemScreenProps = {
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

export const missingItemFixture: ItemDetail | null = null

export const memoriseHrefFixture = '/item/memorise/dua-leaving-home'

export const moreFixture: MoreScreenProps = {
  locationLabel: 'Toronto, Ontario, Canada',
  locationHref: '/location',
  calculationLabel: 'Standard',
  calculationHref: '/calculation',
  hijriLabel: 'No change',
  hijriHref: '/hijri',
  trackingLabel: 'Tracking',
  trackingHref: '/tracking',
  aboutHref: '/about',
  notificationsHref: '/notifications',
  eventsHref: '/events',
  historyHref: '/history',
  qadaHref: '/qada',
  qadaLabel: '2 prayers owed',
  dataHref: '/data',
  languageHref: '/language',
  languageLabel: 'English',
  appearanceHref: '/appearance',
  appearanceLabel: 'System',
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
  problem: null,
  onQueryChange: noop,
  onUseDevice: noop,
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
  userState: { travelling: true, trackingPaused: false },
  showPause: true,
  onChange: noop,
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
  stepIndex: 2,
  stepCount: 6,
  language: 'en',
  theme: 'system',
  place: null,
  locating: false,
  problem: null,
  query: 'toron',
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
  enabledTitles: ['Leaving home', 'Morning adhkar', 'Evening adhkar'],
  itemCount: 32,
  essentialCount: 21,
  startingCount: 5,
  onSelectLanguage: noop,
  onSelectTheme: noop,
  onQueryChange: noop,
  onUseDevice: noop,
  onSelectPlace: noop,
  onSelectGender: noop,
  onToggleNotification: noop,
  onSelectPreset: noop,
  onNext: noop,
  onBack: noop,
  onSkipIntro: noop,
  onNotNow: noop,
}

export const appearanceFixture: AppearanceScreenProps = {
  preference: 'system',
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
  onOwedChange: noop,
  onPendingChange: noop,
  onRecord: noop,
}

export const aboutFixture: AboutScreenProps = {
  version: '1.0.0',
  build: '12',
  itemCount: 32,
  reviewedBy: null,
}
