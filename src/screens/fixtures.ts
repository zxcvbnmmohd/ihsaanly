import type { CalculationScreenProps } from './calculation'
import type { HijriScreenProps } from './hijri'
import type { ItemDetail } from './item'
import type { LibraryScreenProps } from './library'
import type { LocationScreenProps } from './location'
import type { MoreScreenProps } from './more'
import type { TodayScreenProps } from './today'

const noop = (): void => {}

export const todayFixture: TodayScreenProps = {
  hasLocation: true,
  window: 'asr',
  hijri: { year: 1448, month: 4, day: 6 },
  rightNow: {
    id: 'evening-adhkar',
    title: 'Evening adhkar',
    detail: null,
    href: '/item/evening-adhkar',
  },
  context: [
    { id: 'dua-travel', title: 'Setting out on a journey', detail: null, href: '/item/dua-travel' },
  ],
  comingUp: [
    {
      id: 'fast-white-days',
      title: 'Fasting the White Days',
      detail: 'In 3 days',
      href: '/item/fast-white-days',
    },
  ],
  locationHref: '/location',
}

export const todayWithoutLocationFixture: TodayScreenProps = {
  ...todayFixture,
  hasLocation: false,
  window: null,
  hijri: null,
  rightNow: null,
  context: [],
  comingUp: [],
}

export const libraryFixture: LibraryScreenProps = {
  entries: [
    {
      id: 'dua-leaving-home',
      title: 'Leaving home',
      ruling: 'sunnah',
      href: '/item/dua-leaving-home',
    },
    {
      id: 'sunnah-after-dhuhr',
      title: 'After Dhuhr',
      ruling: 'sunnah-muakkadah',
      href: '/item/sunnah-after-dhuhr',
    },
  ],
}

export const emptyLibraryFixture: LibraryScreenProps = { entries: [] }

export const itemFixture: ItemDetail = {
  ruling: 'sunnah',
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

export const missingItemFixture: ItemDetail | null = null

export const moreFixture: MoreScreenProps = {
  locationLabel: 'Toronto, Ontario, Canada',
  locationHref: '/location',
  calculationLabel: 'Standard',
  calculationHref: '/calculation',
  hijriLabel: 'No change',
  hijriHref: '/hijri',
}

export const hijriFixture: HijriScreenProps = {
  offset: 0,
  preview: { year: 1448, month: 4, day: 6 },
  onChange: noop,
}

export const locationFixture: LocationScreenProps = {
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
  declined: false,
  onQueryChange: noop,
  onUseDevice: noop,
  onSelect: noop,
}

export const locationDeclinedFixture: LocationScreenProps = {
  ...locationFixture,
  query: '',
  results: [],
  declined: true,
}

export const calculationFixture: CalculationScreenProps = {
  preferences: { method: 'MuslimWorldLeague', asr: 'shafi', highLatitudeRule: 'middleofthenight' },
  onChange: noop,
}
